/**
 * Sound effects for recordings: mouse clicks, keystrokes and zoom whooshes,
 * synthesised here (no audio files to load or license), plus the mix that
 * lays them over the recording's own sound and an optional music bed.
 *
 * Synthesis is plain math on Float32Arrays with seeded noise, so every click
 * sounds the same in the preview and in the exported file.
 */

import type { ClickEvent, TypingBurst } from "./track";
import type { ZoomSegment } from "./zoom";

export type ClickSound = "none" | "mouse" | "soft" | "trackpad" | "mechanical" | "pop";
export type TypingSound = "none" | "soft" | "mechanical";
export type ZoomSound = "none" | "whoosh" | "swish";
export type MusicId = "none" | "lofi" | "ambient" | "upbeat" | "custom";

export interface SoundSettings {
  click: ClickSound;
  clickVolume: number;
  typing: TypingSound;
  typingVolume: number;
  zoom: ZoomSound;
  zoomVolume: number;
  music: MusicId;
  musicVolume: number;
  /** the recording's own sound (system audio and voice) */
  recordingVolume: number;
}

export const DEFAULT_SOUNDS: SoundSettings = {
  click: "mouse",
  clickVolume: 0.7,
  typing: "soft",
  typingVolume: 0.45,
  zoom: "none",
  zoomVolume: 0.35,
  music: "none",
  musicVolume: 0.3,
  recordingVolume: 1,
};

export const CLICK_SOUNDS: { id: ClickSound; label: string }[] = [
  { id: "mouse", label: "Mouse" },
  { id: "soft", label: "Soft" },
  { id: "trackpad", label: "Trackpad" },
  { id: "mechanical", label: "Clicky" },
  { id: "pop", label: "Pop" },
  { id: "none", label: "Off" },
];
export const TYPING_SOUNDS: { id: TypingSound; label: string }[] = [
  { id: "soft", label: "Soft keys" },
  { id: "mechanical", label: "Mechanical" },
  { id: "none", label: "Off" },
];
export const ZOOM_SOUNDS: { id: ZoomSound; label: string }[] = [
  { id: "whoosh", label: "Whoosh" },
  { id: "swish", label: "Swish" },
  { id: "none", label: "Off" },
];
export const MUSIC: { id: MusicId; label: string }[] = [
  { id: "none", label: "None" },
  { id: "lofi", label: "Lo-fi" },
  { id: "ambient", label: "Ambient" },
  { id: "upbeat", label: "Upbeat" },
  { id: "custom", label: "Your file" },
];

export const SR = 48_000;

/* -------------------------------- synthesis -------------------------------- */

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) / 4294967296) * 2 - 1;
  };
}

const TAU = Math.PI * 2;

/** Chamberlin state-variable filter, band-pass output, centre frequency per sample. */
function bandpass(input: Float32Array, freq: (i: number) => number, q = 0.7) {
  const out = new Float32Array(input.length);
  let low = 0;
  let band = 0;
  const damp = 1 / q;
  for (let i = 0; i < input.length; i++) {
    const f = 2 * Math.sin((Math.PI * Math.min(freq(i), SR / 6)) / SR);
    const high = input[i] - low - damp * band;
    band += f * high;
    low += f * band;
    out[i] = band;
  }
  return out;
}

function lowpass(input: Float32Array, cutoff: number) {
  const out = new Float32Array(input.length);
  const a = 1 - Math.exp((-TAU * cutoff) / SR);
  let y = 0;
  for (let i = 0; i < input.length; i++) out[i] = y += a * (input[i] - y);
  return out;
}

function normalize(buf: Float32Array, peak = 0.85) {
  let m = 0;
  for (const v of buf) m = Math.max(m, Math.abs(v));
  if (m > 0) for (let i = 0; i < buf.length; i++) buf[i] *= peak / m;
  return buf;
}

function mixInto(dst: Float32Array, src: Float32Array, at: number, gain = 1) {
  for (let i = 0; i < src.length && at + i < dst.length; i++) if (at + i >= 0) dst[at + i] += src[i] * gain;
}

/** One sharp transient: filtered noise and a couple of decaying partials. */
function transient(o: { len: number; seed: number; noise: number; noiseDecay: number; tones: [number, number, number][]; tilt?: number; lp?: number }) {
  const n = Math.round(o.len * SR);
  const r = rng(o.seed);
  let buf = new Float32Array(n);
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const w = r();
    // first difference brightens the noise (tilt 1) or not (tilt 0)
    const nz = w - (o.tilt ?? 1) * prev;
    prev = w;
    let v = nz * o.noise * Math.exp(-t / o.noiseDecay);
    for (const [f, a, d] of o.tones) v += Math.sin(TAU * f * t) * a * Math.exp(-t / d);
    buf[i] = v;
  }
  if (o.lp) buf = lowpass(buf, o.lp);
  // 0.3 ms fade in so it never pops
  for (let i = 0; i < Math.min(n, 15); i++) buf[i] *= i / 15;
  return buf;
}

function clickBuffer(kind: Exclude<ClickSound, "none">, variant: number): Float32Array {
  const seed = 1000 + variant * 7919;
  const out = new Float32Array(Math.round(0.16 * SR));
  switch (kind) {
    case "mouse": {
      const down = transient({ len: 0.03, seed, noise: 0.8, noiseDecay: 0.0018, tones: [[3100, 0.35, 0.003], [1150, 0.25, 0.006], [420, 0.18, 0.01]] });
      const up = transient({ len: 0.025, seed: seed + 1, noise: 0.55, noiseDecay: 0.0014, tones: [[3600, 0.25, 0.0025], [1400, 0.15, 0.004]] });
      mixInto(out, down, 0);
      mixInto(out, up, Math.round(0.072 * SR), 0.55);
      break;
    }
    case "soft": {
      const down = transient({ len: 0.04, seed, noise: 0.5, noiseDecay: 0.004, tones: [[620, 0.4, 0.012], [1500, 0.12, 0.005]], lp: 2600 });
      const up = transient({ len: 0.03, seed: seed + 1, noise: 0.3, noiseDecay: 0.003, tones: [[760, 0.25, 0.008]], lp: 2600 });
      mixInto(out, down, 0);
      mixInto(out, up, Math.round(0.08 * SR), 0.4);
      break;
    }
    case "trackpad": {
      // a Force Touch style thump with a tiny tick on top
      const thump = transient({ len: 0.035, seed, noise: 0.12, noiseDecay: 0.001, tones: [[180, 0.7, 0.007], [360, 0.2, 0.004]] });
      mixInto(out, thump, 0);
      break;
    }
    case "mechanical": {
      const down = transient({ len: 0.05, seed, noise: 1, noiseDecay: 0.0022, tones: [[2300, 0.4, 0.008], [4700, 0.2, 0.004], [210, 0.35, 0.012]] });
      const up = transient({ len: 0.035, seed: seed + 1, noise: 0.7, noiseDecay: 0.0016, tones: [[2700, 0.3, 0.005]] });
      mixInto(out, down, 0);
      mixInto(out, up, Math.round(0.06 * SR), 0.6);
      break;
    }
    case "pop": {
      const n = Math.round(0.07 * SR);
      const b = new Float32Array(n);
      let ph = 0;
      for (let i = 0; i < n; i++) {
        const t = i / SR;
        const f = 260 + 700 * Math.exp(-t / 0.012);
        ph += (TAU * f) / SR;
        b[i] = Math.sin(ph) * Math.exp(-t / 0.018) * Math.min(1, i / 20);
      }
      mixInto(out, b, 0);
      break;
    }
  }
  return normalize(out, 0.9);
}

function keyBuffer(kind: Exclude<TypingSound, "none">, variant: number): Float32Array {
  const r = rng(5000 + variant * 104729);
  const pitch = 1 + r() * 0.12;
  if (kind === "mechanical") {
    const a = transient({ len: 0.045, seed: 77 + variant, noise: 0.9, noiseDecay: 0.0025, tones: [[1900 * pitch, 0.3, 0.006], [3900 * pitch, 0.15, 0.003], [260 * pitch, 0.3, 0.01]] });
    return normalize(a, 0.75 + r() * 0.1);
  }
  const a = transient({ len: 0.04, seed: 91 + variant, noise: 0.6, noiseDecay: 0.0035, tones: [[900 * pitch, 0.25, 0.007], [2100 * pitch, 0.1, 0.004]], lp: 3800 });
  return normalize(a, 0.6 + r() * 0.15);
}

function whooshBuffer(kind: Exclude<ZoomSound, "none">, reverse: boolean): Float32Array {
  const len = kind === "whoosh" ? 0.62 : 0.34;
  const n = Math.round(len * SR);
  const r = rng(kind === "whoosh" ? 4242 : 1717);
  const noise = new Float32Array(n);
  for (let i = 0; i < n; i++) noise[i] = r();
  const [f0, f1] = kind === "whoosh" ? [260, 2400] : [900, 5200];
  const band = bandpass(noise, (i) => {
    const k = i / n;
    const s = reverse ? 1 - k : k;
    // sweep up then settle, like air rushing past
    return f0 + (f1 - f0) * Math.sin(Math.PI * Math.min(1, s * 1.15)) ** 1.5;
  }, kind === "whoosh" ? 1.6 : 2.4);
  for (let i = 0; i < n; i++) {
    const k = i / n;
    const env = Math.sin(Math.PI * k) ** (reverse ? 1.2 : 1.8) * (reverse ? 1 - k * 0.3 : 0.7 + k * 0.3);
    band[i] *= env;
  }
  return normalize(band, 0.8);
}

const bank = new Map<string, Float32Array>();
/** Cached sample for one sound. */
export function soundSample(key: string): Float32Array {
  let b = bank.get(key);
  if (b) return b;
  const [group, kind, v] = key.split(":");
  const variant = Number(v) || 0;
  if (group === "click") b = clickBuffer(kind as Exclude<ClickSound, "none">, variant);
  else if (group === "key") b = keyBuffer(kind as Exclude<TypingSound, "none">, variant);
  else b = whooshBuffer(kind as Exclude<ZoomSound, "none">, v === "out");
  bank.set(key, b);
  return b;
}

/* --------------------------------- events --------------------------------- */

export interface SoundEvent {
  /** ms into the recording */
  t: number;
  /** soundSample() key */
  key: string;
  gain: number;
  /** -1 left .. 1 right */
  pan: number;
}

/**
 * Every sound effect in the recording, in time order. Clicks pan a little
 * toward where they happen; keystrokes fall at a typing rhythm across each
 * burst of typing; zooms whoosh in and (more quietly) out.
 */
export function buildSoundEvents(clicks: ClickEvent[], typing: TypingBurst[], zooms: ZoomSegment[], s: SoundSettings, durationMs: number): SoundEvent[] {
  const ev: SoundEvent[] = [];
  if (s.click !== "none" && s.clickVolume > 0) {
    clicks.forEach((c, i) => ev.push({ t: c.t, key: `click:${s.click}:${i % 4}`, gain: s.clickVolume, pan: clampPan((c.x - 0.5) * 0.7) }));
  }
  if (s.typing !== "none" && s.typingVolume > 0) {
    for (const b of typing) {
      const r = rng(Math.round(b.startMs) + 13);
      let t = b.startMs;
      let k = 0;
      while (t <= b.endMs) {
        ev.push({ t, key: `key:${s.typing}:${k % 6}`, gain: s.typingVolume * (0.75 + (r() + 1) * 0.15), pan: clampPan((b.x - 0.5) * 0.5 + r() * 0.05) });
        // 90..190 ms between keys, a pause now and then
        t += 140 + r() * 50 + (r() > 0.85 ? 160 : 0);
        k++;
      }
    }
  }
  if (s.zoom !== "none" && s.zoomVolume > 0) {
    for (const z of zooms) {
      ev.push({ t: Math.max(0, z.startMs - 60), key: `whoosh:${s.zoom}:in`, gain: s.zoomVolume, pan: clampPan((z.x - 0.5) * 0.4) });
      if (z.endMs < durationMs - 200) ev.push({ t: z.endMs - 40, key: `whoosh:${s.zoom}:out`, gain: s.zoomVolume * 0.6, pan: 0 });
    }
  }
  return ev.filter((e) => e.t >= 0 && e.t < durationMs).sort((a, b) => a.t - b.t);
}

const clampPan = (p: number) => Math.max(-1, Math.min(1, p));

/* ---------------------------------- mixing --------------------------------- */

function toAudioBuffer(ctx: BaseAudioContext, data: Float32Array): AudioBuffer {
  const b = ctx.createBuffer(1, data.length, SR);
  b.copyToChannel(data as Float32Array<ArrayBuffer>, 0);
  return b;
}

/** Schedule `events` on `ctx`, starting at the recording's `fromMs`, `when` seconds on the context clock. */
export function scheduleEvents(ctx: BaseAudioContext, dest: AudioNode, events: SoundEvent[], fromMs: number, when: number): AudioScheduledSourceNode[] {
  const nodes: AudioScheduledSourceNode[] = [];
  const cache = new Map<string, AudioBuffer>();
  for (const e of events) {
    if (e.t < fromMs - 5) continue;
    let buf = cache.get(e.key);
    if (!buf) cache.set(e.key, (buf = toAudioBuffer(ctx, soundSample(e.key))));
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = e.gain;
    const pan = ctx.createStereoPanner();
    pan.pan.value = e.pan;
    src.connect(gain).connect(pan).connect(dest);
    src.start(when + (e.t - fromMs) / 1000);
    nodes.push(src);
  }
  return nodes;
}

export interface MixInput {
  durationMs: number;
  recording: AudioBuffer | null;
  music: AudioBuffer | null;
  events: SoundEvent[];
  settings: SoundSettings;
}

/** Fade the music in and out, and loop it under the whole recording. */
export function scheduleMusic(ctx: BaseAudioContext, dest: AudioNode, music: AudioBuffer, volume: number, durationMs: number, fromMs: number, when: number) {
  const src = ctx.createBufferSource();
  src.buffer = music;
  src.loop = true;
  const g = ctx.createGain();
  const total = durationMs / 1000;
  const from = fromMs / 1000;
  const fadeIn = Math.min(1.2, total / 4);
  const fadeOut = Math.min(2, total / 4);
  // gain over recording time, mapped onto the context clock
  const at = (t: number) => when + (t - from);
  const level = (t: number) => volume * Math.min(1, t / fadeIn, Math.max(0, (total - t) / fadeOut));
  g.gain.setValueAtTime(level(from), at(from));
  if (from < fadeIn) g.gain.linearRampToValueAtTime(volume, at(fadeIn));
  const outStart = Math.max(from, total - fadeOut);
  g.gain.setValueAtTime(level(outStart), at(outStart));
  g.gain.linearRampToValueAtTime(0, at(total));
  src.connect(g).connect(dest);
  src.start(when, from % music.duration);
  src.stop(at(total));
  return src;
}

/** The finished soundtrack: recording + music + effects, as one stereo buffer. */
export async function mixSoundtrack(m: MixInput): Promise<AudioBuffer | null> {
  const hasEffects = m.events.length > 0;
  const hasRec = !!m.recording && m.settings.recordingVolume > 0;
  const hasMusic = !!m.music && m.settings.music !== "none" && m.settings.musicVolume > 0;
  if (!hasEffects && !hasRec && !hasMusic) return null;
  const len = Math.max(1, Math.ceil((m.durationMs / 1000) * SR));
  const ctx = new OfflineAudioContext(2, len, SR);
  // a gentle limiter keeps stacked clicks and loud voices from clipping
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -6;
  comp.knee.value = 6;
  comp.ratio.value = 8;
  comp.attack.value = 0.002;
  comp.release.value = 0.12;
  comp.connect(ctx.destination);
  if (hasRec) {
    const src = ctx.createBufferSource();
    src.buffer = m.recording;
    const g = ctx.createGain();
    g.gain.value = m.settings.recordingVolume;
    src.connect(g).connect(comp);
    src.start(0);
  }
  if (hasMusic) scheduleMusic(ctx, comp, m.music!, m.settings.musicVolume, m.durationMs, 0, 0);
  scheduleEvents(ctx, comp, m.events, 0, 0);
  return ctx.startRendering();
}

/**
 * Plays effects and music alongside the preview video. The video element
 * plays the recording's own sound; this follows its clock.
 */
export class LiveSoundPlayer {
  private ctx: AudioContext | null = null;
  private nodes: AudioScheduledSourceNode[] = [];
  private out: GainNode | null = null;

  private context() {
    if (!this.ctx) {
      this.ctx = new AudioContext({ latencyHint: "interactive" });
      this.out = this.ctx.createGain();
      this.out.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  /** Start from `fromMs`. Call again after a seek, or with stop() on pause. */
  play(fromMs: number, events: SoundEvent[], music: AudioBuffer | null, s: SoundSettings, durationMs: number) {
    this.stop();
    const ctx = this.context();
    void ctx.resume();
    const when = ctx.currentTime + 0.02;
    this.nodes = scheduleEvents(ctx, this.out!, events, fromMs, when);
    if (music && s.music !== "none" && s.musicVolume > 0) this.nodes.push(scheduleMusic(ctx, this.out!, music, s.musicVolume, durationMs, fromMs, when));
  }

  /** One sound, now (for previews in the settings panel). */
  audition(key: string, gain = 0.8) {
    const ctx = this.context();
    void ctx.resume();
    scheduleEvents(ctx, this.out!, [{ t: 0, key, gain, pan: 0 }], 0, ctx.currentTime + 0.01);
  }

  stop() {
    for (const n of this.nodes) {
      try {
        n.stop();
      } catch {
        /* not started yet or already done */
      }
    }
    this.nodes = [];
  }

  dispose() {
    this.stop();
    void this.ctx?.close();
    this.ctx = null;
  }
}
