"use client";

import {
  avatar,
  esc,
  homeIndicator,
  SH,
  statusBar,
  SW,
  textBlock as baseTextBlock,
  textWidth,
  wrapText,
} from "./common";
import { fontFor } from "./fonts";
import type { GithubDoc } from "./types";

/**
 * GitHub mobile profile with the signature contribution heatmap — 53 weeks × 7
 * days of green squares whose levels come from hand-painted `cells` or are
 * generated deterministically from a seed + density. Also a `standalone` mode
 * that renders JUST the contribution card (no phone chrome) for a card export.
 */

const MARGIN = 16;

export function githubStandaloneSize(doc: GithubDoc): { width: number; height: number } {
  return {
    width: Math.round(Math.min(1200, Math.max(520, doc.cardWidth ?? 960))),
    height: Math.round(Math.min(560, Math.max(240, doc.cardHeight ?? 260))),
  };
}

const LEVELS_LIGHT = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"];
const LEVELS_DARK = ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const COLS = 53;
const ROWS = 7;

function visibleMonths(doc: GithubDoc, includeEnd = false): string[] {
  const start = doc.range === "calendar-year" ? 0 : Math.max(0, Math.min(11, Math.round(doc.startMonth ?? 6)));
  return Array.from({ length: includeEnd ? 13 : 12 }, (_, index) => MONTHS[(start + index) % 12]);
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The 371 cell levels — painted `cells` win, else generated from seed+density. */
export function githubCells(doc: GithubDoc): number[] {
  if (doc.cells && doc.cells.length === COLS * ROWS) return doc.cells;
  const rng = mulberry32(doc.seed || 1);
  const density = Math.min(1, Math.max(0, doc.density));
  const out: number[] = [];
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      const weekday = row !== 0 && row !== 6;
      const r = rng();
      const progress = col / (COLS - 1);
      const recentActivity = doc.range === "last-year" ? 0.04 + 0.96 * Math.pow(progress, 4.5) : 1;
      const threshold = density * recentActivity * (weekday ? 1.05 : 0.62);
      if (r > threshold) out.push(0);
      else {
        const q = rng();
        out.push(q < 0.45 ? 1 : q < 0.75 ? 2 : q < 0.92 ? 3 : 4);
      }
    }
  }
  return out;
}

interface GC {
  levels: string[];
  text: string;
  subtle: string;
  border: string;
}

/** Draw the contribution card (title + grid + legend) at (x,y,w). Returns bottom Y. */
function graphCard(parts: string[], doc: GithubDoc, c: GC, font: string, x: number, y: number, w: number, contentScale = 1): number {
  const scale = Math.min(1.6, Math.max(0.65, contentScale));
  const cellLevels = githubCells(doc);
  const titleSize = 14 * scale;
  parts.push(`<text font-family="${font}" font-size="${titleSize.toFixed(1)}" font-weight="600" fill="${c.text}" x="${(x + 16 * scale).toFixed(1)}" y="${(y + 22 * scale).toFixed(1)}">${esc(doc.contributions)} contributions in ${esc(doc.year)}</text>`);
  const GRID_X = x + 38 * scale; // room for day labels
  const maxStep = Math.max(3.5, (w - 54 * scale) / COLS);
  const step = Math.min(6.1 * scale, maxStep);
  const cell = step * 0.754;
  const gridTop = y + 48 * scale;

  // month labels
  const months = visibleMonths(doc);
  for (let mi = 0; mi < months.length; mi++) {
    const col = Math.round((mi * COLS) / 12);
    parts.push(`<text font-family="${font}" font-size="${(9 * scale).toFixed(1)}" fill="${c.subtle}" x="${(GRID_X + col * step).toFixed(1)}" y="${(y + 40 * scale).toFixed(1)}">${months[mi]}</text>`);
  }
  // day labels
  for (const [row, lbl] of [[1, "Mon"], [3, "Wed"], [5, "Fri"]] as const) {
    parts.push(`<text font-family="${font}" font-size="${(9 * scale).toFixed(1)}" fill="${c.subtle}" text-anchor="end" x="${(GRID_X - 6 * scale).toFixed(1)}" y="${(gridTop + row * step + cell).toFixed(1)}">${lbl}</text>`);
  }
  // cells
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      const lvl = cellLevels[col * ROWS + row] ?? 0;
      parts.push(`<rect x="${(GRID_X + col * step).toFixed(1)}" y="${(gridTop + row * step).toFixed(1)}" width="${cell}" height="${cell}" rx="1.3" fill="${c.levels[lvl]}"/>`);
    }
  }
  // legend
  const legY = gridTop + ROWS * step + 16 * scale;
  const legendSize = 10 * scale;
  const legX0 = x + w - 16 * scale - 5 * step - textWidth("More", legendSize) - 6 * scale;
  parts.push(`<text font-family="${font}" font-size="${legendSize.toFixed(1)}" fill="${c.subtle}" text-anchor="end" x="${(legX0 - 6 * scale).toFixed(1)}" y="${(legY + cell).toFixed(1)}">Less</text>`);
  for (let l = 0; l < 5; l++) parts.push(`<rect x="${(legX0 + l * step).toFixed(1)}" y="${legY}" width="${cell}" height="${cell}" rx="1.3" fill="${c.levels[l]}"/>`);
  parts.push(`<text font-family="${font}" font-size="${legendSize.toFixed(1)}" fill="${c.subtle}" x="${(legX0 + 5 * step + 4 * scale).toFixed(1)}" y="${(legY + cell).toFixed(1)}">More</text>`);
  return legY + cell + 14 * scale;
}

export function renderGithub(doc: GithubDoc, avatarUrl?: string): string {
  const platform = doc.chrome.platform ?? "ios";
  const font = fontFor("github", platform);
  const textBlock = (lines: string[], o: Parameters<typeof baseTextBlock>[1]) => baseTextBlock(lines, { font, ...o });
  const dark = !!doc.chrome.dark;
  const c = dark
    ? { bg: "#0d1117", card: "#0d1117", border: "#30363d", text: "#e6edf3", subtle: "#7d8590", btn: "#21262d", btnBorder: "#30363d", levels: LEVELS_DARK, blue: "#2f81f7" }
    : { bg: "#ffffff", card: "#ffffff", border: "#d0d7de", text: "#1f2328", subtle: "#656d76", btn: "#f6f8fa", btnBorder: "#d0d7de", levels: LEVELS_LIGHT, blue: "#0969da" };
  const gc: GC = { levels: c.levels, text: c.text, subtle: c.subtle, border: c.border };

  /* ------------------------------ standalone -------------------------------- */
  if (doc.standalone) {
    const { width, height } = githubStandaloneSize(doc);
    const scale = Math.min(1.3, Math.max(0.75, doc.contentScale ?? 1));
    const parts: string[] = [];
    const showYearRail = (doc.showYearRail ?? true) && width >= 700;
    const showSettings = doc.showSettings ?? true;
    const showLegend = doc.showLegend ?? true;
    const showLearnLink = doc.showLearnLink ?? true;
    const railW = showYearRail ? 122 * scale : 0;
    const mainW = width - railW;
    const pad = 18 * scale;
    const boxX = pad;
    const boxY = 58 * scale;
    const boxW = mainW - pad * 2;
    const boxH = height - boxY - pad;
    const title = doc.range === "calendar-year"
      ? `${doc.contributions} contributions in ${doc.year}`
      : `${doc.contributions} contributions in the last year`;

    parts.push(`<rect width="${width}" height="${height}" fill="${c.bg}"/>`);
    parts.push(`<text font-family="${font}" font-size="${(18 * scale).toFixed(1)}" font-weight="500" fill="${c.text}" x="${pad.toFixed(1)}" y="${(35 * scale).toFixed(1)}">${esc(title)}</text>`);
    if (showSettings) {
      const settingsX = mainW - pad - 14 * scale;
      parts.push(
        `<text font-family="${font}" font-size="${(13 * scale).toFixed(1)}" fill="${c.subtle}" text-anchor="end" x="${settingsX.toFixed(1)}" y="${(35 * scale).toFixed(1)}">Contribution settings</text>`,
        `<path d="M${(settingsX + 7 * scale).toFixed(1)} ${(29 * scale).toFixed(1)} l${(4 * scale).toFixed(1)} ${(4 * scale).toFixed(1)} l${(4 * scale).toFixed(1)} -${(4 * scale).toFixed(1)}" fill="none" stroke="${c.subtle}" stroke-width="${(1.5 * scale).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/>`
      );
    }
    parts.push(`<rect x="${boxX.toFixed(1)}" y="${boxY.toFixed(1)}" width="${boxW.toFixed(1)}" height="${boxH.toFixed(1)}" rx="${(7 * scale).toFixed(1)}" fill="${c.card}" stroke="${c.border}" stroke-width="1"/>`);

    const gridX = boxX + 56 * scale;
    const gridTop = boxY + 43 * scale;
    const footerH = 42 * scale;
    const stepX = (boxW - 72 * scale) / COLS;
    const stepY = (boxH - (gridTop - boxY) - footerH) / ROWS;
    const step = Math.max(4, Math.min(stepX, stepY));
    const cell = Math.max(2.8, step - 2 * scale);
    const months = visibleMonths(doc, true);
    months.forEach((month, index) => {
      const col = (index * (COLS - 1)) / 12;
      parts.push(`<text font-family="${font}" font-size="${(11 * scale).toFixed(1)}" fill="${c.text}" x="${(gridX + col * step).toFixed(1)}" y="${(boxY + 30 * scale).toFixed(1)}">${month}</text>`);
    });
    for (const [row, label] of [[1, "Mon"], [3, "Wed"], [5, "Fri"]] as const) {
      parts.push(`<text font-family="${font}" font-size="${(11 * scale).toFixed(1)}" fill="${c.text}" text-anchor="end" x="${(gridX - 9 * scale).toFixed(1)}" y="${(gridTop + row * step + cell).toFixed(1)}">${label}</text>`);
    }
    const cellLevels = githubCells(doc);
    for (let col = 0; col < COLS; col++) {
      for (let row = 0; row < ROWS; row++) {
        const level = cellLevels[col * ROWS + row] ?? 0;
        parts.push(`<rect x="${(gridX + col * step).toFixed(1)}" y="${(gridTop + row * step).toFixed(1)}" width="${cell.toFixed(1)}" height="${cell.toFixed(1)}" rx="${(1.6 * scale).toFixed(1)}" fill="${c.levels[level]}" stroke="${c.border}" stroke-width="0.35"/>`);
      }
    }

    const footerY = boxY + boxH - 18 * scale;
    if (showLearnLink) parts.push(`<text font-family="${font}" font-size="${(11.5 * scale).toFixed(1)}" fill="${c.subtle}" x="${gridX.toFixed(1)}" y="${footerY.toFixed(1)}">Learn how we count contributions</text>`);
    if (showLegend) {
      const legendSize = 11.5 * scale;
      const legendStep = 14 * scale;
      const legendX = boxX + boxW - 132 * scale;
      parts.push(`<text font-family="${font}" font-size="${legendSize.toFixed(1)}" fill="${c.subtle}" text-anchor="end" x="${(legendX - 6 * scale).toFixed(1)}" y="${footerY.toFixed(1)}">Less</text>`);
      for (let level = 0; level < 5; level++) parts.push(`<rect x="${(legendX + level * legendStep).toFixed(1)}" y="${(footerY - 10 * scale).toFixed(1)}" width="${(10 * scale).toFixed(1)}" height="${(10 * scale).toFixed(1)}" rx="${(1.8 * scale).toFixed(1)}" fill="${c.levels[level]}" stroke="${c.border}" stroke-width="0.35"/>`);
      parts.push(`<text font-family="${font}" font-size="${legendSize.toFixed(1)}" fill="${c.subtle}" x="${(legendX + 5 * legendStep + 2 * scale).toFixed(1)}" y="${footerY.toFixed(1)}">More</text>`);
    }

    if (showYearRail) {
      const selected = Number.parseInt(doc.year, 10) || new Date().getFullYear();
      const railX = mainW + 14 * scale;
      const railItemW = railW - 26 * scale;
      const railItemH = 42 * scale;
      parts.push(`<rect x="${railX.toFixed(1)}" y="${(8 * scale).toFixed(1)}" width="${railItemW.toFixed(1)}" height="${railItemH.toFixed(1)}" rx="${(7 * scale).toFixed(1)}" fill="${c.blue}"/>`);
      parts.push(`<text font-family="${font}" font-size="${(14 * scale).toFixed(1)}" font-weight="600" fill="#ffffff" x="${(railX + 16 * scale).toFixed(1)}" y="${(35 * scale).toFixed(1)}">${selected}</text>`);
      for (let index = 1; index < 5; index++) {
        parts.push(`<text font-family="${font}" font-size="${(14 * scale).toFixed(1)}" fill="${c.subtle}" x="${(railX + 16 * scale).toFixed(1)}" y="${((35 + index * 45) * scale).toFixed(1)}">${selected - index}</text>`);
      }
    }
    return parts.join("\n");
  }

  /* ------------------------------- full phone ------------------------------- */
  const parts: string[] = [`<rect width="${SW}" height="${SH}" fill="${c.bg}"/>`];
  parts.push(statusBar({ time: doc.chrome.time, battery: doc.chrome.battery, color: c.text, platform }));

  parts.push(avatar(doc.name, MARGIN + 30, 100, 30, "gh", avatarUrl));
  parts.push(
    `<text font-family="${font}" font-size="19" font-weight="800" fill="${c.text}" x="88" y="92">${esc(doc.name)}</text>`,
    `<text font-family="${font}" font-size="15" fill="${c.subtle}" x="88" y="112">${esc(doc.login)}</text>`
  );
  let y = 152;
  if (doc.bio) {
    const bioLines = wrapText(doc.bio, 13.5, SW - MARGIN * 2).slice(0, 2);
    parts.push(textBlock(bioLines, { x: MARGIN, y, size: 13.5, lineHeight: 18, color: c.text }));
    y += bioLines.length * 18 + 8;
  }
  parts.push(
    `<circle cx="${MARGIN + 6}" cy="${y - 4}" r="6" fill="none" stroke="${c.subtle}" stroke-width="1.5"/><path d="M${MARGIN + 1} ${y + 4} a6 4 0 0 1 10 0" fill="none" stroke="${c.subtle}" stroke-width="1.5"/>`,
    `<text font-family="${font}" font-size="13" fill="${c.subtle}" x="${MARGIN + 20}" y="${y}"><tspan font-weight="700" fill="${c.text}">${esc(doc.followers ?? "0")}</tspan> followers · <tspan font-weight="700" fill="${c.text}">${esc(doc.following ?? "0")}</tspan> following</text>`
  );
  y += 18;
  parts.push(
    `<rect x="${MARGIN}" y="${y}" width="${SW - MARGIN * 2}" height="34" rx="7" fill="${c.btn}" stroke="${c.btnBorder}" stroke-width="1"/>`,
    `<text font-family="${font}" font-size="13.5" font-weight="600" fill="${c.text}" text-anchor="middle" x="${SW / 2}" y="${y + 22}">Follow</text>`
  );
  y += 34 + 22;

  const cardY = y;
  parts.push(`<rect x="${MARGIN}" y="${cardY}" width="${SW - MARGIN * 2}" height="152" rx="8" fill="none" stroke="${c.border}" stroke-width="1"/>`);
  y = graphCard(parts, doc, gc, font, MARGIN, cardY, SW - MARGIN * 2) + 24;

  /* pinned repos */
  parts.push(`<text font-family="${font}" font-size="12.5" font-weight="600" fill="${c.subtle}" x="${MARGIN}" y="${y}">Pinned</text>`);
  y += 12;
  const repos: Array<[string, string, string, string, string]> = [
    ["mockframe / studio", "Screenshot mockup studio — compose app screens & export video", "TypeScript", "#3178c6", "1.2k"],
    [`${doc.login} / dotfiles`, "My editor, shell & terminal setup", "Shell", "#89e051", "84"],
  ];
  for (const [name, desc, lang, langColor, stars] of repos) {
    const descLines = wrapText(desc, 12, SW - MARGIN * 2 - 24).slice(0, 2);
    const rh = 30 + descLines.length * 16 + 22;
    parts.push(
      `<rect x="${MARGIN}" y="${y}" width="${SW - MARGIN * 2}" height="${rh}" rx="8" fill="${c.card}" stroke="${c.border}" stroke-width="1"/>`,
      `<path d="M${MARGIN + 14} ${y + 16} a4 4 0 0 1 4 -4 h9 v13 h-9 a4 4 0 0 0 -4 2 Z" fill="none" stroke="${c.subtle}" stroke-width="1.4" stroke-linejoin="round"/>`,
      `<text font-family="${font}" font-size="13" font-weight="700" fill="${c.blue}" x="${MARGIN + 32}" y="${y + 21}">${esc(name)}</text>`
    );
    parts.push(textBlock(descLines, { x: MARGIN + 14, y: y + 40, size: 12, lineHeight: 16, color: c.subtle }));
    const metaY = y + 40 + descLines.length * 16 + 2;
    parts.push(
      `<circle cx="${MARGIN + 18}" cy="${metaY - 4}" r="5" fill="${langColor}"/>`,
      `<text font-family="${font}" font-size="11.5" fill="${c.subtle}" x="${MARGIN + 28}" y="${metaY}">${esc(lang)}</text>`,
      `<path d="M${MARGIN + 92} ${metaY - 8} l1.6 3.4 3.7 0.4 -2.8 2.5 0.8 3.6 -3.3 -1.9 -3.3 1.9 0.8 -3.6 -2.8 -2.5 3.7 -0.4 Z" fill="none" stroke="${c.subtle}" stroke-width="1.1" stroke-linejoin="round"/>`,
      `<text font-family="${font}" font-size="11.5" fill="${c.subtle}" x="${MARGIN + 104}" y="${metaY}">${esc(stars)}</text>`
    );
    y += rh + 10;
  }

  parts.push(homeIndicator(c.text, platform));
  return parts.join("\n");
}
