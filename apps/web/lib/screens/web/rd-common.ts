"use client";

/**
 * Shared Reddit drawing helpers (phone app + reddit.com): the snoo mark,
 * default snoo avatars, the stroke icon set and the palette.
 */

import { esc } from "../common";

export const REDDIT_ORANGE = "#ff4500";

export function redditTheme(dark: boolean, web = false) {
  return dark
    ? {
        bg: web ? "#0e1113" : "#0b1416",
        text: "#eef1f3",
        sub: "#8ba2ad",
        line: "#2a3c42",
        pill: "#1a282d",
        card: "#14191c",
        blue: "#4f8bff",
        join: "#0a5bd8",
        hover: "#1a282d",
      }
    : {
        bg: "#ffffff",
        text: "#0f1a1c",
        sub: "#576f76",
        line: "#e5ebee",
        pill: "#eaedef",
        card: "#f6f8f9",
        blue: "#0045ac",
        join: "#0045ac",
        hover: "#eaedef",
      };
}

/** Rainbow reply rails: one colour per nesting level, like the app. */
export const RAIL_COLORS = ["#ff4500", "#ff9a00", "#e5b800", "#0dd3bb", "#0079d3", "#7e53c1", "#ff66ac"];

/* --------------------------------- snoo ------------------------------------- */

/** Head, ears, eyes and mouth of the alien, centred on (cx,cy) in a disc of radius r. */
function snooFace(cx: number, cy: number, r: number, face: string, feature: string): string {
  const f = (n: number) => n.toFixed(2);
  const ex = r * 0.27;
  return (
    // ears
    `<circle cx="${f(cx - r * 0.6)}" cy="${f(cy + r * 0.02)}" r="${f(r * 0.13)}" fill="${face}"/>` +
    `<circle cx="${f(cx + r * 0.6)}" cy="${f(cy + r * 0.02)}" r="${f(r * 0.13)}" fill="${face}"/>` +
    // head
    `<ellipse cx="${f(cx)}" cy="${f(cy + r * 0.16)}" rx="${f(r * 0.56)}" ry="${f(r * 0.4)}" fill="${face}"/>` +
    // antenna
    `<path d="M${f(cx + r * 0.02)} ${f(cy - r * 0.2)} Q${f(cx + r * 0.06)} ${f(cy - r * 0.55)} ${f(cx + r * 0.32)} ${f(cy - r * 0.6)}" fill="none" stroke="${face}" stroke-width="${f(r * 0.07)}" stroke-linecap="round"/>` +
    `<circle cx="${f(cx + r * 0.36)}" cy="${f(cy - r * 0.6)}" r="${f(r * 0.11)}" fill="${face}"/>` +
    // eyes + mouth
    `<circle cx="${f(cx - ex)}" cy="${f(cy + r * 0.1)}" r="${f(r * 0.1)}" fill="${feature}"/>` +
    `<circle cx="${f(cx + ex)}" cy="${f(cy + r * 0.1)}" r="${f(r * 0.1)}" fill="${feature}"/>` +
    `<path d="M${f(cx - r * 0.25)} ${f(cy + r * 0.3)} Q${f(cx)} ${f(cy + r * 0.46)} ${f(cx + r * 0.25)} ${f(cy + r * 0.3)}" fill="none" stroke="${feature}" stroke-width="${f(r * 0.065)}" stroke-linecap="round"/>`
  );
}

/** The orange Reddit mark (also used as the default community icon). */
export function snooMark(cx: number, cy: number, r: number, bg = REDDIT_ORANGE): string {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${bg}"/>${snooFace(cx, cy, r, "#ffffff", bg)}`;
}

const SNOO_BG = ["#ff4500", "#0079d3", "#46d160", "#7e53c1", "#ff66ac", "#ffb000", "#0dd3bb", "#ea0027"];

/** Default Reddit avatar: a snoo on a coloured disc (hash of the username), or the uploaded photo. */
export function snooAvatar(name: string, cx: number, cy: number, r: number, key: string, imageUrl?: string): string {
  if (imageUrl) {
    return (
      `<defs><clipPath id="${key}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath></defs>` +
      `<image href="${imageUrl}" x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${key})"/>`
    );
  }
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const bg = SNOO_BG[h % SNOO_BG.length];
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${bg}"/>${snooFace(cx, cy + r * 0.04, r, "#ffffff", bg)}`;
}

/* --------------------------------- icons ------------------------------------ */

const ICONS: Record<string, string> = {
  up: "M12 3.2 3.2 13.4h5.4v7.4h6.8v-7.4h5.4z",
  down: "M12 20.8 3.2 10.6h5.4V3.2h6.8v7.4h5.4z",
  comment: "M5 4.5h14a2.5 2.5 0 0 1 2.5 2.5v8a2.5 2.5 0 0 1-2.5 2.5h-6.6L7 21v-3.5H5A2.5 2.5 0 0 1 2.5 15V7A2.5 2.5 0 0 1 5 4.5z",
  share: "M14.2 4.5 21.5 11.4l-7.3 6.9v-4.1c-5 0-8.2 1.3-10.7 5 .6-5.9 4-9.6 10.7-10.1z",
  reply: "M10.2 5.2 3.7 11.7l6.5 6.5M3.9 11.7h10.4a6 6 0 0 1 6 6v1.2",
  back: "M20 12H4.5M10.5 5.5 4 12l6.5 6.5",
  caret: "M6 9.5l6 6 6-6",
  search: "M10.5 3.8a6.7 6.7 0 1 1 0 13.4 6.7 6.7 0 0 1 0-13.4zM15.4 15.4 21 21",
  plus: "M12 4.5v15M4.5 12h15",
  home: "M3.5 11 12 3.5l8.5 7.5v9a1 1 0 0 1-1 1H15v-6h-6v6H4.5a1 1 0 0 1-1-1z",
  people: "M9 11a3.4 3.4 0 1 0 0-6.8A3.4 3.4 0 0 0 9 11zM2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16.5 4.6a3.4 3.4 0 0 1 0 6.6M18 14.3c2.2.6 3.6 2.5 3.6 5.2",
  chat: "M12 3.5c4.7 0 8.5 3.3 8.5 7.4s-3.8 7.4-8.5 7.4c-.9 0-1.8-.1-2.6-.4L4.5 20l1-3.7C4 15 3.5 13.1 3.5 10.9 3.5 6.8 7.3 3.5 12 3.5z",
  bell: "M6 17.5V11a6 6 0 0 1 12 0v6.5l1.5 1.5h-15zM10 21.2h4",
  gift: "M4 11h16v9.5H4zM3 7.2h18V11H3zM12 7.2v13.3M12 7.2C10 3.6 6.8 3.8 7.4 6.2 7.8 7.6 12 7.2 12 7.2zM12 7.2c2-3.6 5.2-3.4 4.6-1C16.2 7.6 12 7.2 12 7.2z",
  popular: "M3.5 17.5 9 12l3.5 3.5L20.5 7M15 7h5.5v5.5",
  explore: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15.6 8.4 13.4 13.4l-5 2.2 2.2-5z",
  all: "M3.5 6.5h17M3.5 12h17M3.5 17.5h17",
  qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2.5v2.5H14zM18 14h2v2h-2zM14 18.5h2v1.5h-2zM17.5 17.5H20V20h-2.5z",
  sort: "M4 7h16M7 12h10M10 17h4",
  mail: "M3.5 6.5h17v11h-17zM3.5 7l8.5 6.5L20.5 7",
};

export type IconName = keyof typeof ICONS;

/** Stroke icon on a 24-unit grid, centred at (cx,cy). `filled` fills the shape (active vote). */
export function icon(name: IconName, cx: number, cy: number, size: number, color: string, filled = false, sw = 1.8): string {
  const s = size / 24;
  return `<g transform="translate(${(cx - size / 2).toFixed(1)} ${(cy - size / 2).toFixed(1)}) scale(${s.toFixed(3)})"><path d="${ICONS[name]}" fill="${filled ? color : "none"}" stroke="${color}" stroke-width="${(sw / s).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/></g>`;
}

export function dots(cx: number, cy: number, color: string, vertical = false, r = 1.7, gap = 5.6): string {
  return [-1, 0, 1]
    .map((k) => `<circle cx="${(vertical ? cx : cx + k * gap).toFixed(1)}" cy="${(vertical ? cy + k * gap : cy).toFixed(1)}" r="${r}" fill="${color}"/>`)
    .join("");
}

export function txt(font: string, x: number, y: number, size: number, s: string, fill: string, weight = 400, anchor = "start"): string {
  return `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(s)}</text>`;
}

/** "5h" / "2 hr. ago" style helpers: web shows the spelled-out form. */
export function webTime(t: string): string {
  const m = /^(\d+)\s*([smhdwy])$/i.exec(t.trim());
  if (!m) return t;
  const unit: Record<string, string> = { s: "sec.", m: "min.", h: "hr.", d: "day", w: "wk.", y: "yr." };
  const n = Number(m[1]);
  const u = m[2].toLowerCase();
  return `${n} ${u === "d" && n !== 1 ? "days" : unit[u]} ago`;
}
