"use client";

import {
  avatar,
  bubbleBaseline,
  esc,
  fileCard,
  linkCard,
  glassPill,
  homeIndicator,
  micIcon,
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
import type { IMessageDoc } from "./types";

/**
 * iOS Messages conversation view. Fidelity targets per spec §2.3: centered
 * avatar header, blue/green vs gray bubbles with tails, grouped spacing,
 * Delivered/Read caption, 3-dot typing bubble, input bar, home indicator.
 */

const BUBBLE_MAX = 254;
const FONT_SIZE = 17;
const LINE_H = 22;
const PAD_X = 13;
const PAD_Y = 8;
const MARGIN = 20;

export function renderIMessage(
  doc: IMessageDoc,
  avatarUrl?: string,
  lookupUrl?: (id: string) => string | undefined
): string {
  const platform = doc.chrome.platform ?? "ios";
  const font = fontFor("imessage", platform);
  const textBlock = (lines: string[], o: Parameters<typeof baseTextBlock>[1]) =>
    baseTextBlock(lines, { font, ...o });
  const dark = !!doc.chrome.dark;
  const c = {
    bg: dark ? "#000000" : "#ffffff",
    headerBg: dark ? "#111114" : "#f9f9f9",
    hairline: dark ? "#2c2c2e" : "#e0e0e2",
    text: dark ? "#ffffff" : "#000000",
    subtle: dark ? "#98989f" : "#8d8d93",
    incoming: dark ? "#26262a" : "#e9e9eb",
    incomingText: dark ? "#ffffff" : "#000000",
    outgoing: doc.sms ? "#34c759" : "#007aff",
    blue: "#007aff",
    inputStroke: dark ? "#3a3a3c" : "#c7c7cc",
  };

  const parts: string[] = [`<rect width="${SW}" height="${SH}" fill="${c.bg}"/>`];

  /* header */
  const HEADER_H = 128;
  parts.push(
    `<rect width="${SW}" height="${HEADER_H}" fill="${c.headerBg}"/>`,
    `<rect y="${HEADER_H - 0.5}" width="${SW}" height="0.5" fill="${c.hairline}"/>`,
    statusBar({ time: doc.chrome.time, battery: doc.chrome.battery, color: c.text, platform }),
    // back chevron
    `<path d="M28 76 l-10 11 10 11" fill="none" stroke="${c.blue}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`,
    avatar(doc.contact, SW / 2, 84, 23, "im", avatarUrl),
    textBlock([doc.contact], { x: SW / 2 - 4, y: 121, size: 11.5, lineHeight: 13, color: c.text, weight: 500, anchor: "middle" }),
    `<path d="M${SW / 2 + textWidth(doc.contact, 11.5) / 2 + 3} 113 l4.5 4.5 -4.5 4.5" fill="none" stroke="${c.subtle}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
    videoIcon(SW - 37, 84, 26, c.blue)
  );

  /* conversation */
  let y = HEADER_H + 18;
  if (doc.showHeader) {
    parts.push(
      `<text font-family="${font}" font-size="11" text-anchor="middle" x="${SW / 2}" y="${y}"><tspan font-weight="600" fill="${c.subtle}">iMessage</tspan></text>`,
      `<text font-family="${font}" font-size="11" text-anchor="middle" x="${SW / 2}" y="${y + 15}"><tspan font-weight="600" fill="${c.subtle}">Today</tspan><tspan fill="${c.subtle}"> ${esc(doc.chrome.time || "9:41")}</tspan></text>`
    );
    y += 34;
  }

  const msgs = doc.messages;
  let lastOutgoingBottom: number | null = null;
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    const mine = m.from === "me";

    // image attachment — rounded photo bubble; caption (if any) falls through
    const imgUrl = m.image ? lookupUrl?.(m.image) : undefined;
    if (imgUrl) {
      const iw = 208, ih = 250;
      const ix = mine ? SW - MARGIN - iw : MARGIN;
      parts.push(
        `<defs><clipPath id="imgc${i}"><rect x="${ix}" y="${y}" width="${iw}" height="${ih}" rx="18"/></clipPath></defs>`,
        `<image href="${imgUrl}" x="${ix}" y="${y}" width="${iw}" height="${ih}" preserveAspectRatio="xMidYMid slice" clip-path="url(#imgc${i})"/>`
      );
      if (mine) lastOutgoingBottom = y + ih;
      const grpEnd = i === msgs.length - 1 || msgs[i + 1].from !== m.from;
      y += ih + (m.text ? 3 : grpEnd ? 9 : 2.5);
      if (!m.text) continue;
    }

    // document attachment — file card bubble
    if (m.file) {
      const cw = 244;
      const cx = mine ? SW - MARGIN - cw : MARGIN;
      const card = fileCard({
        x: cx, y, w: cw, name: m.file.name, ext: m.file.ext, meta: m.file.meta,
        cardBg: mine ? c.outgoing : c.incoming, text: mine ? "#ffffff" : c.incomingText,
        subtle: mine ? "rgba(255,255,255,0.72)" : c.subtle, font,
      });
      parts.push(card.svg);
      if (mine) lastOutgoingBottom = y + card.h;
      y += card.h + (m.text ? 3 : 9);
      if (!m.text) continue;
    }

    // link preview — rich card
    if (m.link) {
      const cw = 250;
      const cx = mine ? SW - MARGIN - cw : MARGIN;
      const card = linkCard({
        x: cx, y, w: cw, title: m.link.title,
        domain: m.link.domain || m.link.url.replace(/^https?:\/\//, "").split("/")[0],
        cardBg: c.incoming, stripBg: dark ? "#3a3a3d" : "#dcdce0",
        text: c.incomingText, subtle: c.subtle, accent: c.blue, font,
      });
      parts.push(card.svg);
      if (mine) lastOutgoingBottom = y + card.h;
      y += card.h + (m.text ? 3 : 9);
      if (!m.text) continue;
    }

    const lines = wrapText(m.text || " ", FONT_SIZE, BUBBLE_MAX - PAD_X * 2);
    const w = Math.min(
      BUBBLE_MAX,
      Math.max(...lines.map((l) => textWidth(l, FONT_SIZE))) + PAD_X * 2
    );
    const h = lines.length * LINE_H + PAD_Y * 2;
    const x = mine ? SW - MARGIN - w : MARGIN;
    const fill = mine ? c.outgoing : c.incoming;
    const isTailEnd = i === msgs.length - 1 || msgs[i + 1].from !== m.from;

    parts.push(`<rect x="${x}" y="${y}" width="${w.toFixed(1)}" height="${h}" rx="18" fill="${fill}"/>`);
    if (isTailEnd) parts.push(bubbleTail(mine, mine ? x + w : x, y + h, fill));
    parts.push(
      textBlock(lines, {
        x: x + PAD_X,
        y: bubbleBaseline(y, h, lines.length, LINE_H, FONT_SIZE),
        size: FONT_SIZE,
        lineHeight: LINE_H,
        color: mine ? "#ffffff" : c.incomingText,
      })
    );
    if (mine) lastOutgoingBottom = y + h;
    y += h + (isTailEnd ? 9 : 2.5);
  }

  /* Delivered / Read caption under the last outgoing bubble */
  if (doc.status !== "none" && lastOutgoingBottom !== null) {
    const label =
      doc.status === "read" ? `Read ${doc.chrome.time || "9:41"}` : "Delivered";
    // only render when the last outgoing bubble is the true last bubble edge
    parts.push(
      `<text font-family="${font}" font-size="11" font-weight="500" fill="${c.subtle}" text-anchor="end" x="${SW - MARGIN}" y="${lastOutgoingBottom + 15}">${esc(label)}</text>`
    );
    if (msgs.length && msgs[msgs.length - 1].from === "me") y += 14;
  }

  /* typing indicator — the classic iMessage 3-dot bubble (animated in video) */
  if (doc.typing || doc.chrome._anim?.typing) {
    const h = 36;
    parts.push(
      `<rect x="${MARGIN}" y="${y}" width="64" height="${h}" rx="18" fill="${c.incoming}"/>`,
      bubbleTail(false, MARGIN, y + h, c.incoming),
      typingDots(MARGIN + 20, y + h / 2, c.subtle, doc.chrome._anim?.dotPhase ?? 0, 4.2, 12)
    );
  }

  /* input bar — iOS 26 liquid glass: floating pill, + button, mic in-field */
  const iy = SH - 70;
  parts.push(
    `<circle cx="38" cy="${iy + 18}" r="17" fill="${dark ? "rgba(60,60,67,0.65)" : "rgba(118,118,128,0.14)"}" stroke="${dark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.9)"}" stroke-width="1" style="filter:drop-shadow(0 4px 12px ${dark ? "rgba(0,0,0,0.45)" : "rgba(20,20,40,0.14)"})"/>`,
    `<path d="M38 ${iy + 11.5} v13 M31.5 ${iy + 18} h13" stroke="${c.subtle}" stroke-width="2.1" stroke-linecap="round"/>`,
    glassPill(64, iy, SW - 64 - 18, 36, dark),
    `<text font-family="${font}" font-size="16" fill="${c.subtle}" x="80" y="${iy + 23}">${doc.sms ? "Text Message" : "iMessage"}</text>`,
    micIcon(SW - 38, iy + 18, 20, c.subtle),
    homeIndicator(dark ? "#ffffff" : "#000000", platform)
  );

  return parts.join("\n");
}

function bubbleTail(mine: boolean, x: number, bottom: number, fill: string): string {
  // small curl hugging the bubble's bottom corner, Apple-style
  return mine
    ? `<path d="M${x - 6} ${bottom - 14} c 1.5 8 5 11 10 13 c -7 1.5 -13 -1 -16 -5 Z" fill="${fill}"/>`
    : `<path d="M${x + 6} ${bottom - 14} c -1.5 8 -5 11 -10 13 c 7 1.5 13 -1 16 -5 Z" fill="${fill}"/>`;
}
