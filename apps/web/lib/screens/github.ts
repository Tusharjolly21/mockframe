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
export const GITHUB_SA_H = 212; // logical height of the standalone card export

const LEVELS_LIGHT = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"];
const LEVELS_DARK = ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const COLS = 53;
const ROWS = 7;

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
      const threshold = density * (weekday ? 1.05 : 0.62);
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
function graphCard(parts: string[], doc: GithubDoc, c: GC, font: string, x: number, y: number, w: number): number {
  const cellLevels = githubCells(doc);
  parts.push(`<text font-family="${font}" font-size="14" font-weight="600" fill="${c.text}" x="${x + 16}" y="${y + 22}">${esc(doc.contributions)} contributions in ${esc(doc.year)}</text>`);
  const GRID_X = x + 16 + 22; // room for day labels
  const cell = 4.6;
  const gap = 1.5;
  const step = cell + gap;
  const gridTop = y + 48;

  // month labels
  for (let mi = 0; mi < 12; mi++) {
    const col = Math.round((mi * COLS) / 12);
    parts.push(`<text font-family="${font}" font-size="9" fill="${c.subtle}" x="${(GRID_X + col * step).toFixed(1)}" y="${y + 40}">${MONTHS[mi]}</text>`);
  }
  // day labels
  for (const [row, lbl] of [[1, "Mon"], [3, "Wed"], [5, "Fri"]] as const) {
    parts.push(`<text font-family="${font}" font-size="9" fill="${c.subtle}" text-anchor="end" x="${GRID_X - 6}" y="${(gridTop + row * step + cell).toFixed(1)}">${lbl}</text>`);
  }
  // cells
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      const lvl = cellLevels[col * ROWS + row] ?? 0;
      parts.push(`<rect x="${(GRID_X + col * step).toFixed(1)}" y="${(gridTop + row * step).toFixed(1)}" width="${cell}" height="${cell}" rx="1.3" fill="${c.levels[lvl]}"/>`);
    }
  }
  // legend
  const legY = gridTop + ROWS * step + 16;
  const legX0 = x + w - 16 - 5 * step - textWidth("More", 10) - 6;
  parts.push(`<text font-family="${font}" font-size="10" fill="${c.subtle}" text-anchor="end" x="${(legX0 - 6).toFixed(1)}" y="${legY + cell}">Less</text>`);
  for (let l = 0; l < 5; l++) parts.push(`<rect x="${(legX0 + l * step).toFixed(1)}" y="${legY}" width="${cell}" height="${cell}" rx="1.3" fill="${c.levels[l]}"/>`);
  parts.push(`<text font-family="${font}" font-size="10" fill="${c.subtle}" x="${(legX0 + 5 * step + 4).toFixed(1)}" y="${legY + cell}">More</text>`);
  return legY + cell + 14;
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
    const parts: string[] = [];
    // floating white card on a transparent page
    parts.push(`<rect x="8" y="8" width="${SW - 16}" height="${GITHUB_SA_H - 16}" rx="12" fill="${c.card}" stroke="${c.border}" stroke-width="1" style="filter:drop-shadow(0 6px 20px rgba(20,20,40,0.10))"/>`);
    graphCard(parts, doc, gc, font, 8, 12, SW - 16);
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
