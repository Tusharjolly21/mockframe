"use client";

import { icons as solar } from "@iconify-json/solar";

/**
 * Iconify icon stickers (Solar set, bold-duotone) — 7,000+ vector icons,
 * bundled as JSON so there's no runtime fetch. An icon is inserted as a
 * tinted SVG data-URL asset sticker: crisp at any scale and export-safe
 * (html-to-image needs no network).
 */

const STYLE_SUFFIX = "-bold-duotone"; // one coherent style; search stays simple

/** shown before the user types — the greatest hits for mockup annotation */
const CURATED = [
  "star", "heart", "fire", "rocket-2", "bolt", "crown", "cup-star", "medal-ribbons-star",
  "check-circle", "close-circle", "danger-triangle", "question-circle", "info-circle", "bell",
  "arrow-right", "arrow-left", "arrow-up", "arrow-down", "undo-left-round", "cursor",
  "smartphone", "laptop", "monitor", "camera", "gallery", "music-note-2", "videocamera-record",
  "chat-round-dots", "letter", "phone-calling", "user-circle", "users-group-rounded",
  "magnifer", "settings", "lock-keyhole", "shield-check", "eye", "link-round",
  "cart-large-2", "bag-smile", "wallet-money", "dollar", "tag-price", "gift",
  "calendar", "clock-circle", "map-point", "planet", "cloud", "moon-stars", "sun-2", "leaf",
];

// full catalog in browse order: curated favourites first, then everything
// else alphabetically — computed once
let ALL_BASES: string[] | null = null;
function allBases(): string[] {
  if (!ALL_BASES) {
    const curated = CURATED.filter((n) => solar.icons[n + STYLE_SUFFIX]);
    const curatedSet = new Set(curated);
    const rest = Object.keys(solar.icons)
      .filter((k) => k.endsWith(STYLE_SUFFIX))
      .map((k) => k.slice(0, -STYLE_SUFFIX.length))
      .filter((b) => !curatedSet.has(b))
      .sort();
    ALL_BASES = [...curated, ...rest];
  }
  return ALL_BASES;
}

/** Every matching icon — the picker windows the list itself (scroll batching). */
export function searchIcons(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return allBases();
  const tokens = q.split(/\s+/);
  return allBases().filter((base) => tokens.every((t) => base.includes(t)));
}

/** inline SVG markup for the picker grid (tinted via currentColor + CSS color) */
export function iconBody(base: string): string | null {
  return solar.icons[base + STYLE_SUFFIX]?.body ?? null;
}

export const ICON_VIEWBOX = `0 0 ${solar.width ?? 24} ${solar.height ?? 24}`;

/** 512px tinted SVG data URL — the sticker asset baked at insertion time */
export function iconDataUrl(base: string, color: string): string | null {
  const body = iconBody(base);
  if (!body) return null;
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='512' height='512' viewBox='${ICON_VIEWBOX}' color='${color}'>` +
    body.replaceAll("currentColor", color) +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
