"use client";

import { avatar, compact, esc, homeIndicator, SH, statusBar, SW, textWidth, wrapText } from "./common";
import { fontFor } from "./fonts";
import { renderFramed, type FramedResult } from "./frames";
import type { BlueskyDoc } from "./types";

/**
 * Bluesky post (PostSpark /bluesky-post). The post BODY is shared between the
 * full-phone screen (renderBluesky) and the standalone Template CARD
 * (renderBlueskyCard, wrapped in a window frame). Light + dark.
 */

type BC = { text: string; subtle: string; hairline: string; card: string; cardBorder: string; brand: string };

function colors(dark: boolean): BC {
  return dark
    ? { text: "#f1f3f5", subtle: "#8d98a4", hairline: "#1e2936", card: "#161e27", cardBorder: "#2a3541", brand: "#1083fe" }
    : { text: "#0b0f14", subtle: "#5e6b78", hairline: "#e1e8ed", card: "#f7f9fb", cardBorder: "#dbe3ea", brand: "#1083fe" };
}

/** Bluesky butterfly mark centered on (cx,cy), roughly `size` tall. */
export function butterfly(cx: number, cy: number, size: number, color: string): string {
  const s = size / 24;
  const d =
    "M12 10.8 C9 6.4 4.6 4.8 3 7.2 C1.9 9 3.9 11.6 7.4 13 C3.9 14.4 1.9 17 3 18.8 C4.6 21.2 9 19.6 12 15.2 C15 19.6 19.4 21.2 21 18.8 C22.1 17 20.1 14.4 16.6 13 C20.1 11.6 22.1 9 21 7.2 C19.4 4.8 15 6.4 12 10.8 Z";
  return `<path d="${d}" fill="${color}" transform="translate(${(cx - size / 2).toFixed(1)} ${(cy - size / 2).toFixed(1)}) scale(${s.toFixed(3)})"/>`;
}

/** Draw the post body into (x, y, w). Returns the SVG + consumed height. */
function blueskyBody(
  x: number,
  y: number,
  w: number,
  doc: BlueskyDoc,
  c: BC,
  font: string,
  avatarUrl?: string,
  lookupUrl?: (id: string) => string | undefined
): { svg: string; height: number } {
  const P = 16;
  const bx = x + P;
  const bw = w - 2 * P;
  const parts: string[] = [];
  let yy = y + P;

  // author row
  parts.push(avatar(doc.name, bx + 21, yy + 14, 21, "bs", avatarUrl));
  parts.push(
    `<text font-family="${font}" font-size="16.5" font-weight="700" fill="${c.text}" x="${bx + 54}" y="${yy + 11}">${esc(doc.name)}</text>`,
    `<text font-family="${font}" font-size="14.5" fill="${c.subtle}" x="${bx + 54}" y="${yy + 31}">@${esc(doc.handle)}</text>`,
    butterfly(bx + bw - 13, yy + 12, 26, c.brand)
  );
  yy += 52;

  // post text
  const size = 18;
  const lh = 24;
  const lines = wrapText(doc.text || " ", size, bw);
  lines.forEach((l, i) => parts.push(`<text font-family="${font}" font-size="${size}" fill="${c.text}" x="${bx}" y="${yy + i * lh}">${esc(l)}</text>`));
  yy += lines.length * lh + 6;

  // embedded link card
  if (doc.link) {
    const imgH = Math.round(bw * 0.52);
    const imgUrl = doc.link.image ? lookupUrl?.(doc.link.image) : undefined;
    parts.push(`<rect x="${bx}" y="${yy}" width="${bw}" height="${imgH + 74}" rx="12" fill="none" stroke="${c.cardBorder}" stroke-width="1"/>`);
    parts.push(`<defs><clipPath id="bsimg"><path d="M${bx} ${yy + 12} a12 12 0 0 1 12 -12 h${bw - 24} a12 12 0 0 1 12 12 v${imgH - 12} h-${bw} Z"/></clipPath></defs>`);
    if (imgUrl) {
      parts.push(`<image href="${imgUrl}" x="${bx}" y="${yy}" width="${bw}" height="${imgH}" preserveAspectRatio="xMidYMid slice" clip-path="url(#bsimg)"/>`);
    } else {
      parts.push(
        `<defs><linearGradient id="bsgrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0a7aff"/><stop offset="1" stop-color="#5cc3ff"/></linearGradient></defs>`,
        `<rect x="${bx}" y="${yy}" width="${bw}" height="${imgH}" clip-path="url(#bsimg)" fill="url(#bsgrad)"/>`,
        butterfly(bx + bw / 2 - 44, yy + imgH / 2, 46, "#ffffff"),
        `<text font-family="${font}" font-size="30" font-weight="800" fill="#ffffff" x="${bx + bw / 2 - 10}" y="${yy + imgH / 2 + 11}">Bluesky</text>`
      );
    }
    const fy = yy + imgH;
    parts.push(`<rect x="${bx}" y="${fy}" width="${bw}" height="74" fill="${c.card}"/>`);
    parts.push(`<rect x="${bx}" y="${fy - 0.5}" width="${bw}" height="0.5" fill="${c.cardBorder}"/>`);
    parts.push(`<text font-family="${font}" font-size="13.5" font-weight="700" fill="${c.text}" x="${bx + 12}" y="${fy + 22}">${esc(wrapText(doc.link.title, 13.5, bw - 24)[0] ?? "")}</text>`);
    parts.push(`<text font-family="${font}" font-size="12" fill="${c.subtle}" x="${bx + 12}" y="${fy + 40}">${esc(wrapText(doc.link.desc, 12, bw - 24)[0] ?? "")}</text>`);
    parts.push(
      `<circle cx="${bx + 16}" cy="${fy + 57}" r="5.5" fill="none" stroke="${c.subtle}" stroke-width="1"/>`,
      `<path d="M${bx + 10.5} ${fy + 57} h11 M${bx + 16} ${fy + 51.5} v11 M${bx + 12} ${fy + 53.5} a7 7 0 0 0 8 0 M${bx + 12} ${fy + 60.5} a7 7 0 0 1 8 0" fill="none" stroke="${c.subtle}" stroke-width="0.8"/>`,
      `<text font-family="${font}" font-size="12" fill="${c.subtle}" x="${bx + 28}" y="${fy + 61}">${esc(doc.link.domain)}</text>`
    );
    yy = fy + 74 + 16;
  }

  // timestamp
  parts.push(`<text font-family="${font}" font-size="13.5" fill="${c.subtle}" x="${bx}" y="${yy}">${esc(doc.time)}</text>`);
  yy += 14;
  parts.push(`<rect x="${bx}" y="${yy}" width="${bw}" height="0.5" fill="${c.hairline}"/>`);
  yy += 30;

  // compact engagement row: icon + count for reply / repost / like (PostSpark card)
  const ry = yy;
  let ex = bx + 8;
  const stat = (glyph: string, count: string) => {
    parts.push(glyph);
    parts.push(`<text font-family="${font}" font-size="13.5" fill="${c.subtle}" x="${ex + 16}" y="${ry + 5}">${count}</text>`);
    ex += 16 + textWidth(count, 13.5) + 34;
  };
  stat(`<path d="M${ex - 7} ${ry - 5} h11 a4.5 4.5 0 0 1 4.5 4.5 v5 a4.5 4.5 0 0 1 -4.5 4.5 h-6 l-7 5 v-5 a4.5 4.5 0 0 1 -2.5 -4.5 v-5 a4.5 4.5 0 0 1 4.5 -4.5 Z" fill="none" stroke="${c.subtle}" stroke-width="1.6" stroke-linejoin="round"/>`, compact(doc.replies));
  stat(`<path d="M${ex - 7} ${ry + 3} v-7 a3.5 3.5 0 0 1 3.5 -3.5 h9 m-3 -3.5 l3.5 3.5 -3.5 3.5 M${ex + 8} ${ry - 3} v7 a3.5 3.5 0 0 1 -3.5 3.5 h-9 m3 3.5 l-3.5 -3.5 3.5 -3.5" fill="none" stroke="${c.subtle}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`, compact(doc.reposts));
  stat(`<path d="M${ex} ${ry + 7} c -6.5 -4 -11 -8 -11 -13 a 5.5 5.5 0 0 1 11 -1.6 a 5.5 5.5 0 0 1 11 1.6 c 0 5 -4.5 9 -11 13 Z" fill="none" stroke="${c.subtle}" stroke-width="1.6" stroke-linejoin="round"/>`, compact(doc.likes));
  // share on the far right
  parts.push(`<path d="M${x + w - P - 8} ${ry + 4} v-13 m-4.5 -1 l4.5 -4.5 4.5 4.5 m-12 7 v9 h15 v-9" fill="none" stroke="${c.subtle}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`);

  return { svg: parts.join("\n"), height: ry + 12 - y + P };
}

/** Standalone Template card (window-framed, PostSpark look). */
export function renderBlueskyCard(doc: BlueskyDoc, avatarUrl?: string, lookupUrl?: (id: string) => string | undefined): FramedResult {
  const dark = doc.chrome.dark ?? true;
  const font = fontFor("bluesky", doc.chrome.platform ?? "ios");
  const c = colors(dark);
  const theme = {
    cardBg: dark ? "#000000" : "#ffffff",
    barBg: dark ? "#15181d" : "#f4f6f8",
    barText: c.subtle,
    dark,
    title: `@${doc.handle}`,
  };
  return renderFramed(doc.frame ?? "none", theme, (x, y, w) => blueskyBody(x, y, w, doc, c, font, avatarUrl, lookupUrl));
}

/** Full-phone screen (mobile picker). */
export function renderBluesky(doc: BlueskyDoc, avatarUrl?: string, lookupUrl?: (id: string) => string | undefined): string {
  const platform = doc.chrome.platform ?? "ios";
  const font = fontFor("bluesky", platform);
  const dark = !!doc.chrome.dark;
  const c = colors(dark);
  const bg = dark ? "#000000" : "#ffffff";

  const parts: string[] = [`<rect width="${SW}" height="${SH}" fill="${bg}"/>`];
  parts.push(statusBar({ time: doc.chrome.time, battery: doc.chrome.battery, color: c.text, platform }));
  parts.push(
    `<path d="M30 70 l-11 11 11 11 M19 81 h24" fill="none" stroke="${c.text}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<text font-family="${font}" font-size="19" font-weight="700" fill="${c.text}" x="62" y="88">Post</text>`,
    `<rect y="107" width="${SW}" height="0.5" fill="${c.hairline}"/>`
  );
  const body = blueskyBody(0, 116, SW, doc, c, font, avatarUrl, lookupUrl);
  parts.push(body.svg);
  parts.push(homeIndicator(c.text, platform));
  return parts.join("\n");
}
