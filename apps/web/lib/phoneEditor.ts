import { getDevice } from "@framekit/devices";
import type { Background, SceneDocument } from "@framekit/scene";
import { buildDeviceScene, deviceForScreenshot } from "./deviceScene";
import { prettyLooks } from "./prettify";

/**
 * The phone editor's model: one screenshot, one device, one style, one size.
 * Every change rebuilds the scene from these four, so nothing drifts. Pure.
 */

export interface PhoneSize {
  id: string;
  label: string;
  /** null keeps the device's own canvas */
  width: number | null;
  height: number | null;
}

export const PHONE_SIZES: PhoneSize[] = [
  { id: "auto", label: "Fit", width: null, height: null },
  { id: "portrait", label: "Portrait", width: 1080, height: 1350 },
  { id: "square", label: "Square", width: 1080, height: 1080 },
  { id: "story", label: "Story", width: 1080, height: 1920 },
  { id: "wide", label: "Landscape", width: 1600, height: 900 },
];

export type PhoneStyle =
  | { kind: "device" }
  | { kind: "look"; index: number; round: number }
  | { kind: "background"; bg: Background };

export interface PhoneShot {
  id: string;
  width: number;
  height: number;
}

const PHONES = ["iphone-17-pro", "iphone-17-pro-max", "iphone-17-air", "iphone-16", "pixel-10-pro", "galaxy-s25-ultra", "nothing-phone-3", "oneplus-13"];
const TABLETS = ["ipad-pro-11", "ipad-pro-13", "ipad-air", "ipad-mini", "galaxy-tab-s10-ultra", "pixel-tablet"];
const TABLETS_WIDE = ["ipad-pro-13-landscape", "macbook-air-13", "macbook-pro-14", "safari-browser", "chrome-browser"];
const DESKTOPS = ["macbook-pro-14", "macbook-air-15", "macbook-pro-16", "imac-24", "studio-display", "safari-browser", "chrome-browser", "arc-browser"];

/** Devices worth offering for a screenshot of this shape, best first. */
export function devicesForShot(width: number, height: number): string[] {
  const best = deviceForScreenshot(width, height);
  const ar = width / height;
  const pool = ar < 0.58 ? PHONES : ar < 1 ? TABLETS : ar < 1.42 ? TABLETS_WIDE : DESKTOPS;
  return [best, ...pool.filter((id) => id !== best)].filter((id) => !!getDevice(id));
}

/** Shrink any device wider than the canvas (a laptop on a story canvas). */
function fitWidth(scene: SceneDocument): SceneDocument {
  const max = scene.canvas.width * 0.88;
  return {
    ...scene,
    layers: scene.layers.map((l) => {
      if (l.type !== "mockup" || !l.deviceId) return l;
      const frame = getDevice(l.deviceId)?.frame;
      if (!frame || frame.width * l.transform.scale <= max) return l;
      return { ...l, transform: { ...l.transform, scale: Math.round((max / frame.width) * 1000) / 1000 } };
    }),
  };
}

/** The screenshot in the device on its own canvas, sized to `sizeId`. */
export function buildPhoneScene(shot: PhoneShot, deviceId: string, sizeId: string): SceneDocument | null {
  const base = buildDeviceScene(deviceId);
  const device = getDevice(deviceId);
  if (!base || !device) return null;
  const size = PHONE_SIZES.find((s) => s.id === sizeId);
  const width = size?.width ?? base.canvas.width;
  const height = size?.height ?? base.canvas.height;
  const scale = Math.round(Math.min((height * 0.78) / device.frame.height, (width * 0.82) / device.frame.width) * 1000) / 1000;
  const media = { assetId: shot.id, kind: "image" as const, fit: "cover" as const, offsetX: 0, offsetY: 0, scale: 1 };
  return {
    ...base,
    id: `scene-phone-${deviceId}`,
    canvas: { ...base.canvas, width, height },
    layers: base.layers.map((l) => (l.type === "mockup" ? { ...l, media, transform: { ...l.transform, x: 0, y: 0, scale } } : l)),
  };
}

/** Apply a style on top of the built scene. `palette` is the screenshot's colours (lib/palette.ts). */
export function stylePhoneScene(scene: SceneDocument, style: PhoneStyle, palette: string[]): SceneDocument {
  if (style.kind === "look") {
    const look = prettyLooks(scene, palette, style.round)[style.index];
    return look ? fitWidth(look.scene) : scene;
  }
  if (style.kind === "background") {
    const portrait = scene.canvas.backdrop?.portrait;
    return { ...scene, canvas: { ...scene.canvas, background: style.bg, backdrop: portrait ? { portrait } : undefined, effects: undefined } };
  }
  return scene;
}

/** The output file size for a scene: twice the canvas, kept under what phone browsers can draw. */
export function phoneExportScale(scene: SceneDocument): number {
  const px = scene.canvas.width * scene.canvas.height;
  return px * 4 <= 12_000_000 ? 2 : Math.max(1, Math.floor(Math.sqrt(12_000_000 / px) * 10) / 10);
}
