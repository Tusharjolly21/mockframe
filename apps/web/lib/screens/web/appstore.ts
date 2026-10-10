"use client";

import { esc, textBlock, textWidth, truncate, wrapText } from "../common";
import { systemFont } from "../common";
import type { AppStoreDoc } from "../types";
import { WEB_H, WEB_W } from "../webPage";
import { appIcon, appleLogo, appShot, asDescription, chartFooter, personGlyph, shareIcon, starRow, theme } from "./as-common";

/**
 * apps.apple.com product page at 1440×900: slim App Store bar, app header,
 * the ratings strip, a row of screenshots, the description and a right-hand
 * information / ratings column.
 */

const LEFT = 120;
const COL_W = 840;
const RIGHT = 1020;
const RIGHT_W = 300;

/** Share of ratings per star (1..5) from a Binomial(4, f) whose mean is the rating. */
function distribution(rating: number): number[] {
  const f = Math.min(1, Math.max(0, (rating - 1) / 4));
  const c = [1, 4, 6, 4, 1];
  return c.map((n, k) => n * Math.pow(f, k) * Math.pow(1 - f, 4 - k));
}

export function renderAppStoreWeb(doc: AppStoreDoc, avatarUrl?: string, _lookupUrl?: (id: string) => string | undefined): string {
  void _lookupUrl;
  const dark = !!doc.dark;
  const t = theme(dark);
  const font = systemFont("ios");
  const parts: string[] = [`<rect width="${WEB_W}" height="${WEB_H}" fill="${t.bg}"/>`];
  const ink = dark ? "#f5f5f7" : "#1d1d1f";
  const sub = dark ? "#a1a1a6" : "#6e6e73";
  const hair = dark ? "#2d2d30" : "#d2d2d7";
  const blue = dark ? "#2997ff" : "#0066cc";
  const btnBlue = "#0071e3";
  const text = (x: number, y: number, size: number, s: string, fill: string, weight = 400, anchor = "start", extra = "") =>
    `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" ${extra}>${esc(s)}</text>`;

  /* slim nav */
  parts.push(
    `<rect width="${WEB_W}" height="52" fill="${dark ? "#161617" : "#f5f5f7"}"/>`,
    `<rect y="51.5" width="${WEB_W}" height="0.8" fill="${hair}"/>`,
    appleLogo(LEFT - 4, 15, 21, ink),
    `<rect x="${LEFT + 28}" y="17" width="1" height="18" fill="${hair}"/>`,
    text(LEFT + 42, 32, 17, "App Store", ink, 600),
    text(WEB_W - LEFT - 40, 31, 13, "Get the iOS app", blue, 400, "end"),
    `<g transform="translate(${WEB_W - LEFT - 22} 16)" fill="none" stroke="${ink}" stroke-width="1.7" stroke-linecap="round"><circle cx="8" cy="8" r="5.6"/><path d="M12.4 12.4L17 17"/></g>`
  );

  /* header */
  const ic = 140;
  const iy = 88;
  const tx = LEFT + ic + 28;
  const maxT = LEFT + COL_W - tx;
  const age = "4+";
  const titleSize = 30;
  const title = truncate(doc.title, titleSize, maxT - 90);
  const tw = textWidth(title, titleSize) * 1.05;
  parts.push(
    appIcon(doc, avatarUrl, LEFT, iy, ic, "asw-ic", font, dark),
    text(tx, iy + 32, titleSize, title, ink, 700, "start", `letter-spacing="-0.4"`),
    `<rect x="${tx + tw + 10}" y="${iy + 14}" width="26" height="19" rx="9.5" fill="none" stroke="${sub}" stroke-width="1"/>`,
    text(tx + tw + 23, iy + 28, 11.5, age, sub, 600, "middle"),
    text(tx, iy + 62, 18, truncate(doc.subtitle, 18, maxT), sub),
    text(tx, iy + 88, 15, truncate(doc.developer, 15, maxT), blue)
  );
  const bw = 156;
  const by = iy + ic - 36;
  parts.push(
    `<rect x="${tx}" y="${by}" width="${bw}" height="36" rx="18" fill="${btnBlue}"/>`,
    text(tx + bw / 2, by + 23.5, 15, "View in App Store", "#ffffff", 500, "middle"),
    `<circle cx="${tx + bw + 28}" cy="${by + 18}" r="18" fill="none" stroke="${hair}" stroke-width="1"/>`,
    shareIcon(tx + bw + 28, by + 17, 17, blue, 1.7),
    text(tx + bw + 62, by + 14, 12, "Free", sub, 500),
    text(tx + bw + 62, by + 29, 12, "Offers In-App Purchases", sub)
  );

  /* ratings strip */
  const sy = iy + ic + 28;
  const colW = COL_W / 5;
  const SH_ = 64;
  parts.push(`<rect x="${LEFT}" y="${sy}" width="${COL_W}" height="0.8" fill="${hair}"/>`, `<rect x="${LEFT}" y="${sy + SH_ + 14}" width="${COL_W}" height="0.8" fill="${hair}"/>`);
  const cols: Array<{ head: string; big?: string; foot: string }> = [
    { head: `${doc.ratingCount.toUpperCase()} RATINGS`, big: doc.ratingValue.toFixed(1), foot: "" },
    { head: "AGE", big: "4+", foot: "Years Old" },
    { head: "CHART", big: "No.1", foot: chartFooter(doc) },
    { head: "DEVELOPER", foot: truncate(doc.developer, 12.5, colW - 56) },
    { head: "LANGUAGE", big: "EN", foot: "+ 11 More" },
  ];
  cols.forEach((c, i) => {
    const cx = LEFT + colW * i + colW / 2;
    const top = sy + 14;
    if (i > 0) parts.push(`<rect x="${LEFT + colW * i}" y="${top}" width="0.8" height="${SH_ - 8}" fill="${hair}"/>`);
    parts.push(text(cx, top + 10, 10.5, truncate(c.head, 10.5, colW - 16), sub, 600, "middle", `letter-spacing="0.4"`));
    if (c.big) parts.push(text(cx, top + 36, 24, c.big, ink, 600, "middle"));
    if (i === 0) parts.push(starRow(cx, top + 46, doc.ratingValue, 10.5, sub, "asw-rs"));
    if (i === 3) parts.push(personGlyph(cx, top + 30, 24, ink));
    if (c.foot) parts.push(text(cx, top + 50, 12.5, c.foot, sub, 400, "middle"));
  });

  /* screenshots */
  const shY = sy + SH_ + 14 + 30;
  const gap = 14;
  const shW = (COL_W - gap * 3) / 4;
  const shH = shW / 0.462;
  for (let i = 0; i < 4; i++) parts.push(appShot({ id: `asw-shot${i}`, x: LEFT + i * (shW + gap), y: shY, w: shW, h: shH, i, doc, font }));

  /* description */
  const dy = shY + shH + 36;
  const dlines = wrapText(asDescription(doc), 15.5, COL_W - 8).slice(0, 4);
  parts.push(textBlock(dlines, { font, x: LEFT, y: dy, size: 15.5, lineHeight: 23, color: ink }));

  /* right column: Information */
  let ry = iy + 12;
  parts.push(text(RIGHT, ry + 14, 22, "Information", ink, 700));
  ry += 30;
  const rows: Array<[string, string]> = [
    ["Seller", doc.developer],
    ["Size", "84.6 MB"],
    ["Category", doc.category],
    ["Compatibility", "iPhone, iOS 16.0+"],
    ["Languages", "English and 11 more"],
    ["Age Rating", "4+"],
    ["Price", "Free"],
  ];
  const rowH = 40;
  for (const [k, v] of rows) {
    parts.push(
      `<rect x="${RIGHT}" y="${ry}" width="${RIGHT_W}" height="0.8" fill="${hair}"/>`,
      text(RIGHT, ry + 25, 13.5, k, sub),
      text(RIGHT + RIGHT_W, ry + 25, 13.5, truncate(v, 13.5, RIGHT_W - 120), k === "Seller" ? blue : ink, 400, "end")
    );
    ry += rowH;
  }
  parts.push(`<rect x="${RIGHT}" y="${ry}" width="${RIGHT_W}" height="0.8" fill="${hair}"/>`);

  /* right column: Ratings & Reviews summary */
  ry += 40;
  parts.push(text(RIGHT, ry, 22, "Ratings & Reviews", ink, 700));
  ry += 14;
  const bigY = ry + 62;
  parts.push(
    text(RIGHT - 2, bigY, 58, doc.ratingValue.toFixed(1), ink, 700, "start", `letter-spacing="-1.5"`),
    text(RIGHT + 4, bigY + 20, 13, "out of 5", sub),
    text(RIGHT + RIGHT_W, ry + 14 + 5 * 15 + 10, 13, `${doc.ratingCount} Ratings`, sub, 400, "end")
  );
  const dist = distribution(doc.ratingValue);
  const barX = RIGHT + 156;
  const barW = RIGHT_W - 156;
  for (let k = 4; k >= 0; k--) {
    const row = 4 - k;
    const yy = ry + 14 + row * 15;
    const n = k + 1;
    parts.push(
      text(barX - 12, yy + 7, 10, "★".repeat(n), sub, 400, "end"),
      `<rect x="${barX}" y="${yy}" width="${barW}" height="4" rx="2" fill="${dark ? "#2c2c2e" : "#e8e8ed"}"/>`,
      `<rect x="${barX}" y="${yy}" width="${Math.max(3, barW * dist[k]).toFixed(1)}" height="4" rx="2" fill="${sub}"/>`
    );
  }
  return parts.join("\n");
}
