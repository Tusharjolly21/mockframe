"use client";

import type { StyleTheme } from "./themes";

/**
 * Brand kit v1 — the styling a team applies to everything: accent colour,
 * optional logo (asset id) and a display name. Stored locally; applied as a
 * derived theme in the editor and as the default accent in the promo maker.
 */
export interface BrandKit {
  name: string;
  accent: string; // #rrggbb
  logoAssetId: string | null;
}

const KEY = "fk-brand-kit";
const EVENT = "framekit:brand-changed";

export function loadBrandKit(): BrandKit | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BrandKit>;
    if (typeof parsed.accent !== "string" || !/^#[0-9a-fA-F]{6}$/.test(parsed.accent)) return null;
    return {
      name: typeof parsed.name === "string" ? parsed.name : "My brand",
      accent: parsed.accent,
      logoAssetId: typeof parsed.logoAssetId === "string" ? parsed.logoAssetId : null,
    };
  } catch {
    return null;
  }
}

export function saveBrandKit(kit: BrandKit): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(kit));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* storage unavailable */
  }
}

export function onBrandChange(fn: () => void): () => void {
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}

/** Mix a hex colour toward black (t 0..1). */
function shade(hex: string, t: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.round(v * (1 - t));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/** Derive a one-click theme from the brand accent: a rich diagonal gradient
 *  from the accent into its deep shade — safe on any content. */
export function brandTheme(kit: BrandKit): StyleTheme {
  return {
    id: "brand-kit",
    name: `${kit.name} theme`,
    background: {
      type: "linear-gradient",
      angle: 135,
      stops: [
        { at: 0, color: kit.accent },
        { at: 1, color: shade(kit.accent, 0.72) },
      ],
    },
  };
}
