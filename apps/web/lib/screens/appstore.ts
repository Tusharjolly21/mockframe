"use client";

import { esc, storeShotTile, systemFont, textBlock, truncate, wrapText } from "./common";
import type { AppStoreDoc } from "./types";

/* ------------------------------ standalone card ------------------------------
   The top of an App Store product page: icon, name, GET, the info strip
   (ratings, award, age, chart, developer) and the first screenshots. */

const CARD_X = 14;
const CARD_W = 402 - CARD_X * 2;
const CARD_H = 470;

function renderAppStoreCard(doc: AppStoreDoc, avatarUrl?: string): string {
  const dark = !!doc.dark;
  const font = systemFont("ios");
  const x = CARD_X;
  const y = 14;
  const ink = dark ? "#ffffff" : "#000000";
  const sub = dark ? "rgba(235,235,245,0.6)" : "rgba(60,60,67,0.6)";
  const line = dark ? "rgba(255,255,255,0.12)" : "rgba(60,60,67,0.14)";
  const blue = "#007aff";
  const ic = 104;
  const ix = x + 20;
  const iy = y + 22;
  const tx = ix + ic + 16;
  const maxT = CARD_W - (tx - x) - 18;
  const titleLines = wrapText(doc.title, 22, maxT).slice(0, 2);
  const initial = esc([...doc.title.trim()][0]?.toUpperCase() ?? "A");
  const rating = Math.min(5, Math.max(0, doc.ratingValue));
  const stars = Array.from({ length: 5 }, (_, i) => {
    const sx = i * 11.5;
    const fill = rating >= i + 0.75 ? sub : rating >= i + 0.25 ? "url(#as-half)" : "none";
    const pts = Array.from({ length: 10 }, (_, k) => {
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const r = k % 2 ? 2.1 : 5;
      return `${(sx + 5 + Math.cos(a) * r).toFixed(2)},${(5.2 + Math.sin(a) * r).toFixed(2)}`;
    }).join(" ");
    return `<polygon points="${pts}" fill="${fill}" stroke="${sub}" stroke-width="0.7" stroke-linejoin="round"/>`;
  }).join("");
  const colW = (CARD_W - 16) / 4;
  const stripY = iy + ic + 30;
  const col = (i: number, head: string, big: string, foot: string, extra = "") => {
    const cx = x + 8 + colW * i + colW / 2;
    return (
      (i > 0 ? `<rect x="${x + 8 + colW * i}" y="${stripY + 6}" width="1" height="46" fill="${line}"/>` : "") +
      `<text x="${cx}" y="${stripY + 12}" font-family="${font}" font-size="9.5" font-weight="600" fill="${sub}" text-anchor="middle" letter-spacing="0.4">${esc(head)}</text>` +
      (big ? `<text x="${cx}" y="${stripY + 38}" font-family="${font}" font-size="20" font-weight="700" fill="${sub}" text-anchor="middle">${esc(big)}</text>` : "") +
      extra +
      `<text x="${cx}" y="${stripY + 58}" font-family="${font}" font-size="10.5" fill="${sub}" text-anchor="middle">${esc(foot)}</text>`
    );
  };
  // award laurels around "Editors' Choice"
  const ax = x + 8 + colW * 1 + colW / 2;
  const laurel = (dir: 1 | -1) =>
    `<g transform="translate(${ax + dir * 27} ${stripY + 31}) scale(${dir} 1)" fill="${sub}">` +
    [0, 1, 2, 3].map((k) => `<ellipse cx="${-1 - k * 0.4}" cy="${-9 + k * 6}" rx="1.8" ry="3.8" transform="rotate(${-25 + k * 18} ${-1 - k * 0.4} ${-9 + k * 6})"/>`).join("") +
    `</g>`;
  const award = laurel(1) + laurel(-1) +
    `<text x="${ax}" y="${stripY + 29}" font-family="${font}" font-size="10" font-weight="700" fill="${sub}" text-anchor="middle">Editors'</text>` +
    `<text x="${ax}" y="${stripY + 41}" font-family="${font}" font-size="10" font-weight="700" fill="${sub}" text-anchor="middle">Choice</text>`;
  // the first screenshots, drawn as small app screens
  const shotY = stripY + 84;
  const shotW = 108;
  const shotH = CARD_H + y - shotY - 18;
  const tiles: Array<[[string, string], [string, string]]> = [
    [["#818cf8", "#4f46e5"], ["Mockups", "in seconds"]],
    [["#f472b6", "#db2777"], ["Every device,", "every size"]],
    [["#34d399", "#059669"], ["Export", "in 4K"]],
  ];
  const shots = tiles.map(([c, cap], i) => storeShotTile(`as-shot${i}`, x + 20 + i * (shotW + 10), shotY, shotW, shotH + 40, c, cap, font)).join("");
  const btn = (doc.buttonText || "GET").toUpperCase();
  const btnW = Math.max(74, btn.length * 9 + 34);
  return `
<defs>
  <filter id="as-card-sh" x="-15%" y="-10%" width="130%" height="130%"><feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#0b1020" flood-opacity="${dark ? 0.5 : 0.16}"/></filter>
  <linearGradient id="as-icon" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8b5cf6"/><stop offset="0.55" stop-color="#6366f1"/><stop offset="1" stop-color="#0ea5e9"/></linearGradient>
  <linearGradient id="as-half" x1="0" x2="1"><stop offset="0.5" stop-color="${sub}"/><stop offset="0.5" stop-color="${sub}" stop-opacity="0"/></linearGradient>
  <clipPath id="as-icon-clip"><rect x="${ix}" y="${iy}" width="${ic}" height="${ic}" rx="24"/></clipPath>
  <clipPath id="as-card-clip"><rect x="${x}" y="${y}" width="${CARD_W}" height="${CARD_H}" rx="28"/></clipPath>
</defs>
<rect x="${x}" y="${y}" width="${CARD_W}" height="${CARD_H}" rx="28" fill="${dark ? "#1c1c1e" : "#ffffff"}" filter="url(#as-card-sh)"/>
${avatarUrl
    ? `<image href="${avatarUrl}" x="${ix}" y="${iy}" width="${ic}" height="${ic}" preserveAspectRatio="xMidYMid slice" clip-path="url(#as-icon-clip)"/>`
    : `<rect x="${ix}" y="${iy}" width="${ic}" height="${ic}" rx="24" fill="url(#as-icon)"/>` +
      `<circle cx="${ix + ic * 0.72}" cy="${iy + ic * 0.26}" r="${ic * 0.34}" fill="#ffffff" opacity="0.14"/>` +
      `<text x="${ix + ic / 2}" y="${iy + ic / 2 + 16}" font-family="${font}" font-size="46" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="-1.5">${initial}</text>`}
<rect x="${ix}" y="${iy}" width="${ic}" height="${ic}" rx="24" fill="none" stroke="${dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}"/>
${textBlock(titleLines, { font, x: tx, y: iy + 24, size: 22, lineHeight: 26, color: ink, weight: 700 })}
<text x="${tx}" y="${iy + 24 + titleLines.length * 26 - 4}" font-family="${font}" font-size="14.5" fill="${sub}">${esc(truncate(doc.subtitle, 14.5, maxT))}</text>
<rect x="${tx}" y="${iy + ic - 30}" width="${btnW}" height="30" rx="15" fill="${blue}"/>
<text x="${tx + btnW / 2}" y="${iy + ic - 10}" font-family="${font}" font-size="15" font-weight="700" fill="#ffffff" text-anchor="middle">${esc(btn)}</text>
<text x="${tx + btnW + 10}" y="${iy + ic - 18}" font-family="${font}" font-size="9" fill="${sub}">In-App</text>
<text x="${tx + btnW + 10}" y="${iy + ic - 7}" font-family="${font}" font-size="9" fill="${sub}">Purchases</text>
<g transform="translate(${x + CARD_W - 40} ${iy + ic - 30})" fill="none" stroke="${blue}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8h14v-8M11 3v12M7 7l4-4 4 4"/></g>
<rect x="${x + 20}" y="${stripY - 12}" width="${CARD_W - 40}" height="1" fill="${line}"/>
${col(0, `${doc.ratingCount.toUpperCase()} RATINGS`, rating.toFixed(1), "", `<g transform="translate(${x + 8 + colW / 2 - 28.5} ${stripY + 47})">${stars}</g>`)}
${col(1, "AWARD", "", doc.category, award)}
${col(2, "AGE", "4+", "Years Old")}
${col(3, "DEVELOPER", "", truncate(doc.developer, 10.5, colW - 8), `<g transform="translate(${x + 8 + colW * 3 + colW / 2 - 11} ${stripY + 20})" fill="none" stroke="${sub}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="7" r="4"/><path d="M3 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></g>`)}
<rect x="${x + 20}" y="${stripY + 70}" width="${CARD_W - 40}" height="1" fill="${line}"/>
<g clip-path="url(#as-card-clip)">${shots}</g>`;
}

export function appStoreCardSize(doc: AppStoreDoc): { width: number; height: number } {
  return { width: 402, height: CARD_H + 28 };
}

export function renderAppStore(doc: AppStoreDoc, avatarUrl?: string): string {
  if (doc.standalone) return renderAppStoreCard(doc, avatarUrl);
  const isDark = !!doc.dark;
  const width = 402;
  const height = doc.standalone ? appStoreCardSize(doc).height : 874;
  
  const marginX = 20;
  const marginY = 16;
  const cardW = width - marginX * 2;
  
  const font = systemFont("ios");
  const textPrimary = isDark ? "#ffffff" : "#000000";
  const textSecondary = isDark ? "rgba(255, 255, 255, 0.55)" : "rgba(0, 0, 0, 0.45)";
  const appBg = isDark ? "#000000" : "#ffffff";
  const cardBg = isDark ? "#1c1c1e" : "#ffffff";
  const cardStroke = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const shadowColor = isDark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.08)";
  const accentBlue = "#007aff";
  const btnBg = isDark ? "#2c2c2e" : "#f0f0f2";
  const dividerColor = isDark ? "#2c2c2e" : "#e5e5ea";
  
  const iconSize = doc.standalone ? 72 : 84;
  const iconClipId = "as-clip";
  
  const getIconDrawing = (ix: number, iy: number) => avatarUrl
    ? `
      <defs>
        <clipPath id="${iconClipId}">
          <rect x="${ix}" y="${iy}" width="${iconSize}" height="${iconSize}" rx="${doc.standalone ? 15 : 18}"/>
        </clipPath>
      </defs>
      <image href="${avatarUrl}" x="${ix}" y="${iy}" width="${iconSize}" height="${iconSize}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${iconClipId})"/>
    `
    : `
      <defs>
        <linearGradient id="as-grad-${iconClipId}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#2a2a2e"/>
          <stop offset="100%" stop-color="#000000"/>
        </linearGradient>
      </defs>
      <rect x="${ix}" y="${iy}" width="${iconSize}" height="${iconSize}" rx="${doc.standalone ? 15 : 18}" fill="url(#as-grad-${iconClipId})" stroke="rgba(255,255,255,0.12)" stroke-width="0.5"/>
      <text x="${ix + iconSize / 2}" y="${iy + iconSize / 2 + (doc.standalone ? 9 : 11)}" font-family="${font}" font-size="${doc.standalone ? 32 : 38}" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="-1">${esc(doc.title.slice(0,1).toUpperCase())}</text>
    `;

  const starsCount = Math.max(1, Math.min(5, Math.round(doc.ratingValue)));
  const starString = "★".repeat(starsCount) + "☆".repeat(5 - starsCount);

  const renderStandaloneCard = (x: number, y: number) => `
    <g>
      <defs>
        <filter id="appstore-shadow" x="-8%" y="-8%" width="116%" height="120%">
          <feDropShadow dx="0" dy="5" stdDeviation="8" flood-color="${shadowColor}" flood-opacity="0.15"/>
        </filter>
      </defs>
      
      <!-- Base Card Container -->
      <rect x="${x - 4}" y="${y}" width="${cardW + 8}" height="${appStoreCardSize(doc).height - y * 2}" rx="20" fill="${cardBg}" stroke="${cardStroke}" stroke-width="0.5" filter="url(#appstore-shadow)"/>
      
      <!-- App Icon -->
      ${getIconDrawing(x + 12, y + 16)}
      
      <!-- App Title (MockFrame) with optimized padding & alignment -->
      <text x="${x + 100}" y="${y + 36}" font-family="${font}" font-size="18.5" font-weight="700" fill="${textPrimary}" letter-spacing="-0.4">${esc(doc.title)}</text>
      
      <!-- App Subtitle -->
      <text x="${x + 100}" y="${y + 53}" font-family="${font}" font-size="12.5" font-weight="500" fill="${textSecondary}" letter-spacing="-0.1">${esc(doc.subtitle)}</text>
      
      <!-- App Action Button ("GET") -->
      <rect x="${x + 100}" y="${y + 69}" width="72" height="26" rx="13" fill="${accentBlue}"/>
      <text x="${x + 136}" y="${y + 86}" font-family="${font}" font-size="12" font-weight="800" fill="#ffffff" text-anchor="middle">${esc(doc.buttonText || "GET")}</text>
      
      <!-- Share Icon (circle with arrow, aligned to the far right of the card) -->
      <g transform="translate(${x + cardW - 24}, ${y + 69})">
        <circle cx="13" cy="13" r="13" fill="${btnBg}"/>
        <g transform="translate(8, 7)" stroke="${accentBlue}" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M1,5 L1,8 C1,8.55 1.45,9 2,9 L8,9 C8.55,9 9,8.55 9,8 L9,5"/>
          <path d="M5,7 L5,1 M2.5,3 L5,0.5 L7.5,3"/>
        </g>
      </g>
      
      <!-- Horizontal Highlights Divider -->
      <line x1="${x + 12}" y1="${y + 116}" x2="${x + cardW - 12}" y2="${y + 116}" stroke="${dividerColor}" stroke-width="0.5"/>
      
      <!-- Highlights Row -->
      <g transform="translate(${x}, ${y + 124})">
        <!-- Rating Column -->
        <g transform="translate(10, 0)">
          <text x="35" y="14" font-family="${font}" font-size="10" font-weight="700" fill="${textSecondary}" text-anchor="middle">RATINGS</text>
          <text x="35" y="34" font-family="${font}" font-size="17" font-weight="800" fill="${textPrimary}" text-anchor="middle">${doc.ratingValue.toFixed(1)}</text>
          <text x="35" y="46" font-family="${font}" font-size="8.5" font-weight="600" fill="${textSecondary}" text-anchor="middle">${starString}</text>
        </g>
        
        <line x1="90" y1="8" x2="90" y2="44" stroke="${dividerColor}" stroke-width="0.5"/>
        
        <!-- Age Column -->
        <g transform="translate(98, 0)">
          <text x="35" y="14" font-family="${font}" font-size="10" font-weight="700" fill="${textSecondary}" text-anchor="middle">AGE</text>
          <text x="35" y="34" font-family="${font}" font-size="17" font-weight="800" fill="${textPrimary}" text-anchor="middle">4+</text>
          <text x="35" y="46" font-family="${font}" font-size="8.5" font-weight="600" fill="${textSecondary}" text-anchor="middle">Years Old</text>
        </g>
        
        <line x1="178" y1="8" x2="178" y2="44" stroke="${dividerColor}" stroke-width="0.5"/>
        
        <!-- Friends Column -->
        <g transform="translate(186, 0)">
          <text x="35" y="14" font-family="${font}" font-size="10" font-weight="700" fill="${textSecondary}" text-anchor="middle">FRIENDS</text>
          <!-- Stack of overlapping circles -->
          <circle cx="23" cy="27" r="7" fill="#ec4899" stroke="${cardBg}" stroke-width="1"/>
          <circle cx="31" cy="27" r="7" fill="#3b82f6" stroke="${cardBg}" stroke-width="1"/>
          <circle cx="39" cy="27" r="7" fill="#10b981" stroke="${cardBg}" stroke-width="1"/>
          <text x="35" y="46" font-family="${font}" font-size="8.5" font-weight="600" fill="${textSecondary}" text-anchor="middle">7 Playing</text>
        </g>
        
        <line x1="266" y1="8" x2="266" y2="44" stroke="${dividerColor}" stroke-width="0.5"/>
        
        <!-- Category Column -->
        <g transform="translate(274, 0)">
          <text x="35" y="14" font-family="${font}" font-size="10" font-weight="700" fill="${textSecondary}" text-anchor="middle">CATEGORY</text>
          <rect x="25" y="22" width="20" height="10" rx="2" fill="none" stroke="${accentBlue}" stroke-width="1.5"/>
          <circle cx="35" cy="27" r="2.5" fill="${accentBlue}"/>
          <text x="35" y="46" font-family="${font}" font-size="9" font-weight="700" fill="${accentBlue}" text-anchor="middle">${esc(doc.category)}</text>
        </g>
      </g>
    </g>
  `;

  if (doc.standalone) {
    return `
      <g>
        ${renderStandaloneCard(marginX, marginY)}
      </g>
    `;
  }

  const renderHeaderOnly = (x: number, y: number) => `
    <g>
      <!-- App Icon -->
      ${getIconDrawing(x, y)}
      
      <!-- App Title -->
      <text x="${x + 98}" y="${y + 24}" font-family="${font}" font-size="20" font-weight="700" fill="${textPrimary}" letter-spacing="-0.4">${esc(doc.title)}</text>
      
      <!-- App Subtitle -->
      <text x="${x + 98}" y="${y + 42}" font-family="${font}" font-size="13" font-weight="500" fill="${textSecondary}" letter-spacing="-0.1">${esc(doc.subtitle)}</text>
      
      <!-- App Action Button ("GET") -->
      <rect x="${x + 98}" y="${y + 58}" width="72" height="26" rx="13" fill="${accentBlue}"/>
      <text x="${x + 134}" y="${y + 75}" font-family="${font}" font-size="12" font-weight="800" fill="#ffffff" text-anchor="middle">${esc(doc.buttonText || "GET")}</text>
      
      <!-- Share Icon (circle with arrow, aligned to the far right) -->
      <g transform="translate(${x + cardW - 26}, ${y + 58})">
        <circle cx="13" cy="13" r="13" fill="${btnBg}"/>
        <g transform="translate(8, 7)" stroke="${accentBlue}" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M1,5 L1,8 C1,8.55 1.45,9 2,9 L8,9 C8.55,9 9,8.55 9,8 L9,5"/>
          <path d="M5,7 L5,1 M2.5,3 L5,0.5 L7.5,3"/>
        </g>
      </g>
    </g>
  `;

  // Full App Store view: render header card + details, charts, previews
  return `
    <rect width="${width}" height="${height}" fill="${appBg}"/>
    
    <!-- Top Nav Header -->
    <g transform="translate(0, 56)">
      <!-- Back Link "< Games" -->
      <path d="M26,16 L18,24 L26,32" stroke="${accentBlue}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="32" y="30" font-family="${font}" font-size="16" font-weight="500" fill="${accentBlue}" letter-spacing="-0.3">Games</text>
      
      <!-- Share Icon Top Right -->
      <g transform="translate(${width - 36}, 14)" stroke="${accentBlue}" stroke-width="2" fill="none" stroke-linejoin="round">
        <rect x="2" y="6" width="16" height="12" rx="2" stroke-width="1.8"/>
        <path d="M10,10 L10,2 M7,5 L10,2 L13,5" stroke-linecap="round"/>
      </g>
    </g>
    
    <!-- Active Header content -->
    ${renderHeaderOnly(marginX, 110)}
    
    <!-- Highlights Row Divider -->
    <line x1="${marginX}" y1="216" x2="${width - marginX}" y2="216" stroke="${dividerColor}" stroke-width="0.5"/>
    
    <!-- Highlights Row (RATINGS, AGE, FRIENDS, CATEGORY) -->
    <g transform="translate(0, 222)">
      <!-- Rating Column -->
      <g transform="translate(20, 0)">
        <text x="35" y="16" font-family="${font}" font-size="10.5" font-weight="700" fill="${textSecondary}" text-anchor="middle">RATINGS</text>
        <text x="35" y="38" font-family="${font}" font-size="19" font-weight="800" fill="${textPrimary}" text-anchor="middle">${doc.ratingValue.toFixed(1)}</text>
        <text x="35" y="50" font-family="${font}" font-size="9.5" font-weight="600" fill="${textSecondary}" text-anchor="middle" letter-spacing="-0.2">${starString}</text>
      </g>
      
      <line x1="108" y1="12" x2="108" y2="48" stroke="${dividerColor}" stroke-width="0.5"/>
      
      <!-- Age Column -->
      <g transform="translate(112, 0)">
        <text x="40" y="16" font-family="${font}" font-size="10.5" font-weight="700" fill="${textSecondary}" text-anchor="middle">AGE</text>
        <text x="40" y="38" font-family="${font}" font-size="19" font-weight="800" fill="${textPrimary}" text-anchor="middle">4+</text>
        <text x="40" y="50" font-family="${font}" font-size="9" font-weight="600" fill="${textSecondary}" text-anchor="middle">Years Old</text>
      </g>
      
      <line x1="202" y1="12" x2="202" y2="48" stroke="${dividerColor}" stroke-width="0.5"/>
      
      <!-- Friends Column (Circular Avatars stack) -->
      <g transform="translate(206, 0)">
        <text x="40" y="16" font-family="${font}" font-size="10.5" font-weight="700" fill="${textSecondary}" text-anchor="middle">FRIENDS</text>
        <!-- Stack of overlapping circles -->
        <circle cx="28" cy="30" r="8" fill="#ec4899" stroke="${appBg}" stroke-width="1"/>
        <circle cx="38" cy="30" r="8" fill="#3b82f6" stroke="${appBg}" stroke-width="1"/>
        <circle cx="48" cy="30" r="8" fill="#10b981" stroke="${appBg}" stroke-width="1"/>
        <text x="40" y="50" font-family="${font}" font-size="9" font-weight="600" fill="${textSecondary}" text-anchor="middle">7 Playing</text>
      </g>
      
      <line x1="298" y1="12" x2="298" y2="48" stroke="${dividerColor}" stroke-width="0.5"/>
      
      <!-- Category Column -->
      <g transform="translate(302, 0)">
        <text x="40" y="16" font-family="${font}" font-size="10.5" font-weight="700" fill="${textSecondary}" text-anchor="middle">CATEGORY</text>
        <!-- Puzzle Piece / Game icon placeholder -->
        <rect x="30" y="24" width="20" height="15" rx="3" fill="none" stroke="${accentBlue}" stroke-width="1.8"/>
        <circle cx="40" cy="30" r="3" fill="${accentBlue}"/>
        <text x="40" y="50" font-family="${font}" font-size="10" font-weight="700" fill="${accentBlue}" text-anchor="middle">${esc(doc.category)}</text>
      </g>
    </g>
    
    <line x1="${marginX}" y1="288" x2="${width - marginX}" y2="288" stroke="${dividerColor}" stroke-width="0.5"/>
    
    <!-- Previews / Screen placeholders -->
    <g transform="translate(${marginX}, 305)">
      <text x="0" y="16" font-family="${font}" font-size="18" font-weight="700" fill="${textPrimary}">Preview</text>
      
      <!-- 2 mock device screens side by side -->
      <rect x="0" y="32" width="174" height="340" rx="16" fill="${isDark ? "#1c1c1e" : "#f2f2f7"}" stroke="${dividerColor}" stroke-width="0.5"/>
      <rect x="188" y="32" width="174" height="340" rx="16" fill="${isDark ? "#1c1c1e" : "#f2f2f7"}" stroke="${dividerColor}" stroke-width="0.5"/>
      
      <!-- App screenshot placeholder UI decor -->
      <circle cx="87" cy="80" r="28" fill="${isDark ? "#2c2c2e" : "#e5e5ea"}"/>
      <rect x="25" y="125" width="124" height="14" rx="4" fill="${isDark ? "#2c2c2e" : "#e5e5ea"}"/>
      <rect x="40" y="148" width="94" height="10" rx="3" fill="${isDark ? "#2c2c2e" : "#e5e5ea"}"/>
      
      <circle cx="275" cy="80" r="28" fill="${isDark ? "#2c2c2e" : "#e5e5ea"}"/>
      <rect x="213" y="125" width="124" height="14" rx="4" fill="${isDark ? "#2c2c2e" : "#e5e5ea"}"/>
      <rect x="228" y="148" width="94" height="10" rx="3" fill="${isDark ? "#2c2c2e" : "#e5e5ea"}"/>
    </g>
    
    <!-- Home Bar -->
    <rect x="${width / 2 - 65}" y="856" width="130" height="5" rx="2.5" fill="${textPrimary}" opacity="0.45"/>
  `;
}
