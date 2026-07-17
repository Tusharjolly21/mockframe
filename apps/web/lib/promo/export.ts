"use client";

import { resolveAsset } from "@/lib/assets";
import type { PromoProject } from "./types";

/** Thrown when the server rejects the render because the caller isn't Pro. The
 *  panel catches this to open the upgrade modal instead of showing an error. */
export class PromoExportProError extends Error {}

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

function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Render the project to MP4 on the server and download the file. */
export async function exportPromoVideo(project: PromoProject): Promise<void> {
  if (project.screenshotAssetIds.length === 0) throw new Error("Add a screenshot first");

  const screenshots = await Promise.all(
    project.screenshotAssetIds.map(async (id) => {
      const asset = resolveAsset(id);
      if (!asset?.url) throw new Error("A screenshot could not be loaded");
      return { dataUrl: await toDataUrl(asset.url), width: asset.width, height: asset.height };
    }),
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
