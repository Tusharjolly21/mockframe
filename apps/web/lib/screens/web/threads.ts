"use client";

import { avatar, esc } from "../common";
import { fontFor } from "../fonts";
import type { SocialPostDoc } from "../types";
import { WEB_H, WEB_W } from "../webPage";
import { thColors, thComposeBtn, thHomeFill, thIcon, thLogo, thMainPost, thReplies, type TC } from "./th-shared";

/**
 * threads.net desktop thread page (1440×900): slim icon rail, centred 640px
 * feed column with the "Thread" header, the post, reply box and replies, and
 * the floating "+" button.
 */

const COL_W = 640;
const COL_X = Math.round((WEB_W - COL_W) / 2);
const COL_TOP = 64;

function iconRail(c: TC): string {
  const x = 38;
  const parts: string[] = [thLogo(x, 40, 34, c.text)];
  const cy = [338, 402, 466, 530, 594];
  parts.push(
    thHomeFill(x, cy[0], 27, c.text),
    thIcon("search", x, cy[1], 26, c.subtle, 2.2),
    thComposeBtn(x, cy[2], 52, 42, c, c.subtle),
    thIcon("heart", x, cy[3], 26, c.subtle, 2.1),
    thIcon("person", x, cy[4], 26, c.subtle, 2.1)
  );
  // bottom: pin + menu
  parts.push(
    `<path d="M${x - 8} ${WEB_H - 98} h16 m-3 0 v7 l4 4 h-16 l4 -4 v-7 m4 11 v7" fill="none" stroke="${c.subtle}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<path d="M${x - 10} ${WEB_H - 49} h20 M${x - 10} ${WEB_H - 41} h12" fill="none" stroke="${c.subtle}" stroke-width="2.2" stroke-linecap="round"/>`
  );
  return parts.join("\n");
}

export function renderThreadsWeb(doc: SocialPostDoc, avatarUrl?: string, lookupUrl?: (id: string) => string | undefined): string {
  const font = fontFor("social", doc.chrome.platform ?? "ios");
  const c = thColors(!!doc.chrome.dark);
  const box = { x: COL_X, y: COL_TOP, w: COL_W, pad: 24, c, font, lookupUrl };
  const hair = (y: number) => `<rect x="${COL_X}" y="${(y - 0.5).toFixed(1)}" width="${COL_W}" height="1" fill="${c.hair}"/>`;

  const post = thMainPost(box, doc, avatarUrl);
  let y = post.bottom + 1;
  const parts: string[] = [post.svg, hair(y)];

  // inline reply box
  const handle = (doc.subtitle || doc.name).replace(/^@/, "");
  const cy = y + 33;
  parts.push(
    avatar(doc.name, COL_X + 24 + 18, cy, 18, "thwc", avatarUrl),
    `<text font-family="${font}" font-size="15" fill="${c.subtle}" x="${COL_X + 72}" y="${cy + 5.5}">Reply to ${esc(handle)}…</text>`,
    `<rect x="${COL_X + COL_W - 24 - 64}" y="${cy - 17}" width="64" height="34" rx="17" fill="none" stroke="${c.hair}" stroke-width="1.2"/>`,
    `<text font-family="${font}" font-size="15" font-weight="600" fill="${c.subtle}" text-anchor="middle" x="${COL_X + COL_W - 24 - 32}" y="${cy + 5.5}">Post</text>`
  );
  y += 66;
  parts.push(hair(y));

  const replies = thReplies({ ...box, y: y + 1 }, doc.commentList ?? [], WEB_H);
  parts.push(replies.svg);

  // header pill: "Thread ⌄"
  const header =
    `<rect x="${WEB_W / 2 - 62}" y="14" width="124" height="38" rx="19" fill="${c.bg}" stroke="${c.hair}"/>` +
    `<text font-family="${font}" font-size="15" font-weight="600" fill="${c.text}" text-anchor="middle" x="${WEB_W / 2 - 6}" y="38.5">Thread</text>` +
    `<path d="M${WEB_W / 2 + 28} 31 l5 5 5 -5" fill="none" stroke="${c.subtle}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;

  // floating "+" (new thread)
  const fab = `<rect x="${WEB_W - 96}" y="${WEB_H - 100}" width="64" height="64" rx="20" fill="${c.bg}" stroke="${c.hair}" style="filter:drop-shadow(0 6px 16px rgba(0,0,0,${c.dark ? 0.55 : 0.16}))"/>${thIcon("plus", WEB_W - 64, WEB_H - 68, 28, c.text, 2.2)}`;

  return [
    `<rect width="${WEB_W}" height="${WEB_H}" fill="${c.page}"/>`,
    iconRail(c),
    // the feed column (rounded top, bleeds off the bottom)
    `<rect x="${COL_X + 0.5}" y="${COL_TOP}" width="${COL_W - 1}" height="${WEB_H}" rx="22" fill="${c.bg}" stroke="${c.hair}"/>`,
    `<defs><clipPath id="thwcol"><rect x="${COL_X}" y="${COL_TOP}" width="${COL_W}" height="${WEB_H - COL_TOP}"/></clipPath></defs>`,
    `<g clip-path="url(#thwcol)">${parts.join("\n")}</g>`,
    header,
    fab,
  ].join("\n");
}
