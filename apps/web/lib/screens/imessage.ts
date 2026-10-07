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
  scrollBody,
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

  /* header — iOS 26: no bar; the thread scrolls under a soft fade, with glass
     buttons either side of the contact photo and a name capsule beneath it */
  const HEADER_H = 146;

  /* conversation (scrolls to bottom when taller than the band) */
  const bodyStart = parts.length;
  let y = HEADER_H + 10;
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

  const body = parts.splice(bodyStart);
  parts.push(scrollBody(body.join("\n"), { top: 0, bottom: SH - 94, contentBottom: y }));

  // scroll-edge fade, then the floating header controls on top
  const fadeId = "imfade";
  parts.push(
    `<defs><linearGradient id="${fadeId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.bg}" stop-opacity="1"/><stop offset="0.86" stop-color="${c.bg}" stop-opacity="1"/><stop offset="1" stop-color="${c.bg}" stop-opacity="0"/></linearGradient></defs>`,
    `<rect width="${SW}" height="${HEADER_H + 14}" fill="url(#${fadeId})"/>`,
    statusBar({ time: doc.chrome.time, battery: doc.chrome.battery, color: c.text, platform }),
    glassCircle(38, 84, 22, dark),
    `<path d="M${41.5} 75 l-9 9 9 9" fill="none" stroke="${c.text}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`,
    glassCircle(SW - 38, 84, 22, dark),
    videoIcon(SW - 37, 84, 21, c.text),
    avatarUrl ? avatar(doc.contact, SW / 2, 82, 27, "im", avatarUrl) : monogram(doc.contact, SW / 2, 82, 27)
  );
  const nameW = textWidth(doc.contact, 12.5);
  const capW = nameW + 34;
  parts.push(
    glassCapsule(SW / 2 - capW / 2, 116, capW, 24, dark),
    textBlock([doc.contact], { x: SW / 2 - 6, y: 132.5, size: 12.5, lineHeight: 14, color: c.text, weight: 600, anchor: "middle" }),
    `<path d="M${(SW / 2 + nameW / 2 + 2).toFixed(1)} 124.5 l4 3.8 -4 3.8" fill="none" stroke="${c.subtle}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`
  );

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

/* ------------------------------ iOS 26 chrome -------------------------------- */

function glassCircle(cx: number, cy: number, r: number, dark: boolean): string {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${dark ? "rgba(44,44,48,0.82)" : "rgba(255,255,255,0.86)"}" stroke="${dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.05)"}" stroke-width="0.8" style="filter:drop-shadow(0 3px 10px ${dark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.12)"})"/>`;
}

function glassCapsule(x: number, y: number, w: number, h: number, dark: boolean): string {
  return `<rect x="${x.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${h}" rx="${h / 2}" fill="${dark ? "rgba(44,44,48,0.82)" : "rgba(255,255,255,0.86)"}" stroke="${dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.05)"}" stroke-width="0.8" style="filter:drop-shadow(0 3px 10px ${dark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.1)"})"/>`;
}

/** Contacts with no photo: Apple's grey gradient disc with white letters
 *  (letters only, so "Jordan 🎭" reads "J", never "J🎭"). */
function monogram(name: string, cx: number, cy: number, r: number): string {
  const words = name.split(/\s+/).filter((w) => /^\p{L}/u.test(w));
  const letters = ((words[0] ? [...words[0]][0] : "") + (words.length > 1 ? [...words[words.length - 1]][0] : "")).toUpperCase();
  return (
    `<defs><linearGradient id="immono" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a5aab7"/><stop offset="1" stop-color="#858a96"/></linearGradient></defs>` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#immono)"/>` +
    (letters
      ? `<text font-family="ui-rounded,'SF Pro Rounded',-apple-system,'Helvetica Neue',Arial,sans-serif" font-size="${(r * 0.86).toFixed(1)}" font-weight="500" fill="#ffffff" text-anchor="middle" x="${cx}" y="${(cy + r * 0.31).toFixed(1)}">${esc(letters)}</text>`
      : `<circle cx="${cx}" cy="${(cy - r * 0.2).toFixed(1)}" r="${(r * 0.34).toFixed(1)}" fill="#ffffff"/><path d="M${cx - r * 0.6} ${cy + r * 0.62} a${r * 0.6} ${r * 0.5} 0 0 1 ${r * 1.2} 0" fill="#ffffff"/>`)
  );
}
