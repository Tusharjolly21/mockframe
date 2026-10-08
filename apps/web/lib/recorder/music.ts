"use client";

/**
 * Background music beds, generated in the browser: a short seamless loop per
 * mood (chords, bass, light drums) rendered with an OfflineAudioContext.
 * Generated, so there's nothing to license and nothing to download.
 */

import type { MusicId } from "./sounds";
import { SR } from "./sounds";

type Bed = Exclude<MusicId, "none" | "custom">;

const NOTE: Record<string, number> = { C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11 };
/** "A3" → Hz */
function hz(n: string): number {
  const m = /^([A-G]#?)(\d)$/.exec(n)!;
  const midi = NOTE[m[1]] + (Number(m[2]) + 1) * 12;
  return 440 * 2 ** ((midi - 69) / 12);
}

function noiseBuffer(ctx: BaseAudioContext, seconds: number, seed = 1) {
  const b = ctx.createBuffer(1, Math.round(seconds * SR), SR);
  const d = b.getChannelData(0);
  let s = seed;
  for (let i = 0; i < d.length; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    d[i] = s / 2147483648 - 1;
  }
  return b;
}

function reverb(ctx: BaseAudioContext, seconds: number, decay: number) {
  const len = Math.round(seconds * SR);
  const b = ctx.createBuffer(2, len, SR);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    let s = 99 + c;
    for (let i = 0; i < len; i++) {
      s = (s * 1664525 + 1013904223) >>> 0;
      d[i] = (s / 2147483648 - 1) * (1 - i / len) ** decay;
    }
  }
  const conv = ctx.createConvolver();
  conv.buffer = b;
  return conv;
}

interface Voice {
  ctx: BaseAudioContext;
  out: AudioNode;
}

function pad(v: Voice, notes: string[], t: number, dur: number, o: { attack: number; release: number; gain: number; cutoff: number; type?: OscillatorType }) {
  const { ctx } = v;
  const g = ctx.createGain();
  const f = ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = o.cutoff;
  f.Q.value = 0.4;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(o.gain, t + o.attack);
  g.gain.setValueAtTime(o.gain, t + Math.max(o.attack, dur - o.release));
  g.gain.linearRampToValueAtTime(0, t + dur);
  f.connect(g).connect(v.out);
  for (const n of notes) {
    for (const detune of [-6, 6]) {
      const osc = ctx.createOscillator();
      osc.type = o.type ?? "triangle";
      osc.frequency.value = hz(n);
      osc.detune.value = detune;
      osc.connect(f);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    }
  }
}

/** Electric-piano-ish note: sine with a bell partial and a quick decay. */
function keys(v: Voice, n: string, t: number, dur: number, gain: number) {
  const { ctx } = v;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(gain * 0.3, t + 0.5);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(v.out);
  const f = hz(n);
  for (const [mult, a] of [[1, 1], [2, 0.18], [3.01, 0.06]] as const) {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = f * mult;
    const og = ctx.createGain();
    og.gain.value = a;
    o.connect(og).connect(g);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
}

function pluck(v: Voice, n: string, t: number, gain: number) {
  const { ctx } = v;
  const o = ctx.createOscillator();
  o.type = "sawtooth";
  o.frequency.value = hz(n);
  const f = ctx.createBiquadFilter();
  f.type = "lowpass";
  f.Q.value = 2;
  f.frequency.setValueAtTime(3200, t);
  f.frequency.exponentialRampToValueAtTime(400, t + 0.25);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  o.connect(f).connect(g).connect(v.out);
  o.start(t);
  o.stop(t + 0.4);
}

function bass(v: Voice, n: string, t: number, dur: number, gain: number) {
  const { ctx } = v;
  const o = ctx.createOscillator();
  o.type = "sine";
  o.frequency.value = hz(n);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.015);
  g.gain.setValueAtTime(gain, t + dur * 0.7);
  g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(g).connect(v.out);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function kick(v: Voice, t: number, gain: number) {
  const { ctx } = v;
  const o = ctx.createOscillator();
  o.frequency.setValueAtTime(130, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
  o.connect(g).connect(v.out);
  o.start(t);
  o.stop(t + 0.4);
}

function noiseHit(v: Voice, noise: AudioBuffer, t: number, o: { gain: number; freq: number; type: BiquadFilterType; decay: number; q?: number }) {
  const { ctx } = v;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = o.type;
  f.frequency.value = o.freq;
  f.Q.value = o.q ?? 0.8;
  const g = ctx.createGain();
  g.gain.setValueAtTime(o.gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.decay);
  src.connect(f).connect(g).connect(v.out);
  src.start(t, (t * 7.31) % 1);
  src.stop(t + o.decay + 0.02);
}

/** Render one bed as a loop that can repeat seamlessly. */
async function renderBed(id: Bed): Promise<AudioBuffer> {
  const bpm = id === "lofi" ? 78 : id === "upbeat" ? 112 : 64;
  const beat = 60 / bpm;
  const bars = id === "ambient" ? 4 : 8;
  const loop = bars * 4 * beat;
  // render a tail too, then fold it back onto the start so the loop is seamless
  const tail = 3;
  const ctx = new OfflineAudioContext(2, Math.ceil((loop + tail) * SR), SR);
  const master = ctx.createGain();
  master.gain.value = 0.55;
  master.connect(ctx.destination);
  const verb = reverb(ctx, 2.2, 3);
  const wet = ctx.createGain();
  wet.gain.value = id === "ambient" ? 0.55 : 0.22;
  verb.connect(wet).connect(master);
  const bus = ctx.createGain();
  bus.connect(master);
  bus.connect(verb);
  const v: Voice = { ctx, out: bus };
  const dry: Voice = { ctx, out: master };
  const noise = noiseBuffer(ctx, 2);

  if (id === "lofi") {
    const chords = [["F3", "A3", "C4", "E4"], ["E3", "G3", "B3", "D4"], ["D3", "F3", "A3", "C4"], ["C3", "E3", "G3", "B3"]];
    const roots = ["F2", "E2", "D2", "C2"];
    for (let bar = 0; bar < bars; bar++) {
      const t = bar * 4 * beat;
      const c = chords[bar % 4];
      c.forEach((n, i) => keys(v, n, t + i * 0.018, 4 * beat, 0.11));
      c.slice(1).forEach((n, i) => keys(v, n, t + 2.5 * beat + i * 0.02, 1.4 * beat, 0.05));
      bass(dry, roots[bar % 4], t, 1.8 * beat, 0.34);
      bass(dry, roots[bar % 4], t + 2.5 * beat, 1.2 * beat, 0.26);
      for (let b = 0; b < 4; b++) {
        const bt = t + b * beat;
        if (b === 0 || (b === 2 && bar % 2 === 1)) kick(dry, bt, 0.55);
        if (b === 2 && bar % 2 === 0) kick(dry, bt + 0.5 * beat, 0.4);
        if (b === 1 || b === 3) noiseHit(v, noise, bt, { gain: 0.16, freq: 1800, type: "bandpass", decay: 0.16 });
        for (let e = 0; e < 2; e++) noiseHit(dry, noise, bt + e * beat * 0.56, { gain: e ? 0.035 : 0.05, freq: 7500, type: "highpass", decay: 0.04 });
      }
    }
  } else if (id === "ambient") {
    const chords = [["C3", "G3", "D4", "E4"], ["A2", "E3", "B3", "C4"], ["F2", "C3", "G3", "A3"], ["G2", "D3", "A3", "B3"]];
    const bell = ["E5", "G5", "D5", "B4", "C5", "A4", "G5", "D5"];
    for (let bar = 0; bar < bars; bar++) {
      const t = bar * 4 * beat;
      pad(v, chords[bar % 4], t, 4 * beat + 1.5, { attack: 1.6, release: 2, gain: 0.07, cutoff: 1300 });
      for (let i = 0; i < 2; i++) keys(v, bell[(bar * 2 + i) % bell.length], t + (i * 2 + 0.5) * beat, 3, 0.035);
    }
  } else {
    const chords = [["C4", "E4", "G4"], ["G3", "B3", "D4"], ["A3", "C4", "E4"], ["F3", "A3", "C4"]];
    const roots = ["C2", "G1", "A1", "F1"];
    for (let bar = 0; bar < bars; bar++) {
      const t = bar * 4 * beat;
      const c = chords[bar % 4];
      pad(v, c, t, 4 * beat, { attack: 0.05, release: 0.3, gain: 0.035, cutoff: 2200, type: "sawtooth" });
      for (let s = 0; s < 8; s++) pluck(v, c[[0, 1, 2, 1, 0, 2, 1, 2][s]].replace(/\d/, (d) => String(Number(d) + 1)), t + s * 0.5 * beat, 0.07);
      for (let b = 0; b < 4; b++) {
        const bt = t + b * beat;
        kick(dry, bt, 0.5);
        if (b === 1 || b === 3) noiseHit(v, noise, bt, { gain: 0.18, freq: 1500, type: "bandpass", decay: 0.13, q: 0.6 });
        noiseHit(dry, noise, bt + 0.5 * beat, { gain: 0.07, freq: 8000, type: "highpass", decay: 0.05 });
        bass(dry, roots[bar % 4], bt + 0.5 * beat, 0.42 * beat, 0.26);
      }
    }
  }
  const full = await ctx.startRendering();
  // fold the tail back onto the start: the loop then rings through its seam
  const n = Math.round(loop * SR);
  const out = new AudioBuffer({ length: n, numberOfChannels: 2, sampleRate: SR });
  for (let c = 0; c < 2; c++) {
    const src = full.getChannelData(c);
    const dst = out.getChannelData(c);
    dst.set(src.subarray(0, n));
    for (let i = n; i < src.length; i++) dst[i - n] += src[i];
  }
  return out;
}

const beds = new Map<Bed, Promise<AudioBuffer>>();
export function musicBed(id: Bed): Promise<AudioBuffer> {
  let p = beds.get(id);
  if (!p) {
    p = renderBed(id);
    beds.set(id, p);
    p.catch(() => beds.delete(id));
  }
  return p;
}

/** Decode a music file the person picked. */
export async function decodeMusicFile(file: Blob): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(2, SR, SR);
  return ctx.decodeAudioData(await file.arrayBuffer());
}
