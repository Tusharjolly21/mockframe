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
 * Instagram "Message Requests" inbox, matched against real iOS screenshots:
 * centered bold title with "Edit" top-right, gray explainer band, request
 * rows (avatar / bold name / black preview with gray " · time", blue unread
 * dot right), a "Hidden Requests" row with eye-off disc + count + chevron
 * BELOW the requests, and a hairline-separated red "Delete All" band. The
 * uploaded DP lands on the first row; the rest get initials discs.
 */
function renderInstagramRequests(doc: InstagramDoc, avatarUrl?: string): string {
  const platform = doc.chrome.platform ?? "ios";
  const font = fontFor("instagram", platform);
  const textBlock = (lines: string[], o: Parameters<typeof baseTextBlock>[1]) =>
    baseTextBlock(lines, { font, ...o });
  const dark = !!doc.chrome.dark;
  const c = {
    bg: dark ? "#000000" : "#ffffff",
    band: dark ? "#101010" : "#f8f8f8",
    text: dark ? "#f5f5f5" : "#000000",
    subtle: dark ? "#a8a8a8" : "#8e8e8e",
    hairline: dark ? "#262626" : "#efefef",
    blue: "#0095f6",
    red: "#ed4956",
  };

  const parts: string[] = [`<rect width="${SW}" height="${SH}" fill="${c.bg}"/>`];

  /* header: back chevron, centered bold title, "Edit" right */
  const HEADER_H = 104;
  const title = "Message Requests";
  parts.push(
    statusBar({ time: doc.chrome.time, battery: doc.chrome.battery, color: c.text, platform }),
    `<path d="M26 64 l-10 11 10 11" fill="none" stroke="${c.text}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
    textBlock([title], { x: SW / 2 - textWidth(title, 16.5) / 2, y: 81, size: 16.5, lineHeight: 20, color: c.text, weight: 700 }),
    `<text font-family="${font}" font-size="15.5" fill="${c.text}" text-anchor="end" x="${SW - 16}" y="81">Edit</text>`
  );

  /* gray explainer band, centered copy, hairlines top + bottom */
  const explainer = wrapText(
    "Open a chat to get more info about who's messaging you. They won't know you've seen it until you accept.",
    13,
    SW - 60
  );
  const BAND_H = explainer.length * 18 + 26;
  parts.push(
    `<rect y="${HEADER_H}" width="${SW}" height="${BAND_H}" fill="${c.band}"/>`,
    `<rect y="${HEADER_H - 0.5}" width="${SW}" height="0.5" fill="${c.hairline}"/>`,
    `<rect y="${(HEADER_H + BAND_H - 0.5).toFixed(1)}" width="${SW}" height="0.5" fill="${c.hairline}"/>`
  );
  let ey = HEADER_H + 24;
  for (const line of explainer) {
    parts.push(
      `<text font-family="${font}" font-size="13" fill="${c.subtle}" text-anchor="middle" x="${SW / 2}" y="${ey}">${esc(line)}</text>`
    );
    ey += 18;
  }
  let y = HEADER_H + BAND_H + 8;

  /* request rows */
  const ROW_H = 64;
  const TEXT_X = 74;
  const rows = doc.requests ?? [];
  for (let i = 0; i < rows.length; i++) {
    if (y + ROW_H > SH - 160) break; // keep clear of Hidden Requests + Delete All
    const r = rows[i];
    const cy = y + ROW_H / 2;
    parts.push(avatar(r.name, 38, cy, 22, `igr${i}`, i === 0 ? avatarUrl : undefined));
    const name = truncate(r.name, 15.5, SW - TEXT_X - 60);
    parts.push(
      textBlock([name], { x: TEXT_X, y: cy - 5, size: 15.5, lineHeight: 19, color: c.text, weight: 600 }),
      r.verified ? verifiedSeal(TEXT_X + textWidth(name, 15.5) + 5, cy - 5 - 12, c.blue) : ""
    );
    /* preview: black when unread (real app), gray otherwise; gray " · time" */
    const previewColor = r.unread ? c.text : c.subtle;
    const preview = truncate(r.preview, 15, SW - TEXT_X - (r.time ? 74 : 44));
    parts.push(
      `<text font-family="${font}" font-size="15" fill="${previewColor}" x="${TEXT_X}" y="${cy + 17}">${esc(preview)}${
        r.time ? `<tspan fill="${c.subtle}"> · ${esc(r.time)}</tspan>` : ""
      }</text>`
    );
    if (r.unread) parts.push(`<circle cx="${SW - 22}" cy="${cy}" r="4.5" fill="${c.blue}"/>`);
    y += ROW_H;
  }

  /* Hidden Requests row: eye-off disc, label, count + chevron right */
  if ((doc.hiddenRequests ?? 0) > 0) {
    const cy = y + ROW_H / 2;
    const ex = 38, eyy = cy; // eye-off disc center
    parts.push(
      `<circle cx="${ex}" cy="${eyy}" r="22" fill="none" stroke="${c.hairline}" stroke-width="1.5"/>`,
      // eye-off glyph: eye outline + pupil + diagonal slash
      `<path d="M${ex - 10} ${eyy} Q${ex} ${eyy - 9} ${ex + 10} ${eyy} Q${ex} ${eyy + 9} ${ex - 10} ${eyy} Z" fill="none" stroke="${c.text}" stroke-width="1.6" stroke-linejoin="round"/>`,
      `<circle cx="${ex}" cy="${eyy}" r="3" fill="none" stroke="${c.text}" stroke-width="1.5"/>`,
      `<path d="M${ex - 9} ${eyy + 10} L${ex + 9} ${eyy - 10}" stroke="${c.text}" stroke-width="1.6" stroke-linecap="round"/>`,
      textBlock(["Hidden Requests"], { x: TEXT_X, y: cy + 5, size: 15.5, lineHeight: 19, color: c.text, weight: 600 }),
      `<text font-family="${font}" font-size="15.5" fill="${c.subtle}" text-anchor="end" x="${SW - 36}" y="${cy + 5}">${doc.hiddenRequests}</text>`,
      `<path d="M${SW - 26} ${cy - 7} l7 7 -7 7" fill="none" stroke="${c.subtle}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
    );
  }

  /* bottom band: hairline + red Delete All */
  parts.push(
    `<rect y="${SH - 92}" width="${SW}" height="0.5" fill="${c.hairline}"/>`,
    `<text font-family="${font}" font-size="16.5" font-weight="600" fill="${c.red}" text-anchor="middle" x="${SW / 2}" y="${SH - 52}">Delete All</text>`,
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
