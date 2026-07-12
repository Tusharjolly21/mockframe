"use client";

import {
  avatar,
  bubbleBaseline,
  esc,
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
import type { LineDoc } from "./types";

/**
 * LINE (iOS/Android) chat: pale-blue default wallpaper, white incoming vs
 * LINE-green outgoing bubbles with a small tail, the time printed OUTSIDE the
 * bubble (LINE's signature), and a tiny "Read" caption on read outgoing
 * messages. "Aa" composer with +, camera, mic. §15.
 */

const BUBBLE_MAX = 250;
const FONT_SIZE = 15.5;
const LINE_H = 21;
const PAD_X = 13;
const PAD_Y = 9;
const MARGIN = 12;
const AVA = 15;
const GREEN = "#06c755";

export function renderLine(
  doc: LineDoc,
  avatarUrl?: string,
  lookupUrl?: (id: string) => string | undefined
): string {
  const platform = doc.chrome.platform ?? "ios";
  const font = fontFor("line", platform);
  const textBlock = (lines: string[], o: Parameters<typeof baseTextBlock>[1]) =>
    baseTextBlock(lines, { font, ...o });
  const dark = !!doc.chrome.dark;
  const c = {
    bg: dark ? "#1c1c1e" : "#8ca5cc", // LINE's default is a soft blue wallpaper
    header: dark ? "#101012" : "#ffffff",
    hairline: dark ? "#2a2a2c" : "#e6e6e6",
    headText: dark ? "#f2f2f2" : "#1a1a1a",
    headSub: dark ? "#9a9aa2" : "#8a8a90",
    incoming: dark ? "#2c2c2e" : "#ffffff",
    incomingText: dark ? "#f2f2f2" : "#1a1a1a",
    outgoingText: "#0a2e14",
    meta: dark ? "#c7cdd6" : "#eef2f7",
  };

  const parts: string[] = [`<rect width="${SW}" height="${SH}" fill="${c.bg}"/>`];

  /* header */
  const HEADER_H = 100;
  parts.push(
    `<rect width="${SW}" height="${HEADER_H}" fill="${c.header}"/>`,
    `<rect y="${HEADER_H - 0.5}" width="${SW}" height="0.5" fill="${c.hairline}"/>`,
    statusBar({ time: doc.chrome.time, battery: doc.chrome.battery, color: c.headText, platform }),
    `<path d="M24 62 l-10 11 10 11" fill="none" stroke="${c.headText}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<text font-family="${font}" font-size="17" font-weight="700" fill="${c.headText}" x="48" y="${doc.presence ? 72 : 80}">${esc(doc.contact)}</text>`,
    doc.presence
      ? `<text font-family="${font}" font-size="11.5" fill="${c.headSub}" x="48" y="88">${esc(doc.presence)}</text>`
      : "",
    // right icons: phone, video, menu (three lines)
    lineHeadPhone(SW - 108, 73, c.headText),
    lineHeadVideo(SW - 68, 73, c.headText),
    `<path d="M${SW - 34} 68 h16 M${SW - 34} 74 h16 M${SW - 34} 80 h16" stroke="${c.headText}" stroke-width="2" stroke-linecap="round"/>`
  );

  /* messages */
  const time = doc.chrome.time || "9:41";
  let y = HEADER_H + 16;
  const msgs = doc.messages;
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    const mine = m.from === "me";
    const grouped = i > 0 && msgs[i - 1].from === m.from;

    if (m.image && lookupUrl) {
      const url = lookupUrl(m.image);
      if (url) {
        const iw = 190;
        const ih = 150;
        const x = mine ? SW - MARGIN - iw : MARGIN + (grouped ? 0 : AVA * 2 + 8);
        if (!mine && !grouped) parts.push(avatar(doc.contact, MARGIN + AVA, y + AVA, AVA, "ln", avatarUrl));
        parts.push(imageBubble(url, x, y, iw, ih, `ln${i}`, { rx: 16, font }));
        const capX = mine ? x - 6 : x + iw + 6;
        parts.push(metaCol(m, mine, capX, y + ih, c, font, time));
        y += ih + (i < msgs.length - 1 && msgs[i + 1].from === m.from ? 4 : 10);
        continue;
      }
    }

    const lines = wrapText(m.text || " ", FONT_SIZE, BUBBLE_MAX - PAD_X * 2);
    const w = Math.min(BUBBLE_MAX, Math.max(...lines.map((l) => textWidth(l, FONT_SIZE))) + PAD_X * 2);
    const h = lines.length * LINE_H + PAD_Y * 2;
    const x = mine ? SW - MARGIN - w : MARGIN + (grouped ? 0 : AVA * 2 + 8);

    if (!mine && !grouped) parts.push(avatar(doc.contact, MARGIN + AVA, y + AVA, AVA, "ln", avatarUrl));

    const fill = mine ? GREEN : c.incoming;
    // little bubble tail
    const tail = mine
      ? `<path d="M${x + w} ${y + 12} l8 3 -8 6 Z" fill="${fill}"/>`
      : `<path d="M${x} ${y + 12} l-8 3 8 6 Z" fill="${fill}"/>`;
    parts.push(
      tail,
      `<rect x="${x}" y="${y}" width="${w.toFixed(1)}" height="${h}" rx="15" fill="${fill}"${!mine && !dark ? ` stroke="#e9e9ec" stroke-width="1"` : ""}/>`,
      textBlock(lines, {
        x: x + PAD_X,
        y: bubbleBaseline(y, h, lines.length, LINE_H, FONT_SIZE),
        size: FONT_SIZE,
        lineHeight: LINE_H,
        color: mine ? c.outgoingText : c.incomingText,
      })
    );
    const capX = mine ? x - 6 : x + w + 6;
    parts.push(metaCol(m, mine, capX, y + h, c, font));
    y += h + (i < msgs.length - 1 && msgs[i + 1].from === m.from ? 4 : 10);
  }

  /* composer */
  const iy = SH - 62;
  parts.push(
    `<rect x="0" y="${iy - 14}" width="${SW}" height="${SH - iy + 14}" fill="${c.header}"/>`,
    `<path d="M${MARGIN + 9} ${iy + 12} v14 M${MARGIN + 2} ${iy + 19} h14" stroke="${c.headSub}" stroke-width="2" stroke-linecap="round"/>`,
    // camera
    `<rect x="${MARGIN + 32}" y="${iy + 11}" width="18" height="14" rx="4" fill="none" stroke="${c.headSub}" stroke-width="1.8"/><circle cx="${MARGIN + 41}" cy="${iy + 18}" r="3.4" fill="none" stroke="${c.headSub}" stroke-width="1.6"/>`,
    `<rect x="${MARGIN + 60}" y="${iy + 3}" width="${SW - MARGIN * 2 - 60 - 66}" height="32" rx="16" fill="${dark ? "#2c2c2e" : "#f0f0f2"}"/>`,
    `<text font-family="${font}" font-size="14.5" fill="${c.headSub}" x="${MARGIN + 76}" y="${iy + 24}">Aa</text>`,
    // emoji + mic
    `<circle cx="${SW - 54}" cy="${iy + 19}" r="8.5" fill="none" stroke="${c.headSub}" stroke-width="1.6"/><path d="M${SW - 58} ${iy + 21} a5 5 0 0 0 8 0 M${SW - 57} ${iy + 16.5} h0.01 M${SW - 51} ${iy + 16.5} h0.01" stroke="${c.headSub}" stroke-width="1.6" stroke-linecap="round" fill="none"/>`,
    micIcon(SW - 28, iy + 19, 20, c.headSub),
    homeIndicator(c.headText, platform)
  );

  return parts.join("\n");
}

/** time (+ "Read") printed outside the bubble, LINE-style. Anchored so the
 *  column hugs the bubble edge (right-anchored for mine, left for theirs). */
function metaCol(
  m: { read?: boolean },
  mine: boolean,
  x: number,
  bottom: number,
  c: { meta: string },
  font: string,
  time = "9:41"
): string {
  const anchor = mine ? "end" : "start";
  const rows: string[] = [];
  if (mine && m.read) rows.push("Read");
  rows.push(time);
  return rows
    .map(
      (t, i) =>
        `<text font-family="${font}" font-size="10" fill="${c.meta}" text-anchor="${anchor}" x="${x}" y="${bottom - (rows.length - 1 - i) * 12}">${esc(t)}</text>`
    )
    .join("");
}

function lineHeadPhone(x: number, y: number, color: string): string {
  return `<path d="M${x} ${y + 2} q0 -2 2 -2 l3 0 q2 0 2.6 2 l0.8 3 q0.4 2 -1.2 3 l-1.6 1 q1.8 4 5.6 5.6 l1 -1.6 q1 -1.6 3 -1.2 l3 0.8 q2 0.6 2 2.6 l0 3 q0 2 -2 2 q-12 0 -19 -19 Z" fill="none" stroke="${color}" stroke-width="1.7" stroke-linejoin="round"/>`;
}
function lineHeadVideo(x: number, y: number, color: string): string {
  return `<rect x="${x}" y="${y + 3}" width="17" height="13" rx="3" fill="none" stroke="${color}" stroke-width="1.8"/><path d="M${x + 17} ${y + 7} l6 -3 v11 l-6 -3 Z" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round"/>`;
}
