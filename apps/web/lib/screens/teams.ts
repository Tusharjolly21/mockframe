"use client";

import {
  avatar,
  bubbleBaseline,
  esc,
  homeIndicator,
  imageBubble,
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
import type { TeamsDoc, TeamsPresence } from "./types";

/**
 * Microsoft Teams mobile 1:1 chat (new Teams / Fluent 2, 2024): white/dark
 * canvas, gray incoming vs solid #5B5FC7 outgoing bubbles, presence dot,
 * reaction pills, eye "Seen" receipt, Segoe UI type. Spec §15 (Teams arm).
 */

const BUBBLE_MAX = 250;
const FONT_SIZE = 15;
const LINE_H = 20;
const PAD_X = 12;
const PAD_Y = 11;
const MARGIN = 14;
const LIST_BOTTOM = 748; // stop laying out messages before the composer

const PRESENCE: Record<TeamsPresence, string> = {
  available: "#6BB700",
  busy: "#C4314B",
  dnd: "#C4314B",
  away: "#F8D22A",
  offline: "#8A8886",
};

export function renderTeams(
  doc: TeamsDoc,
  avatarUrl?: string,
  lookupUrl?: (id: string) => string | undefined
): string {
  const platform = doc.chrome.platform ?? "ios";
  const font = fontFor("teams", platform);
  const textBlock = (lines: string[], o: Parameters<typeof baseTextBlock>[1]) =>
    baseTextBlock(lines, { font, ...o });
  const dark = !!doc.chrome.dark;
  const c = dark
    ? {
        canvasBg: "#1F1F1F",
        headerBg: "#1F1F1F",
        divider: "#333333",
        textPrimary: "#FFFFFF",
        secondary: "#ADADAD",
        incomingBubble: "#333333",
        incomingText: "#FFFFFF",
        outgoingBubble: "#4F52B2",
        outgoingText: "#FFFFFF",
        reactionPillBg: "#3D3D3D",
        reactionPillBorder: "#4D4D4D",
        composerPillBg: "#2B2B2B",
        iconRest: "#C7C7C7",
      }
    : {
        canvasBg: "#FFFFFF",
        headerBg: "#FFFFFF",
        divider: "#E0E0E0",
        textPrimary: "#242424",
        secondary: "#616161",
        incomingBubble: "#F0F0F0",
        incomingText: "#242424",
        outgoingBubble: "#5B5FC7",
        outgoingText: "#FFFFFF",
        reactionPillBg: "#FFFFFF",
        reactionPillBorder: "#E0E0E0",
        composerPillBg: "#F5F5F5",
        iconRest: "#616161",
      };

  const parts: string[] = [`<rect width="${SW}" height="${SH}" fill="${c.canvasBg}"/>`];

  /* header y54..110 */
  const HEADER_H = 110;
  const presenceColor = PRESENCE[doc.presence] ?? PRESENCE.offline;
  parts.push(
    `<rect width="${SW}" height="${HEADER_H}" fill="${c.headerBg}"/>`,
    statusBar({ time: doc.chrome.time, battery: doc.chrome.battery, color: c.textPrimary, platform }),
    // back chevron "<"
    `<path d="M24 72 l-9 10 9 10" fill="none" stroke="${c.textPrimary}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
    avatar(doc.contact, 58, 82, 17, "tm", avatarUrl),
    // presence dot with a canvas-colored ring
    `<circle cx="70" cy="92" r="6" fill="${presenceColor}" stroke="${c.canvasBg}" stroke-width="2"/>`,
    `<text font-family="${font}" font-size="16.5" font-weight="700" fill="${c.textPrimary}" x="86" y="80">${esc(truncate(doc.contact, 16.5, 190))}</text>`,
    `<text font-family="${font}" font-size="12.5" fill="${c.secondary}" x="86" y="97">${esc(truncate(doc.status, 12.5, 190))}</text>`,
    // right call actions — neutral, not purple
    phoneIcon(296, 82, 22, c.textPrimary),
    videoIcon(338, 82, 22, c.textPrimary),
    // more (three horizontal dots)
    `<circle cx="369" cy="82" r="2.1" fill="${c.textPrimary}"/><circle cx="376" cy="82" r="2.1" fill="${c.textPrimary}"/><circle cx="383" cy="82" r="2.1" fill="${c.textPrimary}"/>`,
    `<rect y="${HEADER_H - 0.75}" width="${SW}" height="0.75" fill="${c.divider}"/>`
  );

  /* message list y110..~792 */
  let y = HEADER_H + 18;
  let lastMineBottom: number | null = null;
  const msgs = doc.messages;
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    const mine = m.from === "me";
    const firstOfGroup = i === 0 || msgs[i - 1].from !== m.from;
    const sameNext = i < msgs.length - 1 && msgs[i + 1].from === m.from;

    // stop before drawing over the composer / home indicator
    if (y > LIST_BOTTOM) break;

    // image bubble (above/instead of text)
    const imgUrl = m.image ? lookupUrl?.(m.image) : undefined;
    if (imgUrl) {
      const iw = 200, ih = 240;
      const ix = mine ? SW - MARGIN - iw : 52;
      parts.push(imageBubble(imgUrl, ix, y, iw, ih, `tm${i}`, { rx: 14 }));
      // avatar only here for an image-ONLY incoming message (text branch draws it otherwise)
      if (!mine && firstOfGroup && !m.text) parts.push(avatar(doc.contact, 30, y + ih - 14, 14, `tmi${i}`, avatarUrl));
      if (mine) lastMineBottom = y + ih;
      y += ih + 8;
      if (!m.text) {
        y += sameNext ? 0 : 6;
        continue;
      }
    }

    const lines = wrapText(m.text || " ", FONT_SIZE, BUBBLE_MAX - PAD_X * 2);
    const w = Math.min(BUBBLE_MAX, Math.max(...lines.map((l) => textWidth(l, FONT_SIZE))) + PAD_X * 2);
    const h = lines.length * LINE_H + PAD_Y * 2;
    const x = mine ? SW - MARGIN - w : 52;
    parts.push(
      `<rect x="${x}" y="${y}" width="${w.toFixed(1)}" height="${h}" rx="14" fill="${mine ? c.outgoingBubble : c.incomingBubble}"/>`,
      textBlock(lines, {
        x: x + PAD_X,
        y: bubbleBaseline(y, h, lines.length, LINE_H, FONT_SIZE),
        size: FONT_SIZE,
        lineHeight: LINE_H,
        color: mine ? c.outgoingText : c.incomingText,
      })
    );
    // sender avatar on the first bubble of a consecutive incoming group
    if (!mine && firstOfGroup) {
      parts.push(avatar(doc.contact, 30, y + h - 14, 14, `tmi${i}`, avatarUrl));
    }

    // reaction pill overlapping the bubble's bottom edge
    let extra = 0;
    if (m.reaction) {
      const rw = textWidth(m.reaction, 14) + 14;
      const rx = mine ? x + 4 : x + w - rw;
      parts.push(
        `<rect x="${rx.toFixed(1)}" y="${y + h - 11}" width="${rw.toFixed(1)}" height="22" rx="11" fill="${c.reactionPillBg}" stroke="${c.reactionPillBorder}" stroke-width="1"/>`,
        `<text font-size="14" text-anchor="middle" x="${(rx + rw / 2).toFixed(1)}" y="${y + h + 5}">${esc(m.reaction)}</text>`
      );
      extra = 10;
    }

    if (mine) lastMineBottom = y + h;
    y += h + extra + (sameNext ? 8 : 14);
  }

  // eye "Seen" receipt under the last outgoing bubble
  if (doc.seen && lastMineBottom !== null && msgs.at(-1)?.from === "me") {
    const ex = SW - MARGIN - 8;
    const ey = lastMineBottom + 12;
    parts.push(
      `<path d="M${ex - 8} ${ey} q8 -6.5 16 0 q-8 6.5 -16 0 Z" fill="none" stroke="${c.secondary}" stroke-width="1.3"/>`,
      `<circle cx="${ex}" cy="${ey}" r="2.4" fill="${c.secondary}"/>`
    );
  }

  /* composer y~796..858 */
  const COMP_CY = 825;
  const pillX = 50, pillW = 250;
  parts.push(
    `<rect y="796" width="${SW}" height="0.75" fill="${c.divider}"/>`,
    // "+" attach
    `<path d="M28 ${COMP_CY - 7} v14 M21 ${COMP_CY} h14" stroke="${c.iconRest}" stroke-width="2" stroke-linecap="round"/>`,
    // input pill
    `<rect x="${pillX}" y="${COMP_CY - 19}" width="${pillW}" height="38" rx="19" fill="${c.composerPillBg}"/>`,
    `<text font-family="${font}" font-size="15" fill="${c.secondary}" x="66" y="${COMP_CY + 5}">Type a message</text>`,
    // format "A"
    `<text font-family="${font}" font-size="17" font-weight="700" fill="${c.iconRest}" text-anchor="middle" x="250" y="${COMP_CY + 6}">A</text>`,
    // emoji
    `<circle cx="288" cy="${COMP_CY}" r="9" fill="none" stroke="${c.iconRest}" stroke-width="1.6"/>`,
    `<circle cx="285" cy="${COMP_CY - 2.5}" r="1.1" fill="${c.iconRest}"/><circle cx="291" cy="${COMP_CY - 2.5}" r="1.1" fill="${c.iconRest}"/>`,
    `<path d="M283.5 ${COMP_CY + 2.5} a 5 5 0 0 0 9 0" fill="none" stroke="${c.iconRest}" stroke-width="1.5" stroke-linecap="round"/>`,
    // camera
    `<path d="M317 ${COMP_CY - 6} l2 -3 h6 l2 3" fill="none" stroke="${c.iconRest}" stroke-width="1.5" stroke-linejoin="round"/>`,
    `<rect x="315" y="${COMP_CY - 6}" width="22" height="15" rx="3.5" fill="none" stroke="${c.iconRest}" stroke-width="1.7"/>`,
    `<circle cx="326" cy="${COMP_CY + 1.5}" r="3.6" fill="none" stroke="${c.iconRest}" stroke-width="1.5"/>`,
    // mic
    micIcon(364, COMP_CY, 20, c.iconRest),
    homeIndicator(c.textPrimary, platform)
  );

  return parts.join("\n");
}
