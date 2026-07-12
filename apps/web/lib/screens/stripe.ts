"use client";

import { esc, homeIndicator, SH, statusBar, SW, textWidth } from "./common";
import { fontFor } from "./fonts";
import type { StripeDoc } from "./types";

/**
 * Stripe-dashboard style revenue chart: metric label + big amount + delta
 * badge, a smooth area chart with an indigo gradient fill and a dashed
 * previous-period line. Also a `standalone` mode that renders JUST the chart
 * card (no phone chrome) for a card export.
 */

const MARGIN = 20;
export const STRIPE_SA_H = 320; // logical height of the standalone card export

interface Pt {
  x: number;
  y: number;
}

/** Catmull-Rom → cubic bezier smooth path through the points. */
function smoothPath(pts: Pt[]): string {
  if (pts.length < 2) return pts.length ? `M ${pts[0].x} ${pts[0].y}` : "";
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

interface SC {
  surface: string;
  border: string;
  text: string;
  subtle: string;
  grid: string;
  up: string;
  down: string;
}

/** Draw the metric header + area chart inside a card rect. */
function metricCard(parts: string[], doc: StripeDoc, c: SC, accent: string, font: string, cardX: number, cardY: number, cardW: number, cardH: number): void {
  const pad = 18;
  const ix = cardX + pad;
  parts.push(
    `<text font-family="${font}" font-size="13" font-weight="500" fill="${c.subtle}" x="${ix}" y="${cardY + 30}">${esc(doc.metric)}</text>`,
    `<text font-family="${font}" font-size="30" font-weight="700" fill="${c.text}" x="${ix}" y="${cardY + 66}">${esc(doc.amount)}</text>`
  );
  const up = doc.deltaUp !== false;
  const deltaCol = up ? c.up : c.down;
  const badgeY = cardY + 80;
  parts.push(
    up
      ? `<path d="M${ix + 5} ${badgeY + 5} l4 -5 4 5" fill="none" stroke="${deltaCol}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`
      : `<path d="M${ix + 5} ${badgeY} l4 5 4 -5" fill="none" stroke="${deltaCol}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<text font-family="${font}" font-size="13" font-weight="600" fill="${deltaCol}" x="${ix + 16}" y="${badgeY + 5}">${esc(doc.delta)}</text>`,
    `<text font-family="${font}" font-size="12.5" fill="${c.subtle}" x="${ix + 16 + textWidth(doc.delta, 13) + 8}" y="${badgeY + 5}">vs. prior period</text>`
  );

  const plotX = ix;
  const plotW = cardW - pad * 2;
  const plotTop = cardY + 108;
  const plotBottom = cardY + cardH - 30;
  const plotH = plotBottom - plotTop;

  const series = doc.series.length >= 2 ? doc.series : [1, 1];
  const prev = doc.prevSeries && doc.prevSeries.length >= 2 ? doc.prevSeries : undefined;
  const all = [...series, ...(prev ?? [])];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const toPt = (arr: number[], i: number): Pt => ({
    x: plotX + (arr.length === 1 ? 0 : (i / (arr.length - 1)) * plotW),
    y: plotBottom - ((arr[i] - min) / span) * plotH,
  });

  for (let g = 0; g <= 2; g++) {
    const gy = plotTop + (g / 2) * plotH;
    parts.push(`<line x1="${plotX}" y1="${gy.toFixed(1)}" x2="${plotX + plotW}" y2="${gy.toFixed(1)}" stroke="${c.grid}" stroke-width="1"/>`);
  }

  const pts = series.map((_, i) => toPt(series, i));
  const linePath = smoothPath(pts);
  const gid = `stripeg${Math.round(cardY)}`;
  parts.push(
    `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${accent}" stop-opacity="0.28"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></linearGradient></defs>`,
    `<path d="${linePath} L ${(plotX + plotW).toFixed(1)} ${plotBottom.toFixed(1)} L ${plotX.toFixed(1)} ${plotBottom.toFixed(1)} Z" fill="url(#${gid})"/>`
  );
  if (prev) {
    const pPts = prev.map((_, i) => toPt(prev, i));
    parts.push(`<path d="${smoothPath(pPts)}" fill="none" stroke="${c.subtle}" stroke-width="1.4" stroke-dasharray="3 3" opacity="0.7"/>`);
  }
  parts.push(`<path d="${linePath}" fill="none" stroke="${accent}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`);
  const last = pts[pts.length - 1];
  parts.push(`<circle cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="3.5" fill="${accent}" stroke="${c.surface}" stroke-width="2"/>`);

  ["7 days ago", "", "Today"].forEach((lbl, i) => {
    if (!lbl) return;
    const lx = plotX + (i / 2) * plotW;
    parts.push(`<text font-family="${font}" font-size="10.5" fill="${c.subtle}" text-anchor="${i === 0 ? "start" : "end"}" x="${lx.toFixed(1)}" y="${plotBottom + 22}">${lbl}</text>`);
  });
}

export function renderStripe(doc: StripeDoc): string {
  const platform = doc.chrome.platform ?? "ios";
  const font = fontFor("stripe", platform);
  const dark = !!doc.chrome.dark;
  const accent = doc.color || "#635bff";
  const c: SC & { bg: string; chip: string } = dark
    ? { bg: "#16161a", surface: "#1c1c22", border: "#2a2a32", text: "#ededf0", subtle: "#9a9aa8", chip: "#23232b", grid: "#26262e", up: "#3fce8f", down: "#ff6b6b" }
    : { bg: "#ffffff", surface: "#ffffff", border: "#e3e8ee", text: "#1a1f36", subtle: "#697386", chip: "#f6f8fa", grid: "#eef1f6", up: "#159c4f", down: "#e25950" };

  /* ------------------------------ standalone -------------------------------- */
  if (doc.standalone) {
    const parts: string[] = [];
    parts.push(`<rect x="8" y="8" width="${SW - 16}" height="${STRIPE_SA_H - 16}" rx="16" fill="${c.surface}" stroke="${c.border}" stroke-width="1" style="filter:drop-shadow(0 6px 24px rgba(20,20,40,0.12))"/>`);
    metricCard(parts, doc, c, accent, font, 8, 10, SW - 16, STRIPE_SA_H - 20);
    return parts.join("\n");
  }

  /* ------------------------------- full phone ------------------------------- */
  const parts: string[] = [`<rect width="${SW}" height="${SH}" fill="${c.bg}"/>`];
  parts.push(statusBar({ time: doc.chrome.time, battery: doc.chrome.battery, color: c.text, platform }));
  parts.push(
    `<path d="M26 62 l-10 11 10 11" fill="none" stroke="${c.text}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<text font-family="${font}" font-size="16" font-weight="700" fill="${c.text}" text-anchor="middle" x="${SW / 2}" y="80">Overview</text>`,
    `<rect x="${SW - 120}" y="66" width="104" height="28" rx="8" fill="${c.chip}" stroke="${c.border}" stroke-width="1"/>`,
    `<text font-family="${font}" font-size="11.5" fill="${c.text}" text-anchor="middle" x="${SW - 74}" y="84">${esc(doc.range)}</text>`,
    `<path d="M${SW - 34} 78 l4 4 4 -4" fill="none" stroke="${c.subtle}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`
  );

  const cardY = 112;
  const cardH = 340;
  parts.push(`<rect x="${MARGIN}" y="${cardY}" width="${SW - MARGIN * 2}" height="${cardH}" rx="14" fill="${c.surface}" stroke="${c.border}" stroke-width="1"/>`);
  metricCard(parts, doc, c, accent, font, MARGIN, cardY, SW - MARGIN * 2, cardH - 24);

  /* range chips */
  const chips = ["1D", "7D", "4W", "3M", "12M"];
  const activeChip = 1;
  let chX = MARGIN;
  const chipsY = cardY + cardH + 16;
  for (let i = 0; i < chips.length; i++) {
    const active = i === activeChip;
    const cw = textWidth(chips[i], 12) + 22;
    parts.push(
      `<rect x="${chX}" y="${chipsY}" width="${cw.toFixed(1)}" height="30" rx="8" fill="${active ? accent : c.chip}" ${active ? "" : `stroke="${c.border}" stroke-width="1"`}/>`,
      `<text font-family="${font}" font-size="12" font-weight="600" fill="${active ? "#ffffff" : c.subtle}" text-anchor="middle" x="${(chX + cw / 2).toFixed(1)}" y="${chipsY + 19}">${chips[i]}</text>`
    );
    chX += cw + 8;
  }

  /* summary metric rows */
  const sy = chipsY + 30 + 26;
  const rows: Array<[string, string]> = [
    ["Net volume", "$22,109.40"],
    ["New customers", "128"],
    ["Successful payments", "1,204"],
  ];
  parts.push(`<rect x="${MARGIN}" y="${sy - 18}" width="${SW - MARGIN * 2}" height="${rows.length * 44 + 8}" rx="14" fill="${c.surface}" stroke="${c.border}" stroke-width="1"/>`);
  for (let i = 0; i < rows.length; i++) {
    const [label, val] = rows[i];
    const ry = sy + i * 44 + 10;
    parts.push(
      `<text font-family="${font}" font-size="13" fill="${c.subtle}" x="${MARGIN + 16}" y="${ry}">${esc(label)}</text>`,
      `<text font-family="${font}" font-size="13.5" font-weight="700" fill="${c.text}" text-anchor="end" x="${SW - MARGIN - 16}" y="${ry}">${esc(val)}</text>`
    );
    if (i < rows.length - 1) parts.push(`<line x1="${MARGIN + 16}" y1="${ry + 14}" x2="${SW - MARGIN - 16}" y2="${ry + 14}" stroke="${c.grid}" stroke-width="1"/>`);
  }

  parts.push(homeIndicator(c.text, platform));
  return parts.join("\n");
}
