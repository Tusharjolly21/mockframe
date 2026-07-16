"use client";

import {
  avatar,
  compact,
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
import { renderFramed, type FramedResult } from "./frames";
import { SOCIAL_LABELS, type SocialPostDoc } from "./types";

/**
 * Social post — Facebook / LinkedIn / Threads, mobile feed-card style. One
 * renderer, per-network chrome (wordmark, accent, action labels). Consistent
 * M=16 gutters and a fixed vertical rhythm so every card has real-app padding.
 */

const M = 16;
const GAP = 14;
const FONT = 16;
const LINE_H = 22;

/** Provider-neutral standalone card. Imported posts should look like a
 * MockFrame composition, not a fragile screenshot of another product's UI. */
export function renderSocialCard(doc: SocialPostDoc, avatarUrl?: string): FramedResult {
  const dark = !!doc.chrome.dark;
  const font = fontFor("social", doc.chrome.platform ?? "ios");
  const viewportW = Math.max(300, Math.min(620, doc.cardWidth ?? 440));
  const frame = doc.frame ?? "none";
  const c = dark
    ? { card: "#17191f", text: "#f4f4f5", subtle: "#a1a1aa", hairline: "#30323a" }
    : { card: "#f8fbff", text: "#262a31", subtle: "#858d98", hairline: "#dfe8f2" };

  return renderFramed(
    frame,
    { cardBg: c.card, barBg: dark ? "#1d1f26" : "#f7f7f9", barText: c.subtle, dark, title: "MockFrame post" },
    (x, y, w) => {
      const p = Math.max(12, Math.min(40, doc.postPadding ?? 24));
      const size = Math.max(14, Math.min(34, doc.postFontSize ?? 23));
      const lineH = Math.round(size * 1.42);
      const inX = x + p;
      const contentW = w - p * 2;
      const source = doc.sourceLabel || SOCIAL_LABELS[doc.network] || "Post";
      const subtitle = doc.subtitle || (doc.network === "threads" ? `@${doc.name.replace(/^@/, "")}` : "");
      const parts: string[] = [];
      let cy = y + p;

      parts.push(`<rect x="${x}" y="${y}" width="${w}" height="1" fill="${c.hairline}" opacity="0"/>`);
      parts.push(avatar(doc.name, inX + 24, cy + 24, 24, "mfpost", avatarUrl));
      parts.push(`<text font-family="${font}" font-size="18" font-weight="750" fill="${c.text}" x="${inX + 62}" y="${cy + 19}">${esc(doc.name)}</text>`);
      if (subtitle) parts.push(`<text font-family="${font}" font-size="14.5" fill="${c.subtle}" x="${inX + 62}" y="${cy + 42}">${esc(subtitle)}</text>`);
      if (doc.network === "x") {
        parts.push(xBrandMark(x + w - p - 34, cy + 7, 34, c.text));
      } else {
        const mark = doc.network === "threads" ? "@" : source;
        const markSize = doc.network === "threads" ? 30 : 14;
        parts.push(`<text font-family="${font}" font-size="${markSize}" font-weight="750" fill="${c.text}" text-anchor="end" x="${x + w - p}" y="${cy + (markSize > 20 ? 34 : 26)}">${esc(mark)}</text>`);
      }
      cy += 76;

      const lines = wrapText(doc.text, size, contentW);
      parts.push(baseTextBlock(lines, { font, x: inX, y: cy, size, lineHeight: lineH, color: c.text }));
      cy += lines.length * lineH + 30;
      if (doc.time) {
        parts.push(`<text font-family="${font}" font-size="14" fill="${c.subtle}" x="${inX}" y="${cy}">${esc(doc.time)}</text>`);
        cy += 28;
      }
      parts.push(`<rect x="${inX}" y="${cy}" width="${contentW}" height="1" fill="${c.hairline}"/>`);
      cy += 30;

      const stats = [
        [compact(doc.shares), doc.network === "x" ? "retweets" : "shares"],
        [compact(doc.likes), "likes"],
        [compact(doc.comments), "replies"],
      ];
      const colW = contentW / stats.length;
      stats.forEach(([value, label], i) => {
        const sx = inX + i * colW;
        parts.push(`<text font-family="${font}" font-size="16" font-weight="750" fill="${c.text}" x="${sx}" y="${cy}">${esc(value)}</text>`);
        parts.push(`<text font-family="${font}" font-size="14" fill="${c.subtle}" x="${sx + textWidth(value, 16) + 7}" y="${cy}">${label}</text>`);
      });
      cy += p + 4;
      return { svg: parts.join("\n"), height: cy - y };
    },
    viewportW,
    { radius: doc.cardRadius, shadow: doc.cardShadow }
  );
}

/** Exact vector path from the supplied icons8-x.svg asset. */
function xBrandMark(x: number, y: number, size: number, color: string): string {
  const scale = size / 50;
  return `<path d="M 11 4 C 7.134 4 4 7.134 4 11 L 4 39 C 4 42.866 7.134 46 11 46 L 39 46 C 42.866 46 46 42.866 46 39 L 46 11 C 46 7.134 42.866 4 39 4 L 11 4 z M 13.085938 13 L 21.023438 13 L 26.660156 21.009766 L 33.5 13 L 36 13 L 27.789062 22.613281 L 37.914062 37 L 29.978516 37 L 23.4375 27.707031 L 15.5 37 L 13 37 L 22.308594 26.103516 L 13.085938 13 z M 16.914062 15 L 31.021484 35 L 34.085938 35 L 19.978516 15 L 16.914062 15 z" fill="${color}" transform="translate(${x} ${y}) scale(${scale})"/>`;
}

export function renderSocial(doc: SocialPostDoc, avatarUrl?: string, lookupUrl?: (id: string) => string | undefined): string {
  const platform = doc.chrome.platform ?? "ios";
  const font = fontFor("social", platform);
  const textBlock = (lines: string[], o: Parameters<typeof baseTextBlock>[1]) =>
    baseTextBlock(lines, { font, ...o });
  const dark = !!doc.chrome.dark;
  const net = doc.network;

  const accent = net === "facebook" ? "#1877f2" : net === "linkedin" ? "#0a66c2" : dark ? "#ffffff" : "#000000";
  const c = dark
    ? { bg: "#18191a", card: "#242526", text: "#e4e6eb", subtle: "#b0b3b8", hairline: "#3a3b3c", topbar: "#242526" }
    : { bg: "#f0f2f5", card: "#ffffff", text: "#050505", subtle: "#65676b", hairline: "#e4e6eb", topbar: "#ffffff" };
  // Threads is edge-to-edge (no card), FB/LinkedIn are cards on a gray feed
  const carded = net !== "threads";

  const parts: string[] = [`<rect width="${SW}" height="${SH}" fill="${carded ? c.bg : c.card}"/>`];

  /* top app bar */
  const TB = 92;
  parts.push(
    `<rect width="${SW}" height="${TB}" fill="${net === "threads" ? c.card : c.topbar}"/>`,
    statusBar({ time: doc.chrome.time, battery: doc.chrome.battery, color: c.text, platform }),
    wordmark(net, c.text, accent, font)
  );

  /* post card */
  const cardX = carded ? 8 : 0;
  const cardW = carded ? SW - 16 : SW;
  let cy = TB + (carded ? 12 : 8);
  const cardTop = cy;
  const inX = cardX + M; // inner left gutter

  /* author row */
  parts.push(avatar(doc.name, inX + 22, cy + 24, 22, "so", avatarUrl));
  const nameY = cy + 20;
  const nameW = textWidth(doc.name, 15.5);
  parts.push(
    `<text font-family="${font}" font-size="15.5" font-weight="700" fill="${c.text}" x="${inX + 56}" y="${nameY}">${esc(doc.name)}</text>`
  );
  if (doc.verified) parts.push(verifiedSeal(inX + 56 + nameW + 6, nameY - 11, accent === "#000000" ? "#0095f6" : accent));
  // second line: LinkedIn headline / Threads @handle / Facebook time · globe
  const line2 =
    net === "linkedin" ? doc.subtitle : net === "threads" ? doc.subtitle : `${doc.time} · 🌎`;
  parts.push(
    `<text font-family="${font}" font-size="12.5" fill="${c.subtle}" x="${inX + 56}" y="${nameY + 18}">${esc(line2)}</text>`
  );
  if (net === "linkedin")
    parts.push(`<text font-family="${font}" font-size="12" fill="${c.subtle}" x="${inX + 56}" y="${nameY + 34}">${esc(doc.time)} · 🌐</text>`);
  if (net === "threads")
    parts.push(`<text font-family="${font}" font-size="12.5" fill="${c.subtle}" text-anchor="end" x="${cardX + cardW - M}" y="${nameY}">${esc(doc.time)}</text>`);
  // "..." menu
  parts.push(`<text font-family="${font}" font-size="18" font-weight="700" fill="${c.subtle}" text-anchor="end" x="${cardX + cardW - M - (net === "threads" ? 24 : 0)}" y="${nameY - 2}">···</text>`);

  cy = nameY + (net === "linkedin" ? 44 : 30) + GAP;

  /* body text */
  const lines = wrapText(doc.text, FONT, cardW - M * 2);
  parts.push(textBlock(lines, { x: inX, y: cy, size: FONT, lineHeight: LINE_H, color: c.text }));
  cy += lines.length * LINE_H + GAP;

  if (net === "threads") {
    /* action icons row + counts (X-like) */
    const ay = cy + 4;
    parts.push(
      // heart, comment, repost, share
      `<path d="M${inX + 9} ${ay + 7} c -7 -4.5 -11 -8.5 -11 -13 a 5.6 5.6 0 0 1 11 -1.7 a 5.6 5.6 0 0 1 11 1.7 c 0 4.5 -4 8.5 -11 13 Z" fill="none" stroke="${c.text}" stroke-width="1.7" stroke-linejoin="round"/>`,
      `<path d="M${inX + 44} ${ay - 8} a 10 9 0 1 0 -4 8 l 5 1.5 -1.4 -4.6 a 10 9 0 0 0 0.4 -4.9 Z" fill="none" stroke="${c.text}" stroke-width="1.7" stroke-linejoin="round"/>`,
      `<path d="M${inX + 74} ${ay - 4} v-6 a4 4 0 0 1 4 -4 h9 m-3 -3 l3 3 -3 3 M${inX + 92} ${ay} v6 a4 4 0 0 1 -4 4 h-9 m3 3 l-3 -3 3 -3" fill="none" stroke="${c.text}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`,
      `<path d="M${inX + 112} ${ay + 2} v-13 m-5 -1 l5 -5 5 5 m-12 8 v9 h14 v-9" fill="none" stroke="${c.text}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`
    );
    parts.push(
      `<text font-family="${font}" font-size="14" fill="${c.subtle}" x="${inX}" y="${ay + 34}">${compact(doc.comments)} replies · ${compact(doc.likes)} likes</text>`,
      `<rect x="0" y="${ay + 50}" width="${SW}" height="0.5" fill="${c.hairline}"/>`
    );
  } else {
    /* FB / LinkedIn: reaction summary + divider + action buttons */
    parts.push(
      `<circle cx="${inX + 8}" cy="${cy - 4}" r="9" fill="#1877f2"/><path d="M${inX + 4} ${cy - 6} l2.5 3 5 -6" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
      `<circle cx="${inX + 20}" cy="${cy - 4}" r="9" fill="#f33e58"/><path d="M${inX + 20} ${cy - 1} c -3.5 -2.2 -5.5 -4 -5.5 -6.2 a 2.7 2.7 0 0 1 5.5 -0.8 a 2.7 2.7 0 0 1 5.5 0.8 c 0 2.2 -2 4 -5.5 6.2 Z" fill="#fff"/>`,
      `<text font-family="${font}" font-size="13.5" fill="${c.subtle}" x="${inX + 36}" y="${cy}">${compact(doc.likes)}</text>`,
      `<text font-family="${font}" font-size="13.5" fill="${c.subtle}" text-anchor="end" x="${cardX + cardW - M}" y="${cy}">${compact(doc.comments)} comments · ${compact(doc.shares)} shares</text>`
    );
    cy += 14;
    parts.push(`<rect x="${inX}" y="${cy}" width="${cardW - M * 2}" height="0.5" fill="${c.hairline}"/>`);
    cy += 22;
    const actions =
      net === "linkedin"
        ? [["Like", thumbPath], ["Comment", commentPath], ["Repost", repostPath], ["Send", sendPath]]
        : [["Like", thumbPath], ["Comment", commentPath], ["Share", sharePath]];
    const colW = (cardW - M * 2) / actions.length;
    actions.forEach(([label, path], i) => {
      const bx = inX + i * colW + colW / 2;
      const labelW = textWidth(label as string, 13);
      const gx = bx - (labelW + 22) / 2;
      parts.push(
        `<g transform="translate(${gx} ${cy - 11}) scale(0.82)"><path d="${path}" fill="none" stroke="${c.subtle}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></g>`,
        `<text font-family="${font}" font-size="13" font-weight="600" fill="${c.subtle}" x="${gx + 22}" y="${cy}">${label}</text>`
      );
    });
    cy += 16;
  }

  /* card outline */
  if (carded) {
    parts.push(
      `<rect x="${cardX}" y="${cardTop - 12}" width="${cardW}" height="${cy - cardTop + 24}" rx="12" fill="none" stroke="${c.hairline}" stroke-width="1"/>`
    );
  }
  cy += carded ? 24 : 16;

  /* comments — FB/LinkedIn gray bubble, Threads flat reply */
  const comments = doc.commentList ?? [];
  for (let i = 0; i < comments.length; i++) {
    const cm = comments[i];
    const cx = inX;
    parts.push(avatar(cm.user, cx + 16, cy + 4, 16, `soc${i}`, cm.avatar ? lookupUrl?.(cm.avatar) : undefined));
    const lines = wrapText(cm.text, 14.5, cardW - 44 - M);
    if (net === "threads") {
      // flat: name + @ then text
      let hx = cx + 42 + textWidth(cm.user, 13.5) + 5;
      parts.push(
        `<text font-family="${font}" font-size="13.5" font-weight="700" fill="${c.text}" x="${cx + 42}" y="${cy + 2}">${esc(cm.user)}</text>`
      );
      if (cm.verified) {
        parts.push(verifiedSeal(hx, cy + 2 - 11, c.text));
        hx += 20;
      }
      parts.push(
        `<text font-family="${font}" font-size="12.5" fill="${c.subtle}" x="${hx}" y="${cy + 2}">${esc(cm.time || "1h")}</text>`
      );
      lines.forEach((l, k) => parts.push(`<text font-family="${font}" font-size="14.5" fill="${c.text}" x="${cx + 42}" y="${cy + 20 + k * 19}">${esc(l)}</text>`));
      cy += 20 + lines.length * 19 + 16;
    } else {
      // gray comment bubble with bold name
      const nameW = textWidth(cm.user, 13);
      const badgeW = cm.verified ? 20 : 0;
      const bw = Math.min(cardW - 44, Math.max(...lines.map((l) => textWidth(l, 14.5)), nameW + badgeW) + 24);
      const bh = 22 + lines.length * 19 + 8;
      const bubbleBg = dark ? "#3a3b3c" : "#f0f2f5";
      parts.push(
        `<rect x="${cx + 40}" y="${cy - 10}" width="${bw.toFixed(0)}" height="${bh}" rx="16" fill="${bubbleBg}"/>`,
        `<text font-family="${font}" font-size="13" font-weight="700" fill="${c.text}" x="${cx + 52}" y="${cy + 6}">${esc(cm.user)}</text>`
      );
      if (cm.verified) {
        parts.push(verifiedSeal(cx + 52 + nameW + 4, cy + 6 - 11, accent === "#000000" ? "#0095f6" : accent));
      }
      lines.forEach((l, k) => parts.push(`<text font-family="${font}" font-size="14.5" fill="${c.text}" x="${cx + 52}" y="${cy + 24 + k * 19}">${esc(l)}</text>`));
      // Like · Reply · time row
      const ry2 = cy - 10 + bh + 14;
      parts.push(
        `<text font-family="${font}" font-size="12" font-weight="600" fill="${c.subtle}" x="${cx + 52}" y="${ry2}">Like</text>`,
        `<text font-family="${font}" font-size="12" font-weight="600" fill="${c.subtle}" x="${cx + 52 + 34}" y="${ry2}">Reply</text>`,
        `<text font-family="${font}" font-size="12" fill="${c.subtle}" x="${cx + 52 + 82}" y="${ry2}">${esc(cm.time || "1h")}</text>`
      );
      cy = ry2 + 20;
    }
  }

  parts.push(homeIndicator(c.text, platform));
  return parts.join("\n");
}

/* ------------------------------- bits & glyphs ------------------------------- */

function wordmark(net: SocialPostDoc["network"], text: string, accent: string, font: string): string {
  if (net === "facebook")
    return `<text font-family="${font}" font-size="24" font-weight="800" fill="${accent}" x="16" y="82" letter-spacing="-0.5">facebook</text>`;
  if (net === "linkedin")
    return (
      `<text font-family="${font}" font-size="22" font-weight="700" fill="${accent}" x="16" y="82">Linked</text>` +
      `<rect x="${16 + textWidth("Linked", 22) + 2}" y="64" width="22" height="22" rx="5" fill="${accent}"/>` +
      `<text font-family="${font}" font-size="15" font-weight="700" fill="#fff" x="${16 + textWidth("Linked", 22) + 7}" y="81">in</text>`
    );
  // threads — the @ mark, centered
  return `<text font-family="${font}" font-size="26" font-weight="800" fill="${text}" text-anchor="middle" x="${SW / 2}" y="84">@</text>`;
}

function verifiedSeal(x: number, y: number, color: string): string {
  const cx = x + 8, cy = y + 8;
  const petals = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    return `<circle cx="${(cx + Math.cos(a) * 8).toFixed(1)}" cy="${(cy + Math.sin(a) * 8).toFixed(1)}" r="3" fill="${color}"/>`;
  }).join("");
  return `${petals}<circle cx="${cx}" cy="${cy}" r="7.5" fill="${color}"/><path d="M${cx - 3.6} ${cy} l 2.6 2.8 4.8 -5.6" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`;
}

const thumbPath = "M6 11 v10 h-3 v-10 Z M6 11 l4.5 -8 c2.6 0.8 3.4 2.6 2.8 5.2 l-0.8 2.6 h6 c2 0 3 1.4 2.5 3.4 l-1.4 5.6 c-0.4 1.7 -1.5 2.6 -3.4 2.6 h-9.8 Z";
const commentPath = "M3 4 h18 a2 2 0 0 1 2 2 v9 a2 2 0 0 1 -2 2 h-9 l-6 5 v-5 h-3 a2 2 0 0 1 -2 -2 v-9 a2 2 0 0 1 2 -2 Z";
const sharePath = "M14 3 l8 8 -8 8 v-4 c-7 0 -11 2 -13 6 c0 -8 4 -12 13 -13 Z";
const repostPath = "M4 9 v-2 a3 3 0 0 1 3 -3 h9 m-3 -3 l3 3 -3 3 M20 15 v2 a3 3 0 0 1 -3 3 h-9 m3 3 l-3 -3 3 -3";
const sendPath = "M22 2 L11 13 M22 2 l-7 20 -4 -9 -9 -4 Z";
