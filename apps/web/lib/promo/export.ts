"use client";

import { firebaseFetch } from "@/lib/firebaseClient";
import type { PromoProject } from "./types";

/** Thrown when the server rejects the render because the caller isn't Pro. The
 *  panel catches this to open the upgrade modal instead of showing an error. */
export class PromoExportProError extends Error {}

/** What the panel holds per uploaded screen: images resolve from the asset
 *  store, videos are object URLs probed for dimensions on ingest. */
export type PromoMedia = {
  id: string;
  url: string;
  width: number;
  height: number;
  kind: "image" | "video";
  name?: string;
};

/** Vercel caps request bodies (~4.5MB) and the render only shows screens at
 *  device-frame size, so full-resolution uploads are pure waste: downscale to a
 *  1600px long edge and re-encode before inlining. */
const EXPORT_MAX_LONG_EDGE = 1600;
const EXPORT_JPEG_QUALITY = 0.85;

async function toDataUrl(url: string, width: number, height: number): Promise<string> {
  const longEdge = Math.max(width, height);
  const needsScale = longEdge > EXPORT_MAX_LONG_EDGE;
  // small data URLs pass through untouched
  if (url.startsWith("data:") && !needsScale && url.length < 1_500_000) return url;
  try {
    const blob = await (await fetch(url)).blob();
    const bitmap = await createImageBitmap(blob);
    const scale = needsScale ? EXPORT_MAX_LONG_EDGE / longEdge : 1;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    // PNG for screenshots with transparency is unnecessary here — screens sit
    // behind glass; JPEG keeps every screen well under the body cap
    return canvas.toDataURL("image/jpeg", EXPORT_JPEG_QUALITY);
  } catch {
    // decode failure: fall back to raw bytes (may still fit)
    const blob = await (await fetch(url)).blob();
    return await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = () => reject(new Error("Could not read the screenshot"));
      fr.readAsDataURL(blob);
    });
  }
}

/** Videos are too large to inline — upload once to /api/assets (sniffed +
 *  size-capped server-side) and send the hosted URL to the renderer. */
async function uploadVideo(media: PromoMedia): Promise<string> {
  const blob = await (await fetch(media.url)).blob();
  const form = new FormData();
  form.set("file", new File([blob], media.name || "recording.mp4", { type: blob.type || "video/mp4" }));
  form.set("width", String(media.width));
  form.set("height", String(media.height));
  const res = await firebaseFetch("/api/assets", { method: "POST", body: form });
  if (!res.ok) {
    const err = (await res.json().catch(() => null))?.error;
    throw new Error(err ?? "Video upload failed");
  }
  const saved = (await res.json()) as { url: string };
  if (!saved.url?.startsWith("https://")) throw new Error("Video upload did not return a hosted URL");
  return saved.url;
}

/** Render the project to MP4 on the server and download the file. Cloud
 *  renders are async: the route returns ids and we poll for progress. */
export async function exportPromoVideo(
  project: PromoProject,
  media: PromoMedia[],
  onProgress?: (pct: number) => void,
): Promise<void> {
  if (media.length === 0) throw new Error("Add a screenshot first");

  const screenshots = await Promise.all(
    media.map(async (m) =>
      m.kind === "video"
        ? { kind: "video" as const, url: await uploadVideo(m), width: m.width, height: m.height }
        : (() => {
            const longEdge = Math.max(m.width, m.height);
            const s = longEdge > EXPORT_MAX_LONG_EDGE ? EXPORT_MAX_LONG_EDGE / longEdge : 1;
            return toDataUrl(m.url, m.width, m.height).then((dataUrl) => ({
              kind: "image" as const,
              dataUrl,
              width: Math.max(1, Math.round(m.width * s)),
              height: Math.max(1, Math.round(m.height * s)),
            }));
          })(),
    ),
  );

  const res = await fetch("/api/v1/promo-render", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      templateId: project.templateId,
      deviceId: project.deviceId,
      screenshots,
      texts: project.texts,
      accent: project.accent,
      background: project.background,
      pattern: project.pattern,
      format: project.format,
    }),
  });

  if (res.status === 402) throw new PromoExportProError("Pro required");
  if (!res.ok) {
    let msg = "Render failed";
    try {
      msg = (await res.json()).error ?? msg;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(msg);
  }

  const filename = `mockframe-promo-${project.format.replace(":", "x")}.mp4`;
  const contentType = res.headers.get("Content-Type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await res.json()) as { url?: string; renderId?: string; bucketName?: string };
    if (body.url) {
      triggerDownload(body.url, filename);
      return;
    }
    if (!body.renderId || !body.bucketName) throw new Error("Render did not start");
    // poll the cloud render until done
    for (;;) {
      await new Promise((r) => setTimeout(r, 2500));
      const sr = await fetch(`/api/v1/promo-render/status?renderId=${encodeURIComponent(body.renderId)}&bucket=${encodeURIComponent(body.bucketName)}`);
      if (!sr.ok) throw new Error((await sr.json().catch(() => null))?.error ?? "Render status failed");
      const st = (await sr.json()) as { done: boolean; progress: number; outputFile: string | null; error: string | null };
      if (st.error) throw new Error(st.error);
      onProgress?.(Math.round((st.progress ?? 0) * 100));
      if (st.done) {
        if (!st.outputFile) throw new Error("Render finished without a file");
        triggerDownload(st.outputFile, filename);
        return;
      }
    }
  } else {
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    triggerDownload(url, filename);
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  }
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
