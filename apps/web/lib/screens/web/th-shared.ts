"use client";

import { BRAND_PATHS } from "../brandMarks";
import { avatar, compact, esc, textWidth, truncate, wrapText } from "../common";
import type { PostComment, SocialPostDoc } from "../types";
import { xBadge } from "./xp-shared";

/**
 * Pieces shared by the Threads phone post screen (th-phone.ts) and the
 * threads.net desktop page (./threads.ts): colours, the icon set, the
 * main-post item (avatar + thread line + counts) and the reply items.
 */

export type TC = {
  page: string; // area behind the feed column (desktop) / screen bg (phone)
  bg: string; // feed surface
  text: string;
  subtle: string;
  hair: string;
  line: string; // vertical thread line
  accent: string;
  chip: string; // composer / compose-button fill
  dark: boolean;
};

export function thColors(dark: boolean): TC {
  return dark
    ? { page: "#0a0a0a", bg: "#101010", text: "#f3f5f7", subtle: "#777777", hair: "#2a2a2a", line: "#333333", accent: "#0095f6", chip: "#1e1e1e", dark }
    : { page: "#f3f5f7", bg: "#ffffff", text: "#000000", subtle: "#999999", hair: "#e6e6e6", line: "#d9d9d9", accent: "#0095f6", chip: "#ebedef", dark };
}

/* ---------------------------------- icons ----------------------------------- */
/* 24-unit stroke icons, drawn with a rounded 1.9 line like the Threads app. */

const P = {
  heart: "M12 20.6C6.3 16.3 3 12.9 3 9.2 3 6.6 5 4.8 7.3 4.8c1.8 0 3.5 1 4.7 2.9 1.2-1.9 2.9-2.9 4.7-2.9C19 4.8 21 6.6 21 9.2c0 3.7-3.3 7.1-9 11.4z",
  comment: "M3.3 20.7l1.5-4.7A8.8 8.8 0 1 1 8 19.2z",
  repost: "M17 3.2l3.6 3.6L17 10.4M20.6 6.8H9a5 5 0 0 0-5 5v.7M7 20.8l-3.6-3.6L7 13.6M3.4 17.2H15a5 5 0 0 0 5-5v-.7",
  share: "M21 3.2L3.4 10.4l6.6 2.5 2.6 6.7zM10 12.9L21 3.2",
  search: "M10.5 3.6a6.9 6.9 0 1 0 0 13.8 6.9 6.9 0 0 0 0-13.8zM15.6 15.6L20.8 20.8",
  person: "M12 11.6a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4zM4 21c0-4 3.4-6.6 8-6.6s8 2.6 8 6.6",
  plus: "M12 5v14M5 12h14",
} as const;

export type ThIcon = keyof typeof P;

export function thIcon(name: ThIcon, cx: number, cy: number, size: number, color: string, sw = 1.9): string {
  const s = size / 24;
  return `<g transform="translate(${(cx - size / 2).toFixed(1)} ${(cy - size / 2).toFixed(1)}) scale(${s.toFixed(3)})" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><path d="${P[name]}"/></g>`;
}

export function thHomeFill(cx: number, cy: number, size: number, color: string): string {
  const s = size / 24;
  return `<g transform="translate(${(cx - size / 2).toFixed(1)} ${(cy - size / 2).toFixed(1)}) scale(${s.toFixed(3)})" fill="${color}"><path d="M12 2.2l-9 6.6v10.5A2.7 2.7 0 0 0 5.7 22H9.5v-6.2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V22h3.8a2.7 2.7 0 0 0 2.7-2.7V8.8z" stroke="${color}" stroke-width="1.2" stroke-linejoin="round"/></g>`;
}

export function thMore(cx: number, cy: number, color: string): string {
  return [-6, 0, 6].map((d) => `<circle cx="${cx + d}" cy="${cy}" r="1.6" fill="${color}"/>`).join("");
}

/** The Threads "@" mark centred at (cx, cy). */
export function thLogo(cx: number, cy: number, size: number, color: string): string {
  return `<path d="${BRAND_PATHS.threads}" fill="${color}" transform="translate(${(cx - size / 2).toFixed(1)} ${(cy - size / 2).toFixed(1)}) scale(${(size / 24).toFixed(3)})"/>`;
}

/** Compose button glyph: a rounded square with a plus, centred. */
export function thComposeBtn(cx: number, cy: number, w: number, h: number, c: TC, ink: string): string {
  return (
    `<rect x="${(cx - w / 2).toFixed(1)}" y="${(cy - h / 2).toFixed(1)}" width="${w}" height="${h}" rx="${(h * 0.34).toFixed(1)}" fill="${c.chip}"/>` +
    thIcon("plus", cx, cy, Math.min(w, h) * 0.5, ink, 2.2)
  );
}

/* ---------------------------------- items ----------------------------------- */

const NAME = 15;
const BODY = 15.5;
const LH = 21;

export interface ThItemBox {
  /** left edge and width of the feed column */
  x: number;
  y: number;
  w: number;
  /** horizontal inset of content inside the column */
  pad: number;
  c: TC;
  font: string;
  lookupUrl?: (id: string) => string | undefined;
}

/** `name  [badge]   time  ···` header shared by the post and replies. Returns nothing but pushes markup. */
function header(parts: string[], b: ThItemBox, tx: number, top: number, name: string, verified: boolean, time: string) {
  const right = b.x + b.w - b.pad;
  const timeW = textWidth(time, 14.5) * 0.95;
  const maxName = right - 28 - timeW - 14 - tx - (verified ? 18 : 0);
  const nm = truncate(name, NAME, maxName);
  parts.push(`<text font-family="${b.font}" font-size="${NAME}" font-weight="600" fill="${b.c.text}" x="${tx}" y="${top + 16}">${esc(nm)}</text>`);
  if (verified) parts.push(xBadge(tx + textWidth(nm, NAME) * 1.03 + 11, top + 11.5, 14, b.c.accent));
  parts.push(`<text font-family="${b.font}" font-size="14.5" fill="${b.c.subtle}" text-anchor="end" x="${right - 26}" y="${top + 16}">${esc(time)}</text>`);
  parts.push(thMore(right - 8, top + 11.5, b.c.subtle));
}

function bodyLines(parts: string[], b: ThItemBox, tx: number, y: number, text: string, tw: number): { lines: number; baseline: number } {
  const lines = wrapText(text || " ", BODY, tw - 6, true);
  lines.forEach((l, i) =>
    parts.push(`<text font-family="${b.font}" font-size="${BODY}" fill="${b.c.text}" x="${tx}" y="${(y + i * LH).toFixed(1)}" xml:space="preserve">${esc(l)}</text>`)
  );
  return { lines: lines.length, baseline: y + (lines.length - 1) * LH };
}

/** The four action icons; `counts` draws a number next to each when set. */
function actionRow(parts: string[], b: ThItemBox, tx: number, cy: number, size: number, step: number, counts?: Array<string>) {
  (["heart", "comment", "repost", "share"] as ThIcon[]).forEach((n, i) => {
    const ix = tx + size / 2 + i * step;
    parts.push(thIcon(n, ix, cy, size, b.c.text, 1.8));
    const t = counts?.[i];
    if (t) parts.push(`<text font-family="${b.font}" font-size="14" fill="${b.c.subtle}" x="${ix + size / 2 + 5}" y="${cy + 5}">${esc(t)}</text>`);
  });
}

function photos(parts: string[], b: ThItemBox, urls: string[], tx: number, y: number, tw: number, id: string): number {
  const gap = 6;
  const n = Math.min(urls.length, 4);
  const h = n === 1 ? Math.min(380, Math.round(tw * 0.78)) : Math.min(300, Math.round(tw * 0.62));
  const cols = n === 1 ? 1 : 2;
  const cw = (tw - gap * (cols - 1)) / cols;
  const rows = n > 2 ? 2 : 1;
  const rh = (h - gap * (rows - 1)) / rows;
  urls.slice(0, n).forEach((u, i) => {
    const cx = tx + (i % cols) * (cw + gap);
    const cy = y + Math.floor(i / cols) * (rh + gap);
    parts.push(
      `<defs><clipPath id="${id}${i}"><rect x="${cx}" y="${cy}" width="${cw}" height="${rh}" rx="10"/></clipPath></defs>` +
        `<image href="${u}" x="${cx}" y="${cy}" width="${cw}" height="${rh}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id}${i})"/>` +
        `<rect x="${cx + 0.5}" y="${cy + 0.5}" width="${cw - 1}" height="${rh - 1}" rx="10" fill="none" stroke="${b.c.hair}"/>`
    );
  });
  return h;
}

/** The post itself: avatar with the thread line, header, text, actions, counts. */
export function thMainPost(b: ThItemBox, doc: SocialPostDoc, avatarUrl?: string): { svg: string; bottom: number } {
  const parts: string[] = [];
  const top = b.y + 14;
  const ax = b.x + b.pad + 18;
  const tx = b.x + b.pad + 48;
  const tw = b.w - b.pad * 2 - 48;
  parts.push(avatar(doc.name, ax, top + 18, 18, "thm", avatarUrl));
  header(parts, b, tx, top, doc.name, !!doc.verified, doc.time || "2h");

  const t = bodyLines(parts, b, tx, top + 16 + LH + 1, doc.text, tw);
  let y = t.baseline + 10;
  const imgs = (doc.images ?? []).map((id) => b.lookupUrl?.(id)).filter((u): u is string => !!u);
  if (imgs.length) y += photos(parts, b, imgs, tx, y + 4, tw, "thmp") + 14;

  const rowCy = y + 22;
  actionRow(parts, b, tx - 8, rowCy, 21, 46);
  const countsY = rowCy + 32;
  parts.push(
    `<text font-family="${b.font}" font-size="14.5" fill="${b.c.subtle}" x="${tx}" y="${countsY}">${compact(doc.comments)} replies · ${compact(doc.likes)} likes</text>`
  );

  // thread line from under the avatar down to the little reply avatars
  const lineTop = top + 18 + 18 + 6;
  const clusterY = countsY - 5;
  parts.push(`<rect x="${ax - 1}" y="${lineTop}" width="2" height="${Math.max(10, clusterY - 14 - lineTop)}" rx="1" fill="${b.c.line}"/>`);
  const reps = (doc.commentList ?? []).slice(0, 3);
  const spots: Array<[number, number, number]> = [
    [ax - 7, clusterY + 1, 7.5],
    [ax + 8, clusterY - 3, 6.5],
    [ax + 5, clusterY + 9, 5.5],
  ];
  (reps.length ? reps : [{ user: doc.name } as PostComment]).forEach((cm, i) => {
    const [sx, sy, r] = spots[i];
    parts.push(avatar(cm.user, sx, sy, r, `thc${i}`, cm.avatar ? b.lookupUrl?.(cm.avatar) : undefined));
  });
  return { svg: parts.join("\n"), bottom: countsY + 16 };
}

/** One reply: avatar, name/time, text, action row with the heart count. */
export function thReply(b: ThItemBox, cm: PostComment, i: number): { svg: string; bottom: number } {
  const parts: string[] = [];
  const top = b.y + 14;
  const ax = b.x + b.pad + 18;
  const tx = b.x + b.pad + 48;
  const tw = b.w - b.pad * 2 - 48;
  parts.push(avatar(cm.user, ax, top + 18, 18, `thr${i}`, cm.avatar ? b.lookupUrl?.(cm.avatar) : undefined));
  header(parts, b, tx, top, cm.user, !!cm.verified, cm.time || "1h");
  const t = bodyLines(parts, b, tx, top + 16 + LH + 1, cm.text, tw);
  const rowCy = t.baseline + 26;
  const likes = Math.max(0, cm.likes ?? 0);
  actionRow(parts, b, tx - 6, rowCy, 19, 60, [likes ? compact(likes) : "", "", "", ""]);
  return { svg: parts.join("\n"), bottom: rowCy + 22 };
}

/** Replies stacked with hairlines between them; stops once an item starts below `limitY`. */
export function thReplies(b: ThItemBox, list: PostComment[], limitY = Infinity): { svg: string; bottom: number } {
  const parts: string[] = [];
  let y = b.y;
  list.forEach((cm, i) => {
    if (y > limitY) return;
    const r = thReply({ ...b, y }, cm, i);
    parts.push(r.svg);
    y = r.bottom;
    parts.push(`<rect x="${b.x}" y="${(y - 0.5).toFixed(1)}" width="${b.w}" height="1" fill="${b.c.hair}"/>`);
  });
  return { svg: parts.join("\n"), bottom: y };
}
