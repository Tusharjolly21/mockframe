"use client";

import { esc, homeIndicator, initials, SH, statusBar, SW, textWidth, wrapText } from "./common";
import { fontFor } from "./fonts";
import type { DatingBrand, DatingDoc } from "./types";

/**
 * Tinder / Bumble discovery card — one renderer, per-brand chrome (like the
 * social generators). Full-bleed profile photo (uploaded or a gradient
 * placeholder), a bottom gradient scrim carrying name·age·job·distance·bio +
 * interest chips, and the brand's swipe-action button row. §15.
 */

const CARD_X = 12;
const CARD_Y = 104;
const CARD_W = SW - 24;
const CARD_H = 588;
const CARD_B = CARD_Y + CARD_H; // 692

interface Btn {
  cx: number;
  r: number;
  icon: (cx: number, cy: number, r: number, color: string) => string;
  color: string;
}

interface BrandCfg {
  grad: [string, string];
  wordmark: string;
  buttons: Btn[];
}

const BRANDS: Record<DatingBrand, BrandCfg> = {
  tinder: {
    grad: ["#fd267a", "#ff6036"],
    wordmark: "tinder",
    buttons: [
      { cx: 52, r: 22, icon: rewindIcon, color: "#ffb02e" },
      { cx: 118, r: 30, icon: xIcon, color: "#fe3c72" },
      { cx: 201, r: 25, icon: starIcon, color: "#1fb6ff" },
      { cx: 284, r: 30, icon: heartIcon, color: "#00e2a0" },
      { cx: 350, r: 22, icon: boltIcon, color: "#9c4dff" },
    ],
  },
  bumble: {
    grad: ["#ffce34", "#ffab00"],
    wordmark: "bumble",
    buttons: [
      { cx: 66, r: 24, icon: rewindIcon, color: "#f0a500" },
      { cx: 150, r: 32, icon: xIcon, color: "#3a3a3a" },
      { cx: 236, r: 26, icon: starIcon, color: "#ffb800" },
      { cx: 330, r: 32, icon: heartIcon, color: "#f5b500" },
    ],
  },
};

export function renderDating(doc: DatingDoc, photoUrl?: string): string {
  const platform = doc.chrome.platform ?? "ios";
  const font = fontFor("dating", platform);
  const dark = !!doc.chrome.dark;
  const cfg = BRANDS[doc.brand];
  const pageBg = dark ? "#0d0d0f" : "#ffffff";
  const parts: string[] = [`<rect width="${SW}" height="${SH}" fill="${pageBg}"/>`];

  const barColor = dark ? "#f2f2f2" : "#111111";
  parts.push(statusBar({ time: doc.chrome.time, battery: doc.chrome.battery, color: barColor, platform }));

  /* header: brand wordmark + tabs */
  parts.push(brandHeader(doc.brand, cfg));

  /* card */
  const clip = `dcard`;
  parts.push(`<defs><clipPath id="${clip}"><rect x="${CARD_X}" y="${CARD_Y}" width="${CARD_W}" height="${CARD_H}" rx="18"/></clipPath></defs>`);
  parts.push(`<g clip-path="url(#${clip})">`);

  // photo or gradient placeholder
  if (photoUrl) {
    parts.push(
      `<image href="${photoUrl}" x="${CARD_X}" y="${CARD_Y}" width="${CARD_W}" height="${CARD_H}" preserveAspectRatio="xMidYMid slice"/>`
    );
  } else {
    let h = 0;
    for (const ch of doc.name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const hue = h % 360;
    parts.push(
      `<defs><linearGradient id="dph" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 62% 58%)"/><stop offset="1" stop-color="hsl(${(hue + 40) % 360} 60% 42%)"/></linearGradient></defs>`,
      `<rect x="${CARD_X}" y="${CARD_Y}" width="${CARD_W}" height="${CARD_H}" fill="url(#dph)"/>`,
      `<text font-family="${font}" font-size="150" font-weight="800" fill="rgba(255,255,255,0.22)" text-anchor="middle" x="${SW / 2}" y="${CARD_Y + 300}">${esc(initials(doc.name))}</text>`
    );
  }

  // photo-count segments at the top of the card
  const SEG = 3;
  const gap = 4;
  const segW = (CARD_W - 28 - gap * (SEG - 1)) / SEG;
  for (let i = 0; i < SEG; i++) {
    parts.push(
      `<rect x="${CARD_X + 14 + i * (segW + gap)}" y="${CARD_Y + 12}" width="${segW.toFixed(1)}" height="3.5" rx="1.75" fill="${i === 0 ? "#ffffff" : "rgba(255,255,255,0.4)"}"/>`
    );
  }

  // bottom scrim
  parts.push(
    `<defs><linearGradient id="dscrim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(0,0,0,0)"/><stop offset="1" stop-color="rgba(0,0,0,0.82)"/></linearGradient></defs>`,
    `<rect x="${CARD_X}" y="${CARD_B - 240}" width="${CARD_W}" height="240" fill="url(#dscrim)"/>`
  );

  // profile text on the scrim
  const px = CARD_X + 20;
  let ty = CARD_B - 120;
  const nameStr = `${esc(doc.name)}`;
  parts.push(
    `<text font-family="${font}" font-size="29" font-weight="800" fill="#ffffff" x="${px}" y="${ty}">${nameStr}<tspan font-size="26" font-weight="400"> ${doc.age}</tspan></text>`
  );
  const nx = px + textWidth(doc.name, 29) + textWidth(` ${doc.age}`, 26) + 12;
  if (doc.verified) {
    parts.push(verifiedBadge(nx, ty - 9));
  }
  ty += 26;
  // job · distance line
  const meta: string[] = [];
  if (doc.job) meta.push(doc.job);
  if (doc.distance) meta.push(doc.distance);
  if (meta.length) {
    parts.push(
      `<circle cx="${px + 5}" cy="${ty - 5}" r="1.5" fill="none"/>`,
      briefcase(px, ty - 11),
      `<text font-family="${font}" font-size="14.5" fill="rgba(255,255,255,0.94)" x="${px + 24}" y="${ty}">${esc(meta.join("  ·  "))}</text>`
    );
    ty += 22;
  }
  // bio (one wrapped line, truncated)
  if (doc.bio) {
    const bioLines = wrapText(doc.bio, 14, CARD_W - 40).slice(0, 2);
    bioLines.forEach((l, i) =>
      parts.push(`<text font-family="${font}" font-size="14" fill="rgba(255,255,255,0.86)" x="${px}" y="${ty + i * 19}">${esc(l)}</text>`)
    );
    ty += bioLines.length * 19 + 6;
  }
  // interest chips
  if (doc.interests?.length) {
    let cx = px;
    for (const it of doc.interests.slice(0, 4)) {
      const cw = textWidth(it, 12.5) + 24;
      if (cx + cw > CARD_X + CARD_W - 16) break;
      parts.push(
        `<rect x="${cx}" y="${ty - 12}" width="${cw.toFixed(0)}" height="26" rx="13" fill="rgba(255,255,255,0.22)" stroke="rgba(255,255,255,0.5)" stroke-width="1"/>`,
        `<text font-family="${font}" font-size="12.5" font-weight="600" fill="#ffffff" x="${cx + 12}" y="${ty + 4}">${esc(it)}</text>`
      );
      cx += cw + 8;
    }
  }

  parts.push(`</g>`); // end card clip
  // subtle card border
  parts.push(`<rect x="${CARD_X}" y="${CARD_Y}" width="${CARD_W}" height="${CARD_H}" rx="18" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="1"/>`);

  /* action buttons */
  const by = CARD_B + 52;
  for (const b of cfg.buttons) {
    parts.push(
      `<circle cx="${b.cx}" cy="${by}" r="${b.r}" fill="${dark ? "#1c1c1e" : "#ffffff"}" style="filter:drop-shadow(0 4px 12px rgba(0,0,0,0.16))"/>`,
      b.icon(b.cx, by, b.r, b.color)
    );
  }

  parts.push(homeIndicator(barColor, platform));
  return parts.join("\n");
}

/* ------------------------------- header -------------------------------------- */

function brandHeader(brand: DatingBrand, cfg: BrandCfg): string {
  const y = 78;
  if (brand === "tinder") {
    return (
      `<defs><linearGradient id="tflame" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${cfg.grad[0]}"/><stop offset="1" stop-color="${cfg.grad[1]}"/></linearGradient></defs>` +
      flameIcon(SW / 2 - 44, y - 12, "url(#tflame)") +
      `<text font-family="'Helvetica Neue',Arial,sans-serif" font-size="24" font-weight="800" fill="url(#tflame)" x="${SW / 2 - 26}" y="${y + 5}">tinder</text>`
    );
  }
  // bumble
  return (
    `<text font-family="'Helvetica Neue',Arial,sans-serif" font-size="24" font-weight="800" fill="#f5b500" text-anchor="middle" x="${SW / 2}" y="${y + 5}">bumble</text>` +
    `<circle cx="${SW / 2 + 58}" cy="${y - 4}" r="5" fill="#f5b500"/>`
  );
}

function flameIcon(x: number, y: number, fill: string): string {
  return `<path d="M${x + 9} ${y} c 3 5 -2 7 -1 12 c 0.5 2.5 3 4 5 4 c 3.5 0 6 -2.6 6 -6 c 0 -4 -3 -6 -2.5 -11 c -2 2 -3 3.5 -3.5 6 c -1.5 -1.5 -2 -3.5 -4 -5 Z" fill="${fill}"/>`;
}

/* ------------------------------- small icons --------------------------------- */

function verifiedBadge(x: number, y: number): string {
  return `<circle cx="${x + 9}" cy="${y + 9}" r="9" fill="#39a1ff"/><path d="M${x + 5} ${y + 9.5} l3 3 5 -6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function briefcase(x: number, y: number): string {
  return `<rect x="${x}" y="${y + 4}" width="18" height="12" rx="2.5" fill="none" stroke="rgba(255,255,255,0.94)" stroke-width="1.7"/><path d="M${x + 6} ${y + 4} v-2 a2 2 0 0 1 2 -2 h2 a2 2 0 0 1 2 2 v2" fill="none" stroke="rgba(255,255,255,0.94)" stroke-width="1.7"/>`;
}

/* -------------------------- action-button icons ------------------------------ */

function heartIcon(cx: number, cy: number, r: number, color: string): string {
  const s = r * 0.5;
  return `<path d="M${cx} ${cy + s * 0.9} C ${cx - s * 2} ${cy - s * 0.6} ${cx - s} ${cy - s * 1.7} ${cx} ${cy - s * 0.5} C ${cx + s} ${cy - s * 1.7} ${cx + s * 2} ${cy - s * 0.6} ${cx} ${cy + s * 0.9} Z" fill="${color}"/>`;
}
function xIcon(cx: number, cy: number, r: number, color: string): string {
  const s = r * 0.42;
  return `<path d="M${cx - s} ${cy - s} L${cx + s} ${cy + s} M${cx + s} ${cy - s} L${cx - s} ${cy + s}" stroke="${color}" stroke-width="${(r * 0.24).toFixed(1)}" stroke-linecap="round"/>`;
}
function starIcon(cx: number, cy: number, r: number, color: string): string {
  const R = r * 0.55;
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? R * 0.44 : R;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + Math.cos(a) * rad).toFixed(1)},${(cy + Math.sin(a) * rad).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(" ")}" fill="${color}"/>`;
}
function boltIcon(cx: number, cy: number, r: number, color: string): string {
  const s = r * 0.6;
  return `<path d="M${cx + s * 0.25} ${cy - s} L${cx - s * 0.55} ${cy + s * 0.12} L${cx - s * 0.02} ${cy + s * 0.12} L${cx - s * 0.25} ${cy + s} L${cx + s * 0.55} ${cy - s * 0.12} L${cx + s * 0.02} ${cy - s * 0.12} Z" fill="${color}"/>`;
}
function rewindIcon(cx: number, cy: number, r: number, color: string): string {
  const s = r * 0.5;
  const w = (r * 0.22).toFixed(1);
  return (
    `<path d="M${cx + s} ${cy} a ${s} ${s} 0 1 1 -${s} -${s}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>` +
    `<path d="M${cx} ${cy - s * 1.7} L${cx} ${cy - s} L${cx + s * 0.75} ${cy - s}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`
  );
}
