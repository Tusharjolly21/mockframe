"use client";

/**
 * Shared SVG building blocks for screen generators (framekit-screen-studio.md
 * §2.3). Canonical logical canvas: 402×874 pt (iPhone 16 Pro class), emitted
 * at 3× (1206×2622) so cover-fit into any registry device stays crisp.
 */

export const SW = 402;
export const SH = 874;
export const OUT_W = SW * 3;
export const OUT_H = SH * 3;

export type Platform = "ios" | "android";

/* Font system. Custom brand webfonts can't load inside a pure-SVG data URI,
   so these are web-safe stacks that evoke each brand and differ meaningfully
   (serif vs sans, SF vs Roboto). The registry lives in fonts.ts. */
export const IOS_FONT = "-apple-system,'SF Pro Text','Segoe UI',Roboto,Arial,sans-serif";
export const ANDROID_FONT = "Roboto,'Noto Sans','Segoe UI',system-ui,Arial,sans-serif";
export const SERIF_FONT = "'Tiempos Text',Georgia,'Times New Roman',serif";
export const HELV_FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif";
export const MONO_FONT = "'SF Mono','JetBrains Mono',ui-monospace,Menlo,Consolas,monospace";
export const UI_FONT = IOS_FONT; // legacy alias — avatar initials, etc.

export function systemFont(platform: Platform): string {
  return platform === "android" ? ANDROID_FONT : IOS_FONT;
}

export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ------------------------------ text metrics -------------------------------- */
/* SVG has no layout engine; a per-glyph-class width estimate (±2% on UI copy)
   sizes bubbles and wraps text. Revisit with real metrics if goldens drift. */

export function textWidth(s: string, size: number): number {
  // estimates lean slightly WIDE of the real glyphs: a roomy bubble looks
  // fine, text kissing the bubble edge does not
  let w = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (c >= 0x1f000 || (c >= 0x2600 && c <= 0x27bf)) w += 1.3; // emoji
    else if ("WM@—".includes(ch)) w += 0.95;
    else if ("mw".includes(ch)) w += 0.84;
    else if ("ijl'|!.,:;()".includes(ch)) w += 0.3;
    else if ("ftr".includes(ch)) w += 0.4;
    else if (ch === " ") w += 0.3;
    else if (ch >= "A" && ch <= "Z") w += 0.72;
    else if (ch >= "0" && ch <= "9") w += 0.6;
    else w += 0.54;
  }
  return w * size;
}

export function wrapText(text: string, size: number, maxW: number): string[] {
  const out: string[] = [];
  for (const hard of text.split("\n")) {
    const words = hard.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      out.push("");
      continue;
    }
    let cur = "";
    for (const word of words) {
      const t = cur ? `${cur} ${word}` : word;
      if (textWidth(t, size) <= maxW || !cur) cur = t;
      else {
        out.push(cur);
        cur = word;
      }
    }
    if (cur) out.push(cur);
  }
  return out.length ? out : [""];
}

/** Ellipsize `s` (code-point safe) so it fits within `maxW` px at `size`. */
export function truncate(s: string, size: number, maxW: number): string {
  if (textWidth(s, size) <= maxW) return s;
  const chars = [...s];
  let lo = 0;
  let hi = chars.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (textWidth(chars.slice(0, mid).join("") + "…", size) <= maxW) lo = mid;
    else hi = mid - 1;
  }
  return chars.slice(0, lo).join("") + "…";
}

/** Multi-line <text> block. anchor: start | middle | end at x. */
export function textBlock(
  lines: string[],
  opts: {
    x: number;
    y: number; // baseline of first line
    size: number;
    lineHeight: number;
    color: string;
    weight?: number;
    anchor?: "start" | "middle" | "end";
    font?: string;
    spans?: (line: string) => string; // custom tspan content per line (pre-escaped)
  }
): string {
  const { x, y, size, lineHeight, color, weight = 400, anchor = "start", font = UI_FONT } = opts;
  const rows = lines
    .map(
      (l, i) =>
        `<tspan x="${x}" y="${(y + i * lineHeight).toFixed(1)}">${opts.spans ? opts.spans(l) : esc(l)}</tspan>`
    )
    .join("");
  return `<text font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}">${rows}</text>`;
}

/* -------------------------------- status bar -------------------------------- */

export function statusBar(opts: { time: string; battery: number; color: string; platform?: Platform }): string {
  const platform = opts.platform ?? "ios";
  const { battery, color } = opts;
  const B = 34; // shared bottom line — bars, wifi and battery all sit on it
  const dim = battery > 20 ? color : "#ff3b30";
  const time = esc(opts.time || "9:41");
  // signal: 4 bars ascending, bottom-aligned (both platforms)
  const bars = [4.5, 7, 9.5, 12]
    .map((h, i) => `<rect x="${SW - 102 + i * 5}" y="${B - h}" width="3.2" height="${h}" rx="1.2"/>`)
    .join("");

  if (platform === "android") {
    // time top-left, smaller; filled wifi fan; Material vertical battery
    const wx = SW - 68;
    const wifi = `<path d="M${wx} ${B - 1} L${wx - 8.5} ${B - 10.5} A 12.5 12.5 0 0 1 ${wx + 8.5} ${B - 10.5} Z" fill="${color}"/>`;
    const bxx = SW - 34, byy = B - 14;
    const bh = 15, fillH = Math.max(2, (bh - 3) * Math.min(100, Math.max(0, battery)) / 100);
    const bat =
      `<rect x="${bxx + 2.5}" y="${byy - 2}" width="4" height="2.4" rx="1" fill="${color}"/>` +
      `<rect x="${bxx}" y="${byy}" width="9" height="${bh}" rx="2.2" fill="none" stroke="${color}" stroke-width="1.3" stroke-opacity="0.55"/>` +
      `<rect x="${bxx + 1.5}" y="${byy + bh - 1.5 - fillH}" width="6" height="${fillH}" rx="1.2" fill="${dim}"/>`;
    return `
<text font-family="${ANDROID_FONT}" font-size="14.5" font-weight="500" fill="${color}" x="22" y="${B - 1}">${time}</text>
<g fill="${color}">${bars}</g>
${wifi}
${bat}`;
  }

  // iOS: centered-left time, arc wifi, horizontal battery
  const bw = 25, bx = SW - 21 - bw, by = B - 12.5;
  const fillW = Math.max(2, (bw - 4) * Math.min(100, Math.max(0, battery)) / 100);
  const wx = SW - 71;
  const wifi =
    `<circle cx="${wx}" cy="${B - 1.8}" r="1.9" fill="${color}"/>` +
    `<path d="M${wx - 4.4} ${B - 5.6} a 6.2 6.2 0 0 1 8.8 0" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round"/>` +
    `<path d="M${wx - 7.6} ${B - 8.8} a 10.8 10.8 0 0 1 15.2 0" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round"/>`;
  return `
<text font-family="${IOS_FONT}" font-size="17" font-weight="600" fill="${color}" text-anchor="middle" x="54" y="${B}">${time}</text>
<g fill="${color}">${bars}</g>
${wifi}
<rect x="${bx}" y="${by}" width="${bw}" height="13" rx="4" fill="none" stroke="${color}" stroke-opacity="0.4" stroke-width="1.2"/>
<rect x="${bx + 2}" y="${by + 2}" width="${fillW}" height="9" rx="2.5" fill="${dim}"/>
<path d="M${bx + bw + 1.5} ${by + 4.5} a 3 3 0 0 1 0 4 Z" fill="${color}" fill-opacity="0.4"/>`;
}

/* ------------------------------- call icons ----------------------------------
   One correct set shared by every app header — a real telephone handset and a
   camera-with-lens video glyph, both filled, sized around a center point. */

const PHONE_PATH =
  "M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.21c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z";

export function phoneIcon(cx: number, cy: number, size: number, color: string): string {
  const s = size / 24;
  return `<path d="${PHONE_PATH}" fill="${color}" transform="translate(${(cx - size / 2).toFixed(1)} ${(cy - size / 2).toFixed(1)}) scale(${s.toFixed(3)})"/>`;
}

export function videoIcon(cx: number, cy: number, size: number, color: string): string {
  const h = size * 0.68;
  const bw = size * 0.78;
  const x = cx - size / 2;
  const y = cy - h / 2;
  return (
    `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="${(h * 0.3).toFixed(1)}" fill="${color}"/>` +
    `<path d="M${(x + bw + 1.5).toFixed(1)} ${(y + h * 0.32).toFixed(1)} l ${(size * 0.26).toFixed(1)} -${(h * 0.3).toFixed(1)} v ${h.toFixed(1)} l -${(size * 0.26).toFixed(1)} -${(h * 0.3).toFixed(1)} Z" fill="${color}"/>`
  );
}

/** Three typing dots with a bounce — the active dot (phase % 3) lifts. Used
 *  inside typing bubbles (iMessage/Messenger/Instagram) and the Discord line. */
export function typingDots(cx: number, cy: number, color: string, phase: number, r = 3.4, gap = 11): string {
  return [0, 1, 2]
    .map((i) => {
      const active = i === ((phase % 3) + 3) % 3;
      const y = active ? cy - 3.2 : cy;
      const op = active ? 0.95 : 0.55;
      return `<circle cx="${(cx + i * gap).toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${color}" opacity="${op}"/>`;
    })
    .join("");
}

export function homeIndicator(color: string, platform: Platform = "ios"): string {
  // iOS: rounded home pill. Android 12+ gesture nav: a slimmer, wider bar.
  return platform === "android"
    ? `<rect x="${SW / 2 - 54}" y="${SH - 11}" width="108" height="4" rx="2" fill="${color}"/>`
    : `<rect x="${SW / 2 - 67}" y="${SH - 12}" width="134" height="5" rx="2.5" fill="${color}"/>`;
}

/* --------------------------------- avatars ----------------------------------- */

const AVATAR_HUES: Array<[string, string]> = [
  ["#8e8e93", "#636366"],
  ["#5AC8FA", "#007AFF"],
  ["#FF9500", "#FF3B30"],
  ["#34C759", "#248A3D"],
  ["#BF5AF2", "#5E5CE6"],
];

export function initials(name: string): string {
  // code-point slicing — [0] on "🌙" yields a lone surrogate, which later
  // blows up encodeURIComponent ("URI malformed") when building the data URI
  const first = (s: string | undefined) => (s ? [...s][0] : "");
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((first(parts[0]) || "?") + first(parts[1])).toUpperCase();
}

/** Gradient initials disc (deterministic hue from the name), or the user's
 *  uploaded photo clipped to a circle when `imageUrl` is provided. */
export function avatar(
  name: string,
  cx: number,
  cy: number,
  r: number,
  idSuffix: string,
  imageUrl?: string
): string {
  const id = `av${idSuffix}`;
  if (imageUrl) {
    return `
<defs><clipPath id="${id}c"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath></defs>
<image href="${imageUrl}" x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id}c)"/>`;
  }
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const [a, b] = AVATAR_HUES[h % AVATAR_HUES.length];
  return `
<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/>
</linearGradient></defs>
<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id})"/>
<text font-family="${UI_FONT}" font-size="${r * 0.82}" font-weight="600" fill="#ffffff" text-anchor="middle" x="${cx}" y="${cy + r * 0.3}">${esc(initials(name))}</text>`;
}

/** Baseline of the first text line so the whole block sits optically centered
 *  in a bubble region — fixes "text not evenly distributed on the bubble".
 *  (Line center ≈ 0.36em above the baseline for UI fonts.) */
export function bubbleBaseline(
  regionTop: number,
  regionH: number,
  lineCount: number,
  lineH: number,
  fontSize: number
): number {
  return regionTop + (regionH - lineCount * lineH) / 2 + lineH / 2 + fontSize * 0.36;
}

/* ------------------------------ liquid glass ---------------------------------
   iOS 26 composer material: translucent pill, hairline highlight, soft float
   shadow. Shared by every app's chat bar. */

export function glassPill(x: number, y: number, w: number, h: number, dark: boolean): string {
  const fill = dark ? "rgba(44,44,50,0.78)" : "rgba(255,255,255,0.78)";
  const stroke = dark ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.95)";
  const shadow = dark ? "rgba(0,0,0,0.45)" : "rgba(20,20,40,0.14)";
  const inner = dark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.55)";
  return (
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}" stroke="${stroke}" stroke-width="1" style="filter:drop-shadow(0 4px 12px ${shadow})"/>` +
    `<rect x="${x + 1.5}" y="${y + 1.5}" width="${w - 3}" height="${h / 2}" rx="${(h - 3) / 2}" fill="${inner}" opacity="0.35"/>`
  );
}

export function micIcon(cx: number, cy: number, size: number, color: string): string {
  const r = size * 0.19;
  const capH = size * 0.55;
  return (
    `<rect x="${(cx - r).toFixed(1)}" y="${(cy - size * 0.48).toFixed(1)}" width="${(r * 2).toFixed(1)}" height="${capH.toFixed(1)}" rx="${r.toFixed(1)}" fill="none" stroke="${color}" stroke-width="${(size * 0.09).toFixed(2)}"/>` +
    `<path d="M${(cx - size * 0.34).toFixed(1)} ${(cy + size * 0.02).toFixed(1)} a ${(size * 0.34).toFixed(1)} ${(size * 0.34).toFixed(1)} 0 0 0 ${(size * 0.68).toFixed(1)} 0" fill="none" stroke="${color}" stroke-width="${(size * 0.09).toFixed(2)}" stroke-linecap="round"/>` +
    `<path d="M${cx} ${(cy + size * 0.36).toFixed(1)} v ${(size * 0.16).toFixed(1)}" stroke="${color}" stroke-width="${(size * 0.09).toFixed(2)}" stroke-linecap="round"/>`
  );
}

/** Rounded, cover-cropped image with an optional time chip (chat photo). */
export function imageBubble(
  url: string,
  x: number,
  y: number,
  w: number,
  h: number,
  keyId: string,
  opts?: { rx?: number; time?: string; font?: string }
): string {
  const rx = opts?.rx ?? 14;
  let s =
    `<defs><clipPath id="imb${keyId}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"/></clipPath></defs>` +
    `<image href="${url}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#imb${keyId})"/>`;
  if (opts?.time) {
    s +=
      `<rect x="${x + w - 42}" y="${y + h - 20}" width="46" height="16" rx="8" fill="rgba(0,0,0,0.38)"/>` +
      `<text font-family="${opts.font ?? UI_FONT}" font-size="10" fill="#fff" text-anchor="end" x="${x + w - 4}" y="${y + h - 8}">${esc(opts.time)}</text>`;
  }
  return s;
}

/* ---------------------------- attachment cards ------------------------------- */

const EXT_COLORS: Record<string, string> = {
  pdf: "#e5443b",
  doc: "#2b7cd3",
  docx: "#2b7cd3",
  xls: "#1f7244",
  xlsx: "#1f7244",
  ppt: "#d24726",
  zip: "#f0a020",
  file: "#8a8a94",
};

/** Document/file attachment card: colored file glyph + name + meta line. */
export function fileCard(opts: {
  x: number;
  y: number;
  w: number;
  name: string;
  ext?: string;
  meta?: string;
  cardBg: string;
  text: string;
  subtle: string;
  font: string;
}): { svg: string; h: number } {
  const { x, y, w } = opts;
  const h = 52;
  const ext = (opts.ext || opts.name.split(".").pop() || "file").toLowerCase().slice(0, 4);
  const col = EXT_COLORS[ext] ?? EXT_COLORS.file;
  const ic = x + 12;
  const iy = y + 10;
  const tx = ic + 40;
  const svg =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${opts.cardBg}"/>` +
    // file glyph with a folded corner
    `<path d="M${ic} ${iy} h18 l8 8 v16 a2 2 0 0 1 -2 2 h-24 a2 2 0 0 1 -2 -2 v-22 a2 2 0 0 1 2 -2 Z" fill="${col}"/>` +
    `<path d="M${ic + 18} ${iy} v8 h8 Z" fill="#ffffff" fill-opacity="0.45"/>` +
    `<text font-family="${opts.font}" font-size="7.5" font-weight="800" fill="#fff" text-anchor="middle" x="${ic + 15}" y="${iy + 26}">${esc(ext.toUpperCase())}</text>` +
    `<text font-family="${opts.font}" font-size="13.5" font-weight="600" fill="${opts.text}" x="${tx}" y="${y + 24}">${esc(opts.name.length > 26 ? opts.name.slice(0, 25) + "…" : opts.name)}</text>` +
    (opts.meta
      ? `<text font-family="${opts.font}" font-size="11.5" fill="${opts.subtle}" x="${tx}" y="${y + 40}">${esc(opts.meta)}</text>`
      : "");
  return { svg, h };
}

/** Link preview card: accent strip + title + domain (with a globe). */
export function linkCard(opts: {
  x: number;
  y: number;
  w: number;
  title?: string;
  domain: string;
  cardBg: string;
  stripBg: string;
  text: string;
  subtle: string;
  accent: string;
  font: string;
}): { svg: string; h: number } {
  const { x, y, w, font } = opts;
  const stripH = 46;
  const titleLines = opts.title ? wrapText(opts.title, 13, w - 24) : [];
  const bodyH = 20 + titleLines.length * 17 + 20;
  const h = stripH + bodyH;
  const svg =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${opts.cardBg}"/>` +
    `<path d="M${x} ${y + stripH} v-${stripH - 12} a12 12 0 0 1 12 -12 h${w - 24} a12 12 0 0 1 12 12 v${stripH - 12} Z" fill="${opts.stripBg}"/>` +
    // globe glyph centered on the strip
    `<circle cx="${x + w / 2}" cy="${y + stripH / 2}" r="11" fill="none" stroke="${opts.accent}" stroke-width="1.6"/>` +
    `<path d="M${x + w / 2 - 11} ${y + stripH / 2} h22 M${x + w / 2} ${y + stripH / 2 - 11} v22 M${x + w / 2 - 7} ${y + stripH / 2 - 6} a 13 13 0 0 0 14 0 M${x + w / 2 - 7} ${y + stripH / 2 + 6} a 13 13 0 0 1 14 0" fill="none" stroke="${opts.accent}" stroke-width="1.2"/>` +
    (titleLines.length
      ? `<text font-family="${font}" font-size="13" font-weight="600" fill="${opts.text}">${titleLines
          .map((l, i) => `<tspan x="${x + 12}" y="${y + stripH + 20 + i * 17}">${esc(l)}</tspan>`)
          .join("")}</text>`
      : "") +
    `<text font-family="${font}" font-size="11.5" fill="${opts.subtle}" x="${x + 12}" y="${y + h - 12}">${esc(opts.domain)}</text>`;
  return { svg, h };
}

/* -------------------------------- numbers ------------------------------------ */

/** X-style compact counts: 999 → 999, 12 345 → 12.3K, 4 200 000 → 4.2M. */
export function compact(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "0";
  if (n < 10_000) return n.toLocaleString("en-US");
  if (n < 1_000_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

export function svgDataUri(inner: string, logicalH: number = SH, logicalW: number = SW): string {
  const h3 = Math.round(logicalH * 3);
  const w3 = Math.round(logicalW * 3);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${logicalW} ${logicalH}" width="${w3}" height="${h3}">${inner}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
