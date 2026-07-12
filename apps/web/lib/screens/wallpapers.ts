"use client";

import { SH, SW } from "./common";

/**
 * Chat wallpaper presets for the apps that actually let you change it —
 * WhatsApp (+ groups) and Telegram. Each returns a full-screen SVG fill
 * (solid, gradient, or the WhatsApp doodle pattern). `default` is handled by
 * the renderer (its own beige/dark), so it's not in this list.
 */

export interface Wallpaper {
  id: string;
  label: string;
  /** small swatch preview color for the editor */
  swatch: string;
  make: (dark: boolean) => string;
}

const solid = (id: string, label: string, light: string, dark: string): Wallpaper => ({
  id,
  label,
  swatch: light,
  make: (d) => `<rect width="${SW}" height="${SH}" fill="${d ? dark : light}"/>`,
});

const gradient = (id: string, label: string, swatch: string, light: [string, string], dark: [string, string]): Wallpaper => ({
  id,
  label,
  swatch,
  make: (d) => {
    const [a, b] = d ? dark : light;
    return (
      `<defs><linearGradient id="wp${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>` +
      `<rect width="${SW}" height="${SH}" fill="url(#wp${id})"/>`
    );
  },
});

/** WhatsApp's signature doodle wallpaper: faint scattered glyphs on beige/ink. */
const doodle: Wallpaper = {
  id: "doodle",
  label: "Doodle",
  swatch: "#d9d2c5",
  make: (d) => {
    const bg = d ? "#0b141a" : "#d9d2c5";
    const ink = d ? "#1c2b34" : "#c3b9a6";
    const glyphs = [
      "M8 0 a8 8 0 1 0 0.01 0 M4 9 a5 5 0 0 0 8 0", // smiley
      "M0 6 c0 -8 12 -8 12 0 c0 -8 12 -8 12 0 c0 6 -12 14 -12 14 c0 0 -12 -8 -12 -14 Z", // heart
      "M10 0 v20 M0 10 h20", // plus
      "M0 10 a10 10 0 0 1 20 0 Z", // dome
      "M2 2 l14 14 M16 2 l-14 14", // star-ish
    ];
    const cells: string[] = [];
    let i = 0;
    for (let y = 20; y < SH; y += 72) {
      for (let x = (Math.floor(y / 72) % 2) * 40 + 24; x < SW; x += 84) {
        const g = glyphs[i % glyphs.length];
        const s = 0.7 + (i % 3) * 0.15;
        cells.push(
          `<path d="${g}" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.5" transform="translate(${x} ${y}) scale(${s})"/>`
        );
        i++;
      }
    }
    return `<rect width="${SW}" height="${SH}" fill="${bg}"/>${cells.join("")}`;
  },
};

export const WALLPAPERS: Wallpaper[] = [
  doodle,
  solid("sage", "Sage", "#dbe7dc", "#0e1f18"),
  solid("blush", "Blush", "#f4e0e4", "#241319"),
  solid("sky", "Sky", "#dde8f3", "#0f1a2b"),
  solid("graphite", "Graphite", "#e6e6ea", "#17171c"),
  gradient("sunset", "Sunset", "#f9a870", ["#fdd9a0", "#f78ca0"], ["#3a1d24", "#5a2a2f"]),
  gradient("ocean", "Ocean", "#6fc0d6", ["#cdeef0", "#a5c8e8"], ["#0a2230", "#123a44"]),
  gradient("aurora", "Aurora", "#a7d8b0", ["#d6f0d2", "#cbd6f5"], ["#0e2a1e", "#1c1f3a"]),
];

const BY_ID = new Map(WALLPAPERS.map((w) => [w.id, w]));

/** Full-screen wallpaper SVG for a preset id, or null to use the app default. */
export function resolveWallpaper(id: string | undefined, dark: boolean): string | null {
  if (!id) return null;
  const w = BY_ID.get(id);
  return w ? w.make(dark) : null;
}
