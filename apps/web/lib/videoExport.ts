"use client";

import { toCanvas } from "html-to-image";
import { drawDisclosure, loadDisclosure } from "./disclosure";
import type { SceneDocument } from "@framekit/scene";
import type { AnimShot } from "@/lib/screens";
import { DOT_MS, renderReplayAudio } from "./replayAudio";
import { createVideoWriter, downloadBlob } from "./videoEncode";
import { DEFAULT_VIDEO_SETTINGS, videoBitrate, videoSize, type VideoSettings } from "./videoSettings";

/**
 * Premium chat-replay video export. The animation reads like a real
 * conversation — a typing indicator (animated dots / "typing…" header) before
 * each reply, then the message eases in — and the WHOLE scene (3D-tilted
 * device, background, effects) is captured, so it's a "3D video", not a flat
 * screen recording.
 *
 * Pipeline (client-side, deterministic — mirrors the §2.4 worker):
 *   1. Pre-render each unique state (reveal-k, and 3 dot phases per typing-k)
 *      via html-to-image at the export resolution.
 *   2. Compose every output frame at its exact time (eased crossfades between
 *      shots, dot cycling during typing beats) and encode it with WebCodecs;
 *      the click/pop/music soundtrack is rendered offline and muxed in.
 *   Browsers without WebCodecs play the timeline on a real clock and record
 *   it with MediaRecorder instead.
 */

export interface VideoExportOpts {
  node: HTMLElement;
  scene: SceneDocument;
  plan: AnimShot[];
  /** set the animated layer to a given reveal/typing state (transient) */
  renderState: (s: { k: number; typing: boolean; dotPhase: number; settled: boolean }) => void;
  restore: () => void;
  onProgress?: (fraction: number, label: string) => void;
  settings?: VideoSettings;
  /** soundtrack: key clicks + message pops, and the lo-fi bed */
  sound?: { clicks: boolean; music: boolean };
}

const easeProgress = (t: number, easing: "linear" | "ease-in-out" | "spring" = "ease-in-out") => {
  if (easing === "linear") return t;
  if (easing === "spring") return 1 - Math.pow(1 - t, 3);
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
};

const settle = () => new Promise<void>((r) => requestAnimationFrame(() => setTimeout(r, 45)));
const keyOf = (k: number, typing: boolean, phase: number, settled: boolean) =>
  `${k}|${typing ? "t" + phase : settled ? "rs" : "r"}`;

type ReplayState = { k: number; typing: boolean; phase: number; settled: boolean };

/** Every unique visual state the plan passes through (reveal once per k; typing = 3 dot phases). */
function uniqueStates(plan: AnimShot[]): ReplayState[] {
  const states: ReplayState[] = [];
  const seen = new Set<string>();
  for (const s of plan) {
    const phases = s.typing ? [0, 1, 2] : [0];
    for (const p of phases) {
      const key = keyOf(s.k, s.typing, p, !!s.settled);
      if (!seen.has(key)) {
        seen.add(key);
        states.push({ k: s.k, typing: s.typing, phase: p, settled: !!s.settled });
      }
    }
  }
  return states;
}

/** Which frame(s) show at time t (ms): the current shot's frame, plus the previous one while crossfading in. */
function frameAt(plan: AnimShot[], t: number): { key: string; prevKey?: string; alpha: number } {
  let acc = 0;
  let idx = 0;
  for (; idx < plan.length - 1; idx++) {
    const dur = plan[idx].fadeMs + plan[idx].holdMs;
    if (t < acc + dur) break;
    acc += dur;
  }
  const shot = plan[idx];
  const into = Math.max(0, t - acc);
  const phase = shot.typing ? Math.floor(into / DOT_MS) % 3 : 0;
  const key = keyOf(shot.k, shot.typing, phase, !!shot.settled);
  if (idx > 0 && into < shot.fadeMs) {
    const prev = plan[idx - 1];
    return { key, prevKey: keyOf(prev.k, prev.typing, 0, !!prev.settled), alpha: easeProgress(into / shot.fadeMs, shot.easing) };
  }
  return { key, alpha: 1 };
}

export async function exportSceneVideo(o: VideoExportOpts): Promise<"mp4" | "webm"> {
  const { node, scene, plan, renderState, restore, onProgress } = o;
  if (!plan.length) throw new Error("Nothing to animate");
  const settings = o.settings ?? DEFAULT_VIDEO_SETTINGS;
  const fps = settings.fps;
  const { width: W, height: H } = videoSize(scene.canvas.width, scene.canvas.height, settings.resolution);
  const totalDur = plan.reduce((a, s) => a + s.fadeMs + s.holdMs, 0);

  const writer = await createVideoWriter(W, H, fps);
  if (!writer) return recordSceneVideo(o, fps);

  try {
    /* 1 — pre-render every state; kept as JPEG blobs, not canvases (a long
       chat at 4K would otherwise hold gigabytes of pixels) */
    const states = uniqueStates(plan);
    const blobs = new Map<string, Blob>();
    try {
      for (let i = 0; i < states.length; i++) {
        const st = states[i];
        renderState({ k: st.k, typing: st.typing, dotPhase: st.phase, settled: st.settled });
        await settle();
        const cvs = await toCanvas(node, { pixelRatio: 1, canvasWidth: W, canvasHeight: H, style: { transform: "none" } });
        const blob = await new Promise<Blob | null>((r) => cvs.toBlob(r, "image/jpeg", 0.95));
        if (!blob) throw new Error("Frame encode failed");
        blobs.set(keyOf(st.k, st.typing, st.phase, st.settled), blob);
        onProgress?.(((i + 1) / states.length) * 0.45, `Rendering ${i + 1}/${states.length}`);
      }
    } finally {
      restore();
    }

    /* 2 — compose and encode every frame at its exact time */
    const decoded = new Map<string, ImageBitmap>();
    const bitmap = async (key: string) => {
      const hit = decoded.get(key);
      if (hit) {
        decoded.delete(key); // re-insert = most recently used
        decoded.set(key, hit);
        return hit;
      }
      const blob = blobs.get(key);
      if (!blob) throw new Error("Missing replay frame");
      const bm = await createImageBitmap(blob);
      decoded.set(key, bm);
      while (decoded.size > 6) {
        const [oldest, old] = decoded.entries().next().value as [string, ImageBitmap];
        old.close();
        decoded.delete(oldest);
      }
      return bm;
    };

    const rec = document.createElement("canvas");
    rec.width = W;
    rec.height = H;
    const ctx = rec.getContext("2d")!;
    const disclosureCfg = loadDisclosure();
    const total = Math.max(1, Math.ceil((totalDur / 1000) * fps));
    try {
      for (let f = 0; f < total; f++) {
        const { key, prevKey, alpha } = frameAt(plan, (f * 1000) / fps);
        ctx.clearRect(0, 0, W, H);
        if (prevKey) ctx.drawImage(await bitmap(prevKey), 0, 0, W, H);
        ctx.globalAlpha = alpha;
        ctx.drawImage(await bitmap(key), 0, 0, W, H);
        ctx.globalAlpha = 1;
        // fictional-recreation label rides every frame (pixels, not metadata)
        drawDisclosure(ctx, W, H, disclosureCfg);
        await writer.addFrame(rec);
        if (f % 6 === 0) onProgress?.(0.45 + 0.45 * (f / total), `Encoding frame ${f + 1}/${total}`);
      }
    } finally {
      for (const bm of decoded.values()) bm.close();
    }

    /* 3 — soundtrack + mux */
    onProgress?.(0.92, o.sound?.clicks || o.sound?.music ? "Mixing audio…" : "Finishing video…");
    const audio = o.sound ? await renderReplayAudio(plan, (total * 1000) / fps, o.sound).catch(() => null) : null;
    const { blob, ext } = await writer.finish({ audio });
    downloadBlob(blob, `mockframe-replay-${W}x${H}-${fps}fps.${ext}`);
    onProgress?.(1, "Done");
    return ext;
  } finally {
    writer.close();
  }
}

/** Fallback for browsers without WebCodecs: real-time playback recorded by MediaRecorder (≤1080p). */
async function recordSceneVideo(o: VideoExportOpts, fps: number): Promise<"mp4" | "webm"> {
  const { node, scene, plan, renderState, restore, onProgress } = o;
  const { width: W, height: H } = videoSize(scene.canvas.width, scene.canvas.height, "1080p");

  /* 1 — pre-render every unique state (reveal once per k; typing = 3 phases) */
  const states = uniqueStates(plan);
  const frames = new Map<string, HTMLCanvasElement>();
  try {
    for (let i = 0; i < states.length; i++) {
      const st = states[i];
      renderState({ k: st.k, typing: st.typing, dotPhase: st.phase, settled: st.settled });
      await settle();
      const cvs = await toCanvas(node, { pixelRatio: 1, canvasWidth: W, canvasHeight: H, style: { transform: "none" } });
      frames.set(keyOf(st.k, st.typing, st.phase, st.settled), cvs);
      onProgress?.(((i + 1) / states.length) * 0.55, `Rendering ${i + 1}/${states.length}`);
    }
  } finally {
    restore();
  }

  const shotFrame = (s: AnimShot, phase: number) =>
    frames.get(keyOf(s.k, s.typing, s.typing ? ((phase % 3) + 3) % 3 : 0, !!s.settled))!;

  /* 2 — schedule: each shot spans [fadeMs + holdMs] */
  const timeline = plan.map((s) => ({ shot: s, dur: s.fadeMs + s.holdMs }));
  const totalDur = timeline.reduce((a, t) => a + t.dur, 0);

  /* 3 — record playback */
  const rec = document.createElement("canvas");
  rec.width = W;
  rec.height = H;
  const ctx = rec.getContext("2d")!;
  const stream = rec.captureStream(fps);
  
  interface SoundManagerGlobal {
    dest?: MediaStreamAudioDestinationNode;
    ctx?: AudioContext;
    isPlayingKeyClick?: boolean;
    isPlayingMusic?: boolean;
    init: () => void;
    playClick: () => void;
    playPop: () => void;
    startLofi: () => void;
    stopLofi: () => void;
  }
  const soundManager = (window as unknown as { __soundManager?: SoundManagerGlobal }).__soundManager;
  let combinedStream = stream;
  if (soundManager?.dest && (soundManager.isPlayingKeyClick || soundManager.isPlayingMusic)) {
    soundManager.init();
    // if music is enabled, start playing it now so it is recorded
    if (soundManager.isPlayingMusic) {
      soundManager.startLofi();
    }
    const audioTracks = soundManager.dest.stream.getAudioTracks();
    if (audioTracks.length > 0) {
      combinedStream = new MediaStream([
        ...stream.getVideoTracks(),
        ...audioTracks
      ]);
    }
  }
  
  // Prefer REAL MP4 (H.264) — Instagram/TikTok re-encode or reject WebM. Modern
  // Chrome and Safari can mux MP4 in MediaRecorder; WebM stays as the fallback
  // and the filename/toast stay honest about which one the user got.
  const mime =
    ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4"].find((t) => MediaRecorder.isTypeSupported(t)) ??
    (MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm");
  const isMp4 = mime.startsWith("video/mp4");
  const recorder = new MediaRecorder(combinedStream, { mimeType: mime, videoBitsPerSecond: videoBitrate(W, H, fps) });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);

  const draw = (cvs: HTMLCanvasElement, alpha: number) => {
    ctx.globalAlpha = alpha;
    ctx.drawImage(cvs, 0, 0, W, H);
    ctx.globalAlpha = 1;
  };
  // fictional-recreation label rides every frame (pixels, not metadata)
  const disclosureCfg = loadDisclosure();
  const stamp = () => drawDisclosure(ctx, W, H, disclosureCfg);

  await new Promise<void>((resolve) => {
    recorder.onstop = () => {
      if (soundManager?.isPlayingMusic) {
        soundManager.stopLofi();
      }
      resolve();
    };
    recorder.start();
    const t0 = performance.now();
    let lastIdx = -1;
    let lastPhase = -1;
    const tick = (now: number) => {
      const t = now - t0;
      if (t >= totalDur) {
        const last = timeline[timeline.length - 1];
        ctx.clearRect(0, 0, W, H);
        draw(shotFrame(last.shot, 0), 1);
        stamp();
        recorder.stop();
        return;
      }
      // locate the current shot + time within it
      let acc = 0;
      let idx = 0;
      for (; idx < timeline.length; idx++) {
        if (t < acc + timeline[idx].dur) break;
        acc += timeline[idx].dur;
      }
      const seg = timeline[idx];
      const into = t - acc;
      const phase = Math.floor(into / DOT_MS);
      const cur = shotFrame(seg.shot, phase);

      // play click/pop sounds if enabled
      if (soundManager?.isPlayingKeyClick) {
        if (idx !== lastIdx) {
          lastIdx = idx;
          const currentShot = seg.shot;
          if (currentShot.typing) {
            soundManager.playClick();
          } else if (!currentShot.settled) {
            soundManager.playPop();
          }
        }
        if (seg.shot.typing && phase !== lastPhase) {
          lastPhase = phase;
          soundManager.playClick();
        }
      }

      ctx.clearRect(0, 0, W, H);
      if (idx > 0 && into < seg.shot.fadeMs) {
        // eased crossfade from the previous shot's final frame
        const prev = timeline[idx - 1].shot;
        draw(shotFrame(prev, 0), 1);
        draw(cur, easeProgress(into / seg.shot.fadeMs, seg.shot.easing));
      } else {
        draw(cur, 1);
      }
      stamp();
      onProgress?.(0.55 + 0.45 * (t / totalDur), "Encoding…");
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  const blob = new Blob(chunks, { type: isMp4 ? "video/mp4" : "video/webm" });
  if (!blob.size) throw new Error("Recording produced no data");
  downloadBlob(blob, `mockframe-replay-${W}x${H}-${fps}fps.${isMp4 ? "mp4" : "webm"}`);
  return isMp4 ? "mp4" : "webm";
}
