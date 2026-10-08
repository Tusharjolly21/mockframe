"use client";

import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { toCanvas } from "html-to-image";
import { SceneRenderer } from "@framekit/renderer";
import { getDevice } from "@framekit/devices";
import type { SceneDocument } from "@framekit/scene";
import { ingestFile, resolveAsset, type GuestAsset } from "@/lib/assets";
import type { RenderJob, RenderedImage } from "@/lib/apiRender";
import { buildDeviceScene, deviceForScreenshot } from "@/lib/deviceScene";
import { planFigmaScenes } from "@/lib/figmaOpen";
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
    const base = buildDeviceScene(deviceId);
    if (!base) continue;
    let scene = placeAsset(base, asset, {}).scene;
    if (job.look !== null && canPrettify(scene)) {
      const palette = await extractPalette(asset.url).catch(() => [] as string[]);
      scene = prettyLooks(scene, palette, 0)[job.look]?.scene ?? scene;
    }
    out.push({ name: `mockup-${i + 1}`, scene });
  }
  return out;
}

const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

async function rasterize(scene: SceneDocument, job: RenderJob): Promise<{ dataUrl: string; width: number; height: number }> {
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
    const width = Math.round(W * job.scale);
    const height = Math.round(H * job.scale);
    const canvas = await toCanvas(node, {
      pixelRatio: 1,
      canvasWidth: width,
      canvasHeight: height,
      backgroundColor: job.format === "jpeg" ? "#ffffff" : undefined,
      style: { transform: "none" },
    });
    return { dataUrl: canvas.toDataURL(`image/${job.format}`, job.format === "jpeg" ? 0.9 : undefined), width, height };
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
