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
  scrollBody,
  textBlock as baseTextBlock,
  textWidth,
  typingDots,
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

/* WhatsApp never generates initials avatars — defaults are a gray person
   silhouette (or group silhouette) on a light disc. */
function waAvatar(cx: number, cy: number, r: number, group: boolean, url?: string, seed = "wa", id = "waav"): string {
  if (url) return avatar(seed, cx, cy, r, id, url);
  const disc = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#dfe5e7"/>`;
  const person = (px: number, py: number, s: number) =>
    `<circle cx="${px}" cy="${(py - s * 0.35).toFixed(1)}" r="${(s * 0.32).toFixed(1)}" fill="#9aa9b2"/>` +
    `<path d="M${(px - s * 0.55).toFixed(1)} ${(py + s * 0.62).toFixed(1)} a ${(s * 0.55).toFixed(1)} ${(s * 0.5).toFixed(1)} 0 0 1 ${(s * 1.1).toFixed(1)} 0 Z" fill="#9aa9b2"/>`;
  const clip = `<defs><clipPath id="${id}c"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath></defs>`;
  const body = group
    ? person(cx - r * 0.32, cy + r * 0.1, r * 0.75) + person(cx + r * 0.38, cy + r * 0.18, r * 0.62)
    : person(cx, cy + r * 0.05, r);
  return `${clip}${disc}<g clip-path="url(#${id}c)">${body}</g>`;
}

/* Sparse tan doodle hints for the default cream wallpaper. */
function waDoodles(): string {
  const shapes: string[] = [];
  const pts: Array<[number, number, number]> = [
    [40, 180, 9], [150, 240, 7], [300, 200, 8], [360, 320, 6], [80, 380, 7],
    [220, 430, 9], [340, 520, 7], [60, 560, 8], [180, 620, 6], [310, 680, 8],
    [120, 760, 7], [260, 800, 6], [30, 700, 6], [370, 430, 7],
  ];
  pts.forEach(([x, y, r], i) => {
    shapes.push(
      i % 3 === 0
        ? `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#e2d9c8" stroke-width="1.6"/>`
        : i % 3 === 1
          ? `<path d="M${x - r} ${y} h${r * 2} M${x} ${y - r} v${r * 2}" stroke="#e2d9c8" stroke-width="1.6" stroke-linecap="round"/>`
          : `<rect x="${x - r * 0.8}" y="${y - r * 0.8}" width="${r * 1.6}" height="${r * 1.6}" rx="3" fill="none" stroke="#e2d9c8" stroke-width="1.6" transform="rotate(18 ${x} ${y})"/>`
    );
  });
  return `<g opacity="0.55">${shapes.join("")}</g>`;
}

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
    wallpaper: dark ? "#0b141a" : "#f4f1eb", // current default: cream, not beige
    headerBg: dark ? "#1f2c34" : "#f6f6f6",
    hairline: dark ? "#2c3942" : "#dcdcdc",
    text: dark ? "#e9edef" : "#000000",
    subtle: dark ? "#8696a0" : "#667781",
    incoming: dark ? "#202c33" : "#ffffff",
    // current light design sends SOLID green bubbles with white text —
    // pale #dcf8c6 with dark text is the 2016-era look
    outgoing: dark ? "#005c4b" : "#4ca35f",
    bubbleText: dark ? "#e9edef" : "#111b21",
    mineText: "#ffffff",
    mineMeta: "rgba(255,255,255,0.78)",
    blueTick: "#53bdeb",
    mineBlueTick: dark ? "#53bdeb" : "#a8e5ff", // read ticks are pale on the green bubble
    accent: dark ? "#00a884" : "#008069", // WhatsApp green — unified across iOS/Android (never iOS blue)
    chipBg: dark ? "#1d282f" : "#fbf5da",
    chipText: dark ? "#8696a0" : "#54656f",
  };
  const mineText = dark ? c.bubbleText : c.mineText;
  const mineMeta = dark ? "rgba(233,237,239,0.7)" : c.mineMeta;

  const parts: string[] = [resolveWallpaper(doc.wallpaper, dark) ?? `<rect width="${SW}" height="${SH}" fill="${c.wallpaper}"/>${dark ? "" : waDoodles()}`];

  /* header */
  const HEADER_H = 102;
  parts.push(
    `<rect width="${SW}" height="${HEADER_H}" fill="${c.headerBg}"/>`,
    `<rect y="${HEADER_H - 0.5}" width="${SW}" height="0.5" fill="${c.hairline}"/>`,
    statusBar({ time: doc.chrome.time, battery: doc.chrome.battery, color: c.text, platform }),
    // black chevron with the unread count in a floating white circle
    `<circle cx="24" cy="73" r="15" fill="${dark ? "#243139" : "#ffffff"}" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.1))"/>`,
    `<path d="M27 65 l-8 8 8 8" fill="none" stroke="${c.text}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
    waAvatar(58, 73, 19, false, avatarUrl, doc.contact, "wa"),
    textBlock([doc.contact], { x: 86, y: 70, size: 16.5, lineHeight: 19, color: c.text, weight: 600 }),
    doc.verified
      ? verifiedBadge(86 + textWidth(doc.contact, 16.5) + 5, 70 - 13, c.accent)
      : "",
    textBlock([doc.chrome._anim?.typing ? "typing…" : doc.presence || "online"], { x: 86, y: 87, size: 12, lineHeight: 14, color: doc.chrome._anim?.typing ? c.accent : c.subtle }),
    // single rounded pill with an outlined video camera + calls-menu chevron
    `<rect x="${SW - 92}" y="58" width="78" height="30" rx="15" fill="${dark ? "#243139" : "#ffffff"}" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.1))"/>`,
    `<rect x="${SW - 82}" y="66" width="18" height="14" rx="4" fill="none" stroke="${c.text}" stroke-width="1.8"/><path d="M${SW - 64} 69.5 l7 -3.5 v14 l-7 -3.5 Z" fill="${c.text}"/>`,
    `<path d="M${SW - 40} 70 l5 5 5 -5" fill="none" stroke="${c.text}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
  );

  /* message body (scrolls to bottom when taller than the band) */
  const bodyStart = parts.length;
  let y = HEADER_H + 14;
  const chipLines = [
    "Messages and calls are end-to-end encrypted. Only",
    "people in this chat can read, listen to, or share them.",
  ];
  const chipW = Math.min(SW - 40, Math.max(...chipLines.map((l) => textWidth(l, 10.5))) + 44);
  parts.push(
    `<rect x="${(SW - chipW) / 2}" y="${y}" width="${chipW.toFixed(1)}" height="46" rx="10" fill="${c.chipBg}"/>`,
    `<text font-size="9.5" x="${(SW - chipW) / 2 + 12}" y="${y + 21}">🔒</text>`,
    `<text font-family="${font}" font-size="10.5" fill="${c.chipText}" text-anchor="middle" x="${SW / 2 + 8}" y="${y + 19}">${esc(chipLines[0])}</text>`,
    `<text font-family="${font}" font-size="10.5" fill="${c.chipText}" text-anchor="middle" x="${SW / 2 + 8}" y="${y + 34}">${esc(chipLines[1])}</text>`
  );
  y += 60;

  /* messages */
  const time = doc.chrome.time || "9:41";
  // white "Today" pill above the first message when no explicit date label
  if (doc.messages.length && !doc.messages[0].dateLabel) {
    parts.push(
      `<rect x="${SW / 2 - 28}" y="${y}" width="56" height="24" rx="8" fill="${dark ? "#1d282f" : "#ffffff"}"/>`,
      `<text font-family="${font}" font-size="11" font-weight="600" fill="${c.subtle}" text-anchor="middle" x="${SW / 2}" y="${y + 16}">Today</text>`
    );
    y += 36;
  }
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
        `<text font-family="${font}" font-size="14.5" font-weight="600" fill="${mine ? mineText : c.bubbleText}" x="${bx + 62}" y="${y + 26}">${esc(label)}</text>`,
        `<text font-family="${font}" font-size="12" fill="${mine ? mineMeta : c.subtle}" x="${bx + 62}" y="${y + 44}">${esc(sub)}</text>`,
        `<text font-family="${font}" font-size="10.5" fill="${mine ? mineMeta : c.subtle}" text-anchor="end" x="${bx + cw - 10}" y="${y + ch - 8}">${esc(time)}</text>`
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
        ? fileCard({ x: bx, y, w: cw, name: m.file.name, ext: m.file.ext, meta: m.file.meta, cardBg: mine ? c.outgoing : c.incoming, text: mine ? mineText : c.bubbleText, subtle: mine ? mineMeta : c.subtle, font })
        : linkCard({ x: bx, y, w: cw, title: m.link!.title, domain: m.link!.domain || m.link!.url.replace(/^https?:\/\//, "").split("/")[0], cardBg: mine ? c.outgoing : c.incoming, stripBg: dark ? "#1d282f" : mine ? "#3d8a4e" : "#e9f3e6", text: mine ? mineText : c.bubbleText, subtle: mine ? mineMeta : c.subtle, accent: mine ? mineText : c.accent, font });
      parts.push(card.svg);
      y += card.h + 8;
      if (!m.text) continue;
    }

    // voice-note bubble: play + deterministic waveform + duration
    if (m.voice) {
      const vw = 238, vh = 56;
      const bx = mine ? SW - MARGIN - vw : MARGIN;
      const fill = mine ? c.outgoing : c.incoming;
      const secs = Math.max(1, Math.round(m.voice.seconds));
      const dur = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
      const bars: string[] = [];
      for (let b = 0; b < 27; b++) {
        // deterministic pseudo-random heights so exports are reproducible
        const hgt = 4 + ((Math.sin((b + 1) * 12.9898 + i * 78.233) * 43758.5453) % 1 + 1) % 1 * 14;
        const bxp = bx + 64 + b * 5.4;
        bars.push(`<rect x="${bxp.toFixed(1)}" y="${(y + 22 - hgt / 2).toFixed(1)}" width="3" height="${hgt.toFixed(1)}" rx="1.5" fill="${b < 9 ? c.accent : c.subtle}" opacity="${b < 9 ? 1 : 0.55}"/>`);
      }
      const laterReplyV = doc.messages.slice(i + 1).some((n) => n.from === "them");
      const vTicks = mine ? ticks(m.ticks ?? (laterReplyV ? "read" : "delivered"), bx + vw - 9, y + vh - 8, mineMeta, c.mineBlueTick) : "";
      parts.push(
        `<rect x="${bx}" y="${y}" width="${vw}" height="${vh}" rx="9" fill="${fill}" style="filter:drop-shadow(0 0.5px 0.5px rgba(0,0,0,0.12))"/>`,
        `<circle cx="${bx + 30}" cy="${y + 22}" r="15" fill="${dark ? "#2a3942" : mine ? "rgba(255,255,255,0.25)" : "#f0f0f0"}"/>`,
        `<path d="M${bx + 26} ${y + 15} l 12 7 l -12 7 Z" fill="${mine && !dark ? "#ffffff" : c.accent}"/>`,
        ...bars,
        `<text font-family="${font}" font-size="10.5" fill="${mine ? mineMeta : c.subtle}" x="${bx + 16}" y="${y + vh - 8}">${dur}</text>`,
        `<text font-family="${font}" font-size="10.5" fill="${mine ? mineMeta : c.subtle}" text-anchor="end" x="${mine ? bx + vw - 27 : bx + vw - 9}" y="${y + vh - 8}">${esc(time)}</text>`,
        vTicks
      );
      if (m.reaction) {
        const rx = mine ? bx + 6 : bx + vw - 34;
        parts.push(
          `<rect x="${rx}" y="${y + vh - 6}" width="30" height="22" rx="11" fill="${dark ? "#1d282f" : "#ffffff"}" stroke="${c.hairline}" stroke-width="0.5"/>`,
          `<text font-size="13" text-anchor="middle" x="${rx + 15}" y="${y + vh + 10}">${esc(m.reaction)}</text>`
        );
        y += 16;
      }
      y += vh + 10;
      continue;
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
    const isGroupEnd = i === doc.messages.length - 1 || doc.messages[i + 1].from !== m.from;

    parts.push(
      `<rect x="${x}" y="${y}" width="${w.toFixed(1)}" height="${h}" rx="12" fill="${fill}" style="filter:drop-shadow(0 0.5px 0.5px rgba(0,0,0,0.12))"/>`
    );
    // current design: small curved tail at the BOTTOM corner of the last bubble in a group
    if (isGroupEnd)
      parts.push(
        mine
          ? `<path d="M${x + w - 4} ${y + h} h 9 c -3 -5.5 -5.5 -7.5 -9 -8.5 Z" fill="${fill}"/>`
          : `<path d="M${x + 4} ${y + h} h -9 c 3 -5.5 5.5 -7.5 9 -8.5 Z" fill="${fill}"/>`
      );
    parts.push(
      textBlock(lines, {
        x: x + PAD_X,
        y: bubbleBaseline(y, h - (metaInline ? 0 : 13), lines.length, LINE_H, FONT_SIZE),
        size: FONT_SIZE,
        lineHeight: LINE_H,
        color: mine ? mineText : c.bubbleText,
      })
    );

    // meta: time (+ ticks for outgoing) bottom-right inside the bubble
    const metaY = y + h - 7;
    const laterReply = doc.messages.slice(i + 1).some((n) => n.from === "them");
    const ticksSvg = mine ? ticks(m.ticks ?? (laterReply ? "read" : "delivered"), x + w - 9, metaY, mineMeta, c.mineBlueTick) : "";
    const timeX = mine ? x + w - 9 - 18 : x + w - 9;
    parts.push(
      `<text font-family="${font}" font-size="10.5" fill="${mine ? mineMeta : c.subtle}" text-anchor="end" x="${timeX}" y="${metaY}">${esc(time)}</text>`,
      ticksSvg
    );

    if (m.reaction) {
      const rx = mine ? x + 6 : x + w - 34;
      parts.push(
        `<rect x="${rx}" y="${y + h - 6}" width="30" height="22" rx="11" fill="${dark ? "#1d282f" : "#ffffff"}" stroke="${c.hairline}" stroke-width="0.5"/>`,
        `<text font-size="13" text-anchor="middle" x="${rx + 15}" y="${y + h + 10}">${esc(m.reaction)}</text>`
      );
      y += 16;
    }

    y += h + (i < doc.messages.length - 1 && doc.messages[i + 1].from === m.from ? 3 : 10);
  }

  // in-thread typing bubble — the animated three-dot beat before each reply
  // (dotPhase cycles per video frame, so the dots pulse in exports too)
  if (doc.chrome._anim?.typing) {
    const tw = 74, th = 40;
    parts.push(
      `<rect x="${MARGIN}" y="${y}" width="${tw}" height="${th}" rx="9" fill="${c.incoming}" style="filter:drop-shadow(0 0.5px 0.5px rgba(0,0,0,0.12))"/>`,
      `<path d="M${MARGIN + 4} ${y} h -10 c 3 6 6 8 10 9 Z" fill="${c.incoming}"/>`,
      typingDots(MARGIN + tw / 2, y + th / 2, c.subtle, doc.chrome._anim?.dotPhase ?? 0, 4, 12)
    );
    y += th + 10;
  }

  // pin the body to the bottom of the visible band above the composer
  const body = parts.splice(bodyStart);
  parts.push(scrollBody(body.join("\n"), { top: HEADER_H, bottom: SH - 92, contentBottom: y }));

  /* input bar */
  parts.push(...waComposer({ platform, dark, subtle: c.subtle, headerBg: c.headerBg, font }));

  return parts.join("\n");
}

/* ------------------------------- group chat ---------------------------------- */
/* Same chrome as 1-on-1; incoming bubbles carry a per-sender colored name. */

const SENDER_COLORS = ["#e17076", "#65aadd", "#a695e7", "#d09306", "#ee7aae", "#7bc862"];

/** Distinct per-participant colors assigned by first appearance — hash-based
 *  assignment produced duplicate colors in small groups, which reads as off. */
function senderColorMap(msgs: Array<{ from: string; sender?: string }>): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of msgs) {
    if (m.from !== "them" || !m.sender || map.has(m.sender)) continue;
    map.set(m.sender, SENDER_COLORS[map.size % SENDER_COLORS.length]);
  }
  return map;
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
    wallpaper: dark ? "#0b141a" : "#f4f1eb",
    headerBg: dark ? "#1f2c34" : "#f6f6f6",
    hairline: dark ? "#2c3942" : "#dcdcdc",
    text: dark ? "#e9edef" : "#000000",
    subtle: dark ? "#8696a0" : "#667781",
    incoming: dark ? "#202c33" : "#ffffff",
    outgoing: dark ? "#005c4b" : "#4ca35f",
    bubbleText: dark ? "#e9edef" : "#111b21",
    blueTick: "#53bdeb",
    mineBlueTick: dark ? "#53bdeb" : "#a8e5ff",
    accent: dark ? "#00a884" : "#008069", // WhatsApp green — unified across iOS/Android (never iOS blue)
  };
  const mineText = dark ? c.bubbleText : "#ffffff";
  const mineMeta = dark ? "rgba(233,237,239,0.7)" : "rgba(255,255,255,0.78)";
  const senderColors = senderColorMap(doc.messages);

  const parts: string[] = [resolveWallpaper(doc.wallpaper, dark) ?? `<rect width="${SW}" height="${SH}" fill="${c.wallpaper}"/>${dark ? "" : waDoodles()}`];

  const HEADER_H = 102;
  parts.push(
    `<rect width="${SW}" height="${HEADER_H}" fill="${c.headerBg}"/>`,
    `<rect y="${HEADER_H - 0.5}" width="${SW}" height="0.5" fill="${c.hairline}"/>`,
    statusBar({ time: doc.chrome.time, battery: doc.chrome.battery, color: c.text, platform }),
    `<circle cx="24" cy="73" r="15" fill="${dark ? "#243139" : "#ffffff"}" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.1))"/>`,
    `<path d="M27 65 l-8 8 8 8" fill="none" stroke="${c.text}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
    waAvatar(58, 73, 19, true, avatarUrl, doc.name, "wag"),
    textBlock([doc.name], { x: 86, y: 70, size: 16.5, lineHeight: 19, color: c.text, weight: 600 }),
    textBlock([doc.chrome._anim?.typing ? `${doc.messages.filter(m=>m.from==="them").slice(-1)[0]?.sender ?? "Someone"} is typing…` : doc.members], { x: 86, y: 87, size: 12, lineHeight: 14, color: doc.chrome._anim?.typing ? c.accent : c.subtle }),
    `<rect x="${SW - 92}" y="58" width="78" height="30" rx="15" fill="${dark ? "#243139" : "#ffffff"}" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.1))"/>`,
    `<rect x="${SW - 82}" y="66" width="18" height="14" rx="4" fill="none" stroke="${c.text}" stroke-width="1.8"/><path d="M${SW - 64} 69.5 l7 -3.5 v14 l-7 -3.5 Z" fill="${c.text}"/>`,
    `<path d="M${SW - 40} 70 l5 5 5 -5" fill="none" stroke="${c.text}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
  );

  const time = doc.chrome.time || "9:41";
  let y = HEADER_H + 20;
  for (let i = 0; i < doc.messages.length; i++) {
    const m = doc.messages[i];
    const mine = m.from === "me";
    const sender = !mine ? m.sender || "Member" : null;
    // voice-note bubble: play + deterministic waveform + duration
    if (m.voice) {
      const vw = 238, vh = 56;
      const bx = mine ? SW - MARGIN - vw : MARGIN;
      const fill = mine ? c.outgoing : c.incoming;
      const secs = Math.max(1, Math.round(m.voice.seconds));
      const dur = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
      const bars: string[] = [];
      for (let b = 0; b < 27; b++) {
        // deterministic pseudo-random heights so exports are reproducible
        const hgt = 4 + ((Math.sin((b + 1) * 12.9898 + i * 78.233) * 43758.5453) % 1 + 1) % 1 * 14;
        const bxp = bx + 64 + b * 5.4;
        bars.push(`<rect x="${bxp.toFixed(1)}" y="${(y + 22 - hgt / 2).toFixed(1)}" width="3" height="${hgt.toFixed(1)}" rx="1.5" fill="${b < 9 ? c.accent : c.subtle}" opacity="${b < 9 ? 1 : 0.55}"/>`);
      }
      const laterReplyV = doc.messages.slice(i + 1).some((n) => n.from === "them");
      const vTicks = mine ? ticks(m.ticks ?? (laterReplyV ? "read" : "delivered"), bx + vw - 9, y + vh - 8, mineMeta, c.mineBlueTick) : "";
      parts.push(
        `<rect x="${bx}" y="${y}" width="${vw}" height="${vh}" rx="9" fill="${fill}" style="filter:drop-shadow(0 0.5px 0.5px rgba(0,0,0,0.12))"/>`,
        `<circle cx="${bx + 30}" cy="${y + 22}" r="15" fill="${dark ? "#2a3942" : "#f0f0f0"}"/>`,
        `<path d="M${bx + 26} ${y + 15} l 12 7 l -12 7 Z" fill="${c.accent}"/>`,
        ...bars,
        `<text font-family="${font}" font-size="10.5" fill="${c.subtle}" x="${bx + 16}" y="${y + vh - 8}">${dur}</text>`,
        `<text font-family="${font}" font-size="10.5" fill="${c.subtle}" text-anchor="end" x="${mine ? bx + vw - 27 : bx + vw - 9}" y="${y + vh - 8}">${esc(time)}</text>`,
        vTicks
      );
      if (m.reaction) {
        const rx = mine ? bx + 6 : bx + vw - 34;
        parts.push(
          `<rect x="${rx}" y="${y + vh - 6}" width="30" height="22" rx="11" fill="${dark ? "#1d282f" : "#ffffff"}" stroke="${c.hairline}" stroke-width="0.5"/>`,
          `<text font-size="13" text-anchor="middle" x="${rx + 15}" y="${y + vh + 10}">${esc(m.reaction)}</text>`
        );
        y += 16;
      }
      y += vh + 10;
      continue;
    }

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
    // incoming shifts right to make room for the per-sender avatar column
    const x = mine ? SW - MARGIN - w : MARGIN + 34;
    const fill = mine ? c.outgoing : c.incoming;
    const isGroupStart = i === 0 || doc.messages[i - 1].from !== m.from ||
      (!mine && doc.messages[i - 1].sender !== m.sender);
    const isGroupEnd = i === doc.messages.length - 1 || doc.messages[i + 1].from !== m.from ||
      (!mine && doc.messages[i + 1].sender !== m.sender);

    // small circular sender avatar beside the first bubble of an incoming group
    if (!mine && isGroupStart) parts.push(avatar(sender || "M", MARGIN + 13, y + 14, 13, `wags${i}`));

    parts.push(
      `<rect x="${x}" y="${y}" width="${w.toFixed(1)}" height="${h}" rx="12" fill="${fill}" style="filter:drop-shadow(0 0.5px 0.5px rgba(0,0,0,0.12))"/>`
    );
    if (isGroupEnd)
      parts.push(
        mine
          ? `<path d="M${x + w - 4} ${y + h} h 9 c -3 -5.5 -5.5 -7.5 -9 -8.5 Z" fill="${fill}"/>`
          : `<path d="M${x + 4} ${y + h} h -9 c 3 -5.5 5.5 -7.5 9 -8.5 Z" fill="${fill}"/>`
      );
    if (sender)
      parts.push(
        textBlock([sender], { x: x + PAD_X, y: y + PAD_Y + 10, size: 12.5, lineHeight: 14, color: senderColors.get(sender) ?? SENDER_COLORS[0], weight: 600 })
      );
    parts.push(
      textBlock(lines, {
        x: x + PAD_X,
        y: bubbleBaseline(y + senderH, h - senderH - (metaInline ? 0 : 13), lines.length, LINE_H, FONT_SIZE),
        size: FONT_SIZE,
        lineHeight: LINE_H,
        color: mine ? mineText : c.bubbleText,
      })
    );
    const metaY = y + h - 7;
    const timeX = mine ? x + w - 9 - 18 : x + w - 9;
    parts.push(
      `<text font-family="${font}" font-size="10.5" fill="${mine ? mineMeta : c.subtle}" text-anchor="end" x="${timeX}" y="${metaY}">${esc(time)}</text>`,
      mine ? ticks(m.ticks ?? "read", x + w - 9, metaY, mineMeta, c.mineBlueTick) : ""
    );
    y += h + (i < doc.messages.length - 1 && doc.messages[i + 1].from === m.from && (mine || doc.messages[i + 1].sender === m.sender) ? 3 : 10);
  }

  if (doc.chrome._anim?.typing) {
    const tw = 74, th = 40;
    parts.push(
      `<rect x="${MARGIN}" y="${y}" width="${tw}" height="${th}" rx="9" fill="${c.incoming}" style="filter:drop-shadow(0 0.5px 0.5px rgba(0,0,0,0.12))"/>`,
      `<path d="M${MARGIN + 4} ${y} h -10 c 3 6 6 8 10 9 Z" fill="${c.incoming}"/>`,
      typingDots(MARGIN + tw / 2, y + th / 2, c.subtle, doc.chrome._anim?.dotPhase ?? 0, 4, 12)
    );
    y += th + 10;
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

  // iOS floating bar: + in a white circle, pill field with the sticker icon
  // inside its right edge, then bare ₹ (user request) / camera / mic glyphs
  const iy = SH - 68;
  return [
    `<circle cx="26" cy="${iy + 18}" r="16" fill="${dark ? "#243139" : "#ffffff"}" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.12))"/>`,
    `<path d="M26 ${iy + 11} v14 M19 ${iy + 18} h14" stroke="${subtle}" stroke-width="2" stroke-linecap="round"/>`,
    glassPill(50, iy, SW - 50 - 110, 36, dark),
    `<text font-family="${font}" font-size="15" fill="${subtle}" x="64" y="${iy + 23}">Message</text>`,
    // sticker icon inside the field's right edge
    `<rect x="${SW - 130}" y="${iy + 11}" width="14" height="14" rx="4" fill="none" stroke="${subtle}" stroke-width="1.5"/><path d="M${SW - 123} ${iy + 25} a 7 7 0 0 0 7 -7" fill="none" stroke="${subtle}" stroke-width="1.4"/>`,
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
  // thin, timestamp-height checks — oversized bright ticks read as fake
  const tick = (dx: number) =>
    `<path d="M${xRight - 12 + dx} ${y - 3.5} l 2.2 2.4 4.6 -5.2" fill="none" stroke="${color}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>`;
  return state === "sent" ? tick(2.5) : tick(0) + tick(4);
}

function verifiedBadge(x: number, y: number, color: string): string {
  return `<circle cx="${x + 7}" cy="${y + 7}" r="7" fill="${color}"/><path d="M${x + 4} ${y + 7.5} l2 2 4 -4" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
}
