"use client";

import { getDevice } from "@framekit/devices";
import { createId, type MockupLayer, type SceneDocument } from "@framekit/scene";

/**
 * Slot-based layout presets (§4): each declares N media slots with relative
 * transforms. Applying one writes ordinary transforms onto mockup layers —
 * the document never stores "which layout", everything stays hand-editable.
 */
export interface LayoutSlot {
  /** offsets from canvas center, as fraction of canvas width/height */
  x: number;
  y: number;
  /** multiplier over the layer's base "fit" scale */
  scale: number;
  rotate: number;
  tiltX: number;
  tiltY: number;
  z: number;
}

export interface LayoutPreset {
  id: string;
  label: string;
  arity: 1 | 2 | 3;
  slots: LayoutSlot[];
}

const slot = (p: Partial<LayoutSlot>): LayoutSlot => ({
  x: 0, y: 0, scale: 1, rotate: 0, tiltX: 0, tiltY: 0, z: 0, ...p,
});

export const LAYOUT_PRESETS: LayoutPreset[] = [
  /* ---------------------------------- solo ---------------------------------- */
  { id: "solo-center", label: "Centered", arity: 1, slots: [slot({})] },
  { id: "solo-tilt", label: "Floating", arity: 1, slots: [slot({ y: 0.03, scale: 1.02, rotate: -7, tiltY: -20 })] },
  { id: "solo-lean", label: "Leaning", arity: 1, slots: [slot({ x: -0.02, y: 0.04, scale: 1.08, rotate: -13, tiltX: 6, tiltY: 12 })] },
  { id: "solo-hero", label: "Hero crop", arity: 1, slots: [slot({ x: 0.16, y: 0.2, scale: 1.55, rotate: -10 })] },
  { id: "solo-peek", label: "Peek", arity: 1, slots: [slot({ y: 0.34, scale: 1.35 })] },
  { id: "solo-flat", label: "Flat lay", arity: 1, slots: [slot({ y: 0.02, scale: 0.98, rotate: 90, tiltX: -28, tiltY: 8 })] },
  { id: "solo-float-r", label: "Floating right", arity: 1, slots: [slot({ y: 0.03, scale: 1.02, rotate: 7, tiltY: 20 })] },
  { id: "solo-iso", label: "Isometric", arity: 1, slots: [slot({ y: 0.02, scale: 1.0, rotate: 10, tiltX: 18, tiltY: -26 })] },
  { id: "solo-edge", label: "Edge crop", arity: 1, slots: [slot({ x: -0.32, y: 0.06, scale: 1.3, rotate: 8, tiltY: 14 })] },
  { id: "solo-small", label: "Minimal", arity: 1, slots: [slot({ scale: 0.72 })] },

  /* ---------------------------------- duo ----------------------------------- */
  {
    id: "duo-side", label: "Side by side", arity: 2,
    slots: [slot({ x: -0.13 }), slot({ x: 0.13, y: 0.02 })],
  },
  {
    id: "duo-perspective", label: "Perspective", arity: 2,
    slots: [
      slot({ x: -0.14, y: 0.02, rotate: -5, tiltY: 16 }),
      slot({ x: 0.14, y: -0.02, rotate: 5, tiltY: -16 }),
    ],
  },
  {
    id: "duo-overlap", label: "Overlap", arity: 2,
    slots: [
      slot({ x: 0.1, y: -0.05, scale: 0.94, rotate: 7 }),
      slot({ x: -0.08, y: 0.06, scale: 1.04, rotate: -4, z: 1 }),
    ],
  },
  {
    id: "duo-lean", label: "Leaning pair", arity: 2,
    slots: [
      slot({ x: -0.16, y: 0.03, rotate: -9, tiltY: 14, scale: 0.98 }),
      slot({ x: 0.15, y: -0.03, rotate: -9, tiltY: 14, scale: 0.98 }),
    ],
  },
  {
    id: "duo-hero", label: "Hero + detail", arity: 2,
    slots: [
      slot({ x: -0.1, y: 0.08, scale: 1.3, rotate: -8 }),
      slot({ x: 0.24, y: 0.04, scale: 0.78, rotate: 4, z: 1 }),
    ],
  },
  {
    id: "duo-stack", label: "Stacked", arity: 2,
    slots: [
      slot({ y: -0.16, x: -0.05, scale: 0.8, rotate: -4 }),
      slot({ y: 0.16, x: 0.05, scale: 0.8, rotate: 4, z: 1 }),
    ],
  },
  {
    id: "duo-iso", label: "Isometric pair", arity: 2,
    slots: [
      slot({ x: -0.14, y: 0.05, rotate: 10, tiltX: 16, tiltY: -24, scale: 0.94 }),
      slot({ x: 0.15, y: -0.05, rotate: 10, tiltX: 16, tiltY: -24, scale: 0.94, z: 1 }),
    ],
  },
  {
    id: "duo-diagonal", label: "Diagonal", arity: 2,
    slots: [
      slot({ x: -0.22, y: -0.14, scale: 0.72, rotate: -10 }),
      slot({ x: 0.14, y: 0.14, scale: 1.05, rotate: 6, z: 1 }),
    ],
  },

  /* ---------------------------------- trio ---------------------------------- */
  {
    id: "trio-row", label: "Row of three", arity: 3,
    slots: [slot({ x: -0.24, scale: 0.92 }), slot({ z: 1, scale: 0.98 }), slot({ x: 0.24, scale: 0.92 })],
  },
  {
    id: "trio-fan", label: "Fan", arity: 3,
    slots: [
      slot({ x: -0.22, y: 0.05, rotate: -12, scale: 0.9 }),
      slot({ y: -0.01, z: 1, scale: 0.98 }),
      slot({ x: 0.22, y: 0.05, rotate: 12, scale: 0.9 }),
    ],
  },
  {
    id: "trio-cascade", label: "Cascade", arity: 3,
    slots: [
      slot({ x: -0.26, y: -0.1, scale: 0.88, rotate: -6 }),
      slot({ y: 0, scale: 0.94, z: 1 }),
      slot({ x: 0.26, y: 0.1, scale: 0.88, rotate: 6, z: 2 }),
    ],
  },
  {
    id: "trio-showcase", label: "Showcase", arity: 3,
    slots: [
      slot({ x: -0.27, y: 0.03, scale: 0.84, tiltY: 24, rotate: -3 }),
      slot({ scale: 1.04, z: 2 }),
      slot({ x: 0.27, y: 0.03, scale: 0.84, tiltY: -24, rotate: 3 }),
    ],
  },
  {
    id: "trio-deck", label: "Deck", arity: 3,
    slots: [
      slot({ x: -0.1, y: -0.02, scale: 0.88, rotate: -14 }),
      slot({ x: 0, y: 0.02, scale: 0.92, rotate: -4, z: 1 }),
      slot({ x: 0.11, y: 0.06, scale: 0.96, rotate: 7, z: 2 }),
    ],
  },
  {
    id: "trio-stair", label: "Stairs", arity: 3,
    slots: [
      slot({ x: -0.26, y: 0.14, scale: 0.82, rotate: -6, tiltY: 10 }),
      slot({ y: 0, scale: 0.9, z: 1, tiltY: 10, rotate: -6 }),
      slot({ x: 0.26, y: -0.14, scale: 0.98, rotate: -6, tiltY: 10, z: 2 }),
    ],
  },
  {
    id: "trio-hero", label: "Hero + pair", arity: 3,
    slots: [
      slot({ x: -0.16, y: 0.06, scale: 1.15, rotate: -6, z: 2 }),
      slot({ x: 0.14, y: -0.1, scale: 0.72, rotate: 4 }),
      slot({ x: 0.3, y: 0.14, scale: 0.72, rotate: 8, z: 1 }),
    ],
  },
];

/* ------------------------------ customization ------------------------------- */

/** User-tweakable modifiers applied on top of a preset's slots. */
export interface LayoutMods {
  /** multiplies slot offsets from center (0.5 = tight, 2 = spread out) */
  spread: number;
  /** degrees added to every slot's rotation */
  angle: number;
  /** degrees added to every slot's Y tilt */
  tilt: number;
  /** multiplies every slot's scale */
  scale: number;
}

export const DEFAULT_MODS: LayoutMods = { spread: 1, angle: 0, tilt: 0, scale: 1 };

export function modifyPreset(preset: LayoutPreset, mods: LayoutMods): LayoutPreset {
  if (
    mods.spread === 1 && mods.angle === 0 && mods.tilt === 0 && mods.scale === 1
  ) {
    return preset;
  }
  return {
    ...preset,
    slots: preset.slots.map((s) => ({
      ...s,
      x: s.x * mods.spread,
      y: s.y * mods.spread,
      rotate: s.rotate + mods.angle,
      tiltY: Math.max(-45, Math.min(45, s.tiltY + mods.tilt)),
      scale: s.scale * mods.scale,
    })),
  };
}

function baseScale(layer: MockupLayer, canvasHeight: number): number {
  const device = layer.deviceId ? getDevice(layer.deviceId) : undefined;
  if (!device) return layer.transform.scale;
  return (canvasHeight * 0.78) / device.frame.height;
}

/**
 * Re-flows the scene's mockup layers into the preset's slots. Missing slots are
 * filled by cloning the first mockup (device + media); extra mockups are removed.
 * Non-mockup layers (text, stickers) are untouched.
 */
export function applyLayout(scene: SceneDocument, preset: LayoutPreset): SceneDocument {
  const mockups = scene.layers.filter((l): l is MockupLayer => l.type === "mockup");
  const others = scene.layers.filter((l) => l.type !== "mockup");
  if (mockups.length === 0) return scene;

  const n = preset.slots.length;
  const used: MockupLayer[] = mockups.slice(0, n);
  while (used.length < n) {
    const src = used[used.length % mockups.length] ?? mockups[0];
    used.push({ ...structuredClone(src), id: createId() });
  }

  const orderedSlots = [...preset.slots.keys()].sort((a, b) => preset.slots[a].z - preset.slots[b].z);
  const placed = orderedSlots.map((slotIdx) => {
    const s = preset.slots[slotIdx];
    const layer = used[slotIdx];
    const base = baseScale(layer, scene.canvas.height);
    return {
      ...layer,
      transform: {
        ...layer.transform,
        x: Math.round(s.x * scene.canvas.width),
        y: Math.round(s.y * scene.canvas.height),
        scale: Math.round(base * s.scale * 1000) / 1000,
        rotate: s.rotate,
        tiltX: s.tiltX,
        tiltY: s.tiltY,
      },
    };
  });

  return { ...scene, layers: [...placed, ...others] };
}
