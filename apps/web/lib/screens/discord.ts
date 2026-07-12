"use client";

import {
  avatar,
  esc,
  homeIndicator,
  imageBubble,
  SH,
  statusBar,
  SW,
  textBlock as baseTextBlock,
  textWidth,
  typingDots,
  wrapText,
} from "./common";
import { fontFor } from "./fonts";
import type { DiscordDoc } from "./types";

/**
 * Discord channel view (mobile): dark surface, "# channel" header with server
 * context, avatar + colored username + timestamp message rows grouped by
 * sender, and a "Message #channel" composer. §15.
 */

const MARGIN = 16;
const AVA = 20;
const TEXT_X = MARGIN + AVA * 2 + 10;
const FONT = 15.5;
const LINE_H = 21;

const NAME_COLORS = ["#f47fff", "#5865f2", "#3ba55d", "#faa61a", "#eb459e", "#00b0f4"];
function nameColor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return NAME_COLORS[h % NAME_COLORS.length];
}

export function renderDiscord(
  doc: DiscordDoc,
  lookupUrl?: (id: string) => string | undefined
): string {
  if (doc.mode === "dm") return renderDiscordDm(doc, lookupUrl);

  const platform = doc.chrome.platform ?? "ios";
  const font = fontFor("discord", platform);
  const textBlock = (lines: string[], o: Parameters<typeof baseTextBlock>[1]) =>
    baseTextBlock(lines, { font, ...o });
  // Discord is dark-first; a light theme exists but the brand read is dark
  const dark = doc.chrome.dark ?? true;
  const c = dark
    ? { bg: "#313338", header: "#313338", hairline: "#232428", text: "#dbdee1", subtle: "#949ba4", ts: "#818691", composer: "#383a40" }
    : { bg: "#ffffff", header: "#ffffff", hairline: "#e3e5e8", text: "#313338", subtle: "#4e5058", ts: "#5c5e66", composer: "#ebedef" };

  const parts: string[] = [`<rect width="${SW}" height="${SH}" fill="${c.bg}"/>`];

  /* header: # channel + server */
  const HEADER_H = 96;
  parts.push(
    statusBar({ time: doc.chrome.time, battery: doc.chrome.battery, color: c.text, platform }),
    `<rect y="${HEADER_H - 0.5}" width="${SW}" height="0.5" fill="${c.hairline}"/>`,
    `<path d="M22 70 l-10 10 10 10" fill="none" stroke="${c.text}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
    // # glyph
    `<path d="M46 70 l-3 20 M56 70 l-3 20 M42 76 h16 M40 84 h16" stroke="${c.subtle}" stroke-width="2.2" stroke-linecap="round"/>`,
    `<text font-family="${font}" font-size="17" font-weight="700" fill="${c.text}" x="64" y="82">${esc(doc.channel)}</text>`,
    `<text font-family="${font}" font-size="12" fill="${c.subtle}" x="64" y="${HEADER_H - 12}" opacity="0"> </text>`,
    // people + search icons (right)
    `<circle cx="${SW - 66}" cy="76" r="4" fill="none" stroke="${c.text}" stroke-width="1.9"/><path d="M${SW - 73} 88 a7 7 0 0 1 14 0" fill="none" stroke="${c.text}" stroke-width="1.9"/>`,
    `<circle cx="${SW - 30}" cy="77" r="7" fill="none" stroke="${c.text}" stroke-width="1.9"/><path d="M${SW - 24} 83 l5 5" stroke="${c.text}" stroke-width="1.9" stroke-linecap="round"/>`
  );

  /* messages, grouped by consecutive sender */
  let y = HEADER_H + 24;
  const msgs = doc.messages;
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    const grouped = i > 0 && msgs[i - 1].sender === m.sender;
    const lines = wrapText(m.text || " ", FONT, SW - TEXT_X - MARGIN);
    if (!grouped) {
      y += i === 0 ? 0 : 8;
      parts.push(avatar(m.sender, MARGIN + AVA, y + AVA - 4, AVA, `dc${i}`, m.avatar ? lookupUrl?.(m.avatar) : undefined));
      const col = m.color || nameColor(m.sender);
      parts.push(
        `<text font-family="${font}" font-size="15.5" font-weight="600" fill="${col}" x="${TEXT_X}" y="${y + 6}">${esc(m.sender)}</text>`,
        `<text font-family="${font}" font-size="11.5" fill="${c.ts}" x="${TEXT_X + textWidth(m.sender, 15.5) + 10}" y="${y + 6}">${esc(m.time)}</text>`
      );
      y += 16;
    }
    if (m.text || !m.image) {
      parts.push(textBlock(lines, { x: TEXT_X, y: y + FONT * 0.82, size: FONT, lineHeight: LINE_H, color: c.text }));
      y += lines.length * LINE_H + 3;
    }
    const imgUrl = m.image ? lookupUrl?.(m.image) : undefined;
    if (imgUrl) {
      const iw = 240, ih = 160;
      parts.push(imageBubble(imgUrl, TEXT_X, y, iw, ih, `dc${i}`, { rx: 8 }));
      y += ih + 6;
    }
  }

  /* composer */
  const iy = SH - 70;
  parts.push(`<rect x="0" y="${iy - 14}" width="${SW}" height="${SH - iy + 14}" fill="${c.bg}"/>`);
  if (doc.chrome._anim?.typing) {
    // Discord shows typing as a line just above the composer, not a bubble
    const who = doc.messages.at(-1)?.sender ?? "Someone";
    parts.push(
      typingDots(MARGIN + 2, iy - 22, c.subtle, doc.chrome._anim.dotPhase ?? 0, 3, 8),
      `<text font-family="${font}" font-size="12" fill="${c.text}" x="${MARGIN + 30}" y="${iy - 18}"><tspan font-weight="700">${esc(who)}</tspan> is typing…</text>`
    );
  }
  parts.push(
    `<rect x="${MARGIN}" y="${iy}" width="${SW - MARGIN * 2}" height="42" rx="21" fill="${c.composer}"/>`,
    // plus in a circle
    `<circle cx="${MARGIN + 22}" cy="${iy + 21}" r="12" fill="${c.subtle}"/>`,
    `<path d="M${MARGIN + 22} ${iy + 15} v12 M${MARGIN + 16} ${iy + 21} h12" stroke="${c.composer}" stroke-width="2.2" stroke-linecap="round"/>`,
    `<text font-family="${font}" font-size="15" fill="${c.subtle}" x="${MARGIN + 44}" y="${iy + 26}">Message #${esc(doc.channel)}</text>`,
    // gift + gif + emoji hints
    `<text font-family="${font}" font-size="13" font-weight="700" fill="${c.subtle}" x="${SW - MARGIN - 30}" y="${iy + 26}">GIF</text>`,
    `<circle cx="${SW - MARGIN - 58}" cy="${iy + 21}" r="8.5" fill="none" stroke="${c.subtle}" stroke-width="1.7"/><path d="M${SW - MARGIN - 62} ${iy + 23} a5 5 0 0 0 8 0 M${SW - MARGIN - 61} ${iy + 18.5} h0.01 M${SW - MARGIN - 55} ${iy + 18.5} h0.01" stroke="${c.subtle}" stroke-width="1.7" stroke-linecap="round" fill="none"/>`,
    homeIndicator(c.text, platform)
  );

  return parts.join("\n");
}

/* ----------------------------------- DM view --------------------------------- */
/* 1-on-1 DM: header, the "beginning of your conversation" profile intro block
   with Send Friend Request, then messages + the DM composer. */

function renderDiscordDm(doc: DiscordDoc, lookupUrl?: (id: string) => string | undefined): string {
  const platform = doc.chrome.platform ?? "ios";
  const font = fontFor("discord", platform);
  const dark = doc.chrome.dark ?? false;
  const c = dark
    ? { bg: "#313338", hairline: "#232428", text: "#f2f3f5", subtle: "#b5bac1", ts: "#818691", composer: "#383a40", circle: "#404249" }
    : { bg: "#ffffff", hairline: "#e3e5e8", text: "#060607", subtle: "#4e5058", ts: "#5c5e66", composer: "#e3e5e8", circle: "#e3e5e8" };
  const green = "#248046";
  const name = doc.dmName || "Friend";
  const username = doc.dmUsername || name.toLowerCase();

  const parts: string[] = [`<rect width="${SW}" height="${SH}" fill="${c.bg}"/>`];

  /* header */
  const HEADER_H = 96;
  parts.push(
    statusBar({ time: doc.chrome.time, battery: doc.chrome.battery, color: c.text, platform }),
    `<rect y="${HEADER_H - 0.5}" width="${SW}" height="0.5" fill="${c.hairline}"/>`,
    // back with a small red unread badge
    `<path d="M28 70 l-10 10 10 10" fill="none" stroke="#5865f2" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<circle cx="20" cy="68" r="7" fill="#f23f43"/><text font-family="${font}" font-size="9" font-weight="700" fill="#fff" text-anchor="middle" x="20" y="71">1</text>`,
    avatar(name, 52, 80, 15, "ddm"),
    `<circle cx="63" cy="90" r="5" fill="#23a55a" stroke="${c.bg}" stroke-width="2"/>`,
    `<text font-family="${font}" font-size="17" font-weight="700" fill="${c.text}" x="76" y="86">${esc(name)}</text>`,
    `<path d="M${76 + textWidth(name, 17) + 8} 80 l5 5 -5 5" fill="none" stroke="${c.subtle}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<circle cx="${SW - 66}" cy="80" r="16" fill="${c.circle}"/>${phoneIconDm(SW - 66, 80, c.text)}`,
    `<circle cx="${SW - 28}" cy="80" r="16" fill="${c.circle}"/><rect x="${SW - 37}" y="75" width="13" height="10" rx="2.5" fill="none" stroke="${c.text}" stroke-width="1.8"/><path d="M${SW - 24} 78 l5 -2.5 v10 l-5 -2.5 Z" fill="${c.text}"/>`
  );

  /* profile intro block */
  let y = HEADER_H + 44;
  parts.push(avatar(name, MARGIN + 40, y + 8, 40, "ddmb"));
  y += 66;
  parts.push(
    `<text font-family="${font}" font-size="28" font-weight="800" fill="${c.text}" x="${MARGIN}" y="${y}">${esc(name)}</text>`,
    `<text font-family="${font}" font-size="17" font-weight="500" fill="${c.subtle}" x="${MARGIN}" y="${y + 26}">${esc(username)}</text>`
  );
  y += 46;
  const intro = wrapText(`This is the very beginning of your legendary conversation with ${username}.`, 16, SW - MARGIN * 2);
  intro.forEach((l, i) => parts.push(`<text font-family="${font}" font-size="16" fill="${c.text}" x="${MARGIN}" y="${y + i * 22}">${esc(l)}</text>`));
  y += intro.length * 22 + 16;
  if (doc.mutualServer) {
    parts.push(
      `<rect x="${MARGIN}" y="${y - 12}" width="22" height="22" rx="7" fill="#f9c1e0"/><text font-size="11" x="${MARGIN + 4}" y="${y + 4}">🐰</text>`,
      `<text font-family="${font}" font-size="14" font-weight="500" fill="${c.subtle}" x="${MARGIN + 32}" y="${y + 4}">1 Mutual Server</text>`
    );
    y += 30;
  }
  parts.push(
    `<rect x="${MARGIN}" y="${y}" width="180" height="40" rx="8" fill="${green}"/>`,
    `<text font-family="${font}" font-size="14.5" font-weight="600" fill="#fff" text-anchor="middle" x="${MARGIN + 90}" y="${y + 25}">Send Friend Request</text>`
  );
  y += 62;

  /* date divider */
  parts.push(
    `<rect x="${MARGIN}" y="${y}" width="${SW / 2 - MARGIN - 66}" height="0.5" fill="${c.hairline}"/>`,
    `<rect x="${SW / 2 + 66}" y="${y}" width="${SW / 2 - MARGIN - 66}" height="0.5" fill="${c.hairline}"/>`,
    `<text font-family="${font}" font-size="12" font-weight="600" fill="${c.subtle}" text-anchor="middle" x="${SW / 2}" y="${y + 4}">September 4, 2025</text>`
  );
  y += 24;

  /* messages (grouped, sticker = image rendered large) */
  const msgs = doc.messages;
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    const grouped = i > 0 && msgs[i - 1].sender === m.sender;
    if (!grouped) {
      y += i === 0 ? 0 : 8;
      parts.push(avatar(m.sender, MARGIN + 20, y + 16, 20, `ddc${i}`, m.avatar ? lookupUrl?.(m.avatar) : undefined));
      const col = m.color || nameColor(m.sender);
      parts.push(
        `<text font-family="${font}" font-size="15.5" font-weight="600" fill="${col}" x="${MARGIN + 52}" y="${y + 6}">${esc(m.sender)}</text>`,
        `<text font-family="${font}" font-size="11.5" fill="${c.ts}" x="${MARGIN + 52 + textWidth(m.sender, 15.5) + 10}" y="${y + 6}">${esc(m.time)}</text>`
      );
      y += 16;
    }
    const imgUrl = m.image ? lookupUrl?.(m.image) : undefined;
    if (imgUrl) {
      parts.push(imageBubble(imgUrl, MARGIN + 52, y, 150, 150, `ddi${i}`, { rx: 10 }));
      y += 160;
    } else {
      const lines = wrapText(m.text || " ", FONT, SW - (MARGIN + 52) - MARGIN);
      lines.forEach((l, k) => parts.push(`<text font-family="${font}" font-size="${FONT}" fill="${c.text}" x="${MARGIN + 52}" y="${y + FONT * 0.82 + k * LINE_H}">${esc(l)}</text>`));
      y += lines.length * LINE_H + 4;
    }
  }

  /* DM composer: + · controller · gift · "Message @user" · emoji · mic */
  const iy = SH - 70;
  parts.push(
    `<rect x="0" y="${iy - 14}" width="${SW}" height="${SH - iy + 14}" fill="${c.bg}"/>`,
    `<circle cx="${MARGIN + 14}" cy="${iy + 21}" r="14" fill="${c.circle}"/><path d="M${MARGIN + 14} ${iy + 15} v12 M${MARGIN + 8} ${iy + 21} h12" stroke="${c.subtle}" stroke-width="2.2" stroke-linecap="round"/>`,
    // game controller
    `<rect x="${MARGIN + 34}" y="${iy + 15}" width="22" height="13" rx="6.5" fill="none" stroke="${c.subtle}" stroke-width="1.7"/><path d="M${MARGIN + 40} ${iy + 21} h3 M${MARGIN + 41.5} ${iy + 19.5} v3" stroke="${c.subtle}" stroke-width="1.5" stroke-linecap="round"/><circle cx="${MARGIN + 50}" cy="${iy + 20}" r="1.2" fill="${c.subtle}"/><circle cx="${MARGIN + 52.5}" cy="${iy + 22.5}" r="1.2" fill="${c.subtle}"/>`,
    // gift
    `<rect x="${MARGIN + 64}" y="${iy + 18}" width="16" height="11" rx="1.5" fill="none" stroke="${c.subtle}" stroke-width="1.6"/><path d="M${MARGIN + 64} ${iy + 21} h16 M${MARGIN + 72} ${iy + 16} v13 M${MARGIN + 72} ${iy + 16} a2.5 2.5 0 0 0 -3 2 M${MARGIN + 72} ${iy + 16} a2.5 2.5 0 0 1 3 2" fill="none" stroke="${c.subtle}" stroke-width="1.5"/>`,
    // input pill
    `<rect x="${MARGIN + 90}" y="${iy + 3}" width="${SW - MARGIN * 2 - 90 - 34}" height="36" rx="18" fill="${c.composer}"/>`,
    `<text font-family="${font}" font-size="14.5" fill="${c.subtle}" x="${MARGIN + 104}" y="${iy + 26}">Message @${esc(username)}</text>`,
    // emoji in pill + mic
    `<circle cx="${SW - MARGIN - 44}" cy="${iy + 21}" r="8.5" fill="none" stroke="${c.subtle}" stroke-width="1.6"/><path d="M${SW - MARGIN - 48} ${iy + 23} a5 5 0 0 0 8 0 M${SW - MARGIN - 47} ${iy + 18.5} h0.01 M${SW - MARGIN - 41} ${iy + 18.5} h0.01" stroke="${c.subtle}" stroke-width="1.6" stroke-linecap="round" fill="none"/>`,
    `<rect x="${SW - MARGIN - 20}" y="${iy + 12}" width="8.5" height="12.5" rx="4.2" fill="none" stroke="${c.subtle}" stroke-width="1.8"/><path d="M${SW - MARGIN - 23} ${iy + 20} a 7.5 7.5 0 0 0 14 0 M${SW - MARGIN - 16} ${iy + 27} v3" fill="none" stroke="${c.subtle}" stroke-width="1.8" stroke-linecap="round"/>`,
    homeIndicator(c.text, platform)
  );

  return parts.join("\n");
}

function phoneIconDm(cx: number, cy: number, color: string): string {
  return `<path d="M${cx - 6} ${cy - 6} c 0 0 1 4 4 7 c 3 3 7 4 7 4 l 0 -3 c 0 -1 -1 -1 -2 -1 c -1 0 -2 0 -3 -0.5 l -2 2 c -2 -1 -3.5 -2.5 -4.5 -4.5 l 2 -2 c -0.5 -1 -0.5 -2 -0.5 -3 c 0 -1 0 -2 -1 -2 Z" fill="${color}"/>`;
}
