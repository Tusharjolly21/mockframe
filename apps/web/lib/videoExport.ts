"use client";

import { toCanvas } from "html-to-image";
import type { SceneDocument } from "@framekit/scene";
import type { AnimShot } from "@/lib/screens";

/**
 * Premium chat-replay video export. The animation reads like a real
 * conversation — a typing indicator (animated dots / "typing…" header) before
 * each reply, then the message eases in — and the WHOLE scene (3D-tilted
 * device, background, effects) is captured, so it's a "3D video", not a flat
 * screen recording.
 *
 * Pipeline (client-side, deterministic — mirrors the §2.4 worker):
 *   1. Pre-render each unique state (reveal-k, and 3 dot phases per typing-k)
 *      to a canvas via html-to-image.
 *   2. Play the shot list on an offscreen canvas on a real clock: eased
 *      crossfades between shots + dot cycling during typing beats, recording
 *      canvas.captureStream() → VP9 WebM.
 */

export interface VideoExportOpts {
  node: HTMLElement;
  scene: SceneDocument;
  plan: AnimShot[];
  /** set the animated layer to a given reveal/typing state (transient) */
  renderState: (s: { k: number; typing: boolean; dotPhase: number; settled: boolean }) => void;
  restore: () => void;
  onProgress?: (fraction: number, label: string) => void;
  maxWidth?: number;
}

const DOT_MS = 170; // dot-phase cycle during a typing beat
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

const settle = () => new Promise<void>((r) => requestAnimationFrame(() => setTimeout(r, 45)));
const keyOf = (k: number, typing: boolean, phase: number, settled: boolean) =>
  `${k}|${typing ? "t" + phase : settled ? "rs" : "r"}`;

export async function exportSceneVideo(o: VideoExportOpts): Promise<void> {
  const { node, scene, plan, renderState, restore, onProgress } = o;
  if (!plan.length) throw new Error("Nothing to animate");

  const scale = Math.min(1, (o.maxWidth ?? 1280) / scene.canvas.width);
  const W = Math.round(scene.canvas.width * scale);
  const H = Math.round(scene.canvas.height * scale);

  /* 1 — pre-render every unique state (reveal once per k; typing = 3 phases) */
  const states: { k: number; typing: boolean; phase: number; settled: boolean }[] = [];
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
  const stream = rec.captureStream(30);
  const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : "video/webm";
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);

  const draw = (cvs: HTMLCanvasElement, alpha: number) => {
    ctx.globalAlpha = alpha;
    ctx.drawImage(cvs, 0, 0, W, H);
    ctx.globalAlpha = 1;
  };

  await new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
    recorder.start();
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = now - t0;
      if (t >= totalDur) {
        const last = timeline[timeline.length - 1];
        ctx.clearRect(0, 0, W, H);
        draw(shotFrame(last.shot, 0), 1);
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

      ctx.clearRect(0, 0, W, H);
      if (idx > 0 && into < seg.shot.fadeMs) {
        // eased crossfade from the previous shot's final frame
        const prev = timeline[idx - 1].shot;
        draw(shotFrame(prev, 0), 1);
        draw(cur, easeOut(into / seg.shot.fadeMs));
      } else {
        draw(cur, 1);
      }
      onProgress?.(0.55 + 0.45 * (t / totalDur), "Encoding…");
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  const blob = new Blob(chunks, { type: "video/webm" });
  if (!blob.size) throw new Error("Recording produced no data");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `mockframe-${W}x${H}.webm`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
