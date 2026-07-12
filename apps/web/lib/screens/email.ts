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
import type { EmailDoc } from "./types";

/**
 * Email thread view (Gmail / Outlook / Apple Mail), mobile app style:
 * toolbar, subject, sender row with avatar + "to me" + timestamp + star,
 * wrapped body paragraphs, Reply / Reply all / Forward actions. §15.
 */

const MARGIN = 20;
const FONT = 15.5;
const LINE_H = 22;

interface ETheme {
  bg: string;
  text: string;
  subtle: string;
  hairline: string;
  accent: string;
  toolbar: string;
  chipBg: string;
  name: string;
}

function etheme(provider: EmailDoc["provider"], dark: boolean): ETheme {
  const base = dark
    ? { bg: "#1f1f1f", text: "#e8eaed", subtle: "#9aa0a6", hairline: "#3c4043", toolbar: "#1f1f1f", chipBg: "#2d2e30" }
    : { bg: "#ffffff", text: "#202124", subtle: "#5f6368", hairline: "#ececec", toolbar: "#ffffff", chipBg: "#f1f3f4" };
  const accent = provider === "gmail" ? "#ea4335" : provider === "outlook" ? "#0078d4" : "#1a73e8";
  const name = provider === "gmail" ? "Gmail" : provider === "outlook" ? "Outlook" : "Mail";
  return { ...base, accent, name };
}

export function renderEmail(doc: EmailDoc, avatarUrl?: string): string {
  const platform = doc.chrome.platform ?? "ios";
  const font = fontFor("email", platform);
  const textBlock = (lines: string[], o: Parameters<typeof baseTextBlock>[1]) =>
    baseTextBlock(lines, { font, ...o });
  const dark = !!doc.chrome.dark;
  const t = etheme(doc.provider, dark);
  const parts: string[] = [`<rect width="${SW}" height="${SH}" fill="${t.bg}"/>`];

  /* toolbar */
  const TB = 92;
  parts.push(
    statusBar({ time: doc.chrome.time, battery: doc.chrome.battery, color: t.text, platform }),
    // back
    `<path d="M28 68 l-11 11 11 11 M17 79 h22" fill="none" stroke="${t.text}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
    // archive, trash, mark-unread, more (right cluster)
    `<rect x="${SW - 150}" y="70" width="20" height="15" rx="2.5" fill="none" stroke="${t.text}" stroke-width="1.9"/><path d="M${SW - 146} 76 h12" stroke="${t.text}" stroke-width="1.9"/>`,
    `<path d="M${SW - 112} 72 h16 M${SW - 110} 72 l1.5 15 h11 l1.5 -15 M${SW - 106} 70 h6 v2" fill="none" stroke="${t.text}" stroke-width="1.9" stroke-linecap="round"/>`,
    `<path d="M${SW - 74} 70 h18 v16 h-18 Z M${SW - 74} 70 l9 8 9 -8" fill="none" stroke="${t.text}" stroke-width="1.9" stroke-linejoin="round"/>`,
    `<circle cx="${SW - 30}" cy="72" r="1.9" fill="${t.text}"/><circle cx="${SW - 30}" cy="79" r="1.9" fill="${t.text}"/><circle cx="${SW - 30}" cy="86" r="1.9" fill="${t.text}"/>`,
    `<rect y="${TB - 0.5}" width="${SW}" height="0.5" fill="${t.hairline}"/>`
  );

  /* subject */
  let y = TB + 34;
  const subjectLines = wrapText(doc.subject || " ", 22, SW - MARGIN * 2 - 28);
  parts.push(
    textBlock(subjectLines, { x: MARGIN, y, size: 22, lineHeight: 28, color: t.text, weight: 400 }),
    // star
    doc.starred
      ? `<path d="M${SW - MARGIN - 10} ${y - 20} l3.4 6.9 7.6 1.1 -5.5 5.4 1.3 7.6 -6.8 -3.6 -6.8 3.6 1.3 -7.6 -5.5 -5.4 7.6 -1.1 Z" fill="#f4b400"/>`
      : ""
  );
  y += subjectLines.length * 28 + 18;

  /* sender row */
  parts.push(
    avatar(doc.sender, MARGIN + 21, y + 8, 21, "em", avatarUrl),
    `<text font-family="${font}" font-size="15.5" font-weight="600" fill="${t.text}" x="${MARGIN + 54}" y="${y + 4}">${esc(doc.sender)}</text>`,
    `<text font-family="${font}" font-size="13" fill="${t.subtle}" x="${MARGIN + 54}" y="${y + 22}">to me</text>`,
    `<path d="M${MARGIN + 54 + textWidth("to me", 13) + 8} ${y + 15} l4.5 4.5 4.5 -4.5" fill="none" stroke="${t.subtle}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<text font-family="${font}" font-size="12.5" fill="${t.subtle}" x="${SW - MARGIN - 22}" y="${y - 2}" text-anchor="end">${esc(doc.time)}</text>`,
    // reply arrow + star mini
    `<path d="M${SW - MARGIN - 30} ${y + 14} l-6 5 6 5 M${SW - MARGIN - 36} ${y + 19} h8 a6 6 0 0 1 6 6 v3" fill="none" stroke="${t.subtle}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`
  );
  y += 52;
  parts.push(`<rect x="${MARGIN}" y="${y - 8}" width="${SW - MARGIN * 2}" height="0.5" fill="${t.hairline}"/>`);
  y += 18;

  /* body */
  for (const para of doc.body.split("\n")) {
    if (para.trim() === "") {
      y += LINE_H * 0.6;
      continue;
    }
    const lines = wrapText(para, FONT, SW - MARGIN * 2);
    parts.push(textBlock(lines, { x: MARGIN, y, size: FONT, lineHeight: LINE_H, color: t.text }));
    y += lines.length * LINE_H + 4;
  }

  /* reply actions */
  const ay = SH - 78;
  parts.push(`<rect x="0" y="${ay - 14}" width="${SW}" height="0.5" fill="${t.hairline}"/>`);
  const chips: [string, string][] = [
    ["Reply", `M18 6 l-6 5 6 5 M12 11 h9 a6 6 0 0 1 6 6 v3`],
    ["Reply all", `M14 6 l-6 5 6 5 M20 6 l-6 5 6 5 M14 11 h8 a6 6 0 0 1 6 6 v3`],
    ["Forward", `M14 6 l6 5 -6 5 M20 11 h-9 a6 6 0 0 0 -6 6 v3`],
  ];
  const cw = (SW - MARGIN * 2 - 16) / 3;
  chips.forEach(([label, path], i) => {
    const cx = MARGIN + i * (cw + 8);
    parts.push(
      `<rect x="${cx}" y="${ay}" width="${cw}" height="40" rx="20" fill="none" stroke="${t.hairline}" stroke-width="1.4"/>`,
      `<g transform="translate(${cx + 16} ${ay + 9}) scale(0.8)"><path d="${path}" fill="none" stroke="${t.text}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g>`,
      `<text font-family="${font}" font-size="13" font-weight="500" fill="${t.text}" x="${cx + cw / 2 + 12}" y="${ay + 25}" text-anchor="middle">${esc(label)}</text>`
    );
  });
  parts.push(homeIndicator(t.text, platform));

  return parts.join("\n");
}
