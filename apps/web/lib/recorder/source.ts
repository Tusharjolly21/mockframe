"use client";

import { analysisPlan, RecordingAnalyzer, toGray, type Analysis } from "./track";

/** A recording loaded into the studio. */
export interface Recording {
  blob: Blob;
  url: string;
  name: string;
  width: number;
  height: number;
  durationMs: number;
  hasAudio: boolean;
  /** the webcam, recorded alongside (same start, same length) */
  camera?: { blob: Blob; url: string; width: number; height: number } | null;
}

export const MAX_RECORDING_BYTES = 1024 * 1024 * 1024;
export const MAX_RECORDING_MS = 10 * 60 * 1000;

/* -------------------------------- capture --------------------------------- */

export interface CaptureOptions {
  /** the tab's or system's own sound, when the browser offers it */
  systemAudio: boolean;
  /** a live microphone stream to record over the screen (voiceover) */
  mic: MediaStream | null;
  /** a live camera stream to record alongside */
  camera: MediaStream | null;
}

export type CaptureState = "ready" | "recording" | "paused" | "stopped";

export interface CaptureResult {
  screen: Blob;
  camera: Blob | null;
}

export interface Capture {
  stream: MediaStream;
  /** resolves once recording stops (button, shortcut or the browser's own bar) */
  done: Promise<CaptureResult>;
  /** start recording: call after the countdown */
  begin: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  /** stop and throw the recording away */
  cancel: () => void;
  state: () => CaptureState;
  /** recorded time so far, pauses excluded */
  elapsedMs: () => number;
}

const RECORDER_TYPES = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp9", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
const CAMERA_TYPES = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"];

export function canCapture(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia && typeof MediaRecorder !== "undefined";
}

export async function openMic(deviceId?: string): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: { deviceId: deviceId ? { exact: deviceId } : undefined, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
}

export async function openCamera(deviceId?: string): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    video: { deviceId: deviceId ? { exact: deviceId } : undefined, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
  });
}

export async function listDevices(): Promise<{ mics: MediaDeviceInfo[]; cameras: MediaDeviceInfo[] }> {
  try {
    const all = await navigator.mediaDevices.enumerateDevices();
    return { mics: all.filter((d) => d.kind === "audioinput"), cameras: all.filter((d) => d.kind === "videoinput") };
  } catch {
    return { mics: [], cameras: [] };
  }
}

/** One audio track out of several (system sound + mic), or the only one, or none. */
function mixAudio(tracks: MediaStreamTrack[]): { track: MediaStreamTrack | null; close: () => void } {
  if (tracks.length <= 1) return { track: tracks[0] ?? null, close: () => {} };
  const ctx = new AudioContext();
  const dest = ctx.createMediaStreamDestination();
  for (const t of tracks) ctx.createMediaStreamSource(new MediaStream([t])).connect(dest);
  return { track: dest.stream.getAudioTracks()[0], close: () => void ctx.close() };
}

/**
 * Ask the browser to share a tab, window or screen. Recording starts with
 * begin(), so a countdown can run first. Rejects when the person cancels
 * the picker.
 */
export async function startCapture(opts: CaptureOptions): Promise<Capture> {
  const display = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: { ideal: 60 }, width: { ideal: 3840 }, height: { ideal: 2160 } },
    audio: opts.systemAudio,
    // Chrome-only hints: start on tabs, keep this tab out of the list, offer system audio
    ...({ selfBrowserSurface: "exclude", surfaceSwitching: "include", preferCurrentTab: false, systemAudio: opts.systemAudio ? "include" : "exclude" } as object),
  } as DisplayMediaStreamOptions);
  const audio = mixAudio([...display.getAudioTracks(), ...(opts.mic?.getAudioTracks() ?? [])]);
  const stream = new MediaStream([...display.getVideoTracks(), ...(audio.track ? [audio.track] : [])]);

  const mimeType = RECORDER_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 16_000_000 });
  const camRecorder = opts.camera
    ? new MediaRecorder(opts.camera, { mimeType: CAMERA_TYPES.find((t) => MediaRecorder.isTypeSupported(t)), videoBitsPerSecond: 4_000_000 })
    : null;
  const chunks: Blob[] = [];
  const camChunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  if (camRecorder) camRecorder.ondataavailable = (e) => e.data.size && camChunks.push(e.data);

  let state: CaptureState = "ready";
  let cancelled = false;
  let startedAt = 0;
  let pausedTotal = 0;
  let pausedAt = 0;
  let limit: ReturnType<typeof setTimeout> | undefined;

  const release = () => {
    display.getTracks().forEach((t) => t.stop());
    audio.close();
    clearTimeout(limit);
  };
  const camDone = new Promise<Blob | null>((resolve) => {
    if (!camRecorder) return resolve(null);
    camRecorder.onstop = () => resolve(camChunks.length ? new Blob(camChunks, { type: camRecorder.mimeType || "video/webm" }) : null);
    camRecorder.onerror = () => resolve(null);
  });
  let rejectDone: (e: Error) => void = () => {};
  const done = new Promise<CaptureResult>((resolve, reject) => {
    rejectDone = reject;
    recorder.onstop = async () => {
      release();
      const camera = await camDone;
      if (cancelled) reject(new DOMException("Recording cancelled", "AbortError"));
      else if (chunks.length) resolve({ screen: new Blob(chunks, { type: recorder.mimeType || "video/webm" }), camera });
      else reject(new Error("Nothing was recorded"));
    };
    recorder.onerror = () => {
      release();
      reject(new Error("Recording failed"));
    };
  });

  const stop = () => {
    if (state === "stopped") return;
    const wasReady = state === "ready";
    state = "stopped";
    if (wasReady) {
      // stopped during the countdown: nothing to keep
      release();
      rejectDone(new DOMException("Recording cancelled", "AbortError"));
      return;
    }
    if (recorder.state !== "inactive") recorder.stop();
    if (camRecorder && camRecorder.state !== "inactive") camRecorder.stop();
  };
  // the browser's own "Stop sharing" ends the video track
  display.getVideoTracks()[0]?.addEventListener("ended", stop);

  return {
    stream,
    done,
    begin: () => {
      if (state !== "ready") return;
      state = "recording";
      startedAt = performance.now();
      recorder.start(1000);
      camRecorder?.start(1000);
      limit = setTimeout(stop, MAX_RECORDING_MS);
    },
    pause: () => {
      if (state !== "recording") return;
      state = "paused";
      pausedAt = performance.now();
      recorder.pause();
      camRecorder?.pause();
    },
    resume: () => {
      if (state !== "paused") return;
      state = "recording";
      pausedTotal += performance.now() - pausedAt;
      recorder.resume();
      camRecorder?.resume();
    },
    stop,
    cancel: () => {
      cancelled = true;
      stop();
    },
    state: () => state,
    elapsedMs: () => {
      if (state === "ready" || !startedAt) return 0;
      const now = state === "paused" ? pausedAt : performance.now();
      return now - startedAt - pausedTotal;
    },
  };
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

/** Read a webcam recording made alongside the screen. Returns null if it can't be played. */
export async function loadCameraRecording(file: Blob): Promise<Recording["camera"]> {
  try {
    const blob = await remux(file);
    const { input } = await openInput(blob);
    const track = await input.getPrimaryVideoTrack();
    if (!track || !(await track.canDecode())) return null;
    return { blob, url: URL.createObjectURL(blob), width: track.squarePixelWidth || track.codedWidth, height: track.squarePixelHeight || track.codedHeight };
  } catch {
    return null;
  }
}

/* -------------------------------- analysis -------------------------------- */

/**
 * Watch the recording once, frame by frame at reduced size, and find the
 * cursor, the clicks, the typing and where things change. Feeds the zooms,
 * the cursor styles, the click effects and the sound effects.
 */
export async function analyzeRecording(rec: Recording, onProgress?: (fraction: number) => void): Promise<Analysis> {
  const { mb, input } = await openInput(rec.blob);
  const track = await input.getPrimaryVideoTrack();
  const plan = analysisPlan(rec.width, rec.height, rec.durationMs);
  const analyzer = new RecordingAnalyzer(plan.w, plan.h, rec.durationMs);
  if (!track) return analyzer.finish();
  const sink = new mb.CanvasSink(track, { width: plan.w, height: plan.h, fit: "fill", poolSize: 2 });
  const times: number[] = [];
  for (let t = 0; t < rec.durationMs; t += 1000 / plan.fps) times.push(t / 1000);

  const scratch = document.createElement("canvas");
  scratch.width = plan.w;
  scratch.height = plan.h;
  const sctx = scratch.getContext("2d", { willReadFrequently: true })!;
  const gray = new Uint8Array(plan.w * plan.h);
  let i = 0;
  let lastYield = performance.now();
  for await (const wrapped of sink.canvasesAtTimestamps(times)) {
    const t = times[i++] * 1000;
    if (!wrapped) continue;
    sctx.drawImage(wrapped.canvas as CanvasImageSource, 0, 0, plan.w, plan.h);
    analyzer.push(toGray(sctx.getImageData(0, 0, plan.w, plan.h).data, gray), Math.round(t));
    if (i % 15 === 0) onProgress?.(i / times.length);
    // let the page breathe on long recordings
    if (performance.now() - lastYield > 120) {
      await new Promise((r) => setTimeout(r, 0));
      lastYield = performance.now();
    }
  }
  onProgress?.(1);
  return analyzer.finish();
}

/** Fetches single frames of a recording on demand (for the cursor eraser's clean plate). */
export function frameFetcher(rec: Recording, maxW = 1920) {
  let sinkP: Promise<{ getCanvas: (t: number) => Promise<{ canvas: unknown } | null> }> | null = null;
  const w = Math.min(maxW, rec.width);
  const h = Math.max(2, Math.round((w * rec.height) / rec.width));
  return async (ms: number): Promise<CanvasImageSource | null> => {
    sinkP ??= (async () => {
      const { mb, input } = await openInput(rec.blob);
      const track = await input.getPrimaryVideoTrack();
      if (!track) throw new Error("no video");
      return new mb.CanvasSink(track, { width: w, height: h, fit: "fill", poolSize: 1 });
    })();
    try {
      const sink = await sinkP;
      const f = await sink.getCanvas(ms / 1000);
      if (!f) return null;
      // copy out: the sink reuses its canvas
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d")!.drawImage(f.canvas as CanvasImageSource, 0, 0);
      return c;
    } catch {
      return null;
    }
  };
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
