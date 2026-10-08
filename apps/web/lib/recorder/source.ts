"use client";

import type { ActivitySample } from "./zoom";

/** A recording loaded into the studio. */
export interface Recording {
  blob: Blob;
  url: string;
  name: string;
  width: number;
  height: number;
  durationMs: number;
  hasAudio: boolean;
}

export const MAX_RECORDING_BYTES = 1024 * 1024 * 1024;
export const MAX_RECORDING_MS = 10 * 60 * 1000;

/* -------------------------------- capture --------------------------------- */

export interface Capture {
  stream: MediaStream;
  /** resolves with the recording once sharing stops (button or browser bar) */
  done: Promise<Blob>;
  stop: () => void;
}

const RECORDER_TYPES = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp9", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];

export function canCapture(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia && typeof MediaRecorder !== "undefined";
}

/**
 * Ask the browser to share a tab, window or screen and record it. Rejects
 * when the person cancels the picker.
 */
export async function startCapture(): Promise<Capture> {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: { ideal: 60 }, width: { ideal: 3840 }, height: { ideal: 2160 } },
    audio: true,
    // Chrome-only hints: start on tabs, keep this tab out of the list
    ...({ selfBrowserSurface: "exclude", surfaceSwitching: "include", preferCurrentTab: false } as object),
  } as DisplayMediaStreamOptions);
  const mimeType = RECORDER_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 16_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      if (chunks.length) resolve(new Blob(chunks, { type: recorder.mimeType || "video/webm" }));
      else reject(new Error("Nothing was recorded"));
    };
    recorder.onerror = () => reject(new Error("Recording failed"));
  });
  const stop = () => recorder.state !== "inactive" && recorder.stop();
  // the browser's own "Stop sharing" ends the video track
  stream.getVideoTracks()[0]?.addEventListener("ended", stop);
  recorder.start(1000);
  setTimeout(stop, MAX_RECORDING_MS);
  return { stream, done, stop };
}

/* --------------------------------- loading -------------------------------- */

async function openInput(blob: Blob) {
  const mb = await import("mediabunny");
  return { mb, input: new mb.Input({ formats: mb.ALL_FORMATS, source: new mb.BlobSource(blob) }) };
}

/**
 * MediaRecorder files have no index, so players can't seek in them. Copy the
 * tracks into a fresh WebM (no re-encode) that seeks properly.
 */
async function remux(blob: Blob): Promise<Blob> {
  try {
    const { mb, input } = await openInput(blob);
    const output = new mb.Output({ format: new mb.WebMOutputFormat(), target: new mb.BufferTarget() });
    const conversion = await mb.Conversion.init({ input, output });
    if (!conversion.isValid) return blob;
    await conversion.execute();
    const buffer = (output.target as InstanceType<typeof mb.BufferTarget>).buffer;
    return buffer ? new Blob([buffer], { type: "video/webm" }) : blob;
  } catch {
    return blob;
  }
}

/** Read size, length and audio of a recording (and make it seekable). */
export async function loadRecording(file: Blob, name: string, opts: { fromCapture?: boolean } = {}): Promise<Recording> {
  if (file.size > MAX_RECORDING_BYTES) throw new Error("That recording is over 1 GB. Trim it first, or record a shorter clip.");
  // uploads straight from a browser recorder have the same problem
  const blob = opts.fromCapture || file.type === "video/webm" ? await remux(file) : file;
  const { input } = await openInput(blob);
  let track;
  try {
    track = await input.getPrimaryVideoTrack();
  } catch {
    track = null;
  }
  if (!track) throw new Error("That file has no video we can read. Try an MP4 or WebM.");
  if (!(await track.canDecode())) throw new Error("This browser can't play that video's format. Try an MP4 (H.264) or WebM.");
  const durationMs = Math.round((await input.computeDuration()) * 1000);
  if (!durationMs) throw new Error("That recording is empty.");
  if (durationMs > MAX_RECORDING_MS) throw new Error("Recordings can be up to 10 minutes long.");
  const audio = await input.getPrimaryAudioTrack().catch(() => null);
  return {
    blob,
    url: URL.createObjectURL(blob),
    name,
    width: track.squarePixelWidth || track.codedWidth,
    height: track.squarePixelHeight || track.codedHeight,
    durationMs,
    hasAudio: !!audio,
  };
}

/* -------------------------------- activity -------------------------------- */

const SAMPLE_W = 96;
const STEP_MS = 200;
/** a pixel changed if its brightness moved by more than this (0..255) */
const PIXEL_THRESHOLD = 26;

/**
 * Sample the recording a few times a second at thumbnail size and record
 * where it changed between samples. Feeds detectZooms().
 */
export async function analyzeActivity(rec: Recording, onProgress?: (fraction: number) => void): Promise<ActivitySample[]> {
  const { mb, input } = await openInput(rec.blob);
  const track = await input.getPrimaryVideoTrack();
  if (!track) return [];
  const w = SAMPLE_W;
  const h = Math.max(8, Math.round((SAMPLE_W * rec.height) / rec.width));
  const sink = new mb.CanvasSink(track, { width: w, height: h, fit: "fill", poolSize: 2 });
  const times: number[] = [];
  for (let t = 0; t < rec.durationMs; t += STEP_MS) times.push(t / 1000);

  const samples: ActivitySample[] = [];
  let prev: Uint8ClampedArray | null = null;
  let i = 0;
  const scratch = document.createElement("canvas");
  scratch.width = w;
  scratch.height = h;
  const sctx = scratch.getContext("2d", { willReadFrequently: true })!;
  for await (const wrapped of sink.canvasesAtTimestamps(times)) {
    const t = times[i++] * 1000;
    if (!wrapped) continue;
    sctx.drawImage(wrapped.canvas as CanvasImageSource, 0, 0, w, h);
    const data = sctx.getImageData(0, 0, w, h).data;
    const luma = new Uint8ClampedArray(w * h);
    for (let p = 0, q = 0; q < luma.length; p += 4, q++) luma[q] = (data[p] * 77 + data[p + 1] * 150 + data[p + 2] * 29) >> 8;
    if (prev) {
      let changed = 0;
      let x0 = w, y0 = h, x1 = -1, y1 = -1;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const k = y * w + x;
          if (Math.abs(luma[k] - prev[k]) > PIXEL_THRESHOLD) {
            changed++;
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
        }
      }
      samples.push({
        t,
        energy: changed / luma.length,
        box: changed ? { x: x0 / w, y: y0 / h, w: (x1 - x0 + 1) / w, h: (y1 - y0 + 1) / h } : null,
      });
    }
    prev = luma;
    if (i % 10 === 0) onProgress?.(i / times.length);
  }
  onProgress?.(1);
  return samples;
}

/** The recording's sound, decoded for the exporter (null when silent or unreadable). */
export async function decodeAudio(rec: Recording): Promise<AudioBuffer | null> {
  if (!rec.hasAudio) return null;
  try {
    const ctx = new OfflineAudioContext(2, 48_000, 48_000);
    return await ctx.decodeAudioData(await rec.blob.arrayBuffer());
  } catch {
    return null;
  }
}
