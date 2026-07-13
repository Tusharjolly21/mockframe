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

export function searchIcons(query: string, limit = 48): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return CURATED.filter((n) => solar.icons[n + STYLE_SUFFIX]).slice(0, limit);
  const tokens = q.split(/\s+/);
  const out: string[] = [];
  for (const key of Object.keys(solar.icons)) {
    if (!key.endsWith(STYLE_SUFFIX)) continue;
    const base = key.slice(0, -STYLE_SUFFIX.length);
    if (tokens.every((t) => base.includes(t))) {
      out.push(base);
      if (out.length >= limit) break;
    }
  }
  return out;
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
