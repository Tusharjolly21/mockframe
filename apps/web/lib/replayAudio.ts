"use client";

import type { AnimShot } from "@/lib/screens";

/**
 * Chat-replay sound design: key clicks while someone types, a two-tone pop
 * when a message lands, and an optional lo-fi chord bed. The same synth
 * voices drive the live preview (an AudioContext) and video export (an
 * OfflineAudioContext rendered ahead of time and muxed with the frames), so
 * what you hear in the preview is exactly what ends up in the file.
 */

/** typing-dot phase length during a typing beat, in ms */
export const DOT_MS = 170;
const LOFI_CHORD_S = 4;
const LOFI_CHORDS = [
  [261.63, 329.63, 392.0, 493.88], // Cmaj7
  [220.0, 261.63, 329.63, 392.0], // Am7
  [174.61, 220.0, 261.63, 329.63], // Fmaj7
  [196.0, 246.94, 293.66, 349.23], // G7
];

export function synthClick(ctx: BaseAudioContext, out: AudioNode, at: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(900, at);
  osc.frequency.exponentialRampToValueAtTime(1400, at + 0.04);
  gain.gain.setValueAtTime(0.03, at);
  gain.gain.exponentialRampToValueAtTime(0.001, at + 0.04);
  osc.connect(gain).connect(out);
  osc.start(at);
  osc.stop(at + 0.04);
}

export function synthPop(ctx: BaseAudioContext, out: AudioNode, at: number): void {
  const tone = (freq: number, start: number, end: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.06, start);
    gain.gain.exponentialRampToValueAtTime(0.001, end);
    osc.connect(gain).connect(out);
    osc.start(start);
    osc.stop(end);
  };
  tone(550, at, at + 0.12);
  tone(700, at + 0.06, at + 0.2);
}

/** One lo-fi chord (the `index`-th of the progression) starting at `at`. */
export function synthLofiChord(ctx: BaseAudioContext, out: AudioNode, at: number, index: number): void {
  for (const freq of LOFI_CHORDS[index % LOFI_CHORDS.length]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, at);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(0.015, at + 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, at + 3.8);
    osc.connect(gain).connect(out);
    osc.start(at);
    osc.stop(at + LOFI_CHORD_S);
  }
}

export const LOFI_INTERVAL_MS = LOFI_CHORD_S * 1000;

export type ReplaySoundEvent = { at: number; kind: "click" | "pop" };

/**
 * When each sound fires (ms) for a shot plan: a click on every typing-dot
 * phase, a pop when a new message lands (not for the settled hold).
 */
export function replaySoundEvents(plan: AnimShot[]): ReplaySoundEvent[] {
  const events: ReplaySoundEvent[] = [];
  let acc = 0;
  for (const shot of plan) {
    const dur = shot.fadeMs + shot.holdMs;
    if (shot.typing) {
      for (let t = 0; t < dur; t += DOT_MS) events.push({ at: acc + t, kind: "click" });
    } else if (!shot.settled) {
      events.push({ at: acc, kind: "pop" });
    }
    acc += dur;
  }
  return events;
}

/** Render the replay soundtrack offline. Null when there is nothing to hear. */
export async function renderReplayAudio(
  plan: AnimShot[],
  durationMs: number,
  opts: { clicks: boolean; music: boolean }
): Promise<AudioBuffer | null> {
  if ((!opts.clicks && !opts.music) || durationMs <= 0 || typeof OfflineAudioContext === "undefined") return null;
  const sampleRate = 48_000;
  const seconds = durationMs / 1000;
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);
  // master fade so the track never ends on a click mid-waveform
  const master = ctx.createGain();
  master.gain.setValueAtTime(1, Math.max(0, seconds - 0.35));
  master.gain.linearRampToValueAtTime(0, seconds);
  master.connect(ctx.destination);
  if (opts.clicks) {
    for (const e of replaySoundEvents(plan)) {
      if (e.at >= durationMs) break;
      (e.kind === "click" ? synthClick : synthPop)(ctx, master, e.at / 1000);
    }
  }
  if (opts.music) {
    for (let i = 0; i * LOFI_CHORD_S < seconds; i++) synthLofiChord(ctx, master, i * LOFI_CHORD_S, i);
  }
  return ctx.startRendering();
}
