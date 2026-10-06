"use client";

import { getFontEmbedCSS, toCanvas } from "html-to-image";
import { applyPalette, GIFEncoder, quantize } from "gifenc";
import type { SceneDocument } from "@framekit/scene";
import { drawDisclosure, loadDisclosure } from "./disclosure";
import type { MotionPreset } from "./motion";

/**
 * Export a motion preset as MP4/WebM or GIF.
 *
 * Every frame is posed (`renderAt`), rasterized with html-to-image and kept as
 * a compressed JPEG blob (a 4s clip at 1080p would need ~500MB as raw
 * bitmaps). Video playback then decodes a few frames ahead while
 * MediaRecorder captures the canvas on a real clock, the same approach as
 * the chat-replay exporter. Loops play twice so the clip reads as a loop.
 */

export interface MotionExportOpts {
  node: HTMLElement;
  scene: SceneDocument;
  preset: MotionPreset;
  /** pose the scene at clip time t (0..1), transiently */
  renderAt: (t: number) => void;
  restore: () => void;
  onProgress?: (fraction: number, label: string) => void;
}

const settle = () => new Promise<void>((r) => requestAnimationFrame(() => setTimeout(r, 40)));

async function captureFrames(
  o: MotionExportOpts,
  W: number,
  H: number,
  count: number,
  onFrame: (cvs: HTMLCanvasElement, i: number) => Promise<void>,
  progressShare: number
) {
  // embedding fonts is the slow part of html-to-image: do it once per clip
  const fontEmbedCSS = await getFontEmbedCSS(o.node).catch(() => undefined);
  try {
    for (let i = 0; i < count; i++) {
      o.renderAt(count === 1 ? 0 : i / (o.preset.kind === "loop" ? count : count - 1));
      await settle();
      const cvs = await toCanvas(o.node, {
        pixelRatio: 1,
        canvasWidth: W,
        canvasHeight: H,
        fontEmbedCSS,
        style: { transform: "none" },
      });
      await onFrame(cvs, i);
      o.onProgress?.(((i + 1) / count) * progressShare, `Rendering frame ${i + 1}/${count}`);
    }
  } finally {
    o.restore();
  }
}

function download(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export async function exportMotionVideo(o: MotionExportOpts & { maxWidth?: number; fps?: number }): Promise<"mp4" | "webm"> {
  const fps = o.fps ?? 30;
  const scale = Math.min(1, (o.maxWidth ?? 1080) / o.scene.canvas.width);
  const W = Math.round(o.scene.canvas.width * scale / 2) * 2;
  const H = Math.round(o.scene.canvas.height * scale / 2) * 2;
  const count = Math.max(2, Math.round((o.preset.durationMs / 1000) * fps));
  const disclosure = loadDisclosure();

  const blobs: Blob[] = [];
  await captureFrames(
    o,
    W,
    H,
    count,
    async (cvs) => {
      drawDisclosure(cvs.getContext("2d")!, W, H, disclosure);
      const b = await new Promise<Blob | null>((r) => cvs.toBlob(r, "image/jpeg", 0.93));
      if (!b) throw new Error("Frame encode failed");
      blobs.push(b);
    },
    0.75
  );

  // loops play twice; intros play once then hold the final pose a beat
  const order = o.preset.kind === "loop" ? [...blobs.keys(), ...blobs.keys()] : [...blobs.keys(), ...Array(Math.round(fps * 0.6)).fill(count - 1)];

  const rec = document.createElement("canvas");
  rec.width = W;
  rec.height = H;
  const ctx = rec.getContext("2d")!;
  const mime =
    ["video/mp4;codecs=avc1.42E01E", "video/mp4"].find((t) => MediaRecorder.isTypeSupported(t)) ??
    (MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm");
  const isMp4 = mime.startsWith("video/mp4");
  const recorder = new MediaRecorder(rec.captureStream(fps), { mimeType: mime, videoBitsPerSecond: 14_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);

  // decode a small window ahead of the playhead
  const decoded = new Map<number, ImageBitmap>();
  const pending = new Set<number>();
  const decode = (i: number) => {
    if (i >= count || decoded.has(i) || pending.has(i)) return Promise.resolve();
    pending.add(i);
    return createImageBitmap(blobs[i]).then((bm) => {
      pending.delete(i);
      decoded.set(i, bm);
    });
  };
  await Promise.all([0, 1, 2, 3, 4, 5].map(decode));
  ctx.drawImage(decoded.get(0)!, 0, 0, W, H);

  await new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
    recorder.start();
    const t0 = performance.now();
    const frameMs = 1000 / fps;
    let last = -1;
    const tick = (now: number) => {
      const step = Math.floor((now - t0) / frameMs);
      if (step >= order.length) {
        recorder.stop();
        return;
      }
      const idx = order[step];
      const bm = decoded.get(idx);
      if (bm && idx !== last) {
        ctx.drawImage(bm, 0, 0, W, H);
        last = idx;
      }
      // keep only a small window around the playhead (loops wrap back to 0)
      const keep = new Set(order.slice(Math.max(0, step - 2), step + 8));
      for (const k of keep) void decode(k);
      for (const key of [...decoded.keys()]) {
        if (!keep.has(key)) {
          decoded.get(key)!.close();
          decoded.delete(key);
        }
      }
      o.onProgress?.(0.75 + 0.25 * (step / order.length), "Encoding video…");
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  for (const bm of decoded.values()) bm.close();

  const blob = new Blob(chunks, { type: isMp4 ? "video/mp4" : "video/webm" });
  if (!blob.size) throw new Error("Recording produced no data");
  download(blob, `mockframe-${o.preset.id}-${W}x${H}.${isMp4 ? "mp4" : "webm"}`);
  return isMp4 ? "mp4" : "webm";
}

export async function exportMotionGif(o: MotionExportOpts & { maxWidth?: number; fps?: number }): Promise<void> {
  const fps = o.fps ?? 15;
  const scale = Math.min(1, (o.maxWidth ?? 540) / o.scene.canvas.width);
  const W = Math.round(o.scene.canvas.width * scale);
  const H = Math.round(o.scene.canvas.height * scale);
  const count = Math.max(2, Math.round((o.preset.durationMs / 1000) * fps));
  const delay = Math.round(1000 / fps);
  const disclosure = loadDisclosure();

  const gif = GIFEncoder();
  await captureFrames(
    o,
    W,
    H,
    count,
    async (cvs, i) => {
      const ctx = cvs.getContext("2d")!;
      drawDisclosure(ctx, W, H, disclosure);
      const data = ctx.getImageData(0, 0, W, H).data;
      const palette = quantize(data, 256);
      // intros hold their final pose before the GIF loops back
      const hold = o.preset.kind === "intro" && i === count - 1 ? 1200 : 0;
      gif.writeFrame(applyPalette(data, palette), W, H, { palette, delay: delay + hold });
    },
    0.98
  );
  gif.finish();
  const blob = new Blob([gif.bytes() as BlobPart], { type: "image/gif" });
  if (!blob.size) throw new Error("Encoding produced no data");
  download(blob, `mockframe-${o.preset.id}-${W}x${H}.gif`);
}
