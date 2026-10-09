"use client";

import { getFontEmbedCSS, toCanvas } from "html-to-image";
import { applyPalette, GIFEncoder, quantize } from "gifenc";
import type { SceneDocument } from "@framekit/scene";
import { drawDisclosure, loadDisclosure } from "./disclosure";
import { createTransparentVideoWriter, createVideoWriter, downloadBlob } from "./videoEncode";
import { DEFAULT_VIDEO_SETTINGS, videoBitrate, videoSize, type VideoSettings } from "./videoSettings";

/**
 * Export a motion preset as MP4/WebM or GIF.
 *
 * Every frame is posed (`renderAt`) and rasterized with html-to-image at the
 * chosen resolution, then encoded with an exact timestamp (WebCodecs), so 60fps
 * and 4K come out frame-perfect. Loops play twice so the clip reads as a loop —
 * the second pass reuses the encoded frames. Browsers without WebCodecs fall
 * back to recording a canvas playback with MediaRecorder.
 */

/** What the exporter needs to know about a clip: a motion preset or a video-zoom camera clip. */
export interface ExportClip {
  /** used in the file name */
  id: string;
  /** loops play twice; intros hold their last frame a beat */
  kind: "loop" | "intro";
  durationMs: number;
}

export interface MotionExportOpts {
  node: HTMLElement;
  scene: SceneDocument;
  preset: ExportClip;
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

const download = downloadBlob;

/** intros hold their final pose a beat before the clip ends */
const HOLD_S = 0.6;

export async function exportMotionVideo(o: MotionExportOpts & { settings?: VideoSettings }): Promise<"mp4" | "webm"> {
  const settings = o.settings ?? DEFAULT_VIDEO_SETTINGS;
  const fps = settings.fps;
  const { width: W, height: H } = videoSize(o.scene.canvas.width, o.scene.canvas.height, settings.resolution);
  const count = Math.max(2, Math.round((o.preset.durationMs / 1000) * fps));
  const disclosure = loadDisclosure();

  const transparent = !!settings.transparent;
  const writer = transparent ? await createTransparentVideoWriter(W, H, fps) : await createVideoWriter(W, H, fps);
  if (!writer) {
    // MediaRecorder can't keep alpha, so there is no fallback for transparent clips
    if (transparent) throw new Error("Transparent video needs Chrome, Edge or Firefox");
    return recordMotionVideo(o, W, H, fps, count);
  }
  // transparent: hide everything behind the subject for the length of the capture
  if (transparent) o.node.style.setProperty("--fk-bg-opacity", "0");
  try {
    let last: HTMLCanvasElement | null = null;
    await captureFrames(
      o,
      W,
      H,
      count,
      async (cvs) => {
        drawDisclosure(cvs.getContext("2d")!, W, H, disclosure);
        await writer.addFrame(cvs);
        last = cvs;
      },
      0.92
    );
    if (o.preset.kind === "intro" && last) {
      for (let i = 0; i < Math.round(fps * HOLD_S); i++) await writer.addFrame(last);
    }
    o.onProgress?.(0.96, "Finishing video…");
    const { blob, ext } = await writer.finish({ repeat: o.preset.kind === "loop" ? 2 : 1 });
    download(blob, `mockframe-${o.preset.id}-${W}x${H}-${fps}fps${transparent ? "-transparent" : ""}.${ext}`);
    o.onProgress?.(1, "Done");
    return ext;
  } finally {
    writer.close();
    if (transparent) o.node.style.removeProperty("--fk-bg-opacity");
  }
}

/** Fallback for browsers without WebCodecs: real-time canvas playback recorded by MediaRecorder. */
async function recordMotionVideo(o: MotionExportOpts, W: number, H: number, fps: number, count: number): Promise<"mp4" | "webm"> {
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
  const order = o.preset.kind === "loop" ? [...blobs.keys(), ...blobs.keys()] : [...blobs.keys(), ...Array(Math.round(fps * HOLD_S)).fill(count - 1)];

  const rec = document.createElement("canvas");
  rec.width = W;
  rec.height = H;
  const ctx = rec.getContext("2d")!;
  const mime =
    ["video/mp4;codecs=avc1.42E01E", "video/mp4"].find((t) => MediaRecorder.isTypeSupported(t)) ??
    (MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm");
  const isMp4 = mime.startsWith("video/mp4");
  const recorder = new MediaRecorder(rec.captureStream(fps), { mimeType: mime, videoBitsPerSecond: videoBitrate(W, H, fps) });
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
  download(blob, `mockframe-${o.preset.id}-${W}x${H}-${fps}fps.${isMp4 ? "mp4" : "webm"}`);
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
