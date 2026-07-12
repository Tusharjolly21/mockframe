"use client";

import {
  avatar,
  bubbleBaseline,
  esc,
  homeIndicator,
  micIcon,
  phoneIcon,
  SH,
  statusBar,
  SW,
  textBlock as baseTextBlock,
  textWidth,
  videoIcon,
  wrapText,
} from "./common";
import { fontFor } from "./fonts";
import type { SignalDoc, WhatsAppTicks } from "./types";

/**
 * Signal (iOS/Android) chat: clean white/dark surface, gray incoming vs
 * Signal-blue outgoing bubbles, in-bubble time + delivery ticks, "Signal
 * message" composer. §15.
 */

const BUBBLE_MAX = 262;
const FONT_SIZE = 16;
const LINE_H = 21;
const PAD_X = 12;
const PAD_Y = 8;
const MARGIN = 14;
const BLUE = "#3a76f0";

export function renderSignal(doc: SignalDoc, avatarUrl?: string): string {
  const platform = doc.chrome.platform ?? "ios";
  const font = fontFor("signal", platform);
  const textBlock = (lines: string[], o: Parameters<typeof baseTextBlock>[1]) =>
    baseTextBlock(lines, { font, ...o });
  const dark = !!doc.chrome.dark;
  const c = {
    bg: dark ? "#000000" : "#ffffff",
    headerBg: dark ? "#1b1b1b" : "#f7f7f7",
    hairline: dark ? "#2a2a2a" : "#e4e4e4",
    text: dark ? "#ffffff" : "#000000",
    subtle: dark ? "#8e8e93" : "#6b6b70",
    incoming: dark ? "#2c2c2e" : "#ececed",
    incomingText: dark ? "#ffffff" : "#111111",
  };

  const parts: string[] = [`<rect width="${SW}" height="${SH}" fill="${c.bg}"/>`];

  /* header */
  const HEADER_H = 100;
  parts.push(
    `<rect width="${SW}" height="${HEADER_H}" fill="${c.headerBg}"/>`,
    `<rect y="${HEADER_H - 0.5}" width="${SW}" height="0.5" fill="${c.hairline}"/>`,
    statusBar({ time: doc.chrome.time, battery: doc.chrome.battery, color: c.text, platform }),
    `<path d="M24 62 l-10 11 10 11" fill="none" stroke="${BLUE}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`,
    avatar(doc.contact, 54, 74, 17, "sg", avatarUrl),
    `<text font-family="${font}" font-size="16" font-weight="600" fill="${c.text}" x="80" y="72">${esc(doc.contact)}</text>`,
    doc.presence
      ? `<text font-family="${font}" font-size="12" fill="${c.subtle}" x="80" y="88">${esc(doc.presence)}</text>`
      : "",
    videoIcon(SW - 76, 74, 24, BLUE),
    phoneIcon(SW - 34, 74, 20, BLUE)
  );

  /* messages */
  const time = doc.chrome.time || "9:41";
  let y = HEADER_H + 18;
  const msgs = doc.messages;
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    const mine = m.from === "me";
    const lines = wrapText(m.text || " ", FONT_SIZE, BUBBLE_MAX - PAD_X * 2);
    const w = Math.min(BUBBLE_MAX, Math.max(...lines.map((l) => textWidth(l, FONT_SIZE))) + PAD_X * 2);
    const h = lines.length * LINE_H + PAD_Y * 2 + 12; // room for the time line
    const x = mine ? SW - MARGIN - w : MARGIN;
    const fill = mine ? BLUE : c.incoming;
    parts.push(
      `<rect x="${x}" y="${y}" width="${w.toFixed(1)}" height="${h}" rx="17" fill="${fill}"/>`,
      textBlock(lines, {
        x: x + PAD_X,
        y: bubbleBaseline(y, h - 12, lines.length, LINE_H, FONT_SIZE),
        size: FONT_SIZE,
        lineHeight: LINE_H,
        color: mine ? "#ffffff" : c.incomingText,
      })
    );
    const metaColor = mine ? "rgba(255,255,255,0.75)" : c.subtle;
    parts.push(
      `<text font-family="${font}" font-size="10.5" fill="${metaColor}" text-anchor="end" x="${x + w - (mine ? 22 : 10)}" y="${y + h - 8}">${esc(time)}</text>`,
      mine ? ticks(m.ticks ?? "read", x + w - 8, y + h - 8) : ""
    );
    y += h + (i < msgs.length - 1 && msgs[i + 1].from === m.from ? 3 : 9);
  }

  /* composer */
  const iy = SH - 62;
  parts.push(
    `<path d="M${MARGIN + 8} ${iy + 12} v14 M${MARGIN + 1} ${iy + 19} h14" stroke="${c.subtle}" stroke-width="2" stroke-linecap="round"/>`,
    `<rect x="${MARGIN + 34}" y="${iy + 3}" width="${SW - MARGIN * 2 - 34 - 60}" height="32" rx="16" fill="${dark ? "#1c1c1c" : "#f0f0f0"}"/>`,
    `<text font-family="${font}" font-size="15" fill="${c.subtle}" x="${MARGIN + 48}" y="${iy + 24}">Signal message</text>`,
    // camera + mic
    `<rect x="${SW - MARGIN - 54}" y="${iy + 11}" width="18" height="14" rx="4" fill="none" stroke="${c.subtle}" stroke-width="1.8"/><circle cx="${SW - MARGIN - 45}" cy="${iy + 18}" r="3.4" fill="none" stroke="${c.subtle}" stroke-width="1.6"/>`,
    micIcon(SW - MARGIN - 14, iy + 18, 20, c.subtle),
    homeIndicator(c.text, platform)
  );

  return parts.join("\n");
}

function ticks(state: WhatsAppTicks, xRight: number, y: number): string {
  const col = "rgba(255,255,255,0.85)";
  const tick = (dx: number) =>
    `<path d="M${xRight - 12 + dx} ${y - 3.5} l 2.2 2.4 4.8 -5.4" fill="none" stroke="${col}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>`;
  return state === "sent" ? tick(2.5) : tick(0) + tick(4);
}
