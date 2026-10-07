"use client";

import { esc, systemFont, truncate } from "./common";
import type { SpotifyDoc } from "./types";

/* Spotify "Now Playing". The card is tinted from the album art, the way the
   real player is; with no uploaded cover the art is generated from the song
   title, so every song gets its own palette. */

const W = 402;
const CARD_X = 14;
const CARD_W = W - CARD_X * 2;
const CARD_H = 660;
const GREEN = "#1ed760";

const PALETTES: Array<[string, string, string]> = [
  ["#7c3aed", "#ec4899", "#f59e0b"],
  ["#0ea5e9", "#6366f1", "#a855f7"],
  ["#f43f5e", "#fb923c", "#facc15"],
  ["#10b981", "#06b6d4", "#3b82f6"],
  ["#8b5cf6", "#22d3ee", "#f0abfc"],
  ["#ef4444", "#7c2d12", "#fbbf24"],
];

function hash(s: string): number {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.codePointAt(0)!, 16777619);
  return h >>> 0;
}

function darken(hex: string, t: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.round(v * (1 - t)).toString(16).padStart(2, "0");
  return `#${ch(n >> 16)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}

export function spotifyCardSize(doc: SpotifyDoc): { width: number; height: number } {
  return { width: W, height: CARD_H + 28 };
}

/** Generated cover art: a gradient field, a sun, and layered waves. */
function coverArt(x: number, y: number, s: number, pal: [string, string, string], seed: number): string {
  const sx = x + s * (0.3 + (seed % 40) / 100);
  const wave = (base: number, amp: number, phase: number) => {
    let d = `M${x} ${y + s * base}`;
    for (let i = 0; i <= 4; i++) {
      const px = x + (s / 4) * i;
      const py = y + s * base + Math.sin(i * 1.7 + phase) * s * amp;
      d += ` Q${(px - s / 8).toFixed(1)} ${(py - s * amp).toFixed(1)} ${px.toFixed(1)} ${py.toFixed(1)}`;
    }
    return `${d} L${x + s} ${y + s} L${x} ${y + s} Z`;
  };
  return `
<defs>
  <linearGradient id="sp-art" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal[0]}"/><stop offset="0.55" stop-color="${pal[1]}"/><stop offset="1" stop-color="${pal[2]}"/></linearGradient>
  <radialGradient id="sp-sun" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff7d6"/><stop offset="0.6" stop-color="#ffe08a"/><stop offset="1" stop-color="#ffe08a" stop-opacity="0"/></radialGradient>
</defs>
<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="url(#sp-art)"/>
<circle cx="${sx}" cy="${y + s * 0.42}" r="${s * 0.26}" fill="url(#sp-sun)" opacity="0.9"/>
<circle cx="${sx}" cy="${y + s * 0.42}" r="${s * 0.13}" fill="#fff8e1"/>
<path d="${wave(0.62, 0.05, seed % 7)}" fill="${darken(pal[1], 0.25)}" opacity="0.75"/>
<path d="${wave(0.74, 0.045, (seed >> 3) % 7)}" fill="${darken(pal[0], 0.35)}" opacity="0.85"/>
<path d="${wave(0.86, 0.035, (seed >> 5) % 7)}" fill="${darken(pal[0], 0.6)}"/>
<text x="${x + 18}" y="${y + 34}" font-family="Georgia,'Times New Roman',serif" font-size="${s * 0.07}" font-style="italic" fill="#ffffff" opacity="0.9">Vol. ${(seed % 9) + 1}</text>`;
}

function player(doc: SpotifyDoc, x: number, y: number, cardH: number, artUrl: string | undefined, dark: boolean): string {
  const font = systemFont("ios");
  const seed = hash(`${doc.title}|${doc.artist}`);
  const pal = PALETTES[seed % PALETTES.length];
  const ink = dark ? "#ffffff" : "#121212";
  const sub = dark ? "rgba(255,255,255,0.68)" : "rgba(0,0,0,0.55)";
  const top = dark ? darken(pal[0], 0.35) : "#ffffff";
  const bottom = dark ? "#121212" : "#f3f0f7";
  const art = CARD_W - 52;
  const ax = x + 26;
  const ay = y + 70;
  const ty = ay + art + 40;
  const pct = Math.min(100, Math.max(0, doc.progressPercent)) / 100;
  const barW = CARD_W - 52;
  const by = ty + 46;
  const cy = by + 62;
  const cx = x + CARD_W / 2;
  const playing = doc.isPlaying !== false;
  const icon = (d: string, tx: number, ty2: number, size: number, fill: string) =>
    `<path d="${d}" fill="${fill}" transform="translate(${(tx - size / 2).toFixed(1)} ${(ty2 - size / 2).toFixed(1)}) scale(${(size / 24).toFixed(3)})"/>`;
  const PREV = "M6 5h2.4v14H6zM9.2 12 19 5v14z";
  const NEXT = "M15.6 5H18v14h-2.4zM5 5l9.8 7L5 19z";
  const SHUF = "M17 3l4 4-4 4V8.5h-2.2c-1 0-1.9.5-2.5 1.3L7.6 16.4A4.6 4.6 0 0 1 3.9 18.3H2v-2h1.9c.9 0 1.7-.4 2.2-1.2L10.8 8.6a4.6 4.6 0 0 1 3.9-2.1H17zM2 6.4h1.9c1.5 0 2.9.7 3.8 1.9l.5.7-1.2 1.7-.9-1.3A2.6 2.6 0 0 0 3.9 8.4H2zm15 8.1v-2.2l4 4-4 4v-2.2h-2.2c-1.5 0-2.9-.7-3.8-1.9l-.5-.7 1.2-1.7.9 1.3c.5.7 1.3 1.2 2.2 1.2z";
  const REP = "M7 7h10v3l4-4-4-4v3H5v6h2zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2z";
  return `
<defs>
  <linearGradient id="sp-card" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="0.75" stop-color="${bottom}"/></linearGradient>
  <filter id="sp-sh" x="-20%" y="-10%" width="140%" height="130%"><feDropShadow dx="0" dy="16" stdDeviation="16" flood-color="#000000" flood-opacity="${dark ? 0.45 : 0.18}"/></filter>
  <filter id="sp-art-sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#000000" flood-opacity="0.4"/></filter>
  <clipPath id="sp-art-clip"><rect x="${ax}" y="${ay}" width="${art}" height="${art}" rx="14"/></clipPath>
</defs>
<rect x="${x}" y="${y}" width="${CARD_W}" height="${cardH}" rx="30" fill="url(#sp-card)" filter="url(#sp-sh)"/>
<rect x="${x + 0.5}" y="${y + 0.5}" width="${CARD_W - 1}" height="${cardH - 1}" rx="29.5" fill="none" stroke="${dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}"/>
<path d="M${x + 26} ${y + 34} l7 7 7 -7" fill="none" stroke="${ink}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
<text x="${cx}" y="${y + 33}" font-family="${font}" font-size="10.5" font-weight="700" fill="${sub}" text-anchor="middle" letter-spacing="1.1">PLAYING FROM ALBUM</text>
<text x="${cx}" y="${y + 50}" font-family="${font}" font-size="13.5" font-weight="700" fill="${ink}" text-anchor="middle">${esc(truncate(doc.album, 13.5, CARD_W - 120))}</text>
<g fill="${ink}"><circle cx="${x + CARD_W - 40}" cy="${y + 38}" r="2"/><circle cx="${x + CARD_W - 33}" cy="${y + 38}" r="2"/><circle cx="${x + CARD_W - 26}" cy="${y + 38}" r="2"/></g>
<g filter="url(#sp-art-sh)"><rect x="${ax}" y="${ay}" width="${art}" height="${art}" rx="14" fill="${pal[0]}"/></g>
<g clip-path="url(#sp-art-clip)">${artUrl ? `<image href="${artUrl}" x="${ax}" y="${ay}" width="${art}" height="${art}" preserveAspectRatio="xMidYMid slice"/>` : coverArt(ax, ay, art, pal, seed)}</g>
<text x="${ax}" y="${ty}" font-family="${font}" font-size="23" font-weight="750" fill="${ink}" letter-spacing="-0.4">${esc(truncate(doc.title, 23, barW - 40))}</text>
<text x="${ax}" y="${ty + 23}" font-family="${font}" font-size="15.5" fill="${sub}">${esc(truncate(doc.artist, 15.5, barW - 40))}</text>
<circle cx="${ax + barW - 13}" cy="${ty - 2}" r="13" fill="${GREEN}"/>
<path d="M${ax + barW - 19} ${ty - 2.5} l4.2 4.2 8 -8" fill="none" stroke="#000000" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
<rect x="${ax}" y="${by}" width="${barW}" height="4" rx="2" fill="${dark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.12)"}"/>
<rect x="${ax}" y="${by}" width="${(barW * pct).toFixed(1)}" height="4" rx="2" fill="${ink}"/>
<circle cx="${(ax + barW * pct).toFixed(1)}" cy="${by + 2}" r="6.5" fill="${ink}"/>
<text x="${ax}" y="${by + 22}" font-family="${font}" font-size="11.5" fill="${sub}">${esc(doc.timeElapsed)}</text>
<text x="${ax + barW}" y="${by + 22}" font-family="${font}" font-size="11.5" fill="${sub}" text-anchor="end">${esc(doc.timeTotal.startsWith("-") ? doc.timeTotal : `-${doc.timeTotal}`)}</text>
${icon(SHUF, ax + 12, cy, 23, GREEN)}
<circle cx="${ax + 12}" cy="${cy + 17}" r="2" fill="${GREEN}"/>
${icon(PREV, cx - 76, cy, 34, ink)}
<circle cx="${cx}" cy="${cy}" r="33" fill="${ink}"/>
${playing
    ? `<rect x="${cx - 9.5}" y="${cy - 11}" width="6.5" height="22" rx="1.8" fill="${dark ? "#000000" : "#ffffff"}"/><rect x="${cx + 3}" y="${cy - 11}" width="6.5" height="22" rx="1.8" fill="${dark ? "#000000" : "#ffffff"}"/>`
    : `<path d="M${cx - 7} ${cy - 13} L${cx + 13} ${cy} L${cx - 7} ${cy + 13} Z" fill="${dark ? "#000000" : "#ffffff"}" stroke="${dark ? "#000000" : "#ffffff"}" stroke-width="2" stroke-linejoin="round"/>`}
${icon(NEXT, cx + 76, cy, 34, ink)}
${icon(REP, ax + barW - 12, cy, 23, sub)}
<g transform="translate(${ax} ${y + cardH - 34})">
  <rect x="0" y="-7" width="13" height="17" rx="2.5" fill="none" stroke="${GREEN}" stroke-width="1.8"/>
  <circle cx="6.5" cy="5" r="2.4" fill="${GREEN}"/>
  <text x="21" y="6" font-family="${font}" font-size="12.5" font-weight="650" fill="${GREEN}">Listening on AirPods Pro</text>
</g>
<g transform="translate(${ax + barW - 48} ${y + cardH - 43})" fill="none" stroke="${ink}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
  <path d="M3 9v8h12V9M9 3v10M5.5 6.5 9 3l3.5 3.5"/><path d="M26 5h10M26 11h10M26 17h6M22 5h.01M22 11h.01M22 17h.01"/>
</g>`;
}

export function renderSpotify(doc: SpotifyDoc, avatarUrl?: string): string {
  const dark = doc.dark !== false;
  if (doc.standalone) return player(doc, CARD_X, 14, CARD_H, avatarUrl, dark);

  // inside a phone: the full-screen player, tinted from the art
  const H = 874;
  const seed = hash(`${doc.title}|${doc.artist}`);
  const pal = PALETTES[seed % PALETTES.length];
  return `
<defs><linearGradient id="sp-screen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${dark ? darken(pal[0], 0.4) : "#ffffff"}"/><stop offset="0.7" stop-color="${dark ? "#121212" : "#f3f0f7"}"/></linearGradient></defs>
<rect width="${W}" height="${H}" fill="url(#sp-screen)"/>
${player(doc, CARD_X, 110, 680, avatarUrl, dark)}
<rect x="${W / 2 - 67}" y="857" width="134" height="5" rx="2.5" fill="${dark ? "#ffffff" : "#121212"}" opacity="0.5"/>`;
}
