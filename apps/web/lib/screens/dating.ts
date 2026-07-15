"use client";

import { esc, homeIndicator, initials, SH, statusBar, SW, textWidth, wrapText, avatar, scrollBody, bubbleBaseline, textBlock as baseTextBlock } from "./common";
import { fontFor } from "./fonts";
import type { DatingBrand, DatingDoc } from "./types";

/**
 * Tinder / Bumble discovery card — one renderer, per-brand chrome (like the
 * social generators). Full-bleed profile photo (uploaded or a gradient
 * placeholder), a bottom gradient scrim carrying name·age·job·distance·bio +
 * interest chips, and the brand's swipe-action button row. §15.
 */

const CARD_X = 12;
const CARD_Y = 104;
const CARD_W = SW - 24;
const CARD_H = 588;
const CARD_B = CARD_Y + CARD_H; // 692

interface Btn {
  cx: number;
  r: number;
  icon: (cx: number, cy: number, r: number, color: string) => string;
  color: string;
}

interface BrandCfg {
  grad: [string, string];
  wordmark: string;
  buttons: Btn[];
}

const BRANDS: Record<DatingBrand, BrandCfg> = {
  tinder: {
    grad: ["#fd267a", "#ff6036"],
    wordmark: "tinder",
    buttons: [
      { cx: 52, r: 22, icon: rewindIcon, color: "#ffb02e" },
      { cx: 118, r: 30, icon: xIcon, color: "#fe3c72" },
      { cx: 201, r: 25, icon: starIcon, color: "#1fb6ff" },
      { cx: 284, r: 30, icon: heartIcon, color: "#00e2a0" },
      { cx: 350, r: 22, icon: boltIcon, color: "#9c4dff" },
    ],
  },
  bumble: {
    grad: ["#ffce34", "#ffab00"],
    wordmark: "bumble",
    buttons: [
      { cx: 66, r: 24, icon: rewindIcon, color: "#f0a500" },
      { cx: 150, r: 32, icon: xIcon, color: "#3a3a3a" },
      { cx: 236, r: 26, icon: starIcon, color: "#ffb800" },
      { cx: 330, r: 32, icon: heartIcon, color: "#f5b500" },
    ],
  },
};

export function renderDating(doc: DatingDoc, photoUrl?: string): string {
  if (doc.mode === "chat") {
    return renderDatingChat(doc, photoUrl);
  }
  const platform = doc.chrome.platform ?? "ios";
  const font = fontFor("dating", platform);
  const dark = !!doc.chrome.dark;
  const cfg = BRANDS[doc.brand];
  const pageBg = dark ? "#0d0d0f" : "#ffffff";
  const parts: string[] = [`<rect width="${SW}" height="${SH}" fill="${pageBg}"/>`];

  const barColor = dark ? "#f2f2f2" : "#111111";
  parts.push(statusBar({ time: doc.chrome.time, battery: doc.chrome.battery, color: barColor, platform }));

  /* header: brand wordmark + tabs */
  parts.push(brandHeader(doc.brand, cfg));

  /* card */
  const clip = `dcard`;
  parts.push(`<defs><clipPath id="${clip}"><rect x="${CARD_X}" y="${CARD_Y}" width="${CARD_W}" height="${CARD_H}" rx="18"/></clipPath></defs>`);
  parts.push(`<g clip-path="url(#${clip})">`);

  // photo or gradient placeholder
  if (photoUrl) {
    parts.push(
      `<image href="${photoUrl}" x="${CARD_X}" y="${CARD_Y}" width="${CARD_W}" height="${CARD_H}" preserveAspectRatio="xMidYMid slice"/>`
    );
  } else {
    let h = 0;
    for (const ch of doc.name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const hue = h % 360;
    parts.push(
      `<defs><linearGradient id="dph" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 62% 58%)"/><stop offset="1" stop-color="hsl(${(hue + 40) % 360} 60% 42%)"/></linearGradient></defs>`,
      `<rect x="${CARD_X}" y="${CARD_Y}" width="${CARD_W}" height="${CARD_H}" fill="url(#dph)"/>`,
      `<text font-family="${font}" font-size="150" font-weight="800" fill="rgba(255,255,255,0.22)" text-anchor="middle" x="${SW / 2}" y="${CARD_Y + 300}">${esc(initials(doc.name))}</text>`
    );
  }

  // photo-count segments at the top of the card
  const SEG = 3;
  const gap = 4;
  const segW = (CARD_W - 28 - gap * (SEG - 1)) / SEG;
  for (let i = 0; i < SEG; i++) {
    parts.push(
      `<rect x="${CARD_X + 14 + i * (segW + gap)}" y="${CARD_Y + 12}" width="${segW.toFixed(1)}" height="3.5" rx="1.75" fill="${i === 0 ? "#ffffff" : "rgba(255,255,255,0.4)"}"/>`
    );
  }

  // bottom scrim
  parts.push(
    `<defs><linearGradient id="dscrim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(0,0,0,0)"/><stop offset="1" stop-color="rgba(0,0,0,0.82)"/></linearGradient></defs>`,
    `<rect x="${CARD_X}" y="${CARD_B - 240}" width="${CARD_W}" height="240" fill="url(#dscrim)"/>`
  );

  // profile text on the scrim
  const px = CARD_X + 20;
  let ty = CARD_B - 120;
  const nameStr = `${esc(doc.name)}`;
  parts.push(
    `<text font-family="${font}" font-size="29" font-weight="800" fill="#ffffff" x="${px}" y="${ty}">${nameStr}<tspan font-size="26" font-weight="400"> ${doc.age}</tspan></text>`
  );
  const nx = px + textWidth(doc.name, 29) + textWidth(` ${doc.age}`, 26) + 12;
  if (doc.verified) {
    parts.push(verifiedBadge(nx, ty - 9));
  }
  ty += 26;
  // job · distance line
  const meta: string[] = [];
  if (doc.job) meta.push(doc.job);
  if (doc.distance) meta.push(doc.distance);
  if (meta.length) {
    parts.push(
      `<circle cx="${px + 5}" cy="${ty - 5}" r="1.5" fill="none"/>`,
      briefcase(px, ty - 11),
      `<text font-family="${font}" font-size="14.5" fill="rgba(255,255,255,0.94)" x="${px + 24}" y="${ty}">${esc(meta.join("  ·  "))}</text>`
    );
    ty += 22;
  }
  // bio (one wrapped line, truncated)
  if (doc.bio) {
    const bioLines = wrapText(doc.bio, 14, CARD_W - 40).slice(0, 2);
    bioLines.forEach((l, i) =>
      parts.push(`<text font-family="${font}" font-size="14" fill="rgba(255,255,255,0.86)" x="${px}" y="${ty + i * 19}">${esc(l)}</text>`)
    );
    ty += bioLines.length * 19 + 6;
  }
  // interest chips
  if (doc.interests?.length) {
    let cx = px;
    for (const it of doc.interests.slice(0, 4)) {
      const cw = textWidth(it, 12.5) + 24;
      if (cx + cw > CARD_X + CARD_W - 16) break;
      parts.push(
        `<rect x="${cx}" y="${ty - 12}" width="${cw.toFixed(0)}" height="26" rx="13" fill="rgba(255,255,255,0.22)" stroke="rgba(255,255,255,0.5)" stroke-width="1"/>`,
        `<text font-family="${font}" font-size="12.5" font-weight="600" fill="#ffffff" x="${cx + 12}" y="${ty + 4}">${esc(it)}</text>`
      );
      cx += cw + 8;
    }
  }

  parts.push(`</g>`); // end card clip
  // subtle card border
  parts.push(`<rect x="${CARD_X}" y="${CARD_Y}" width="${CARD_W}" height="${CARD_H}" rx="18" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="1"/>`);

  /* action buttons */
  const by = CARD_B + 52;
  for (const b of cfg.buttons) {
    parts.push(
      `<circle cx="${b.cx}" cy="${by}" r="${b.r}" fill="${dark ? "#1c1c1e" : "#ffffff"}" style="filter:drop-shadow(0 4px 12px rgba(0,0,0,0.16))"/>`,
      b.icon(b.cx, by, b.r, b.color)
    );
  }

  parts.push(homeIndicator(barColor, platform));
  return parts.join("\n");
}

/* ------------------------------- header -------------------------------------- */

function brandHeader(brand: DatingBrand, cfg: BrandCfg): string {
  const y = 78;
  if (brand === "tinder") {
    return (
      `<defs><linearGradient id="tflame" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${cfg.grad[0]}"/><stop offset="1" stop-color="${cfg.grad[1]}"/></linearGradient></defs>` +
      flameIcon(SW / 2 - 44, y - 12, "url(#tflame)") +
      `<text font-family="'Helvetica Neue',Arial,sans-serif" font-size="24" font-weight="800" fill="url(#tflame)" x="${SW / 2 - 26}" y="${y + 5}">tinder</text>`
    );
  }
  // bumble
  return (
    `<text font-family="'Helvetica Neue',Arial,sans-serif" font-size="24" font-weight="800" fill="#f5b500" text-anchor="middle" x="${SW / 2}" y="${y + 5}">bumble</text>` +
    `<circle cx="${SW / 2 + 58}" cy="${y - 4}" r="5" fill="#f5b500"/>`
  );
}

function flameIcon(x: number, y: number, fill: string): string {
  return `<path d="M${x + 9} ${y} c 3 5 -2 7 -1 12 c 0.5 2.5 3 4 5 4 c 3.5 0 6 -2.6 6 -6 c 0 -4 -3 -6 -2.5 -11 c -2 2 -3 3.5 -3.5 6 c -1.5 -1.5 -2 -3.5 -4 -5 Z" fill="${fill}"/>`;
}

/* ------------------------------- small icons --------------------------------- */

function verifiedBadge(x: number, y: number): string {
  return `<circle cx="${x + 9}" cy="${y + 9}" r="9" fill="#39a1ff"/><path d="M${x + 5} ${y + 9.5} l3 3 5 -6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function briefcase(x: number, y: number): string {
  return `<rect x="${x}" y="${y + 4}" width="18" height="12" rx="2.5" fill="none" stroke="rgba(255,255,255,0.94)" stroke-width="1.7"/><path d="M${x + 6} ${y + 4} v-2 a2 2 0 0 1 2 -2 h2 a2 2 0 0 1 2 2 v2" fill="none" stroke="rgba(255,255,255,0.94)" stroke-width="1.7"/>`;
}

/* -------------------------- action-button icons ------------------------------ */

function heartIcon(cx: number, cy: number, r: number, color: string): string {
  const s = r * 0.5;
  return `<path d="M${cx} ${cy + s * 0.9} C ${cx - s * 2} ${cy - s * 0.6} ${cx - s} ${cy - s * 1.7} ${cx} ${cy - s * 0.5} C ${cx + s} ${cy - s * 1.7} ${cx + s * 2} ${cy - s * 0.6} ${cx} ${cy + s * 0.9} Z" fill="${color}"/>`;
}
function xIcon(cx: number, cy: number, r: number, color: string): string {
  const s = r * 0.42;
  return `<path d="M${cx - s} ${cy - s} L${cx + s} ${cy + s} M${cx + s} ${cy - s} L${cx - s} ${cy + s}" stroke="${color}" stroke-width="${(r * 0.24).toFixed(1)}" stroke-linecap="round"/>`;
}
function starIcon(cx: number, cy: number, r: number, color: string): string {
  const R = r * 0.55;
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? R * 0.44 : R;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + Math.cos(a) * rad).toFixed(1)},${(cy + Math.sin(a) * rad).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(" ")}" fill="${color}"/>`;
}
function boltIcon(cx: number, cy: number, r: number, color: string): string {
  const s = r * 0.6;
  return `<path d="M${cx + s * 0.25} ${cy - s} L${cx - s * 0.55} ${cy + s * 0.12} L${cx - s * 0.02} ${cy + s * 0.12} L${cx - s * 0.25} ${cy + s} L${cx + s * 0.55} ${cy - s * 0.12} L${cx + s * 0.02} ${cy - s * 0.12} Z" fill="${color}"/>`;
}
function rewindIcon(cx: number, cy: number, r: number, color: string): string {
  const s = r * 0.5;
  const w = (r * 0.22).toFixed(1);
  return (
    `<path d="M${cx + s} ${cy} a ${s} ${s} 0 1 1 -${s} -${s}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>` +
    `<path d="M${cx} ${cy - s * 1.7} L${cx} ${cy - s} L${cx + s * 0.75} ${cy - s}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`
  );
}

function renderDatingChat(doc: DatingDoc, avatarUrl?: string): string {
  const platform = doc.chrome.platform ?? "ios";
  const font = fontFor("dating", platform);
  const dark = !!doc.chrome.dark;
  const brand = doc.brand;
  
  const c = {
    bg: dark ? "#000000" : "#ffffff",
    headerBg: dark ? "#161619" : "#ffffff",
    hairline: dark ? "#242427" : "#e4e4ec",
    textPrimary: dark ? "#ffffff" : "#111827",
    textSecondary: dark ? "rgba(255,255,255,0.7)" : "rgba(17,24,39,0.6)",
    textTertiary: dark ? "rgba(255,255,255,0.4)" : "rgba(17,24,39,0.4)",
    incoming: dark ? "#212124" : "#f1f1f7",
    incomingText: dark ? "#ffffff" : "#111827",
    accent: brand === "tinder" ? "#fd267a" : "#ffb800",
  };

  const parts: string[] = [`<rect width="${SW}" height="${SH}" fill="${c.bg}"/>`];
  parts.push(statusBar({ time: doc.chrome.time, battery: doc.chrome.battery, color: c.textPrimary, platform }));

  // Header area
  const HEADER_H = 120;
  parts.push(`<rect width="${SW}" height="${HEADER_H}" fill="${c.headerBg}"/>`);
  parts.push(`<rect y="${HEADER_H - 0.5}" width="${SW}" height="0.5" fill="${c.hairline}"/>`);

  // Back chevron
  if (brand === "tinder") {
    parts.push(`<path d="M22 78 l-8 8 l8 8" fill="none" stroke="#8e8e93" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`);
  } else {
    parts.push(`<path d="M22 75 l-8 8 l8 8" fill="none" stroke="${c.accent}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`);
  }

  if (brand === "tinder") {
    // Tinder style: Center-aligned avatar, name below it
    const avatarX = SW / 2;
    const avatarY = 66;
    parts.push(avatar(doc.name, avatarX, avatarY, 20, "dt", avatarUrl));
    
    // Verified badge
    const nameWidth = textWidth(doc.name, 12);
    const nameY = 100;
    parts.push(
      `<text font-family="${font}" font-size="12" font-weight="600" fill="${c.textPrimary}" text-anchor="middle" x="${avatarX}">${esc(doc.name)}</text>`
    );
    if (doc.verified) {
      parts.push(verifiedBadge(avatarX + nameWidth / 2 + 4, nameY - 10));
    }

    // Header Right controls: Blue shield, video icon
    const iconColor = "#007aff";
    parts.push(`
      <g transform="translate(${SW - 44}, 62)" stroke="${iconColor}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </g>
    `);
    parts.push(`
      <g transform="translate(${SW - 88}, 62)" stroke="${iconColor}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M23 7l-7 5 7 5V7z"/>
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
      </g>
    `);
  } else {
    // Bumble style: Left-aligned avatar, name and status subtitle next to it
    const avatarX = 54;
    const avatarY = 82;
    parts.push(avatar(doc.name, avatarX, avatarY, 20, "dt", avatarUrl));

    // Name + Verified
    const nameX = 86;
    const nameY = 78;
    parts.push(
      `<text font-family="${font}" font-size="15" font-weight="700" fill="${c.textPrimary}" x="${nameX}" y="${nameY}">${esc(doc.name)}</text>`
    );
    if (doc.verified) {
      const nameWidth = textWidth(doc.name, 15);
      parts.push(verifiedBadge(nameX + nameWidth + 4, nameY - 14));
    }
    // Subtitle
    parts.push(
      `<text font-family="${font}" font-size="11.5" font-weight="500" fill="#00e2a0" x="${nameX}" y="${nameY + 16}">Active today</text>`
    );

    // Call controls (Video and Phone) on the right
    parts.push(`
      <g transform="translate(${SW - 44}, 68)" stroke="${c.accent}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
      </g>
      <g transform="translate(${SW - 88}, 68)" stroke="${c.accent}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M23 7l-7 5 7 5V7z"/>
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
      </g>
    `);
  }

  // Render Messages
  const bodyStart = parts.length;
  let y = HEADER_H + 20;

  const BUBBLE_MAX = 260;
  const FONT_SIZE = 15;
  const LINE_H = 20;
  const PAD_X = 14;
  const PAD_Y = 10;
  const MARGIN = 16;

  const msgs = doc.messages || [];
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    const mine = m.from === "me";
    const availableWidth = brand === "tinder" && !mine ? BUBBLE_MAX - 52 : BUBBLE_MAX;
    const lines = wrapText(m.text || " ", FONT_SIZE, availableWidth - PAD_X * 2);
    const w = Math.min(
      availableWidth,
      Math.max(...lines.map((l) => textWidth(l, FONT_SIZE))) + PAD_X * 2
    );
    const h = lines.length * LINE_H + PAD_Y * 2;
    
    let x = MARGIN;
    if (mine) {
      x = SW - MARGIN - w;
    } else if (brand === "tinder") {
      x = 52;
    }

    // Bubbles styling
    let bubbleFill = "";
    let textColor = "";

    if (mine) {
      if (brand === "tinder") {
        bubbleFill = "#1eb8ff"; // Tinder reference screenshot solid cyan-blue
        textColor = "#ffffff";
      } else {
        bubbleFill = "#ffce34"; // Bumble yellow
        textColor = "#1e1e24";
      }
    } else {
      bubbleFill = c.incoming;
      textColor = c.incomingText;
    }

    // Render small circular avatar for Tinder incoming messages
    if (brand === "tinder" && !mine) {
      parts.push(avatar(doc.name, 28, y + h - 14, 14, "dt", avatarUrl));
    }

    const isGroupEnd = i === msgs.length - 1 || msgs[i + 1].from !== m.from;

    parts.push(`<rect x="${x}" y="${y}" width="${w.toFixed(1)}" height="${h}" rx="18" fill="${bubbleFill}"/>`);
    parts.push(
      baseTextBlock(lines, {
        font,
        x: x + PAD_X,
        y: bubbleBaseline(y, h, lines.length, LINE_H, FONT_SIZE),
        size: FONT_SIZE,
        lineHeight: LINE_H,
        color: textColor,
      })
    );

    y += h + (isGroupEnd ? 12 : 3);
  }

  const body = parts.splice(bodyStart);
  const inputHeight = brand === "tinder" ? 120 : 80;
  parts.push(scrollBody(body.join("\n"), { top: HEADER_H, bottom: SH - inputHeight, contentBottom: y }));

  // Input area
  const inputY = SH - inputHeight;
  parts.push(`<rect y="${inputY}" width="${SW}" height="${inputHeight}" fill="${c.headerBg}"/>`);
  parts.push(`<rect y="${inputY}" width="${SW}" height="0.5" fill="${c.hairline}"/>`);

  if (brand === "tinder") {
    // Tinder Style Input with bottom icon bar
    parts.push(`
      <rect x="16" y="${inputY + 12}" width="${SW - 32}" height="44" rx="22" fill="${dark ? "#1c1c1e" : "#f1f1f7"}" stroke="none"/>
      <text font-family="${font}" font-size="15" fill="${c.textTertiary}" x="36" y="${inputY + 39}">Type a message...</text>
      <text font-family="${font}" font-size="16" font-weight="600" fill="${dark ? "#48484a" : "#c8c8cd"}" x="${SW - 62}" y="${inputY + 39}">Send</text>
    `);

    // Bottom icons bar distribution
    const iconY = inputY + 70;
    
    // 1. Contact Card Icon
    parts.push(`
      <g transform="translate(${SW / 6 * 1 - 12}, ${iconY})" stroke="${c.textSecondary}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="2" width="20" height="16" rx="2" ry="2"/>
        <circle cx="8" cy="10" r="3"/>
        <line x1="15" y1="8" x2="20" y2="8"/>
        <line x1="15" y1="12" x2="20" y2="12"/>
      </g>
    `);

    // 2. Sticker Icon
    parts.push(`
      <g transform="translate(${SW / 6 * 2 - 12}, ${iconY})" stroke="${c.textSecondary}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="3" ry="3"/>
        <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
        <circle cx="15.5" cy="8.5" r="1.5" fill="currentColor"/>
        <path d="M7 14.5 C 7 14.5, 9 17, 12 17 C 15 17, 17 14.5, 17 14.5"/>
      </g>
    `);

    // 3. GIF Icon
    parts.push(`
      <g transform="translate(${SW / 6 * 3 - 12}, ${iconY})">
        <circle cx="12" cy="11" r="11" fill="${dark ? "#26262b" : "#f1f1f7"}"/>
        <text font-family="${font}" font-size="9" font-weight="900" fill="${c.textSecondary}" text-anchor="middle" x="12" y="14.5">GIF</text>
      </g>
    `);

    // 4. Music/Notes Icon
    parts.push(`
      <g transform="translate(${SW / 6 * 4 - 10}, ${iconY})" stroke="${c.textSecondary}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 18V5l12-2v13"/>
        <circle cx="6" cy="18" r="3"/>
        <circle cx="18" cy="16" r="3"/>
      </g>
    `);

    // 5. Blue Search circle Icon
    parts.push(`
      <g transform="translate(${SW / 6 * 5 - 12}, ${iconY})">
        <circle cx="12" cy="11" r="11" fill="none" stroke="#00b0ff" stroke-width="2.5"/>
        <circle cx="12" cy="11" r="5" fill="#00b0ff"/>
      </g>
    `);
  } else {
    parts.push(`
      <circle cx="34" cy="${inputY + 32}" r="16" fill="${c.accent}"/>
      <path d="M34 ${inputY + 25} v14 M27 ${inputY + 32} h14" stroke="#1e1e24" stroke-width="2.5" stroke-linecap="round"/>
      <rect x="62" y="${inputY + 12}" width="${SW - 78}" height="40" rx="20" fill="${dark ? "#212124" : "#f1f1f7"}"/>
      <text font-family="${font}" font-size="14.5" fill="${c.textTertiary}" x="80" y="${inputY + 36}">Send a message...</text>
      
      <!-- Microphone icon -->
      <g transform="translate(${SW - 46}, ${inputY + 20})" stroke="${c.textSecondary}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
      </g>
    `);
  }

  parts.push(homeIndicator(c.textPrimary, platform));

  return parts.join("\n");
}
