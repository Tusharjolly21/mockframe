"use client";

import type { MockupLayer, SceneDocument } from "@framekit/scene";
import { applyLayout, LAYOUT_PRESETS } from "./layouts";

/**
 * Scene variations (PostSpark's left thumbnail rail): the CURRENT content
 * re-staged in different counts / angles / compositions — including pairs
 * where the extra device is a blank frame. Applying one restages the scene;
 * media, background and styling stay yours.
 */

export interface Variation {
  id: string;
  label: string;
  presetId: string;
  /** extra (duplicated) devices keep an EMPTY screen — the blank-frame look */
  blankExtras?: boolean;
}

export const VARIATIONS: Variation[] = [
  { id: "v-center", label: "Centered", presetId: "solo-center" },
  { id: "v-float", label: "Floating", presetId: "solo-tilt" },
  { id: "v-lean", label: "Leaning", presetId: "solo-lean" },
  { id: "v-hero", label: "Hero crop", presetId: "solo-hero" },
  { id: "v-flat", label: "Flat lay", presetId: "solo-flat" },
  { id: "v-duo", label: "Side by side", presetId: "duo-side" },
  { id: "v-duo-persp", label: "Perspective pair", presetId: "duo-perspective" },
  { id: "v-duo-blank", label: "With blank frame", presetId: "duo-side", blankExtras: true },
  { id: "v-duo-blank-lean", label: "Blank pair, leaning", presetId: "duo-lean", blankExtras: true },
  { id: "v-trio", label: "Row of three", presetId: "trio-row" },
  { id: "v-trio-fan", label: "Fan", presetId: "trio-fan" },
  { id: "v-trio-blank", label: "Trio, blank sides", presetId: "trio-showcase", blankExtras: true },
];

/** Restage the scene into this variation. Pure — safe for live previews. */
export function applyVariation(scene: SceneDocument, v: Variation): SceneDocument {
  const preset = LAYOUT_PRESETS.find((p) => p.id === v.presetId);
  if (!preset) return scene;
  const firstMockupId = scene.layers.find((l): l is MockupLayer => l.type === "mockup")?.id;
  // keep only the FIRST mockup so applyLayout duplicates it into the slots
  // (otherwise a 3-device scene stays 3-device for a solo variation)
  const trimmed: SceneDocument = {
    ...scene,
    layers: scene.layers.filter((l) => l.type !== "mockup" || l.id === firstMockupId),
  };
  const staged = applyLayout(trimmed, preset);
  if (!v.blankExtras) return staged;
  // blank the screens of every mockup except the first (the duplicated frames)
  let seen = 0;
  return {
    ...staged,
    layers: staged.layers.map((l) => {
      if (l.type !== "mockup") return l;
      seen += 1;
      return seen === 1 ? l : { ...l, media: null };
    }),
  };
}
