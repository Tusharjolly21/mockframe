"use client";

import { avatar, esc, homeIndicator, SH, statusBar, SW } from "../common";
import { fontFor } from "../fonts";
import type { SocialPostDoc } from "../types";
import { thColors, thComposeBtn, thHomeFill, thIcon, thLogo, thMainPost, thReplies } from "./th-shared";

/** Threads iOS/Android post screen (402×874): logo bar, thread, reply bar, tab bar. */
export function renderThreadsPhone(doc: SocialPostDoc, avatarUrl?: string, lookupUrl?: (id: string) => string | undefined): string {
  const platform = doc.chrome.platform ?? "ios";
  const font = fontFor("social", platform);
  const c = thColors(!!doc.chrome.dark);

  const HEAD_B = 98; // bottom of the logo bar
  const TAB_H = 49 + 34; // tab bar + home-indicator zone
  const TAB_Y = SH - TAB_H;
  const COMP_H = 54;
  const COMP_Y = TAB_Y - COMP_H;

  const box = { x: 0, y: HEAD_B, w: SW, pad: 16, c, font, lookupUrl };
  const post = thMainPost(box, doc, avatarUrl);
  const hair = (y: number) => `<rect y="${(y - 0.5).toFixed(1)}" width="${SW}" height="1" fill="${c.hair}"/>`;
  const replies = thReplies({ ...box, y: post.bottom + 1 }, doc.commentList ?? [], COMP_Y);

  const handle = (doc.subtitle || doc.name).replace(/^@/, "");
  const tabs = [
    thHomeFill(SW * 0.1, TAB_Y + 25, 27, c.text),
    thIcon("search", SW * 0.3, TAB_Y + 25, 26, c.subtle, 2.2),
    thComposeBtn(SW * 0.5, TAB_Y + 25, 48, 32, c, c.subtle),
    thIcon("heart", SW * 0.7, TAB_Y + 25, 26, c.subtle, 2.1),
    thIcon("person", SW * 0.9, TAB_Y + 25, 26, c.subtle, 2.1),
  ];

  return [
    `<rect width="${SW}" height="${SH}" fill="${c.bg}"/>`,
    `<defs><clipPath id="thbody"><rect y="${HEAD_B}" width="${SW}" height="${COMP_Y - HEAD_B}"/></clipPath></defs>`,
    `<g clip-path="url(#thbody)">${post.svg}${hair(post.bottom + 1)}${replies.svg}</g>`,
    // top bar
    `<rect width="${SW}" height="${HEAD_B}" fill="${c.bg}"/>`,
    statusBar({ time: doc.chrome.time, battery: doc.chrome.battery, color: c.text, platform }),
    thLogo(SW / 2, 76, 28, c.text),
    // reply bar
    `<rect y="${COMP_Y}" width="${SW}" height="${COMP_H + TAB_H}" fill="${c.bg}"/>`,
    hair(COMP_Y),
    avatar(doc.name, 34, COMP_Y + COMP_H / 2, 14, "thcomp", avatarUrl),
    `<text font-family="${font}" font-size="15" fill="${c.subtle}" x="60" y="${COMP_Y + COMP_H / 2 + 5.5}">Reply to ${esc(handle)}…</text>`,
    // tab bar
    hair(TAB_Y),
    ...tabs,
    homeIndicator(c.text, platform),
  ].join("\n");
}
