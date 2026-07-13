import { CC0_SCENES } from "./cc0Scenes";
import { PSD_WATCH_SCENES } from "./psdWatchScenes";
import { PSD_IPHONE16_SCENES } from "./psdIPhone16Scenes";
import { PSD_IPAD_PRO_SCENES } from "./psdIPadProScenes";
import { PSD_COMPOSITE_SCENES } from "./psdCompositeScenes";
import { PSD_MACBOOK_SCENES } from "./psdMacbookScenes";
import { DEVICES as PARAMETRIC_DEVICES } from "./generated/registry";
import { SCENE_DEVICES } from "./scenes";
import { SVG_DEVICES } from "./svgDevices";
import type { Device, DeviceVariant } from "./types";

export type { Device, DeviceVariant, DeviceCategory, FrameSpec, ScreenSpec, RasterPlate } from "./types";

// parametric SVG frames + hand-authored SVG frame devices + raster photo scenes
// (Pixeden-sourced) + CC0/free-commercial photo scenes
// These legacy AI-generated watch frames are intentionally hidden in favour of
// the calibrated PSD watch scenes. Keep the ids here as a migration guard for
// old generated registries and saved projects.
const REMOVED_DEVICE_IDS = new Set(["apple-watch-s10", "apple-watch-ultra-2", "watch-front"]);
const DEVICES: Device[] = [
  ...PARAMETRIC_DEVICES,
  ...SVG_DEVICES,
  ...SCENE_DEVICES,
  ...CC0_SCENES,
  ...PSD_WATCH_SCENES,
  ...PSD_IPHONE16_SCENES,
  ...PSD_IPAD_PRO_SCENES,
  ...PSD_COMPOSITE_SCENES,
  ...PSD_MACBOOK_SCENES,
].filter((device) => !REMOVED_DEVICE_IDS.has(device.id));

const byId = new Map(DEVICES.map((d) => [d.id, d]));

/**
 * Register a device at runtime — user-created "custom mockup" scene devices
 * (calibrated from their own photos in the editor). Re-registering an id
 * replaces it, so persisted customs re-load on every session start.
 */
export function registerDevice(device: Device): void {
  const i = DEVICES.findIndex((d) => d.id === device.id);
  if (i >= 0) DEVICES[i] = device;
  else DEVICES.push(device);
  byId.set(device.id, device);
}

export function unregisterDevice(id: string): void {
  const i = DEVICES.findIndex((d) => d.id === id);
  if (i >= 0) DEVICES.splice(i, 1);
  byId.delete(id);
}

export function listDevices(): Device[] {
  return DEVICES;
}

export function getDevice(id: string): Device | undefined {
  return byId.get(id);
}

export function getVariant(device: Device, variantId?: string): DeviceVariant {
  return device.variants.find((v) => v.id === variantId) ?? device.variants[0];
}

/** Standalone data-URI of a device preview SVG, for <img> thumbnails. */
export function previewDataUri(device: Device, variantId?: string): string {
  // raster photo scenes preview from the plate image itself
  if (device.plate) return device.plate.src;
  const v = getVariant(device, variantId);
  return `data:image/svg+xml,${encodeURIComponent(v.preview)}`;
}

/**
 * Auto device suggestion: exact screen resolution match first,
 * then aspect ratio within 1%. The deeper the registry, the more often
 * this "magic moment" fires.
 */
export function suggestDevice(imageW: number, imageH: number): Device | undefined {
  // photo scenes are user-picked, never auto-suggested from an upload's size
  const pool = DEVICES.filter((d) => d.category !== "scene");
  const exact = pool.find((d) => d.screen.width === imageW && d.screen.height === imageH);
  if (exact) return exact;
  const ar = imageW / imageH;
  let best: { d: Device; diff: number } | undefined;
  for (const d of pool) {
    const diff = Math.abs(d.screen.width / d.screen.height - ar) / (d.screen.width / d.screen.height);
    if (diff <= 0.01 && (!best || diff < best.diff)) best = { d, diff };
  }
  return best?.d;
}

export { DEVICES };
