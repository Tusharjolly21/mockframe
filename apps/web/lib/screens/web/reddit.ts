"use client";

import { compact, textBlock, textWidth, truncate, wrapText, esc } from "../common";
import { fontFor } from "../fonts";
import type { RedditDoc } from "../types";
import { WEB_H, WEB_W } from "../webPage";
import { dots, icon, REDDIT_ORANGE, redditTheme, snooAvatar, snooMark, txt, webTime } from "./rd-common";

/**
 * reddit.com thread page at 1440×900: header, left rail, post column with the
 * comment tree and thread lines, and the community sidebar.
 */

const RAIL_W = 272;
const MAIN_X = 316;
const MAIN_W = 740;
const SIDE_X = 1080;
const SIDE_W = 316;
const HEADER_H = 56;

const COMMUNITIES = ["javascript", "reactjs", "programming", "web_design", "typescript", "css", "SideProject", "startups"];
const RULES = ["Be Respectful", "No Self-Promotion or Spam", "Posts must relate to web development", "No Low-Effort Questions", "Keep it Civil"];

function clamp(text: string, size: number, w: number, max: number): string[] {
  const lines = wrapText(text, size, w, true);
  if (lines.length <= max) return lines;
  const out = lines.slice(0, max);
  out[max - 1] = truncate(out[max - 1] + " " + lines[max], size, w - 12);
  return out;
}

export function renderRedditWeb(doc: RedditDoc, _avatarUrl?: string, lookupUrl?: (id: string) => string | undefined): string {
  void _avatarUrl;
  const dark = !!doc.chrome.dark;
  const c = redditTheme(dark, true);
  const font = fontFor("reddit", "ios");
  const T = (x: number, y: number, size: number, s: string, fill: string, weight = 400, anchor = "start") =>
    txt(font, x, y, size, s, fill, weight, anchor);
  const tb = (lines: string[], o: Parameters<typeof textBlock>[1]) => textBlock(lines, { font, ...o });
  const sub = doc.subreddit.replace(/^r\//, "");
  const parts: string[] = [`<rect width="${WEB_W}" height="${WEB_H}" fill="${c.bg}"/>`];
  const body: string[] = [];

  /* ---------------------------- left rail ---------------------------- */
  const rail: string[] = [`<rect x="${RAIL_W - 0.5}" y="${HEADER_H}" width="1" height="${WEB_H}" fill="${c.line}"/>`];
  const navRows: Array<[string, Parameters<typeof icon>[0]]> = [
    ["Home", "home"],
    ["Popular", "popular"],
    ["Explore", "explore"],
    ["All", "all"],
  ];
  let ry = HEADER_H + 14;
  navRows.forEach(([label, ic]) => {
    rail.push(icon(ic, 32, ry + 20, 20, c.text, false, 1.7), T(58, ry + 25, 14.5, label, c.text, 500));
    ry += 40;
  });
  ry += 10;
  rail.push(`<rect x="16" y="${ry}" width="${RAIL_W - 32}" height="1" fill="${c.line}"/>`);
  ry += 22;
  rail.push(T(20, ry + 5, 11.5, "COMMUNITIES", c.sub, 600), icon("caret", RAIL_W - 28, ry + 1, 16, c.sub, false, 2));
  ry += 14;
  rail.push(icon("plus", 32, ry + 20, 20, c.text, false, 1.8), T(58, ry + 25, 14.5, "Create a community", c.text, 500));
  ry += 40;
  const list = [sub, ...COMMUNITIES.filter((n) => n.toLowerCase() !== sub.toLowerCase())].slice(0, 9);
  list.forEach((name, i) => {
    if (i === 0) rail.push(`<rect x="8" y="${ry}" width="${RAIL_W - 16}" height="40" rx="10" fill="${c.hover}"/>`);
    rail.push(snooMark(32, ry + 20, 12, ["#ff4500", "#0079d3", "#7e53c1", "#46d160", "#ff66ac", "#0dd3bb", "#ffb000", "#ea0027", "#576f76"][i % 9]), T(58, ry + 25, 14.5, `r/${truncate(name, 14.5, 170)}`, c.text, 500));
    ry += 40;
  });

  /* ------------------------------- post ------------------------------ */
  let y = HEADER_H + 20;
  body.push(`<circle cx="${MAIN_X + 16}" cy="${y + 20}" r="16" fill="${c.pill}"/>`, icon("back", MAIN_X + 16, y + 20, 17, c.text, false, 2));
  body.push(snooMark(MAIN_X + 62, y + 20, 16));
  const subName = `r/${truncate(sub, 13.5, 190)}`;
  body.push(T(MAIN_X + 86, y + 17, 13.5, subName, c.text, 700));
  body.push(T(MAIN_X + 86 + textWidth(subName, 13.5) + 10, y + 17, 12.5, `• ${webTime(doc.time)}`, c.sub));
  body.push(T(MAIN_X + 86, y + 34, 12.5, doc.author, c.sub));
  body.push(
    `<rect x="${MAIN_X + MAIN_W - 106}" y="${y + 4}" width="62" height="32" rx="16" fill="${c.join}"/>`,
    T(MAIN_X + MAIN_W - 75, y + 25, 13.5, "Join", "#ffffff", 600, "middle"),
    `<circle cx="${MAIN_X + MAIN_W - 16}" cy="${y + 20}" r="16" fill="${c.pill}" opacity="0.0"/>`,
    dots(MAIN_X + MAIN_W - 16, y + 20, c.text, false, 1.8, 6)
  );
  y += 54;
  const titleLines = clamp(doc.title, 22, MAIN_W - 30, 4);
  body.push(tb(titleLines, { x: MAIN_X, y: y + 20, size: 22, lineHeight: 29, color: c.text, weight: 700 }));
  y += titleLines.length * 29 + 8;
  if (doc.body) {
    const lines = clamp(doc.body, 15, MAIN_W - 24, 7);
    body.push(tb(lines, { x: MAIN_X, y: y + 15, size: 15, lineHeight: 22, color: c.text }));
    y += lines.length * 22 + 6;
  }
  y += 12;

  // action row: vote pill, comments, award, share
  const pillH = 34;
  const cy = y + pillH / 2;
  const score = compact(doc.votes);
  const voteW = 14 + 18 + 10 + textWidth(score, 14) + 10 + 18 + 14;
  let px = MAIN_X;
  const pill = (w: number) => `<rect x="${px}" y="${y}" width="${w.toFixed(1)}" height="${pillH}" rx="${pillH / 2}" fill="${c.pill}"/>`;
  body.push(pill(voteW), icon("up", px + 23, cy, 18, REDDIT_ORANGE, true, 1.6), T(px + 14 + 18 + 10 + textWidth(score, 14) / 2, cy + 5, 14, score, REDDIT_ORANGE, 700, "middle"), icon("down", px + voteW - 23, cy, 18, c.text, false, 1.6));
  px += voteW + 8;
  const cc = doc.commentCount;
  const comW = 14 + 18 + 8 + textWidth(cc, 14) + 14;
  body.push(pill(comW), icon("comment", px + 23, cy, 18, c.text, false, 1.6), T(px + 14 + 18 + 8, cy + 5, 14, cc, c.text, 600));
  px += comW + 8;
  body.push(pill(42), icon("gift", px + 21, cy, 18, c.text, false, 1.6));
  px += 50;
  const shW = 14 + 18 + 8 + textWidth("Share", 14) + 14;
  body.push(pill(shW), icon("share", px + 23, cy, 18, c.text, false, 1.6), T(px + 14 + 18 + 8, cy + 5, 14, "Share", c.text, 600));
  y += pillH + 18;

  // comment composer
  body.push(
    `<rect x="${MAIN_X + 0.5}" y="${y + 0.5}" width="${MAIN_W - 1}" height="44" rx="22" fill="none" stroke="${dark ? "#3a4a50" : "#c4ced3"}" stroke-width="1"/>`,
    T(MAIN_X + 20, y + 27.5, 14.5, "Join the conversation", c.sub)
  );
  y += 44 + 20;

  // sort row
  body.push(
    T(MAIN_X, y + 17, 13, "Sort by:", c.sub, 500),
    T(MAIN_X + 56, y + 17, 13, "Best", c.text, 600),
    icon("caret", MAIN_X + 56 + textWidth("Best", 13) + 12, y + 13, 14, c.text, false, 2),
    `<rect x="${MAIN_X + MAIN_W - 210}" y="${y - 3}" width="210" height="32" rx="16" fill="${c.pill}"/>`,
    icon("search", MAIN_X + MAIN_W - 210 + 20, y + 13, 16, c.sub, false, 1.9),
    T(MAIN_X + MAIN_W - 210 + 38, y + 18, 13, "Search Comments", c.sub)
  );
  y += 44;

  /* ----------------------------- comments ---------------------------- */
  type Item = { top: number; hy: number; depth: number; parent: number; cx: number };
  const items: Item[] = [];
  const stack: number[] = [];
  const STEP = 38;
  doc.comments.forEach((cm, idx) => {
    const depth = Math.min(cm.depth ?? 0, 5);
    while (stack.length && items[stack[stack.length - 1]].depth >= depth) stack.pop();
    const parent = stack.length ? stack[stack.length - 1] : -1;
    stack.push(idx);
    const cx = MAIN_X + 14 + depth * STEP;
    const contentX = cx + 24;
    const top = y;
    const hy = top + 14;
    items.push({ top, hy, depth, parent, cx });
    body.push(snooAvatar(cm.user, cx, hy, 14, `rdw-av${idx}`, cm.avatar ? lookupUrl?.(cm.avatar) : undefined));
    const name = truncate(cm.user, 13, 260);
    let hx = contentX;
    body.push(T(hx, hy + 4.5, 13, name, c.text, 600));
    hx += textWidth(name, 13) * 1.03 + 8;
    if (cm.op) {
      body.push(T(hx, hy + 4.5, 12, "OP", "#0079d3", 700));
      hx += textWidth("OP", 12) + 8;
    }
    body.push(T(hx, hy + 4.5, 12.5, `• ${webTime(cm.time)}`, c.sub));
    const lines = wrapText(cm.text, 14.5, MAIN_X + MAIN_W - contentX - 28, true);
    body.push(tb(lines, { x: contentX, y: top + 46, size: 14.5, lineHeight: 21, color: c.text }));
    const ay = top + 46 + (lines.length - 1) * 21 + 24;
    // action row: votes, reply, share, more
    const v = compact(cm.votes);
    const vw = textWidth(v, 13);
    let ax = contentX;
    body.push(icon("up", ax + 9, ay, 18, c.sub, false, 1.6), T(ax + 24 + vw / 2, ay + 4.5, 13, v, c.sub, 600, "middle"), icon("down", ax + 24 + vw + 15, ay, 18, c.sub, false, 1.6));
    ax += 24 + vw + 15 + 9 + 16;
    body.push(icon("comment", ax + 9, ay, 17, c.sub, false, 1.6), T(ax + 24, ay + 4.5, 13, "Reply", c.sub, 600));
    ax += 24 + textWidth("Reply", 13) + 18;
    body.push(icon("share", ax + 9, ay, 17, c.sub, false, 1.6), T(ax + 24, ay + 4.5, 13, "Share", c.sub, 600));
    ax += 24 + textWidth("Share", 13) + 18;
    body.push(dots(ax + 9, ay, c.sub, false, 1.6, 5));
    y = ay + 26;
  });
  // thread lines + elbows: a line down each parent's avatar to its last reply
  const lines: string[] = [];
  const lineCol = dark ? "#2d3b41" : "#d3dce0";
  items.forEach((it, i) => {
    const kids = items.map((k, j) => (k.parent === i ? j : -1)).filter((j) => j >= 0);
    if (kids.length) {
      const last = items[kids[kids.length - 1]];
      lines.push(`<rect x="${it.cx - 0.75}" y="${it.top + 32}" width="1.5" height="${Math.max(0, last.hy - 14 - (it.top + 32))}" rx="0.75" fill="${lineCol}"/>`);
    }
    if (it.parent >= 0) {
      const p = items[it.parent];
      lines.push(`<path d="M${p.cx} ${it.hy - 14} Q${p.cx} ${it.hy} ${p.cx + 14} ${it.hy} H${it.cx - 16}" fill="none" stroke="${lineCol}" stroke-width="1.5" stroke-linecap="round"/>`);
    }
  });

  /* ---------------------------- sidebar card ---------------------------- */
  const side: string[] = [];
  const sy = HEADER_H + 20;
  const desc = wrapText(`A community for ${sub} — discussion, questions, news and show-and-tell. Be kind, search before you post, and share what you are building.`, 13.5, SIDE_W - 40);
  const descLines = desc.slice(0, 4);
  const cardH = 58 + 28 + descLines.length * 19 + 22 + 62 + 30 + 28 + RULES.length * 38 + 12;
  side.push(`<rect x="${SIDE_X}" y="${sy}" width="${SIDE_W}" height="${cardH}" rx="16" fill="${c.card}"/>`);
  let cy2 = sy + 22;
  side.push(snooMark(SIDE_X + 36, cy2 + 16, 18), T(SIDE_X + 64, cy2 + 21, 16, `r/${truncate(sub, 16, 120)}`, c.text, 700));
  side.push(`<rect x="${SIDE_X + SIDE_W - 20 - 62}" y="${cy2 + 2}" width="62" height="30" rx="15" fill="${c.join}"/>`, T(SIDE_X + SIDE_W - 20 - 31, cy2 + 22, 13, "Join", "#ffffff", 600, "middle"));
  cy2 += 58;
  side.push(tb(descLines, { x: SIDE_X + 20, y: cy2 + 8, size: 13.5, lineHeight: 19, color: c.text }));
  cy2 += descLines.length * 19 + 22;
  side.push(T(SIDE_X + 20, cy2 + 6, 12.5, "Created Jan 25, 2008 • Public", c.sub));
  cy2 += 26;
  side.push(`<rect x="${SIDE_X + 20}" y="${cy2}" width="${SIDE_W - 40}" height="1" fill="${c.line}"/>`);
  cy2 += 16;
  const stats: Array<[string, string]> = [
    ["2.4M", "Members"],
    ["1.8K", "Online"],
    ["Top 1%", "Rank by size"],
  ];
  stats.forEach(([n, l], i) => {
    const sx = SIDE_X + 20 + i * ((SIDE_W - 40) / 3);
    side.push(T(sx, cy2 + 16, 15, n, c.text, 700), T(sx, cy2 + 33, 11.5, l, c.sub));
  });
  cy2 += 56;
  side.push(`<rect x="${SIDE_X + 20}" y="${cy2}" width="${SIDE_W - 40}" height="1" fill="${c.line}"/>`);
  cy2 += 24;
  side.push(T(SIDE_X + 20, cy2, 11.5, "RULES", c.sub, 600));
  cy2 += 8;
  RULES.forEach((r, i) => {
    side.push(
      T(SIDE_X + 20, cy2 + 24, 13.5, `${i + 1}`, c.sub, 500),
      T(SIDE_X + 42, cy2 + 24, 13.5, truncate(r, 13.5, SIDE_W - 90), c.text, 500),
      icon("caret", SIDE_X + SIDE_W - 28, cy2 + 19, 16, c.sub, false, 2)
    );
    cy2 += 38;
  });

  /* ------------------------------ header ------------------------------ */
  const head: string[] = [
    `<rect width="${WEB_W}" height="${HEADER_H}" fill="${c.bg}"/>`,
    `<rect y="${HEADER_H - 1}" width="${WEB_W}" height="1" fill="${c.line}"/>`,
    snooMark(40, 28, 16),
    T(64, 37, 26, "reddit", REDDIT_ORANGE, 700),
    // search
    `<rect x="396" y="8" width="648" height="40" rx="20" fill="${c.pill}"/>`,
    icon("search", 422, 28, 18, c.sub, false, 1.9),
    T(446, 33, 14.5, "Search Reddit", c.sub),
    // right side: chat, create, get app, log in
    icon("chat", 1086, 28, 22, c.text, false, 1.7),
    icon("plus", 1138, 28, 20, c.text, false, 1.8),
    T(1154, 33, 14.5, "Create", c.text, 500),
    `<rect x="1226" y="10" width="106" height="36" rx="18" fill="${c.pill}"/>`,
    icon("qr", 1248, 28, 17, c.text, false, 1.7),
    T(1264, 33, 13.5, "Get app", c.text, 600),
    `<rect x="1344" y="10" width="70" height="36" rx="18" fill="${REDDIT_ORANGE}"/>`,
    T(1379, 33, 14, "Log In", "#ffffff", 600, "middle"),
  ];
  void esc;

  parts.push(body.join("\n"), lines.join(""), side.join("\n"), rail.join("\n"), head.join("\n"));
  return parts.join("\n");
}
