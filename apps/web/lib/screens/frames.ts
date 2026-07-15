"use client";

import { esc, SW } from "./common";

/**
 * Window-frame chrome for the standalone Template cards (PostSpark's Frame
 * picker): wraps ANY content rectangle in one of eight window styles. Pure SVG,
 * variable height — the card grows to fit its content. Shared by the Code /
 * Bluesky / X-post templates so every template gets every frame for free.
 */

export type FrameStyle = "none" | "macos" | "safari" | "card" | "stack" | "stack2" | "arc" | "windows";

export const FRAME_STYLES: FrameStyle[] = ["none", "macos", "safari", "card", "stack", "stack2", "arc", "windows"];

export const FRAME_LABELS: Record<FrameStyle, string> = {
  none: "None",
  macos: "macOS",
  safari: "Safari",
  card: "Card",
  stack: "Stack",
  stack2: "Stack 2",
  arc: "Arc",
  windows: "Windows",
};

export interface FrameTheme {
  /** content surface color (the card fill) */
  cardBg: string;
  /** chrome bar background */
  barBg: string;
  /** chrome text / icon color */
  barText: string;
  dark: boolean;
  /** shown in the address bar / title */
  title?: string;
}

/** Draw content into (x, y, w); return the pixel height it consumed. */
export type ContentDrawer = (x: number, y: number, w: number) => { svg: string; height: number };

export interface FramedResult {
  svg: string;
  totalH: number;
  totalW: number;
}

const M = 16; // outer margin within the SW-wide canvas
const RX_DEFAULT = 15;

function barHeight(style: FrameStyle): number {
  if (style === "safari") return 46;
  if (style === "macos") return 40;
  if (style === "windows") return 34;
  if (style === "arc") return 34;
  return 0;
}

function dots(x: number, cy: number): string {
  return ["#ff5f57", "#febc2e", "#28c840"].map((f, i) => `<circle cx="${x + i * 18}" cy="${cy}" r="5.5" fill="${f}"/>`).join("");
}

function drawBar(style: FrameStyle, th: FrameTheme, x: number, y: number, w: number, h: number): string {
  const cy = y + h / 2;
  const title = esc(th.title ?? "");
  if (style === "macos") {
    return dots(x + 18, cy) + `<text font-family="-apple-system,system-ui,sans-serif" font-size="12.5" fill="${th.barText}" text-anchor="middle" x="${x + w / 2}" y="${cy + 4}">${title}</text>`;
  }
  if (style === "safari") {
    const pillX = x + 112;
    const pillW = w - 112 - 76;
    const pill = th.dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)";
    const stroke = th.dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.09)";
    const lockX = pillX + 12;
    return (
      dots(x + 18, cy) +
      `<path d="M${x + 82} ${cy - 5} l-5 5 l5 5" fill="none" stroke="${th.barText}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="M${x + 94} ${cy - 5} l5 5 l-5 5" fill="none" stroke="${th.barText}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/>` +
      `<rect x="${pillX}" y="${cy - 11}" width="${pillW}" height="22" rx="6" fill="${pill}" stroke="${stroke}" stroke-width="1"/>` +
      `<rect x="${lockX}" y="${cy - 3}" width="6" height="5" rx="1" fill="none" stroke="${th.barText}" stroke-width="1.1"/>` +
      `<path d="M${lockX + 1.5} ${cy - 3} v-1.5 a1.5 1.5 0 0 1 3 0 v1.5" fill="none" stroke="${th.barText}" stroke-width="1.1"/>` +
      `<text font-family="-apple-system,system-ui,sans-serif" font-size="11" fill="${th.barText}" text-anchor="start" x="${lockX + 14}" y="${cy + 4}">${title}</text>` +
      `<path d="M${x + w - 56} ${cy + 4} v-11 m-4 4 l4 -4 4 4 m-11 5 v6 h14 v-6" fill="none" stroke="${th.barText}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="M${x + w - 32} ${cy - 6} v12 m-6 -6 h12" stroke="${th.barText}" stroke-width="1.6" stroke-linecap="round"/>`
    );
  }
  if (style === "windows") {
    return (
      `<text font-family="'Segoe UI',system-ui,sans-serif" font-size="12" fill="${th.barText}" x="${x + 14}" y="${cy + 4}">${title}</text>` +
      // minimize / maximize / close on the right
      `<path d="M${x + w - 66} ${cy} h10" stroke="${th.barText}" stroke-width="1.3"/>` +
      `<rect x="${x + w - 44}" y="${cy - 5}" width="10" height="10" rx="1" fill="none" stroke="${th.barText}" stroke-width="1.3"/>` +
      `<path d="M${x + w - 22} ${cy - 5} l10 10 m0 -10 l-10 10" stroke="${th.barText}" stroke-width="1.3" stroke-linecap="round"/>`
    );
  }
  // arc — slim bar: dots + centered pill, warm accent tick
  const pillW = Math.min(w - 120, 190);
  const px = x + w / 2 - pillW / 2;
  const pill = th.dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.045)";
  return (
    dots(x + 16, cy) +
    `<rect x="${px}" y="${cy - 9}" width="${pillW}" height="18" rx="9" fill="${pill}"/>` +
    `<text font-family="system-ui,sans-serif" font-size="11" fill="${th.barText}" text-anchor="middle" x="${px + pillW / 2}" y="${cy + 3.5}">${title}</text>` +
    `<circle cx="${x + w - 24}" cy="${cy}" r="4.5" fill="none" stroke="${th.barText}" stroke-width="1.4"/>`
  );
}

/** Optional per-card look overrides (pika-style Roundness / Shadow sliders). */
export type FrameLook = { radius?: number; shadow?: number };

export function renderFramed(style: FrameStyle, th: FrameTheme, draw: ContentDrawer, viewportW: number = SW, look?: FrameLook): FramedResult {
  const RX = Math.max(0, Math.min(40, look?.radius ?? RX_DEFAULT));
  const barH = barHeight(style);
  const pad = style === "card" ? 18 : 0; // Card style insets the content
  const stackDR = style === "stack" ? 10 : 0; // down-right peek
  const stack2 = style === "stack2";
  const topRoom = stack2 ? 12 : 0;
  const sideRoom = stack2 ? 14 : stackDR;

  const cardX = M;
  const cardY = M + topRoom;
  const cardW = viewportW - 2 * M - sideRoom;

  const contentX = cardX + pad;
  const contentW = cardW - 2 * pad;
  const contentY = cardY + barH + pad;
  const { svg: content, height: contentH } = draw(contentX, contentY, contentW);

  const cardH = barH + pad + contentH + pad;
  const totalH = cardY + cardH + stackDR + M;

  // shadow: 0 = none, 1 = default soft, up to 2 = dramatic
  const sh = Math.max(0, Math.min(2, look?.shadow ?? 1));
  const shAlpha = (th.dark ? 0.5 : 0.2) * sh;
  const shadow = th.dark ? `rgba(0,0,0,${shAlpha.toFixed(3)})` : `rgba(20,20,45,${shAlpha.toFixed(3)})`;
  const shadowFilter = sh > 0.001 ? `filter:drop-shadow(0 ${(14 * sh).toFixed(1)}px ${(38 * sh).toFixed(1)}px ${shadow})` : "";
  const cx = cardX + cardW / 2;
  const cy = cardY + cardH / 2;
  const parts: string[] = [];

  // cards peeking behind (stack variants)
  if (style === "stack") {
    parts.push(`<rect x="${cardX + stackDR}" y="${cardY + stackDR}" width="${cardW}" height="${cardH}" rx="${RX}" fill="${th.cardBg}" opacity="0.5"/>`);
    parts.push(`<rect x="${cardX + stackDR / 2}" y="${cardY + stackDR / 2}" width="${cardW}" height="${cardH}" rx="${RX}" fill="${th.cardBg}" opacity="0.78"/>`);
  } else if (stack2) {
    parts.push(`<rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="${RX}" fill="${th.cardBg}" opacity="0.5" transform="rotate(-4.5 ${cx} ${cy})"/>`);
    parts.push(`<rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="${RX}" fill="${th.cardBg}" opacity="0.78" transform="rotate(3 ${cx} ${cy})"/>`);
  }

  // main card + soft shadow
  if (style !== "none") {
    parts.push(`<rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="${RX}" fill="${th.cardBg}"${shadowFilter ? ` style="${shadowFilter}"` : ""}/>`);
    if (style === "card") {
      parts.push(`<rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="${RX}" fill="none" stroke="${th.dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}" stroke-width="1"/>`);
    }
  }

  // content clipped to the rounded card (bar, if any, is painted over its top)
  const clip = "fclip";
  parts.push(`<defs><clipPath id="${clip}"><rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="${RX}"/></clipPath></defs>`);
  parts.push(`<g clip-path="url(#${clip})">${content}</g>`);

  // chrome bar over the content's top strip
  if (barH > 0) {
    parts.push(`<path d="M${cardX} ${cardY + barH} v-${barH - RX} a${RX} ${RX} 0 0 1 ${RX} -${RX} h${cardW - 2 * RX} a${RX} ${RX} 0 0 1 ${RX} ${RX} v${barH - RX} Z" fill="${th.barBg}"/>`);
    parts.push(drawBar(style, th, cardX, cardY, cardW, barH));
    parts.push(`<rect x="${cardX}" y="${cardY + barH - 0.5}" width="${cardW}" height="0.5" fill="${th.dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)"}"/>`);
  }

  return { svg: parts.join("\n"), totalH, totalW: viewportW };
}
