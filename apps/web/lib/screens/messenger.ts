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
    blue: "#0084ff",
    green: "#31cc46",
  };

  const parts: string[] = [
    `<rect width="${SW}" height="${SH}" fill="${c.bg}"/>`,
    // Sent bubbles use Messenger's default theme: a viewport-fixed vertical
    // gradient (violet at the top of the screen → blue lower down), so each
    // bubble shows a different slice. Flat #0084ff reads as the old app.
    `<defs><linearGradient id="fk_msgr_grad" gradientUnits="userSpaceOnUse" x1="0" y1="100" x2="0" y2="${SH}"><stop offset="0" stop-color="#6e52ff"/><stop offset="0.55" stop-color="#2f6bff"/><stop offset="1" stop-color="#0084ff"/></linearGradient></defs>`,
  ];
  const sentFill = "url(#fk_msgr_grad)";

  /* header */
  const HEADER_H = 104;
  parts.push(
    statusBar({ time: doc.chrome.time, battery: doc.chrome.battery, color: c.text, platform }),
    `<rect y="${HEADER_H - 0.5}" width="${SW}" height="0.5" fill="${c.hairline}"/>`,
    `<path d="M26 64 l-10 11 10 11" fill="none" stroke="${c.blue}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
    avatar(doc.contact, 58, 75, 18, "ms", avatarUrl),
    `<circle cx="71" cy="88" r="5.5" fill="${c.green}" stroke="${c.bg}" stroke-width="2"/>`,
    textBlock([doc.contact], { x: 86, y: 72, size: 15.5, lineHeight: 18, color: c.text, weight: 600 }),
    doc.verified
      ? verifiedBadge(86 + textWidth(doc.contact, 15.5) + 5, 72 - 13, c.blue)
      : `<path d="M${86 + textWidth(doc.contact, 15.5) + 7} 62 l4.5 5 -4.5 5" fill="none" stroke="${c.subtle}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`,
    textBlock([doc.presence || "Active now"], { x: 86, y: 89, size: 11.5, lineHeight: 13, color: c.subtle }),
    phoneIcon(SW - 74, 75, 20, c.blue),
    videoIcon(SW - 34, 75, 25, c.blue)
  );

  /* messages */
  let y = HEADER_H + 20;
  let lastMineBottom: { x: number; y: number } | null = null;
  const msgs = doc.messages;
  // centered small-caps time separator, like the real thread
  if (msgs.length && !msgs[0].dateLabel) {
    parts.push(
      `<text font-family="${font}" font-size="11.5" font-weight="600" letter-spacing="0.3" fill="${c.subtle}" text-anchor="middle" x="${SW / 2}" y="${y + 4}">TODAY ${esc((doc.chrome.time || "9:41").toUpperCase())} AM</text>`
    );
    y += 26;
  }
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
      `<rect x="${x}" y="${y}" width="${w.toFixed(1)}" height="${h}" rx="${Math.min(19, h / 2)}" fill="${mine ? sentFill : c.incoming}"/>`,
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
    if (mine) lastMineBottom = { x: SW - MARGIN, y: y + h };
    y += h + (i < msgs.length - 1 && msgs[i + 1].from === m.from ? gap : gap + 7);
  }

  // seen receipt: a mini avatar thumb under the last sent message
  if (lastMineBottom && msgs.at(-1)?.from === "me" && !doc.chrome._anim?.typing) {
    parts.push(avatar(doc.contact, lastMineBottom.x - 7, lastMineBottom.y + 11, 7, "msseen", avatarUrl));
  }

  if (doc.chrome._anim?.typing) {
    const th = 38;
    parts.push(
      avatar(doc.contact, MARGIN + 12, y + th - 13, 11, "mst", avatarUrl),
      `<rect x="${MARGIN + 30}" y="${y}" width="62" height="${th}" rx="19" fill="${c.incoming}"/>`,
      typingDots(MARGIN + 48, y + th / 2, c.subtle, doc.chrome._anim.dotPhase ?? 0, 4, 11)
    );
  }

  /* composer — real left set is FOUR blue glyphs: ⊞ apps grid, camera,
     gallery, mic — then the "Aa" pill and thumbs-up */
  const iy = SH - 62;
  const pillX = MARGIN + 106;
  const pillW = SW - MARGIN - 34 - pillX;
  const dotGrid = (gx: number, gy: number) =>
    [0, 1].flatMap((r) => [0, 1].map((col) => `<circle cx="${gx + col * 8}" cy="${gy + r * 8}" r="2.6" fill="${c.blue}"/>`)).join("");
  parts.push(
    // apps grid (4 dots)
    dotGrid(MARGIN + 4, iy + 15),
    // camera (outline glyph, blue)
    `<path d="M${MARGIN + 27} ${iy + 13} l2.5 -3.5 h7 l2.5 3.5" fill="none" stroke="${c.blue}" stroke-width="1.8" stroke-linejoin="round"/>`,
    `<rect x="${MARGIN + 24}" y="${iy + 13}" width="21" height="15" rx="4" fill="none" stroke="${c.blue}" stroke-width="1.9"/>`,
    `<circle cx="${MARGIN + 34.5}" cy="${iy + 20.5}" r="4" fill="none" stroke="${c.blue}" stroke-width="1.7"/>`,
    // gallery (photo glyph, blue)
    `<rect x="${MARGIN + 54}" y="${iy + 11}" width="19" height="17" rx="4" fill="none" stroke="${c.blue}" stroke-width="1.9"/>`,
    `<circle cx="${MARGIN + 59.5}" cy="${iy + 16.5}" r="1.8" fill="${c.blue}"/><path d="M${MARGIN + 56} ${iy + 26} l4.5 -5 3.5 3.5 3 -3 3.5 3.5" fill="none" stroke="${c.blue}" stroke-width="1.7" stroke-linejoin="round"/>`,
    // mic (blue)
    `<rect x="${MARGIN + 83}" y="${iy + 10}" width="8" height="12" rx="4" fill="none" stroke="${c.blue}" stroke-width="1.9"/>`,
    `<path d="M${MARGIN + 80} ${iy + 19} a 7 7 0 0 0 14 0 M${MARGIN + 87} ${iy + 26} v3" fill="none" stroke="${c.blue}" stroke-width="1.9" stroke-linecap="round"/>`,
    // input pill with emoji at the right
    `<rect x="${pillX}" y="${iy + 6}" width="${pillW}" height="30" rx="15" fill="${c.incoming}"/>`,
    `<text font-family="${font}" font-size="14.5" fill="${c.subtle}" x="${pillX + 14}" y="${iy + 26}">Aa</text>`,
    `<circle cx="${pillX + pillW - 16}" cy="${iy + 21}" r="8" fill="none" stroke="${c.subtle}" stroke-width="1.6"/><path d="M${pillX + pillW - 20} ${iy + 23} a 5 5 0 0 0 8 0 M${pillX + pillW - 19} ${iy + 18.5} h0.01 M${pillX + pillW - 13} ${iy + 18.5} h0.01" stroke="${c.subtle}" stroke-width="1.6" stroke-linecap="round" fill="none"/>`,
    // thumbs up (clean filled thumb)
    `<path d="M${SW - MARGIN - 26} ${iy + 17.5} h4 v11 h-4 Z M${SW - MARGIN - 20} ${iy + 28.5} v-10.5 l5 -8.5 c 2.6 0.6 3.7 2.4 3.1 5l-0.9 3.5 h5.8 c 2.2 0 3.4 1.5 2.9 3.6 l-1.3 5.2 c -0.4 1.6 -1.6 2.5 -3.3 2.5 Z" fill="${c.blue}"/>`,
    homeIndicator(c.text, platform)
  );

  return parts.join("\n");
}

function verifiedBadge(x: number, y: number, color: string): string {
  return `<circle cx="${x + 7}" cy="${y + 7}" r="7" fill="${color}"/><path d="M${x + 4} ${y + 7.5} l2 2 4 -4" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
}
