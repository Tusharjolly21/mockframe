"use client";

import { getDevice } from "@framekit/devices";
import { createId, createMockupLayer, type Layer, type MockupLayer, type SceneDocument } from "@framekit/scene";
import { cameraFor } from "./layouts";

/**
 * Web + phone combos: a laptop / browser / desktop next to phones, for
 * products that ship on both. Applying one rebuilds only the device layers;
 * screenshots carry over by kind (the wide device keeps its website shot, the
 * phones keep theirs), and text, stickers and the background stay untouched.
 */

type Kind = "wide" | "phone";

interface ComboSlot {
  kind: Kind;
  /** default device when the scene doesn't already have one of this kind */
  device: string;
  variant?: string;
  /** centre offset from the canvas centre, as a fraction of canvas W / H */
  x: number;
  y: number;
  /** wide: frame width as a fraction of canvas W · phone: frame height as a fraction of canvas H */
  size: number;
  rotate?: number;
  tiltX?: number;
  tiltY?: number;
  z: number;
}

export interface Combo {
  id: string;
  label: string;
  slots: ComboSlot[];
}

const LAPTOP = { device: "macbook-pro-14", variant: "space-black" };
const BROWSER = { device: "safari-browser", variant: "light" };
const BIG_LAPTOP = { device: "macbook-pro-16", variant: "silver" };
const PHONE = "iphone-17-pro";

export const COMBOS: Combo[] = [
  {
    id: "combo-laptop",
    label: "Laptop + phone",
    slots: [
      { kind: "wide", ...LAPTOP, x: -0.07, y: 0.0, size: 0.74, z: 0 },
      { kind: "phone", device: PHONE, x: 0.31, y: 0.1, size: 0.62, z: 1 },
    ],
  },
  {
    id: "combo-browser",
    label: "Browser + phone",
    slots: [
      { kind: "wide", ...BROWSER, x: -0.08, y: -0.03, size: 0.7, z: 0 },
      { kind: "phone", device: PHONE, x: 0.3, y: 0.1, size: 0.66, z: 1 },
    ],
  },
  {
    id: "combo-3d",
    label: "3D pair",
    slots: [
      { kind: "wide", ...LAPTOP, x: -0.1, y: -0.01, size: 0.7, tiltX: 6, tiltY: 20, z: 0 },
      { kind: "phone", device: PHONE, x: 0.29, y: 0.08, size: 0.64, tiltX: 6, tiltY: 20, z: 1 },
    ],
  },
  {
    id: "combo-phone-first",
    label: "Phone first",
    slots: [
      { kind: "wide", ...BROWSER, x: 0.12, y: -0.05, size: 0.66, z: 0 },
      { kind: "phone", device: PHONE, x: -0.28, y: 0.06, size: 0.76, rotate: -4, z: 1 },
    ],
  },
  {
    id: "combo-web-duo",
    label: "Web + two phones",
    slots: [
      { kind: "wide", ...BROWSER, x: 0, y: -0.07, size: 0.6, z: 0 },
      { kind: "phone", device: PHONE, x: -0.33, y: 0.11, size: 0.6, rotate: -5, z: 1 },
      { kind: "phone", device: PHONE, x: 0.33, y: 0.11, size: 0.6, rotate: 5, z: 2 },
    ],
  },
  {
    id: "combo-desktop",
    label: "Big laptop + phone",
    slots: [
      { kind: "wide", ...BIG_LAPTOP, x: -0.09, y: 0.0, size: 0.56, z: 0 },
      { kind: "phone", device: PHONE, x: 0.27, y: 0.12, size: 0.6, z: 1 },
    ],
  },
];

const WIDE_CATEGORIES = new Set(["laptop", "desktop", "browser"]);

export function isWideLayer(l: Layer): boolean {
  if (l.type !== "mockup" || !l.deviceId) return false;
  const d = getDevice(l.deviceId);
  return !!d && WIDE_CATEGORIES.has(d.category);
}

/** a phone the combo can reuse (plain SVG frame, not a photo scene) */
function isPhoneLayer(l: Layer): l is MockupLayer {
  if (l.type !== "mockup" || !l.deviceId) return false;
  const d = getDevice(l.deviceId);
  return !!d && d.category === "phone" && !d.plate;
}

/** which combo (if any) the scene currently looks like: a wide device plus phones */
export function isComboScene(scene: SceneDocument): boolean {
  return scene.layers.some(isWideLayer) && scene.layers.some((l) => l.type === "mockup" && !isWideLayer(l));
}

export function applyCombo(scene: SceneDocument, combo: Combo): SceneDocument {
  const mockups = scene.layers.filter((l): l is MockupLayer => l.type === "mockup");
  const others = scene.layers.filter((l) => l.type !== "mockup");
  const wides = mockups.filter((l) => isWideLayer(l));
  // screenshots for the phones: phone layers first, then any other non-wide shot
  const phones = [...mockups.filter(isPhoneLayer), ...mockups.filter((l) => !isWideLayer(l) && !isPhoneLayer(l))];
  const phoneDevice = mockups.find(isPhoneLayer)?.deviceId ?? PHONE;
  const phoneVariant = mockups.find(isPhoneLayer)?.frameVariant;

  // landscape stage: combos need width (keep the user's canvas if it already has it)
  const landscape = scene.canvas.width / scene.canvas.height >= 1.3;
  const W = landscape ? scene.canvas.width : 1600;
  const H = landscape ? scene.canvas.height : 1000;

  let wi = 0;
  let pi = 0;
  const built = combo.slots.map((s) => {
    // an extra phone slot repeats the first phone's screenshot (like layouts do)
    const own = s.kind === "wide" ? wides[wi++] : phones[pi++];
    const src = own ?? (s.kind === "phone" && phones[0] ? { ...phones[0], id: createId() } : undefined);
    // the user's wide device type wins only if it matches the combo's look
    // (laptop combos stay laptops); a phone keeps the user's phone model
    const deviceId = s.kind === "phone" ? phoneDevice : s.device;
    const device = getDevice(deviceId)!;
    const base: MockupLayer = src
      ? { ...structuredClone(src), id: src.id }
      : { ...createMockupLayer({ deviceId, media: null }), id: createId() };
    // a phone shot never lands on a laptop and vice versa
    const media = src && (s.kind === "wide" ? isWideLayer(src) : !isWideLayer(src)) ? src.media : null;
    const scale =
      s.kind === "wide" ? (W * s.size) / device.frame.width : (H * s.size) / device.frame.height;
    const layer: MockupLayer = {
      ...base,
      deviceId,
      frameVariant: s.kind === "phone" ? (src && isPhoneLayer(src) ? src.frameVariant : phoneVariant) : s.variant,
      media,
      screenshotStyle: undefined,
      render: undefined,
      shadow: base.shadow ?? { mode: "adaptive", lightAngle: 90, distance: 40, softness: 90, opacity: 0.26, color: "#0b0b17" },
      transform: {
        ...base.transform,
        x: Math.round(s.x * W),
        y: Math.round(s.y * H),
        scale: Math.round(scale * 1000) / 1000,
        rotate: s.rotate ?? 0,
        tiltX: s.tiltX ?? 0,
        tiltY: s.tiltY ?? 0,
        perspective: 1200,
      },
    };
    layer.transform.perspective = cameraFor(layer);
    return { layer, z: s.z };
  });
  const layers = built.sort((a, b) => a.z - b.z).map((b) => b.layer);
  // a phone slot reusing an id twice (more slots than shots) would collide
  const seen = new Set<string>();
  for (const l of layers) {
    if (seen.has(l.id)) l.id = createId();
    seen.add(l.id);
  }
  return { ...scene, canvas: { ...scene.canvas, width: W, height: H }, layers: [...layers, ...others] };
}
