"use client";

import { WEB_H, WEB_W } from "../webPage";
import { ANDROID_FONT, avatar, esc, glyph, textBlock, truncate, wrapText } from "../common";
import type { GooglePlayDoc } from "../types";
import { ARROW_FWD, BOOKMARK_ADD, SHARE, STAR, SHOT_RATIO, appIcon, blurb, clampLines, playMark, playShot, playTheme } from "./gp-shots";

/* play.google.com/store/apps/details: nav bar, app header with stats and
   install, a screenshot carousel, About this app, and the right-hand rail with
   similar apps and developer contact. */

const FONT = ANDROID_FONT;
const L = 124;
const MAIN_W = 804;
const RAIL_X = 984;
const RAIL_W = 332;

const SEARCH = "M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z";
const HELP = "M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z";

function nav(dark: boolean): string {
  const th = playTheme(dark);
  const mutedLogo = dark ? "#e3e3e3" : "#5f6368";
  let out = `<rect width="${WEB_W}" height="64" fill="${th.bg}"/><rect y="63" width="${WEB_W}" height="1" fill="${th.line}"/>`;
  out += playMark(24, 19, 26);
  out += `<text x="58" y="40" font-family="${FONT}" font-size="22" font-weight="500" fill="${mutedLogo}" letter-spacing="-0.2">Google Play</text>`;
  const tabs = ["Games", "Apps", "Movies", "Books"];
  let x = 212;
  tabs.forEach((t, i) => {
    const w = t.length * 9 + 40;
    const sel = i === 1;
    out += `<text x="${x + w / 2}" y="38" font-family="${FONT}" font-size="14.5" font-weight="500" fill="${sel ? th.green : th.sub}" text-anchor="middle">${t}</text>`;
    if (sel) out += `<rect x="${x + w / 2 - 20}" y="58" width="40" height="3.5" rx="1.75" fill="${th.green}"/>`;
    x += w;
  });
  out += glyph(SEARCH, WEB_W - 176, 32, 24, th.sub) + glyph(HELP, WEB_W - 130, 32, 24, th.sub);
  const dots = [0, 1, 2].flatMap((i) => [0, 1, 2].map((j) => `<circle cx="${WEB_W - 94 + j * 6.4}" cy="${27 + i * 6.4}" r="1.8" fill="${th.sub}"/>`)).join("");
  out += dots + avatar("Alex Rivera", WEB_W - 36, 32, 16, "gp-acct");
  return out;
}

export function renderGooglePlayWeb(doc: GooglePlayDoc, avatarUrl?: string, lookupUrl?: (id: string) => string | undefined): string {
  void lookupUrl;
  const dark = !!doc.dark || !!doc.chrome.dark;
  const th = playTheme(dark);
  const { ink, sub, line, green } = th;
  let out = `<rect width="${WEB_W}" height="${WEB_H}" fill="${th.bg}"/>`;

  // ---- header
  const iy = 100;
  const icon = 120;
  const tx = L + icon + 32;
  const titleLines = wrapText(doc.title, 36, MAIN_W - icon - 32).slice(0, 2);
  out += appIcon("gpw", L, iy, icon, doc.title, avatarUrl, FONT, ink);
  const t0 = iy + 38;
  out += textBlock(titleLines, { font: FONT, x: tx, y: t0, size: 36, lineHeight: 42, color: ink, weight: 500 });
  const devY = t0 + (titleLines.length - 1) * 42 + 36;
  out += `<text x="${tx}" y="${devY}" font-family="${FONT}" font-size="15" font-weight="500" fill="${green}">${esc(truncate(doc.developer, 15, 420))}</text>`;
  out += `<text x="${tx}" y="${devY + 24}" font-family="${FONT}" font-size="13" fill="${sub}">Contains ads · In-app purchases</text>`;

  // ---- stats row
  const sy = Math.max(iy + icon + 44, devY + 24 + 44);
  const rating = Math.min(5, Math.max(0, doc.ratingValue)).toFixed(1);
  const age = (doc.contentRating.match(/\d+\+?/)?.[0] ?? "3+").replace(/^(\d+)$/, "$1+");
  const cols = [
    { top: rating, extra: "star", bottom: doc.ratingCount },
    { top: "1M+", bottom: "Downloads" },
    { top: doc.appSize, bottom: "Size" },
    { top: age, box: true, bottom: doc.contentRating },
  ];
  const cw = 168;
  cols.forEach((c, i) => {
    const cx = L + i * cw + cw / 2;
    if (i > 0) out += `<rect x="${L + i * cw}" y="${sy - 20}" width="1" height="46" fill="${line}"/>`;
    if (c.box) {
      out += `<rect x="${cx - 12}" y="${sy - 18}" width="24" height="21" rx="4" fill="none" stroke="${ink}" stroke-width="1.6"/><text x="${cx}" y="${sy - 2.5}" font-family="${FONT}" font-size="11.5" font-weight="700" fill="${ink}" text-anchor="middle">${esc(c.top)}</text>`;
    } else {
      out += `<text x="${cx}" y="${sy}" font-family="${FONT}" font-size="16" font-weight="500" fill="${ink}" text-anchor="middle">${esc(c.top)}</text>`;
      if (c.extra) out += glyph(STAR, cx + (c.top.length * 9.6) / 2 + 10, sy - 6, 14, ink);
    }
    out += `<text x="${cx}" y="${sy + 21}" font-family="${FONT}" font-size="12.5" fill="${sub}" text-anchor="middle">${esc(truncate(c.bottom, 12.5, cw - 16))}</text>`;
  });

  // ---- buttons
  const by = sy + 52;
  out += `<rect x="${L}" y="${by}" width="150" height="40" rx="20" fill="${green}"/><text x="${L + 75}" y="${by + 25.5}" font-family="${FONT}" font-size="14.5" font-weight="500" fill="${th.onGreen}" text-anchor="middle">Install</text>`;
  out += `<rect x="${L + 166}" y="${by}" width="176" height="40" rx="20" fill="none" stroke="${line}"/>` + glyph(BOOKMARK_ADD, L + 166 + 28, by + 20, 20, green) + `<text x="${L + 166 + 46}" y="${by + 25.5}" font-family="${FONT}" font-size="14" font-weight="500" fill="${green}">Add to wishlist</text>`;
  out += glyph(SHARE, L + 372, by + 20, 20, green) + `<text x="${L + 390}" y="${by + 25.5}" font-family="${FONT}" font-size="14" font-weight="500" fill="${green}">Share</text>`;

  // ---- screenshots (clipped to the main column, with the carousel arrow)
  const shotW = 156;
  const shotH = shotW * SHOT_RATIO;
  const shy = by + 40 + 32;
  let shots = "";
  for (let i = 0; i < 6; i++) shots += playShot(i, L + i * (shotW + 12), shy, shotW, FONT);
  out += `<defs><clipPath id="gpw-shots"><rect x="${L}" y="${shy - 4}" width="${MAIN_W}" height="${shotH + 8}"/></clipPath></defs><g clip-path="url(#gpw-shots)">${shots}</g>`;
  const ax = L + MAIN_W - 28;
  out += `<g style="filter:drop-shadow(0 1px 4px rgba(0,0,0,0.35))"><circle cx="${ax}" cy="${shy + shotH / 2}" r="20" fill="${dark ? "#2b2c2e" : "#ffffff"}"/></g>` + glyph(ARROW_FWD, ax, shy + shotH / 2, 22, ink);

  // ---- About this app
  let y = shy + shotH + 48;
  out += `<text x="${L}" y="${y}" font-family="${FONT}" font-size="22" font-weight="400" fill="${ink}">About this app</text>` + glyph(ARROW_FWD, L + 164, y - 7, 22, ink);
  const desc = clampLines(blurb(doc.title), 14, MAIN_W, 3);
  out += textBlock(desc, { font: FONT, x: L, y: y + 28, size: 14, lineHeight: 21, color: sub });
  y += 28 + desc.length * 21 + 6;
  out += `<text x="${L}" y="${y + 6}" font-family="${FONT}" font-size="13" fill="${sub}">Updated on</text><text x="${L}" y="${y + 24}" font-family="${FONT}" font-size="14" fill="${ink}">Sep 12, 2026</text>`;
  const chips = ["Health & Fitness", "#3 top free in health"];
  let cx = L + 170;
  for (const c of chips) {
    const w = c.length * 7.2 + 28;
    out += `<rect x="${cx}" y="${y + 4}" width="${w}" height="32" rx="16" fill="none" stroke="${line}"/><text x="${cx + w / 2}" y="${y + 24.5}" font-family="${FONT}" font-size="13" fill="${ink}" text-anchor="middle">${esc(c)}</text>`;
    cx += w + 8;
  }

  // ---- right rail
  let ry = 104;
  const rh = (text: string) => {
    const s = `<text x="${RAIL_X}" y="${ry}" font-family="${FONT}" font-size="20" font-weight="400" fill="${ink}">${esc(text)}</text>` + glyph(ARROW_FWD, RAIL_X + RAIL_W - 12, ry - 6, 22, ink);
    ry += 22;
    return s;
  };
  out += rh("Similar apps");
  const similar: Array<[string, string, string]> = [
    ["Eye Care Plus", "Visionary Labs", "4.5"],
    ["Vision Trainer", "Sightline Apps", "4.3"],
    ["Relax Eyes", "calmworks", "4.7"],
    ["Daily Sight", "healthcare4mobile", "4.4"],
  ];
  const hues: Array<[string, string]> = [["#60a5fa", "#1d4ed8"], ["#f472b6", "#be185d"], ["#fbbf24", "#d97706"], ["#a78bfa", "#6d28d9"]];
  similar.forEach(([name, dev, r], i) => {
    const id = `gpw-sim${i}`;
    out += `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${hues[i][0]}"/><stop offset="1" stop-color="${hues[i][1]}"/></linearGradient></defs>` +
      `<rect x="${RAIL_X}" y="${ry}" width="56" height="56" rx="12" fill="url(#${id})"/><text x="${RAIL_X + 28}" y="${ry + 37}" font-family="${FONT}" font-size="26" font-weight="700" fill="#fff" text-anchor="middle">${esc(name[0])}</text>`;
    out += `<text x="${RAIL_X + 72}" y="${ry + 20}" font-family="${FONT}" font-size="14.5" font-weight="500" fill="${ink}">${esc(truncate(name, 14.5, 240))}</text>`;
    out += `<text x="${RAIL_X + 72}" y="${ry + 38}" font-family="${FONT}" font-size="12.5" fill="${sub}">${esc(truncate(dev, 12.5, 240))}</text>`;
    out += `<text x="${RAIL_X + 72}" y="${ry + 54}" font-family="${FONT}" font-size="12.5" fill="${sub}">${r}</text>` + glyph(STAR, RAIL_X + 72 + 27, ry + 49.5, 11, sub);
    ry += 76;
  });

  ry += 18;
  out += `<rect x="${RAIL_X}" y="${ry - 12}" width="${RAIL_W}" height="1" fill="${line}"/>`;
  ry += 24;
  out += `<text x="${RAIL_X}" y="${ry}" font-family="${FONT}" font-size="20" font-weight="400" fill="${ink}">Developer contact</text>`;
  out += `<path d="M${RAIL_X + RAIL_W - 22} ${ry - 9}l8 8 8-8" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  ry += 20;
  const dev = doc.developer.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const contact: Array<[string, string, string]> = [
    ["globe", "Website", `www.${dev || "developer"}.com`],
    ["mail", "Support email", `support@${dev || "developer"}.com`],
    ["shield", "Privacy Policy", `${dev || "developer"}.com/privacy`],
  ];
  for (const [kind, a, b] of contact) {
    const gx = RAIL_X + 12;
    const gy = ry + 22;
    out += kind === "globe"
      ? `<g fill="none" stroke="${sub}" stroke-width="1.7"><circle cx="${gx}" cy="${gy}" r="9"/><path d="M${gx - 9} ${gy}h18M${gx} ${gy - 9}c-5 5-5 13 0 18M${gx} ${gy - 9}c5 5 5 13 0 18"/></g>`
      : kind === "mail"
        ? `<g fill="none" stroke="${sub}" stroke-width="1.7" stroke-linejoin="round"><rect x="${gx - 10}" y="${gy - 7}" width="20" height="14" rx="2"/><path d="M${gx - 10} ${gy - 5}l10 7 10-7"/></g>`
        : glyph("M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z", gx, gy, 20, sub);
    out += `<text x="${RAIL_X + 40}" y="${ry + 20}" font-family="${FONT}" font-size="14" fill="${ink}">${esc(a)}</text><text x="${RAIL_X + 40}" y="${ry + 38}" font-family="${FONT}" font-size="12.5" fill="${sub}">${esc(truncate(b, 12.5, 270))}</text>`;
    ry += 56;
  }

  // ---- more by this developer
  ry += 14;
  out += `<rect x="${RAIL_X}" y="${ry - 12}" width="${RAIL_W}" height="1" fill="${line}"/>`;
  ry += 24;
  out += `<text x="${RAIL_X}" y="${ry}" font-family="${FONT}" font-size="20" font-weight="400" fill="${ink}">${esc(truncate(`More by ${doc.developer}`, 20, RAIL_W - 40))}</text>` + glyph(ARROW_FWD, RAIL_X + RAIL_W - 12, ry - 6, 22, ink);
  ry += 22;
  const more: Array<[string, string, string]> = [["Sleep Sounds", "4.6", "#818cf8"], ["Posture Coach", "4.2", "#34d399"]];
  more.forEach(([name, r, c]) => {
    out += `<rect x="${RAIL_X}" y="${ry}" width="56" height="56" rx="12" fill="${c}"/><text x="${RAIL_X + 28}" y="${ry + 37}" font-family="${FONT}" font-size="26" font-weight="700" fill="#fff" text-anchor="middle">${esc(name[0])}</text>`;
    out += `<text x="${RAIL_X + 72}" y="${ry + 24}" font-family="${FONT}" font-size="14.5" font-weight="500" fill="${ink}">${esc(name)}</text>`;
    out += `<text x="${RAIL_X + 72}" y="${ry + 44}" font-family="${FONT}" font-size="12.5" fill="${sub}">${r}</text>` + glyph(STAR, RAIL_X + 72 + 27, ry + 39.5, 11, sub);
    ry += 72;
  });

  return `<defs><clipPath id="gpw-page"><rect width="${WEB_W}" height="${WEB_H}"/></clipPath></defs><g clip-path="url(#gpw-page)">${out}${nav(dark)}</g>`;
}
