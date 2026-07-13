"use client";

import type { WatermarkOptions } from "./watermark";

/**
 * Custom brand watermark (Pro): instead of just removing the MockFrame marks,
 * paying users can stamp their OWN brand on every export — text and/or logo,
 * as a corner badge or a tiled pattern. Settings persist per browser; the
 * invisible forensic layer stays on all exports regardless.
 */

export type WatermarkPosition = "tl" | "tc" | "tr" | "ml" | "mc" | "mr" | "bl" | "bc" | "br";

export interface CustomWatermarkCfg {
  enabled: boolean;
  mode: "badge" | "tiled";
  text: string;
  /** small data-URL logo (≤256px) or null */
  logo: string | null;
  position: WatermarkPosition;
  /** size multiplier 0.5–2 (also tile density in tiled mode) */
  size: number;
  opacity: number;
  color: string;
  /** dark pill behind the badge for busy backgrounds */
  pill: boolean;
}

export const DEFAULT_CUSTOM_WATERMARK: CustomWatermarkCfg = {
  enabled: false,
  mode: "badge",
  text: "@yourbrand",
  logo: null,
  position: "br",
  size: 1,
  opacity: 0.9,
  color: "#ffffff",
  pill: true,
};

const LS_KEY = "mockframe:custom-watermark";

export function loadCustomWatermark(): CustomWatermarkCfg {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...DEFAULT_CUSTOM_WATERMARK };
    return { ...DEFAULT_CUSTOM_WATERMARK, ...(JSON.parse(raw) as Partial<CustomWatermarkCfg>) };
  } catch {
    return { ...DEFAULT_CUSTOM_WATERMARK };
  }
}

export function saveCustomWatermark(cfg: CustomWatermarkCfg): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(cfg));
  } catch {
    /* quota — settings just won't persist */
  }
}

/** Watermark options for an export: free tier gets the full MockFrame marks,
 *  Pro gets their custom brand (if enabled) or forensic-only. */
export function exportWatermarkOpts(watermarkFree: boolean): WatermarkOptions {
  if (!watermarkFree) return {};
  const cfg = loadCustomWatermark();
  return { tile: false, badge: false, custom: cfg.enabled ? cfg : undefined };
}

/** Downscale an uploaded logo to ≤256px and return a compact data URL
 *  (PNG to keep transparency — logos are usually small). */
export async function ingestLogo(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Logo must be an image");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => rej(new Error("Not a decodable image"));
      im.src = url;
    });
    const s = Math.min(1, 256 / Math.max(img.naturalWidth, img.naturalHeight));
    const cv = document.createElement("canvas");
    cv.width = Math.max(1, Math.round(img.naturalWidth * s));
    cv.height = Math.max(1, Math.round(img.naturalHeight * s));
    cv.getContext("2d")!.drawImage(img, 0, 0, cv.width, cv.height);
    return cv.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}
