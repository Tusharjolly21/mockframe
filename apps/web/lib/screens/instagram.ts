"use client";

import {
  avatar,
  glassPill,
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
  typingDots,
  videoIcon,
  wrapText,
} from "./common";
import { fontFor } from "./fonts";
import type { InstagramDoc } from "./types";

/**
 * Instagram DM thread: username header with presence, gray incoming vs
 * blue outgoing bubbles, message reactions, "Seen" caption, camera input
 * pill. Spec §2.6 (v1.x generators).
 */

const BUBBLE_MAX = 250;
const FONT_SIZE = 15.5;
const LINE_H = 20;
const PAD_X = 13;
const PAD_Y = 9;
const MARGIN = 14;

export function renderInstagram(
  doc: InstagramDoc,
  avatarUrl?: string,
  lookupUrl?: (id: string) => string | undefined
): string {
  if (doc.mode === "requests") return renderInstagramRequests(doc, avatarUrl);
  const platform = doc.chrome.platform ?? "ios";
  const font = fontFor("instagram", platform);
  const textBlock = (lines: string[], o: Parameters<typeof baseTextBlock>[1]) =>
    baseTextBlock(lines, { font, ...o });
  const dark = !!doc.chrome.dark;
  const c = {
    bg: dark ? "#000000" : "#ffffff",
    text: dark ? "#f5f5f5" : "#000000",
    subtle: dark ? "#a8a8a8" : "#8e8e8e",
    hairline: dark ? "#262626" : "#efefef",
    incoming: dark ? "#262626" : "#efefef",
    incomingText: dark ? "#f5f5f5" : "#000000",
    outgoing: "#3797f0",
    green: "#12b76a",
  };

  const parts: string[] = [`<rect width="${SW}" height="${SH}" fill="${c.bg}"/>`];

  /* header */
  const HEADER_H = 104;
  parts.push(
    statusBar({ time: doc.chrome.time, battery: doc.chrome.battery, color: c.text, platform }),
    `<rect y="${HEADER_H - 0.5}" width="${SW}" height="0.5" fill="${c.hairline}"/>`,
    `<path d="M26 64 l-10 11 10 11" fill="none" stroke="${c.text}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
    avatar(doc.username, 58, 75, 18, "ig", avatarUrl),
    `<circle cx="71" cy="88" r="5.5" fill="${c.green}" stroke="${c.bg}" stroke-width="2"/>`,
    textBlock([doc.username], { x: 86, y: 72, size: 15, lineHeight: 18, color: c.text, weight: 600 }),
    doc.verified
      ? verifiedSeal(86 + textWidth(doc.username, 15) + 5, 72 - 12, "#0095f6")
      : "",
    textBlock([doc.presence || "Active now"], { x: 86, y: 89, size: 11.5, lineHeight: 13, color: c.subtle }),
    phoneIcon(SW - 74, 75, 20, c.text),
    videoIcon(SW - 34, 75, 25, c.text)
  );

  /* messages */
  let y = HEADER_H + 20;
  let lastOutgoingBottom: number | null = null;
  const msgs = doc.messages;
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    const mine = m.from === "me";

    const imgUrl = m.image ? lookupUrl?.(m.image) : undefined;
    if (imgUrl) {
      const iw = 200, ih = 240;
      const ix = mine ? SW - MARGIN - iw : MARGIN + 30;
      parts.push(imageBubble(imgUrl, ix, y, iw, ih, `ig${i}`, { rx: 18 }));
      if (mine) lastOutgoingBottom = y + ih;
      if (!mine && (i === msgs.length - 1 || msgs[i + 1].from !== "them"))
        parts.push(avatar(doc.username, MARGIN + 12, y + ih - 11, 11, `igia${i}`, avatarUrl));
      y += ih + 8;
      if (!m.text) continue;
    }

    const lines = wrapText(m.text || " ", FONT_SIZE, BUBBLE_MAX - PAD_X * 2);
    const w = Math.min(BUBBLE_MAX, Math.max(...lines.map((l) => textWidth(l, FONT_SIZE))) + PAD_X * 2);
    const h = lines.length * LINE_H + PAD_Y * 2;
    const x = mine ? SW - MARGIN - w : MARGIN + (mine ? 0 : 30);
    parts.push(
      `<rect x="${x}" y="${y}" width="${w.toFixed(1)}" height="${h}" rx="${Math.min(19, h / 2)}" fill="${mine ? c.outgoing : c.incoming}"/>`,
      textBlock(lines, {
        x: x + PAD_X,
        y: bubbleBaseline(y, h, lines.length, LINE_H, FONT_SIZE),
        size: FONT_SIZE,
        lineHeight: LINE_H,
        color: mine ? "#ffffff" : c.incomingText,
      })
    );
    // small avatar beside the last incoming bubble of a group
    if (!mine && (i === msgs.length - 1 || msgs[i + 1].from !== "them")) {
      parts.push(avatar(doc.username, MARGIN + 12, y + h - 11, 11, `igm${i}`, avatarUrl));
    }
    let gap = 3;
    if (m.reaction) {
      const rx = mine ? x + 6 : x + w - 34;
      parts.push(
        `<rect x="${rx}" y="${y + h - 6}" width="28" height="22" rx="11" fill="${dark ? "#1a1a1a" : "#f1f1f1"}" stroke="${c.bg}" stroke-width="2"/>`,
        `<text font-size="12" x="${rx + 7}" y="${y + h + 10}">${esc(m.reaction)}</text>`
      );
      gap += 14;
    }
    if (mine) lastOutgoingBottom = y + h;
    y += h + (i < msgs.length - 1 && msgs[i + 1].from === m.from ? gap : gap + 7);
  }

  if (doc.chrome._anim?.typing) {
    // dots bubble on the incoming side (Instagram adopted the iMessage style)
    const th = 38;
    parts.push(
      avatar(doc.username, MARGIN + 12, y + th - 13, 11, "igt", avatarUrl),
      `<rect x="${MARGIN + 30}" y="${y}" width="62" height="${th}" rx="19" fill="${c.incoming}"/>`,
      typingDots(MARGIN + 48, y + th / 2, c.subtle, doc.chrome._anim.dotPhase ?? 0, 4, 11)
    );
  } else if (doc.seen && lastOutgoingBottom !== null && msgs.at(-1)?.from === "me") {
    parts.push(
      `<text font-family="${font}" font-size="11.5" fill="${c.subtle}" text-anchor="end" x="${SW - MARGIN}" y="${y + 6}">Seen</text>`
    );
  }

  /* input pill with camera button */
  const iy = SH - 66;
  parts.push(
    glassPill(MARGIN, iy, SW - MARGIN * 2, 42, dark),
    `<circle cx="${MARGIN + 21}" cy="${iy + 21}" r="15" fill="${c.outgoing}"/>`,
    `<rect x="${MARGIN + 14}" y="${iy + 16}" width="14" height="10.5" rx="3" fill="none" stroke="#ffffff" stroke-width="1.7"/>`,
    `<circle cx="${MARGIN + 21}" cy="${iy + 21.2}" r="2.6" fill="none" stroke="#ffffff" stroke-width="1.5"/>`,
    `<text font-family="${font}" font-size="14.5" fill="${c.subtle}" x="${MARGIN + 44}" y="${iy + 26}">Message…</text>`,
    // mic + image glyphs right
    micIcon(SW - MARGIN - 52, iy + 21, 19, c.text),
    `<rect x="${SW - MARGIN - 34}" y="${iy + 13}" width="16" height="14" rx="3.5" fill="none" stroke="${c.text}" stroke-width="1.6"/>`,
    `<circle cx="${SW - MARGIN - 29}" cy="${iy + 18}" r="1.8" fill="${c.text}"/>`,
    `<path d="M${SW - MARGIN - 33} ${iy + 24} l4.5 -4 4 3.5 4 -3 3 2.8" fill="none" stroke="${c.text}" stroke-width="1.4"/>`,
    homeIndicator(c.text, platform)
  );

  return parts.join("\n");
}

/**
 * Instagram "Message requests" inbox: centered title, explainer copy,
 * Hidden Requests row, request rows (avatar / bold name / preview · time),
 * red "Delete all" at the bottom. The uploaded DP lands on the first row;
 * the rest get initials discs.
 */
function renderInstagramRequests(doc: InstagramDoc, avatarUrl?: string): string {
  const platform = doc.chrome.platform ?? "ios";
  const font = fontFor("instagram", platform);
  const textBlock = (lines: string[], o: Parameters<typeof baseTextBlock>[1]) =>
    baseTextBlock(lines, { font, ...o });
  const dark = !!doc.chrome.dark;
  const c = {
    bg: dark ? "#000000" : "#ffffff",
    text: dark ? "#f5f5f5" : "#000000",
    subtle: dark ? "#a8a8a8" : "#8e8e8e",
    hairline: dark ? "#262626" : "#efefef",
    red: "#ed4956",
  };

  const parts: string[] = [`<rect width="${SW}" height="${SH}" fill="${c.bg}"/>`];

  /* header: back chevron + centered title */
  const HEADER_H = 104;
  const title = "Message requests";
  parts.push(
    statusBar({ time: doc.chrome.time, battery: doc.chrome.battery, color: c.text, platform }),
    `<rect y="${HEADER_H - 0.5}" width="${SW}" height="0.5" fill="${c.hairline}"/>`,
    `<path d="M26 64 l-10 11 10 11" fill="none" stroke="${c.text}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
    textBlock([title], { x: SW / 2 - textWidth(title, 16) / 2, y: 80, size: 16, lineHeight: 19, color: c.text, weight: 700 })
  );

  /* explainer copy */
  let y = HEADER_H + 26;
  const explainer = wrapText(
    "Open a request to see who sent it. They won't know you've seen it until you accept.",
    13,
    SW - MARGIN * 2 - 8
  );
  parts.push(textBlock(explainer, { x: MARGIN + 2, y, size: 13, lineHeight: 18, color: c.subtle }));
  y += explainer.length * 18 + 14;

  /* Hidden Requests row */
  parts.push(
    textBlock(["Hidden Requests"], { x: MARGIN + 2, y: y + 10, size: 15, lineHeight: 18, color: c.text, weight: 600 }),
    `<path d="M${SW - MARGIN - 12} ${y + 2} l7 8 -7 8" fill="none" stroke="${c.subtle}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<rect x="${MARGIN}" y="${y + 26}" width="${SW - MARGIN * 2}" height="0.5" fill="${c.hairline}"/>`
  );
  y += 44;

  /* request rows */
  const ROW_H = 72;
  const rows = doc.requests ?? [];
  for (let i = 0; i < rows.length; i++) {
    if (y + ROW_H > SH - 80) break; // keep clear of "Delete all"
    const r = rows[i];
    const cy = y + ROW_H / 2;
    parts.push(avatar(r.name, MARGIN + 28, cy, 26, `igr${i}`, i === 0 ? avatarUrl : undefined));
    const nameY = cy - 4;
    parts.push(
      textBlock([truncate(r.name, 15, SW - MARGIN * 2 - 100)], { x: MARGIN + 64, y: nameY, size: 15, lineHeight: 18, color: c.text, weight: 600 }),
      r.verified
        ? verifiedSeal(MARGIN + 64 + textWidth(truncate(r.name, 15, SW - MARGIN * 2 - 100), 15) + 5, nameY - 12, "#0095f6")
        : "",
      textBlock(
        [truncate(`${r.preview}${r.time ? ` · ${r.time}` : ""}`, 13.5, SW - MARGIN * 2 - 78)],
        { x: MARGIN + 64, y: cy + 16, size: 13.5, lineHeight: 17, color: c.subtle }
      )
    );
    y += ROW_H;
  }

  /* bottom action */
  const label = "Delete all";
  parts.push(
    `<text font-family="${font}" font-size="15" font-weight="600" fill="${c.red}" text-anchor="middle" x="${SW / 2}" y="${SH - 46}">${label}</text>`,
    homeIndicator(c.text, platform)
  );

  return parts.join("\n");
}

function verifiedSeal(x: number, y: number, color: string): string {
  const cx = x + 8, cy = y + 8;
  const petals = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    return `<circle cx="${(cx + Math.cos(a) * 8).toFixed(1)}" cy="${(cy + Math.sin(a) * 8).toFixed(1)}" r="3" fill="${color}"/>`;
  }).join("");
  return `${petals}<circle cx="${cx}" cy="${cy}" r="7.5" fill="${color}"/><path d="M${cx - 3.6} ${cy} l 2.6 2.8 4.8 -5.6" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`;
}
