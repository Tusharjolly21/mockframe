"use client";

import { createRoot } from "react-dom/client";
import { SceneRenderer } from "@framekit/renderer";
import type { SceneDocument } from "@framekit/scene";
import { resolveAsset } from "./assets";
import { applyWatermark } from "./watermark";
import { exportWatermarkOpts } from "./customWatermark";
import { buildZip, type ZipEntry } from "./zip";

/**
 * Bulk export (PostSpark parity, but as one .zip): render any number of scene
 * documents OFFSCREEN — each mounted into a hidden root, rasterized with
 * html-to-image, then bundled with the store-mode zip writer.
 */

async function renderSceneToPng(scene: SceneDocument, scale: number, watermark: boolean, panoramaIdx?: number, panoramaTotal?: number): Promise<Uint8Array> {
  const holder = document.createElement("div");
  holder.style.cssText = "position:fixed;left:-100000px;top:0;pointer-events:none;";
  document.body.appendChild(holder);
  const root = createRoot(holder);
  try {
    // watermark is baked at the canvas stage (tiles + badge + forensic layer),
    // not via the renderer's DOM badge — keeps all export paths identical
    root.render(<SceneRenderer scene={scene} resolveAsset={resolveAsset} panoramaIdx={panoramaIdx} panoramaTotal={panoramaTotal} />);
    // let React commit + local data-URL images decode
    await new Promise((r) => setTimeout(r, 120));
    const node = holder.firstElementChild as HTMLElement | null;
    if (!node) throw new Error("render failed");
    const { toCanvas } = await import("html-to-image");
    const canvas = await toCanvas(node, {
      pixelRatio: 1,
      canvasWidth: Math.round(scene.canvas.width * scale),
      canvasHeight: Math.round(scene.canvas.height * scale),
    });
    await applyWatermark(canvas, exportWatermarkOpts(!watermark));
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("rasterize failed");
    return new Uint8Array(await blob.arrayBuffer());
  } finally {
    root.unmount();
    holder.remove();
  }
}

export interface BulkItem {
  name: string; // file name inside the zip (without extension)
  scene: SceneDocument;
}

/** Render every item and download a single .zip. Reports per-item progress. */
export async function bulkExportZip(
  items: BulkItem[],
  opts: { scale: number; watermark: boolean; onProgress?: (done: number, total: number) => void }
): Promise<void> {
  const entries: ZipEntry[] = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const png = await renderSceneToPng(it.scene, opts.scale, opts.watermark, i, items.length);
    entries.push({ name: `${it.name}.png`, data: png });
    opts.onProgress?.(i + 1, items.length);
  }
  const zip = buildZip(entries);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(zip);
  a.download = `mockframe-bulk-${items.length}.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
