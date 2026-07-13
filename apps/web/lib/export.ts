"use client";

import { toCanvas } from "html-to-image";
import type { SceneDocument } from "@framekit/scene";
import { applyWatermark } from "./watermark";

export type ExportFormat = "png" | "jpeg" | "webp";
export type ExportQuality = "best" | "balanced" | "compact";

/* Encoder quality per tier — "balanced" is visually lossless for UI screenshots
   at a fraction of the 0.92-era file sizes; WebP runs a touch lower because its
   quality scale is more forgiving. PNG ignores quality entirely. */
const QUALITY: Record<ExportQuality, { jpeg: number; webp: number }> = {
  best: { jpeg: 0.92, webp: 0.9 },
  balanced: { jpeg: 0.85, webp: 0.8 },
  compact: { jpeg: 0.72, webp: 0.65 },
};

/**
 * Client-side export fast path (§6.4): serialize the live SceneRenderer DOM
 * subtree, rasterize offscreen, download. Server rendering takes over for
 * packs / >4K / API once the worker exists.
 */
export async function exportScene(
  node: HTMLElement,
  scene: SceneDocument,
  opts: { format: ExportFormat; scale: number; quality?: ExportQuality; watermark?: boolean }
): Promise<void> {
  // browsers silently fail or downscale beyond canvas limits — surface it
  // instead ("export resolution not being respected" user report)
  const outW = Math.round(scene.canvas.width * opts.scale);
  const outH = Math.round(scene.canvas.height * opts.scale);
  if (outW * outH > 33_000_000) {
    throw new Error(`${outW}×${outH} exceeds the browser canvas limit — pick a smaller size`);
  }
  const canvas = await toCanvas(node, {
    // canvasWidth/Height alone define the output size — combining them with
    // pixelRatio would multiply the two and double-scale the export
    pixelRatio: 1,
    canvasWidth: Math.round(scene.canvas.width * opts.scale),
    canvasHeight: Math.round(scene.canvas.height * opts.scale),
    // JPEG has no alpha: fill behind transparent backgrounds AND rounded corners
    backgroundColor: opts.format === "jpeg" ? "#ffffff" : undefined,
    style: { transform: "none" }, // neutralize any inherited editor transform on the clone
  });

  // Free tier: visible tile + badge + forensic. Pro: forensic layer only —
  // invisible, keeps exports traceable even with the visible marks removed.
  applyWatermark(canvas, opts.watermark ? {} : { tile: false, badge: false });

  const mime = `image/${opts.format}`;
  const encoderQuality =
    opts.format === "png" ? undefined : QUALITY[opts.quality ?? "balanced"][opts.format];
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mime, encoderQuality)
  );
  if (!blob) throw new Error("Export failed");

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `mockframe-${Math.round(scene.canvas.width * opts.scale)}x${Math.round(scene.canvas.height * opts.scale)}.${opts.format === "jpeg" ? "jpg" : opts.format}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
