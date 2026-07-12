"use client";

import {
  esc,
  homeIndicator,
  imageBubble,
  initials,
  SERIF_FONT,
  SH,
  statusBar,
  SW,
  textBlock as baseTextBlock,
  textWidth,
  truncate,
  wrapText,
} from "./common";
import { fontFor } from "./fonts";
import type { HingeCard, HingeDoc, HingeVitalIcon } from "./types";

/**
 * Hinge dating profile — a vertically-scrolling stack of full-bleed PHOTO cards
 * and pure-white PROMPT cards on a cream page. The lead photo carries the name
 * + age in an editorial serif; vitals (height · location · job · school) flow as
 * plain icon+text under it. EVERY photo and EVERY prompt gets the signature
 * white heart-like button tucked into its bottom-right corner. §13.
 */

const CARD_X = 12;
const CARD_W = SW - 24; // 378
const HEART_CX = CARD_X + CARD_W - 34; // 356 — tucked in from the right edge
const LEAD_Y = 62;
const LEAD_H = 430;
const LEAD_B = LEAD_Y + LEAD_H; // 492
const CARD_GAP = 30;

interface Palette {
  page: string;
  card: string;
  text: string;
  label: string;
  vic: string; // vitals icon
  accent: string;
  scrim: string;
}

export function renderHinge(doc: HingeDoc, avatarUrl?: string, lookupUrl?: (id: string) => string | undefined): string {
  const platform = doc.chrome.platform ?? "ios";
  const font = fontFor("hinge", platform);
  const textBlock = (lines: string[], o: Parameters<typeof baseTextBlock>[1]) => baseTextBlock(lines, { font, ...o });
  const dark = !!doc.chrome.dark;
  const c: Palette = dark
    ? { page: "#171310", card: "#241E18", text: "#F4F1EA", label: "#8E877C", vic: "#B8B0A4", accent: "#9F81A5", scrim: "rgba(0,0,0,0.55)" }
    : { page: "#F4F1EA", card: "#FFFFFF", text: "#1A1A1A", label: "#8C8A85", vic: "#5A5A5A", accent: "#67295F", scrim: "rgba(0,0,0,0.45)" };

  const liked = new Set(doc.liked ?? []);
  const parts: string[] = [`<rect width="${SW}" height="${SH}" fill="${c.page}"/>`];
  parts.push(statusBar({ time: doc.chrome.time, battery: doc.chrome.battery, color: c.text, platform }));

  /* -------------------------------- lead photo -------------------------------- */
  const leadIdx = doc.cards.findIndex((k) => k.type === "photo");
  if (leadIdx >= 0) {
    const lead = doc.cards[leadIdx] as Extract<HingeCard, { type: "photo" }>;
    const url = lead.image ? lookupUrl?.(lead.image) : undefined;
    const hue = hueFrom(doc.name);
    parts.push(
      `<defs><clipPath id="hgleadclip"><rect x="${CARD_X}" y="${LEAD_Y}" width="${CARD_W}" height="${LEAD_H}" rx="20"/></clipPath>` +
        `<linearGradient id="hgleadscrim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(0,0,0,0)"/><stop offset="1" stop-color="${c.scrim}"/></linearGradient>` +
        (url ? "" : `<linearGradient id="hgleadph" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 44% 56%)"/><stop offset="1" stop-color="hsl(${(hue + 42) % 360} 40% 40%)"/></linearGradient>`) +
        `</defs>`
    );
    parts.push(`<g clip-path="url(#hgleadclip)">`);
    if (url) {
      parts.push(`<image href="${url}" x="${CARD_X}" y="${LEAD_Y}" width="${CARD_W}" height="${LEAD_H}" preserveAspectRatio="xMidYMid slice"/>`);
    } else {
      parts.push(
        `<rect x="${CARD_X}" y="${LEAD_Y}" width="${CARD_W}" height="${LEAD_H}" fill="url(#hgleadph)"/>`,
        `<text font-family="${SERIF_FONT}" font-size="150" font-weight="600" fill="rgba(255,255,255,0.28)" text-anchor="middle" x="${SW / 2}" y="${LEAD_Y + LEAD_H / 2 + 24}">${esc(initials(doc.name))}</text>`
      );
    }
    parts.push(`<rect x="${CARD_X}" y="${LEAD_B - 150}" width="${CARD_W}" height="150" fill="url(#hgleadscrim)"/>`);
    parts.push(`</g>`);

    // name + age in white serif, verified badge, heart (truncate so it never reaches the heart)
    const nameStr = truncate(`${doc.name}, ${doc.age}`, 30, HEART_CX - 28 - 40);
    parts.push(`<text font-family="${SERIF_FONT}" font-size="30" font-weight="500" fill="#ffffff" x="28" y="474">${esc(nameStr)}</text>`);
    if (doc.verified) {
      const bx = 28 + textWidth(nameStr, 30) + 17;
      parts.push(verifiedBadge(bx, 465, c.accent));
    }
    parts.push(heartButton(HEART_CX, 474, liked.has(leadIdx), c));
  } else {
    // no photo card: render the name + age as a serif header so it isn't a blank cream band
    const nameStr = truncate(`${doc.name}, ${doc.age}`, 28, SW - 40 - 24);
    parts.push(`<text font-family="${SERIF_FONT}" font-size="28" font-weight="500" fill="${c.text}" x="20" y="104">${esc(nameStr)}</text>`);
    if (doc.verified) parts.push(verifiedBadge(20 + textWidth(nameStr, 28) + 16, 96, c.accent));
  }

  /* ---------------------------------- vitals ---------------------------------- */
  let vy = leadIdx >= 0 ? 515 : 132;
  let vx = 20;
  const maxVX = SW - 20; // 382
  for (const vital of doc.vitals) {
    const vt = truncate(vital.text, 14, maxVX - 40 - 20); // never bleed past the right edge
    const itemW = 20 + textWidth(vt, 14);
    if (vx > 20 && vx + itemW > maxVX) {
      vx = 20;
      vy += 27;
    }
    parts.push(vitalGlyph(vital.icon, vx, vy - 14, c.vic));
    parts.push(`<text font-family="${font}" font-size="14" fill="${c.text}" x="${vx + 20}" y="${vy}">${esc(vt)}</text>`);
    vx += itemW + 18;
  }

  /* ----------------------------- stacked cards -------------------------------- */
  let y = vy + 24;
  for (let i = 0; i < doc.cards.length; i++) {
    if (i === leadIdx) continue;
    if (y > 840) break;
    const card = doc.cards[i];
    const isLiked = liked.has(i);
    if (card.type === "prompt") {
      const allLines = wrapText(card.answer, 24, CARD_W - 40);
      const answerLines = allLines.slice(0, 3);
      if (allLines.length > 3 && answerLines.length === 3)
        answerLines[2] = truncate(answerLines[2] + " …", 24, CARD_W - 40);
      const n = answerLines.length;
      const labelBaseline = y + 34;
      const answerFirst = labelBaseline + 30;
      const cardBottom = answerFirst + (n - 1) * 30 + 24;
      parts.push(
        `<rect x="${CARD_X}" y="${y}" width="${CARD_W}" height="${(cardBottom - y).toFixed(1)}" rx="20" fill="${c.card}" style="filter:drop-shadow(0 2px 10px rgba(0,0,0,0.06))"/>`,
        `<text font-family="${font}" font-size="13" font-weight="500" fill="${c.label}" x="32" y="${labelBaseline}">${esc(card.label)}</text>`,
        textBlock(answerLines, { x: 32, y: answerFirst, size: 24, lineHeight: 30, color: c.text, weight: 500, font: SERIF_FONT })
      );
      if (cardBottom < 858) parts.push(heartButton(HEART_CX, cardBottom, isLiked, c));
      y = cardBottom + CARD_GAP;
    } else {
      const ph = 300;
      const cardBottom = y + ph;
      const url = card.image ? lookupUrl?.(card.image) : undefined;
      if (url) {
        parts.push(imageBubble(url, CARD_X, y, CARD_W, ph, `hgp${i}`, { rx: 20 }));
      } else {
        const hue = hueFrom(doc.name + i);
        parts.push(
          `<defs><clipPath id="hgp${i}c"><rect x="${CARD_X}" y="${y}" width="${CARD_W}" height="${ph}" rx="20"/></clipPath>` +
            `<linearGradient id="hgp${i}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 42% 54%)"/><stop offset="1" stop-color="hsl(${(hue + 42) % 360} 38% 38%)"/></linearGradient></defs>`,
          `<g clip-path="url(#hgp${i}c)"><rect x="${CARD_X}" y="${y}" width="${CARD_W}" height="${ph}" fill="url(#hgp${i}g)"/>` +
            `<text font-family="${SERIF_FONT}" font-size="120" font-weight="600" fill="rgba(255,255,255,0.26)" text-anchor="middle" x="${SW / 2}" y="${y + ph / 2 + 20}">${esc(initials(doc.name))}</text></g>`
        );
      }
      if (cardBottom < 858) parts.push(heartButton(HEART_CX, cardBottom, isLiked, c));
      y = cardBottom + CARD_GAP;
    }
  }

  parts.push(homeIndicator(c.text, platform));
  return parts.join("\n");
}

/* --------------------------------- helpers ---------------------------------- */

function hueFrom(s: string): number {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 360;
}

/** White (surface) circle + eggplant heart — outline when not liked, filled when liked. */
function heartButton(cx: number, cy: number, liked: boolean, c: Palette): string {
  const s = 8;
  const d =
    `M${cx} ${(cy + s * 0.9).toFixed(1)} C ${(cx - s * 2).toFixed(1)} ${(cy - s * 0.6).toFixed(1)} ${(cx - s).toFixed(1)} ${(cy - s * 1.7).toFixed(1)} ${cx} ${(cy - s * 0.5).toFixed(1)} ` +
    `C ${(cx + s).toFixed(1)} ${(cy - s * 1.7).toFixed(1)} ${(cx + s * 2).toFixed(1)} ${(cy - s * 0.6).toFixed(1)} ${cx} ${(cy + s * 0.9).toFixed(1)} Z`;
  const heart = liked
    ? `<path d="${d}" fill="${c.accent}"/>`
    : `<path d="${d}" fill="none" stroke="${c.accent}" stroke-width="2" stroke-linejoin="round"/>`;
  return `<circle cx="${cx}" cy="${cy}" r="23" fill="${c.card}" style="filter:drop-shadow(0 2px 6px rgba(0,0,0,0.25))"/>` + heart;
}

function verifiedBadge(cx: number, cy: number, accent: string): string {
  return (
    `<circle cx="${cx}" cy="${cy}" r="9" fill="${accent}"/>` +
    `<path d="M${cx - 4} ${cy + 0.5} l3 3 5 -6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
  );
}

/** Minimal 16pt outline glyph per vitals type, top-left anchored at (x, y). */
function vitalGlyph(type: HingeVitalIcon, x: number, y: number, color: string): string {
  let body = "";
  switch (type) {
    case "height":
      body = `<path d="M${x + 8} ${y + 2} v12 M${x + 8} ${y + 2} l-2.5 3 M${x + 8} ${y + 2} l2.5 3 M${x + 8} ${y + 14} l-2.5 -3 M${x + 8} ${y + 14} l2.5 -3"/>`;
      break;
    case "location":
      body =
        `<path d="M${x + 8} ${y + 15} C ${x + 3.5} ${y + 9} ${x + 3.5} ${y + 3} ${x + 8} ${y + 3} C ${x + 12.5} ${y + 3} ${x + 12.5} ${y + 9} ${x + 8} ${y + 15} Z"/>` +
        `<circle cx="${x + 8}" cy="${y + 6.5}" r="1.8" fill="${color}" stroke="none"/>`;
      break;
    case "job":
      body =
        `<rect x="${x + 2.5}" y="${y + 6}" width="11" height="8" rx="1.6"/>` +
        `<path d="M${x + 5.5} ${y + 6} v-1.4 a1.4 1.4 0 0 1 1.4 -1.4 h2.2 a1.4 1.4 0 0 1 1.4 1.4 v1.4"/>` +
        `<path d="M${x + 2.5} ${y + 9.5} h11"/>`;
      break;
    case "school":
      body =
        `<path d="M${x + 8} ${y + 3.5} l6 2.8 l-6 2.8 l-6 -2.8 Z"/>` +
        `<path d="M${x + 4.5} ${y + 7.6} v3 a3.5 2 0 0 0 7 0 v-3"/>` +
        `<path d="M${x + 14} ${y + 6.3} v3.6"/>`;
      break;
    case "age":
      body =
        `<rect x="${x + 3}" y="${y + 7.5}" width="10" height="6.5" rx="1.5"/>` +
        `<path d="M${x + 8} ${y + 7.5} v-2.5"/>` +
        `<circle cx="${x + 8}" cy="${y + 4}" r="1" fill="${color}" stroke="none"/>`;
      break;
    case "pronouns":
      body = `<circle cx="${x + 8}" cy="${y + 5.5}" r="2.6"/>` + `<path d="M${x + 3} ${y + 14.5} a5 5 0 0 1 10 0"/>`;
      break;
    case "religion":
      body =
        `<path d="M${x + 2.5} ${y + 7} l5.5 -3.8 l5.5 3.8"/>` +
        `<path d="M${x + 4} ${y + 7} v7 M${x + 12} ${y + 7} v7 M${x + 3} ${y + 14} h10"/>` +
        `<path d="M${x + 6.5} ${y + 14} v-3 h3 v3"/>`;
      break;
    case "drinking":
      body = `<path d="M${x + 3} ${y + 3.5} h10 l-5 6 Z"/>` + `<path d="M${x + 8} ${y + 9.5} v4 M${x + 5} ${y + 13.5} h6"/>`;
      break;
  }
  return `<g fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${body}</g>`;
}
