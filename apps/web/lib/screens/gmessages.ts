"use client";

import {
  ANDROID_FONT,
  avatar,
  bubbleBaseline,
  esc,
  homeIndicator,
  phoneIcon,
  scrollBody,
  SH,
  statusBar,
  SW,
  textBlock as baseTextBlock,
  textWidth,
  typingDots,
  videoIcon,
  wrapText,
} from "./common";
import type { GMessagesDoc } from "./types";

/**
 * Google Messages (Android, RCS) conversation in Material You: a tonal
 * surface, light-grey incoming vs blue primary-container outgoing bubbles
 * whose inner corners tighten when consecutive, a "Delivered/Read" receipt
 * under the latest sent message, and the pill composer with the round mic
 * button.
 */

const BUBBLE_MAX = 268;
const FONT_SIZE = 16;
const LINE_H = 21;
const PAD_X = 14;
const PAD_Y = 10;
const MARGIN = 14;
const HEADER_H = 104;
const COMPOSER_Y = SH - 76;

export function renderGMessages(doc: GMessagesDoc, avatarUrl?: string): string {
  const platform = "android" as const;
  const font = ANDROID_FONT;
  const textBlock = (lines: string[], o: Parameters<typeof baseTextBlock>[1]) => baseTextBlock(lines, { font, ...o });
  const dark = !!doc.chrome.dark;
  const c = {
    bg: dark ? "#131316" : "#fbf8fd",
    text: dark ? "#e4e1e6" : "#1b1b1f",
    subtle: dark ? "#c6c5d0" : "#46464f",
    faint: dark ? "#90909a" : "#77767f",
    incoming: dark ? "#2a2a30" : "#ececf4",
    incomingText: dark ? "#e4e1e6" : "#1b1b1f",
    outgoing: dark ? "#004a77" : "#d3e3fd",
    outgoingText: dark ? "#d3e3fd" : "#041e49",
    accent: dark ? "#a8c7fa" : "#0b57d0",
    pill: dark ? "#2a2a30" : "#ececf4",
  };

  const parts: string[] = [`<rect width="${SW}" height="${SH}" fill="${c.bg}"/>`];

  /* messages (laid out first so the body can scroll under the header) */
  const body: string[] = [];
  let y = HEADER_H + 22;
  body.push(
    `<text font-family="${font}" font-size="12" fill="${c.faint}" text-anchor="middle" x="${SW / 2}" y="${y}">RCS chat with ${esc(doc.contact)}</text>`,
    `<text font-family="${font}" font-size="11.5" fill="${c.faint}" text-anchor="middle" x="${SW / 2}" y="${y + 18}">🔒 End-to-end encrypted</text>`
  );
  y += 40;
  const msgs = doc.messages;
  const lastMine = msgs.map((m) => m.from).lastIndexOf("me");
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    if (m.dateLabel) {
      body.push(`<text font-family="${font}" font-size="12" font-weight="500" fill="${c.faint}" text-anchor="middle" x="${SW / 2}" y="${y + 6}">${esc(m.dateLabel)}</text>`);
      y += 26;
    }
    const mine = m.from === "me";
    const prevSame = i > 0 && msgs[i - 1].from === m.from;
    const nextSame = i < msgs.length - 1 && msgs[i + 1].from === m.from;
    const lines = wrapText(m.text || " ", FONT_SIZE, BUBBLE_MAX - PAD_X * 2);
    const w = Math.min(BUBBLE_MAX, Math.max(...lines.map((l) => textWidth(l, FONT_SIZE))) + PAD_X * 2);
    const h = lines.length * LINE_H + PAD_Y * 2;
    const avatarGap = mine ? 0 : 40;
    const x = mine ? SW - MARGIN - w : MARGIN + avatarGap;
    // Material grouping: outer corners stay 20, the inner side tightens to 4
    const R = 20, r = 5;
    const radii = mine
      ? { tl: R, tr: prevSame ? r : R, br: nextSame ? r : R, bl: R }
      : { tl: prevSame ? r : R, tr: R, br: R, bl: nextSame ? r : R };
    body.push(
      `<path d="${roundRect(x, y, w, h, radii)}" fill="${mine ? c.outgoing : c.incoming}"/>`,
      textBlock(lines, {
        x: x + PAD_X,
        y: bubbleBaseline(y, h, lines.length, LINE_H, FONT_SIZE),
        size: FONT_SIZE,
        lineHeight: LINE_H,
        color: mine ? c.outgoingText : c.incomingText,
      })
    );
    if (!mine && !nextSame) body.push(avatar(doc.contact, MARGIN + 16, y + h - 16, 16, `gm${i}`, avatarUrl));
    if (m.reaction) {
      const rx = mine ? x + 8 : x + w - 30;
      body.push(
        `<rect x="${rx}" y="${y + h - 6}" width="30" height="22" rx="11" fill="${c.bg}" stroke="${c.incoming}" stroke-width="1.5"/>`,
        `<text font-size="13" text-anchor="middle" x="${rx + 15}" y="${y + h + 10}">${esc(m.reaction)}</text>`
      );
      y += 14;
    }
    y += h + (nextSame ? 3 : 14);
    if (i === lastMine) {
      const status = m.status ?? "Read";
      body.push(`<text font-family="${font}" font-size="11.5" fill="${c.faint}" text-anchor="end" x="${SW - MARGIN - 4}" y="${y - 2}">${esc(doc.chrome.time || "9:41")} · ${esc(status)}</text>`);
      y += 14;
    }
  }
  if (doc.chrome._anim?.typing) {
    body.push(
      avatar(doc.contact, MARGIN + 16, y + 18, 16, "gmt", avatarUrl),
      `<rect x="${MARGIN + 40}" y="${y}" width="62" height="36" rx="18" fill="${c.incoming}"/>`,
      typingDots(MARGIN + 71, y + 18, c.faint, doc.chrome._anim.dotPhase ?? 0, 3.6, 12)
    );
    y += 44;
  }
  parts.push(scrollBody(body.join("\n"), { top: HEADER_H, bottom: COMPOSER_Y - 10, contentBottom: y }));

  /* header */
  parts.push(
    `<rect width="${SW}" height="${HEADER_H}" fill="${c.bg}"/>`,
    statusBar({ time: doc.chrome.time, battery: doc.chrome.battery, color: c.text, platform }),
    `<path d="M30 76 h-16 M20 69 l-7 7 7 7" fill="none" stroke="${c.text}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
    avatar(doc.contact, 62, 76, 18, "gmh", avatarUrl),
    `<text font-family="${font}" font-size="19" fill="${c.text}" x="90" y="${doc.presence ? 73 : 82}">${esc(doc.contact)}</text>`,
    doc.presence ? `<text font-family="${font}" font-size="12.5" fill="${c.subtle}" x="90" y="91">${esc(doc.presence)}</text>` : "",
    videoIcon(SW - 104, 76, 24, c.subtle),
    phoneIcon(SW - 62, 76, 21, c.subtle),
    `<g fill="${c.subtle}"><circle cx="${SW - 24}" cy="69" r="2.2"/><circle cx="${SW - 24}" cy="76" r="2.2"/><circle cx="${SW - 24}" cy="83" r="2.2"/></g>`
  );

  /* composer: + / pill (emoji · RCS message · gallery) / mic */
  const iy = COMPOSER_Y;
  parts.push(
    `<rect y="${iy - 10}" width="${SW}" height="${SH - iy + 10}" fill="${c.bg}"/>`,
    `<circle cx="${MARGIN + 20}" cy="${iy + 24}" r="20" fill="${c.pill}"/>`,
    `<path d="M${MARGIN + 20} ${iy + 16} v16 M${MARGIN + 12} ${iy + 24} h16" stroke="${c.subtle}" stroke-width="2.2" stroke-linecap="round"/>`,
    `<rect x="${MARGIN + 48}" y="${iy + 2}" width="${SW - MARGIN * 2 - 48 - 56}" height="44" rx="22" fill="${c.pill}"/>`,
    `<circle cx="${MARGIN + 72}" cy="${iy + 24}" r="9.5" fill="none" stroke="${c.subtle}" stroke-width="1.8"/>`,
    `<path d="M${MARGIN + 67.5} ${iy + 26} a5 5 0 0 0 9 0 M${MARGIN + 68.5} ${iy + 21} h0.01 M${MARGIN + 75.5} ${iy + 21} h0.01" stroke="${c.subtle}" stroke-width="1.8" stroke-linecap="round" fill="none"/>`,
    `<text font-family="${font}" font-size="15.5" fill="${c.faint}" x="${MARGIN + 92}" y="${iy + 29.5}">RCS message</text>`,
    `<rect x="${SW - MARGIN - 56 - 36}" y="${iy + 15}" width="18" height="18" rx="4" fill="none" stroke="${c.subtle}" stroke-width="1.8"/>`,
    `<path d="M${SW - MARGIN - 92 + 2} ${iy + 30} l5 -6 4 4 3 -3 4 5" fill="none" stroke="${c.subtle}" stroke-width="1.6" stroke-linejoin="round"/>`,
    `<circle cx="${SW - MARGIN - 22}" cy="${iy + 24}" r="22" fill="${c.outgoing}"/>`,
    `<rect x="${SW - MARGIN - 26}" y="${iy + 13}" width="8" height="14" rx="4" fill="${c.outgoingText}"/>`,
    `<path d="M${SW - MARGIN - 30} ${iy + 23} a8 8 0 0 0 16 0 M${SW - MARGIN - 22} ${iy + 31} v4" fill="none" stroke="${c.outgoingText}" stroke-width="1.8" stroke-linecap="round"/>`,
    homeIndicator(c.text, platform)
  );

  return parts.join("\n");
}

function roundRect(x: number, y: number, w: number, h: number, r: { tl: number; tr: number; br: number; bl: number }): string {
  const cap = (v: number) => Math.min(v, h / 2, w / 2);
  const tl = cap(r.tl), tr = cap(r.tr), br = cap(r.br), bl = cap(r.bl);
  return [
    `M${x + tl} ${y}`,
    `H${x + w - tr}`,
    `A${tr} ${tr} 0 0 1 ${x + w} ${y + tr}`,
    `V${y + h - br}`,
    `A${br} ${br} 0 0 1 ${x + w - br} ${y + h}`,
    `H${x + bl}`,
    `A${bl} ${bl} 0 0 1 ${x} ${y + h - bl}`,
    `V${y + tl}`,
    `A${tl} ${tl} 0 0 1 ${x + tl} ${y}`,
    "Z",
  ].join(" ");
}
