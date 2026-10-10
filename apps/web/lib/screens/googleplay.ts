"use client";

import { SH, SW, esc, homeIndicator, glyph, statusBar, storeShotTile, systemFont, textBlock, textWidth, truncate, wrapText } from "./common";
import {
  ARROW_FWD,
  BOOKMARK_ADD,
  SHARE,
  STAR,
  SHOT_RATIO,
  appIcon,
  blurb,
  clampLines,
  playShot,
  playTheme,
  ratingDist,
  stars,
} from "./web/gp-shots";
import type { GooglePlayDoc } from "./types";

/* ------------------------------ standalone card ------------------------------
   The top of a Google Play listing in Material 3: icon, name, developer, the
   stats row, Install, and the first screenshots. */

const CARD_X = 14;
const CARD_W = 402 - CARD_X * 2;
const CARD_H = 480;

function renderGooglePlayCard(doc: GooglePlayDoc, avatarUrl?: string): string {
  const dark = !!doc.dark;
  const font = systemFont("android");
  const x = CARD_X;
  const y = 14;
  const ink = dark ? "#e3e3e3" : "#1f1f1f";
  const sub = dark ? "#c4c7c5" : "#444746";
  const line = dark ? "#444746" : "#e1e3e1";
  const green = dark ? "#6dd58c" : "#01875f";
  const ic = 80;
  const ix = x + 22;
  const iy = y + 24;
  const tx = ix + ic + 16;
  const maxT = CARD_W - (tx - x) - 18;
  const titleLines = wrapText(doc.title, 21, maxT).slice(0, 2);
  const initial = esc([...doc.title.trim()][0]?.toUpperCase() ?? "A");
  const statY = iy + ic + 34;
  const colW = (CARD_W - 28) / 3;
  const stat = (i: number, top: string, bottom: string, extra = "") => {
    const cx = x + 14 + colW * i + colW / 2;
    return (
      (i > 0 ? `<rect x="${x + 14 + colW * i}" y="${statY - 10}" width="1" height="26" fill="${line}"/>` : "") +
      `<text x="${cx}" y="${statY}" font-family="${font}" font-size="14.5" font-weight="600" fill="${ink}" text-anchor="middle">${top}</text>` +
      extra +
      `<text x="${cx}" y="${statY + 19}" font-family="${font}" font-size="12" fill="${sub}" text-anchor="middle">${esc(bottom)}</text>`
    );
  };
  const rating = Math.min(5, Math.max(0, doc.ratingValue)).toFixed(1);
  const age = (doc.contentRating.match(/\d+\+?/)?.[0] ?? "3+").replace(/^(\d+)$/, "$1+");
  const btnY = statY + 42;
  const shotY = btnY + 66;
  const shotW = 104;
  const tiles: Array<[[string, string], [string, string]]> = [
    [["#2dd4bf", "#0f766e"], ["Train your", "eyes daily"]],
    [["#60a5fa", "#1d4ed8"], ["Track your", "progress"]],
    [["#fbbf24", "#d97706"], ["Gentle", "reminders"]],
    [["#f472b6", "#be185d"], ["Plans for", "every day"]],
  ];
  const shots = tiles.map(([c, cap], i) => storeShotTile(`gp-shot${i}`, x + 22 + i * (shotW + 10), shotY, shotW, 210, c, cap, font)).join("");
  return `
<defs>
  <filter id="gp-card-sh" x="-15%" y="-10%" width="130%" height="130%"><feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#06281b" flood-opacity="${dark ? 0.5 : 0.16}"/></filter>
  <linearGradient id="gp-icon" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#34d399"/><stop offset="1" stop-color="#047857"/></linearGradient>
  <clipPath id="gp-icon-clip"><rect x="${ix}" y="${iy}" width="${ic}" height="${ic}" rx="20"/></clipPath>
  <clipPath id="gp-card-clip"><rect x="${x}" y="${y}" width="${CARD_W}" height="${CARD_H}" rx="28"/></clipPath>
</defs>
<rect x="${x}" y="${y}" width="${CARD_W}" height="${CARD_H}" rx="28" fill="${dark ? "#1f1f1f" : "#ffffff"}"/>
${avatarUrl
    ? `<image href="${avatarUrl}" x="${ix}" y="${iy}" width="${ic}" height="${ic}" preserveAspectRatio="xMidYMid slice" clip-path="url(#gp-icon-clip)"/>`
    : `<rect x="${ix}" y="${iy}" width="${ic}" height="${ic}" rx="20" fill="url(#gp-icon)"/>` +
      `<circle cx="${ix + ic * 0.7}" cy="${iy + ic * 0.28}" r="${ic * 0.32}" fill="#ffffff" opacity="0.15"/>` +
      `<text x="${ix + ic / 2}" y="${iy + ic / 2 + 13}" font-family="${font}" font-size="36" font-weight="700" fill="#ffffff" text-anchor="middle">${initial}</text>`}
<rect x="${ix}" y="${iy}" width="${ic}" height="${ic}" rx="20" fill="none" stroke="${dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}"/>
${textBlock(titleLines, { font, x: tx, y: iy + 20, size: 21, lineHeight: 25, color: ink, weight: 600 })}
<text x="${tx}" y="${iy + 20 + titleLines.length * 25}" font-family="${font}" font-size="14" font-weight="600" fill="${green}">${esc(truncate(doc.developer, 14, maxT))}</text>
<text x="${tx}" y="${iy + 38 + titleLines.length * 25}" font-family="${font}" font-size="11.5" fill="${sub}">Contains ads · In-app purchases</text>
${stat(0, `${rating} ★`, doc.ratingCount)}
${stat(1, "", doc.appSize, `<g transform="translate(${x + 14 + colW * 1.5 - 9} ${statY - 15})" fill="none" stroke="${ink}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2v10M5 8l4 4 4-4M3 16h12"/></g>`)}
${stat(2, "", doc.contentRating, `<rect x="${x + 14 + colW * 2.5 - 11}" y="${statY - 15}" width="22" height="18" rx="3" fill="none" stroke="${ink}" stroke-width="1.5"/><text x="${x + 14 + colW * 2.5}" y="${statY - 1.5}" font-family="${font}" font-size="10" font-weight="700" fill="${ink}" text-anchor="middle">${esc(age)}</text>`)}
<rect x="${x + 22}" y="${btnY}" width="${CARD_W - 44}" height="42" rx="21" fill="${green}"/>
<text x="${x + CARD_W / 2}" y="${btnY + 26.5}" font-family="${font}" font-size="15" font-weight="600" fill="${dark ? "#00391c" : "#ffffff"}" text-anchor="middle">Install</text>
<g clip-path="url(#gp-card-clip)">${shots}</g>`;
}

export function googlePlayCardSize(doc: GooglePlayDoc): { width: number; height: number } {
  void doc;
  return { width: 402, height: CARD_H + 28 };
}

export function renderGooglePlay(doc: GooglePlayDoc, avatarUrl?: string): string {
  if (doc.standalone) return renderGooglePlayCard(doc, avatarUrl);
  const dark = !!doc.dark || !!doc.chrome.dark;
  const platform = doc.chrome.platform === "android" ? "android" : "ios";
  const th = playTheme(dark);
  const font = systemFont("android"); // Play is Google Sans / Roboto on every OS
  const { ink, sub, line, green } = th;
  const pad = 16;
  let out = `<rect width="${SW}" height="${SH}" fill="${th.bg}"/>`;

  // ---- top app bar: back / search / more
  const barY = 44;
  const cy = barY + 28;
  out += `<g fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="M${pad + 14} ${cy}H${pad + 2}M${pad + 8} ${cy - 6}l-6 6 6 6"/>` +
    `<circle cx="${SW - 74}" cy="${cy - 1.5}" r="6.5"/><path d="M${SW - 69} ${cy + 3.5}l6 6"/></g>` +
    `<g fill="${ink}"><circle cx="${SW - 26}" cy="${cy - 7}" r="1.9"/><circle cx="${SW - 26}" cy="${cy}" r="1.9"/><circle cx="${SW - 26}" cy="${cy + 7}" r="1.9"/></g>`;

  // ---- header: icon + title / developer / ads line
  const hy = barY + 64;
  const icon = 72;
  const tx = pad + icon + 16;
  const maxT = SW - tx - pad;
  const titleLines = wrapText(doc.title, 22, maxT).slice(0, 3);
  out += appIcon("gpi", pad, hy, icon, doc.title, avatarUrl, font, ink);
  const t0 = hy + 20;
  out += textBlock(titleLines, { font, x: tx, y: t0, size: 22, lineHeight: 27, color: ink, weight: 500 });
  const devY = t0 + titleLines.length * 27 + 2;
  out += `<text x="${tx}" y="${devY}" font-family="${font}" font-size="14" font-weight="500" fill="${green}">${esc(truncate(doc.developer, 14, maxT))}</text>`;
  out += `<text x="${tx}" y="${devY + 19}" font-family="${font}" font-size="12" fill="${sub}">Contains ads · In-app purchases</text>`;
  const headBottom = Math.max(hy + icon, devY + 28);

  // ---- stats row: rating | size | rated for
  const statY = headBottom + 32;
  const colW = (SW - pad * 2) / 3;
  const rating = Math.min(5, Math.max(0, doc.ratingValue)).toFixed(1);
  const age = (doc.contentRating.match(/\d+\+?/)?.[0] ?? "3+").replace(/^(\d+)$/, "$1+");
  const colX = (i: number) => pad + colW * i + colW / 2;
  const statText = (i: number, top: string, bottom: string) =>
    (top ? `<text x="${colX(i)}" y="${statY}" font-family="${font}" font-size="15" font-weight="500" fill="${ink}" text-anchor="middle">${top}</text>` : "") +
    `<text x="${colX(i)}" y="${statY + 21}" font-family="${font}" font-size="12" fill="${sub}" text-anchor="middle">${esc(truncate(bottom, 12, colW - 12))}</text>`;
  out += statText(0, `${rating}`, doc.ratingCount);
  out += glyph(STAR, colX(0) + textWidthApprox(rating, 15) / 2 + 9, statY - 5.5, 13, ink);
  out += statText(1, "", doc.appSize) + `<g fill="none" stroke="${ink}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" transform="translate(${colX(1) - 9} ${statY - 17})"><path d="M9 1.5v11M4.5 8.5l4.500 4.500 4.500-4.500M2 17h14"/></g>`;
  out += statText(2, "", doc.contentRating) + `<rect x="${colX(2) - 11}" y="${statY - 17}" width="22" height="19" rx="3.5" fill="none" stroke="${ink}" stroke-width="1.5"/><text x="${colX(2)}" y="${statY - 2.5}" font-family="${font}" font-size="10.5" font-weight="700" fill="${ink}" text-anchor="middle">${esc(age)}</text>`;
  for (const i of [1, 2]) out += `<rect x="${pad + colW * i}" y="${statY - 16}" width="1" height="38" fill="${line}"/>`;

  // ---- Install + share / wishlist
  const btnY = statY + 42;
  out += `<rect x="${pad}" y="${btnY}" width="${SW - pad * 2}" height="40" rx="20" fill="${green}"/>` +
    `<text x="${SW / 2}" y="${btnY + 25.5}" font-family="${font}" font-size="15" font-weight="500" fill="${th.onGreen}" text-anchor="middle">Install</text>`;
  const rowY = btnY + 40 + 26;
  out += glyph(SHARE, pad + 48, rowY, 20, green) + `<text x="${pad + 64}" y="${rowY + 5}" font-family="${font}" font-size="14" font-weight="500" fill="${green}">Share</text>`;
  out += glyph(BOOKMARK_ADD, SW / 2 + 28, rowY, 20, green) + `<text x="${SW / 2 + 44}" y="${rowY + 5}" font-family="${font}" font-size="14" font-weight="500" fill="${green}">Add to wishlist</text>`;

  // ---- screenshots: filled tiles, ~2.4 visible
  const shotW = 128;
  const shotH = shotW * SHOT_RATIO;
  const shotY = rowY + 26;
  for (let i = 0; i < 4; i++) out += playShot(i, pad + i * (shotW + 8), shotY, shotW, font);

  // ---- About this app
  const h2 = (y: number, text: string) =>
    `<text x="${pad}" y="${y}" font-family="${font}" font-size="18" font-weight="500" fill="${ink}">${esc(text)}</text>` + glyph(ARROW_FWD, SW - pad - 12, y - 6, 20, ink);
  let y = shotY + shotH + 34;
  out += h2(y, "About this app");
  const desc = clampLines(blurb(doc.title), 14, SW - pad * 2, 3);
  out += textBlock(desc, { font, x: pad, y: y + 28, size: 14, lineHeight: 20, color: sub });
  y += 28 + desc.length * 20 + 6;
  const chips = ["Health & Fitness", "#3 top free in health"];
  let cxp = pad;
  for (const c of chips) {
    const w = textWidthApprox(c, 13) + 28;
    out += `<rect x="${cxp}" y="${y}" width="${w}" height="32" rx="16" fill="none" stroke="${line}"/><text x="${cxp + w / 2}" y="${y + 20.5}" font-family="${font}" font-size="13" fill="${ink}" text-anchor="middle">${esc(c)}</text>`;
    cxp += w + 8;
  }
  y += 32 + 34;

  // ---- Data safety
  out += h2(y, "Data safety");
  const ds = clampLines("Safety starts with understanding how developers collect and share your data. Data privacy and security practices may vary based on your use, region and age.", 13, SW - pad * 2, 2);
  out += textBlock(ds, { font, x: pad, y: y + 26, size: 13, lineHeight: 18, color: sub });
  const cardY = y + 26 + ds.length * 18 + 8;
  out += `<rect x="${pad}" y="${cardY}" width="${SW - pad * 2}" height="150" rx="12" fill="none" stroke="${line}"/>`;
  const dsRows: Array<[string, string]> = [["No data shared with third parties", "Learn more about how developers declare sharing"], ["No data collected", "Learn more about how developers declare collection"]];
  dsRows.forEach(([a, b], i) => {
    const ry = cardY + 28 + i * 52;
    out += glyph("M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z", pad + 28, ry, 20, sub);
    out += `<text x="${pad + 52}" y="${ry - 2}" font-family="${font}" font-size="13.5" fill="${ink}">${esc(a)}</text><text x="${pad + 52}" y="${ry + 15}" font-family="${font}" font-size="12" fill="${sub}">${esc(truncate(b, 12, 290))}</text>`;
  });

  // ---- Ratings and reviews
  y = cardY + 150 + 40;
  out += h2(y, "Ratings and reviews");
  const dist = ratingDist(doc.ratingValue);
  const by = y + 30;
  out += `<text x="${pad}" y="${by + 40}" font-family="${font}" font-size="56" font-weight="400" fill="${ink}">${rating}</text>`;
  out += stars(pad + 2, by + 52, 5, 12, green, th.dark ? "#444746" : "#dadce0", doc.ratingValue);
  out += `<text x="${pad + 2}" y="${by + 82}" font-family="${font}" font-size="12" fill="${sub}">${esc(doc.ratingCount)}</text>`;
  const bx = 130;
  const bw = SW - pad - bx;
  dist.forEach((p, i) => {
    const yy = by + 4 + i * 16;
    out += `<text x="${bx - 10}" y="${yy + 8}" font-family="${font}" font-size="11.5" fill="${sub}" text-anchor="end">${5 - i}</text><rect x="${bx}" y="${yy + 2}" width="${bw}" height="8" rx="4" fill="${th.dark ? "#2b2c2e" : "#e8eaed"}"/><rect x="${bx}" y="${yy + 2}" width="${Math.max(6, bw * p / dist[0] * 0.92).toFixed(1)}" height="8" rx="4" fill="${green}"/>`;
  });

  // ---- system bars drawn last so scrolled content slides under them
  out = `<defs><clipPath id="gp-scr"><rect width="${SW}" height="${SH}"/></clipPath></defs><g clip-path="url(#gp-scr)">${out}</g>`;
  out += statusBar({ time: doc.chrome.time, battery: doc.chrome.battery, color: ink, platform });
  out += homeIndicator(dark ? "#e3e3e3" : "#1f1f1f", platform);
  return out;
}

/** Cheap width estimate for centering short labels (same metric as common.textWidth). */
function textWidthApprox(s: string, size: number): number {
  return textWidth(s, size);
}
