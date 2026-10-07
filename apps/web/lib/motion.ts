"use client";

import type { Layer, SceneDocument } from "@framekit/scene";

/**
 * Motion presets: short, export-ready camera moves for any scene (no chat
 * screen needed). Each preset is a pure function of normalized time that
 * returns transform DELTAS for a layer, so the scene itself is never edited:
 * preview and export apply `base + delta` transiently and restore afterwards.
 *
 * "loop" presets start and end on the same pose (seamless GIFs / reels);
 * "intro" presets animate in, then hold the final, untouched layout.
 */

export type MotionPresetId =
  | "float"
  | "orbit"
  | "swing"
  | "push-in"
  | "rise"
  | "zoom-in"
  | "spin-reveal"
  | "flip-in";

export interface MotionDelta {
  x?: number;
  y?: number;
  scale?: number; // multiplier
  rotate?: number;
  tiltX?: number;
  tiltY?: number;
}

export interface MotionPreset {
  id: MotionPresetId;
  label: string;
  hint: string;
  kind: "loop" | "intro";
  durationMs: number;
  /** p: 0..1 progress for this layer (already staggered), H: canvas height */
  sample: (p: number, H: number) => MotionDelta;
}

const TAU = Math.PI * 2;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutBack = (t: number) => {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
/** intro curve: animate during the first 62% of the clip, hold the rest */
const intro = (p: number, ease = easeOutCubic) => ease(clamp01(p / 0.62));

export const MOTION_PRESETS: MotionPreset[] = [
  {
    id: "float",
    label: "Float",
    hint: "Gentle hover, seamless loop",
    kind: "loop",
    durationMs: 4000,
    sample: (p, H) => ({ y: -Math.sin(p * TAU) * H * 0.014, tiltX: Math.sin(p * TAU) * 2.5, rotate: Math.sin(p * TAU + 1) * 0.8 }),
  },
  {
    id: "orbit",
    label: "Orbit 3D",
    hint: "Slow 3D turntable",
    kind: "loop",
    durationMs: 5000,
    sample: (p) => ({ tiltY: Math.sin(p * TAU) * 20, tiltX: Math.cos(p * TAU) * 7 }),
  },
  {
    id: "swing",
    label: "Swing",
    hint: "Playful pendulum sway",
    kind: "loop",
    durationMs: 3200,
    sample: (p) => ({ rotate: Math.sin(p * TAU) * 4.5, tiltY: Math.sin(p * TAU) * -6 }),
  },
  {
    id: "push-in",
    label: "Push in",
    hint: "Cinematic slow zoom",
    kind: "intro",
    durationMs: 4000,
    sample: (p) => ({ scale: 0.92 + 0.08 * easeInOut(clamp01(p)) }),
  },
  {
    id: "rise",
    label: "Rise up",
    hint: "Slides up from below",
    kind: "intro",
    durationMs: 2600,
    sample: (p, H) => {
      const e = intro(p, easeOutBack);
      return { y: (1 - e) * H * 0.75, tiltX: (1 - intro(p)) * 18 };
    },
  },
  {
    id: "zoom-in",
    label: "Zoom in",
    hint: "Pops in from small",
    kind: "intro",
    durationMs: 2400,
    sample: (p) => ({ scale: 0.55 + 0.45 * intro(p, easeOutBack) }),
  },
  {
    id: "spin-reveal",
    label: "Spin reveal",
    hint: "Twists into place",
    kind: "intro",
    durationMs: 2800,
    sample: (p) => {
      const e = intro(p);
      return { rotate: (1 - e) * -24, tiltY: (1 - e) * 38, scale: 0.8 + 0.2 * e };
    },
  },
  {
    id: "flip-in",
    label: "Flip in",
    hint: "3D flip toward the camera",
    kind: "intro",
    durationMs: 2600,
    sample: (p) => {
      const e = intro(p, easeOutBack);
      return { tiltX: (1 - e) * 40, scale: 0.86 + 0.14 * intro(p) };
    },
  },
];

export const motionPreset = (id: MotionPresetId) => MOTION_PRESETS.find((m) => m.id === id)!;

/** layers that move: mockups always, plus text/stickers for intros (text with its own animation keeps it) */
export function motionTargets(scene: SceneDocument, preset: MotionPreset): Layer[] {
  return scene.layers.filter((l) => l.type === "mockup" || (preset.kind === "intro" && !(l.type === "text" && l.animation)));
}

/** When the last text animation finishes (ms), 0 if none. */
export function textAnimationsEnd(scene: SceneDocument): number {
  return scene.layers.reduce((end, l) => (l.type === "text" && l.animation ? Math.max(end, l.animation.delayMs + l.animation.durationMs) : end), 0);
}

/** The preset, lengthened when needed so every text animation finishes (plus a beat to read it). */
export function presetForScene(preset: MotionPreset, scene: SceneDocument): MotionPreset {
  const needed = textAnimationsEnd(scene) + 500;
  return needed > preset.durationMs ? { ...preset, durationMs: Math.ceil(needed / 100) * 100 } : preset;
}

/**
 * The transform of `layer` at clip time t (0..1). Several layers get a small
 * stagger (intros) or phase offset (loops) so multi-device scenes feel
 * choreographed rather than moving as one block.
 */
export function sampleLayer(preset: MotionPreset, layer: Layer, index: number, count: number, t: number, H: number): Layer["transform"] {
  const base = layer.transform;
  let p = t;
  if (preset.kind === "intro") {
    const stagger = count > 1 ? Math.min(0.12, 0.3 / count) : 0;
    p = clamp01((t - index * stagger) / (1 - (count - 1) * stagger));
  } else if (count > 1) {
    p = (t + index * 0.18) % 1;
  }
  const d = preset.sample(p, H);
  // text/stickers ride intros with a softer version of the move
  const k = layer.type === "mockup" ? 1 : 0.5;
  return {
    ...base,
    x: base.x + (d.x ?? 0) * k,
    y: base.y + (d.y ?? 0) * k,
    scale: base.scale * (1 + ((d.scale ?? 1) - 1) * k),
    rotate: base.rotate + (d.rotate ?? 0) * k,
    tiltX: Math.max(-60, Math.min(60, base.tiltX + (d.tiltX ?? 0) * k)),
    tiltY: Math.max(-60, Math.min(60, base.tiltY + (d.tiltY ?? 0) * k)),
  };
}

/** every moving layer's transform at clip time t */
export function sampleScene(scene: SceneDocument, preset: MotionPreset, t: number): Map<string, Layer["transform"]> {
  const targets = motionTargets(scene, preset);
  const out = new Map<string, Layer["transform"]>();
  targets.forEach((l, i) => out.set(l.id, sampleLayer(preset, l, i, targets.length, t, scene.canvas.height)));
  return out;
}
