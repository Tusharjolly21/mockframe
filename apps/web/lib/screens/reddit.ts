"use client";

import {
  compact,
  esc,
  homeIndicator,
  SH,
  statusBar,
  SW,
  textBlock as baseTextBlock,
  textWidth,
  truncate,
  wrapText,
} from "./common";
import { fontFor } from "./fonts";
import type { RedditDoc } from "./types";
import { dots, icon, RAIL_COLORS, REDDIT_ORANGE, redditTheme, snooAvatar, snooMark, txt } from "./web/rd-common";

/**
 * Reddit (mobile) post detail screen: community bar, post (author line, title,
 * body, action pills), "Best" sort row, comment threads with coloured depth
 * rails, "View more replies" and the bottom tab bar.
 */

const M = 16;
const BODY = 15;
const BODY_LH = 21;
const NAV_H = 83;

/** Wrap and clamp to `max` lines, ellipsizing the last one when text overflows. */
function clamp(text: string, size: number, w: number, max: number): string[] {
  const lines = wrapText(text, size, w, true);
  if (lines.length <= max) return lines;
  const out = lines.slice(0, max);
  out[max - 1] = truncate(out[max - 1] + " " + lines[max], size, w - 12);
  return out;
}

export function renderReddit(doc: RedditDoc, lookupUrl?: (id: string) => string | undefined): string {
  const platform = doc.chrome.platform ?? "ios";
  const font = fontFor("reddit", platform);
  const textBlock = (lines: string[], o: Parameters<typeof baseTextBlock>[1]) => baseTextBlock(lines, { font, ...o });
  const dark = !!doc.chrome.dark;
  const c = redditTheme(dark);
  const parts: string[] = [`<rect width="${SW}" height="${SH}" fill="${c.bg}"/>`];
  const T = (x: number, y: number, size: number, s: string, fill: string, weight = 400, anchor = "start") =>
    txt(font, x, y, size, s, fill, weight, anchor);

  /* ---- scrolling content (drawn first, the bars sit on top) ---- */
  const body: string[] = [];
  const sub = doc.subreddit.replace(/^r\//, "");

  // post header: community icon, r/name · time, u/author, Join
  let y = 112;
  body.push(snooMark(M + 15, y + 15, 15));
  const subName = `r/${truncate(sub, 13, 150)}`;
  body.push(T(M + 38, y + 12, 13, subName, c.text, 700));
  body.push(T(M + 38 + textWidth(subName, 13) * 1.04 + 6, y + 12, 12.5, `· ${doc.time}`, c.sub));
  body.push(T(M + 38, y + 28, 12.5, `u/${truncate(doc.author, 12.5, 200)}`, c.sub));
  body.push(
    `<rect x="${SW - M - 56}" y="${y + 2}" width="56" height="28" rx="14" fill="${c.join}"/>`,
    T(SW - M - 28, y + 21, 13, "Join", "#ffffff", 600, "middle")
  );
  y += 50;

  // title + body
  const titleLines = clamp(doc.title, 19, SW - M * 2 - 14, 5);
  body.push(textBlock(titleLines, { x: M, y: y + 17, size: 19, lineHeight: 24.5, color: c.text, weight: 700 }));
  y += titleLines.length * 24.5 + 10;
  if (doc.body) {
    const lines = clamp(doc.body, BODY, SW - M * 2 - 8, 8);
    body.push(textBlock(lines, { x: M, y: y + 14, size: BODY, lineHeight: BODY_LH, color: c.text }));
    y += lines.length * BODY_LH + 8;
  }
  y += 6;

  // action pills: votes | comments | award | share
  const pillH = 32;
  const score = compact(doc.votes);
  const voteW = 14 + 18 + 8 + textWidth(score, 13.5) + 8 + 18 + 14;
  let px = M;
  const pill = (w: number) => `<rect x="${px}" y="${y}" width="${w.toFixed(1)}" height="${pillH}" rx="${pillH / 2}" fill="${c.pill}"/>`;
  const cy = y + pillH / 2;
  body.push(pill(voteW));
  body.push(icon("up", px + 14 + 9, cy, 18, REDDIT_ORANGE, true, 1.6));
  body.push(T(px + 14 + 18 + 8 + textWidth(score, 13.5) / 2, cy + 5, 13.5, score, REDDIT_ORANGE, 700, "middle"));
  body.push(icon("down", px + voteW - 14 - 9, cy, 18, c.text, false, 1.6));
  px += voteW + 8;
  const cc = doc.commentCount;
  const comW = 14 + 18 + 6 + textWidth(cc, 13.5) + 14;
  body.push(pill(comW), icon("comment", px + 14 + 9, cy, 18, c.text, false, 1.6), T(px + 14 + 18 + 6, cy + 5, 13.5, cc, c.text, 600));
  px += comW + 8;
  body.push(pill(40), icon("gift", px + 20, cy, 18, c.text, false, 1.6));
  px += 48;
  const shW = 14 + 18 + 6 + textWidth("Share", 13.5) + 14;
  body.push(pill(shW), icon("share", px + 14 + 9, cy, 18, c.text, false, 1.6), T(px + 14 + 18 + 6, cy + 5, 13.5, "Share", c.text, 600));
  y += pillH + 18;

  // thick divider, then the sort row
  body.push(`<rect x="0" y="${y}" width="${SW}" height="8" fill="${c.pill}" opacity="${dark ? 0.55 : 0.6}"/>`);
  y += 8;
  body.push(icon("sort", M + 9, y + 24, 17, c.sub, false, 1.7), T(M + 28, y + 29, 14, "Best", c.text, 600), icon("caret", M + 28 + textWidth("Best", 14) + 12, y + 25, 14, c.text, false, 2));
  body.push(`<rect x="0" y="${y + 48}" width="${SW}" height="0.7" fill="${c.line}"/>`);
  y += 48 + 16;

  // comments
  type Placed = { top: number; next: number; depth: number };
  const placed: Placed[] = [];
  const comments = doc.comments;
  // the first nested run gets a trailing "View more replies" row
  const firstNested = comments.findIndex((cm) => (cm.depth ?? 0) >= 1);
  let nestedEnd = -1;
  if (firstNested >= 0) {
    nestedEnd = firstNested;
    while ((comments[nestedEnd + 1]?.depth ?? 0) >= 1) nestedEnd++;
  }
  const railLayer: string[] = [];
  comments.forEach((cm, idx) => {
    const depth = Math.min(cm.depth ?? 0, 4);
    const x0 = M + depth * 16;
    const top = y;
    const avatarUrl = cm.avatar ? lookupUrl?.(cm.avatar) : undefined;
    body.push(snooAvatar(cm.user, x0 + 11, y + 11, 11, `rd-av${idx}`, avatarUrl));
    let hx = x0 + 28;
    const name = truncate(cm.user, 13, SW - hx - 90);
    body.push(T(hx, y + 15.5, 13, name, c.text, 600));
    hx += textWidth(name, 13) * 1.03 + 8;
    if (cm.op) {
      body.push(T(hx, y + 15.5, 12, "OP", "#0079d3", 700));
      hx += textWidth("OP", 12) + 8;
    }
    body.push(T(hx, y + 15.5, 12.5, `· ${cm.time}`, c.sub));
    const lines = wrapText(cm.text, 14.5, SW - x0 - M - 14, true);
    body.push(textBlock(lines, { x: x0, y: y + 40, size: 14.5, lineHeight: 20, color: c.text }));
    const ay = y + 40 + (lines.length - 1) * 20 + 22;
    // actions, right-aligned: more · reply · share · [up n down]
    const v = compact(cm.votes);
    const downX = SW - M - 9;
    const vx = downX - 9 - 10 - textWidth(v, 13) / 2;
    const upX = vx - textWidth(v, 13) / 2 - 10 - 9;
    body.push(
      icon("down", downX, ay, 18, c.sub, false, 1.6),
      T(vx, ay + 4.5, 13, v, c.sub, 600, "middle"),
      icon("up", upX, ay, 18, c.sub, false, 1.6),
      icon("share", upX - 40, ay, 17, c.sub, false, 1.6),
      icon("reply", upX - 76, ay, 17, c.sub, false, 1.6),
      dots(upX - 112, ay, c.sub, false, 1.6, 5)
    );
    y = ay + 22;
    placed.push({ top, next: y, depth });
    if (idx === nestedEnd) {
      const vx0 = M + depth * 16;
      body.push(icon("reply", vx0 + 9, y + 12, 15, c.blue, false, 1.8), T(vx0 + 24, y + 17, 13.5, "View more replies", c.blue, 600));
      placed.push({ top: y, next: y + 34, depth });
      y += 34;
    }
  });
  // rails: level L runs through every consecutive comment nested at least L deep
  placed.forEach((p, i) => {
    for (let L = 1; L <= p.depth; L++) {
      const rx = M + L * 16 - 5;
      // trim only where the run of consecutive comments at this level ends
      const cont = (placed[i + 1]?.depth ?? 0) >= L;
      railLayer.push(`<rect x="${rx - 0.8}" y="${p.top - 2}" width="1.6" height="${p.next - p.top - (cont ? 0 : 8)}" fill="${RAIL_COLORS[(L - 1) % RAIL_COLORS.length]}" opacity="${dark ? 0.85 : 0.9}"/>`);
    }
  });
  parts.push(railLayer.join(""), body.join("\n"));

  /* ---- top bar (opaque, over the scrolled content) ---- */
  parts.push(
    `<rect width="${SW}" height="102" fill="${c.bg}"/>`,
    `<rect y="101.3" width="${SW}" height="0.7" fill="${c.line}"/>`,
    statusBar({ time: doc.chrome.time, battery: doc.chrome.battery, color: c.text, platform }),
    icon("back", M + 9, 78, 24, c.text, false, 2),
    snooMark(M + 52, 78, 14),
    T(M + 74, 83, 16, `r/${truncate(sub, 16, 170)}`, c.text, 700),
    icon("search", SW - M - 66, 78, 22, c.text, false, 1.9),
    dots(SW - M - 14, 78, c.text, false, 1.9, 6)
  );

  /* ---- bottom tab bar ---- */
  const ty = SH - NAV_H;
  parts.push(`<rect x="0" y="${ty}" width="${SW}" height="${NAV_H}" fill="${c.bg}"/>`, `<rect x="0" y="${ty}" width="${SW}" height="0.7" fill="${c.line}"/>`);
  const tabs: Array<[string, "home" | "people" | "plus" | "chat" | "bell"]> = [
    ["Home", "home"],
    ["Communities", "people"],
    ["Create", "plus"],
    ["Chat", "chat"],
    ["Inbox", "bell"],
  ];
  tabs.forEach(([label, ic], i) => {
    const cx = (SW / 5) * (i + 0.5);
    const on = i === 0;
    const col = on ? c.text : c.sub;
    if (ic === "plus") {
      parts.push(`<rect x="${cx - 12}" y="${ty + 13}" width="24" height="24" rx="7" fill="none" stroke="${col}" stroke-width="1.8"/>`, icon("plus", cx, ty + 25, 14, col, false, 1.9));
    } else {
      parts.push(icon(ic, cx, ty + 25, 25, col, on, 1.8));
    }
    if (ic === "bell") parts.push(`<circle cx="${cx + 10}" cy="${ty + 14}" r="7.5" fill="${REDDIT_ORANGE}"/>`, T(cx + 10, ty + 17.6, 10, "2", "#ffffff", 700, "middle"));
    parts.push(T(cx, ty + 52, 10.5, label, col, on ? 600 : 500, "middle"));
  });
  parts.push(homeIndicator(c.text, platform));
  void esc;
  return parts.join("\n");
}
