"use client";

import {
  bubbleBaseline,
  esc,
  homeIndicator,
  micIcon,
  SH,
  statusBar,
  SW,
  textBlock,
  textWidth,
  typingDots,
  wrapText,
} from "./common";
import { fontFor } from "./fonts";
import { AI_MODEL_LABELS, type AiCard, type AiChatDoc, type AiModel } from "./types";
import type { Platform } from "./common";

/**
 * AI assistant chat (ChatGPT / Claude / Gemini / Grok / Perplexity), mobile
 * app style: model-themed header + logo, right-aligned user bubbles, and
 * FULL-WIDTH assistant answers with light markdown — **bold**, `inline code`,
 * ```fenced blocks```, and "- " bullets. This is Mockly's headline category
 * brought into the `screen:` architecture (framekit-screen-studio.md §15).
 */

const MONO = "'SF Mono','JetBrains Mono',ui-monospace,Menlo,Consolas,monospace";
const MARGIN = 18;
const BODY = SW - MARGIN * 2;
const FONT = 16;
const LINE_H = 23;

interface Theme {
  bg: string;
  text: string;
  subtle: string;
  hairline: string;
  userBubble: string;
  userText: string;
  codeBg: string;
  codeText: string;
  inlineCode: string;
  accent: string;
  font: string;
}

function theme(model: AiModel, dark: boolean, platform: Platform = "ios"): Theme {
  const base = dark
    ? { bg: "#212121", text: "#ececec", subtle: "#9a9a9a", hairline: "#3a3a3a", userBubble: "#303030", userText: "#ececec", codeBg: "#0d0d0d", codeText: "#e6e6e6" }
    : { bg: "#ffffff", text: "#0d0d0d", subtle: "#8f8f8f", hairline: "#ececec", userBubble: "#f4f4f4", userText: "#0d0d0d", codeBg: "#f6f8fa", codeText: "#1f2328" };
  const accent: Record<AiModel, string> = {
    chatgpt: "#10a37f",
    claude: "#d97757",
    gemini: "#4285f4",
    grok: dark ? "#ffffff" : "#0d0d0d",
    perplexity: "#20808d",
  };
  return { ...base, accent: accent[model], inlineCode: model === "claude" ? "#c15f3c" : accent[model], font: fontFor("ai", platform, model) };
}

/* ------------------------------- model logos --------------------------------- */

function modelLogo(model: AiModel, cx: number, cy: number, r: number, dark: boolean): string {
  const a = theme(model, dark).accent;
  switch (model) {
    case "chatgpt":
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${a}"/><path d="M${cx} ${cy - r * 0.62} a ${r * 0.62} ${r * 0.62} 0 1 0 ${r * 0.54} ${r * 0.31} M${cx + r * 0.54} ${cy - r * 0.31} a ${r * 0.62} ${r * 0.62} 0 1 0 -${r * 0.54} ${r * 0.93}" fill="none" stroke="#fff" stroke-width="${r * 0.16}" stroke-linecap="round"/>`;
    case "claude":
      // Anthropic sunburst — radiating spokes
      return Array.from({ length: 12 }, (_, i) => {
        const ang = (i / 12) * Math.PI * 2;
        const x1 = cx + Math.cos(ang) * r * 0.32, y1 = cy + Math.sin(ang) * r * 0.32;
        const x2 = cx + Math.cos(ang) * r, y2 = cy + Math.sin(ang) * r;
        return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="${a}" stroke-width="${r * 0.2}" stroke-linecap="round"/>`;
      }).join("");
    case "gemini":
      // four-point sparkle
      return `<defs><linearGradient id="gem${cx}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4285f4"/><stop offset="0.5" stop-color="#9b72cb"/><stop offset="1" stop-color="#d96570"/></linearGradient></defs><path d="M${cx} ${cy - r} C ${cx} ${cy - r * 0.3} ${cx - r * 0.3} ${cy} ${cx - r} ${cy} C ${cx - r * 0.3} ${cy} ${cx} ${cy + r * 0.3} ${cx} ${cy + r} C ${cx} ${cy + r * 0.3} ${cx + r * 0.3} ${cy} ${cx + r} ${cy} C ${cx + r * 0.3} ${cy} ${cx} ${cy - r * 0.3} ${cx} ${cy - r} Z" fill="url(#gem${cx})"/>`;
    case "grok":
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${dark ? "#000" : "#0d0d0d"}"/><path d="M${cx - r * 0.45} ${cy + r * 0.5} L${cx + r * 0.5} ${cy - r * 0.5} M${cx} ${cy} L${cx + r * 0.5} ${cy + r * 0.5}" stroke="#fff" stroke-width="${r * 0.18}" stroke-linecap="round"/>`;
    case "perplexity":
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${a}"/><path d="M${cx} ${cy - r * 0.62} V${cy + r * 0.62} M${cx - r * 0.55} ${cy - r * 0.3} V${cy + r * 0.3} A ${r * 0.55} ${r * 0.62} 0 0 0 ${cx} ${cy - r * 0.3} A ${r * 0.55} ${r * 0.62} 0 0 0 ${cx + r * 0.55} ${cy - r * 0.3} V${cy + r * 0.3}" fill="none" stroke="#fff" stroke-width="${r * 0.13}" stroke-linecap="round"/>`;
  }
}

/* ------------------------------ rich text (md) ------------------------------- */

interface Run { text: string; bold?: boolean; code?: boolean }

function inlineRuns(line: string): Run[] {
  const runs: Run[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    if (m.index > last) runs.push({ text: line.slice(last, m.index) });
    const tok = m[0];
    if (tok.startsWith("**")) runs.push({ text: tok.slice(2, -2), bold: true });
    else runs.push({ text: tok.slice(1, -1), code: true });
    last = m.index + tok.length;
  }
  if (last < line.length) runs.push({ text: line.slice(last) });
  return runs.length ? runs : [{ text: line }];
}

function runWidth(word: string, code: boolean): number {
  return code ? word.length * FONT * 0.6 : textWidth(word, FONT);
}

/** Wrap inline runs into lines; each line is a list of styled words. */
function wrapRuns(runs: Run[], maxW: number): Run[][] {
  const words: Run[] = [];
  for (const r of runs) {
    const parts = r.text.split(/(\s+)/);
    for (const p of parts) {
      if (p === "") continue;
      words.push({ text: p, bold: r.bold, code: r.code });
    }
  }
  const lines: Run[][] = [];
  let cur: Run[] = [];
  let w = 0;
  for (const word of words) {
    const isSpace = /^\s+$/.test(word.text);
    const ww = isSpace ? FONT * 0.3 : runWidth(word.text, !!word.code);
    if (!isSpace && w + ww > maxW && cur.length) {
      // drop a trailing space
      if (cur.length && /^\s+$/.test(cur[cur.length - 1].text)) cur.pop();
      lines.push(cur);
      cur = [];
      w = 0;
    }
    if (isSpace && cur.length === 0) continue;
    cur.push(word);
    w += ww;
  }
  if (cur.length) lines.push(cur);
  return lines.length ? lines : [[{ text: "" }]];
}

function emitRunLine(line: Run[], x: number, y: number, t: Theme): string {
  const spans = line
    .map((r) =>
      r.code
        ? `<tspan font-family="${MONO}" font-size="${FONT - 1}" fill="${t.inlineCode}">${esc(r.text)}</tspan>`
        : `<tspan font-weight="${r.bold ? 700 : 400}">${esc(r.text)}</tspan>`
    )
    .join("");
  return `<text font-family="${t.font}" font-size="${FONT}" fill="${t.text}" x="${x}" y="${y}">${spans}</text>`;
}

/** Render assistant markdown starting at y; returns svg parts + new y. */
function renderMarkdown(text: string, x: number, startY: number, maxW: number, t: Theme): { svg: string; y: number } {
  const out: string[] = [];
  const lines = text.split("\n");
  let y = startY;
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) code.push(lines[i++]);
      i++; // closing fence
      const chpl = Math.floor((maxW - 24) / (FONT * 0.6));
      const wrapped = code.flatMap((cl) => cl.match(new RegExp(`.{1,${Math.max(1, chpl)}}`, "g")) ?? [""]);
      const boxH = wrapped.length * (LINE_H - 2) + 20;
      out.push(`<rect x="${x}" y="${y}" width="${maxW}" height="${boxH}" rx="12" fill="${t.codeBg}"/>`);
      wrapped.forEach((cl, k) => {
        out.push(`<text font-family="${MONO}" font-size="${FONT - 2}" fill="${t.codeText}" x="${x + 12}" y="${y + 16 + k * (LINE_H - 2)}">${esc(cl)}</text>`);
      });
      y += boxH + 8;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const content = line.replace(/^\s*[-*]\s+/, "");
      const runs = wrapRuns(inlineRuns(content), maxW - 18);
      out.push(`<circle cx="${x + 4}" cy="${y - FONT * 0.32}" r="2.6" fill="${t.text}"/>`);
      runs.forEach((rl, k) => out.push(emitRunLine(rl, x + 18, y + k * LINE_H, t)));
      y += runs.length * LINE_H + 3;
      i++;
      continue;
    }
    if (line.trim() === "") {
      y += LINE_H * 0.5;
      i++;
      continue;
    }
    const runs = wrapRuns(inlineRuns(line), maxW);
    runs.forEach((rl, k) => out.push(emitRunLine(rl, x, y + k * LINE_H, t)));
    y += runs.length * LINE_H + 2;
    i++;
  }
  return { svg: out.join("\n"), y };
}

/* ------------------------------- tool cards ---------------------------------- */
/* Claude/agent-style inline blocks: a tool-use card, a research-summary card,
   and a document artifact card (framekit-screen-studio.md refs). */

function renderAiCard(card: AiCard, y: number, t: Theme, dark: boolean): { svg: string; h: number } {
  const x = MARGIN;
  const w = BODY;
  const cardBg = dark ? "#2a2a2e" : "#faf9f5";
  const border = t.hairline;

  if (card.kind === "tool") {
    const h = 46;
    const dx = x + 15, dy = y + 14;
    let icon: string;
    if (card.tool === "drive") {
      // Google Drive tri-color triangle (approx)
      icon =
        `<path d="M${dx + 8} ${dy} L${dx + 11.5} ${dy + 7} L${dx + 4.5} ${dy + 7} Z" fill="#ffcd40"/>` +
        `<path d="M${dx + 4.5} ${dy + 7} L${dx + 11.5} ${dy + 7} L${dx + 8} ${dy + 14} L${dx + 1} ${dy + 14} Z" fill="#2684fc"/>` +
        `<path d="M${dx + 11.5} ${dy + 7} L${dx + 8} ${dy + 14} L${dx + 15} ${dy + 14} Z" fill="#0f9d58"/>`;
    } else {
      // search / web magnifier
      icon =
        `<circle cx="${dx + 6}" cy="${dy + 6}" r="6" fill="none" stroke="${t.subtle}" stroke-width="1.8"/>` +
        `<path d="M${dx + 11} ${dy + 11} l5 5" stroke="${t.subtle}" stroke-width="1.8" stroke-linecap="round"/>`;
    }
    return {
      h,
      svg:
        `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${cardBg}" stroke="${border}" stroke-width="1"/>` +
        icon +
        `<text font-family="${t.font}" font-size="14" font-weight="500" fill="${t.text}" x="${x + 42}" y="${y + 28}">${esc(card.label)}</text>`,
    };
  }

  if (card.kind === "research") {
    const h = 60;
    return {
      h,
      svg:
        `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${cardBg}" stroke="${border}" stroke-width="1"/>` +
        `<text font-family="${t.font}" font-size="14.5" font-weight="700" fill="${t.text}" x="${x + 16}" y="${y + 25}">${esc(card.title)}</text>` +
        // small green "complete" check
        `<circle cx="${x + 22}" cy="${y + 42}" r="7" fill="#12a150"/><path d="M${x + 18.5} ${y + 42} l2.4 2.6 4.6 -5" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>` +
        `<text font-family="${t.font}" font-size="12.5" fill="${t.subtle}" x="${x + 36}" y="${y + 46}">${esc(card.status)}</text>`,
    };
  }

  // artifact — document card with a mini preview on the right
  const titleLines = wrapText(card.title, 14.5, w - 90);
  const h = Math.max(66, 20 + titleLines.length * 18 + 22);
  const thumbX = x + w - 56;
  return {
    h,
    svg:
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${cardBg}" stroke="${border}" stroke-width="1"/>` +
      `<text font-family="${t.font}" font-size="14.5" font-weight="700" fill="${t.text}">${titleLines
        .map((l, i) => `<tspan x="${x + 16}" y="${y + 24 + i * 18}">${esc(l)}</tspan>`)
        .join("")}</text>` +
      `<text font-family="${t.font}" font-size="12.5" fill="${t.subtle}" x="${x + 16}" y="${y + h - 14}">${esc(card.subtitle)}</text>` +
      // mini document preview
      `<rect x="${thumbX}" y="${y + 12}" width="40" height="${h - 24}" rx="4" fill="${dark ? "#1c1c1e" : "#ffffff"}" stroke="${border}" stroke-width="1"/>` +
      [0, 1, 2, 3].map((i) => `<rect x="${thumbX + 6}" y="${y + 20 + i * 7}" width="${28 - (i % 2) * 8}" height="2" rx="1" fill="${t.subtle}" opacity="0.6"/>`).join(""),
  };
}

/* --------------------------------- render ------------------------------------ */

export function renderAiChat(doc: AiChatDoc): string {
  const dark = doc.chrome.dark ?? true; // AI apps default to dark
  const platform = doc.chrome.platform ?? "ios";
  const t = theme(doc.model, dark, platform);
  const title = doc.title || AI_MODEL_LABELS[doc.model];
  const parts: string[] = [`<rect width="${SW}" height="${SH}" fill="${t.bg}"/>`];

  /* header */
  const HEADER_H = 96;
  parts.push(
    statusBar({ time: doc.chrome.time, battery: doc.chrome.battery, color: t.text, platform }),
    `<rect y="${HEADER_H - 0.5}" width="${SW}" height="0.5" fill="${t.hairline}"/>`,
    // menu (left)
    `<path d="M22 68 h20 M22 76 h20 M22 84 h14" stroke="${t.text}" stroke-width="2.2" stroke-linecap="round"/>`,
    modelLogo(doc.model, SW / 2 - textWidth(title, 17) / 2 - 16, 76, 11, dark),
    `<text font-family="${t.font}" font-size="17" font-weight="600" fill="${t.text}" x="${SW / 2 + 6}" y="82" text-anchor="middle">${esc(title)}</text>`,
    // new-chat pencil (right)
    `<path d="M${SW - 42} 84 l16 -16 6 6 -16 16 h-6 Z M${SW - 30} 72 l6 6" fill="none" stroke="${t.text}" stroke-width="2" stroke-linejoin="round"/>`
  );

  /* conversation */
  let y = HEADER_H + 30;
  for (const m of doc.messages) {
    if (m.from === "me") {
      const lines = wrapText(m.text || " ", FONT, BODY * 0.72 - 28);
      const w = Math.min(BODY * 0.72, Math.max(...lines.map((l) => textWidth(l, FONT))) + 28);
      const h = lines.length * LINE_H + 20;
      const x = SW - MARGIN - w;
      parts.push(
        `<rect x="${x}" y="${y}" width="${w.toFixed(1)}" height="${h}" rx="20" fill="${t.userBubble}"/>`,
        textBlock(lines, { x: x + 14, y: bubbleBaseline(y, h, lines.length, LINE_H, FONT), size: FONT, lineHeight: LINE_H, color: t.userText, font: t.font })
      );
      y += h + 22;
    } else {
      const r = renderMarkdown(m.text || " ", MARGIN, y + 4, BODY, t);
      parts.push(r.svg);
      y = r.y + (m.cards?.length ? 12 : 22);
      for (const card of m.cards ?? []) {
        const cc = renderAiCard(card, y, t, dark);
        parts.push(cc.svg);
        y += cc.h + 12;
      }
      if (m.cards?.length) y += 10;
    }
  }

  /* thinking indicator — AI apps stream/pulse a dot where the reply forms */
  if (doc.chrome._anim?.typing) {
    parts.push(
      modelLogo(doc.model, MARGIN + 9, y + 6, 9, dark),
      typingDots(MARGIN + 28, y + 6, t.subtle, doc.chrome._anim.dotPhase ?? 0, 3.6, 10)
    );
  }

  /* composer — per-model bottom bar (ChatGPT / Gemini / Grok / Claude / Perplexity) */
  const CH = 80;
  const ciy = SH - CH - 20;
  const rowY = ciy + CH - 22;
  const placeholder =
    doc.model === "claude" ? "Reply to Claude" : doc.model === "gemini" ? "Ask Gemini" : doc.model === "grok" ? "Ask Anything" : "Ask anything";
  parts.push(
    `<rect x="${MARGIN}" y="${ciy}" width="${BODY}" height="${CH}" rx="24" fill="${dark ? "#2b2b2f" : "#ffffff"}" stroke="${t.hairline}" stroke-width="1.2" style="filter:drop-shadow(0 6px 16px rgba(0,0,0,${dark ? 0.45 : 0.1}))"/>`,
    `<text font-family="${t.font}" font-size="16" fill="${t.subtle}" x="${MARGIN + 18}" y="${ciy + 30}">${placeholder}</text>`
  );
  let lx = MARGIN + 16;
  if (doc.model === "grok") {
    parts.push(`<path d="M${lx + 9} ${rowY - 8} l -6 7 a 5.6 5.6 0 0 0 8.6 7 l 8 -9.2 a 3.7 3.7 0 0 0 -5.6 -4.8 l -7.6 8.8" fill="none" stroke="${t.subtle}" stroke-width="1.8" stroke-linecap="round"/>`);
  } else {
    parts.push(`<path d="M${lx + 9} ${rowY - 8} v16 M${lx + 1} ${rowY} h16" stroke="${t.subtle}" stroke-width="2" stroke-linecap="round"/>`);
  }
  lx += 32;
  const pills: [string, string][] =
    doc.model === "grok" ? [["DeepSearch", "spiral"], ["Think", "bulb"]] : doc.model === "gemini" ? [["Fast", ""]] : [];
  for (const [label, ic] of pills) {
    const pw = textWidth(label, 13) + (ic ? 30 : 22);
    parts.push(`<rect x="${lx}" y="${rowY - 13}" width="${pw.toFixed(0)}" height="26" rx="13" fill="none" stroke="${t.hairline}" stroke-width="1.3"/>`);
    let tx = lx + 12;
    if (ic === "spiral") {
      parts.push(`<path d="M${lx + 15} ${rowY - 5} a 5 5 0 1 0 4 2.5 M${lx + 15} ${rowY - 5} a 2 2 0 1 1 2 3" fill="none" stroke="${t.subtle}" stroke-width="1.5" stroke-linecap="round"/>`);
      tx += 16;
    }
    if (ic === "bulb") {
      parts.push(`<path d="M${lx + 15} ${rowY - 9} a 6 6 0 0 1 3 11 v1.5 h-6 v-1.5 a 6 6 0 0 1 3 -11 Z M${lx + 12.5} ${rowY + 6} h5" fill="none" stroke="${t.subtle}" stroke-width="1.5" stroke-linecap="round"/>`);
      tx += 16;
    }
    parts.push(`<text font-family="${t.font}" font-size="13" font-weight="500" fill="${t.text}" x="${tx}" y="${rowY + 4.5}">${label}</text>`);
    lx += pw + 8;
  }
  // right: mic + voice waveform button (all models)
  const wbX = SW - MARGIN - 24;
  parts.push(
    micIcon(SW - MARGIN - 56, rowY, 20, t.subtle),
    `<circle cx="${wbX}" cy="${rowY}" r="16" fill="${dark ? "#f0f0f0" : "#1a1a1a"}"/>`,
    [-6, -2, 2, 6].map((dx, k) => `<rect x="${wbX + dx - 1}" y="${rowY - [6, 10, 10, 6][k] / 2}" width="2" height="${[6, 10, 10, 6][k]}" rx="1" fill="${dark ? "#1a1a1a" : "#fff"}"/>`).join(""),
    homeIndicator(t.text, platform)
  );

  return parts.join("\n");
}
