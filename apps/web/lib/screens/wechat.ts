"use client";

import {
  bubbleBaseline,
  esc,
  homeIndicator,
  initials,
  scrollBody,
  SH,
  statusBar,
  SW,
  textBlock as baseTextBlock,
  textWidth,
  typingDots,
  wrapText,
} from "./common";
import { fontFor } from "./fonts";
import type { WeChatDoc } from "./types";

/**
 * WeChat (微信) conversation: the grey #ededed canvas, centered contact title,
 * square-cornered avatars beside every message on BOTH sides, white incoming
 * vs signature #95ec69 green outgoing bubbles with little side tails, centered
 * timestamps, and the voice / input / emoji / plus composer.
 */

const BUBBLE_MAX = 236;
const FONT_SIZE = 16;
const LINE_H = 22;
const PAD_X = 12;
const PAD_Y = 10;
const AV = 40; // avatar size
const MARGIN = 12;
const HEADER_H = 96;
const COMPOSER_Y = SH - 84;

export function renderWeChat(doc: WeChatDoc, avatarUrl?: string, meAvatarUrl?: string): string {
  const platform = doc.chrome.platform ?? "ios";
  const font = fontFor("wechat", platform);
  const textBlock = (lines: string[], o: Parameters<typeof baseTextBlock>[1]) => baseTextBlock(lines, { font, ...o });
  const dark = !!doc.chrome.dark;
  const c = {
    bg: dark ? "#111111" : "#ededed",
    header: dark ? "#1e1e1e" : "#ededed",
    text: dark ? "#d5d5d5" : "#191919",
    faint: dark ? "#6f6f6f" : "#a9a9a9",
    incoming: dark ? "#2c2c2c" : "#ffffff",
    outgoing: dark ? "#3eb575" : "#95ec69",
    outgoingText: dark ? "#0b1b0b" : "#191919",
    bar: dark ? "#1e1e1e" : "#f7f7f7",
    input: dark ? "#2c2c2c" : "#ffffff",
    line: dark ? "#2a2a2a" : "#d9d9d9",
  };

  const parts: string[] = [`<rect width="${SW}" height="${SH}" fill="${c.bg}"/>`];

  const squareAvatar = (name: string, x: number, y: number, id: string, url?: string) => {
    if (url) {
      return `<defs><clipPath id="wc${id}"><rect x="${x}" y="${y}" width="${AV}" height="${AV}" rx="5"/></clipPath></defs><image href="${url}" x="${x}" y="${y}" width="${AV}" height="${AV}" preserveAspectRatio="xMidYMid slice" clip-path="url(#wc${id})"/>`;
    }
    let h = 0;
    for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const hue = h % 360;
    return `<rect x="${x}" y="${y}" width="${AV}" height="${AV}" rx="5" fill="hsl(${hue} 45% 58%)"/><text font-family="${font}" font-size="16" font-weight="600" fill="#fff" text-anchor="middle" x="${x + AV / 2}" y="${y + AV / 2 + 6}">${esc(initials(name))}</text>`;
  };

  /* messages */
  const body: string[] = [];
  let y = HEADER_H + 18;
  const time = doc.chrome.time || "9:41";
  body.push(`<text font-family="${font}" font-size="12.5" fill="${c.faint}" text-anchor="middle" x="${SW / 2}" y="${y + 6}">${esc(time)}</text>`);
  y += 24;
  doc.messages.forEach((m, i) => {
    if (m.dateLabel) {
      body.push(`<text font-family="${font}" font-size="12.5" fill="${c.faint}" text-anchor="middle" x="${SW / 2}" y="${y + 6}">${esc(m.dateLabel)}</text>`);
      y += 26;
    }
    const mine = m.from === "me";
    const lines = wrapText(m.text || " ", FONT_SIZE, BUBBLE_MAX - PAD_X * 2);
    const w = Math.min(BUBBLE_MAX, Math.max(...lines.map((l) => textWidth(l, FONT_SIZE))) + PAD_X * 2 + 6);
    const h = Math.max(AV, lines.length * LINE_H + PAD_Y * 2);
    const avX = mine ? SW - MARGIN - AV : MARGIN;
    const bx = mine ? avX - 10 - w : avX + AV + 10;
    const fill = mine ? c.outgoing : c.incoming;
    // side tail, level with the avatar's center
    const ty = y + AV / 2;
    const tail = mine
      ? `<path d="M${bx + w - 0.5} ${ty - 6} l6 6 -6 6 Z" fill="${fill}"/>`
      : `<path d="M${bx + 0.5} ${ty - 6} l-6 6 6 6 Z" fill="${fill}"/>`;
    body.push(
      squareAvatar(mine ? doc.me || "Me" : doc.contact, avX, y, `${i}`, mine ? meAvatarUrl : avatarUrl),
      `<rect x="${bx}" y="${y}" width="${w.toFixed(1)}" height="${h}" rx="5" fill="${fill}"/>`,
      tail,
      textBlock(lines, {
        x: bx + PAD_X,
        y: bubbleBaseline(y, h, lines.length, LINE_H, FONT_SIZE),
        size: FONT_SIZE,
        lineHeight: LINE_H,
        color: mine ? c.outgoingText : c.text,
      })
    );
    y += h + 16;
  });
  if (doc.chrome._anim?.typing) {
    // WeChat shows "typing…" in the title bar; also show a pending bubble
    body.push(
      squareAvatar(doc.contact, MARGIN, y, "t", avatarUrl),
      `<rect x="${MARGIN + AV + 10}" y="${y}" width="58" height="${AV}" rx="5" fill="${c.incoming}"/>`,
      typingDots(MARGIN + AV + 39, y + AV / 2, c.faint, doc.chrome._anim.dotPhase ?? 0, 3.2, 11)
    );
    y += AV + 16;
  }
  parts.push(scrollBody(body.join("\n"), { top: HEADER_H, bottom: COMPOSER_Y - 6, contentBottom: y }));

  /* header */
  const title = doc.chrome._anim?.typing ? "Typing…" : doc.contact;
  parts.push(
    `<rect width="${SW}" height="${HEADER_H}" fill="${c.header}"/>`,
    `<rect y="${HEADER_H - 0.5}" width="${SW}" height="0.5" fill="${c.line}"/>`,
    statusBar({ time: doc.chrome.time, battery: doc.chrome.battery, color: c.text, platform }),
    `<path d="M24 62 l-10 10 10 10" fill="none" stroke="${c.text}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
    doc.unread ? `<text font-family="${font}" font-size="15" fill="${c.text}" x="34" y="78">${doc.unread}</text>` : "",
    `<text font-family="${font}" font-size="17" font-weight="600" fill="${c.text}" text-anchor="middle" x="${SW / 2}" y="78">${esc(title)}</text>`,
    `<g fill="${c.text}"><circle cx="${SW - 36}" cy="72" r="2.3"/><circle cx="${SW - 27}" cy="72" r="2.3"/><circle cx="${SW - 18}" cy="72" r="2.3"/></g>`
  );

  /* composer: voice · input · emoji · plus */
  const iy = COMPOSER_Y;
  parts.push(
    `<rect y="${iy - 6}" width="${SW}" height="${SH - iy + 6}" fill="${c.bar}"/>`,
    `<rect y="${iy - 6}" width="${SW}" height="0.5" fill="${c.line}"/>`,
    `<circle cx="28" cy="${iy + 20}" r="14" fill="none" stroke="${c.text}" stroke-width="1.6"/>`,
    `<path d="M24 ${iy + 15} a6 6 0 0 1 0 10 M28 ${iy + 12} a10 10 0 0 1 0 16" fill="none" stroke="${c.text}" stroke-width="1.6" stroke-linecap="round"/>`,
    `<rect x="52" y="${iy + 2}" width="${SW - 52 - 92}" height="38" rx="5" fill="${c.input}"/>`,
    `<circle cx="${SW - 68}" cy="${iy + 20}" r="14" fill="none" stroke="${c.text}" stroke-width="1.6"/>`,
    `<path d="M${SW - 74} ${iy + 23} a7 7 0 0 0 12 0 M${SW - 73} ${iy + 16} h0.01 M${SW - 63} ${iy + 16} h0.01" fill="none" stroke="${c.text}" stroke-width="1.8" stroke-linecap="round"/>`,
    `<circle cx="${SW - 28}" cy="${iy + 20}" r="14" fill="none" stroke="${c.text}" stroke-width="1.6"/>`,
    `<path d="M${SW - 28} ${iy + 13} v14 M${SW - 35} ${iy + 20} h14" stroke="${c.text}" stroke-width="1.6" stroke-linecap="round"/>`,
    homeIndicator(c.text, platform)
  );

  return parts.join("\n");
}
