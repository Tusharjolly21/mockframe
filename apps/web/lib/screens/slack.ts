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

/** Slack uses rounded-SQUARE avatars, unlike the round ones elsewhere.
 *  No presence overlay — Slack doesn't draw presence on channel message avatars. */
function squareAvatar(name: string, x: number, y: number, s: number, imageUrl?: string): string {
  if (imageUrl) {
    const id = `sqav${x}_${y}`;
    return (
      `<defs><clipPath id="${id}"><rect x="${x}" y="${y}" width="${s}" height="${s}" rx="8"/></clipPath></defs>` +
      `<image href="${imageUrl}" x="${x}" y="${y}" width="${s}" height="${s}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>`
    );
  }
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = h % 360;
  return (
    `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="8" fill="hsl(${hue} 55% 55%)"/>` +
    `<text font-family="${UI_FONT}" font-size="${s * 0.42}" font-weight="700" fill="#fff" text-anchor="middle" x="${x + s / 2}" y="${y + s * 0.62}">${esc(initials(name))}</text>`
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
    `<path d="M24 70 l-10 10 10 10" fill="none" stroke="${c.text}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`
  );
  // compact channel pill: "#channel" bold with a "N members ›" subtitle inside
  {
    const memberCount = Math.max(2, new Set(doc.messages.map((m) => m.sender)).size + 1);
    const nameW = textWidth(`# ${doc.channel}`, 15.5);
    const subW = textWidth(`${memberCount} members`, 11.5) + 10;
    const pillW = Math.max(nameW, subW) + 28;
    parts.push(
      `<rect x="42" y="58" width="${pillW.toFixed(0)}" height="42" rx="12" fill="${dark ? "#2c2d30" : "#f4f4f4"}"/>`,
      `<text font-family="${font}" font-size="15.5" font-weight="800" fill="${c.text}" x="56" y="77"># ${esc(doc.channel)}</text>`,
      `<text font-family="${font}" font-size="11.5" fill="${c.subtle}" x="56" y="93">${memberCount} members</text>`,
      `<path d="M${56 + subW} 86 l4 4 -4 4" fill="none" stroke="${c.subtle}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" transform="translate(0,-3)"/>`
    );
  }
  parts.push(
    // checklist + headphones (huddle) right
    `<rect x="${SW - 74}" y="71" width="16" height="18" rx="3" fill="none" stroke="${c.text}" stroke-width="1.7"/><path d="M${SW - 70} 77 h8 M${SW - 70} 82 h8" stroke="${c.text}" stroke-width="1.5" stroke-linecap="round"/>`,
    `<path d="M${SW - 42} 84 v-5 a8 8 0 0 1 16 0 v5 M${SW - 42} 82 h4 v6 h-4 Z M${SW - 30} 82 h4 v6 h-4 Z" fill="none" stroke="${c.text}" stroke-width="1.8" stroke-linejoin="round"/>`
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
      // Slack sender names are always near-black bold — it has no role colors
      parts.push(
        `<text font-family="${font}" font-size="15.5" font-weight="900" fill="${c.text}" x="${TEXT_X}" y="${y + 8}">${esc(m.sender)}</text>`,
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

  /* composer: + at far left, Aa / ☺ / @ toolbar, green send button right */
  const iy = SH - 66;
  parts.push(
    `<rect x="0" y="${iy - 14}" width="${SW}" height="${SH - iy + 14}" fill="${c.composer}"/>`,
    `<rect x="0" y="${iy - 14}" width="${SW}" height="0.5" fill="${c.hairline}"/>`,
    // circular + at far left
    `<circle cx="${MARGIN + 15}" cy="${iy + 21}" r="15" fill="${c.pill}"/>`,
    `<path d="M${MARGIN + 15} ${iy + 15} v12 M${MARGIN + 9} ${iy + 21} h12" stroke="${c.subtle}" stroke-width="2" stroke-linecap="round"/>`,
    `<text font-family="${font}" font-size="14.5" fill="${c.subtle}" x="${MARGIN + 42}" y="${iy + 26}">Message #${esc(doc.channel)}</text>`,
    // Aa (format) + smiley + @ cluster before the send button
    `<text font-family="${font}" font-size="13.5" font-weight="600" fill="${c.subtle}" x="${SW - 136}" y="${iy + 26}">Aa</text>`,
    `<circle cx="${SW - 104}" cy="${iy + 21}" r="8.5" fill="none" stroke="${c.subtle}" stroke-width="1.6"/><path d="M${SW - 108} ${iy + 23} a5 5 0 0 0 8 0 M${SW - 107} ${iy + 18.5} h0.01 M${SW - 101} ${iy + 18.5} h0.01" stroke="${c.subtle}" stroke-width="1.6" stroke-linecap="round" fill="none"/>`,
    `<text font-family="${font}" font-size="15" font-weight="600" fill="${c.subtle}" x="${SW - 84}" y="${iy + 26}">@</text>`,
    // Slack's green send button
    `<rect x="${SW - MARGIN - 44}" y="${iy + 4}" width="44" height="34" rx="8" fill="#007a5a"/>`,
    `<path d="M${SW - MARGIN - 32} ${iy + 27} l20 -6 -20 -6 4 6 Z" fill="#ffffff"/>`,
    homeIndicator(c.text, platform)
  );

  return parts.join("\n");
}
