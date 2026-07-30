"use client";

import {
  avatar,
  esc,
  homeIndicator,
  imageBubble,
  phoneIcon,
  SH,
  statusBar,
  SW,
  textBlock as baseTextBlock,
  textWidth,
  truncate,
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

/* Discord's default-avatar disc colors (no letter initials in the real app). */
const CLYDE_DISCS = ["#5865f2", "#23a55a", "#f0b232", "#da373c", "#eb459e"];
/* The Discord mark, drawn white on a solid disc — this is what real default
   avatars look like; letter-initial gradients instantly read as fake. */
const CLYDE_PATH =
  "M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z";

/** Discord default avatar: solid disc + white Clyde mark (or the uploaded photo). */
function clydeAvatar(seed: string, cx: number, cy: number, r: number, id: string, url?: string): string {
  if (url) return avatar(seed, cx, cy, r, id, url);
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const disc = CLYDE_DISCS[h % CLYDE_DISCS.length];
  const s = (r * 1.15) / 127.14;
  const x0 = cx - 63.57 * s, y0 = cy - 48.18 * s;
  return (
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${disc}"/>` +
    `<path d="${CLYDE_PATH}" fill="#ffffff" transform="translate(${x0.toFixed(2)} ${y0.toFixed(2)}) scale(${s.toFixed(4)})"/>`
  );
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
  // Current MOBILE palette is darker than desktop's #313338 (~#1c1d22 base).
  const c = dark
    ? { bg: "#1c1d22", header: "#1c1d22", hairline: "#26272d", text: "#dbdee1", subtle: "#949ba4", ts: "#818691", composer: "#2d2d35" }
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
      parts.push(
        clydeAvatar(m.sender, MARGIN + AVA, y + AVA - 4, AVA, `dc${i}`, m.avatar ? lookupUrl?.(m.avatar) : undefined),
        // green presence dot on the avatar (current mobile app shows these in-chat)
        `<circle cx="${MARGIN + AVA + AVA * 0.72}" cy="${y + AVA - 4 + AVA * 0.72}" r="6" fill="#23a55a" stroke="${c.bg}" stroke-width="2.5"/>`
      );
      const col = m.color || nameColor(m.sender);
      parts.push(
        `<text font-family="${font}" font-size="15.5" font-weight="600" fill="${col}" x="${TEXT_X}" y="${y + 6}">${esc(m.sender)}</text>`,
        `<text font-family="${font}" font-size="11.5" fill="${c.ts}" x="${TEXT_X + textWidth(m.sender, 15.5) + 10}" y="${y + 6}">Today at ${esc(m.time)}</text>`
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
  // current mobile composer: separate circular +, gift, rounded field, circular mic
  const fieldX = MARGIN + 76;
  const fieldW = SW - fieldX - MARGIN - 38;
  parts.push(
    `<circle cx="${MARGIN + 15}" cy="${iy + 21}" r="15" fill="${c.composer}"/>`,
    `<path d="M${MARGIN + 15} ${iy + 15} v12 M${MARGIN + 9} ${iy + 21} h12" stroke="${c.text}" stroke-width="2" stroke-linecap="round"/>`,
    // gift button
    `<circle cx="${MARGIN + 51}" cy="${iy + 21}" r="15" fill="${c.composer}"/>`,
    `<rect x="${MARGIN + 44}" y="${iy + 18}" width="14" height="9.5" rx="1.5" fill="none" stroke="${c.text}" stroke-width="1.5"/><path d="M${MARGIN + 44} ${iy + 21} h14 M${MARGIN + 51} ${iy + 16} v11.5 M${MARGIN + 51} ${iy + 16} a2.3 2.3 0 0 0 -2.8 1.8 M${MARGIN + 51} ${iy + 16} a2.3 2.3 0 0 1 2.8 1.8" fill="none" stroke="${c.text}" stroke-width="1.4"/>`,
    // text field
    `<rect x="${fieldX}" y="${iy + 2}" width="${fieldW}" height="38" rx="19" fill="${c.composer}"/>`,
    `<text font-family="${font}" font-size="14.5" fill="${c.subtle}" x="${fieldX + 14}" y="${iy + 26}">${esc(truncate(`Message #${doc.channel}`, 14.5, fieldW - 28))}</text>`,
    // mic button
    `<circle cx="${SW - MARGIN - 15}" cy="${iy + 21}" r="15" fill="${c.composer}"/>`,
    `<rect x="${SW - MARGIN - 18.5}" y="${iy + 12.5}" width="7.5" height="11" rx="3.7" fill="none" stroke="${c.text}" stroke-width="1.7"/><path d="M${SW - MARGIN - 21.5} ${iy + 19.5} a 6.5 6.5 0 0 0 13 0 M${SW - MARGIN - 15} ${iy + 26} v3" fill="none" stroke="${c.text}" stroke-width="1.7" stroke-linecap="round"/>`,
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
    clydeAvatar(name, 52, 80, 15, "ddm"),
    `<circle cx="63" cy="90" r="5" fill="#23a55a" stroke="${c.bg}" stroke-width="2"/>`,
    `<text font-family="${font}" font-size="17" font-weight="700" fill="${c.text}" x="76" y="86">${esc(name)}</text>`,
    `<path d="M${76 + textWidth(name, 17) + 8} 80 l5 5 -5 5" fill="none" stroke="${c.subtle}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
    // bare call glyphs — the real iOS DM header has no circular chips behind them
    phoneIcon(SW - 64, 80, 21, c.text),
    `<rect x="${SW - 38}" y="74" width="14" height="11" rx="2.5" fill="none" stroke="${c.text}" stroke-width="1.8"/><path d="M${SW - 24} 77.5 l6 -3 v12 l-6 -3 Z" fill="${c.text}"/>`
  );

  /* profile intro block */
  let y = HEADER_H + 44;
  parts.push(clydeAvatar(name, MARGIN + 40, y + 8, 40, "ddmb"));
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
  // real Discord shows neutral secondary pills side by side, not a green CTA
  parts.push(
    `<rect x="${MARGIN}" y="${y}" width="176" height="40" rx="20" fill="${c.circle}"/>`,
    `<text font-family="${font}" font-size="14" font-weight="600" fill="${c.text}" text-anchor="middle" x="${MARGIN + 88}" y="${y + 25}">Send Friend Request</text>`,
    `<rect x="${MARGIN + 188}" y="${y}" width="84" height="40" rx="20" fill="${c.circle}"/>`,
    `<text font-family="${font}" font-size="14" font-weight="600" fill="${c.text}" text-anchor="middle" x="${MARGIN + 230}" y="${y + 25}">Block</text>`
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
      parts.push(clydeAvatar(m.sender, MARGIN + 20, y + 16, 20, `ddc${i}`, m.avatar ? lookupUrl?.(m.avatar) : undefined));
      // DM sender names use the default text color — role colors are a server thing
      const col = m.color || c.text;
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
