import { SOLAR_ICON_BODIES } from "./generated/solarIconBodies";

/**
 * A curated, generated subset of Iconify's Solar bold-duotone collection.
 * Keeping the whole 7,400-icon package in this client module added more than
 * 6 MB of raw JavaScript to the editor. Inserted icons are still self-contained
 * SVG data URLs, crisp at any scale and export-safe.
 */

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
    const curated = CURATED.filter((n) => SOLAR_ICON_BODIES[n]);
    const curatedSet = new Set(curated);
    const rest = Object.keys(SOLAR_ICON_BODIES)
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

export const ICON_VIEWBOX = "0 0 24 24";

export const ICON_PALETTES = {
  aurora: ["#7c3aed", "#06b6d4", "#a7f3d0"],
  sunset: ["#f43f5e", "#f97316", "#facc15"],
  meadow: ["#166534", "#22c55e", "#bef264"],
  ocean: ["#1d4ed8", "#06b6d4", "#bae6fd"],
  cosmic: ["#312e81", "#9333ea", "#f0abfc"],
} as const;

export const ICON_COLLECTIONS = {
  space: ["planet", "planet-2", "planet-3", "planet-4", "moon-stars", "moon", "star", "star-fall", "satellite", "ufo", "rocket", "rocket-2", "atom"],
  nature: ["earth", "leaf", "sun", "sun-2", "cloud", "cloud-sun", "cloud-rain", "water", "waterdrop", "wind", "snowflake", "fire"],
  animals: ["cat", "paw", "bug", "bug-minimalistic"],
} as const;

export type IconPalette = readonly string[];

/** Color Solar's duotone paths in sequence for a crisp, multicolor sticker. */
export function colorizeIconBody(body: string, palette: IconPalette): string {
  let index = 0;
  return body.replaceAll("currentColor", () => palette[index++ % palette.length]);
}

/** inline SVG markup for the picker grid. */
export function iconBody(base: string, palette?: IconPalette): string | null {
  const body = SOLAR_ICON_BODIES[base];
  return body ? (palette?.length ? colorizeIconBody(body, palette) : body) : null;
}

/** 512px tinted SVG data URL — the sticker asset baked at insertion time */
export function iconDataUrl(base: string, color: string, palette?: IconPalette): string | null {
  const body = iconBody(base, palette);
  if (!body) return null;
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='512' height='512' viewBox='${ICON_VIEWBOX}' color='${color}'>` +
    body.replaceAll("currentColor", color) +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
