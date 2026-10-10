"use client";

import { esc, homeIndicator, statusBar, storeShotTile, SH, SW, systemFont, textBlock, textWidth, truncate, wrapText } from "./common";
import type { AppStoreDoc } from "./types";
import {
  appIcon,
  appShot,
  asDescription,
  chartFooter,
  chevronLeft,
  isGame,
  personGlyph,
  shareIcon,
  starRow,
  theme,
  WHATS_NEW,
} from "./web/as-common";

/* ------------------------------ standalone card ------------------------------
   The top of an App Store product page: icon, name, GET, the info strip
   (ratings, award, age, chart, developer) and the first screenshots. */

const CARD_X = 14;
const CARD_W = 402 - CARD_X * 2;
const CARD_H = 470;

function renderAppStoreCard(doc: AppStoreDoc, avatarUrl?: string): string {
  const dark = !!doc.dark;
  const font = systemFont("ios");
  const x = CARD_X;
  const y = 14;
  const ink = dark ? "#ffffff" : "#000000";
  const sub = dark ? "rgba(235,235,245,0.6)" : "rgba(60,60,67,0.6)";
  const line = dark ? "rgba(255,255,255,0.12)" : "rgba(60,60,67,0.14)";
  const blue = "#007aff";
  const ic = 104;
  const ix = x + 20;
  const iy = y + 22;
  const tx = ix + ic + 16;
  const maxT = CARD_W - (tx - x) - 18;
  const titleLines = wrapText(doc.title, 22, maxT).slice(0, 2);
  const initial = esc([...doc.title.trim()][0]?.toUpperCase() ?? "A");
  const rating = Math.min(5, Math.max(0, doc.ratingValue));
  const stars = Array.from({ length: 5 }, (_, i) => {
    const sx = i * 11.5;
    const fill = rating >= i + 0.75 ? sub : rating >= i + 0.25 ? "url(#as-half)" : "none";
    const pts = Array.from({ length: 10 }, (_, k) => {
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const r = k % 2 ? 2.1 : 5;
      return `${(sx + 5 + Math.cos(a) * r).toFixed(2)},${(5.2 + Math.sin(a) * r).toFixed(2)}`;
    }).join(" ");
    return `<polygon points="${pts}" fill="${fill}" stroke="${sub}" stroke-width="0.7" stroke-linejoin="round"/>`;
  }).join("");
  const colW = (CARD_W - 16) / 4;
  const stripY = iy + ic + 30;
  const col = (i: number, head: string, big: string, foot: string, extra = "") => {
    const cx = x + 8 + colW * i + colW / 2;
    return (
      (i > 0 ? `<rect x="${x + 8 + colW * i}" y="${stripY + 6}" width="1" height="46" fill="${line}"/>` : "") +
      `<text x="${cx}" y="${stripY + 12}" font-family="${font}" font-size="9.5" font-weight="600" fill="${sub}" text-anchor="middle" letter-spacing="0.4">${esc(head)}</text>` +
      (big ? `<text x="${cx}" y="${stripY + 38}" font-family="${font}" font-size="20" font-weight="700" fill="${sub}" text-anchor="middle">${esc(big)}</text>` : "") +
      extra +
      `<text x="${cx}" y="${stripY + 58}" font-family="${font}" font-size="10.5" fill="${sub}" text-anchor="middle">${esc(foot)}</text>`
    );
  };
  // award laurels around "Editors' Choice"
  const ax = x + 8 + colW * 1 + colW / 2;
  const laurel = (dir: 1 | -1) =>
    `<g transform="translate(${ax + dir * 27} ${stripY + 31}) scale(${dir} 1)" fill="${sub}">` +
    [0, 1, 2, 3].map((k) => `<ellipse cx="${-1 - k * 0.4}" cy="${-9 + k * 6}" rx="1.8" ry="3.8" transform="rotate(${-25 + k * 18} ${-1 - k * 0.4} ${-9 + k * 6})"/>`).join("") +
    `</g>`;
  const award = laurel(1) + laurel(-1) +
    `<text x="${ax}" y="${stripY + 29}" font-family="${font}" font-size="10" font-weight="700" fill="${sub}" text-anchor="middle">Editors'</text>` +
    `<text x="${ax}" y="${stripY + 41}" font-family="${font}" font-size="10" font-weight="700" fill="${sub}" text-anchor="middle">Choice</text>`;
  // the first screenshots, drawn as small app screens
  const shotY = stripY + 84;
  const shotW = 108;
  const shotH = CARD_H + y - shotY - 18;
  const tiles: Array<[[string, string], [string, string]]> = [
    [["#818cf8", "#4f46e5"], ["Mockups", "in seconds"]],
    [["#f472b6", "#db2777"], ["Every device,", "every size"]],
    [["#34d399", "#059669"], ["Export", "in 4K"]],
  ];
  const shots = tiles.map(([c, cap], i) => storeShotTile(`as-shot${i}`, x + 20 + i * (shotW + 10), shotY, shotW, shotH + 40, c, cap, font)).join("");
  const btn = (doc.buttonText || "GET").toUpperCase();
  const btnW = Math.max(74, btn.length * 9 + 34);
  return `
<defs>
  <filter id="as-card-sh" x="-15%" y="-10%" width="130%" height="130%"><feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#0b1020" flood-opacity="${dark ? 0.5 : 0.16}"/></filter>
  <linearGradient id="as-icon" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8b5cf6"/><stop offset="0.55" stop-color="#6366f1"/><stop offset="1" stop-color="#0ea5e9"/></linearGradient>
  <linearGradient id="as-half" x1="0" x2="1"><stop offset="0.5" stop-color="${sub}"/><stop offset="0.5" stop-color="${sub}" stop-opacity="0"/></linearGradient>
  <clipPath id="as-icon-clip"><rect x="${ix}" y="${iy}" width="${ic}" height="${ic}" rx="24"/></clipPath>
  <clipPath id="as-card-clip"><rect x="${x}" y="${y}" width="${CARD_W}" height="${CARD_H}" rx="28"/></clipPath>
</defs>
<rect x="${x}" y="${y}" width="${CARD_W}" height="${CARD_H}" rx="28" fill="${dark ? "#1c1c1e" : "#ffffff"}"/>
${avatarUrl
    ? `<image href="${avatarUrl}" x="${ix}" y="${iy}" width="${ic}" height="${ic}" preserveAspectRatio="xMidYMid slice" clip-path="url(#as-icon-clip)"/>`
    : `<rect x="${ix}" y="${iy}" width="${ic}" height="${ic}" rx="24" fill="url(#as-icon)"/>` +
      `<circle cx="${ix + ic * 0.72}" cy="${iy + ic * 0.26}" r="${ic * 0.34}" fill="#ffffff" opacity="0.14"/>` +
      `<text x="${ix + ic / 2}" y="${iy + ic / 2 + 16}" font-family="${font}" font-size="46" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="-1.5">${initial}</text>`}
<rect x="${ix}" y="${iy}" width="${ic}" height="${ic}" rx="24" fill="none" stroke="${dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}"/>
${textBlock(titleLines, { font, x: tx, y: iy + 24, size: 22, lineHeight: 26, color: ink, weight: 700 })}
<text x="${tx}" y="${iy + 24 + titleLines.length * 26 - 4}" font-family="${font}" font-size="14.5" fill="${sub}">${esc(truncate(doc.subtitle, 14.5, maxT))}</text>
<rect x="${tx}" y="${iy + ic - 30}" width="${btnW}" height="30" rx="15" fill="${blue}"/>
<text x="${tx + btnW / 2}" y="${iy + ic - 10}" font-family="${font}" font-size="15" font-weight="700" fill="#ffffff" text-anchor="middle">${esc(btn)}</text>
<text x="${tx + btnW + 10}" y="${iy + ic - 18}" font-family="${font}" font-size="9" fill="${sub}">In-App</text>
<text x="${tx + btnW + 10}" y="${iy + ic - 7}" font-family="${font}" font-size="9" fill="${sub}">Purchases</text>
<g transform="translate(${x + CARD_W - 40} ${iy + ic - 30})" fill="none" stroke="${blue}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8h14v-8M11 3v12M7 7l4-4 4 4"/></g>
<rect x="${x + 20}" y="${stripY - 12}" width="${CARD_W - 40}" height="1" fill="${line}"/>
${col(0, `${doc.ratingCount.toUpperCase()} RATINGS`, rating.toFixed(1), "", `<g transform="translate(${x + 8 + colW / 2 - 28.5} ${stripY + 47})">${stars}</g>`)}
${col(1, "AWARD", "", doc.category, award)}
${col(2, "AGE", "4+", "Years Old")}
${col(3, "DEVELOPER", "", truncate(doc.developer, 10.5, colW - 8), `<g transform="translate(${x + 8 + colW * 3 + colW / 2 - 11} ${stripY + 20})" fill="none" stroke="${sub}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="7" r="4"/><path d="M3 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></g>`)}
<rect x="${x + 20}" y="${stripY + 70}" width="${CARD_W - 40}" height="1" fill="${line}"/>
<g clip-path="url(#as-card-clip)">${shots}</g>`;
}

export function appStoreCardSize(doc: AppStoreDoc): { width: number; height: number } {
  void doc;
  return { width: 402, height: CARD_H + 28 };
}


/* ------------------------------ product page --------------------------------
   The iOS App Store product page as it looks on a 402×874 iPhone: nav, header
   (icon, title, GET), the info strip, What's New, Preview screenshots,
   description and the bottom tab bar. */

function tabIcon(kind: "today" | "games" | "apps" | "arcade" | "search", cx: number, cy: number, color: string, on: boolean): string {
  const fill = on ? color : "none";
  const g = (inner: string) =>
    `<g transform="translate(${cx} ${cy})" fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;
  switch (kind) {
    case "today":
      return g(
        `<rect x="-10" y="-12" width="20" height="24" rx="5" fill="${fill}"/>` +
          `<rect x="-5.5" y="-7.5" width="11" height="7" rx="2" fill="${on ? "#fff" : "none"}" stroke="${on ? "#fff" : color}"/>` +
          `<path d="M-5.5 4.5h11M-5.5 8h6" stroke="${on ? "#fff" : color}"/>`
      );
    case "games":
      return g(
        `<path d="M7.5 -11.5c-6 .5-10 5-12 11l5.5 5.5c6-2 10.5-6 11-12z" fill="${fill}"/>` +
          `<circle cx="2" cy="-2" r="2.4" fill="${on ? "#fff" : "none"}" stroke="${on ? "#fff" : color}"/>` +
          `<path d="M-6.5 3.5l-4 .5 1-4.5M-1 9.5l-.5 4 4.5-1"/>`
      );
    case "apps":
      return g(
        `<path d="M0 -12l11 6-11 6-11-6z" fill="${fill}"/>` +
          `<path d="M-11 0l11 6 11-6M-11 6l11 6 11-6"/>`
      );
    case "arcade":
      return g(
        `<rect x="-11" y="2" width="22" height="9" rx="4.5" fill="${fill}"/>` +
          `<path d="M0 2V-6"/><circle cx="0" cy="-9" r="3.6" fill="${fill}"/>` +
          `<circle cx="-5.5" cy="6.5" r="1.2" fill="${on ? "#fff" : color}" stroke="none"/><circle cx="5.5" cy="6.5" r="1.2" fill="${on ? "#fff" : color}" stroke="none"/>`
      );
    default:
      return g(`<circle cx="-2" cy="-2" r="8.2"/><path d="M4 4l7 7" stroke-width="2.4"/>`);
  }
}

/** Wrap to `maxLines`, leaving room for a trailing "more" link on the last line. */
function clampLines(text: string, size: number, w: number, maxLines: number, moreW: number): string[] {
  const all = wrapText(text, size, w);
  if (all.length < maxLines) return all.concat([]);
  const head = all.slice(0, maxLines - 1);
  const rest = wrapText(all.slice(maxLines - 1).join(" "), size, w - moreW);
  return head.concat(rest[0]);
}

function renderProductPage(doc: AppStoreDoc, avatarUrl?: string): string {
  const dark = !!doc.dark;
  const font = systemFont("ios");
  const t = theme(dark);
  const parts: string[] = [`<rect width="${SW}" height="${SH}" fill="${t.bg}"/>`];
  const M = 20;
  const game = isGame(doc);

  /* nav: back chevron + the tab we came from */
  parts.push(
    statusBar({ time: doc.chrome.time, battery: doc.chrome.battery, color: t.ink }),
    chevronLeft(M - 2, 78, 20, t.blue, 2.7),
    `<text x="${M + 14}" y="84" font-family="${font}" font-size="17" fill="${t.blue}">${game ? "Games" : "Apps"}</text>`
  );

  /* header: icon, title, subtitle, GET */
  const ic = 104;
  const iy = 104;
  const tx = M + ic + 14;
  const maxT = SW - tx - M;
  const titleLines = wrapText(doc.title, 20, maxT).slice(0, 2);
  if (titleLines.length === 2 && wrapText(doc.title, 20, maxT).length > 2) titleLines[1] = truncate(titleLines[1], 20, maxT);
  const btn = (doc.buttonText || "GET").toUpperCase();
  const btnW = Math.max(76, Math.min(110, textWidth(btn, 15) * 1.15 + 36));
  const btnY = iy + ic - 30;
  const subY = Math.min(iy + 21 + (titleLines.length - 1) * 24 + 21, btnY - 10);
  parts.push(
    appIcon(doc, avatarUrl, M, iy, ic, "as-ic", font, dark),
    textBlock(titleLines, { font, x: tx, y: iy + 21, size: 20, lineHeight: 24, color: t.ink, weight: 700 }),
    `<text x="${tx}" y="${subY}" font-family="${font}" font-size="14" fill="${t.sub}">${esc(truncate(doc.subtitle, 14, maxT))}</text>`,
    `<rect x="${tx}" y="${btnY}" width="${btnW}" height="30" rx="15" fill="${t.blue}"/>`,
    `<text x="${tx + btnW / 2}" y="${btnY + 20.5}" font-family="${font}" font-size="15" font-weight="700" fill="#ffffff" text-anchor="middle">${esc(btn)}</text>`,
    `<text x="${tx + btnW + 9}" y="${btnY + 13}" font-family="${font}" font-size="9" fill="${t.sub}">In-App</text>`,
    `<text x="${tx + btnW + 9}" y="${btnY + 23.5}" font-family="${font}" font-size="9" fill="${t.sub}">Purchases</text>`,
    shareIcon(SW - M - 10, btnY + 15, 22, t.blue)
  );

  /* info strip: ratings, age, chart, developer (language scrolls off-screen) */
  const sy = iy + ic + 24;
  const cols: Array<{ w: number; head: string; big?: string; foot: string; extra?: string }> = [
    { w: 106, head: `${doc.ratingCount.toUpperCase()} RATINGS`, big: doc.ratingValue.toFixed(1), foot: "" },
    { w: 80, head: "AGE", big: "4+", foot: "Years Old" },
    { w: 96, head: "CHART", big: "No.1", foot: chartFooter(doc) },
    { w: 100, head: "DEVELOPER", foot: truncate(doc.developer, 11, 80) },
  ];
  let cx0 = M;
  cols.forEach((c, i) => {
    const cx = cx0 + c.w / 2;
    if (i > 0) parts.push(`<rect x="${cx0}" y="${sy + 4}" width="0.7" height="46" fill="${t.line}"/>`);
    parts.push(`<text x="${cx}" y="${sy + 12}" font-family="${font}" font-size="9.5" font-weight="600" fill="${t.sub}" text-anchor="middle" letter-spacing="0.3">${esc(truncate(c.head, 9.5, c.w - 8))}</text>`);
    if (c.big) parts.push(`<text x="${cx}" y="${sy + 35}" font-family="${font}" font-size="21" font-weight="700" fill="${t.sub}" text-anchor="middle">${esc(c.big)}</text>`);
    if (i === 0) parts.push(starRow(cx, sy + 45.5, doc.ratingValue, 9.5, t.sub, "as-rs"));
    if (i === 3) parts.push(personGlyph(cx, sy + 30, 22, t.sub));
    if (c.foot) parts.push(`<text x="${cx}" y="${sy + 49}" font-family="${font}" font-size="11" fill="${t.sub}" text-anchor="middle">${esc(c.foot)}</text>`);
    cx0 += c.w;
  });
  const afterStrip = sy + 62;
  parts.push(`<rect x="${M}" y="${afterStrip}" width="${SW - M}" height="0.7" fill="${t.line}"/>`);

  /* What's New */
  let y = afterStrip + 34;
  parts.push(
    `<text x="${M}" y="${y}" font-family="${font}" font-size="22" font-weight="700" fill="${t.ink}">What's New</text>`,
    `<text x="${SW - M}" y="${y - 1}" font-family="${font}" font-size="15" fill="${t.blue}" text-anchor="end">Version History</text>`
  );
  y += 22;
  parts.push(
    `<text x="${M}" y="${y}" font-family="${font}" font-size="13" fill="${t.sub}">Version 2.4.1</text>`,
    `<text x="${SW - M}" y="${y}" font-family="${font}" font-size="13" fill="${t.sub}" text-anchor="end">2w ago</text>`
  );
  y += 22;
  const newLines = clampLines(WHATS_NEW, 15, SW - M * 2, 2, 44);
  parts.push(textBlock(newLines, { font, x: M, y, size: 15, lineHeight: 19.5, color: t.ink }));
  parts.push(`<text x="${SW - M}" y="${y + 19.5}" font-family="${font}" font-size="15" fill="${t.blue}" text-anchor="end">more</text>`);
  y += 19.5 + 40;

  /* Preview: a row of portrait screenshots that runs off the right edge */
  parts.push(`<text x="${M}" y="${y}" font-family="${font}" font-size="22" font-weight="700" fill="${t.ink}">Preview</text>`);
  y += 16;
  const shotW = 136;
  const shotH = 270;
  for (let i = 0; i < 3; i++) {
    parts.push(appShot({ id: `as-shot${i}`, x: M + i * (shotW + 10), y, w: shotW, h: shotH, i, doc, font }));
  }
  y += shotH + 24;

  /* description */
  const dl = clampLines(asDescription(doc), 15, SW - M * 2, 3, 44);
  parts.push(textBlock(dl, { font, x: M, y, size: 15, lineHeight: 19.5, color: t.ink }));
  parts.push(`<text x="${SW - M}" y="${y + (dl.length - 1) * 19.5}" font-family="${font}" font-size="15" fill="${t.blue}" text-anchor="end">more</text>`);

  /* tab bar (translucent material over the scrolling page) */
  const TB = 83;
  const ty = SH - TB;
  const idle = dark ? "#98989d" : "#8e8e93";
  const tabs: Array<[string, "today" | "games" | "apps" | "arcade" | "search"]> = [
    ["Today", "today"],
    ["Games", "games"],
    ["Apps", "apps"],
    ["Arcade", "arcade"],
    ["Search", "search"],
  ];
  const selected = game ? "games" : "apps";
  parts.push(
    `<rect x="0" y="${ty}" width="${SW}" height="${TB}" fill="${dark ? "#1d1d1f" : "#f9f9f9"}"/>`,
    `<rect x="0" y="${ty}" width="${SW}" height="0.7" fill="${t.line}"/>`
  );
  tabs.forEach(([label, kind], i) => {
    const cx = (SW / 5) * (i + 0.5);
    const on = kind === selected;
    const col = on ? t.blue : idle;
    parts.push(
      tabIcon(kind, cx, ty + 24, col, on),
      `<text x="${cx}" y="${ty + 52}" font-family="${font}" font-size="10" font-weight="${on ? 600 : 500}" fill="${col}" text-anchor="middle">${label}</text>`
    );
  });
  parts.push(homeIndicator(t.ink, "ios"));
  return parts.join("\n");
}

export function renderAppStore(doc: AppStoreDoc, avatarUrl?: string): string {
  return doc.standalone ? renderAppStoreCard(doc, avatarUrl) : renderProductPage(doc, avatarUrl);
}
