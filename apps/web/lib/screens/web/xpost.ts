"use client";

import { avatar, esc, textWidth, truncate, wrapText } from "../common";
import { fontFor } from "../fonts";
import type { XPostDoc } from "../types";
import { WEB_H, WEB_W } from "../webPage";
import { grokIcon, moreCircleIcon, premiumIcon, XI, xBadge, xColors, xDetail, xIcon, xLogoAt, type XC } from "./xp-shared";

/**
 * x.com desktop post page (1440×900): left nav, 600px conversation column and
 * the right rail (search, Premium, trends, who to follow).
 */

const NAV_W = 275;
const COL_W = 600;
const RAIL_W = 350;
const GAP = 30;
const LEFT = Math.round((WEB_W - (NAV_W + COL_W + RAIL_W + GAP)) / 2); // ≈ 92
const COL_X = LEFT + NAV_W;
const RAIL_X = COL_X + COL_W + GAP;

type Nav = { label: string; draw: (cx: number, cy: number, s: number, col: string) => string };

const NAV: Nav[] = [
  { label: "Home", draw: (cx, cy, s, col) => xIcon(XI.homeFill, cx, cy, s, col) },
  { label: "Explore", draw: (cx, cy, s, col) => xIcon(XI.search, cx, cy, s, col) },
  { label: "Notifications", draw: (cx, cy, s, col) => xIcon(XI.bell, cx, cy, s, col) },
  { label: "Messages", draw: (cx, cy, s, col) => xIcon(XI.mail, cx, cy, s, col) },
  { label: "Grok", draw: grokIcon },
  { label: "Bookmarks", draw: (cx, cy, s, col) => xIcon(XI.bookmark, cx, cy, s, col) },
  { label: "Communities", draw: (cx, cy, s, col) => xIcon(XI.people, cx, cy, s, col) },
  { label: "Premium", draw: premiumIcon },
  { label: "Profile", draw: (cx, cy, s, col) => xIcon(XI.person, cx, cy, s, col) },
  { label: "More", draw: moreCircleIcon },
];

function leftNav(doc: XPostDoc, c: XC, font: string, avatarUrl?: string): string {
  const parts: string[] = [];
  const x = LEFT;
  parts.push(xLogoAt(x + 36, 36, 30, c.text));
  let y = 66;
  NAV.forEach((n, i) => {
    const cy = y + 26;
    const active = i === 0;
    parts.push(n.draw(x + 38, cy, 26, c.text));
    parts.push(
      `<text font-family="${font}" font-size="20" font-weight="${active ? 700 : 400}" fill="${c.text}" x="${x + 70}" y="${cy + 7}">${n.label}</text>`
    );
    y += 52;
  });
  // big Post button
  parts.push(
    `<rect x="${x + 12}" y="${y + 14}" width="${NAV_W - 50}" height="52" rx="26" fill="${c.accent}"/>`,
    `<text font-family="${font}" font-size="17" font-weight="700" fill="#ffffff" text-anchor="middle" x="${x + 12 + (NAV_W - 50) / 2}" y="${y + 46}">Post</text>`
  );
  // account chip pinned to the bottom
  const cy = WEB_H - 48;
  parts.push(avatar(doc.name, x + 32, cy, 20, "xwn", avatarUrl));
  const name = truncate(doc.name, 15, 118);
  parts.push(`<text font-family="${font}" font-size="15" font-weight="700" fill="${c.text}" x="${x + 64}" y="${cy - 3}">${esc(name)}</text>`);
  if (doc.badge !== "none") parts.push(xBadge(x + 64 + textWidth(name, 15) * 1.03 + 10, cy - 8, 17, doc.badge === "gold" ? c.gold : c.accent));
  parts.push(`<text font-family="${font}" font-size="15" fill="${c.subtle}" x="${x + 64}" y="${cy + 16}">${esc(truncate("@" + doc.handle, 15, 130))}</text>`);
  parts.push(xIcon(XI.more, x + NAV_W - 36, cy, 18, c.text));
  return parts.join("\n");
}

function rail(doc: XPostDoc, c: XC, font: string): string {
  const parts: string[] = [];
  const x = RAIL_X;
  const w = RAIL_W;

  // search box
  parts.push(`<rect x="${x}" y="6" width="${w}" height="44" rx="22" fill="${c.chip}"/>`);
  parts.push(xIcon(XI.search, x + 30, 28, 19, c.subtle));
  parts.push(`<text font-family="${font}" font-size="15" fill="${c.subtle}" x="${x + 56}" y="33">Search</text>`);

  // Subscribe to Premium
  let y = 66;
  const subLines = wrapText("Subscribe to unlock new features and if eligible, receive a share of revenue.", 15, w - 32);
  const subH = 16 + 26 + subLines.length * 20 + 14 + 36 + 16;
  parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${subH}" rx="16" fill="${c.card}" stroke="${c.hairline}"/>`);
  parts.push(`<text font-family="${font}" font-size="20" font-weight="800" fill="${c.text}" x="${x + 16}" y="${y + 38}">Subscribe to Premium</text>`);
  subLines.forEach((l, i) => parts.push(`<text font-family="${font}" font-size="15" fill="${c.text}" x="${x + 16}" y="${y + 64 + i * 20}">${esc(l)}</text>`));
  const sbY = y + 16 + 26 + subLines.length * 20 + 14;
  parts.push(
    `<rect x="${x + 16}" y="${sbY}" width="96" height="36" rx="18" fill="${c.accent}"/>`,
    `<text font-family="${font}" font-size="15" font-weight="700" fill="#ffffff" text-anchor="middle" x="${x + 64}" y="${sbY + 23}">Subscribe</text>`
  );
  y += subH + 14;

  // What's happening
  const tags = (doc.text.match(/#\w+/g) ?? []).slice(0, 1);
  const trends: Array<[string, string, string]> = [
    ["Technology · Trending", tags[0] ?? "#buildinpublic", "12.4K posts"],
    ["Design · Trending", "Screen Studio", "8,912 posts"],
    ["Trending in United States", "#indiehackers", "5,407 posts"],
    ["Technology · Trending", "App Store", "31.2K posts"],
  ];
  const trendH = 62;
  const wh = 12 + 28 + trends.length * trendH + 46;
  parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${wh}" rx="16" fill="${c.card}" stroke="${c.hairline}"/>`);
  parts.push(`<text font-family="${font}" font-size="20" font-weight="800" fill="${c.text}" x="${x + 16}" y="${y + 36}">What’s happening</text>`);
  trends.forEach(([ctx, title, count], i) => {
    const ty = y + 52 + i * trendH;
    parts.push(
      `<text font-family="${font}" font-size="13" fill="${c.subtle}" x="${x + 16}" y="${ty + 14}">${esc(ctx)}</text>`,
      `<text font-family="${font}" font-size="15" font-weight="700" fill="${c.text}" x="${x + 16}" y="${ty + 33}">${esc(truncate(title, 15, w - 80))}</text>`,
      `<text font-family="${font}" font-size="13" fill="${c.subtle}" x="${x + 16}" y="${ty + 52}">${esc(count)}</text>`,
      xIcon(XI.more, x + w - 28, ty + 14, 17, c.subtle)
    );
  });
  parts.push(`<text font-family="${font}" font-size="15" fill="${c.accent}" x="${x + 16}" y="${y + wh - 17}">Show more</text>`);
  y += wh + 14;

  // Who to follow (people from the replies first, then filler)
  const fromReplies = (doc.comments ?? []).slice(0, 2).map((cm) => ({ name: cm.user, handle: (cm.handle || cm.user).toLowerCase().replace(/\s+/g, ""), badge: !!cm.verified }));
  const filler = [
    { name: "Maya Chen", handle: "mayabuilds", badge: true },
    { name: "Studio North", handle: "studionorth", badge: false },
    { name: "Kai Ito", handle: "kaiito", badge: false },
  ];
  const people = [...fromReplies, ...filler].filter((p, i, a) => a.findIndex((q) => q.handle === p.handle) === i).slice(0, 3);
  const rowH = 58;
  const fh = 12 + 30 + people.length * rowH + 38;
  parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${fh}" rx="16" fill="${c.card}" stroke="${c.hairline}"/>`);
  parts.push(`<text font-family="${font}" font-size="20" font-weight="800" fill="${c.text}" x="${x + 16}" y="${y + 38}">Who to follow</text>`);
  people.forEach((p, i) => {
    const cy = y + 52 + i * rowH + 22;
    parts.push(avatar(p.name, x + 36, cy, 20, `xwf${i}`));
    const nm = truncate(p.name, 15, 130);
    parts.push(`<text font-family="${font}" font-size="15" font-weight="700" fill="${c.text}" x="${x + 68}" y="${cy - 3}">${esc(nm)}</text>`);
    if (p.badge) parts.push(xBadge(x + 68 + textWidth(nm, 15) * 1.03 + 10, cy - 8, 17, c.accent));
    parts.push(`<text font-family="${font}" font-size="15" fill="${c.subtle}" x="${x + 68}" y="${cy + 16}">${esc(truncate("@" + p.handle, 15, 130))}</text>`);
    parts.push(
      `<rect x="${x + w - 92}" y="${cy - 16}" width="76" height="32" rx="16" fill="${c.btn}"/>`,
      `<text font-family="${font}" font-size="14" font-weight="700" fill="${c.btnText}" text-anchor="middle" x="${x + w - 54}" y="${cy + 5}">Follow</text>`
    );
  });
  parts.push(`<text font-family="${font}" font-size="15" fill="${c.accent}" x="${x + 16}" y="${y + fh - 13}">Show more</text>`);
  y += fh + 14;

  // footer links, flowed with a fixed gap between items
  const links = ["Terms of Service", "Privacy Policy", "Cookie Policy", "Accessibility", "Ads info", "More ···", "© 2026 X Corp."];
  let fx = x + 16;
  let fy = y + 12;
  for (const l of links) {
    const lw = textWidth(l, 13) * 0.95;
    if (fx + lw > x + w) {
      fx = x + 16;
      fy += 18;
    }
    parts.push(`<text font-family="${font}" font-size="13" fill="${c.subtle}" x="${fx}" y="${fy}">${esc(l)}</text>`);
    fx += lw + 12;
  }
  return parts.join("\n");
}

export function renderXPostWeb(doc: XPostDoc, avatarUrl?: string, lookupUrl?: (id: string) => string | undefined): string {
  const font = fontFor("xpost", doc.chrome.platform ?? "ios");
  const c = xColors(doc.theme);
  const detail = xDetail({ x: COL_X, y: 53, w: COL_W, pad: 16, doc, c, font, avatarUrl, lookupUrl, web: true, limitY: WEB_H });
  return [
    `<rect width="${WEB_W}" height="${WEB_H}" fill="${c.bg}"/>`,
    leftNav(doc, c, font, avatarUrl),
    `<defs><clipPath id="xwcol"><rect x="${COL_X}" y="0" width="${COL_W}" height="${WEB_H}"/></clipPath></defs>`,
    `<g clip-path="url(#xwcol)">${detail.svg}</g>`,
    // sticky header
    `<rect x="${COL_X}" y="0" width="${COL_W}" height="53" fill="${c.bg}"/>`,
    xIcon(XI.back, COL_X + 36, 27, 20, c.text),
    `<text font-family="${font}" font-size="20" font-weight="700" fill="${c.text}" x="${COL_X + 72}" y="34">Post</text>`,
    `<rect x="${COL_X}" y="52.5" width="${COL_W}" height="1" fill="${c.hairline}"/>`,
    // column borders
    `<rect x="${COL_X - 0.5}" y="0" width="1" height="${WEB_H}" fill="${c.hairline}"/>`,
    `<rect x="${COL_X + COL_W - 0.5}" y="0" width="1" height="${WEB_H}" fill="${c.hairline}"/>`,
    rail(doc, c, font),
  ].join("\n");
}
