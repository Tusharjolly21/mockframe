"use client";

/**
 * Shared App Store drawing helpers for the phone listing and the apps.apple.com
 * page: palette, squircle app icon, star row, glyphs and the portrait
 * "screenshot" tiles (gradient + caption + a mini phone with a believable UI).
 */

import { esc, textWidth, truncate, wrapText } from "../common";
import type { AppStoreDoc } from "../types";

/* -------------------------------- palette ----------------------------------- */

/** Neighbouring hues so a row of screenshots flows like a real store set. */
const PALETTES: Array<{ a: string; b: string; soft: string }> = [
  { a: "#8b5cf6", b: "#4f46e5", soft: "#ddd6fe" },
  { a: "#6366f1", b: "#0ea5e9", soft: "#c7d2fe" },
  { a: "#38bdf8", b: "#0d9488", soft: "#bae6fd" },
  { a: "#34d399", b: "#059669", soft: "#a7f3d0" },
  { a: "#fbbf24", b: "#ea580c", soft: "#fde68a" },
  { a: "#fb7185", b: "#be185d", soft: "#fecdd3" },
  { a: "#e879f9", b: "#7c3aed", soft: "#f5d0fe" },
];

export function paletteStart(doc: AppStoreDoc): number {
  let h = 0;
  for (const ch of doc.title) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  // the default app ("MockFrame") keeps the original violet icon
  return doc.title === "MockFrame" ? 0 : h % PALETTES.length;
}

export function palette(doc: AppStoreDoc, i = 0) {
  return PALETTES[(paletteStart(doc) + i) % PALETTES.length];
}

export function isGame(doc: AppStoreDoc): boolean {
  return /game|puzzle|arcade|action|adventure|racing|strategy|sport|casino|trivia|word|card|board/i.test(doc.category);
}

export function initialOf(doc: AppStoreDoc): string {
  return esc([...doc.title.trim()][0]?.toUpperCase() ?? "A");
}

export function theme(dark: boolean) {
  return dark
    ? {
        bg: "#000000",
        card: "#1c1c1e",
        ink: "#ffffff",
        sub: "rgba(235,235,245,0.6)",
        line: "rgba(84,84,88,0.65)",
        fill: "rgba(120,120,128,0.24)",
        blue: "#0a84ff",
      }
    : {
        bg: "#ffffff",
        card: "#f2f2f7",
        ink: "#000000",
        sub: "rgba(60,60,67,0.6)",
        line: "rgba(60,60,67,0.22)",
        fill: "rgba(120,120,128,0.12)",
        blue: "#007aff",
      };
}

/* --------------------------------- shapes ----------------------------------- */

/** iOS continuous-corner squircle path for a square of side s. */
export function squirclePath(x: number, y: number, s: number): string {
  const r = s * 0.2237;
  const k = r * 0.5523 * 1.12; // slightly flatter control points = continuous corner
  const x2 = x + s;
  const y2 = y + s;
  const f = (n: number) => n.toFixed(2);
  return (
    `M${f(x + r)} ${f(y)} H${f(x2 - r)} C${f(x2 - r + k)} ${f(y)} ${f(x2)} ${f(y + r - k)} ${f(x2)} ${f(y + r)} ` +
    `V${f(y2 - r)} C${f(x2)} ${f(y2 - r + k)} ${f(x2 - r + k)} ${f(y2)} ${f(x2 - r)} ${f(y2)} ` +
    `H${f(x + r)} C${f(x + r - k)} ${f(y2)} ${f(x)} ${f(y2 - r + k)} ${f(x)} ${f(y2 - r)} ` +
    `V${f(y + r)} C${f(x)} ${f(y + r - k)} ${f(x + r - k)} ${f(y)} ${f(x + r)} ${f(y)} Z`
  );
}

/** The app icon: the uploaded image, or a generated gradient tile with the initial. */
export function appIcon(
  doc: AppStoreDoc,
  avatarUrl: string | undefined,
  x: number,
  y: number,
  s: number,
  key: string,
  font: string,
  dark: boolean
): string {
  const p = palette(doc, 0);
  const path = squirclePath(x, y, s);
  const edge = dark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.1)";
  const body = avatarUrl
    ? `<image href="${avatarUrl}" x="${x}" y="${y}" width="${s}" height="${s}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${key}-clip)"/>`
    : `<path d="${path}" fill="url(#${key}-g)"/>` +
      `<g clip-path="url(#${key}-clip)"><circle cx="${x + s * 0.74}" cy="${y + s * 0.2}" r="${s * 0.36}" fill="#fff" opacity="0.15"/>` +
      `</g>` +
      `<text x="${x + s / 2}" y="${y + s * 0.67}" font-family="${font}" font-size="${s * 0.5}" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="${-s * 0.015}">${initialOf(doc)}</text>`;
  return (
    `<defs><clipPath id="${key}-clip"><path d="${path}"/></clipPath>` +
    `<linearGradient id="${key}-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.a}"/><stop offset="1" stop-color="${p.b}"/></linearGradient></defs>` +
    body +
    `<path d="${path}" fill="none" stroke="${edge}" stroke-width="0.8"/>`
  );
}

export function shareIcon(cx: number, cy: number, size: number, color: string, sw = 1.9): string {
  const s = size / 24;
  return (
    `<g transform="translate(${(cx - size / 2).toFixed(1)} ${(cy - size / 2).toFixed(1)}) scale(${s.toFixed(3)})" fill="none" stroke="${color}" stroke-width="${(sw / s).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="M8 9.5H6.5a2 2 0 0 0-2 2V19a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-7.5a2 2 0 0 0-2-2H16"/><path d="M12 15V3M8.2 6.6 12 2.8l3.8 3.8"/></g>`
  );
}

export function chevronLeft(x: number, cy: number, h: number, color: string, sw = 2.6): string {
  return `<path d="M${x + h * 0.55} ${cy - h / 2} l${-h * 0.55} ${h / 2} l${h * 0.55} ${h / 2}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

export function personGlyph(cx: number, cy: number, size: number, color: string): string {
  const s = size / 24;
  return `<g transform="translate(${(cx - size / 2).toFixed(1)} ${(cy - size / 2).toFixed(1)}) scale(${s.toFixed(3)})" fill="none" stroke="${color}" stroke-width="${(1.9 / s).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4.2"/><path d="M4 21c0-4.6 3.6-7.4 8-7.4s8 2.8 8 7.4"/></g>`;
}

/** Five stars filled to `rating` (half stars via a gradient). */
export function starRow(cx: number, cy: number, rating: number, size: number, color: string, key: string): string {
  const gap = size * 0.18;
  const total = 5 * size + 4 * gap;
  const r = Math.min(5, Math.max(0, rating));
  const stars = Array.from({ length: 5 }, (_, i) => {
    const sx = cx - total / 2 + i * (size + gap) + size / 2;
    const pts = Array.from({ length: 10 }, (_, k) => {
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const rr = (k % 2 ? 0.2 : 0.5) * size * (k % 2 ? 1.05 : 1);
      return `${(sx + Math.cos(a) * rr).toFixed(2)},${(cy + 0.04 * size + Math.sin(a) * rr).toFixed(2)}`;
    }).join(" ");
    const part = Math.min(1, Math.max(0, r - i));
    const fill = part >= 0.75 ? color : part >= 0.25 ? `url(#${key}-half)` : "none";
    return `<polygon points="${pts}" fill="${fill}" stroke="${color}" stroke-width="${Math.max(0.5, size * 0.07)}" stroke-linejoin="round"/>`;
  }).join("");
  return `<defs><linearGradient id="${key}-half" x1="0" x2="1"><stop offset="0.5" stop-color="${color}"/><stop offset="0.5" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>${stars}`;
}

export function appleLogo(x: number, y: number, size: number, color: string): string {
  const s = size / 24;
  return `<path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" fill="${color}" transform="translate(${x} ${y}) scale(${s.toFixed(3)})"/>`;
}

/* -------------------------------- copy -------------------------------------- */

export function asDescription(doc: AppStoreDoc): string {
  const sub = doc.subtitle.trim().replace(/[.!?]+$/, "");
  return `${sub ? sub + ". " : ""}${doc.title} makes it simple, fast and beautiful. Built by ${doc.developer} and rated ${doc.ratingValue.toFixed(1)} by ${doc.ratingCount} people, with new features every month.`;
}

export const WHATS_NEW =
  "Smoother exports, faster previews and a refreshed design. Plus bug fixes and performance improvements across the app.";

/** "No.1" chart footer, e.g. "in Design". */
export function chartFooter(doc: AppStoreDoc): string {
  return `in ${doc.category}`;
}

function captions(doc: AppStoreDoc): string[] {
  return [
    doc.subtitle || doc.title,
    "Everything in one place",
    `Rated ${doc.ratingValue.toFixed(1)} by ${doc.ratingCount} people`,
    "Free to start, upgrade anytime",
    `Made by ${doc.developer}`,
    "Works on all your devices",
  ];
}

/* ------------------------------ screenshots --------------------------------- */

/**
 * One portrait store screenshot (aspect ≈ 0.46): gradient, caption headline and
 * a mini phone whose UI varies by `i` (feed, grid, stats, player). The phone
 * runs off the bottom edge like real store art.
 */
export function appShot(o: {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  i: number;
  doc: AppStoreDoc;
  font: string;
}): string {
  const { id, x, y, w, h, i, doc, font } = o;
  const p = palette(doc, i);
  const rx = w * 0.09;
  const capSize = w * 0.098;
  const capLines = wrapText(captions(doc)[i % 6], capSize, w * 0.84).slice(0, 3);
  const capTop = y + w * 0.19;
  const capBottom = capTop + (capLines.length - 1) * capSize * 1.18;
  const pw = w * 0.78;
  const px = x + (w - pw) / 2;
  const py = Math.max(capBottom + w * 0.1, y + w * 0.5);
  const inset = pw * 0.026;
  const sx = px + inset;
  const sy = py + inset;
  const sw = pw - inset * 2;
  const sh = y + h - sy + 40; // runs past the bottom, clipped by the tile
  const u = sw / 100;
  const dark = i % 4 === 3;
  const scr = dark ? "#121216" : "#ffffff";
  const ink = dark ? "#f4f4f8" : "#1b1b22";
  const mute = dark ? "#2b2b33" : "#e6e6ee";
  const tint = dark ? p.a : p.soft;
  const cap = capLines
    .map((l, k) => `<tspan x="${(x + w / 2).toFixed(1)}" y="${(capTop + k * capSize * 1.18).toFixed(1)}">${esc(l)}</tspan>`)
    .join("");

  const bar = (bx: number, by: number, bw: number, bh: number, fill = mute, r = bh / 2) =>
    `<rect x="${(sx + bx * u).toFixed(1)}" y="${(sy + by * u).toFixed(1)}" width="${(bw * u).toFixed(1)}" height="${(bh * u).toFixed(1)}" rx="${(r * u).toFixed(1)}" fill="${fill}"/>`;
  const circ = (cx: number, cy: number, r: number, fill: string) =>
    `<circle cx="${(sx + cx * u).toFixed(1)}" cy="${(sy + cy * u).toFixed(1)}" r="${(r * u).toFixed(1)}" fill="${fill}"/>`;
  const txt = (tx: number, ty: number, size: number, s: string, fill = ink, weight = 700, anchor = "start") =>
    `<text x="${(sx + tx * u).toFixed(1)}" y="${(sy + ty * u).toFixed(1)}" font-family="${font}" font-size="${(size * u).toFixed(1)}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(s)}</text>`;

  let ui = "";
  if (i % 4 === 0) {
    // feed: title row, hero card, list rows
    ui += txt(7, 24, 8.5, truncate(doc.title, 8.5 * u, 70 * u), ink, 800);
    ui += circ(90, 20.5, 5.5, p.a);
    ui += `<rect x="${(sx + 7 * u).toFixed(1)}" y="${(sy + 32 * u).toFixed(1)}" width="${(86 * u).toFixed(1)}" height="${(44 * u).toFixed(1)}" rx="${(6 * u).toFixed(1)}" fill="url(#${id}-hero)"/>`;
    ui += bar(12, 40, 44, 5, "rgba(255,255,255,0.92)") + bar(12, 49, 30, 3.6, "rgba(255,255,255,0.6)");
    ui += `<rect x="${(sx + 12 * u).toFixed(1)}" y="${(sy + 61 * u).toFixed(1)}" width="${(22 * u).toFixed(1)}" height="${(8 * u).toFixed(1)}" rx="${(4 * u).toFixed(1)}" fill="#fff"/>`;
    ui += bar(8, 84, 28, 4.4, ink);
    for (let k = 0; k < 6; k++) {
      const ry = 94 + k * 15;
      ui += circ(14, ry + 4.5, 5.6, k % 2 ? p.a : p.b) + bar(24, ry, 44 - (k % 3) * 8, 4.4, ink === "#1b1b22" ? "#2c2c36" : "#eee") + bar(24, ry + 7, 30 - (k % 2) * 6, 3.4);
      ui += bar(78, ry + 1.5, 15, 6.4, tint, 3.2);
    }
  } else if (i % 4 === 1) {
    // grid: search pill + 2-column tiles
    ui += txt(7, 24, 10, "Library", ink, 800);
    ui += bar(7, 31, 86, 9, "#eeeef4", 4.5);
    for (let k = 0; k < 6; k++) {
      const col = k % 2;
      const row = Math.floor(k / 2);
      const tx = 7 + col * 44;
      const ty = 48 + row * 42;
      const pp = palette(doc, i + k);
      ui += `<rect x="${(sx + tx * u).toFixed(1)}" y="${(sy + ty * u).toFixed(1)}" width="${(42 * u).toFixed(1)}" height="${(30 * u).toFixed(1)}" rx="${(5 * u).toFixed(1)}" fill="url(#${id}-t${k % 3})"/>`;
      ui += bar(tx + 3, ty + 34, 26 - (k % 3) * 4, 3.6, "#2c2c36") + bar(tx + 3, ty + 39.5, 16, 2.8, "#c8c8d2");
      void pp;
    }
  } else if (i % 4 === 2) {
    // stats: big number, area chart, two cards
    ui += txt(7, 24, 8, "Overview", ink, 800);
    ui += txt(7, 44, 20, doc.ratingValue.toFixed(1), ink, 800);
    ui += bar(7, 49, 34, 3.6, "#c8c8d2");
    const pts = [78, 70, 74, 62, 66, 54, 58, 44, 50, 38];
    const line = pts.map((v, k) => `${(sx + (7 + (k * 86) / 9) * u).toFixed(1)},${(sy + v * u + 4 * u).toFixed(1)}`).join(" ");
    ui += `<polygon points="${(sx + 7 * u).toFixed(1)},${(sy + 100 * u).toFixed(1)} ${line} ${(sx + 93 * u).toFixed(1)},${(sy + 100 * u).toFixed(1)}" fill="url(#${id}-area)"/>`;
    ui += `<polyline points="${line}" fill="none" stroke="${p.b}" stroke-width="${(1.8 * u).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/>`;
    for (let k = 0; k < 2; k++) {
      ui += `<rect x="${(sx + (7 + k * 44) * u).toFixed(1)}" y="${(sy + 106 * u).toFixed(1)}" width="${(42 * u).toFixed(1)}" height="${(26 * u).toFixed(1)}" rx="${(5 * u).toFixed(1)}" fill="${k ? p.soft : "#eeeef4"}"/>`;
      ui += bar(11 + k * 44, 112, 14, 3.2, "#9a9aa8") + bar(11 + k * 44, 119, 26, 6, k ? p.b : "#2c2c36");
    }
    for (let k = 0; k < 4; k++) ui += circ(14, 146 + k * 14, 4.4, p.a) + bar(23, 143.5 + k * 14, 46 - k * 5, 4, "#2c2c36") + bar(80, 144 + k * 14, 13, 4, "#c8c8d2");
  } else {
    // player / detail on a dark screen: artwork, title, progress, controls
    ui += `<rect x="${(sx + 12 * u).toFixed(1)}" y="${(sy + 22 * u).toFixed(1)}" width="${(76 * u).toFixed(1)}" height="${(76 * u).toFixed(1)}" rx="${(8 * u).toFixed(1)}" fill="url(#${id}-art)"/>`;
    ui += circ(50, 52, 15, "rgba(255,255,255,0.22)") + circ(50, 52, 6.5, "rgba(255,255,255,0.9)");
    ui += txt(12, 112, 6.8, truncate(doc.title, 6.8 * u, 76 * u), ink, 800);
    ui += bar(12, 117, 36, 3.6, "#6b6b7a");
    ui += bar(12, 131, 76, 2.4, "#34343e") + bar(12, 131, 46, 2.4, p.a);
    ui += circ(30, 150, 5.2, "#34343e") + circ(50, 150, 8.4, "#ffffff") + circ(70, 150, 5.2, "#34343e");
    for (let k = 0; k < 3; k++) ui += circ(16, 172 + k * 14, 4.6, "#2f2f39") + bar(26, 169.5 + k * 14, 40 - k * 6, 4, "#3a3a45") + bar(26, 175.5 + k * 14, 24, 3, "#2c2c35");
  }

  return (
    `<defs>` +
    `<linearGradient id="${id}-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.a}"/><stop offset="1" stop-color="${p.b}"/></linearGradient>` +
    `<linearGradient id="${id}-hero" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.a}"/><stop offset="1" stop-color="${p.b}"/></linearGradient>` +
    `<linearGradient id="${id}-art" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.a}"/><stop offset="1" stop-color="${p.b}"/></linearGradient>` +
    `<linearGradient id="${id}-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.a}" stop-opacity="0.35"/><stop offset="1" stop-color="${p.a}" stop-opacity="0"/></linearGradient>` +
    [0, 1, 2].map((k) => `<linearGradient id="${id}-t${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${palette(doc, i + k).a}"/><stop offset="1" stop-color="${palette(doc, i + k).b}"/></linearGradient>`).join("") +
    `<clipPath id="${id}-tile"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"/></clipPath>` +
    `<clipPath id="${id}-scr"><rect x="${sx.toFixed(1)}" y="${sy.toFixed(1)}" width="${sw.toFixed(1)}" height="${sh.toFixed(1)}" rx="${(pw * 0.085).toFixed(1)}"/></clipPath>` +
    `</defs>` +
    `<g clip-path="url(#${id}-tile)">` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id}-bg)"/>` +
    `<circle cx="${x + w * 0.9}" cy="${y + w * 0.1}" r="${w * 0.5}" fill="#ffffff" opacity="0.1"/>` +
    `<text font-family="${font}" font-size="${capSize.toFixed(1)}" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="${(-capSize * 0.015).toFixed(2)}">${cap}</text>` +
    `<rect x="${px.toFixed(1)}" y="${py.toFixed(1)}" width="${pw.toFixed(1)}" height="${(sh + inset * 2).toFixed(1)}" rx="${(pw * 0.11).toFixed(1)}" fill="#0a0a0d"/>` +
    `<rect x="${(px + 0.8).toFixed(1)}" y="${(py + 0.8).toFixed(1)}" width="${(pw - 1.6).toFixed(1)}" height="${(sh + inset * 2).toFixed(1)}" rx="${(pw * 0.108).toFixed(1)}" fill="none" stroke="#3a3a42" stroke-width="0.8"/>` +
    `<g clip-path="url(#${id}-scr)"><rect x="${sx.toFixed(1)}" y="${sy.toFixed(1)}" width="${sw.toFixed(1)}" height="${sh.toFixed(1)}" fill="${scr}"/>${ui}` +
    `<rect x="${(sx + sw / 2 - 11 * u).toFixed(1)}" y="${(sy + 4 * u).toFixed(1)}" width="${(22 * u).toFixed(1)}" height="${(6.4 * u).toFixed(1)}" rx="${(3.2 * u).toFixed(1)}" fill="#0a0a0d"/></g>` +
    `</g>`
  );
}

export { textWidth };
