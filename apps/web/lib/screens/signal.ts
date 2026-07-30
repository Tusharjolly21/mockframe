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
const BLUE = "#2267f5"; // Signal ultramarine (sampled from current iOS builds)

/* Signal initials avatars are flat muted pastels with darker same-hue
   initials — not white-on-gradient. */
const SIGNAL_AVATAR_COLORS: Array<[string, string]> = [
  ["#d2e4fd", "#316bc2"],
  ["#d7f2dc", "#2e7d46"],
  ["#f5d7e5", "#b0447c"],
  ["#efe2fd", "#7a4fb5"],
  ["#fde8d3", "#b26b2c"],
];
function signalAvatar(name: string, cx: number, cy: number, r: number, url?: string, id = "sgav"): string {
  if (url) return avatar(name, cx, cy, r, id, url);
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const [bg, fg] = SIGNAL_AVATAR_COLORS[h % SIGNAL_AVATAR_COLORS.length];
  const init = name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${bg}"/>` +
    `<text font-family="ui-sans-serif, -apple-system, sans-serif" font-size="${r * 0.85}" font-weight="600" fill="${fg}" text-anchor="middle" x="${cx}" y="${cy + r * 0.32}">${esc(init)}</text>`
  );
}

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
    // nav icons are black in light mode (blue is a WhatsApp-ism here)
    `<path d="M24 62 l-10 11 10 11" fill="none" stroke="${c.text}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
    signalAvatar(doc.contact, 54, 74, 17, avatarUrl, "sg"),
    `<text font-family="${font}" font-size="16" font-weight="600" fill="${c.text}" x="80" y="72">${esc(doc.contact)}</text>`,
    doc.presence
      ? `<text font-family="${font}" font-size="12" fill="${c.subtle}" x="80" y="88">${esc(doc.presence)}</text>`
      : "",
    videoIcon(SW - 76, 74, 24, c.text),
    phoneIcon(SW - 34, 74, 20, c.text)
  );

  /* messages */
  const time = doc.chrome.time || "9:41";
  let y = HEADER_H + 20;
  parts.push(
    `<text font-family="${font}" font-size="11.5" font-weight="600" fill="${c.subtle}" text-anchor="middle" x="${SW / 2}" y="${y}">Today</text>`
  );
  y += 18;
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
    `<text font-family="${font}" font-size="15" fill="${c.subtle}" x="${MARGIN + 48}" y="${iy + 24}">Message</text>`,
    // sticker toggle inside the field's right edge
    `<rect x="${SW - MARGIN - 88}" y="${iy + 11}" width="15" height="15" rx="4" fill="none" stroke="${c.subtle}" stroke-width="1.5"/><path d="M${SW - MARGIN - 80.5} ${iy + 26} a 7.5 7.5 0 0 0 7.5 -7.5" fill="none" stroke="${c.subtle}" stroke-width="1.5"/>`,
    // camera + mic
    `<rect x="${SW - MARGIN - 54}" y="${iy + 11}" width="18" height="14" rx="4" fill="none" stroke="${c.subtle}" stroke-width="1.8"/><circle cx="${SW - MARGIN - 45}" cy="${iy + 18}" r="3.4" fill="none" stroke="${c.subtle}" stroke-width="1.6"/>`,
    micIcon(SW - MARGIN - 14, iy + 18, 20, c.subtle),
    homeIndicator(c.text, platform)
  );

  return parts.join("\n");
}

/* Signal's own delivery glyphs: check-in-circle — sent = one outlined,
   delivered = two overlapping outlined, read = filled. WhatsApp-style
   slanted double checks instantly read as fake on a Signal screen. */
function ticks(state: WhatsAppTicks, xRight: number, y: number): string {
  const col = "rgba(255,255,255,0.85)";
  const circle = (cx: number, filled: boolean) =>
    `<circle cx="${cx}" cy="${y - 3.5}" r="4.4" fill="${filled ? col : "none"}" stroke="${col}" stroke-width="1.1"/>` +
    `<path d="M${cx - 2} ${y - 3.5} l 1.4 1.6 2.8 -3.2" fill="none" stroke="${filled ? "#2b6be4" : col}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (state === "sent") return circle(xRight - 6, false);
  if (state === "delivered") return circle(xRight - 10, false) + circle(xRight - 4, false);
  return circle(xRight - 10, true) + circle(xRight - 4, true);
}
