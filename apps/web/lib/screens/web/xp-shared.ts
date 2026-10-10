"use client";

import { avatar, compact, esc, glyph, textWidth, truncate, wrapText } from "../common";
import type { PostComment, XPostDoc } from "../types";

/**
 * Pieces shared by the X phone post-detail screen (../xpost.ts) and the
 * x.com desktop page (./xpost.ts): theme colours, the icon set, the verified
 * seal and the post-detail column (author, text, media, stats, actions,
 * composer, replies).
 */

export type XC = {
  bg: string;
  text: string;
  subtle: string;
  hairline: string;
  accent: string;
  gold: string;
  /** search box / chips / hover surface */
  chip: string;
  /** right-rail card surface */
  card: string;
  /** solid button (Follow) ink on `btnText` */
  btn: string;
  btnText: string;
  dark: boolean;
};

export function xColors(theme: XPostDoc["theme"]): XC {
  const light = theme === "light";
  const dim = theme === "dim";
  return {
    bg: light ? "#ffffff" : dim ? "#15202b" : "#000000",
    text: light ? "#0f1419" : dim ? "#f7f9f9" : "#e7e9ea",
    subtle: light ? "#536471" : dim ? "#8b98a5" : "#71767b",
    hairline: light ? "#eff3f4" : dim ? "#38444d" : "#2f3336",
    accent: "#1d9bf0",
    gold: "#e2b719",
    chip: light ? "#eff3f4" : dim ? "#273340" : "#202327",
    card: light ? "#f7f9f9" : dim ? "#1e2732" : "#16181c",
    btn: light ? "#0f1419" : "#eff3f4",
    btnText: light ? "#ffffff" : "#0f1419",
    dark: !light,
  };
}

/* ---------------------------------- icons ----------------------------------- */
/* 24-unit paths in X's own icon geometry (outline weight). */

export const XI = {
  reply:
    "M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z",
  repost:
    "M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z",
  like:
    "M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z",
  bookmark:
    "M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5zM6.5 4c-.276 0-.5.22-.5.5v14.56l6-4.29 6 4.29V4.5c0-.28-.224-.5-.5-.5h-11z",
  share:
    "M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z",
  views: "M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z",
  more: "M3 12c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm9 2c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm7 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z",
  homeFill:
    "M12 1.696L.622 8.807l1.06 1.696L3 9.679V19.5C3 20.881 4.119 22 5.5 22h13c1.381 0 2.5-1.119 2.5-2.5V9.679l1.318.824 1.06-1.696L12 1.696zM12 16.5c-1.933 0-3.5-1.567-3.5-3.5s1.567-3.5 3.5-3.5 3.5 1.567 3.5 3.5-1.567 3.5-3.5 3.5z",
  search:
    "M10.25 3.75c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5c1.795 0 3.419-.726 4.596-1.904 1.178-1.177 1.904-2.801 1.904-4.596 0-3.59-2.91-6.5-6.5-6.5zm-8.5 6.5c0-4.694 3.806-8.5 8.5-8.5s8.5 3.806 8.5 8.5c0 1.986-.682 3.815-1.824 5.262l4.781 4.781-1.414 1.414-4.781-4.781c-1.447 1.142-3.276 1.824-5.262 1.824-4.694 0-8.5-3.806-8.5-8.5z",
  bell: "M19.993 9.042C19.48 5.017 16.054 2 11.996 2s-7.49 3.021-7.999 7.051L2.866 18H7.1c.463 2.282 2.481 4 4.9 4s4.437-1.718 4.9-4h4.236l-1.143-8.958zM12 20c-1.306 0-2.417-.835-2.829-2h5.658c-.412 1.165-1.523 2-2.829 2zm-6.866-4l.847-6.698C6.364 6.272 8.941 4 11.996 4s5.627 2.268 6.013 5.295L18.864 16H5.134z",
  mail: "M1.998 5.5c0-1.381 1.119-2.5 2.5-2.5h15c1.381 0 2.5 1.119 2.5 2.5v13c0 1.381-1.119 2.5-2.5 2.5h-15c-1.381 0-2.5-1.119-2.5-2.5v-13zm2.5-.5c-.276 0-.5.224-.5.5v2.764l8 3.638 8-3.636V5.5c0-.276-.224-.5-.5-.5h-15zm15.5 5.463l-8 3.636-8-3.638V18.5c0 .276.224.5.5.5h15c.276 0 .5-.224.5-.5v-8.037z",
  person:
    "M5.651 19h12.698c-.337-1.8-1.023-3.21-1.945-4.19C15.318 13.65 13.838 13 12 13s-3.317.65-4.404 1.81c-.922.98-1.608 2.39-1.945 4.19zm.486-5.56C7.627 11.85 9.648 11 12 11s4.373.85 5.863 2.44c1.477 1.58 2.366 3.8 2.632 6.46l.11 1.1H3.395l.11-1.1c.266-2.66 1.155-4.88 2.632-6.46zM12 4c-1.105 0-2 .9-2 2s.895 2 2 2 2-.9 2-2-.895-2-2-2zM8 6c0-2.21 1.791-4 4-4s4 1.79 4 4-1.791 4-4 4-4-1.79-4-4z",
  people:
    "M7.501 19.917L7.471 21H.472l.029-1.027c.184-6.618 3.736-8.977 7-8.977.963 0 1.95.212 2.87.672-.444.478-.851 1.03-1.212 1.656-.507-.204-1.054-.329-1.658-.329-2.767 0-4.57 2.223-4.938 6.004H7.56c-.023.302-.05.599-.059.917zm15.998.056L23.528 21H9.472l.029-1.027c.184-6.618 3.736-8.977 7-8.977s6.816 2.358 7 8.977zM21.437 19c-.367-3.781-2.17-6.004-4.938-6.004s-4.57 2.223-4.938 6.004h9.875zm-4.938-9c-.799 0-1.527-.279-2.116-.73-.836-.64-1.384-1.638-1.384-2.77 0-1.93 1.567-3.5 3.5-3.5s3.5 1.57 3.5 3.5c0 1.132-.548 2.13-1.384 2.77-.589.451-1.317.73-2.116.73zm-1.5-3.5c0 .827.673 1.5 1.5 1.5s1.5-.673 1.5-1.5-.673-1.5-1.5-1.5-1.5.673-1.5 1.5zM7.5 3C9.433 3 11 4.57 11 6.5S9.433 10 7.5 10 4 8.43 4 6.5 5.567 3 7.5 3zm0 2C6.673 5 6 5.673 6 6.5S6.673 8 7.5 8 9 7.327 9 6.5 8.327 5 7.5 5z",
  back: "M7.414 13l5.043 5.04-1.414 1.42L3.586 12l7.457-7.46 1.414 1.42L7.414 11H21v2H7.414z",
} as const;

export function xIcon(path: string, cx: number, cy: number, size: number, color: string): string {
  return glyph(path, cx, cy, size, color);
}

/** The X mark, centred at (cx, cy). */
export function xLogoAt(cx: number, cy: number, size: number, color: string): string {
  const sc = size / 24;
  return `<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="${color}" transform="translate(${(cx - size / 2).toFixed(1)} ${(cy - size / 2).toFixed(1)}) scale(${sc.toFixed(3)})"/>`;
}

/** Grok: a rounded square with a diagonal slash. */
export function grokIcon(cx: number, cy: number, size: number, color: string): string {
  const s = size / 24;
  return `<g transform="translate(${(cx - size / 2).toFixed(1)} ${(cy - size / 2).toFixed(1)}) scale(${s.toFixed(3)})" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3.5"/><path d="M7.5 16.5l9-9"/></g>`;
}

/** "More" nav item: circle with three dots. */
export function moreCircleIcon(cx: number, cy: number, size: number, color: string): string {
  const s = size / 24;
  return `<g transform="translate(${(cx - size / 2).toFixed(1)} ${(cy - size / 2).toFixed(1)}) scale(${s.toFixed(3)})"><circle cx="12" cy="12" r="9.6" fill="none" stroke="${color}" stroke-width="2"/><circle cx="7.6" cy="12" r="1.35" fill="${color}"/><circle cx="12" cy="12" r="1.35" fill="${color}"/><circle cx="16.4" cy="12" r="1.35" fill="${color}"/></g>`;
}

/** Premium nav item: an X mark in a rounded box. */
export function premiumIcon(cx: number, cy: number, size: number, color: string): string {
  return (
    `<rect x="${(cx - size * 0.42).toFixed(1)}" y="${(cy - size * 0.42).toFixed(1)}" width="${(size * 0.84).toFixed(1)}" height="${(size * 0.84).toFixed(1)}" rx="${(size * 0.14).toFixed(1)}" fill="none" stroke="${color}" stroke-width="2"/>` +
    xLogoAt(cx, cy, size * 0.5, color)
  );
}

/** Verified seal (blue / gold), `size` px, centred at (cx, cy). */
export function xBadge(cx: number, cy: number, size: number, color: string): string {
  const s = size / 24;
  const outer =
    "M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z";
  return (
    `<g transform="translate(${(cx - size / 2).toFixed(1)} ${(cy - size / 2).toFixed(1)}) scale(${s.toFixed(3)})">` +
    `<path d="${outer}" fill="${color}"/>` +
    `<path d="M6.9 12.3l3.1 3.1 6.1-6.7" fill="none" stroke="#ffffff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></g>`
  );
}

/* --------------------------------- text bits -------------------------------- */

/** One line of post text with #tags, @mentions and links tinted in the accent. */
export function xTextLine(line: string, x: number, y: number, size: number, color: string, accent: string, font: string): string {
  const row = line
    .split(/(\s+)/)
    .map((tok) => (/^(?:[#@]\w|https?:\/\/|\w+\.(?:com|io|co|ai|app|dev)\b)/.test(tok) ? `<tspan fill="${accent}">${esc(tok)}</tspan>` : esc(tok)))
    .join("");
  return `<text font-family="${font}" font-size="${size}" fill="${color}" x="${x}" y="${y.toFixed(1)}" xml:space="preserve">${row}</text>`;
}

export function handleOf(cm: PostComment): string {
  return (cm.handle || cm.user).replace(/^@/, "").toLowerCase().replace(/\s+/g, "");
}

/** Plausible secondary counts derived from a reply's likes (the doc stores only likes). */
function replyCounts(cm: PostComment) {
  const likes = Math.max(0, cm.likes ?? 0);
  return { replies: Math.floor(likes / 8), reposts: Math.floor(likes / 6), likes, views: likes ? likes * 38 : 0 };
}

/** The four detail stats; Quotes and Bookmarks are derived from reposts / likes. */
export function detailStats(doc: XPostDoc): Array<[string, string]> {
  const quotes = Math.round(doc.reposts * 0.094);
  const bookmarks = Math.round(doc.likes * 0.08);
  return [
    [compact(doc.reposts), "Reposts"],
    [compact(quotes), "Quotes"],
    [compact(doc.likes), "Likes"],
    [compact(bookmarks), "Bookmarks"],
  ];
}

/* ------------------------------- media grid --------------------------------- */

function xMedia(urls: string[], x: number, y: number, w: number, id: string, c: XC): { svg: string; h: number } {
  const gap = 2;
  const H = urls.length === 1 ? Math.round(w * 0.58) : Math.round(w * 0.56);
  const cw = (w - gap) / 2;
  const ch = (H - gap) / 2;
  const tile = (u: string, tx: number, ty: number, tw: number, th: number) =>
    `<image href="${u}" x="${tx}" y="${ty}" width="${tw}" height="${th}" preserveAspectRatio="xMidYMid slice"/>`;
  let tiles: string;
  if (urls.length === 1) tiles = tile(urls[0], x, y, w, H);
  else if (urls.length === 2) tiles = tile(urls[0], x, y, cw, H) + tile(urls[1], x + cw + gap, y, cw, H);
  else if (urls.length === 3) tiles = tile(urls[0], x, y, cw, H) + tile(urls[1], x + cw + gap, y, cw, ch) + tile(urls[2], x + cw + gap, y + ch + gap, cw, ch);
  else tiles = tile(urls[0], x, y, cw, ch) + tile(urls[1], x + cw + gap, y, cw, ch) + tile(urls[2], x, y + ch + gap, cw, ch) + tile(urls[3], x + cw + gap, y + ch + gap, cw, ch);
  return {
    svg:
      `<defs><clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${H}" rx="16"/></clipPath></defs>` +
      `<g clip-path="url(#${id})">${tiles}</g>` +
      `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${H - 1}" rx="16" fill="none" stroke="${c.hairline}"/>`,
    h: H,
  };
}

/* ------------------------------- post detail -------------------------------- */

export interface XDetailOpts {
  /** left edge and width of the column the post lives in */
  x: number;
  y: number;
  w: number;
  /** horizontal inset of content inside the column */
  pad: number;
  doc: XPostDoc;
  c: XC;
  font: string;
  avatarUrl?: string;
  lookupUrl?: (id: string) => string | undefined;
  /** desktop page: bigger composer, Grok chip next to the menu */
  web?: boolean;
  /** stop drawing replies once they start below this y (page / screen bottom) */
  limitY?: number;
}

const hair = (x: number, y: number, w: number, c: XC) => `<rect x="${x}" y="${(y - 0.5).toFixed(1)}" width="${w}" height="1" fill="${c.hairline}"/>`;

/** Author, text, media, meta, stats, actions, composer and replies. Returns the markup and the y it reached. */
export function xDetail(o: XDetailOpts): { svg: string; bottom: number } {
  const { x, w, pad, doc, c, font, web } = o;
  const parts: string[] = [];
  const bx = x + pad;
  const bw = w - pad * 2;
  let y = o.y;

  /* author block */
  const top = y + 12;
  parts.push(avatar(doc.name, bx + 20, top + 20, 20, "xpa", o.avatarUrl));
  const nameMax = bw - 56 - (web ? 76 : 40) - (doc.badge !== "none" ? 22 : 0);
  const name = truncate(doc.name, 15, nameMax);
  parts.push(`<text font-family="${font}" font-size="15" font-weight="700" fill="${c.text}" x="${bx + 52}" y="${top + 16}">${esc(name)}</text>`);
  if (doc.badge !== "none") parts.push(xBadge(bx + 52 + textWidth(name, 15) * 1.03 + 11, top + 11.5, 18, doc.badge === "gold" ? c.gold : c.accent));
  parts.push(`<text font-family="${font}" font-size="15" fill="${c.subtle}" x="${bx + 52}" y="${top + 36}">${esc(truncate("@" + doc.handle, 15, bw - 120))}</text>`);
  const menuX = bx + bw - 10;
  parts.push(xIcon(XI.more, menuX, top + 14, 20, c.subtle));
  if (web) parts.push(grokIcon(menuX - 36, top + 14, 20, c.subtle));
  y = top + 40 + 14;

  /* text */
  const TSZ = Math.max(14, Math.min(34, doc.postFontSize ?? 21));
  const size = web ? Math.round(TSZ * 1.1) : TSZ;
  const lh = Math.round(size * 1.32);
  const lines = wrapText(doc.text || " ", size, bw - 4, true);
  lines.forEach((l, i) => parts.push(xTextLine(l, bx, y + lh * 0.5 + size * 0.36 + i * lh, size, c.text, c.accent, font)));
  y += lines.length * lh + 4;

  /* media */
  const imgs = (doc.images ?? []).map((id) => o.lookupUrl?.(id)).filter((u): u is string => !!u).slice(0, 4);
  if (imgs.length) {
    y += 8;
    const m = xMedia(imgs, bx, y, bw, web ? "xpmw" : "xpm", c);
    parts.push(m.svg);
    y += m.h + 4;
  }

  /* time · date · views */
  y += 10;
  const meta = `${esc(doc.chrome.time || "9:41")} AM · ${esc(doc.date)} · `;
  parts.push(
    `<text font-family="${font}" font-size="15" fill="${c.subtle}" x="${bx}" y="${y + 12}" xml:space="preserve">${meta}<tspan font-weight="700" fill="${c.text}">${esc(doc.views)}</tspan> Views</text>`
  );
  y += 12 + 14;
  parts.push(hair(x, y, w, c));

  /* stats: shrink / drop Quotes until it fits */
  const all = detailStats(doc);
  const variants: Array<{ items: Array<[string, string]>; size: number; gap: number }> = [
    { items: all, size: 14.5, gap: 16 },
    { items: all, size: 13.5, gap: 12 },
    { items: all.filter((s) => s[1] !== "Quotes"), size: 14.5, gap: 16 },
  ];
  const fit =
    variants.find((v) => v.items.reduce((a, [n, l]) => a + textWidth(n + " " + l, v.size) * 0.94, 0) + v.gap * (v.items.length - 1) <= bw) ?? variants[2];
  let sx = bx;
  for (const [n, l] of fit.items) {
    parts.push(
      `<text font-family="${font}" font-size="${fit.size}" fill="${c.subtle}" x="${sx}" y="${y + 29}" xml:space="preserve"><tspan font-weight="700" fill="${c.text}">${esc(n)}</tspan> ${l}</text>`
    );
    sx += textWidth(n + " " + l, fit.size) * 0.94 + fit.gap;
  }
  y += 44;
  parts.push(hair(x, y, w, c));

  /* 5-icon action row */
  const ay = y + 25;
  const icons = [XI.reply, XI.repost, XI.like, XI.bookmark, XI.share];
  const span = bw - 28;
  icons.forEach((p, i) => parts.push(xIcon(p, bx + 14 + (span * i) / 4, ay, web ? 22 : 22, c.subtle)));
  y += 50;
  parts.push(hair(x, y, w, c));

  /* "Post your reply" composer */
  const cy = y + (web ? 36 : 32);
  const r = web ? 20 : 17;
  parts.push(avatar(doc.name, bx + r, cy, r, "xpc", o.avatarUrl));
  parts.push(`<text font-family="${font}" font-size="${web ? 20 : 17}" fill="${c.subtle}" x="${bx + r * 2 + 14}" y="${cy + (web ? 7 : 6)}">Post your reply</text>`);
  const bwid = web ? 74 : 66;
  parts.push(
    `<rect x="${bx + bw - bwid}" y="${cy - 17}" width="${bwid}" height="34" rx="17" fill="${c.accent}" opacity="0.5"/>` +
      `<text font-family="${font}" font-size="15" font-weight="700" fill="#ffffff" text-anchor="middle" x="${bx + bw - bwid / 2}" y="${cy + 5.5}">Reply</text>`
  );
  y += web ? 72 : 64;
  parts.push(hair(x, y, w, c));

  /* replies */
  const limit = o.limitY ?? Infinity;
  for (const [i, cm] of (doc.comments ?? []).entries()) {
    if (y > limit) break;
    const item = xReply(cm, i, { x, y, w, pad, c, font, lookupUrl: o.lookupUrl });
    parts.push(item.svg);
    y = item.bottom;
    parts.push(hair(x, y, w, c));
  }
  return { svg: parts.join("\n"), bottom: y };
}

/** One reply in the conversation. */
function xReply(
  cm: PostComment,
  i: number,
  o: { x: number; y: number; w: number; pad: number; c: XC; font: string; lookupUrl?: (id: string) => string | undefined }
): { svg: string; bottom: number } {
  const { c, font } = o;
  const parts: string[] = [];
  const bx = o.x + o.pad;
  const tx = bx + 52; // text column
  const tw = o.w - o.pad * 2 - 52;
  const top = o.y + 12;
  parts.push(avatar(cm.user, bx + 20, top + 20, 20, `xpr${i}`, cm.avatar ? o.lookupUrl?.(cm.avatar) : undefined));

  // name · badge · @handle · time, each measured so nothing collides
  const timeStr = ` · ${cm.time || "1h"}`;
  const reserve = 26 + textWidth(timeStr, 15);
  const nameMax = Math.min(tw * 0.55, tw - reserve - 60);
  const name = truncate(cm.user, 15, nameMax);
  let nx = tx;
  parts.push(`<text font-family="${font}" font-size="15" font-weight="700" fill="${c.text}" x="${nx}" y="${top + 16}">${esc(name)}</text>`);
  nx += textWidth(name, 15) * 1.03 + 3;
  if (cm.verified) {
    parts.push(xBadge(nx + 8.5, top + 11.5, 17, c.accent));
    nx += 20;
  }
  const hMax = tw - (nx - tx) - reserve - 8;
  const handle = hMax > 30 ? truncate("@" + handleOf(cm), 15, hMax) : "";
  parts.push(
    `<text font-family="${font}" font-size="15" fill="${c.subtle}" x="${nx + 2}" y="${top + 16}" xml:space="preserve">${esc(handle)}${esc(timeStr)}</text>`
  );
  parts.push(xIcon(XI.more, o.x + o.w - o.pad - 8, top + 12, 17, c.subtle));

  // text
  const lines = wrapText(cm.text, 15, tw - 4, true);
  lines.forEach((l, k) => parts.push(xTextLine(l, tx, top + 37 + k * 20, 15, c.text, c.accent, font)));
  let y = top + 37 + (lines.length - 1) * 20 + 8;

  // action row: reply · repost · like · views · share
  const cnt = replyCounts(cm);
  const ry = y + 18;
  const colW = (tw - 22) / 4;
  const row: Array<[string, string]> = [
    [XI.reply, cnt.replies ? compact(cnt.replies) : ""],
    [XI.repost, cnt.reposts ? compact(cnt.reposts) : ""],
    [XI.like, cnt.likes ? compact(cnt.likes) : ""],
    [XI.views, cnt.views ? compact(cnt.views) : ""],
  ];
  row.forEach(([p, n], k) => {
    const ix = tx + 9 + k * colW;
    parts.push(xIcon(p, ix, ry, 17, c.subtle));
    if (n) parts.push(`<text font-family="${font}" font-size="13" fill="${c.subtle}" x="${ix + 15}" y="${ry + 4.5}">${n}</text>`);
  });
  parts.push(xIcon(XI.share, tx + tw - 9, ry, 17, c.subtle));
  y = ry + 20;
  return { svg: parts.join(""), bottom: y };
}
