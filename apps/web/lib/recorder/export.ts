"use client";

import { createVideoWriter } from "../videoEncode";
import { canvasSize, drawFrame, paintBackground, type RecorderStyle } from "./compose";
import { decodeAudio, type Recording } from "./source";
import { cameraAt, cameraTrack, type ZoomSegment } from "./zoom";

export interface RecorderExportOpts {
  rec: Recording;
  zooms: ZoomSegment[];
  style: RecorderStyle;
  /** long side of the output in px */
  long: number;
  fps: 30 | 60;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

/**
 * Render the styled recording frame by frame (decoded with WebCodecs, so it
 * runs faster than real time on most machines) and encode it with the
 * recording's own sound.
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

    const out = document.createElement("canvas");
    out.width = W;
    out.height = H;
    const ctx = out.getContext("2d")!;
    const bg = document.createElement("canvas");
    bg.width = W;
    bg.height = H;
    paintBackground(bg.getContext("2d")!, W, H, o.style.background);

    const camera = cameraTrack(o.zooms, o.rec.durationMs, o.fps);
    const frames = Math.max(1, Math.floor((o.rec.durationMs / 1000) * o.fps));
    const times = Array.from({ length: frames }, (_, i) => i / o.fps);
    let i = 0;
    let last: CanvasImageSource | null = null;
    for await (const wrapped of sink.canvasesAtTimestamps(times)) {
      if (o.signal?.aborted) throw new DOMException("Export cancelled", "AbortError");
      const source: CanvasImageSource | null = (wrapped?.canvas as CanvasImageSource | undefined) ?? last;
      if (source) {
        drawFrame(ctx, W, H, source, o.rec.width, o.rec.height, cameraAt(camera, (i / o.fps) * 1000), o.style, bg);
        last = source;
      } else ctx.drawImage(bg, 0, 0);
      await writer.addFrame(out);
      i++;
      if (i % 15 === 0) o.onProgress?.(i / frames);
    }
    const audio = await decodeAudio(o.rec);
    const { blob, ext } = await writer.finish({ audio });
    o.onProgress?.(1);
    return { blob, ext };
  } finally {
    writer.close();
  }
}
