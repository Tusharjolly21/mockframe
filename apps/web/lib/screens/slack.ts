"use client";

import {
  esc,
  homeIndicator,
  initials,
  SH,
  statusBar,
  SW,
  textBlock as baseTextBlock,
  textWidth,
  UI_FONT,
  wrapText,
} from "./common";
import { fontFor } from "./fonts";
import type { SlackDoc } from "./types";

/**
 * Slack (mobile) channel view: "# channel" header, square avatars, bold
 * near-black names + gray timestamps, message text, and rounded reaction
 * pills. White surface, Slack aubergine accents. §15.
 */

const MARGIN = 16;
const AVA = 36;
const TEXT_X = MARGIN + AVA + 12;
const FONT = 15.5;
const LINE_H = 21;

const NAME_COLORS = ["#e01e5a", "#2eb67d", "#ecb22e", "#36c5f0", "#4a154b", "#1264a3"];
function nameColor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return NAME_COLORS[h % NAME_COLORS.length];
}

/** Slack uses rounded-SQUARE avatars, unlike the round ones elsewhere. */
function squareAvatar(name: string, x: number, y: number, s: number, imageUrl?: string): string {
  const presence = `<rect x="${x + s - 5}" y="${y + s - 5}" width="9" height="9" rx="2.5" fill="#2bac76" stroke="#fff" stroke-width="1.5"/>`;
  if (imageUrl) {
    const id = `sqav${x}_${y}`;
    return (
      `<defs><clipPath id="${id}"><rect x="${x}" y="${y}" width="${s}" height="${s}" rx="8"/></clipPath></defs>` +
      `<image href="${imageUrl}" x="${x}" y="${y}" width="${s}" height="${s}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>` +
      presence
    );
  }
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = h % 360;
  return (
    `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="8" fill="hsl(${hue} 55% 55%)"/>` +
    `<text font-family="${UI_FONT}" font-size="${s * 0.42}" font-weight="700" fill="#fff" text-anchor="middle" x="${x + s / 2}" y="${y + s * 0.62}">${esc(initials(name))}</text>` +
    presence
  );
}

export function renderSlack(doc: SlackDoc, lookupUrl?: (id: string) => string | undefined): string {
  const platform = doc.chrome.platform ?? "ios";
  const font = fontFor("slack", platform);
  const textBlock = (lines: string[], o: Parameters<typeof baseTextBlock>[1]) =>
    baseTextBlock(lines, { font, ...o });
  const dark = !!doc.chrome.dark;
  const c = dark
    ? { bg: "#1a1d21", header: "#1a1d21", hairline: "#35373b", text: "#d1d2d3", subtle: "#ababad", pill: "#2c2d30", composer: "#222529" }
    : { bg: "#ffffff", header: "#ffffff", hairline: "#e8e8e8", text: "#1d1c1d", subtle: "#616061", pill: "#f2f2f2", composer: "#ffffff" };

  const parts: string[] = [`<rect width="${SW}" height="${SH}" fill="${c.bg}"/>`];

  /* header: # channel + workspace */
  const HEADER_H = 100;
  parts.push(
    statusBar({ time: doc.chrome.time, battery: doc.chrome.battery, color: c.text, platform }),
    `<rect y="${HEADER_H - 0.5}" width="${SW}" height="0.5" fill="${c.hairline}"/>`,
    `<path d="M24 70 l-10 10 10 10" fill="none" stroke="${c.text}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
    // # glyph + channel name
    `<path d="M46 72 l-3 18 M56 72 l-3 18 M42 78 h16 M40 85 h16" stroke="${c.subtle}" stroke-width="2.2" stroke-linecap="round"/>`,
    `<text font-family="${font}" font-size="17" font-weight="800" fill="${c.text}" x="64" y="82">${esc(doc.channel)}</text>`,
    // headphones (huddle) + info right
    `<path d="M${SW - 66} 84 v-5 a8 8 0 0 1 16 0 v5 M${SW - 66} 82 h4 v6 h-4 Z M${SW - 54} 82 h4 v6 h-4 Z" fill="none" stroke="${c.text}" stroke-width="1.8" stroke-linejoin="round"/>`,
    `<circle cx="${SW - 28}" cy="80" r="9" fill="none" stroke="${c.text}" stroke-width="1.8"/><path d="M${SW - 28} 76 v0.5 M${SW - 28} 79.5 v4.5" stroke="${c.text}" stroke-width="1.8" stroke-linecap="round"/>`
  );

  /* messages, grouped by sender */
  let y = HEADER_H + 24;
  const msgs = doc.messages;
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    const grouped = i > 0 && msgs[i - 1].sender === m.sender;
    if (!grouped) {
      y += i === 0 ? 0 : 12;
      parts.push(squareAvatar(m.sender, MARGIN, y - 4, AVA, m.avatar ? lookupUrl?.(m.avatar) : undefined));
      const col = m.color || nameColor(m.sender);
      parts.push(
        `<text font-family="${font}" font-size="15.5" font-weight="900" fill="${col}" x="${TEXT_X}" y="${y + 8}">${esc(m.sender)}</text>`,
        `<text font-family="${font}" font-size="11.5" fill="${c.subtle}" x="${TEXT_X + textWidth(m.sender, 15.5) + 10}" y="${y + 8}">${esc(m.time)}</text>`
      );
      y += 18;
    }
    const lines = wrapText(m.text || " ", FONT, SW - TEXT_X - MARGIN);
    parts.push(textBlock(lines, { x: TEXT_X, y: y + FONT * 0.82, size: FONT, lineHeight: LINE_H, color: c.text }));
    y += lines.length * LINE_H + 4;
    // reaction pills
    if (m.reactions?.length) {
      let rx = TEXT_X;
      for (const r of m.reactions) {
        const pw = textWidth(r, 12) + 18;
        parts.push(
          `<rect x="${rx}" y="${y}" width="${pw.toFixed(0)}" height="24" rx="12" fill="${c.pill}" stroke="${c.hairline}" stroke-width="1"/>`,
          `<text font-family="${font}" font-size="12" fill="${c.text}" x="${rx + 9}" y="${y + 16}">${esc(r)}</text>`
        );
        rx += pw + 6;
      }
      y += 32;
    }
  }

  /* composer */
  const iy = SH - 66;
  parts.push(
    `<rect x="0" y="${iy - 14}" width="${SW}" height="${SH - iy + 14}" fill="${c.composer}"/>`,
    `<rect x="${MARGIN}" y="${iy}" width="${SW - MARGIN * 2}" height="42" rx="12" fill="none" stroke="${c.hairline}" stroke-width="1.4"/>`,
    `<text font-family="${font}" font-size="14.5" fill="${c.subtle}" x="${MARGIN + 14}" y="${iy + 26}">Message #${esc(doc.channel)}</text>`,
    // + at left of a second row would be Slack; keep simple: icons right
    `<path d="M${SW - 92} ${iy + 15} v12 M${SW - 98} ${iy + 21} h12" stroke="${c.subtle}" stroke-width="2" stroke-linecap="round"/>`,
    `<circle cx="${SW - 62}" cy="${iy + 21}" r="8.5" fill="none" stroke="${c.subtle}" stroke-width="1.6"/><path d="M${SW - 66} ${iy + 23} a5 5 0 0 0 8 0 M${SW - 65} ${iy + 18.5} h0.01 M${SW - 59} ${iy + 18.5} h0.01" stroke="${c.subtle}" stroke-width="1.6" stroke-linecap="round" fill="none"/>`,
    `<rect x="${SW - 40}" y="${iy + 12}" width="9" height="14" rx="4.5" fill="none" stroke="${c.subtle}" stroke-width="1.8"/><path d="M${SW - 43} ${iy + 20} a 7.5 7.5 0 0 0 15 0 M${SW - 35.5} ${iy + 27.5} v3" fill="none" stroke="${c.subtle}" stroke-width="1.8" stroke-linecap="round"/>`,
    homeIndicator(c.text, platform)
  );

  return parts.join("\n");
}
