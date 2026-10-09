"use client";

import type { EncodedPacket } from "mediabunny";
import { avcCandidates, videoBitrate } from "./videoSettings";

/**
 * Frame-exact video encoding with WebCodecs + an MP4/WebM muxer.
 *
 * The old exporters played frames back on a real clock and screen-recorded a
 * canvas with MediaRecorder: any hiccup dropped frames, 60fps was a coin
 * flip, and every clip took as long to export as to watch. Here each frame is
 * handed to a VideoEncoder with an exact timestamp instead, so output is
 * deterministic at any fps/size and encodes as fast as frames are produced.
 *
 * `createVideoWriter` returns null where WebCodecs (or a usable codec) is
 * missing — callers keep the MediaRecorder path as the fallback.
 */

type Container = "mp4" | "webm";

interface CodecChoice {
  codec: "avc" | "vp9";
  container: Container;
  config: VideoEncoderConfig;
}

const VP9_CODECS = ["vp09.00.51.08", "vp09.00.61.08", "vp09.00.41.08", "vp09.00.10.08"];

async function isSupported(config: VideoEncoderConfig): Promise<boolean> {
  try {
    return !!(await VideoEncoder.isConfigSupported(config)).supported;
  } catch {
    return false;
  }
}

/** isConfigSupported can say yes and the encoder still fail (e.g. hardware at 4K) — encode one real frame. */
function probe(config: VideoEncoderConfig): Promise<boolean> {
  return new Promise((resolve) => {
    let produced = false;
    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      try {
        if (enc.state !== "closed") enc.close();
      } catch {
        /* already closed by an error */
      }
      resolve(ok);
    };
    const enc = new VideoEncoder({ output: () => (produced = true), error: () => done(false) });
    try {
      enc.configure(config);
      const canvas = document.createElement("canvas");
      canvas.width = config.width;
      canvas.height = config.height;
      canvas.getContext("2d")!.fillRect(0, 0, 1, 1);
      const frame = new VideoFrame(canvas, { timestamp: 0, alpha: "discard" });
      enc.encode(frame, { keyFrame: true });
      frame.close();
      enc.flush().then(() => done(produced), () => done(false));
    } catch {
      done(false);
    }
  });
}

async function pickCodec(width: number, height: number, fps: number): Promise<CodecChoice | null> {
  if (typeof VideoEncoder === "undefined" || typeof VideoFrame === "undefined") return null;
  const base = { width, height, bitrate: videoBitrate(width, height, fps), framerate: fps, latencyMode: "quality" as const };
  // H.264 MP4 first: it's what Instagram, TikTok, X and every OS player expect
  const choices: CodecChoice[] = [
    ...avcCandidates(width, height, fps).map((codec) => ({
      codec: "avc" as const,
      container: "mp4" as const,
      config: { ...base, codec, avc: { format: "avc" as const } },
    })),
    ...VP9_CODECS.map((codec) => ({ codec: "vp9" as const, container: "webm" as const, config: { ...base, codec } })),
  ];
  for (const choice of choices) {
    if ((await isSupported(choice.config)) && (await probe(choice.config))) return choice;
  }
  return null;
}

/** AAC in MP4, Opus in WebM. Browsers without a native AAC encoder get the WASM one. */
async function ensureAudioCodec(container: Container): Promise<"aac" | "opus" | null> {
  const mb = await import("mediabunny");
  const codec = container === "mp4" ? "aac" : "opus";
  const opts = { numberOfChannels: 2, sampleRate: 48_000, bitrate: 160_000 };
  if (await mb.canEncodeAudio(codec, opts)) return codec;
  if (codec === "aac") {
    try {
      const { registerAacEncoder } = await import("@mediabunny/aac-encoder");
      registerAacEncoder();
      if (await mb.canEncodeAudio("aac", opts)) return "aac";
    } catch {
      /* fall through: the video still exports, silently */
    }
  }
  return null;
}

export interface VideoWriter {
  readonly width: number;
  readonly height: number;
  readonly fps: number;
  readonly container: Container;
  /** Encode `source` as the next frame (1/fps after the previous one). */
  addFrame(source: HTMLCanvasElement | ImageBitmap): Promise<void>;
  /**
   * Mux everything added so far. `repeat` plays the encoded frames N times
   * back to back (loops) without encoding them again; `audio` adds a soundtrack.
   */
  finish(opts?: { repeat?: number; audio?: AudioBuffer | null }): Promise<{ blob: Blob; ext: Container; hasAudio: boolean }>;
  /** Release the encoder (safe to call after finish or on error). */
  close(): void;
}

export async function createVideoWriter(width: number, height: number, fps: number): Promise<VideoWriter | null> {
  const choice = await pickCodec(width, height, fps);
  if (!choice) return null;
  const mb = await import("mediabunny");

  const packets: EncodedPacket[] = [];
  let meta: EncodedVideoChunkMetadata | undefined;
  let failure: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk, m) => {
      packets.push(mb.EncodedPacket.fromEncodedChunk(chunk));
      if (!meta && m?.decoderConfig) meta = m;
    },
    error: (e) => {
      failure = e instanceof Error ? e : new Error(String(e));
    },
  });
  encoder.configure(choice.config);

  const frameUs = 1_000_000 / fps;
  const keyEvery = fps * 2;
  let index = 0;

  const close = () => {
    try {
      if (encoder.state !== "closed") encoder.close();
    } catch {
      /* already closed */
    }
  };

  return {
    width,
    height,
    fps,
    container: choice.container,
    async addFrame(source) {
      if (failure) throw failure;
      // backpressure: never queue more than a handful of raw frames
      while (encoder.encodeQueueSize > 4) await new Promise((r) => setTimeout(r, 2));
      const frame = new VideoFrame(source, {
        timestamp: Math.round(index * frameUs),
        duration: Math.round((index + 1) * frameUs) - Math.round(index * frameUs),
        alpha: "discard",
      });
      try {
        encoder.encode(frame, { keyFrame: index % keyEvery === 0 });
      } finally {
        frame.close();
      }
      index++;
    },
    async finish(opts = {}) {
      await encoder.flush();
      if (failure) throw failure;
      close();
      if (!packets.length || !meta) throw new Error("The encoder produced no frames");

      const repeat = Math.max(1, Math.floor(opts.repeat ?? 1));
      const cycle = index / fps; // seconds covered by one pass of the encoded frames
      const target = new mb.BufferTarget();
      const output = new mb.Output({
        format: choice.container === "mp4" ? new mb.Mp4OutputFormat({ fastStart: "in-memory" }) : new mb.WebMOutputFormat(),
        target,
      });
      const video = new mb.EncodedVideoPacketSource(choice.codec);
      output.addVideoTrack(video, { frameRate: fps });

      let audio: InstanceType<typeof mb.AudioBufferSource> | null = null;
      if (opts.audio) {
        const codec = await ensureAudioCodec(choice.container);
        if (codec) {
          audio = new mb.AudioBufferSource({ codec, bitrate: 160_000 });
          output.addAudioTrack(audio);
        }
      }

      await output.start();
      if (audio && opts.audio) await audio.add(opts.audio);
      let seq = 0;
      for (let r = 0; r < repeat; r++) {
        // frame 0 is a key frame, so each pass decodes on its own
        for (const p of packets) {
          const packet = p.clone({ timestamp: p.timestamp + r * cycle, sequenceNumber: seq });
          await video.add(packet, seq === 0 ? meta : undefined);
          seq++;
        }
      }
      video.close();
      audio?.close();
      await output.finalize();
      if (!target.buffer) throw new Error("Muxing produced no data");
      return {
        blob: new Blob([target.buffer], { type: choice.container === "mp4" ? "video/mp4" : "video/webm" }),
        ext: choice.container,
        hasAudio: !!audio,
      };
    },
    close,
  };
}

export function downloadBlob(blob: Blob, name: string): void {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

/**
 * A writer for TRANSPARENT video: VP9 with an alpha channel in WebM, which
 * Chrome, Edge and Firefox play with a see-through background (drop it on a
 * web page over any colour). mediabunny splits each frame into colour and
 * alpha streams. There's no H.264/MP4 path for alpha, so this returns null
 * where VP9 alpha can't be encoded (e.g. Safari), and callers say so.
 */
export async function createTransparentVideoWriter(width: number, height: number, fps: number): Promise<VideoWriter | null> {
  if (typeof VideoEncoder === "undefined" || typeof VideoFrame === "undefined") return null;
  const mb = await import("mediabunny");
  const bitrate = videoBitrate(width, height, fps);
  if (!(await mb.canEncodeVideo("vp9", { width, height, bitrate, alpha: "keep" }).catch(() => false))) return null;

  const target = new mb.BufferTarget();
  const output = new mb.Output({ format: new mb.WebMOutputFormat(), target });
  const source = new mb.VideoSampleSource({ codec: "vp9", bitrate, alpha: "keep", keyFrameInterval: 2 });
  output.addVideoTrack(source, { frameRate: fps });
  await output.start();
  let index = 0;
  let closed = false;

  return {
    width,
    height,
    fps,
    container: "webm",
    async addFrame(src) {
      const sample = new mb.VideoSample(src, { timestamp: index / fps, duration: 1 / fps });
      try {
        await source.add(sample);
      } finally {
        sample.close();
      }
      index++;
    },
    // loops aren't repeated here: alpha packets can't be cloned like the opaque
    // path's, and a seamless loop plays fine once — players loop it
    async finish() {
      if (!index) throw new Error("The encoder produced no frames");
      source.close();
      await output.finalize();
      closed = true;
      if (!target.buffer) throw new Error("Muxing produced no data");
      return { blob: new Blob([target.buffer], { type: "video/webm" }), ext: "webm" as const, hasAudio: false };
    },
    close() {
      if (closed) return;
      closed = true;
      void output.cancel().catch(() => {});
    },
  };
}
