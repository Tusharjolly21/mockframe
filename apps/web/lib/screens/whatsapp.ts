"use client";

import {
  avatar,
  glassPill,
  bubbleBaseline,
  esc,
  fileCard,
  linkCard,
  homeIndicator,
  micIcon,
  phoneIcon,
  type Platform,
  SH,
  statusBar,
  SW,
  textBlock as baseTextBlock,
  textWidth,
  videoIcon,
  wrapText,
} from "./common";
import { fontFor } from "./fonts";
import { resolveWallpaper } from "./wallpapers";
import type { WhatsAppDoc, WhatsAppGroupDoc, WhatsAppTicks } from "./types";

/**
 * WhatsApp (iOS) conversation view: wallpaper, header with presence line,
 * encryption chip, white/green bubbles with top tails, per-bubble time +
 * tick states, input bar. Spec §2.3.
 */

const BUBBLE_MAX = 268;
const FONT_SIZE = 16;
const LINE_H = 21;
const PAD_X = 11;
const PAD_Y = 7;
const MARGIN = 16;
const META_W = 56; // reserved for time + ticks inside the bubble

export function renderWhatsApp(
  doc: WhatsAppDoc,
  avatarUrl?: string,
  lookupUrl?: (id: string) => string | undefined
): string {
  const platform = doc.chrome.platform ?? "ios";
  const font = fontFor("whatsapp", platform);
  const textBlock = (lines: string[], o: Parameters<typeof baseTextBlock>[1]) =>
    baseTextBlock(lines, { font, ...o });
  const dark = !!doc.chrome.dark;
  const c = {
    wallpaper: dark ? "#0b141a" : "#ece5dd",
    headerBg: dark ? "#1f2c34" : "#f6f6f6",
    hairline: dark ? "#2c3942" : "#dcdcdc",
    text: dark ? "#e9edef" : "#000000",
    subtle: dark ? "#8696a0" : "#667781",
    incoming: dark ? "#202c33" : "#ffffff",
    outgoing: dark ? "#005c4b" : "#dcf8c6",
    bubbleText: dark ? "#e9edef" : "#111b21",
    blueTick: "#53bdeb",
    accent: dark ? "#00a884" : "#008069", // WhatsApp green — unified across iOS/Android (never iOS blue)
    chipBg: dark ? "#1d282f" : "#fdf4c5",
    chipText: dark ? "#8696a0" : "#54656f",
  };

  const parts: string[] = [resolveWallpaper(doc.wallpaper, dark) ?? `<rect width="${SW}" height="${SH}" fill="${c.wallpaper}"/>`];

  /* header */
  const HEADER_H = 102;
  parts.push(
    `<rect width="${SW}" height="${HEADER_H}" fill="${c.headerBg}"/>`,
    `<rect y="${HEADER_H - 0.5}" width="${SW}" height="0.5" fill="${c.hairline}"/>`,
    statusBar({ time: doc.chrome.time, battery: doc.chrome.battery, color: c.text, platform }),
    `<path d="M24 62 l-10 11 10 11" fill="none" stroke="${c.accent}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`,
    avatar(doc.contact, 52, 73, 19, "wa", avatarUrl),
    textBlock([doc.contact], { x: 80, y: 70, size: 16.5, lineHeight: 19, color: c.text, weight: 600 }),
    textBlock([doc.chrome._anim?.typing ? "typing…" : doc.presence || "online"], { x: 80, y: 87, size: 12, lineHeight: 14, color: doc.chrome._anim?.typing ? c.accent : c.subtle }),
    videoIcon(SW - 76, 73, 25, c.text),
    phoneIcon(SW - 34, 73, 21, c.text)
  );

  /* encryption chip */
  let y = HEADER_H + 14;
  const chipText = "Messages and calls are end-to-end encrypted.";
  const chipW = Math.min(SW - 48, textWidth(chipText, 11) + 34);
  parts.push(
    `<rect x="${(SW - chipW) / 2}" y="${y}" width="${chipW.toFixed(1)}" height="34" rx="8" fill="${c.chipBg}"/>`,
    `<text font-family="${font}" font-size="11" fill="${c.chipText}" text-anchor="middle" x="${SW / 2 + 6}" y="${y + 21}">${esc(chipText)}</text>`,
    `<text font-size="10" text-anchor="middle" x="${(SW - chipW) / 2 + 15}" y="${y + 21.5}">🔒</text>`
  );
  y += 50;

  /* messages */
  const time = doc.chrome.time || "9:41";
  for (let i = 0; i < doc.messages.length; i++) {
    const m = doc.messages[i];
    const mine = m.from === "me";

    // date separator pill ("Today" / "Yesterday")
    if (m.dateLabel) {
      const pw = textWidth(m.dateLabel, 11.5) + 26;
      parts.push(
        `<rect x="${(SW - pw) / 2}" y="${y}" width="${pw.toFixed(0)}" height="26" rx="8" fill="${dark ? "#1d282f" : "#ffffff"}"/>`,
        `<text font-family="${font}" font-size="11.5" font-weight="600" fill="${c.subtle}" text-anchor="middle" x="${SW / 2}" y="${y + 17}">${esc(m.dateLabel)}</text>`
      );
      y += 38;
    }

    // call-event card (Voice/Video call · duration, or Missed call · Tap to call back)
    if (m.call) {
      const cw = 250, ch = 62;
      const bx = mine ? SW - MARGIN - cw : MARGIN;
      const missed = m.call.state === "missed";
      const glyphCol = missed ? "#f15c6d" : mine ? c.text : c.accent;
      const label =
        (missed ? "Missed " : "") + (m.call.kind === "video" ? "Video call" : "Voice call");
      const sub = missed ? "Tap to call back" : m.call.duration || "";
      const arrow = m.call.state === "incoming" || missed ? "M-4 -4 l8 8 M4 -4 v8 h-8" : "M4 4 l-8 -8 M-4 4 v-8 h8"; // in vs out
      parts.push(
        `<rect x="${bx}" y="${y}" width="${cw}" height="${ch}" rx="10" fill="${mine ? c.outgoing : c.incoming}"/>`,
        `<circle cx="${bx + 32}" cy="${y + ch / 2}" r="18" fill="${dark ? "#2a3942" : "#f0f0f0"}"/>`,
        m.call.kind === "video"
          ? videoIcon(bx + 32, y + ch / 2, 20, glyphCol)
          : phoneIcon(bx + 32, y + ch / 2, 20, glyphCol),
        `<path d="${arrow}" transform="translate(${bx + 46} ${y + ch / 2 + 8})" fill="none" stroke="${glyphCol}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
        `<text font-family="${font}" font-size="14.5" font-weight="600" fill="${c.bubbleText}" x="${bx + 62}" y="${y + 26}">${esc(label)}</text>`,
        `<text font-family="${font}" font-size="12" fill="${c.subtle}" x="${bx + 62}" y="${y + 44}">${esc(sub)}</text>`,
        `<text font-family="${font}" font-size="10.5" fill="${c.subtle}" text-anchor="end" x="${bx + cw - 10}" y="${y + ch - 8}">${esc(time)}</text>`
      );
      y += ch + 10;
      continue;
    }

    // image attachment — photo inside a hugging bubble with time overlay
    const imgUrl = m.image ? lookupUrl?.(m.image) : undefined;
    if (imgUrl) {
      const iw = 214, ih = 232;
      const bx = mine ? SW - MARGIN - iw - 6 : MARGIN;
      const capLines = m.text ? wrapText(m.text, FONT_SIZE, iw - PAD_X) : [];
      const capH = capLines.length * LINE_H;
      const bh = ih + 6 + (capH ? capH + 6 : 0);
      parts.push(
        `<rect x="${bx}" y="${y}" width="${iw + 12}" height="${bh + 8}" rx="9" fill="${mine ? c.outgoing : c.incoming}"/>`,
        `<defs><clipPath id="waimg${i}"><rect x="${bx + 6}" y="${y + 6}" width="${iw}" height="${ih}" rx="6"/></clipPath></defs>`,
        `<image href="${imgUrl}" x="${bx + 6}" y="${y + 6}" width="${iw}" height="${ih}" preserveAspectRatio="xMidYMid slice" clip-path="url(#waimg${i})"/>`,
        // time chip over the image
        `<rect x="${bx + iw - 34}" y="${y + ih - 16}" width="42" height="16" rx="8" fill="rgba(0,0,0,0.35)"/>`,
        `<text font-family="${font}" font-size="10" fill="#fff" text-anchor="end" x="${bx + iw + 2}" y="${y + ih - 4}">${esc(time)}</text>`
      );
      if (capLines.length)
        parts.push(textBlock(capLines, { x: bx + 6, y: y + ih + 6 + FONT_SIZE * 0.8, size: FONT_SIZE, lineHeight: LINE_H, color: c.bubbleText }));
      y += bh + 10;
      continue;
    }

    // document / link attachment cards (own bubble)
    if (m.file || m.link) {
      const cw = 252;
      const bx = mine ? SW - MARGIN - cw : MARGIN;
      const card = m.file
        ? fileCard({ x: bx, y, w: cw, name: m.file.name, ext: m.file.ext, meta: m.file.meta, cardBg: mine ? c.outgoing : c.incoming, text: c.bubbleText, subtle: c.subtle, font })
        : linkCard({ x: bx, y, w: cw, title: m.link!.title, domain: m.link!.domain || m.link!.url.replace(/^https?:\/\//, "").split("/")[0], cardBg: mine ? c.outgoing : c.incoming, stripBg: dark ? "#1d282f" : "#cfe8c8", text: c.bubbleText, subtle: c.subtle, accent: c.accent, font });
      parts.push(card.svg);
      y += card.h + 8;
      if (!m.text) continue;
    }

    const lines = wrapText(m.text || " ", FONT_SIZE, BUBBLE_MAX - PAD_X * 2);
    const lastLineW = textWidth(lines[lines.length - 1], FONT_SIZE);
    const metaInline = lastLineW + META_W <= BUBBLE_MAX - PAD_X * 2;
    const textW = Math.max(...lines.map((l) => textWidth(l, FONT_SIZE)));
    const w = Math.min(
      BUBBLE_MAX,
      Math.max(textW + PAD_X * 2, metaInline ? lastLineW + META_W + PAD_X * 2 : META_W + PAD_X * 2)
    );
    const h = lines.length * LINE_H + PAD_Y * 2 + (metaInline ? 0 : 13);
    const x = mine ? SW - MARGIN - w : MARGIN;
    const fill = mine ? c.outgoing : c.incoming;
    const isGroupStart = i === 0 || doc.messages[i - 1].from !== m.from;

    parts.push(
      `<rect x="${x}" y="${y}" width="${w.toFixed(1)}" height="${h}" rx="9" fill="${fill}" style="filter:drop-shadow(0 0.5px 0.5px rgba(0,0,0,0.12))"/>`
    );
    if (isGroupStart)
      parts.push(
        mine
          ? `<path d="M${x + w - 4} ${y} h 10 c -3 6 -6 8 -10 9 Z" fill="${fill}"/>`
          : `<path d="M${x + 4} ${y} h -10 c 3 6 6 8 10 9 Z" fill="${fill}"/>`
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

    // meta: time (+ ticks for outgoing) bottom-right inside the bubble
    const metaY = y + h - 7;
    const ticksSvg = mine ? ticks(m.ticks ?? "read", x + w - 9, metaY, c.subtle, c.blueTick) : "";
    const timeX = mine ? x + w - 9 - 18 : x + w - 9;
    parts.push(
      `<text font-family="${font}" font-size="10.5" fill="${c.subtle}" text-anchor="end" x="${timeX}" y="${metaY}">${esc(time)}</text>`,
      ticksSvg
    );

    y += h + (i < doc.messages.length - 1 && doc.messages[i + 1].from === m.from ? 3 : 10);
  }

  /* input bar */
  parts.push(...waComposer({ platform, dark, subtle: c.subtle, headerBg: c.headerBg, font }));

  return parts.join("\n");
}

/* ------------------------------- group chat ---------------------------------- */
/* Same chrome as 1-on-1; incoming bubbles carry a per-sender colored name. */

const SENDER_COLORS = ["#e17076", "#7bc862", "#65aadd", "#a695e7", "#ee7aae", "#d09306"];

function senderColor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return SENDER_COLORS[h % SENDER_COLORS.length];
}

export function renderWhatsAppGroup(doc: WhatsAppGroupDoc, avatarUrl?: string): string {
  const platform = doc.chrome.platform ?? "ios";
  const font = fontFor("whatsapp-group", platform);
  const textBlock = (lines: string[], o: Parameters<typeof baseTextBlock>[1]) =>
    baseTextBlock(lines, { font, ...o });
  // reuse the 1-on-1 layout via a shim, then post-process incoming bubbles?
  // No — sender labels change bubble height, so lay out directly here.
  const dark = !!doc.chrome.dark;
  const c = {
    wallpaper: dark ? "#0b141a" : "#ece5dd",
    headerBg: dark ? "#1f2c34" : "#f6f6f6",
    hairline: dark ? "#2c3942" : "#dcdcdc",
    text: dark ? "#e9edef" : "#000000",
    subtle: dark ? "#8696a0" : "#667781",
    incoming: dark ? "#202c33" : "#ffffff",
    outgoing: dark ? "#005c4b" : "#dcf8c6",
    bubbleText: dark ? "#e9edef" : "#111b21",
    blueTick: "#53bdeb",
    accent: dark ? "#00a884" : "#008069", // WhatsApp green — unified across iOS/Android (never iOS blue)
  };

  const parts: string[] = [resolveWallpaper(doc.wallpaper, dark) ?? `<rect width="${SW}" height="${SH}" fill="${c.wallpaper}"/>`];

  const HEADER_H = 102;
  parts.push(
    `<rect width="${SW}" height="${HEADER_H}" fill="${c.headerBg}"/>`,
    `<rect y="${HEADER_H - 0.5}" width="${SW}" height="0.5" fill="${c.hairline}"/>`,
    statusBar({ time: doc.chrome.time, battery: doc.chrome.battery, color: c.text, platform }),
    `<path d="M24 62 l-10 11 10 11" fill="none" stroke="${c.accent}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`,
    avatar(doc.name, 52, 73, 19, "wag", avatarUrl),
    textBlock([doc.name], { x: 80, y: 70, size: 16.5, lineHeight: 19, color: c.text, weight: 600 }),
    textBlock([doc.chrome._anim?.typing ? `${doc.messages.filter(m=>m.from==="them").slice(-1)[0]?.sender ?? "Someone"} is typing…` : doc.members], { x: 80, y: 87, size: 12, lineHeight: 14, color: doc.chrome._anim?.typing ? c.accent : c.subtle }),
    videoIcon(SW - 76, 73, 25, c.text),
    phoneIcon(SW - 34, 73, 21, c.text)
  );

  const time = doc.chrome.time || "9:41";
  let y = HEADER_H + 20;
  for (let i = 0; i < doc.messages.length; i++) {
    const m = doc.messages[i];
    const mine = m.from === "me";
    const sender = !mine ? m.sender || "Member" : null;
    const lines = wrapText(m.text || " ", FONT_SIZE, BUBBLE_MAX - PAD_X * 2);
    const lastLineW = textWidth(lines[lines.length - 1], FONT_SIZE);
    const metaInline = lastLineW + META_W <= BUBBLE_MAX - PAD_X * 2;
    const textW = Math.max(
      ...lines.map((l) => textWidth(l, FONT_SIZE)),
      sender ? textWidth(sender, 12.5) + 6 : 0
    );
    const w = Math.min(
      BUBBLE_MAX,
      Math.max(textW + PAD_X * 2, metaInline ? lastLineW + META_W + PAD_X * 2 : META_W + PAD_X * 2)
    );
    const senderH = sender ? 18 : 0;
    const h = lines.length * LINE_H + PAD_Y * 2 + senderH + (metaInline ? 0 : 13);
    const x = mine ? SW - MARGIN - w : MARGIN;
    const fill = mine ? c.outgoing : c.incoming;
    const isGroupStart = i === 0 || doc.messages[i - 1].from !== m.from ||
      (!mine && doc.messages[i - 1].sender !== m.sender);

    parts.push(
      `<rect x="${x}" y="${y}" width="${w.toFixed(1)}" height="${h}" rx="9" fill="${fill}" style="filter:drop-shadow(0 0.5px 0.5px rgba(0,0,0,0.12))"/>`
    );
    if (isGroupStart)
      parts.push(
        mine
          ? `<path d="M${x + w - 4} ${y} h 10 c -3 6 -6 8 -10 9 Z" fill="${fill}"/>`
          : `<path d="M${x + 4} ${y} h -10 c 3 6 6 8 10 9 Z" fill="${fill}"/>`
      );
    if (sender)
      parts.push(
        textBlock([sender], { x: x + PAD_X, y: y + PAD_Y + 10, size: 12.5, lineHeight: 14, color: senderColor(sender), weight: 700 })
      );
    parts.push(
      textBlock(lines, {
        x: x + PAD_X,
        y: bubbleBaseline(y + senderH, h - senderH - (metaInline ? 0 : 13), lines.length, LINE_H, FONT_SIZE),
        size: FONT_SIZE,
        lineHeight: LINE_H,
        color: c.bubbleText,
      })
    );
    const metaY = y + h - 7;
    const timeX = mine ? x + w - 9 - 18 : x + w - 9;
    parts.push(
      `<text font-family="${font}" font-size="10.5" fill="${c.subtle}" text-anchor="end" x="${timeX}" y="${metaY}">${esc(time)}</text>`,
      mine ? ticks(m.ticks ?? "read", x + w - 9, metaY, c.subtle, c.blueTick) : ""
    );
    y += h + (i < doc.messages.length - 1 && doc.messages[i + 1].from === m.from && (mine || doc.messages[i + 1].sender === m.sender) ? 3 : 10);
  }

  /* input bar */
  parts.push(...waComposer({ platform, dark, subtle: c.subtle, headerBg: c.headerBg, font }));

  return parts.join("\n");
}

/* Shared composer: iOS 26 glass floating bar vs Android Material bar + green
   send FAB. Both carry the WhatsApp Pay ₹ button (user request). */
function waComposer(o: {
  platform: Platform;
  dark: boolean;
  subtle: string;
  headerBg: string;
  font: string;
}): string[] {
  const { platform, dark, subtle, font } = o;
  const homeColor = dark ? "#e9edef" : "#000000";

  if (platform === "android") {
    const iy = SH - 74;
    const pillW = SW - 20 - 60; // leave room for the FAB
    const green = "#00a884";
    const fx = SW - 34, fy = iy + 22;
    return [
      // input pill (solid, elevated)
      `<rect x="12" y="${iy}" width="${pillW}" height="44" rx="22" fill="${dark ? "#1f2c33" : "#ffffff"}" style="filter:drop-shadow(0 1px 3px rgba(0,0,0,0.25))"/>`,
      // emoji smiley (left)
      `<circle cx="34" cy="${iy + 22}" r="10" fill="none" stroke="${subtle}" stroke-width="1.7"/><path d="M30 ${iy + 24} a5 5 0 0 0 8 0 M30.5 ${iy + 19} h0.01 M37.5 ${iy + 19} h0.01" stroke="${subtle}" stroke-width="1.7" stroke-linecap="round" fill="none"/>`,
      `<text font-family="${font}" font-size="15" fill="${subtle}" x="56" y="${iy + 28}">Message</text>`,
      // attach (paperclip), ₹ pay, camera inside the pill (right)
      `<path d="M${pillW - 40} ${iy + 15} l -6 7 a 5.5 5.5 0 0 0 8.5 7 l 7.5 -9 a 3.6 3.6 0 0 0 -5.5 -4.7 l -7 8.5" fill="none" stroke="${subtle}" stroke-width="1.7" stroke-linecap="round"/>`,
      `<circle cx="${pillW - 14}" cy="${iy + 22}" r="10" fill="none" stroke="${subtle}" stroke-width="1.6"/><text font-family="${font}" font-size="12" font-weight="600" fill="${subtle}" text-anchor="middle" x="${pillW - 14}" y="${iy + 26}">₹</text>`,
      `<rect x="${pillW + 8}" y="${iy + 14}" width="18" height="14" rx="4" fill="none" stroke="${subtle}" stroke-width="1.7"/><circle cx="${pillW + 17}" cy="${iy + 21}" r="3.4" fill="none" stroke="${subtle}" stroke-width="1.5"/>`,
      // green send/mic FAB
      `<circle cx="${fx}" cy="${fy}" r="24" fill="${green}" style="filter:drop-shadow(0 2px 5px rgba(0,0,0,0.3))"/>`,
      micIcon(fx, fy, 22, "#ffffff"),
      homeIndicator(homeColor, platform),
    ];
  }

  // iOS 26 liquid glass floating bar
  const iy = SH - 68;
  return [
    `<path d="M26 ${iy + 11} v14 M19 ${iy + 18} h14" stroke="${subtle}" stroke-width="2" stroke-linecap="round"/>`,
    glassPill(44, iy, SW - 44 - 116, 36, dark),
    `<text font-family="${font}" font-size="15" fill="${subtle}" x="60" y="${iy + 23}">Message</text>`,
    `<circle cx="${SW - 96}" cy="${iy + 18}" r="10.5" fill="none" stroke="${subtle}" stroke-width="1.7"/>`,
    `<text font-family="${font}" font-size="12.5" font-weight="600" fill="${subtle}" text-anchor="middle" x="${SW - 96}" y="${iy + 22.4}">₹</text>`,
    `<rect x="${SW - 74}" y="${iy + 10.5}" width="19" height="15" rx="4" fill="none" stroke="${subtle}" stroke-width="1.8"/>`,
    `<circle cx="${SW - 64.5}" cy="${iy + 18}" r="3.6" fill="none" stroke="${subtle}" stroke-width="1.6"/>`,
    micIcon(SW - 30, iy + 18, 20, subtle),
    homeIndicator(homeColor, platform),
  ];
}

function ticks(state: WhatsAppTicks, xRight: number, y: number, grey: string, blue: string): string {
  const color = state === "read" ? blue : grey;
  const tick = (dx: number) =>
    `<path d="M${xRight - 14 + dx} ${y - 4} l 2.6 2.8 5.4 -6" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  return state === "sent" ? tick(3) : tick(0) + tick(4.5);
}
