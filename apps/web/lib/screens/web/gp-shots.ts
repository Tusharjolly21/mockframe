"use client";

import { esc, truncate, wrapText } from "../common";

/**
 * Shared Google Play pieces for the phone and desktop listings: filled store
 * screenshots (a caption over a mini app UI), the app icon tile, small
 * glyphs, a rating distribution and the descriptive copy.
 */

export interface PlayTheme {
  dark: boolean;
  bg: string;
  ink: string;
  sub: string;
  line: string;
  green: string;
  onGreen: string;
  chip: string;
  card: string;
}

export function playTheme(dark: boolean): PlayTheme {
  return dark
    ? { dark, bg: "#131314", ink: "#e3e3e3", sub: "#c4c7c5", line: "#444746", green: "#6dd58c", onGreen: "#003918", chip: "#2b2c2e", card: "#1e1f20" }
    : { dark, bg: "#ffffff", ink: "#1f1f1f", sub: "#444746", line: "#dadce0", green: "#01875f", onGreen: "#ffffff", chip: "#f1f3f4", card: "#f8f9fa" };
}

export const STAR = "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z";
export const ARROW_FWD = "M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z";
export const SHARE = "M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z";
export const BOOKMARK_ADD = "M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2zm-1 8h-3v3h-2v-3H8V9h3V6h2v3h3v2z";
export const DOWNLOAD = "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z";
export const SHIELD = "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z";

/** Letter tile or the user's uploaded icon, clipped to a rounded square. */
export function appIcon(id: string, x: number, y: number, size: number, title: string, avatarUrl: string | undefined, font: string, line: string): string {
  const rx = size * 0.22;
  const initial = esc([...title.trim()][0]?.toUpperCase() ?? "A");
  const body = avatarUrl
    ? `<defs><clipPath id="${id}c"><rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${rx}"/></clipPath></defs><image href="${avatarUrl}" x="${x}" y="${y}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id}c)"/>`
    : `<defs><linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#34d399"/><stop offset="1" stop-color="#047857"/></linearGradient></defs>` +
      `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${rx}" fill="url(#${id}g)"/>` +
      `<circle cx="${x + size * 0.72}" cy="${y + size * 0.26}" r="${size * 0.32}" fill="#ffffff" opacity="0.15"/>` +
      `<text x="${x + size / 2}" y="${y + size / 2 + size * 0.17}" font-family="${font}" font-size="${size * 0.46}" font-weight="700" fill="#ffffff" text-anchor="middle">${initial}</text>`;
  return body + `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${rx}" fill="none" stroke="${line}" stroke-opacity="0.5"/>`;
}

/** Fractions for 5,4,3,2,1 stars whose mean matches the displayed rating. */
export function ratingDist(r: number): number[] {
  const target = Math.min(4.95, Math.max(1.05, r));
  const mean = (b: number) => {
    let sw = 0;
    let sm = 0;
    for (let i = 1; i <= 5; i++) {
      const w = Math.exp(b * i);
      sw += w;
      sm += w * i;
    }
    return sm / sw;
  };
  let lo = -4;
  let hi = 8;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (mean(mid) < target) lo = mid;
    else hi = mid;
  }
  const b = (lo + hi) / 2;
  const w = [5, 4, 3, 2, 1].map((i) => Math.exp(b * i));
  const sum = w.reduce((a, c) => a + c, 0);
  return w.map((v) => v / sum);
}

/** About-this-app copy derived from the title (the doc has no description field). */
export function blurb(title: string): string {
  return `${title} helps you build a healthy daily habit with short guided sessions, clear progress tracking and gentle reminders. Start with a free plan and unlock more as you go. No account needed to get started.`;
}

/** Wrap to at most `n` lines, ending the last with an ellipsis when cut. */
export function clampLines(text: string, size: number, maxW: number, n: number): string[] {
  const lines = wrapText(text, size, maxW);
  if (lines.length <= n) return lines;
  const kept = lines.slice(0, n);
  kept[n - 1] = truncate(kept[n - 1] + " " + lines.slice(n).join(" "), size, maxW);
  return kept;
}

export function stars(x: number, y: number, n: number, size: number, color: string, empty: string, rating: number): string {
  let s = "";
  for (let i = 0; i < n; i++) {
    const fill = Math.min(1, Math.max(0, rating - i));
    const cx = x + i * (size + 2);
    const id = `st${Math.round(x)}${Math.round(y)}${i}`;
    s += `<g transform="translate(${cx.toFixed(1)} ${y.toFixed(1)}) scale(${(size / 24).toFixed(3)})">` +
      `<path d="${STAR}" fill="${empty}"/>` +
      (fill > 0
        ? `<defs><clipPath id="${id}"><rect x="0" y="0" width="${(24 * fill).toFixed(1)}" height="24"/></clipPath></defs><path d="${STAR}" fill="${color}" clip-path="url(#${id})"/>`
        : "") +
      `</g>`;
  }
  return s;
}

/* --------------------------- screenshot tiles ------------------------------ */

type Pal = [string, string];
const PALS: Pal[] = [
  ["#2dd4bf", "#0f766e"],
  ["#60a5fa", "#1d4ed8"],
  ["#fbbf24", "#d97706"],
  ["#f472b6", "#be185d"],
];
const CAPTIONS: Array<[string, string]> = [
  ["Simple, guided", "daily sessions"],
  ["Track your", "progress"],
  ["Gentle reminders", "that fit your day"],
  ["Plans for", "every goal"],
];

/** Natural width:height of a screenshot tile (portrait phone shot). */
export const SHOT_RATIO = 280 / 150;

/**
 * One portrait store screenshot: gradient, caption, and a mini phone showing a
 * believable app screen. Drawn in a 150x280 box and scaled to width `w`.
 */
export function playShot(idx: number, x: number, y: number, w: number, font: string): string {
  const s = w / 150;
  const k = idx % 4;
  const [c0, c1] = PALS[k];
  const id = `pls${idx}_${Math.round(x)}_${Math.round(y)}`;
  const cap = CAPTIONS[k];
  const px = 20;
  const pw = 110;
  const py = 60;
  const sx = px + 4;
  const sw = pw - 8;
  let ui = "";
  const t = (txt: string, tx: number, ty: number, size: number, weight: number, fill: string, anchor = "start") =>
    `<text x="${tx}" y="${ty}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(txt)}</text>`;
  const bar = (bx: number, by: number, bw: number, fill = "#e4e7eb", bh = 4) => `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="${bh / 2}" fill="${fill}"/>`;
  const top = py + 22;
  if (k === 0) {
    const cx = px + pw / 2;
    ui += t("Today", sx + 8, top + 8, 9, 700, "#1f2937") + t("Day 5", sx + sw - 8, top + 8, 6.5, 600, c1, "end");
    ui += `<circle cx="${cx}" cy="${top + 58}" r="30" fill="none" stroke="#e8edf2" stroke-width="9"/>`;
    ui += `<circle cx="${cx}" cy="${top + 58}" r="30" fill="none" stroke="${c1}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(188 * 0.72).toFixed(1)} 200" transform="rotate(-90 ${cx} ${top + 58})"/>`;
    ui += `<path d="M${cx - 14} ${top + 58}c4-8 24-8 28 0c-4 8-24 8-28 0z" fill="#fff" stroke="${c1}" stroke-width="2.2"/><circle cx="${cx}" cy="${top + 58}" r="4.2" fill="${c1}"/>`;
    ui += t("12:40 min", cx, top + 104, 8, 700, "#1f2937", "middle");
    ui += `<rect x="${sx + 10}" y="${top + 112}" width="${sw - 20}" height="18" rx="9" fill="${c1}"/>` + t("Start session", cx, top + 124, 7.5, 700, "#fff", "middle");
    for (let r = 0; r < 3; r++) {
      const ry = top + 142 + r * 21;
      ui += `<rect x="${sx + 8}" y="${ry}" width="${sw - 16}" height="17" rx="6" fill="#f3f6f9"/><circle cx="${sx + 18}" cy="${ry + 8.5}" r="4.5" fill="${c0}"/>` + bar(sx + 28, ry + 5, 34 - r * 6, "#cfd6de") + bar(sx + 28, ry + 11, 22, "#e1e6eb", 3);
    }
  } else if (k === 1) {
    ui += t("Progress", sx + 8, top + 8, 9, 700, "#1f2937");
    ui += `<rect x="${sx + 8}" y="${top + 18}" width="${sw - 16}" height="40" rx="9" fill="${c0}" opacity="0.18"/>`;
    ui += t("7", sx + 20, top + 46, 22, 800, c1) + t("day streak", sx + 34, top + 38, 7.5, 700, "#1f2937") + t("Best: 12 days", sx + 34, top + 48, 6.5, 500, "#6b7280");
    const hs = [0.5, 0.7, 0.45, 0.85, 0.65, 1, 0.8];
    hs.forEach((h, i) => {
      const bx = sx + 12 + i * 12.2;
      const bh = 52 * h;
      ui += `<rect x="${bx}" y="${top + 128 - bh}" width="8.4" height="${bh}" rx="3" fill="${i === 5 ? c1 : c0}" opacity="${i === 5 ? 1 : 0.6}"/>`;
      ui += t("MTWTFSS"[i], bx + 4.2, top + 138, 5.5, 600, "#9ca3af", "middle");
    });
    ui += `<rect x="${sx + 8}" y="${top + 148}" width="${sw / 2 - 11}" height="30" rx="8" fill="#f3f6f9"/><rect x="${sx + sw / 2 + 3}" y="${top + 148}" width="${sw / 2 - 11}" height="30" rx="8" fill="#f3f6f9"/>`;
    ui += t("86%", sx + 15, top + 164, 10, 800, c1) + bar(sx + 15, top + 169, 26) + t("42 min", sx + sw / 2 + 10, top + 164, 10, 800, c1) + bar(sx + sw / 2 + 10, top + 169, 26);
  } else if (k === 2) {
    ui += t("Reminders", sx + 8, top + 8, 9, 700, "#1f2937");
    const items: Array<[string, string]> = [["Morning", "8:00 AM"], ["Break", "11:30 AM"], ["Wind down", "9:00 PM"], ["Check-in", "Sunday"]];
    items.forEach(([a, b], i) => {
      const ry = top + 18 + i * 34;
      ui += `<rect x="${sx + 8}" y="${ry}" width="${sw - 16}" height="29" rx="8" fill="#f3f6f9"/><circle cx="${sx + 21}" cy="${ry + 14.5}" r="7" fill="${i % 2 ? c1 : c0}"/>`;
      ui += `<path d="M${sx + 18} ${ry + 14.5}l2.2 2.2 4-4.4" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;
      ui += t(a, sx + 33, ry + 12, 6.8, 700, "#1f2937") + t(b, sx + 33, ry + 22, 6, 500, "#6b7280");
      ui += `<rect x="${sx + sw - 30}" y="${ry + 9}" width="14" height="9" rx="4.5" fill="${i === 3 ? "#cfd6de" : c1}"/><circle cx="${sx + sw - 19.5 + (i === 3 ? -4 : 0)}" cy="${ry + 13.5}" r="3.4" fill="#fff"/>`;
    });
  } else {
    ui += t("Your plan", sx + 8, top + 8, 9, 700, "#1f2937");
    ["M", "T", "W", "T", "F"].forEach((d, i) => {
      const cx = sx + 17 + i * 18.5;
      ui += `<circle cx="${cx}" cy="${top + 30}" r="7.5" fill="${i < 3 ? c1 : "#eef1f5"}"/>` + t(d, cx, top + 32.6, 6.6, 700, i < 3 ? "#fff" : "#9ca3af", "middle");
    });
    const rows = [["Warm-up routine", "5 min"], ["Focus exercise", "8 min"], ["Cool down", "4 min"], ["Evening stretch", "6 min"]];
    rows.forEach(([a, b], i) => {
      const ry = top + 48 + i * 30;
      ui += `<rect x="${sx + 8}" y="${ry}" width="${sw - 16}" height="25" rx="7" fill="#f3f6f9"/>`;
      ui += `<circle cx="${sx + 20}" cy="${ry + 12.5}" r="6" fill="${i < 2 ? c1 : "none"}" stroke="${i < 2 ? c1 : "#cfd6de"}" stroke-width="1.5"/>`;
      if (i < 2) ui += `<path d="M${sx + 17.4} ${ry + 12.5}l2 2 3.4-3.6" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>`;
      ui += t(a, sx + 31, ry + 11, 6.8, 700, "#1f2937") + t(b, sx + 31, ry + 20, 6, 500, "#6b7280");
    });
  }
  return (
    `<g transform="translate(${x} ${y}) scale(${s.toFixed(4)})">` +
    `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="${c0}"/><stop offset="1" stop-color="${c1}"/></linearGradient><clipPath id="${id}c"><rect width="150" height="280" rx="12"/></clipPath><clipPath id="${id}s"><rect x="${sx}" y="${py + 4}" width="${sw}" height="280" rx="10"/></clipPath></defs>` +
    `<g clip-path="url(#${id}c)">` +
    `<rect width="150" height="280" fill="url(#${id})"/>` +
    `<circle cx="140" cy="20" r="46" fill="#fff" opacity="0.1"/><circle cx="8" cy="140" r="38" fill="#fff" opacity="0.07"/>` +
    t(cap[0], 75, 26, 11.5, 800, "#ffffff", "middle") +
    t(cap[1], 75, 41, 11.5, 800, "#ffffff", "middle") +
    `<rect x="${px}" y="${py}" width="${pw}" height="300" rx="14" fill="#101114"/>` +
    `<rect x="${sx}" y="${py + 4}" width="${sw}" height="300" rx="10.5" fill="#ffffff"/>` +
    `<rect x="${px + pw / 2 - 11}" y="${py + 8}" width="22" height="6" rx="3" fill="#101114"/>` +
    `<g clip-path="url(#${id}s)">${ui}</g>` +
    `</g></g>`
  );
}

/** Play logo mark: four colored facets of a right-pointing triangle. */
export function playMark(x: number, y: number, h: number): string {
  const W = h * 0.9;
  const H = h;
  const p = (a: number, b: number) => `${(x + a * W).toFixed(1)},${(y + b * H).toFixed(1)}`;
  return (
    `<polygon points="${p(0, 0)} ${p(0, 1)} ${p(0.55, 0.5)}" fill="#00a0ff"/>` +
    `<polygon points="${p(0, 0)} ${p(0.72, 0.36)} ${p(0.55, 0.5)}" fill="#00d26a"/>` +
    `<polygon points="${p(0, 1)} ${p(0.72, 0.64)} ${p(0.55, 0.5)}" fill="#ff3a44"/>` +
    `<polygon points="${p(0.55, 0.5)} ${p(0.72, 0.36)} ${p(1, 0.5)} ${p(0.72, 0.64)}" fill="#ffd400"/>`
  );
}
