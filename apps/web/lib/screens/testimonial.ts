"use client";

import { avatar, esc, textBlock, wrapText } from "./common";
import type { TestimonialDoc } from "./types";

const FONT_STACKS: Record<TestimonialDoc["font"], string> = {
  modern: "'Inter','SF Pro Display',system-ui,-apple-system,'Segoe UI',sans-serif",
  editorial: "'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif",
  rounded: "'Avenir Next Rounded','Avenir Next',Nunito,system-ui,sans-serif",
  classic: "'Helvetica Neue',Helvetica,Arial,sans-serif",
};

export function testimonialSize(doc: TestimonialDoc): { width: number; height: number } {
  return {
    width: Math.max(440, Math.min(1200, Math.round(doc.cardWidth || 760))),
    height: Math.max(360, Math.min(900, Math.round(doc.cardHeight || 520))),
  };
}

export function renderTestimonial(doc: TestimonialDoc, avatarUrl?: string): string {
  const { width, height } = testimonialSize(doc);
  const margin = 24;
  const radius = Math.max(0, Math.min(64, doc.cardRadius ?? 28));
  const padding = Math.max(28, Math.min(100, doc.padding ?? 54));
  const cardX = margin;
  const cardY = margin;
  const cardW = width - margin * 2;
  const cardH = height - margin * 2;
  const contentX = cardX + padding;
  const contentW = cardW - padding * 2;
  const font = FONT_STACKS[doc.font] ?? FONT_STACKS.modern;
  const text = doc.textColor || "#16181d";
  const accent = doc.accentColor || "#6d5dfc";
  const card = doc.cardColor || "#ffffff";
  const align = doc.align === "center" ? "middle" : "start";
  const anchorX = doc.align === "center" ? width / 2 : contentX;
  const authorBlockH = 82;
  const quoteTop = cardY + padding + (doc.eyebrow ? 50 : 18);
  const quoteBottom = cardY + cardH - padding - authorBlockH - 20;
  const maxQuoteH = Math.max(100, quoteBottom - quoteTop);
  let quoteSize = Math.max(18, Math.min(58, doc.fontSize ?? 35));
  let lineH = Math.round(quoteSize * 1.32);
  let lines = wrapText(doc.quote, quoteSize, contentW - (doc.quoteStyle === "line" ? 22 : 0));
  while (quoteSize > 18 && lines.length * lineH > maxQuoteH) {
    quoteSize -= 1;
    lineH = Math.round(quoteSize * 1.32);
    lines = wrapText(doc.quote, quoteSize, contentW - (doc.quoteStyle === "line" ? 22 : 0));
  }

  const shadowStrength = Math.max(0, Math.min(2, doc.cardShadow ?? 1.15));
  const shadowOpacity = (0.19 * shadowStrength).toFixed(3);
  const shadowBlur = (24 * shadowStrength).toFixed(1);
  const shadowY = (15 * shadowStrength).toFixed(1);
  const parts: string[] = [
    `<defs><filter id="testimonial-shadow" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="${shadowY}" stdDeviation="${shadowBlur}" flood-color="#111827" flood-opacity="${shadowOpacity}"/></filter></defs>`,
    `<rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="${radius}" fill="${card}" filter="url(#testimonial-shadow)"/>`,
    `<rect x="${cardX}" y="${cardY}" width="5" height="${cardH}" rx="2.5" fill="${accent}"/>`,
    `<rect x="${cardX + 1}" y="${cardY + 1}" width="${cardW - 2}" height="${cardH - 2}" rx="${Math.max(0, radius - 1)}" fill="none" stroke="${text}" stroke-opacity="0.07"/>`,
  ];

  if (doc.eyebrow) {
    parts.push(
      `<circle cx="${contentX + (doc.align === "center" ? contentW / 2 - 58 : 4)}" cy="${cardY + padding + 5}" r="4" fill="${accent}"/>`,
      `<text x="${anchorX + (doc.align === "center" ? 8 : 16)}" y="${cardY + padding + 10}" text-anchor="${align}" font-family="${FONT_STACKS.modern}" font-size="13" font-weight="750" letter-spacing="1.1" fill="${text}" opacity="0.62">${esc(doc.eyebrow.toUpperCase())}</text>`
    );
  }

  if (doc.quoteStyle === "mark") {
    parts.push(`<text x="${doc.align === "center" ? width / 2 : contentX - 7}" y="${quoteTop + 20}" text-anchor="${align}" font-family="Georgia,serif" font-size="92" font-weight="700" fill="${accent}" opacity="0.2">“</text>`);
  } else if (doc.quoteStyle === "line") {
    parts.push(`<rect x="${contentX}" y="${quoteTop - 4}" width="4" height="${Math.min(maxQuoteH, lines.length * lineH + 10)}" rx="2" fill="${accent}"/>`);
  }

  const quoteX = doc.quoteStyle === "line" && doc.align !== "center" ? contentX + 22 : anchorX;
  const renderedLines = [...lines];
  if (doc.quoteStyle !== "mark" && renderedLines.length) {
    renderedLines[0] = `“${renderedLines[0]}`;
    renderedLines[renderedLines.length - 1] = `${renderedLines.at(-1)}”`;
  }
  parts.push(textBlock(renderedLines, {
    font,
    x: quoteX,
    y: quoteTop + (doc.quoteStyle === "mark" ? 42 : 4),
    size: quoteSize,
    lineHeight: lineH,
    color: text,
    weight: doc.font === "editorial" ? 500 : 650,
    anchor: align,
  }));

  const authorY = cardY + cardH - padding - 27;
  if (doc.showRating) {
    const count = Math.max(1, Math.min(5, Math.round(doc.rating || 5)));
    parts.push(drawStars(quoteX, authorY - 60, count, accent));
  }

  if (doc.align === "center") {
    parts.push(avatar(doc.author, width / 2, authorY - 2, 25, "testimonial", avatarUrl));
    parts.push(
      `<text x="${width / 2}" y="${authorY + 39}" text-anchor="middle" font-family="${FONT_STACKS.modern}" font-size="16" font-weight="750" fill="${text}">${esc(doc.author)}</text>`,
      `<text x="${width / 2}" y="${authorY + 59}" text-anchor="middle" font-family="${FONT_STACKS.modern}" font-size="13" fill="${text}" opacity="0.55">${esc([doc.role, doc.company].filter(Boolean).join(" · "))}</text>`
    );
  } else {
    parts.push(avatar(doc.author, contentX + 25, authorY - 8, 25, "testimonial", avatarUrl));
    parts.push(
      `<text x="${contentX + 66}" y="${authorY - 10}" font-family="${FONT_STACKS.modern}" font-size="16" font-weight="750" fill="${text}">${esc(doc.author)}</text>`,
      `<text x="${contentX + 66}" y="${authorY + 12}" font-family="${FONT_STACKS.modern}" font-size="13" fill="${text}" opacity="0.55">${esc([doc.role, doc.company].filter(Boolean).join(" · "))}</text>`,
      `<rect x="${cardX + cardW - padding - 54}" y="${authorY - 34}" width="54" height="54" rx="17" fill="${accent}" opacity="0.1"/>`,
      `<text x="${cardX + cardW - padding - 27}" y="${authorY + 8}" text-anchor="middle" font-family="Georgia,serif" font-size="46" font-weight="700" fill="${accent}" opacity="0.82">”</text>`
    );
  }

  return parts.join("\n");
}

function drawStars(cx: number, cy: number, rating: number, accent: string): string {
  const r = 8; // Star radius
  const gap = 5;
  const starW = r * 2;
  const step = starW + gap;
  const totalW = 5 * starW + 4 * gap;
  
  const isCentered = cx > 250; // true if quote block is centered
  const startX = isCentered ? cx - totalW / 2 + r : cx + r;

  const polygons: string[] = [];
  for (let idx = 0; idx < 5; idx++) {
    const starCX = startX + idx * step;
    const pts: string[] = [];
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 ? r * 0.44 : r;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      pts.push(`${(starCX + Math.cos(a) * rad).toFixed(1)},${(cy + Math.sin(a) * rad).toFixed(1)}`);
    }
    const fill = idx < rating ? accent : "none";
    const stroke = accent;
    const strokeWidth = idx < rating ? "0" : "1.5";
    polygons.push(
      `<polygon points="${pts.join(" ")}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round"/>`
    );
  }
  return polygons.join("\n");
}
