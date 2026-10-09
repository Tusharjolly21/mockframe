"use client";

import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { toCanvas } from "html-to-image";
import { SceneRenderer } from "@framekit/renderer";
import { getDevice } from "@framekit/devices";
import { createMockupLayer, createScene, type SceneDocument } from "@framekit/scene";
import { ingestFile, resolveAsset, type GuestAsset } from "@/lib/assets";
import type { RenderJob, RenderedImage } from "@/lib/apiRender";
import { buildDeviceScene, deviceForScreenshot } from "@/lib/deviceScene";
import { planFigmaScenes } from "@/lib/figmaOpen";
import { blobToDataUrl, fitImage } from "@/lib/fitImage";
import { ensureSceneFonts } from "@/lib/fonts";
import { extractPalette } from "@/lib/palette";
import { canPrettify, prettyLooks } from "@/lib/prettify";
import { placeAsset } from "@/lib/sceneOps";

declare global {
  interface Window {
    __mockframeRender?: (job: RenderJob) => Promise<RenderedImage[]>;
    __mockframeReady?: boolean;
  }
}

async function scenesFor(job: RenderJob, assets: GuestAsset[]): Promise<{ name: string; scene: SceneDocument }[]> {
  if (job.kind === "store-set") {
    const { shots } = planFigmaScenes({ mode: "set", set: job.set, platform: job.platform }, assets.map((asset, i) => ({ asset, name: `Screenshot ${i + 1}` })));
    return shots.map((s, i) => ({ name: `${job.set}-${job.platform}-${i + 1}`, scene: s.scene }));
  }
  const out: { name: string; scene: SceneDocument }[] = [];
  for (const [i, asset] of assets.entries()) {
    const deviceId = job.device !== "auto" && getDevice(job.device) ? job.device : deviceForScreenshot(asset.width, asset.height);
    const base = job.device === "frameless" ? null : buildDeviceScene(deviceId);
    let scene = base ? placeAsset(base, asset, {}).scene : framelessScene(asset);
    if (job.look !== null && canPrettify(scene)) {
      const palette = await extractPalette(asset.url).catch(() => [] as string[]);
      scene = prettyLooks(scene, palette, 0)[job.look]?.scene ?? scene;
    }
    out.push({ name: `mockup-${i + 1}`, scene });
  }
  return out;
}

/** The screenshot on its own, with a margin around it. */
function framelessScene(asset: GuestAsset): SceneDocument {
  const pad = Math.round(Math.max(asset.width, asset.height) * 0.12);
  const scene = createScene({ width: asset.width + pad * 2, height: asset.height + pad * 2 });
  const layer = createMockupLayer({ deviceId: null, media: { assetId: asset.id, kind: "image", fit: "cover", offsetX: 0, offsetY: 0, scale: 1 } });
  layer.cornerRadius = Math.round(Math.min(asset.width, asset.height) * 0.03);
  scene.layers.push(layer);
  return scene;
}

const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

async function rasterize(scene: SceneDocument, job: RenderJob): Promise<{ dataUrl: string; width: number; height: number; scale: number }> {
  const { width: W, height: H } = scene.canvas;
  const host = document.createElement("div");
  host.style.cssText = `position:fixed;left:0;top:0;width:${W}px;height:${H}px;overflow:hidden`;
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    flushSync(() => root.render(<SceneRenderer scene={scene} resolveAsset={resolveAsset} />));
    await ensureSceneFonts(scene);
    await document.fonts.ready;
    await Promise.all(
      [...host.querySelectorAll("img")].map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise((r) => {
              img.addEventListener("load", r, { once: true });
              img.addEventListener("error", r, { once: true });
            })
      )
    );
    await frame();
    const node = host.querySelector<HTMLElement>("[data-scene-id]") ?? host;
    const scale = job.limit ? Math.min(job.scale, Math.floor((job.limit.maxEdge / Math.max(W, H)) * 1000) / 1000) : job.scale;
    const width = Math.round(W * scale);
    const height = Math.round(H * scale);
    const canvas = await toCanvas(node, {
      pixelRatio: 1,
      canvasWidth: width,
      canvasHeight: height,
      backgroundColor: job.format === "jpeg" ? "#ffffff" : undefined,
      style: { transform: "none" },
    });
    if (job.limit) {
      const fit = await fitImage(canvas, job.limit.maxBytes);
      return { dataUrl: await blobToDataUrl(fit.blob), width: fit.width, height: fit.height, scale: scale * fit.scale };
    }
    return { dataUrl: canvas.toDataURL(`image/${job.format}`, job.format === "jpeg" ? 0.9 : undefined), width, height, scale };
  } finally {
    root.unmount();
    host.remove();
  }
}

/**
 * /render: a blank page a headless browser drives for the paid API. It
 * exposes window.__mockframeRender(job), which builds the scenes with the
 * editor's own code and returns each one as an image.
 */
export function RenderHost() {
  useEffect(() => {
    window.__mockframeRender = async (job) => {
      const assets: GuestAsset[] = [];
      for (const [i, src] of job.screenshots.entries()) {
        const blob = await (await fetch(src)).blob();
        assets.push(await ingestFile(new File([blob], `screenshot-${i + 1}`, { type: blob.type || "image/png" })));
      }
      const images: RenderedImage[] = [];
      for (const { name, scene } of await scenesFor(job, assets)) {
        const r = await rasterize(scene, job);
        images.push({ name: `${name}.${job.format === "jpeg" ? "jpg" : "png"}`, ...r });
      }
      return images;
    };
    window.__mockframeReady = true;
  }, []);
  return null;
}
