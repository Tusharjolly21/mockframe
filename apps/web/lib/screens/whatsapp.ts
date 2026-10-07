"use client";

import {
  avatar,
  glassPill,
  bubbleBaseline,
  esc,
  fileCard,
  glyph,
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
import { resolveWallpaper, whatsappDoodle } from "./wallpapers";
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
  const android = platform === "android";
  const c = {
    headerBg: dark ? "#1f2c34" : android ? "#ffffff" : "#f6f6f6",
    hairline: dark ? "#2c3942" : "#dcdcdc",
    text: dark ? "#e9edef" : "#000000",
    subtle: dark ? "#8696a0" : "#667781",
    icon: dark ? "#aebac1" : "#54656f", // Android app-bar glyphs
    incoming: dark ? "#202c33" : "#ffffff",
    outgoing: dark ? "#005c4b" : "#dcf8c6",
    bubbleText: dark ? "#e9edef" : "#111b21",
    outMeta: dark ? "rgba(233,237,239,0.6)" : "#667781", // time inside a sent bubble
    blueTick: "#53bdeb",
    accent: dark ? "#00a884" : "#008069", // WhatsApp green — unified across iOS/Android (never iOS blue)
    chipBg: dark ? "#182229" : "#fdf4c5",
    chipText: dark ? "#ffd279" : "#54656f", // the encryption notice is amber in dark mode
    dateBg: dark ? "#182229" : "#ffffff",
  };

  const parts: string[] = [resolveWallpaper(doc.wallpaper, dark) ?? whatsappDoodle(dark)];
  const presence = doc.chrome._anim?.typing ? "typing…" : doc.presence || "online";
  const presenceColor = doc.chrome._anim?.typing ? c.accent : c.subtle;

  /* header */
  const HEADER_H = 102;
  parts.push(
    `<rect width="${SW}" height="${HEADER_H}" fill="${c.headerBg}"/>`,
    dark || !android ? `<rect y="${HEADER_H - 0.5}" width="${SW}" height="0.5" fill="${c.hairline}"/>` : "",
    statusBar({ time: doc.chrome.time, battery: doc.chrome.battery, color: c.text, platform })
  );
  if (android) {
    // Material app bar: ← arrow, photo, name over presence, then video · call · ⋮
    parts.push(
      glyph(MD.arrowBack, 22, 73, 24, c.icon),
      waAvatar(56, 73, 20, dark, avatarUrl),
      textBlock([doc.contact], { x: 86, y: 70, size: 17, lineHeight: 20, color: c.text, weight: 500 }),
      doc.verified ? verifiedBadge(86 + textWidth(doc.contact, 17) + 5, 70 - 13, c.accent) : "",
      textBlock([presence], { x: 86, y: 88, size: 13, lineHeight: 15, color: presenceColor }),
      glyph(MD.videocam, SW - 112, 73, 26, c.icon),
      glyph(MD.call, SW - 66, 73, 23, c.icon),
      glyph(MD.moreVert, SW - 24, 73, 24, c.icon)
    );
  } else {
    parts.push(
      `<path d="M24 62 l-10 11 10 11" fill="none" stroke="${c.accent}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`,
      waAvatar(52, 73, 19, dark, avatarUrl),
      textBlock([doc.contact], { x: 80, y: 70, size: 16.5, lineHeight: 19, color: c.text, weight: 600 }),
      doc.verified ? verifiedBadge(80 + textWidth(doc.contact, 16.5) + 5, 70 - 13, c.accent) : "",
      textBlock([presence], { x: 80, y: 87, size: 12, lineHeight: 14, color: presenceColor }),
      videoIcon(SW - 76, 73, 25, c.text),
      phoneIcon(SW - 34, 73, 21, c.text)
    );
  }

  /* message body (scrolls to bottom when taller than the band) */
  const bodyStart = parts.length;
  let y = HEADER_H + 14;
  // encryption notice: centered, wrapped, with a small lock leading the first line
  const chipLines = wrapText(
    "Messages and calls are end-to-end encrypted. Only people in this chat can read, listen to, or share them. Learn more",
    12,
    268
  );
  const chipW = Math.max(...chipLines.map((l, i) => textWidth(l, 12) + (i === 0 ? 16 : 0))) + 28;
  const chipH = chipLines.length * 16 + 16;
  const lockX = SW / 2 - (textWidth(chipLines[0], 12) + 16) / 2;
  parts.push(
    `<rect x="${((SW - chipW) / 2).toFixed(1)}" y="${y}" width="${chipW.toFixed(1)}" height="${chipH}" rx="8" fill="${c.chipBg}"/>`,
    glyph(MD.lock, lockX + 5, y + 19.5, 11, c.chipText),
    `<text font-family="${font}" font-size="12" fill="${c.chipText}" text-anchor="middle">${chipLines
      .map((l, i) => `<tspan x="${(SW / 2 + (i === 0 ? 8 : 0)).toFixed(1)}" y="${y + 24 + i * 16}">${esc(l)}</tspan>`)
      .join("")}</text>`
  );
  y += chipH + 14;

  /* messages */
  const time = doc.chrome.time || "9:41";
  const dateChip = (label: string, cy: number) => {
    const pw = textWidth(label, 11.5) + 26;
    return (
      `<rect x="${(SW - pw) / 2}" y="${cy}" width="${pw.toFixed(0)}" height="26" rx="8" fill="${c.dateBg}"/>` +
      `<text font-family="${font}" font-size="11.5" font-weight="500" fill="${c.subtle}" text-anchor="middle" x="${SW / 2}" y="${cy + 17}">${esc(label)}</text>`
    );
  };
  const dateChips: { idx: number; y: number; label: string }[] = [];
  for (let i = 0; i < doc.messages.length; i++) {
    const m = doc.messages[i];
    const mine = m.from === "me";

    // date separator pill ("Today" / "Yesterday")
    if (m.dateLabel) {
      dateChips.push({ idx: parts.length, y, label: m.dateLabel });
      parts.push(dateChip(m.dateLabel, y));
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
      const vTicks = mine ? ticks(m.ticks ?? (laterReplyV ? "read" : "delivered"), bx + vw - 9, y + vh - 8, c.subtle, c.blueTick) : "";
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
      // tail on the first bubble of a run: that top corner goes square
      parts.push(
        mine
          ? `<rect x="${(x + w - 10).toFixed(1)}" y="${y}" width="10" height="10" fill="${fill}"/><path d="M${x + w - 4} ${y} h 10 c -3 6 -6 8 -10 9 Z" fill="${fill}"/>`
          : `<rect x="${x}" y="${y}" width="10" height="10" fill="${fill}"/><path d="M${x + 4} ${y} h -10 c 3 6 6 8 10 9 Z" fill="${fill}"/>`
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
    const laterReply = doc.messages.slice(i + 1).some((n) => n.from === "them");
    const ticksSvg = mine ? ticks(m.ticks ?? (laterReply ? "read" : "delivered"), x + w - 9, metaY, c.outMeta, c.blueTick) : "";
    const timeX = mine ? x + w - 9 - 18 : x + w - 9;
    parts.push(
      `<text font-family="${font}" font-size="10.5" fill="${mine ? c.outMeta : c.subtle}" text-anchor="end" x="${timeX}" y="${metaY}">${esc(time)}</text>`,
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

  // pin the body to the bottom of the visible band above the composer. Once
  // the latest date pill scrolls under the header it sticks below it instead,
  // as it does in WhatsApp.
  const bodyBottom = SH - (android ? 80 : 92);
  const scrolled = Math.max(0, y - bodyBottom);
  const STICKY_Y = HEADER_H + 8;
  const stuck = [...dateChips].reverse().find((d) => d.y - scrolled < STICKY_Y);
  if (stuck) parts[stuck.idx] = "";
  const body = parts.splice(bodyStart);
  parts.push(scrollBody(body.join("\n"), { top: HEADER_H, bottom: bodyBottom, contentBottom: y }));
  if (stuck) parts.push(dateChip(stuck.label, STICKY_Y));

  /* input bar */
  parts.push(...waComposer({ platform, dark, subtle: c.subtle, headerBg: c.headerBg, font }));

  return parts.join("\n");
}

/* Material Symbols geometry (Apache-2.0) for the Android chrome. */
const MD = {
  arrowBack: "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z",
  videocam:
    "M15 8v8H5V8h10m1-2H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4V7c0-.55-.45-1-1-1z",
  call:
    "M6.54 5c.06.89.21 1.76.45 2.59l-1.2 1.2c-.41-1.2-.67-2.47-.76-3.79h1.51m9.86 12.02c.85.24 1.72.39 2.6.45v1.49c-1.32-.09-2.59-.35-3.8-.75l1.2-1.19M7.5 3H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.49c0-.55-.45-1-1-1-1.24 0-2.45-.2-3.57-.57-.1-.04-.21-.05-.31-.05-.26 0-.51.1-.71.29l-2.2 2.2c-2.83-1.45-5.15-3.76-6.59-6.59l2.2-2.2c.28-.28.36-.67.25-1.02C8.7 6.45 8.5 5.25 8.5 4c0-.55-.45-1-1-1z",
  moreVert:
    "M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z",
  lock:
    "M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z",
  emoji:
    "M15.5 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm-7 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm3.49-9C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm0-2.5c2.33 0 4.32-1.45 5.12-3.5H6.88c.8 2.05 2.79 3.5 5.12 3.5z",
  attach:
    "M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z",
  camera:
    "M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM9 2 7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z",
  mic:
    "M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z",
};

/** The contact photo, or WhatsApp's own grey silhouette when there isn't one. */
function waAvatar(cx: number, cy: number, r: number, dark: boolean, imageUrl?: string): string {
  if (imageUrl) return avatar("", cx, cy, r, "wa", imageUrl);
  const bg = dark ? "#6a7175" : "#dfe5e7";
  const fg = dark ? "#cfd4d6" : "#ffffff";
  return (
    `<defs><clipPath id="wadp"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath></defs>` +
    `<g clip-path="url(#wadp)"><circle cx="${cx}" cy="${cy}" r="${r}" fill="${bg}"/>` +
    `<circle cx="${cx}" cy="${(cy - r * 0.2).toFixed(1)}" r="${(r * 0.38).toFixed(1)}" fill="${fg}"/>` +
    `<ellipse cx="${cx}" cy="${(cy + r * 0.86).toFixed(1)}" rx="${(r * 0.7).toFixed(1)}" ry="${(r * 0.56).toFixed(1)}" fill="${fg}"/></g>`
  );
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

  const parts: string[] = [resolveWallpaper(doc.wallpaper, dark) ?? whatsappDoodle(dark)];

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
      const vTicks = mine ? ticks(m.ticks ?? (laterReplyV ? "read" : "delivered"), bx + vw - 9, y + vh - 8, c.subtle, c.blueTick) : "";
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
    // floating pill (emoji · Message · clip · ₹ · camera) beside the round mic button
    const PH = 48;
    const iy = SH - 22 - PH;
    const cy = iy + PH / 2;
    const fabR = 24;
    const fx = SW - 6 - fabR;
    const px = 6;
    const pw = fx - fabR - 6 - px;
    const pr = px + pw;
    return [
      `<rect x="${px}" y="${iy}" width="${pw}" height="${PH}" rx="${PH / 2}" fill="${dark ? "#1f2c34" : "#ffffff"}"${dark ? "" : ` style="filter:drop-shadow(0 1px 1.5px rgba(11,20,26,0.14))"`}/>`,
      glyph(MD.emoji, px + 25, cy, 25, subtle),
      `<text font-family="${font}" font-size="17" fill="${subtle}" x="${px + 50}" y="${cy + 6}">Message</text>`,
      glyph(MD.attach, pr - 100, cy, 24, subtle, 45),
      `<circle cx="${pr - 62}" cy="${cy}" r="10" fill="none" stroke="${subtle}" stroke-width="1.8"/>`,
      `<text font-family="${font}" font-size="12.5" font-weight="700" fill="${subtle}" text-anchor="middle" x="${pr - 62}" y="${cy + 4.5}">₹</text>`,
      glyph(MD.camera, pr - 24, cy, 24, subtle),
      `<circle cx="${fx}" cy="${cy}" r="${fabR}" fill="#00a884"/>`,
      glyph(MD.mic, fx, cy, 24, "#ffffff"),
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

function verifiedBadge(x: number, y: number, color: string): string {
  return `<circle cx="${x + 7}" cy="${y + 7}" r="7" fill="${color}"/><path d="M${x + 4} ${y + 7.5} l2 2 4 -4" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
}
