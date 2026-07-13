"use client";

import { registerDevice, unregisterDevice, type Device } from "@framekit/devices";
import type { Quad } from "@framekit/renderer";

/**
 * User-created "custom mockup" devices — a photo of THEIR device (own iPhone on
 * a desk, laptop, CC0 shot) calibrated in the editor's Custom Mockup modal.
 * Registered into the runtime device registry (category "scene", plate mode
 * "under" since ordinary photos have no transparent screen hole) and persisted
 * in localStorage so they survive reloads. The plate is stored as a downscaled
 * data URL — export-safe (html-to-image needs no fetch) and self-contained.
 */

const LS_KEY = "mockframe:custom-devices";
const MAX_PLATE_PX = 1800; // longest edge — keeps localStorage happy (~0.5MB/photo)

export interface CustomDeviceDef {
  id: string;
  name: string;
  plate: string; // data URL
  plateW: number;
  plateH: number;
  quad: Quad;
  radius: number; // plate px
  createdAt: number;
}

function toDevice(def: CustomDeviceDef): Device {
  // screen resolution ≈ the quad's bounding box (recommended upload dims);
  // the warp source box uses this aspect, so keep it true to the marked screen
  const xs = def.quad.map((c) => c[0]);
  const ys = def.quad.map((c) => c[1]);
  const bw = Math.max(...xs) - Math.min(...xs);
  const bh = Math.max(...ys) - Math.min(...ys);
  const k = Math.max(1, 1600 / Math.max(bw, bh));
  const screenRect = {
    x: Math.round(Math.min(...xs)),
    y: Math.round(Math.min(...ys)),
    width: Math.round(bw),
    height: Math.round(bh),
  };
  return {
    id: def.id,
    name: def.name,
    brand: "custom",
    category: "scene",
    released: new Date(def.createdAt).toISOString().slice(0, 7),
    screen: {
      width: Math.round(bw * k),
      height: Math.round(bh * k),
      // radius is authored in plate px; screen-space needs the same upscale
      cornerRadius: Math.round(def.radius * k),
    },
    frame: { width: def.plateW, height: def.plateH, screenRect, maskPath: "", overlaySelector: "#overlay" },
    variants: [{ id: "default", label: "Default", body: "", overlay: "", preview: "" }],
    aliases: [],
    seo: { monthlyQueries: [] },
    plate: {
      src: def.plate,
      width: def.plateW,
      height: def.plateH,
      screenRect,
      screenQuad: def.quad,
      screenRadius: def.radius,
      mode: "under",
    },
  };
}

export function loadCustomDevices(): CustomDeviceDef[] {
  let defs: CustomDeviceDef[];
  try {
    defs = JSON.parse(localStorage.getItem(LS_KEY) ?? "[]") as CustomDeviceDef[];
  } catch (err) {
    console.warn("[customDevices] stored defs unreadable:", err);
    return [];
  }
  const ok: CustomDeviceDef[] = [];
  for (const def of defs) {
    // one corrupt entry must not take down the rest
    try {
      registerDevice(toDevice(def));
      ok.push(def);
    } catch (err) {
      console.warn(`[customDevices] skipping "${def?.id}":`, err);
    }
  }
  return ok;
}

export function saveCustomDevice(def: CustomDeviceDef): void {
  const defs = loadRaw().filter((d) => d.id !== def.id);
  defs.push(def);
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(defs));
  } catch {
    // QuotaExceeded — persist first, register second: a device that silently
    // vanishes on reload is worse than a clear error now
    throw new Error("Storage is full — delete an older custom mockup first (each photo uses ~0.5MB).");
  }
  registerDevice(toDevice(def));
}

export function deleteCustomDevice(id: string): void {
  localStorage.setItem(LS_KEY, JSON.stringify(loadRaw().filter((d) => d.id !== id)));
  unregisterDevice(id);
}

export function isCustomDevice(id: string): boolean {
  return id.startsWith("custom-");
}

function loadRaw(): CustomDeviceDef[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]") as CustomDeviceDef[];
  } catch {
    return [];
  }
}

/** Downscale an uploaded photo to ≤MAX_PLATE_PX and return a compact data URL.
 *  Keeps PNG only when the image actually has transparency; else JPEG. */
export async function ingestPlatePhoto(file: File): Promise<{ url: string; width: number; height: number }> {
  const bitmapUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => rej(new Error("Not a decodable image"));
      im.src = bitmapUrl;
    });
    const s = Math.min(1, MAX_PLATE_PX / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * s));
    const h = Math.max(1, Math.round(img.naturalHeight * s));
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, w, h);
    // transparency probe on a sparse grid
    const d = ctx.getImageData(0, 0, w, h).data;
    let hasAlpha = false;
    for (let i = 3; i < d.length; i += 4 * 97) {
      if (d[i] < 250) {
        hasAlpha = true;
        break;
      }
    }
    const url = hasAlpha ? cv.toDataURL("image/png") : cv.toDataURL("image/jpeg", 0.87);
    return { url, width: w, height: h };
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}
