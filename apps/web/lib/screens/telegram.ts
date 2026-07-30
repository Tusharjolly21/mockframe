"use client";

import {
  avatar,
  glassPill,
  bubbleBaseline,
  esc,
  fileCard,
  homeIndicator,
  imageBubble,
  micIcon,
  SH,
  statusBar,
  SW,
  textBlock as baseTextBlock,
  textWidth,
  wrapText,
} from "./common";
import { fontFor } from "./fonts";
import { resolveWallpaper } from "./wallpapers";
import type { TelegramDoc, WhatsAppTicks } from "./types";

/**
 * Telegram (iOS) chat: soft blue wallpaper, white vs light-green bubbles
 * with in-bubble time + green ticks, last-seen header, paperclip composer.
 * Spec §2.6.
 */

const BUBBLE_MAX = 264;
const FONT_SIZE = 16;
const LINE_H = 21;
const PAD_X = 12;
const PAD_Y = 8;
const MARGIN = 14;
const META_W = 52;

export function renderTelegram(
  doc: TelegramDoc,
  avatarUrl?: string,
  lookupUrl?: (id: string) => string | undefined
): string {
  const platform = doc.chrome.platform ?? "ios";
  const font = fontFor("telegram", platform);
  const textBlock = (lines: string[], o: Parameters<typeof baseTextBlock>[1]) =>
    baseTextBlock(lines, { font, ...o });
  const dark = !!doc.chrome.dark;
  const c = {
    headerBg: dark ? "#1c1c1e" : "#f6f6f6",
    hairline: dark ? "#2c2c2e" : "#dcdcdc",
    text: dark ? "#ffffff" : "#000000",
    subtle: dark ? "#8e8e93" : "#8a8a8e",
    incoming: dark ? "#212121" : "#ffffff",
    outgoing: dark ? "#2b5278" : "#e1fec6",
    bubbleText: dark ? "#ffffff" : "#111111",
    tick: dark ? "#6cb2f2" : "#4fae4e",
    metaOut: dark ? "#7da8d3" : "#62a85c",
    blue: "#3d9bef",
  };

  // pastel gradient WITH the doodle icon overlay — the plain gradient alone
  // is the biggest tell vs the real default wallpaper
  const doodles = (() => {
    const pts: Array<[number, number]> = [
      [50, 170], [180, 210], [320, 160], [370, 300], [90, 330], [240, 380],
      [350, 470], [60, 520], [190, 570], [320, 640], [110, 700], [260, 750],
      [30, 430], [370, 800],
    ];
    const shape = (x: number, y: number, k: number) =>
      k % 4 === 0
        ? `<path d="M${x} ${y - 7} l2 4.5 5 .5 -3.7 3.4 1.1 5 -4.4 -2.6 -4.4 2.6 1.1 -5 -3.7 -3.4 5 -.5 Z" fill="#ffffff"/>` // star
        : k % 4 === 1
          ? `<circle cx="${x}" cy="${y}" r="6" fill="none" stroke="#ffffff" stroke-width="1.6"/>` // planet
          : k % 4 === 2
            ? `<path d="M${x - 7} ${y + 4} q7 -12 14 0 Z" fill="#ffffff"/>` // paper plane-ish
            : `<path d="M${x - 6} ${y} a6 6 0 1 0 12 0 M${x - 2} ${y - 6} v-3" fill="none" stroke="#ffffff" stroke-width="1.5"/>`; // balloon
    return `<g opacity="0.16">${pts.map(([x, y], k) => shape(x, y, k)).join("")}</g>`;
  })();
  const wallpaper = dark
    ? `<rect width="${SW}" height="${SH}" fill="#0e1621"/>`
    : `<defs><linearGradient id="tgw" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#d3e0ec"/><stop offset="0.5" stop-color="#c7dcd8"/><stop offset="1" stop-color="#d8e4d3"/>
      </linearGradient></defs><rect width="${SW}" height="${SH}" fill="url(#tgw)"/>${doodles}`;

  const parts: string[] = [resolveWallpaper(doc.wallpaper, dark) ?? wallpaper];

  /* header */
  const HEADER_H = 102;
  parts.push(
    `<rect width="${SW}" height="${HEADER_H}" fill="${c.headerBg}"/>`,
    `<rect y="${HEADER_H - 0.5}" width="${SW}" height="0.5" fill="${c.hairline}"/>`,
    statusBar({ time: doc.chrome.time, battery: doc.chrome.battery, color: c.text, platform }),
    `<path d="M24 62 l-10 11 10 11" fill="none" stroke="${c.blue}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`,
    textBlock([doc.contact], { x: SW / 2, y: 72, size: 16.5, lineHeight: 19, color: c.text, weight: 600, anchor: "middle" }),
    doc.verified
      ? verifiedBadge(SW / 2 + textWidth(doc.contact, 16.5) / 2 + 4, 72 - 14)
      : "",
    textBlock([doc.chrome._anim?.typing ? "typing…" : doc.presence || "last seen recently"], { x: SW / 2, y: 90, size: 12.5, lineHeight: 14, color: doc.chrome._anim?.typing ? c.blue : c.subtle, anchor: "middle" }),
    avatar(doc.contact, SW - 34, 73, 18, "tg", avatarUrl)
  );

  /* messages */
  const time = doc.chrome.time || "9:41";
  let y = HEADER_H + 20;
  // floating translucent date pill
  parts.push(
    `<rect x="${SW / 2 - 30}" y="${y - 12}" width="60" height="22" rx="11" fill="${dark ? "rgba(255,255,255,0.08)" : "rgba(93,117,102,0.35)"}"/>`,
    `<text font-family="${font}" font-size="11.5" font-weight="600" fill="#ffffff" text-anchor="middle" x="${SW / 2}" y="${y + 3}">Today</text>`
  );
  y += 26;
  const msgs = doc.messages;
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    const mine = m.from === "me";

    const imgUrl = m.image ? lookupUrl?.(m.image) : undefined;
    if (imgUrl) {
      const iw = 220, ih = 236;
      const ix = mine ? SW - MARGIN - iw : MARGIN;
      parts.push(imageBubble(imgUrl, ix, y, iw, ih, `tg${i}`, { rx: 14, time, font }));
      y += ih + 8;
      if (!m.text) continue;
    }

    if (m.file) {
      const cw = 244;
      const cx = mine ? SW - MARGIN - cw : MARGIN;
      const card = fileCard({ x: cx, y, w: cw, name: m.file.name, ext: m.file.ext, meta: m.file.meta, cardBg: mine ? c.outgoing : c.incoming, text: c.bubbleText, subtle: c.subtle, font });
      parts.push(card.svg);
      y += card.h + 8;
      if (!m.text) continue;
    }

    const lines = wrapText(m.text || " ", FONT_SIZE, BUBBLE_MAX - PAD_X * 2);
    const lastLineW = textWidth(lines[lines.length - 1], FONT_SIZE);
    const metaW = mine ? META_W : META_W - 16;
    const metaInline = lastLineW + metaW <= BUBBLE_MAX - PAD_X * 2;
    const textW = Math.max(...lines.map((l) => textWidth(l, FONT_SIZE)));
    const w = Math.min(BUBBLE_MAX, Math.max(textW + PAD_X * 2, metaInline ? lastLineW + metaW + PAD_X * 2 : metaW + PAD_X * 2));
    const h = lines.length * LINE_H + PAD_Y * 2 + (metaInline ? 0 : 13);
    const x = mine ? SW - MARGIN - w : MARGIN;
    const fill = mine ? c.outgoing : c.incoming;
    const isTailEnd = i === msgs.length - 1 || msgs[i + 1].from !== m.from;

    parts.push(`<rect x="${x}" y="${y}" width="${w.toFixed(1)}" height="${h}" rx="15" fill="${fill}"/>`);
    if (isTailEnd)
      parts.push(
        mine
          ? `<path d="M${x + w - 2} ${y + h - 12} c 1 6 3.5 9 8 11 c -6 1.5 -11 -0.5 -14 -4 Z" fill="${fill}"/>`
          : `<path d="M${x + 2} ${y + h - 12} c -1 6 -3.5 9 -8 11 c 6 1.5 11 -0.5 14 -4 Z" fill="${fill}"/>`
      );
    parts.push(
      textBlock(lines, {
        x: x + PAD_X,
        y: bubbleBaseline(y, h - (metaInline ? 0 : 13), lines.length, LINE_H, FONT_SIZE),
        size: FONT_SIZE,
        lineHeight: LINE_H,
        color: c.bubbleText,
      })
    );

    const metaY = y + h - 7;
    const metaColor = mine ? c.metaOut : c.subtle;
    const timeX = mine ? x + w - 9 - 18 : x + w - 9;
    parts.push(
      `<text font-family="${font}" font-size="10.5" fill="${metaColor}" text-anchor="end" x="${timeX}" y="${metaY}">${esc(time)}</text>`,
      mine ? ticks(m.ticks ?? "read", x + w - 9, metaY, c.tick) : ""
    );

    y += h + (isTailEnd ? 9 : 3);
  }

  /* composer */
  const iy = SH - 62;
  parts.push(
    `<rect x="0" y="${iy - 10}" width="${SW}" height="${SH - iy + 10}" fill="${c.headerBg}"/>`,
    // paperclip
    `<path d="M${MARGIN + 12} ${iy + 10} l -7 8 a 6.5 6.5 0 0 0 10 8.5 l 9 -10.5 a 4.2 4.2 0 0 0 -6.4 -5.5 l -8.5 10" fill="none" stroke="${c.subtle}" stroke-width="1.8" stroke-linecap="round"/>`,
    glassPill(MARGIN + 34, iy + 3, SW - MARGIN * 2 - 34 - 32, 32, dark),
    `<text font-family="${font}" font-size="15" fill="${c.subtle}" x="${MARGIN + 48}" y="${iy + 24}">Message</text>`,
    // sticker toggle sits INSIDE the field's right edge; only mic outside
    `<circle cx="${SW - MARGIN - 48}" cy="${iy + 19}" r="8.5" fill="none" stroke="${c.subtle}" stroke-width="1.6"/>`,
    `<path d="M${SW - MARGIN - 52} ${iy + 21} a 5.5 5.5 0 0 0 8 0 M${SW - MARGIN - 51.5} ${iy + 16.5} h0.01 M${SW - MARGIN - 44.5} ${iy + 16.5} h0.01" stroke="${c.subtle}" stroke-width="1.6" stroke-linecap="round" fill="none"/>`,
    micIcon(SW - MARGIN - 10, iy + 18, 21, c.subtle),
    homeIndicator(c.text, platform)
  );

  return parts.join("\n");
}

function ticks(state: WhatsAppTicks, xRight: number, y: number, color: string): string {
  const tick = (dx: number) =>
    `<path d="M${xRight - 14 + dx} ${y - 4} l 2.6 2.8 5.4 -6" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  return state === "sent" ? tick(3) : tick(0) + tick(4.5);
}

function verifiedBadge(x: number, y: number): string {
  return `<circle cx="${x + 8}" cy="${y + 8}" r="8" fill="#3897f0"/><path d="M${x + 4.5} ${y + 8.5} l2.5 2.5 4.5 -5" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
}
