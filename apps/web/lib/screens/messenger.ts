"use client";

import {
  avatar,
  bubbleBaseline,
  esc,
  homeIndicator,
  imageBubble,
  phoneIcon,
  SH,
  statusBar,
  SW,
  textBlock as baseTextBlock,
  textWidth,
  typingDots,
  videoIcon,
  wrapText,
} from "./common";
import { fontFor } from "./fonts";
import type { MessengerDoc } from "./types";

/**
 * Facebook Messenger thread: blue→violet gradient outgoing bubbles, gray
 * incoming, reactions, Active-now header, "Aa" composer. Spec §2.6.
 */

const BUBBLE_MAX = 250;
const FONT_SIZE = 15.5;
const LINE_H = 20;
const PAD_X = 13;
const PAD_Y = 9;
const MARGIN = 14;

export function renderMessenger(
  doc: MessengerDoc,
  avatarUrl?: string,
  lookupUrl?: (id: string) => string | undefined
): string {
  const platform = doc.chrome.platform ?? "ios";
  const font = fontFor("messenger", platform);
  const textBlock = (lines: string[], o: Parameters<typeof baseTextBlock>[1]) =>
    baseTextBlock(lines, { font, ...o });
  const dark = !!doc.chrome.dark;
  const c = {
    bg: dark ? "#000000" : "#ffffff",
    text: dark ? "#e4e6eb" : "#050505",
    subtle: dark ? "#b0b3b8" : "#65676b",
    hairline: dark ? "#2f3031" : "#eeeff1",
    incoming: dark ? "#303030" : "#f0f0f0",
    incomingText: dark ? "#e4e6eb" : "#050505",
    blue: "#0084ff", // Messenger's solid blue (real app is not a gradient)
    green: "#31cc46",
  };

  const parts: string[] = [`<rect width="${SW}" height="${SH}" fill="${c.bg}"/>`];

  /* header */
  const HEADER_H = 104;
  parts.push(
    statusBar({ time: doc.chrome.time, battery: doc.chrome.battery, color: c.text, platform }),
    `<rect y="${HEADER_H - 0.5}" width="${SW}" height="0.5" fill="${c.hairline}"/>`,
    `<path d="M26 64 l-10 11 10 11" fill="none" stroke="${c.blue}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
    avatar(doc.contact, 58, 75, 18, "ms", avatarUrl),
    `<circle cx="71" cy="88" r="5.5" fill="${c.green}" stroke="${c.bg}" stroke-width="2"/>`,
    textBlock([doc.contact], { x: 86, y: 72, size: 15.5, lineHeight: 18, color: c.text, weight: 600 }),
    textBlock([doc.presence || "Active now"], { x: 86, y: 89, size: 11.5, lineHeight: 13, color: c.subtle }),
    phoneIcon(SW - 74, 75, 20, c.blue),
    videoIcon(SW - 34, 75, 25, c.blue)
  );

  /* messages */
  let y = HEADER_H + 20;
  const msgs = doc.messages;
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    const mine = m.from === "me";

    // centered timestamp separator ("2 MAY 2025 AT 21:40")
    if (m.dateLabel) {
      parts.push(
        `<text font-family="${font}" font-size="12" font-weight="600" fill="${c.subtle}" text-anchor="middle" x="${SW / 2}" y="${y + 6}">${esc(m.dateLabel)}</text>`
      );
      y += 26;
    }

    const imgUrl = m.image ? lookupUrl?.(m.image) : undefined;
    if (imgUrl) {
      const iw = 200, ih = 240;
      const ix = mine ? SW - MARGIN - iw : MARGIN + 30;
      parts.push(imageBubble(imgUrl, ix, y, iw, ih, `ms${i}`, { rx: 18 }));
      if (!mine && (i === msgs.length - 1 || msgs[i + 1].from !== "them"))
        parts.push(avatar(doc.contact, MARGIN + 12, y + ih - 11, 11, `msia${i}`, avatarUrl));
      y += ih + 8;
      if (!m.text) continue;
    }

    const lines = wrapText(m.text || " ", FONT_SIZE, BUBBLE_MAX - PAD_X * 2);
    const w = Math.min(BUBBLE_MAX, Math.max(...lines.map((l) => textWidth(l, FONT_SIZE))) + PAD_X * 2);
    const h = lines.length * LINE_H + PAD_Y * 2;
    const x = mine ? SW - MARGIN - w : MARGIN + 30;
    parts.push(
      `<rect x="${x}" y="${y}" width="${w.toFixed(1)}" height="${h}" rx="${Math.min(19, h / 2)}" fill="${mine ? c.blue : c.incoming}"/>`,
      textBlock(lines, {
        x: x + PAD_X,
        y: bubbleBaseline(y, h, lines.length, LINE_H, FONT_SIZE),
        size: FONT_SIZE,
        lineHeight: LINE_H,
        color: mine ? "#ffffff" : c.incomingText,
      })
    );
    if (!mine && (i === msgs.length - 1 || msgs[i + 1].from !== "them")) {
      parts.push(avatar(doc.contact, MARGIN + 12, y + h - 11, 11, `msm${i}`, avatarUrl));
    }
    let gap = 3;
    if (m.reaction) {
      const rx = mine ? x + 6 : x + w - 34;
      parts.push(
        `<rect x="${rx}" y="${y + h - 6}" width="28" height="22" rx="11" fill="${dark ? "#1a1a1a" : "#f1f1f1"}" stroke="${c.bg}" stroke-width="2"/>`,
        `<text font-size="12" x="${rx + 7}" y="${y + h + 10}">${esc(m.reaction)}</text>`
      );
      gap += 14;
    }
    y += h + (i < msgs.length - 1 && msgs[i + 1].from === m.from ? gap : gap + 7);
  }

  if (doc.chrome._anim?.typing) {
    const th = 38;
    parts.push(
      avatar(doc.contact, MARGIN + 12, y + th - 13, 11, "mst", avatarUrl),
      `<rect x="${MARGIN + 30}" y="${y}" width="62" height="${th}" rx="19" fill="${c.incoming}"/>`,
      typingDots(MARGIN + 48, y + th / 2, c.subtle, doc.chrome._anim.dotPhase ?? 0, 4, 11)
    );
  }

  /* composer — filled blue camera / photos / mic, "Aa" pill, blue thumbs-up */
  const iy = SH - 62;
  const pillX = MARGIN + 84;
  const pillW = SW - MARGIN - 34 - pillX;
  parts.push(
    // camera (filled)
    `<rect x="${MARGIN}" y="${iy + 10}" width="21" height="18" rx="6" fill="${c.blue}"/>`,
    `<circle cx="${MARGIN + 10.5}" cy="${iy + 19}" r="4" fill="none" stroke="#fff" stroke-width="1.6"/>`,
    // photos (filled)
    `<rect x="${MARGIN + 29}" y="${iy + 10}" width="21" height="18" rx="6" fill="${c.blue}"/>`,
    `<circle cx="${MARGIN + 35}" cy="${iy + 15.5}" r="1.8" fill="#fff"/><path d="M${MARGIN + 32} ${iy + 25} l4.5 -5 3.5 3.5 3 -3 3.5 3.5 v1 h-14.5 Z" fill="#fff"/>`,
    // mic (filled)
    `<rect x="${MARGIN + 60}" y="${iy + 9}" width="8" height="12" rx="4" fill="${c.blue}"/>`,
    `<path d="M${MARGIN + 57.5} ${iy + 19} a 6.5 6.5 0 0 0 13 0 M${MARGIN + 64} ${iy + 25.5} v3" fill="none" stroke="${c.blue}" stroke-width="1.9" stroke-linecap="round"/>`,
    // input pill with emoji at the right
    `<rect x="${pillX}" y="${iy + 6}" width="${pillW}" height="30" rx="15" fill="${c.incoming}"/>`,
    `<text font-family="${font}" font-size="14.5" fill="${c.subtle}" x="${pillX + 14}" y="${iy + 26}">Aa</text>`,
    `<circle cx="${pillX + pillW - 16}" cy="${iy + 21}" r="8" fill="none" stroke="${c.subtle}" stroke-width="1.6"/><path d="M${pillX + pillW - 20} ${iy + 23} a 5 5 0 0 0 8 0 M${pillX + pillW - 19} ${iy + 18.5} h0.01 M${pillX + pillW - 13} ${iy + 18.5} h0.01" stroke="${c.subtle}" stroke-width="1.6" stroke-linecap="round" fill="none"/>`,
    // thumbs up (blue)
    `<path d="M${SW - MARGIN - 22} ${iy + 18} v10 h-5 v-10 Z M${SW - MARGIN - 17} ${iy + 18} l 5.5 -9 c 3 1 4 3 3.2 6 l -1 3 h 6.5 c 2.4 0 3.6 1.6 3 4 l -1.6 6.5 c -0.5 2 -1.8 3 -4 3 h -11.6 Z" fill="${c.blue}"/>`,
    homeIndicator(c.text, platform)
  );

  return parts.join("\n");
}
