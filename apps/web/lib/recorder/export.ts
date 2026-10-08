"use client";

import { createVideoWriter } from "../videoEncode";
import { canvasSize, drawFrame, paintBackground, type RecorderStyle } from "./compose";
import { smoothCursor, type CursorSettings } from "./cursor";
import { cleanFrameTime, CursorEraser, drawCameraBubble, drawCursorLayer, type CameraSettings, type CursorLayer } from "./overlay";
import { mixSoundtrack, type SoundEvent, type SoundSettings } from "./sounds";
import { decodeAudio, frameFetcher, type Recording } from "./source";
import type { ClickEvent, CursorTrack } from "./track";
import { cameraAt, cameraSpeed, cameraTrack, type CameraPose, type CameraTrack, type ZoomMotion, type ZoomSegment } from "./zoom";

export interface RecorderExportOpts {
  rec: Recording;
  zooms: ZoomSegment[];
  motion: ZoomMotion;
  style: RecorderStyle;
  cursor: { track: CursorTrack; clicks: ClickEvent[]; settings: CursorSettings } | null;
  camera: CameraSettings;
  sound: { settings: SoundSettings; events: SoundEvent[]; music: AudioBuffer | null };
  /** long side of the output in px */
  long: number;
  fps: 30 | 60;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

/** Camera poses across a half-frame shutter: one when still, up to 5 in fast moves. */
export function shutterPoses(track: CameraTrack, t: number, fps: number, blur: boolean): CameraPose[] {
  const now = cameraAt(track, t);
  if (!blur) return [now];
  const speed = cameraSpeed(track, t);
  const n = Math.min(5, Math.ceil(speed / 0.7));
  if (n <= 1) return [now];
  const span = (1000 / fps) * 0.5;
  return Array.from({ length: n }, (_, i) => cameraAt(track, t - span * (i / (n - 1))));
}

/**
 * Render the styled recording frame by frame (decoded with WebCodecs, so it
 * runs faster than real time on most machines) and encode it with the mixed
 * soundtrack: the recording's sound, music and effects.
 */
export async function exportRecording(o: RecorderExportOpts): Promise<{ blob: Blob; ext: string }> {
  const { width: W, height: H } = canvasSize(o.style.aspect, o.long);
  const writer = await createVideoWriter(W, H, o.fps);
  if (!writer) throw new Error("This browser can't export video. Try the latest Chrome or Edge.");
  try {
    const mb = await import("mediabunny");
    const input = new mb.Input({ formats: mb.ALL_FORMATS, source: new mb.BlobSource(o.rec.blob) });
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new Error("That recording has no video.");
    const sink = new mb.CanvasSink(track, { poolSize: 3 });

    const showCamera = !!o.rec.camera && o.camera.visible;
    let camFrames: AsyncGenerator<{ canvas: unknown } | null> | null = null;

    const out = document.createElement("canvas");
    out.width = W;
    out.height = H;
    const ctx = out.getContext("2d")!;
    const bg = document.createElement("canvas");
    bg.width = W;
    bg.height = H;
    paintBackground(bg.getContext("2d")!, W, H, o.style.background);

    const dur = o.rec.durationMs;
    let layer: CursorLayer | null = null;
    if (o.cursor) {
      const custom = o.cursor.settings.style !== "original";
      const smooth = smoothCursor(o.cursor.track, o.cursor.clicks, dur, o.fps, { ...o.cursor.settings, smoothing: custom ? o.cursor.settings.smoothing : 0 });
      const eraser = custom ? new CursorEraser(o.cursor.track, o.rec.width, o.rec.height) : null;
      if (eraser) {
        const ct = cleanFrameTime(o.cursor.track, 0, dur);
        const clean = ct != null ? await frameFetcher(o.rec)(ct) : null;
        if (clean) eraser.init(clean);
      }
      layer = { track: o.cursor.track, smooth, clicks: o.cursor.clicks, settings: o.cursor.settings, eraser };
    }
    const smoothForCamera = layer?.smooth;
    const camera = cameraTrack(o.zooms, dur, o.fps, {
      motion: o.motion,
      cursor: smoothForCamera ? (t) => ({ ...cameraCursor(smoothForCamera, t) }) : undefined,
    });

    const frames = Math.max(1, Math.floor((dur / 1000) * o.fps));
    const times = Array.from({ length: frames }, (_, i) => i / o.fps);
    if (showCamera) {
      const camInput = new mb.Input({ formats: mb.ALL_FORMATS, source: new mb.BlobSource(o.rec.camera!.blob) });
      const camTrack = await camInput.getPrimaryVideoTrack();
      if (camTrack) camFrames = new mb.CanvasSink(camTrack, { width: 720, height: Math.round((720 * o.rec.camera!.height) / o.rec.camera!.width), fit: "fill", poolSize: 2 }).canvasesAtTimestamps(times) as AsyncGenerator<{ canvas: unknown } | null>;
    }

    let i = 0;
    let last: CanvasImageSource | null = null;
    let lastCam: CanvasImageSource | null = null;
    for await (const wrapped of sink.canvasesAtTimestamps(times)) {
      if (o.signal?.aborted) throw new DOMException("Export cancelled", "AbortError");
      const t = (i / o.fps) * 1000;
      const source: CanvasImageSource | null = (wrapped?.canvas as CanvasImageSource | undefined) ?? last;
      if (camFrames) {
        const c = await camFrames.next();
        lastCam = ((c.value?.canvas as CanvasImageSource | undefined) ?? lastCam) || null;
      }
      if (source) {
        layer?.eraser?.update(source, t);
        const poses = shutterPoses(camera, t, o.fps, o.style.motionBlur);
        const zoom = poses[0].scale;
        drawFrame(ctx, W, H, source, o.rec.width, o.rec.height, {
          poses,
          style: o.style,
          background: bg,
          t,
          durationMs: dur,
          overlay: layer ? (c, video) => drawCursorLayer(c, video, t, layer!) : undefined,
          top: showCamera && lastCam ? (c) => drawCameraBubble(c, W, H, lastCam!, o.rec.camera!.width, o.rec.camera!.height, o.camera, zoom) : undefined,
        });
        last = source;
      } else ctx.drawImage(bg, 0, 0);
      await writer.addFrame(out);
      i++;
      if (i % 15 === 0) o.onProgress?.((i / frames) * 0.94);
    }
    await camFrames?.return(undefined);
    const recording = o.sound.settings.recordingVolume > 0 ? await decodeAudio(o.rec) : null;
    const audio = await mixSoundtrack({ durationMs: dur, recording, music: o.sound.music, events: o.sound.events, settings: o.sound.settings });
    const { blob, ext } = await writer.finish({ audio });
    o.onProgress?.(1);
    return { blob, ext };
  } finally {
    writer.close();
  }
}

/** The cursor as the camera should follow it: the smoothed pose, visible when drawn. */
export function cameraCursor(smooth: ReturnType<typeof smoothCursor>, t: number) {
  const f = Math.min(smooth.poses.length - 1, Math.max(0, Math.round((t / 1000) * smooth.fps)));
  const p = smooth.poses[f];
  return { x: p.x, y: p.y, visible: p.alpha > 0.3 };
}
