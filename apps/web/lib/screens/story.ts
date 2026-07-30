"use client";

import {
  SW,
  SH,
  statusBar,
  homeIndicator,
  avatar,
  imageBubble,
  textBlock as baseTextBlock,
  textWidth,
  truncate,
  wrapText,
  esc,
  bubbleBaseline,
} from "./common";
import { fontFor } from "./fonts";
import type { StoryDoc, StorySticker } from "./types";

/**
 * Instagram STORY viewer — full-bleed immersive media with white-on-media
 * chrome (progress segments, author row, reply bar) regardless of theme. Only
 * the FALLBACK background flips with dark mode (solid black vs the IG gradient).
 * Uses avatarUrl for the author disc and lookupUrl(doc.background) for the
 * full-bleed media. §13 / Screen Studio.
 */

export function renderStory(
  doc: StoryDoc,
  avatarUrl?: string,
  lookupUrl?: (id: string) => string | undefined
): string {
  const platform = doc.chrome.platform ?? "ios";
  const font = fontFor("story", platform);
  const textBlock = (lines: string[], o: Parameters<typeof baseTextBlock>[1]) =>
    baseTextBlock(lines, { font, ...o });

  const dark = !!doc.chrome.dark;
  // Chrome is ALWAYS white on media; only the fallback backdrop reacts to dark.
  const c = dark
    ? { fbTop: "#000000", fbMid: "#000000", fbBot: "#000000" }
    : { fbTop: "#F58529", fbMid: "#DD2A7B", fbBot: "#8134AF" };

  // On notched iPhones the story is a rounded-corner card with black above
  // (status area) and a black strip below (the reply bar sits on solid black),
  // not an edge-to-edge gradient.
  const CARD_TOP = 54, CARD_BOTTOM = SH - 96, CARD_H = CARD_BOTTOM - CARD_TOP;
  const parts: string[] = [
    `<rect width="${SW}" height="${SH}" fill="#000000"/>`,
    `<defs><clipPath id="stcard"><rect x="0" y="${CARD_TOP}" width="${SW}" height="${CARD_H}" rx="14"/></clipPath></defs>`,
  ];

  /* ---- card media (uploaded) or gradient fallback, clipped to the card ----- */
  const bgUrl = doc.background ? lookupUrl?.(doc.background) : undefined;
  parts.push(`<g clip-path="url(#stcard)">`);
  if (bgUrl) {
    parts.push(imageBubble(bgUrl, 0, CARD_TOP, SW, CARD_H, "stbg", { rx: 0 }));
  } else {
    parts.push(
      `<defs><linearGradient id="stfb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.fbTop}"/><stop offset="0.5" stop-color="${c.fbMid}"/><stop offset="1" stop-color="${c.fbBot}"/></linearGradient></defs>`,
      `<rect x="0" y="${CARD_TOP}" width="${SW}" height="${CARD_H}" fill="url(#stfb)"/>`
    );
  }

  /* ---- scrims (keep white chrome legible) ---------------------------------- */
  parts.push(
    `<defs>` +
      `<linearGradient id="sttop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(0,0,0,0.25)"/><stop offset="1" stop-color="rgba(0,0,0,0)"/></linearGradient>` +
      `</defs>`,
    `<rect x="0" y="${CARD_TOP}" width="${SW}" height="130" fill="url(#sttop)"/>`,
    `</g>`
  );

  /* ---- status bar (white glyphs, always) ----------------------------------- */
  parts.push(
    statusBar({ time: doc.chrome.time, battery: doc.chrome.battery, color: "#ffffff", platform })
  );

  /* ---- progress segments (thin rounded capsules, y~60) --------------------- */
  const count = Math.max(1, Math.min(40, doc.storyCount || 1));
  const pGap = 4;
  const pLeft = 8;
  const pRight = 394;
  const pSegW = (pRight - pLeft - pGap * (count - 1)) / count;
  const pY = 66; // just inside the card, height 2 (real segments are ~2pt)
  for (let i = 0; i < count; i++) {
    const sx = pLeft + i * (pSegW + pGap);
    if (i < doc.activeIndex) {
      parts.push(
        `<rect x="${sx.toFixed(1)}" y="${pY}" width="${pSegW.toFixed(1)}" height="2" rx="1" fill="#ffffff"/>`
      );
    } else if (i === doc.activeIndex) {
      const fillW = pSegW * Math.min(1, Math.max(0, doc.activeProgress ?? 0));
      parts.push(
        `<rect x="${sx.toFixed(1)}" y="${pY}" width="${pSegW.toFixed(1)}" height="2" rx="1" fill="rgba(255,255,255,0.35)"/>`,
        `<rect x="${sx.toFixed(1)}" y="${pY}" width="${fillW.toFixed(1)}" height="2" rx="1" fill="#ffffff"/>`
      );
    } else {
      parts.push(
        `<rect x="${sx.toFixed(1)}" y="${pY}" width="${pSegW.toFixed(1)}" height="2" rx="1" fill="rgba(255,255,255,0.35)"/>`
      );
    }
  }

  /* ---- author row (no story ring) ------------------------------------------ */
  parts.push(avatar(doc.username, 28, 87, 16, "stav", avatarUrl));
  const unX = 52;
  const unBase = 91;
  const uname = truncate(doc.username, 14, 190); // keep timeAgo clear of the ... / X controls
  parts.push(
    `<text font-family="${font}" font-size="14" font-weight="600" fill="#ffffff" x="${unX}" y="${unBase}">${esc(uname)}</text>`
  );
  const taX = unX + textWidth(uname, 14) + 6;
  parts.push(
    `<text font-family="${font}" font-size="14" fill="rgba(255,255,255,0.7)" x="${taX.toFixed(1)}" y="${unBase}">${esc(doc.timeAgo)}</text>`
  );
  // overflow dots + close
  parts.push(
    `<circle cx="350" cy="87" r="1.8" fill="#ffffff"/>`,
    `<circle cx="358" cy="87" r="1.8" fill="#ffffff"/>`,
    `<circle cx="366" cy="87" r="1.8" fill="#ffffff"/>`,
    `<path d="M375 82 L385 92 M385 82 L375 92" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>`
  );

  /* ---- optional sticker (near y~140) --------------------------------------- */
  if (doc.sticker) parts.push(renderSticker(doc.sticker, font));

  /* ---- optional caption slab (lower-middle band) --------------------------- */
  if (doc.caption) {
    const capSize = 18;
    const capLH = 24;
    const capLines = wrapText(doc.caption, capSize, 260);
    const maxLineW = Math.max(...capLines.map((l) => textWidth(l, capSize)));
    const padX = 16;
    const padY = 10;
    const slabW = Math.min(SW - 32, maxLineW + padX * 2);
    const slabH = capLines.length * capLH + padY * 2;
    const slabX = (SW - slabW) / 2;
    const slabY = 640 - slabH / 2;
    parts.push(
      `<rect x="${slabX.toFixed(1)}" y="${slabY.toFixed(1)}" width="${slabW.toFixed(1)}" height="${slabH.toFixed(1)}" rx="8" fill="rgba(0,0,0,0.35)"/>`
    );
    const capBase = bubbleBaseline(slabY, slabH, capLines.length, capLH, capSize);
    parts.push(
      textBlock(capLines, {
        x: SW / 2,
        y: capBase,
        size: capSize,
        lineHeight: capLH,
        color: "#ffffff",
        weight: 600,
        anchor: "middle",
      })
    );
  }

  /* ---- bottom reply bar: pill -> heart -> paper-plane ---------------------- */
  parts.push(
    `<rect x="12" y="795" width="288" height="44" rx="22" fill="none" stroke="rgba(255,255,255,0.75)" stroke-width="1.5"/>`,
    `<text font-family="${font}" font-size="15" fill="rgba(255,255,255,0.9)" x="30" y="822">${esc(doc.replyPlaceholder || "Send message…")}</text>`
  );
  parts.push(heartOutline(330, 815, 7));
  parts.push(paperPlane(372, 817, 11));

  parts.push(homeIndicator("#ffffff", platform));
  return parts.join("\n");
}

/* ------------------------------- stickers ------------------------------------ */

function renderSticker(st: StorySticker, font: string): string {
  const cx = SW / 2;
  const rot = -3; // slight tilt for realism

  if (st.type === "location" || st.type === "mention" || st.type === "music") {
    const music = st.type === "music";
    const size = 15;
    const glyphW = 16;
    const padX = 14;
    const gap = 6;
    const label = st.text;
    const pillW = padX * 2 + glyphW + gap + textWidth(label, size);
    const pillH = 34;
    const pillX = cx - pillW / 2;
    const pillY = 140;
    const cy = pillY + pillH / 2;
    const gx = pillX + padX + glyphW / 2;
    const tx = pillX + padX + glyphW + gap;
    const tBase = cy + size * 0.35;

    const fill = music ? "rgba(0,0,0,0.35)" : "#FFFFFF";
    const ink = music ? "#ffffff" : "#262626";
    let glyph: string;
    if (st.type === "location") {
      glyph =
        `<path d="M${gx} ${cy - 8} a5.2 5.2 0 0 1 5.2 5.2 c0 4 -5.2 9.6 -5.2 9.6 c0 0 -5.2 -5.6 -5.2 -9.6 a5.2 5.2 0 0 1 5.2 -5.2 Z" fill="${ink}"/>` +
        `<circle cx="${gx}" cy="${(cy - 2.8).toFixed(1)}" r="1.9" fill="#ffffff"/>`;
    } else if (st.type === "mention") {
      glyph = `<text font-family="${font}" font-size="18" font-weight="700" fill="${ink}" text-anchor="middle" x="${gx}" y="${(cy + 6).toFixed(1)}">@</text>`;
    } else {
      // music note
      glyph =
        `<path d="M${gx - 3} ${cy + 6} v-11 l7 -2 v9" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linejoin="round"/>` +
        `<circle cx="${(gx - 3).toFixed(1)}" cy="${(cy + 6).toFixed(1)}" r="2.4" fill="${ink}"/>` +
        `<circle cx="${(gx + 4).toFixed(1)}" cy="${(cy + 4).toFixed(1)}" r="2.4" fill="${ink}"/>`;
    }

    return (
      `<g transform="rotate(${rot} ${cx} ${cy})">` +
      `<rect x="${pillX.toFixed(1)}" y="${pillY}" width="${pillW.toFixed(1)}" height="${pillH}" rx="8" fill="${fill}"/>` +
      glyph +
      `<text font-family="${font}" font-size="${size}" font-weight="600" fill="${ink}" x="${tx.toFixed(1)}" y="${tBase.toFixed(1)}">${esc(label)}</text>` +
      `</g>`
    );
  }

  // poll / question — frosted white card
  const cardW = 250;
  const cardX = cx - cardW / 2;
  const cardY = 120;
  const qSize = 15;
  const qLH = 19;
  const qLines = wrapText(st.text, qSize, cardW - 28);
  const qTop = cardY + 18;
  const rowY = qTop + qLines.length * qLH + 6;
  const rowH = 36;
  const cardH = rowY - cardY + rowH + 14;
  const cyMid = cardY + cardH / 2;

  const qText = qLines
    .map(
      (l, i) =>
        `<tspan x="${cx}" y="${(qTop + i * qLH).toFixed(1)}">${esc(l)}</tspan>`
    )
    .join("");

  let body: string;
  if (st.type === "poll") {
    const opts = (st.secondaryText || "Yes / No")
      .split(/\s*[/,]\s*/)
      .filter(Boolean)
      .slice(0, 2);
    while (opts.length < 2) opts.push(opts.length === 0 ? "Yes" : "No");
    const chipGap = 8;
    const chipW = (cardW - 28 - chipGap) / 2;
    body = opts
      .map((o, i) => {
        const chx = cardX + 14 + i * (chipW + chipGap);
        return (
          `<rect x="${chx.toFixed(1)}" y="${rowY}" width="${chipW.toFixed(1)}" height="${rowH}" rx="10" fill="rgba(0,0,0,0.05)" stroke="rgba(0,0,0,0.08)" stroke-width="1"/>` +
          `<text font-family="${font}" font-size="14" font-weight="600" fill="#262626" text-anchor="middle" x="${(chx + chipW / 2).toFixed(1)}" y="${(rowY + rowH / 2 + 5).toFixed(1)}">${esc(o)}</text>`
        );
      })
      .join("");
  } else {
    // question — a rounded input line placeholder
    const ph = st.secondaryText || "Type something…";
    body =
      `<rect x="${cardX + 14}" y="${rowY}" width="${cardW - 28}" height="${rowH}" rx="18" fill="rgba(0,0,0,0.04)" stroke="rgba(0,0,0,0.08)" stroke-width="1"/>` +
      `<text font-family="${font}" font-size="14" fill="#8E8E93" text-anchor="middle" x="${cx}" y="${(rowY + rowH / 2 + 5).toFixed(1)}">${esc(ph)}</text>`;
  }

  return (
    `<g transform="rotate(${rot} ${cx} ${cyMid})">` +
    `<rect x="${cardX.toFixed(1)}" y="${cardY}" width="${cardW}" height="${cardH.toFixed(1)}" rx="16" fill="rgba(255,255,255,0.9)"/>` +
    `<text font-family="${font}" font-size="${qSize}" font-weight="600" fill="#262626" text-anchor="middle">${qText}</text>` +
    body +
    `</g>`
  );
}

/* ------------------------------- reply icons --------------------------------- */

function heartOutline(cx: number, cy: number, s: number): string {
  return `<path d="M${cx} ${cy + s * 0.9} C ${cx - s * 2} ${cy - s * 0.6} ${cx - s} ${cy - s * 1.7} ${cx} ${cy - s * 0.5} C ${cx + s} ${cy - s * 1.7} ${cx + s * 2} ${cy - s * 0.6} ${cx} ${cy + s * 0.9} Z" fill="none" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>`;
}

function paperPlane(cx: number, cy: number, s: number): string {
  // outlined send / paper-plane pointing right
  return `<path d="M${cx - s} ${cy - s} L${cx + s} ${cy} L${cx - s} ${cy + s} L${(cx - s * 0.35).toFixed(1)} ${cy} Z" fill="none" stroke="#ffffff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
}
