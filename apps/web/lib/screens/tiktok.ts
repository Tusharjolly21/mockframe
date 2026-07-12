"use client";

import {
  avatar,
  compact,
  esc,
  homeIndicator,
  SH,
  statusBar,
  SW,
  textBlock as baseTextBlock,
  wrapText,
} from "./common";
import { fontFor } from "./fonts";
import type { TikTokDoc } from "./types";

/**
 * TikTok comments sheet over a dimmed video: "Comments (N)" header, rows of
 * avatar · username · text · time/Reply · like column, optional
 * "Liked by creator" badge. Spec §2.6.
 */

const FONT_SIZE = 14.5;
const LINE_H = 19;
const M = 16;
const TEXT_X = M + 46;
const LIKE_W = 46;

export function renderTikTok(doc: TikTokDoc, lookupUrl?: (id: string) => string | undefined): string {
  const platform = doc.chrome.platform ?? "ios";
  const font = fontFor("tiktok", platform);
  const textBlock = (lines: string[], o: Parameters<typeof baseTextBlock>[1]) =>
    baseTextBlock(lines, { font, ...o });
  const dark = !!doc.chrome.dark;
  const c = {
    sheet: dark ? "#1f1f1f" : "#ffffff",
    text: dark ? "#f1f1f2" : "#161823",
    subtle: dark ? "#8a8b91" : "#8a8b91",
    hairline: dark ? "#2f2f31" : "#f1f1f2",
    red: "#fe2c55",
  };

  const SHEET_Y = 118;
  const parts: string[] = [
    // dimmed video backdrop above the sheet
    `<defs><linearGradient id="ttv" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a2f4d"/><stop offset="1" stop-color="#101018"/>
    </linearGradient></defs>`,
    `<rect width="${SW}" height="${SHEET_Y + 30}" fill="url(#ttv)"/>`,
    statusBar({ time: doc.chrome.time, battery: doc.chrome.battery, color: "#ffffff", platform }),
    `<path d="M0 ${SHEET_Y + 16} a 16 16 0 0 1 16 -16 h ${SW - 32} a 16 16 0 0 1 16 16 v ${SH - SHEET_Y - 16} h -${SW} Z" fill="${c.sheet}"/>`,
    // header
    `<text font-family="${font}" font-size="13.5" font-weight="600" fill="${c.text}" text-anchor="middle" x="${SW / 2}" y="${SHEET_Y + 34}">Comments (${esc(doc.count)})</text>`,
    `<path d="M${SW - 32} ${SHEET_Y + 27} l12 12 m0 -12 l-12 12" stroke="${c.subtle}" stroke-width="1.8" stroke-linecap="round"/>`,
    `<rect x="0" y="${SHEET_Y + 50}" width="${SW}" height="0.5" fill="${c.hairline}"/>`
  ];

  /* comment rows */
  let y = SHEET_Y + 78;
  for (let i = 0; i < doc.comments.length; i++) {
    const cm = doc.comments[i];
    parts.push(avatar(cm.user, M + 18, y + 2, 18, `tt${i}`, cm.avatar ? lookupUrl?.(cm.avatar) : undefined));
    parts.push(
      textBlock([cm.user], { x: TEXT_X, y: y - 2, size: 13, lineHeight: 15, color: c.subtle, weight: 600 })
    );
    const lines = wrapText(cm.text || " ", FONT_SIZE, SW - TEXT_X - M - LIKE_W);
    parts.push(
      textBlock(lines, { x: TEXT_X, y: y + 16, size: FONT_SIZE, lineHeight: LINE_H, color: c.text })
    );
    let metaY = y + 16 + (lines.length - 1) * LINE_H + 20;
    parts.push(
      `<text font-family="${font}" font-size="12.5" fill="${c.subtle}" x="${TEXT_X}" y="${metaY}">${esc(cm.time)}   <tspan font-weight="600">Reply</tspan></text>`
    );
    if (cm.creatorLiked) {
      metaY += 19;
      parts.push(
        `<text font-size="10.5" x="${TEXT_X}" y="${metaY}">❤️</text>`,
        `<text font-family="${font}" font-size="12" fill="${c.subtle}" x="${TEXT_X + 17}" y="${metaY}">Liked by creator</text>`
      );
    }
    // like column
    const heartX = SW - M - 12;
    parts.push(
      `<path d="M${heartX} ${y + 12} c -6.5 -4 -10.5 -8 -10.5 -12.5 a 5.4 5.4 0 0 1 10.5 -1.6 a 5.4 5.4 0 0 1 10.5 1.6 c 0 4.5 -4 8.5 -10.5 12.5 Z" fill="none" stroke="${c.subtle}" stroke-width="1.6" stroke-linejoin="round" transform="translate(-5,-6)"/>`,
      `<text font-family="${font}" font-size="11.5" fill="${c.subtle}" text-anchor="middle" x="${heartX - 5}" y="${y + 24}">${compact(cm.likes)}</text>`
    );
    y = metaY + 34;
  }

  /* composer */
  const iy = SH - 60;
  parts.push(
    `<rect x="0" y="${iy - 12}" width="${SW}" height="${SH - iy + 12}" fill="${c.sheet}"/>`,
    `<rect x="0" y="${iy - 12}" width="${SW}" height="0.5" fill="${c.hairline}"/>`,
    avatar("You", M + 16, iy + 16, 16, "ttme"),
    `<rect x="${M + 42}" y="${iy}" width="${SW - M * 2 - 42}" height="34" rx="17" fill="${dark ? "#2f2f31" : "#f1f1f2"}"/>`,
    `<text font-family="${font}" font-size="14" fill="${c.subtle}" x="${M + 58}" y="${iy + 22}">Add comment…</text>`,
    `<text font-size="13" x="${SW - M - 58}" y="${iy + 23}">@</text>`,
    `<text font-size="13" x="${SW - M - 36}" y="${iy + 23}">😊</text>`,
    homeIndicator(c.text, platform)
  );

  return parts.join("\n");
}
