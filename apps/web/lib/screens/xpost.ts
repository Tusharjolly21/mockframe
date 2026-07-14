"use client";

import { avatar, compact, esc, homeIndicator, SH, statusBar, SW, textWidth, wrapText } from "./common";
import { fontFor } from "./fonts";
import { renderFramed, type FramedResult } from "./frames";
import type { XPostDoc } from "./types";

/**
 * X (Twitter) post. The post BODY is shared between the full-phone detail view
 * (renderXPost) and the standalone Template CARD (renderXPostCard, wrapped in a
 * window frame). Themes: light / dim / dark.
 */

type XC = { text: string; subtle: string; hairline: string; accent: string; gold: string };

function colors(theme: XPostDoc["theme"]): { bg: string } & XC {
  return {
    bg: theme === "light" ? "#ffffff" : theme === "dim" ? "#15202b" : "#000000",
    text: theme === "light" ? "#0f1419" : theme === "dim" ? "#f7f9f9" : "#e7e9ea",
    subtle: theme === "light" ? "#536471" : theme === "dim" ? "#8b98a5" : "#71767b",
    hairline: theme === "light" ? "#eff3f4" : theme === "dim" ? "#38444d" : "#2f3336",
    accent: "#1d9bf0",
    gold: "#e2b719",
  };
}

/** Draw the tweet body into (x, y, w). Returns SVG + consumed height. */
function xpostBody(
  x: number,
  y: number,
  w: number,
  doc: XPostDoc,
  c: XC,
  font: string,
  avatarUrl?: string,
  lookupUrl?: (id: string) => string | undefined,
  includeReplies = false
): { svg: string; height: number } {
  const P = Math.max(8, Math.min(40, doc.postPadding ?? 16));
  const bx = x + P;
  const bw = w - 2 * P;
  const parts: string[] = [];
  let yy = y + P + 12;

  // author row
  parts.push(avatar(doc.name, bx + 22, yy + 6, 22, "xp", avatarUrl));
  const nameW = textWidth(doc.name, 16.5);
  parts.push(`<text font-family="${font}" font-size="16.5" font-weight="700" fill="${c.text}" x="${bx + 54}" y="${yy + 2}">${esc(doc.name)}</text>`);
  if (doc.badge !== "none") parts.push(verifiedBadge(bx + 54 + nameW + 6, yy - 4, doc.badge === "gold" ? c.gold : c.accent));
  parts.push(
    `<text font-family="${font}" font-size="15" fill="${c.subtle}" x="${bx + 54}" y="${yy + 22}">@${esc(doc.handle)}</text>`,
    `<text font-family="${font}" font-size="17" font-weight="700" fill="${c.subtle}" x="${bx + bw - 8}" y="${yy + 4}">···</text>`
  );
  yy += 52;

  // text with #/@ tinting
  const TSZ = Math.max(14, Math.min(34, doc.postFontSize ?? 21));
  const TLH = Math.round(TSZ * 1.34);
  const lines = wrapText(doc.text || " ", TSZ, bw);
  const spans = lines
    .map((line, i) => {
      const row = line
        .split(/(\s+)/)
        .map((tok) => (/^[#@][\w]/.test(tok) ? `<tspan fill="${c.accent}">${esc(tok)}</tspan>` : esc(tok)))
        .join("");
      return `<tspan x="${bx}" y="${yy + i * TLH}">${row}</tspan>`;
    })
    .join("");
  parts.push(`<text font-family="${font}" font-size="${TSZ}" fill="${c.text}">${spans}</text>`);
  yy += lines.length * TLH + 2;

  // media grid
  const imgs = (doc.images ?? []).map((id) => lookupUrl?.(id)).filter(Boolean) as string[];
  if (imgs.length) yy += mediaGrid(parts, imgs.slice(0, 4), bx, yy, bw) + 12;

  // time · date · views
  parts.push(`<text font-family="${font}" font-size="15" fill="${c.subtle}" x="${bx}" y="${yy}">${esc(doc.chrome.time || "9:41")} AM · ${esc(doc.date)} · <tspan font-weight="700" fill="${c.text}">${esc(doc.views)}</tspan> Views</text>`);
  yy += 16;
  parts.push(`<rect x="${bx}" y="${yy}" width="${bw}" height="0.5" fill="${c.hairline}"/>`);
  yy += 24;

  // engagement counts
  const quotes = Math.max(1, Math.round(doc.reposts * 0.28));
  const bookmarks = Math.max(1, Math.round(doc.likes * 0.11));
  let ex = bx;
  for (const [n, label] of [
    [compact(doc.reposts), "Reposts"],
    [compact(quotes), "Quotes"],
    [compact(doc.likes), "Likes"],
    [compact(bookmarks), "Bookmarks"],
  ] as const) {
    parts.push(`<text font-family="${font}" font-size="14" x="${ex}" y="${yy}"><tspan font-weight="700" fill="${c.text}">${n}</tspan><tspan fill="${c.subtle}"> ${label}</tspan></text>`);
    ex += textWidth(`${n} ${label}`, 14) + 10;
  }
  yy += 14;
  parts.push(`<rect x="${bx}" y="${yy}" width="${bw}" height="0.5" fill="${c.hairline}"/>`);

  // action icons
  const ay = yy + 30;
  const s = [bx + 14, bx + bw * 0.3, bx + bw * 0.55, bx + bw * 0.8, bx + bw - 8];
  parts.push(
    `<path d="M${s[0] - 9} ${ay - 8} h13 a5 5 0 0 1 5 5 v7 a5 5 0 0 1 -5 5 h-7 l-8 6 v-6 a5 5 0 0 1 -3 -5 v-7 a5 5 0 0 1 5 -5 Z" fill="none" stroke="${c.subtle}" stroke-width="1.7" stroke-linejoin="round"/>`,
    numLabel(compact(doc.replies), s[0] + 14, ay + 6, c.subtle, font),
    `<path d="M${s[1] - 8} ${ay + 4} v-8 a4 4 0 0 1 4 -4 h10 m-3.5 -4 l4 4 -4 4 M${s[1] + 10} ${ay - 2} v8 a4 4 0 0 1 -4 4 h-10 m3.5 4 l-4 -4 4 -4" fill="none" stroke="${c.subtle}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`,
    numLabel(compact(doc.reposts), s[1] + 16, ay + 6, c.subtle, font),
    `<path d="M${s[2]} ${ay + 9} c -8 -5 -13 -10 -13 -15.5 a 6.6 6.6 0 0 1 13 -2 a 6.6 6.6 0 0 1 13 2 c 0 5.5 -5 10.5 -13 15.5 Z" fill="none" stroke="${c.subtle}" stroke-width="1.7" stroke-linejoin="round"/>`,
    numLabel(compact(doc.likes), s[2] + 18, ay + 6, c.subtle, font),
    `<path d="M${s[3] - 7} ${ay - 12} h14 v24 l-7 -5.5 -7 5.5 Z" fill="none" stroke="${c.subtle}" stroke-width="1.7" stroke-linejoin="round"/>`,
    `<path d="M${s[4]} ${ay + 4} v-14 m-5 -1 l5 -5 5 5 m-13 8 v10 h16 v-10" fill="none" stroke="${c.subtle}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`
  );
  let bottom = ay + 20;

  // threaded replies (phone only)
  if (includeReplies) {
    let ry = bottom + 10;
    parts.push(`<rect x="${x}" y="${ry}" width="${w}" height="0.5" fill="${c.hairline}"/>`);
    ry += 22;
    for (let i = 0; i < (doc.comments ?? []).length; i++) {
      const cm = doc.comments![i];
      parts.push(avatar(cm.user, bx + 18, ry + 2, 18, `xc${i}`, cm.avatar ? lookupUrl?.(cm.avatar) : undefined));
      const nW = textWidth(cm.user, 14.5);
      parts.push(`<text font-family="${font}" font-size="14.5" font-weight="700" fill="${c.text}" x="${bx + 46}" y="${ry + 3}">${esc(cm.user)}</text>`);
      let hx = bx + 46 + nW + 5;
      if (cm.verified) {
        parts.push(verifiedBadge(hx, ry - 9, c.accent));
        hx += 20;
      }
      parts.push(`<text font-family="${font}" font-size="13.5" fill="${c.subtle}" x="${hx}" y="${ry + 3}">@${esc(cm.handle || cm.user.toLowerCase().replace(/\s+/g, ""))} · ${esc(cm.time || "1h")}</text>`);
      const cl = wrapText(cm.text, 15, bw - 46);
      cl.forEach((l, k) => parts.push(`<text font-family="${font}" font-size="15" fill="${c.text}" x="${bx + 46}" y="${ry + 22 + k * 20}">${esc(l)}</text>`));
      ry = ry + 22 + cl.length * 20 + 24;
      if (i < doc.comments!.length - 1) parts.push(`<rect x="${x}" y="${ry - 11}" width="${w}" height="0.5" fill="${c.hairline}"/>`);
    }
    bottom = ry;
  }

  return { svg: parts.join("\n"), height: bottom - y + P };
}

/** Standalone Template card (window-framed). */
export function renderXPostCard(doc: XPostDoc, avatarUrl?: string, lookupUrl?: (id: string) => string | undefined): FramedResult {
  const c = colors(doc.theme);
  const font = fontFor("xpost", doc.chrome.platform ?? "ios");
  const dark = doc.theme !== "light";
  const theme = {
    cardBg: c.bg,
    barBg: doc.theme === "light" ? "#f4f6f8" : doc.theme === "dim" ? "#1c2732" : "#15181d",
    barText: c.subtle,
    dark,
    title: `@${doc.handle}`,
  };
  return renderFramed(
    doc.frame ?? "none",
    theme,
    (x, y, w) => xpostBody(x, y, w, doc, c, font, avatarUrl, lookupUrl, false),
    Math.max(300, Math.min(620, doc.cardWidth ?? 402))
  );
}

/** Full-phone detail view (mobile picker). */
export function renderXPost(doc: XPostDoc, avatarUrl?: string, lookupUrl?: (id: string) => string | undefined): string {
  const platform = doc.chrome.platform ?? "ios";
  const font = fontFor("xpost", platform);
  const c = colors(doc.theme);
  const parts: string[] = [
    `<rect width="${SW}" height="${SH}" fill="${c.bg}"/>`,
    statusBar({ time: doc.chrome.time, battery: doc.chrome.battery, color: c.text, platform }),
    `<path d="M30 70 l-11 11 11 11 M19 81 h24" fill="none" stroke="${c.text}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<text font-family="${font}" font-size="19" font-weight="700" fill="${c.text}" x="62" y="88">Post</text>`,
    `<rect y="107" width="${SW}" height="0.5" fill="${c.hairline}"/>`,
  ];
  parts.push(xpostBody(0, 112, SW, doc, c, font, avatarUrl, lookupUrl, true).svg);
  parts.push(homeIndicator(c.text, platform));
  return parts.join("\n");
}

/** X-style media grid (1–4 photos) with rounded outer corners. Returns height. */
function mediaGrid(parts: string[], urls: string[], x: number, y: number, w: number): number {
  const gap = 3;
  const H = 224;
  const clip = "xg";
  parts.push(`<defs><clipPath id="${clip}"><rect x="${x}" y="${y}" width="${w}" height="${H}" rx="16"/></clipPath></defs>`);
  parts.push(`<g clip-path="url(#${clip})">`);
  const tile = (u: string, tx: number, ty: number, tw: number, th: number) =>
    parts.push(`<image href="${u}" x="${tx}" y="${ty}" width="${tw}" height="${th}" preserveAspectRatio="xMidYMid slice"/>`);
  const cw = (w - gap) / 2;
  const ch = (H - gap) / 2;
  if (urls.length === 1) tile(urls[0], x, y, w, H);
  else if (urls.length === 2) {
    tile(urls[0], x, y, cw, H);
    tile(urls[1], x + cw + gap, y, cw, H);
  } else if (urls.length === 3) {
    tile(urls[0], x, y, cw, H);
    tile(urls[1], x + cw + gap, y, cw, ch);
    tile(urls[2], x + cw + gap, y + ch + gap, cw, ch);
  } else {
    tile(urls[0], x, y, cw, ch);
    tile(urls[1], x + cw + gap, y, cw, ch);
    tile(urls[2], x, y + ch + gap, cw, ch);
    tile(urls[3], x + cw + gap, y + ch + gap, cw, ch);
  }
  parts.push(`</g>`);
  return H;
}

function numLabel(n: string, x: number, y: number, color: string, font: string): string {
  return `<text font-family="${font}" font-size="13.5" fill="${color}" x="${x}" y="${y}">${n}</text>`;
}

function verifiedBadge(x: number, y: number, color: string): string {
  const cx = x + 8.5, cy = y + 8.5;
  const petals = Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2;
    return `${(cx + Math.cos(a) * 8.6).toFixed(1)} ${(cy + Math.sin(a) * 8.6).toFixed(1)}`;
  });
  return `
<circle cx="${cx}" cy="${cy}" r="8" fill="${color}"/>
${petals.map((p) => `<circle cx="${p.split(" ")[0]}" cy="${p.split(" ")[1]}" r="2.6" fill="${color}"/>`).join("")}
<path d="M${cx - 4} ${cy} l 2.8 3 5.2 -6" fill="none" stroke="#ffffff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>`;
}
