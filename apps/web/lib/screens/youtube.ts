"use client";

import {
  avatar,
  compact,
  esc,
  homeIndicator,
  imageBubble,
  SH,
  statusBar,
  SW,
  textBlock as baseTextBlock,
  textWidth,
  truncate,
  wrapText,
} from "./common";
import { fontFor } from "./fonts";
import type { YouTubeDoc } from "./types";

/**
 * YouTube (mobile) watch page + comments: 16:9 player with red scrubber, title
 * block with metadata, channel row (avatar · name · gray verified · subs) and a
 * BLACK/WHITE Subscribe pill, a segmented Like|Dislike chip plus Share/Save/
 * Download chips, then the comment thread (@handles, pinned, creator hearts,
 * "View N replies"). §15.
 */

const VIDEO_Y = 54;
const VIDEO_H = 226;
const MARGIN = 12;
const CHIP_Y = 418;
const CHIP_H = 36;

// Material thumb glyphs (outline via evenodd), 24×24, centered on 12,12.
const THUMB_UP =
  "M9 21h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.58 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2zM9 9l4.34-4.34L12 10h9v2l-3 7H9V9zM1 9h4v12H1V9z";
const THUMB_DOWN =
  "M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm0 12l-4.34 4.34L12 14H3v-2l3-7h9v10zm4-12h4v12h-4V3z";

export function renderYouTube(
  doc: YouTubeDoc,
  avatarUrl?: string,
  lookupUrl?: (id: string) => string | undefined
): string {
  const platform = doc.chrome.platform ?? "ios";
  const font = fontFor("youtube", platform);
  const textBlock = (lines: string[], o: Parameters<typeof baseTextBlock>[1]) =>
    baseTextBlock(lines, { font, ...o });
  const dark = !!doc.chrome.dark;
  const c = dark
    ? {
        bg: "#0F0F0F",
        text: "#F1F1F1",
        sub: "#AAAAAA",
        chip: "#272727",
        divider: "#303030",
        subBg: "#F1F1F1",
        subText: "#0F0F0F",
        progress: "#FF0000",
        link: "#3EA6FF",
        check: "#AAAAAA",
        frame: "#000000",
      }
    : {
        bg: "#FFFFFF",
        text: "#0F0F0F",
        sub: "#606060",
        chip: "#F2F2F2",
        divider: "#E5E5E5",
        subBg: "#0F0F0F",
        subText: "#FFFFFF",
        progress: "#FF0000",
        link: "#065FD4",
        check: "#606060",
        frame: "#000000",
      };

  const parts: string[] = [`<rect width="${SW}" height="${SH}" fill="${c.bg}"/>`];
  parts.push(statusBar({ time: doc.chrome.time, battery: doc.chrome.battery, color: c.text, platform }));

  /* ------------------------------ video player ------------------------------ */
  parts.push(`<rect x="0" y="${VIDEO_Y}" width="${SW}" height="${VIDEO_H}" fill="${c.frame}"/>`);
  const thumbUrl = doc.thumbnail ? lookupUrl?.(doc.thumbnail) : undefined;
  if (thumbUrl) {
    parts.push(imageBubble(thumbUrl, 0, VIDEO_Y, SW, VIDEO_H, "ytvid", { rx: 0 }));
  } else {
    const vcx = SW / 2;
    const vcy = VIDEO_Y + VIDEO_H / 2;
    parts.push(
      `<circle cx="${vcx}" cy="${vcy}" r="26" fill="rgba(255,255,255,0.14)"/>`,
      `<path d="M${vcx - 8} ${vcy - 12} l19 12 -19 12 Z" fill="rgba(255,255,255,0.72)"/>`
    );
  }
  // red scrubber along the very bottom edge of the video
  const prog = Math.min(1, Math.max(0, doc.progress || 0));
  const progW = prog * SW;
  const knobX = Math.min(SW - 5, Math.max(5, progW));
  parts.push(
    `<rect x="0" y="277" width="${SW}" height="3" fill="rgba(255,255,255,0.35)"/>`,
    `<rect x="0" y="277" width="${progW.toFixed(1)}" height="3" fill="${c.progress}"/>`,
    `<circle cx="${knobX.toFixed(1)}" cy="278.5" r="5" fill="${c.progress}"/>`
  );

  /* ------------------------------- title block ------------------------------ */
  const titleLines = wrapText(doc.title, 16, SW - MARGIN - 34).slice(0, 2);
  parts.push(
    textBlock(titleLines, { x: MARGIN, y: 300, size: 16, lineHeight: 21, color: c.text, weight: 500 }),
    // expand-description chevron on the first title line
    `<path d="M370 294 l6 5.5 6 -5.5" fill="none" stroke="${c.text}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`
  );
  const metaY = 300 + titleLines.length * 21 + 4;
  parts.push(
    `<text font-family="${font}" font-size="13" fill="${c.sub}" x="${MARGIN}" y="${metaY}">${esc(doc.views)} views · ${esc(doc.age)}   <tspan fill="${c.text}" font-weight="500">...more</tspan></text>`
  );

  /* ------------------------------- channel row ------------------------------ */
  // reserve room for the Subscribe pill on the right so a long name can't slide under it
  const subLabel0 = doc.subscribed ? "Subscribed" : "Subscribe";
  const subW0 = textWidth(subLabel0, 14) + 34;
  const subX0 = 390 - subW0;
  const chName = truncate(doc.channel, 15, subX0 - 60 - 66); // leave space for verified + subs
  parts.push(avatar(doc.channel, 32, 380, 18, "ytch", avatarUrl));
  const nameW = textWidth(chName, 15);
  parts.push(
    `<text font-family="${font}" font-size="15" font-weight="600" fill="${c.text}" x="60" y="385">${esc(chName)}</text>`
  );
  let infoX = 60 + nameW + 8;
  if (doc.verified) {
    const vx = infoX + 6;
    parts.push(
      `<circle cx="${vx}" cy="380" r="6" fill="${c.check}"/>`,
      `<path d="M${vx - 2.7} 380 l1.8 1.9 3.4 -3.9" fill="none" stroke="${c.bg}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>`
    );
    infoX += 18;
  }
  parts.push(
    `<text font-family="${font}" font-size="12.5" fill="${c.sub}" x="${infoX}" y="385">${esc(truncate(doc.subscribers, 12.5, subX0 - infoX - 8))}</text>`
  );
  // Subscribe / Subscribed pill (BLACK-on-white light, WHITE-on-black dark — never red)
  parts.push(
    `<rect x="${subX0.toFixed(1)}" y="363" width="${subW0.toFixed(1)}" height="34" rx="17" fill="${doc.subscribed ? c.chip : c.subBg}"/>`,
    `<text font-family="${font}" font-size="14" font-weight="600" fill="${doc.subscribed ? c.text : c.subText}" text-anchor="middle" x="${(subX0 + subW0 / 2).toFixed(1)}" y="385">${subLabel0}</text>`
  );

  /* ----------------------------- action chip bar ---------------------------- */
  const chipCy = CHIP_Y + CHIP_H / 2; // 436
  let cx = MARGIN;
  // segmented Like | Dislike (like has a count, dislike has none)
  const likeStr = doc.likes;
  const likeW = textWidth(likeStr, 13.5);
  const upCx = cx + 14 + 9;
  const likeTextX = upCx + 9 + 8;
  const dividerX = likeTextX + likeW + 12;
  const downCx = dividerX + 12 + 9;
  const segW = downCx + 9 + 14 - cx;
  parts.push(
    `<rect x="${cx}" y="${CHIP_Y}" width="${segW.toFixed(1)}" height="${CHIP_H}" rx="${CHIP_H / 2}" fill="${c.chip}"/>`,
    thumbGlyph(THUMB_UP, upCx, chipCy, 18, c.text),
    `<text font-family="${font}" font-size="13.5" font-weight="500" fill="${c.text}" x="${likeTextX}" y="${chipCy + 4.8}">${esc(likeStr)}</text>`,
    `<rect x="${dividerX}" y="${CHIP_Y + 8}" width="1.2" height="${CHIP_H - 16}" rx="0.6" fill="${c.divider}"/>`,
    thumbGlyph(THUMB_DOWN, downCx, chipCy + 2, 18, c.text)
  );
  cx += segW + 8;
  const chips: Array<{ label: string; icon: (x: number, y: number, color: string) => string }> = [
    { label: "Share", icon: shareIcon },
    { label: "Save", icon: saveIcon },
    { label: "Download", icon: downloadIcon },
  ];
  for (const ch of chips) {
    const lw = textWidth(ch.label, 13.5);
    const w = 14 + 18 + 6 + lw + 14;
    const iconCx = cx + 14 + 9;
    parts.push(
      `<rect x="${cx}" y="${CHIP_Y}" width="${w.toFixed(1)}" height="${CHIP_H}" rx="${CHIP_H / 2}" fill="${c.chip}"/>`,
      ch.icon(iconCx, chipCy, c.text),
      `<text font-family="${font}" font-size="13.5" font-weight="500" fill="${c.text}" x="${iconCx + 9 + 6}" y="${chipCy + 4.8}">${ch.label}</text>`
    );
    cx += w + 8;
  }

  /* -------------------------- divider + comments head ----------------------- */
  parts.push(`<rect x="0" y="468" width="${SW}" height="1" fill="${c.divider}"/>`);
  parts.push(
    `<text font-family="${font}" font-size="16" font-weight="700" fill="${c.text}" x="16" y="491">Comments</text>`,
    `<text font-family="${font}" font-size="14" fill="${c.sub}" x="${(16 + textWidth("Comments", 16) + 10).toFixed(1)}" y="491">${esc(doc.commentCount)}</text>`
  );

  /* ------------------------------ comment list ------------------------------ */
  const BODY_MAX = SW - 52 - 14;
  let y = 512;
  for (let i = 0; i < doc.comments.length; i++) {
    const cm = doc.comments[i];
    const bodyLines = wrapText(cm.text, 14, BODY_MAX).slice(0, 4);
    // precise overflow guard: don't draw a comment that would cross the home indicator
    const estBottom = y + (cm.pinned ? 18 : 0) + 26 + (bodyLines.length - 1) * 19 + 22 + (cm.replyCount ? 24 : 0) + 4;
    if (estBottom > 856) break;
    if (cm.pinned) {
      parts.push(
        `<text font-family="${font}" font-size="11" fill="${c.sub}" x="52" y="${y + 4}">📌 Pinned by ${esc(doc.channel)}</text>`
      );
      y += 18;
    }
    parts.push(avatar(cm.handle, 28, y + 14, 16, `ytc${i}`, cm.avatar ? lookupUrl?.(cm.avatar) : undefined));
    if (cm.hearted) {
      const hx = 39;
      const hy = y + 25;
      parts.push(`<circle cx="${hx}" cy="${hy}" r="8" fill="${c.bg}"/>`, heartPath(hx, hy, 10, "#FF0000"));
    }
    // header: @handle (+ gray verified check) · time
    parts.push(
      `<text font-family="${font}" font-size="12.5" font-weight="500" fill="${c.sub}" x="52" y="${y + 8}">${esc(cm.handle)}</text>`
    );
    let metaX = 52 + textWidth(cm.handle, 12.5) + 6;
    if (cm.verified) {
      const vcx = metaX + 5;
      parts.push(
        `<circle cx="${vcx.toFixed(1)}" cy="${y + 4}" r="5" fill="${c.check}"/>`,
        `<path d="M${(vcx - 2.3).toFixed(1)} ${y + 4} l1.5 1.6 2.9 -3.3" fill="none" stroke="${c.bg}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>`
      );
      metaX += 15;
    }
    parts.push(
      `<text font-family="${font}" font-size="12.5" fill="${c.sub}" x="${metaX.toFixed(1)}" y="${y + 8}">· ${esc(cm.time)}</text>`
    );
    // body
    parts.push(textBlock(bodyLines, { x: 52, y: y + 26, size: 14, lineHeight: 19, color: c.text }));
    const bodyBottom = y + 26 + (bodyLines.length - 1) * 19;
    // action row
    const acY = bodyBottom + 22;
    const likesTxt = compact(cm.likes);
    const clw = textWidth(likesTxt, 12);
    const downX = 52 + 20 + clw + 20;
    parts.push(
      thumbGlyph(THUMB_UP, 59, acY - 4, 15, c.sub),
      `<text font-family="${font}" font-size="12" fill="${c.sub}" x="72" y="${acY}">${esc(likesTxt)}</text>`,
      thumbGlyph(THUMB_DOWN, downX, acY - 2, 15, c.sub),
      `<text font-family="${font}" font-size="12.5" font-weight="500" fill="${c.sub}" x="${downX + 14}" y="${acY}">Reply</text>`
    );
    let nextY = acY + 26;
    if (cm.replyCount) {
      const rY = acY + 24;
      parts.push(
        `<path d="M55 ${rY - 6} l4 4 4 -4" fill="none" stroke="${c.link}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
        `<text font-family="${font}" font-size="12.5" font-weight="600" fill="${c.link}" x="68" y="${rY}">View ${cm.replyCount} replies</text>`
      );
      nextY = rY + 24;
    }
    y = nextY;
  }

  parts.push(homeIndicator(c.text, platform));
  return parts.join("\n");
}

/* --------------------------------- glyphs ---------------------------------- */

function thumbGlyph(path: string, cx: number, cy: number, size: number, color: string): string {
  const s = size / 24;
  return `<path d="${path}" fill="${color}" fill-rule="evenodd" transform="translate(${(cx - 12 * s).toFixed(1)} ${(cy - 12 * s).toFixed(1)}) scale(${s.toFixed(3)})"/>`;
}

function shareIcon(cx: number, cy: number, color: string): string {
  const x = cx - 3;
  const y = cy;
  return `<path d="M${x} ${y} l6 -6 -6 -6 M${x + 6} ${y - 6} h-6 a5 5 0 0 0 -5 5 v3" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function saveIcon(cx: number, cy: number, color: string): string {
  const x = cx - 6;
  const y = cy - 8;
  return `<path d="M${x} ${y} h12 v16 l-6 -4.5 -6 4.5 Z" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round"/>`;
}

function downloadIcon(cx: number, cy: number, color: string): string {
  return `<path d="M${cx} ${cy - 8} v9 M${cx - 4.5} ${cy - 2} l4.5 4.5 4.5 -4.5 M${cx - 7} ${cy + 7} h14" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function heartPath(cx: number, cy: number, size: number, color: string): string {
  const s = size * 0.5;
  return `<path d="M${cx} ${cy + s * 0.9} C ${cx - s * 2} ${cy - s * 0.6} ${cx - s} ${cy - s * 1.7} ${cx} ${cy - s * 0.5} C ${cx + s} ${cy - s * 1.7} ${cx + s * 2} ${cy - s * 0.6} ${cx} ${cy + s * 0.9} Z" fill="${color}"/>`;
}
