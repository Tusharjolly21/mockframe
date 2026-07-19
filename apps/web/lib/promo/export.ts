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

async function toDataUrl(url: string): Promise<string> {
  if (url.startsWith("data:")) return url;
  const blob = await (await fetch(url)).blob();
  return await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(new Error("Could not read the screenshot"));
    fr.readAsDataURL(blob);
  });
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

/** Render the project to MP4 on the server and download the file. */
export async function exportPromoVideo(project: PromoProject, media: PromoMedia[]): Promise<void> {
  if (media.length === 0) throw new Error("Add a screenshot first");

  const screenshots = await Promise.all(
    media.map(async (m) =>
      m.kind === "video"
        ? { kind: "video" as const, url: await uploadVideo(m), width: m.width, height: m.height }
        : { kind: "image" as const, dataUrl: await toDataUrl(m.url), width: m.width, height: m.height },
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
    const { url } = (await res.json()) as { url: string };
    triggerDownload(url, filename);
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
