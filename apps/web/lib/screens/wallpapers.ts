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

/* Doodle glyphs: 24×24 line icons in the style of WhatsApp's default chat
   wallpaper (phones, cameras, notes, hearts, clouds, cups…). */
const DOODLE_GLYPHS = [
  "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2", // phone
  "M3 8a2 2 0 0 1 2-2h3l2-2h4l2 2h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM12 10a3.5 3.5 0 1 0 .01 0", // camera
  "M9 18V5l11-2v13M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3zM20 16a3 3 0 1 1-3-3 3 3 0 0 1 3 3z", // music
  "M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z", // heart
  "M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z", // star
  "M7 18a5 5 0 0 1-.6-10A6.5 6.5 0 0 1 19 9.5 4.3 4.3 0 0 1 18.5 18z", // cloud
  "M4 8h13v6a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6zM17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 2v3M12 2v3", // cup
  "M12 2a10 10 0 1 0 .01 0M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01", // smiley
  "M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 21l1.9-5.2A8.4 8.4 0 1 1 21 11.5z", // bubble
  "M22 2L11 13M22 2l-7 20-4-9-9-4z", // plane
  "M12 7a5 5 0 1 0 .01 0M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4", // sun
  "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z", // moon
  "M5 17a3 3 0 1 0 .01 0M19 17a3 3 0 1 0 .01 0M5 17l4-8h6l4 8M9 9l3 8h-7M14 5h2l3 12", // bike
  "M12 2a10 10 0 0 0-10 10h20A10 10 0 0 0 12 2zM12 12v8a2 2 0 0 0 4 0", // umbrella
  "M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z", // gift
  "M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1v-6h3zM3 19a2 2 0 0 0 2 2h1v-6H3z", // headphones
  "M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10zM2 21c0-3 1.9-5.4 5.1-6", // leaf
  "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6", // mail
];

/** A full-screen tile of rotated doodle glyphs (no background). */
export function doodleLayer(ink: string, opacity: number, strokeWidth = 1.5): string {
  const cells: string[] = [];
  let i = 0;
  const STEP_X = 58;
  const STEP_Y = 54;
  for (let row = 0, y = 10; y < SH; row++, y += STEP_Y) {
    for (let x = (row % 2) * (STEP_X / 2) + 6; x < SW; x += STEP_X) {
      const g = DOODLE_GLYPHS[(i * 7 + row * 3) % DOODLE_GLYPHS.length];
      const rot = ((i * 37) % 50) - 25;
      const s = 0.95 + ((i * 13) % 4) * 0.08;
      cells.push(
        `<path d="${g}" transform="translate(${x} ${y}) rotate(${rot} 12 12) scale(${s})"/>`
      );
      i++;
    }
  }
  return `<g fill="none" stroke="${ink}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}">${cells.join("")}</g>`;
}

/** WhatsApp's signature doodle wallpaper on its beige (light) / ink (dark) base. */
export function whatsappDoodle(dark: boolean): string {
  const bg = dark ? "#0b141a" : "#efeae2";
  const ink = dark ? "#1d2a31" : "#d4cabb";
  return `<rect width="${SW}" height="${SH}" fill="${bg}"/>${doodleLayer(ink, dark ? 0.85 : 0.72)}`;
}

const doodle: Wallpaper = {
  id: "doodle",
  label: "Doodle",
  swatch: "#e2d9cb",
  make: whatsappDoodle,
};

export const WALLPAPERS: Wallpaper[] = [
  doodle,
  solid("plain", "Plain", "#ece5dd", "#0b141a"),
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
