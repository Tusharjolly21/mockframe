"use client";

import {
  avatar,
  glassPill,
  esc,
  homeIndicator,
  micIcon,
  phoneIcon,
  SH,
  statusBar,
  SW,
  textBlock as baseTextBlock,
  textWidth,
  truncate,
  videoIcon,
  wrapText,
} from "./common";
import { fontFor } from "./fonts";
import type { SnapchatDoc } from "./types";

/**
 * Snapchat chat: sender labels ("ME" red / friend blue) with colored rail
 * bars instead of bubbles, streak 🔥 count in the header, "Send a chat"
 * composer. Spec §2.6.
 */

const FONT_SIZE = 15.5;
const LINE_H = 21;
const MARGIN = 18;
const RAIL_GAP = 12;

export function renderSnapchat(doc: SnapchatDoc, avatarUrl?: string): string {
  const platform = doc.chrome.platform ?? "ios";
  const font = fontFor("snapchat", platform);
  const textBlock = (lines: string[], o: Parameters<typeof baseTextBlock>[1]) =>
    baseTextBlock(lines, { font, ...o });
  const dark = !!doc.chrome.dark;
  const c = {
    bg: dark ? "#000000" : "#ffffff",
    headerBg: dark ? "#1c1c1e" : "#f8f8f8",
    hairline: dark ? "#2c2c2e" : "#e8e8e8",
    text: dark ? "#ffffff" : "#16191c",
    subtle: dark ? "#98989f" : "#8f9498",
    reactionChip: dark ? "#1C1C1E" : "#F0F1F3",
    me: "#f23b57",
    them: "#2b7cf6",
  };

  const parts: string[] = [`<rect width="${SW}" height="${SH}" fill="${c.bg}"/>`];

  /* header */
  const HEADER_H = 104;
  const streak = doc.streak > 0 ? ` 🔥${doc.streak}` : "";
  parts.push(
    `<rect width="${SW}" height="${HEADER_H}" fill="${c.headerBg}"/>`,
    `<rect y="${HEADER_H - 0.5}" width="${SW}" height="0.5" fill="${c.hairline}"/>`,
    statusBar({ time: doc.chrome.time, battery: doc.chrome.battery, color: c.text, platform }),
    `<path d="M26 64 l-10 11 10 11" fill="none" stroke="${c.text}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
    avatar(doc.contact, 60, 75, 19, "sc", avatarUrl),
    textBlock([truncate(`${doc.contact}${streak}`, 16.5, SW - 90 - 96)], { x: 90, y: doc.chrome._anim?.typing ? 74 : 80, size: 16.5, lineHeight: 19, color: c.text, weight: 700 }),
    ...(doc.chrome._anim?.typing ? [`<text font-family="${font}" font-size="11.5" fill="${c.me}" x="90" y="90">typing…</text>`] : []),
    // phone + video glyphs
    phoneIcon(SW - 74, 75, 20, c.text),
    videoIcon(SW - 34, 75, 25, c.text)
  );

  /* date chip */
  let y = HEADER_H + 24;
  parts.push(
    `<text font-family="${font}" font-size="11" font-weight="700" letter-spacing="0.4" fill="${c.subtle}" text-anchor="middle" x="${SW / 2}" y="${y}">TODAY</text>`
  );
  y += 22;

  /* messages: label + rail + text, grouped by sender */
  const msgs = doc.messages;
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    if (y > 764) break; // don't lay out messages behind the composer
    const mine = m.from === "me";
    const color = mine ? c.me : c.them;
    const isGroupStart = i === 0 || msgs[i - 1].from !== m.from;

    if (isGroupStart) {
      parts.push(
        `<text font-family="${font}" font-size="11" font-weight="800" letter-spacing="0.5" fill="${color}" x="${MARGIN}" y="${y}">${mine ? "ME" : esc(doc.contact.toUpperCase())}</text>`
      );
      y += 10;
    }
    const lines = wrapText(m.text || " ", FONT_SIZE, SW - MARGIN * 2 - RAIL_GAP - 8);
    const h = lines.length * LINE_H;
    parts.push(
      `<rect x="${MARGIN}" y="${y - 2}" width="3" height="${h + 4}" rx="1.5" fill="${color}"/>`,
      textBlock(lines, {
        x: MARGIN + RAIL_GAP,
        y: y + FONT_SIZE * 0.82,
        size: FONT_SIZE,
        lineHeight: LINE_H,
        color: c.text,
      })
    );
    y += h;

    /* reaction chip: rounded emoji pill just below the message text */
    if (m.reaction) {
      const chipTop = y + 6;
      const pw = textWidth(m.reaction, 15) + 16;
      parts.push(
        `<rect x="${MARGIN + RAIL_GAP}" y="${chipTop}" width="${pw.toFixed(1)}" height="22" rx="11" fill="${c.reactionChip}"${dark ? ` stroke="${c.hairline}" stroke-width="1"` : ""}/>`,
        `<text font-family="${font}" font-size="15" fill="${c.text}" text-anchor="middle" x="${(MARGIN + RAIL_GAP + pw / 2).toFixed(1)}" y="${(chipTop + 16).toFixed(1)}">${esc(m.reaction)}</text>`
      );
      y = chipTop + 22 + 4;
    }

    /* status line under the newest message only */
    if (i === msgs.length - 1 && doc.status && doc.status !== "none") {
      const word = doc.status.toUpperCase();
      const accent =
        doc.statusKind === "snap-noaudio"
          ? c.me
          : doc.statusKind === "snap-audio"
            ? "#b45cff"
            : dark
              ? "#19C0FF"
              : "#0FADFF";
      const emphatic = word === "SCREENSHOT!" || word === "REPLIED";
      parts.push(
        `<text font-family="${font}" font-size="10.5" font-weight="700" letter-spacing="0.3" fill="${emphatic ? accent : c.subtle}" x="${MARGIN + RAIL_GAP}" y="${(y + 18).toFixed(1)}">${esc(word)}</text>`
      );
    }

    y += i < msgs.length - 1 && msgs[i + 1].from === m.from ? 6 : 16;
  }

  /* composer */
  const iy = SH - 64;
  parts.push(
    `<circle cx="${MARGIN + 15}" cy="${iy + 19}" r="15" fill="${dark ? "#2c2c2e" : "#f1f2f3"}"/>`,
    `<rect x="${MARGIN + 8.5}" y="${iy + 13.5}" width="13" height="10.5" rx="3" fill="none" stroke="${c.text}" stroke-width="1.7"/>`,
    `<circle cx="${MARGIN + 15}" cy="${iy + 18.7}" r="2.4" fill="none" stroke="${c.text}" stroke-width="1.4"/>`,
    glassPill(MARGIN + 38, iy + 2, SW - MARGIN * 2 - 38 - 66, 35, dark),
    `<text font-family="${font}" font-size="14.5" fill="${c.subtle}" x="${MARGIN + 54}" y="${iy + 24}">Send a chat</text>`,
    // mic + stickers
    micIcon(SW - MARGIN - 49, iy + 17, 20, c.text),
    `<circle cx="${SW - MARGIN - 20}" cy="${iy + 19}" r="9.5" fill="none" stroke="${c.text}" stroke-width="1.7"/>`,
    `<path d="M${SW - MARGIN - 24.5} ${iy + 21} a 6 6 0 0 0 9 0 M${SW - MARGIN - 24} ${iy + 16} h0.01 M${SW - MARGIN - 16} ${iy + 16} h0.01" stroke="${c.text}" stroke-width="1.7" stroke-linecap="round" fill="none"/>`,
    homeIndicator(c.text, platform)
  );

  return parts.join("\n");
}
