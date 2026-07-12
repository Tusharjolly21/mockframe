"use client";

import {
  avatar,
  compact,
  esc,
  homeIndicator,
  SH,
  statusBar,
  SW,
  textBlock as baseTextBlock,
  textWidth,
  wrapText,
} from "./common";
import { fontFor } from "./fonts";
import type { RedditDoc } from "./types";

/**
 * Reddit (mobile) post + comment thread: r/subreddit header, post title/body,
 * vote row (up/down arrows + score, comments, share), then nested comments
 * with depth rails, OP badges, and per-comment vote arrows. §15.
 */

const MARGIN = 16;
const FONT = 15;
const LINE_H = 20;
const ORANGE = "#ff4500";

export function renderReddit(doc: RedditDoc, lookupUrl?: (id: string) => string | undefined): string {
  const platform = doc.chrome.platform ?? "ios";
  const font = fontFor("reddit", platform);
  const textBlock = (lines: string[], o: Parameters<typeof baseTextBlock>[1]) =>
    baseTextBlock(lines, { font, ...o });
  const dark = !!doc.chrome.dark;
  const c = dark
    ? { bg: "#0b1416", card: "#0b1416", hairline: "#2a3236", text: "#d7dadc", subtle: "#818384", rail: "#343536", chip: "#223" }
    : { bg: "#ffffff", card: "#ffffff", hairline: "#edeff1", text: "#1a1a1b", subtle: "#7c7c7c", rail: "#e6e6e6", chip: "#f6f7f8" };

  const parts: string[] = [`<rect width="${SW}" height="${SH}" fill="${c.bg}"/>`];

  /* header: r/subreddit + Join */
  const HEADER_H = 96;
  parts.push(
    statusBar({ time: doc.chrome.time, battery: doc.chrome.battery, color: c.text, platform }),
    `<rect y="${HEADER_H - 0.5}" width="${SW}" height="0.5" fill="${c.hairline}"/>`,
    `<path d="M26 70 l-11 11 11 11" fill="none" stroke="${c.text}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<circle cx="60" cy="80" r="13" fill="${ORANGE}"/><text font-size="12" text-anchor="middle" x="60" y="85">👽</text>`,
    `<text font-family="${font}" font-size="15" font-weight="700" fill="${c.text}" x="80" y="85">r/${esc(doc.subreddit)}</text>`,
    // Join pill
    `<rect x="${SW - 150}" y="68" width="56" height="26" rx="13" fill="${ORANGE}"/><text font-family="${font}" font-size="12.5" font-weight="700" fill="#fff" text-anchor="middle" x="${SW - 122}" y="85">Join</text>`,
    // share + more
    `<path d="M${SW - 72} 82 l6 -6 -6 -6 M${SW - 66} 76 h-6 a5 5 0 0 0 -5 5 v2" fill="none" stroke="${c.text}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<circle cx="${SW - 30}" cy="74" r="1.8" fill="${c.text}"/><circle cx="${SW - 30}" cy="80" r="1.8" fill="${c.text}"/><circle cx="${SW - 30}" cy="86" r="1.8" fill="${c.text}"/>`
  );

  /* post */
  let y = HEADER_H + 26;
  parts.push(
    `<text font-family="${font}" font-size="12.5" fill="${c.subtle}" x="${MARGIN}" y="${y}">r/${esc(doc.subreddit)} · ${esc(doc.time)}</text>`,
    `<text font-family="${font}" font-size="12.5" font-weight="600" fill="${ORANGE}" text-anchor="end" x="${SW - MARGIN}" y="${y}">+ Follow</text>`
  );
  y += 22;
  const titleLines = wrapText(doc.title, 20, SW - MARGIN * 2);
  titleLines.forEach((l, i) => parts.push(`<text font-family="${font}" font-size="20" font-weight="800" fill="${c.text}" x="${MARGIN}" y="${y + i * 26}">${esc(l)}</text>`));
  y += titleLines.length * 26 + 8;
  if (doc.body) {
    const bodyLines = wrapText(doc.body, FONT, SW - MARGIN * 2);
    parts.push(textBlock(bodyLines, { x: MARGIN, y: y + FONT * 0.8, size: FONT, lineHeight: LINE_H, color: c.subtle }));
    y += bodyLines.length * LINE_H + 12;
  }

  /* vote / comment / share row */
  parts.push(
    `<rect x="${MARGIN}" y="${y}" width="96" height="34" rx="17" fill="${c.chip}"/>`,
    `<path d="M${MARGIN + 18} ${y + 22} l6 -8 6 8 M${MARGIN + 24} ${y + 14} v10" fill="none" stroke="${ORANGE}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<text font-family="${font}" font-size="14" font-weight="700" fill="${ORANGE}" text-anchor="middle" x="${MARGIN + 50}" y="${y + 22}">${compact(doc.votes)}</text>`,
    `<path d="M${MARGIN + 72} ${y + 12} l6 8 6 -8 M${MARGIN + 78} ${y + 20} v-10" fill="none" stroke="${c.subtle}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
    // comments chip
    `<rect x="${MARGIN + 108}" y="${y}" width="84" height="34" rx="17" fill="${c.chip}"/>`,
    `<path d="M${MARGIN + 124} ${y + 12} h14 a3 3 0 0 1 3 3 v5 a3 3 0 0 1 -3 3 h-8 l-5 4 v-4 a3 3 0 0 1 -1 -3 v-5 a3 3 0 0 1 3 -3 Z" fill="none" stroke="${c.text}" stroke-width="1.6"/>`,
    `<text font-family="${font}" font-size="13.5" font-weight="600" fill="${c.text}" x="${MARGIN + 146}" y="${y + 22}">${esc(doc.commentCount)}</text>`,
    // share chip
    `<rect x="${SW - MARGIN - 92}" y="${y}" width="92" height="34" rx="17" fill="${c.chip}"/>`,
    `<path d="M${SW - MARGIN - 74} ${y + 22} l7 -7 -7 -7 M${SW - MARGIN - 67} ${y + 15} h-7 a5 5 0 0 0 -5 5 v2" fill="none" stroke="${c.text}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<text font-family="${font}" font-size="13.5" font-weight="600" fill="${c.text}" x="${SW - MARGIN - 52}" y="${y + 22}">Share</text>`
  );
  y += 34 + 16;
  parts.push(`<rect x="0" y="${y}" width="${SW}" height="6" fill="${dark ? "#05090a" : "#f6f7f8"}"/>`);
  y += 22;

  /* comments (nested by depth) */
  for (const cm of doc.comments) {
    const indent = MARGIN + (cm.depth ?? 0) * 22;
    if (cm.depth) parts.push(`<rect x="${indent - 12}" y="${y - 8}" width="1.5" height="46" fill="${c.rail}"/>`);
    parts.push(avatar(cm.user, indent + 12, y + 2, 12, `rc${cm.user}${y}`, cm.avatar ? lookupUrl?.(cm.avatar) : undefined));
    let hx = indent + 30;
    parts.push(`<text font-family="${font}" font-size="13" font-weight="600" fill="${cm.op ? "#0079d3" : c.text}" x="${hx}" y="${y + 4}">${esc(cm.user)}</text>`);
    hx += textWidth(cm.user, 13) + 6;
    if (cm.op) {
      parts.push(`<rect x="${hx}" y="${y - 8}" width="24" height="14" rx="3" fill="#0079d3"/><text font-family="${font}" font-size="9" font-weight="700" fill="#fff" text-anchor="middle" x="${hx + 12}" y="${y + 2}">OP</text>`);
      hx += 30;
    }
    parts.push(`<text font-family="${font}" font-size="12.5" fill="${c.subtle}" x="${hx}" y="${y + 4}">· ${esc(cm.time)}</text>`);
    const lines = wrapText(cm.text, 14, SW - indent - 30 - MARGIN);
    lines.forEach((l, k) => parts.push(`<text font-family="${font}" font-size="14" fill="${c.text}" x="${indent + 30}" y="${y + 22 + k * 19}">${esc(l)}</text>`));
    const vy = y + 22 + lines.length * 19 + 6;
    // vote arrows + reply
    parts.push(
      `<path d="M${indent + 30} ${vy} l4 -5 4 5 M${indent + 34} ${vy - 5} v6" fill="none" stroke="${c.subtle}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
      `<text font-family="${font}" font-size="12.5" font-weight="600" fill="${c.subtle}" x="${indent + 46}" y="${vy + 2}">${compact(cm.votes)}</text>`,
      `<path d="${arrowDown(indent + 46 + textWidth(compact(cm.votes), 12.5) + 12, vy)}" fill="none" stroke="${c.subtle}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
      `<text font-family="${font}" font-size="12.5" font-weight="600" fill="${c.subtle}" x="${indent + 100}" y="${vy + 2}">Reply</text>`
    );
    y = vy + 24;
  }

  /* "Add a comment" bar */
  const iy = SH - 62;
  parts.push(
    `<rect x="0" y="${iy - 14}" width="${SW}" height="${SH - iy + 14}" fill="${c.bg}"/>`,
    `<rect x="${MARGIN}" y="${iy}" width="${SW - MARGIN * 2}" height="40" rx="20" fill="${c.chip}"/>`,
    `<text font-family="${font}" font-size="14.5" fill="${c.subtle}" x="${MARGIN + 18}" y="${iy + 25}">Add a comment</text>`,
    homeIndicator(c.text, platform)
  );

  return parts.join("\n");
}

function arrowDown(cx: number, vy: number): string {
  return `M${cx} ${vy - 5} l4 5 4 -5 M${cx + 4} ${vy} v-6`;
}
