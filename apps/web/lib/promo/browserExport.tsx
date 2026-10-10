"use client";

import { createRef } from "react";
import { createRoot } from "react-dom/client";
import { Player, type PlayerRef } from "@remotion/player";
import { createVideoWriter } from "@/lib/videoEncode";
import { PROMO_COMPONENTS } from "@/remotion/promo/templates";
import { getPromoTemplate } from "./registry";
import { buildPromoInputProps } from "./inputProps";
import { FORMAT_DIMENSIONS, PROMO_FPS, type PromoProject } from "./types";
import type { PromoMedia } from "./export";

/**
 * In-browser promo render — the path that always works.
 *
 * Cloud rendering (Remotion Lambda) needs AWS credentials and a re-deployed
 * site bundle every time a template changes; when either is missing the export
 * dies. This renders the very same composition on the user's machine instead:
 * the Remotion <Player> is mounted off-screen at full size, stepped one exact
 * frame at a time, each frame is rasterised to a canvas, and WebCodecs encodes
 * the lot to an H.264 MP4 (the same encoder the chat-video export uses).
 * Frame-exact, so playback jank can't leak into the file.
 */

export type BrowserExportQuality = "fast" | "full";

export class BrowserExportUnsupported extends Error {}

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
/** two paints + a macrotask: React commit → R3F draw → compositor */
const settle = async () => {
  await nextFrame();
  await nextFrame();
  await new Promise((r) => setTimeout(r, 0));
};

export function canExportInBrowser(): boolean {
  return typeof VideoEncoder !== "undefined" && typeof VideoFrame !== "undefined";
}

export async function exportPromoInBrowser(
  project: PromoProject,
  media: PromoMedia[],
  opts: { quality?: BrowserExportQuality; onProgress?: (fraction: number, label: string) => void; signal?: AbortSignal } = {},
): Promise<{ blob: Blob; ext: "mp4" | "webm" }> {
  const { quality = "fast", onProgress, signal } = opts;
  if (!canExportInBrowser()) throw new BrowserExportUnsupported("This browser can't encode video. Use Chrome, Edge or Safari 16.4+ on desktop.");
  const template = getPromoTemplate(project.templateId);
  const Composition = PROMO_COMPONENTS[project.templateId];
  if (!template || !Composition) throw new Error("Unknown template");

  const dims = FORMAT_DIMENSIONS[project.format];
  // output size: "fast" caps the short edge at 720px, "full" keeps the composition size
  const k = quality === "full" ? 1 : Math.min(1, 720 / Math.min(dims.width, dims.height));
  const outW = Math.round((dims.width * k) / 2) * 2;
  const outH = Math.round((dims.height * k) / 2) * 2;
  const frames = project.durationInFrames;

  const inputProps = buildPromoInputProps(
    { ...project, screenshotAssetIds: media.map((m) => m.id) },
    { screenshots: media.map((m) => ({ url: m.url, width: m.width, height: m.height, kind: m.kind })), watermark: false },
  );

  // WebGL layers keep their pixels so the rasteriser can read them back
  (globalThis as { __MF_CAPTURE__?: boolean }).__MF_CAPTURE__ = true;

  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  // off-screen but laid out at full size (display:none would skip rendering)
  host.style.cssText = `position:fixed;left:-${dims.width + 200}px;top:0;width:${dims.width}px;height:${dims.height}px;overflow:hidden;pointer-events:none;contain:strict;`;
  document.body.appendChild(host);
  const root = createRoot(host);
  const ref = createRef<PlayerRef>();
  root.render(
    <Player
      ref={ref}
      component={Composition}
      inputProps={inputProps}
      durationInFrames={frames}
      fps={PROMO_FPS}
      compositionWidth={dims.width}
      compositionHeight={dims.height}
      style={{ width: dims.width, height: dims.height }}
      controls={false}
      autoPlay={false}
      loop={false}
      clickToPlay={false}
      acknowledgeRemotionLicense
      initiallyMuted
    />,
  );

  const writer = await createVideoWriter(outW, outH, PROMO_FPS);
  if (!writer) {
    root.unmount();
    host.remove();
    throw new BrowserExportUnsupported("No supported video encoder in this browser.");
  }

  try {
    // wait for the player to mount and the first paint (images + fonts decode)
    for (let i = 0; i < 100 && !ref.current; i++) await nextFrame();
    if (!ref.current) throw new Error("Preview failed to start");
    ref.current.pause();
    await Promise.all(Array.from(host.querySelectorAll("img")).map((img) => (img.complete ? null : img.decode().catch(() => {}))));
    await document.fonts?.ready;

    const { toCanvas, getFontEmbedCSS } = await import("html-to-image");
    ref.current.seekTo(0);
    await settle();
    // fonts are embedded once instead of re-fetched for every frame
    const fontEmbedCSS = await getFontEmbedCSS(host).catch(() => "");

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d", { alpha: false })!;
    const started = performance.now();

    for (let f = 0; f < frames; f++) {
      if (signal?.aborted) throw new DOMException("Export cancelled", "AbortError");
      ref.current.seekTo(f);
      await settle();
      const shot = await toCanvas(host, {
        pixelRatio: 1,
        canvasWidth: outW,
        canvasHeight: outH,
        width: dims.width,
        height: dims.height,
        fontEmbedCSS,
        skipAutoScale: true,
        cacheBust: false,
        style: { left: "0", top: "0", position: "static" },
      });
      ctx.drawImage(shot, 0, 0, outW, outH);
      await writer.addFrame(canvas);
      const done = f + 1;
      const perFrame = (performance.now() - started) / done;
      const eta = Math.max(0, Math.round((perFrame * (frames - done)) / 1000));
      onProgress?.(done / frames, `Frame ${done}/${frames}${eta > 3 ? ` · about ${eta}s left` : ""}`);
    }

    onProgress?.(1, "Finishing the file");
    const { blob, ext } = await writer.finish();
    return { blob, ext };
  } finally {
    writer.close();
    root.unmount();
    host.remove();
    delete (globalThis as { __MF_CAPTURE__?: boolean }).__MF_CAPTURE__;
  }
}
