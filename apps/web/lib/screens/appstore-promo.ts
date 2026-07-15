"use client";

import { getDevice, getVariant } from "@framekit/devices";
import { esc, systemFont } from "./common";
import type { AppStorePromoDoc } from "./types";

export function appStorePromoCardSize(doc: AppStorePromoDoc): { width: number; height: number } {
  return {
    width: doc.cardWidth || 1200,
    height: doc.cardHeight || 900,
  };
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).length <= maxChars) {
      current = current ? current + " " + w : w;
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function renderAppStorePromo(doc: AppStorePromoDoc, avatarUrl?: string, screenshotUrl?: string): string {
  const { width, height } = appStorePromoCardSize(doc);
  const isDark = !!doc.dark;
  const accent = doc.accentColor || "#6366f1";
  
  // Font styling
  const font = systemFont("ios");
  
  // Custom Card Background
  const cardGradientId = "as-promo-bg-" + Math.floor(Math.random() * 1000000);
  const bgMarkup = isDark 
    ? `
      <defs>
        <linearGradient id="${cardGradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#08070b"/>
          <stop offset="50%" stop-color="#111119"/>
          <stop offset="100%" stop-color="#181522"/>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#${cardGradientId})"/>
      <!-- Soft accent glowing background ball -->
      <circle cx="${width - 300}" cy="${height / 2}" r="450" fill="${accent}" opacity="0.18" filter="blur(130px)"/>
    `
    : `
      <defs>
        <linearGradient id="${cardGradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="100%" stop-color="#f0f2f5"/>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#${cardGradientId})"/>
      <circle cx="${width - 300}" cy="${height / 2}" r="400" fill="${accent}" opacity="0.1" filter="blur(110px)"/>
    `;

  const cardBg = isDark ? "#16161d" : "#ffffff";
  const cardStroke = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
  const shadowColor = isDark ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.06)";
  const textPrimary = isDark ? "#ffffff" : "#111827";
  const textSecondary = isDark ? "rgba(255, 255, 255, 0.7)" : "rgba(17, 24, 39, 0.65)";
  const textTertiary = isDark ? "rgba(255, 255, 255, 0.45)" : "rgba(17, 24, 39, 0.45)";
  
  const innerCardMarkup = `
    <defs>
      <filter id="promo-card-shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="${shadowColor}" flood-opacity="0.25"/>
      </filter>
    </defs>
    <!-- Base Card Container -->
    <rect x="40" y="40" width="${width - 80}" height="${height - 80}" rx="32" fill="${cardBg}" stroke="${cardStroke}" stroke-width="1.5" filter="url(#promo-card-shadow)"/>
  `;

  // Pill Badge Markup
  const badgeMarkup = `
    <g transform="translate(90, 95)">
      <rect width="180" height="34" rx="17" fill="${accent}" opacity="0.12"/>
      <rect width="180" height="34" rx="17" fill="none" stroke="${accent}" stroke-width="1.5" opacity="0.6"/>
      <text x="90" y="21" font-family="${font}" font-size="11" font-weight="800" fill="${accent}" letter-spacing="1.5" text-anchor="middle">${esc(doc.badgeText || "FEATURED")}</text>
    </g>
  `;

  // Wrapped Title & Subtitle lines
  const titleLines = wrapText(doc.title, 18);
  const subtitleLines = wrapText(doc.subtitle, 32);

  const titleY = 190;
  const titleMarkup = titleLines.map((line, idx) => {
    const y = titleY + idx * 80;
    return `<text x="90" y="${y}" font-family="${font}" font-size="76" font-weight="800" fill="${textPrimary}" letter-spacing="-1.5">${esc(line)}</text>`;
  }).join("");

  const subtitleStart = titleY + titleLines.length * 80 + 10;
  const subtitleMarkup = subtitleLines.map((line, idx) => {
    const y = subtitleStart + idx * 36;
    return `<text x="90" y="${y}" font-family="${font}" font-size="26" font-weight="500" fill="${textSecondary}" letter-spacing="-0.3" opacity="0.9">${esc(line)}</text>`;
  }).join("");

  // App ratings
  const starsCount = Math.max(1, Math.min(5, Math.round(doc.ratingValue || 5)));
  const starString = "★".repeat(starsCount) + "☆".repeat(5 - starsCount);
  const ratingsY = subtitleStart + subtitleLines.length * 36 + 40;
  const ratingsMarkup = `
    <g transform="translate(90, ${ratingsY})">
      <text x="0" y="24" font-family="${font}" font-size="28" font-weight="800" fill="${textPrimary}">${doc.ratingValue.toFixed(1)}</text>
      <text x="50" y="22" font-family="${font}" font-size="20" font-weight="600" fill="#fbbf24" letter-spacing="2">${starString}</text>
      <text x="190" y="22" font-family="${font}" font-size="16" font-weight="500" fill="${textTertiary}">${esc(doc.reviewsCountText || "12.4K ratings")}</text>
    </g>
  `;

  // App Store Download Button
  const btnY = ratingsY + 70;
  const appIconClipId = "as-promo-icon-clip-" + Math.floor(Math.random() * 1000000);
  const iconMarkup = avatarUrl 
    ? `
      <defs>
        <clipPath id="${appIconClipId}">
          <rect x="90" y="${btnY}" width="90" height="90" rx="20"/>
        </clipPath>
      </defs>
      <image href="${avatarUrl}" x="90" y="${btnY}" width="90" height="90" preserveAspectRatio="xMidYMid slice" clip-path="url(#${appIconClipId})"/>
    `
    : `
      <rect x="90" y="${btnY}" width="90" height="90" rx="20" fill="${accent}" opacity="0.15"/>
      <rect x="90" y="${btnY}" width="90" height="90" rx="20" fill="none" stroke="${accent}" stroke-width="2"/>
      <text x="135" y="${btnY + 56}" font-family="${font}" font-size="40" font-weight="800" fill="${accent}" text-anchor="middle">${esc(doc.title.slice(0,1).toUpperCase())}</text>
    `;

  const btnMarkup = `
    <g>
      ${iconMarkup}
      <!-- Action Download Button -->
      <rect x="200" y="${btnY + 22}" width="160" height="46" rx="23" fill="${accent}"/>
      <text x="280" y="${btnY + 50}" font-family="${font}" font-size="15" font-weight="800" fill="#ffffff" text-anchor="middle">${esc(doc.buttonText || "GET")}</text>
      <!-- Subtext -->
      <text x="200" y="${btnY + 86}" font-family="${font}" font-size="11" font-weight="600" fill="${textTertiary}">In-App Purchases</text>
    </g>
  `;

  // Right column Mockup Device rendering using getDevice/getVariant
  const deviceId = doc.deviceId || "iphone-16-pro";
  const device = getDevice(deviceId) || getDevice("iphone-16-pro");
  let deviceMarkup = "";

  if (device) {
    const variant = getVariant(device, isDark ? "dark" : "light");
    const { frame } = device;
    const rect = frame.screenRect;
    const screenClipId = "as-promo-screen-clip-" + Math.floor(Math.random() * 1000000);

    const maxDevW = 460;
    const maxDevH = 720;
    const scale = Math.min(maxDevW / frame.width, maxDevH / frame.height);
    const scaledW = frame.width * scale;
    const scaledH = frame.height * scale;

    const dx = width - 90 - scaledW - (maxDevW - scaledW) / 2;
    const dy = 90 + (maxDevH - scaledH) / 2;

    deviceMarkup = `
      <g transform="translate(${dx}, ${dy}) scale(${scale})">
        <!-- Phone Shadow -->
        <rect x="15" y="25" width="${frame.width - 30}" height="${frame.height - 10}" rx="${(device.screen.cornerRadius || 28) + 12}" fill="#000000" opacity="0.32" filter="blur(24px)"/>
        
        <!-- Device Body -->
        <g>${variant.body}</g>
        
        <!-- Screen Content Clipped by frame.maskPath -->
        <defs>
          <clipPath id="${screenClipId}">
            <path d="${frame.maskPath}" />
          </clipPath>
        </defs>
        <g clip-path="url(#${screenClipId})">
          ${screenshotUrl 
            ? `<image href="${screenshotUrl}" x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" preserveAspectRatio="xMidYMid slice"/>`
            : `<rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" fill="${isDark ? "#121216" : "#f0f2f5"}"/>
               <circle cx="${rect.x + rect.width / 2}" cy="${rect.y + rect.height / 2}" r="64" fill="${accent}" opacity="0.12"/>
               <rect x="${rect.x + rect.width / 2 - 80}" y="${rect.y + rect.height / 2 + 50}" width="160" height="12" rx="6" fill="${accent}" opacity="0.15"/>
               <rect x="${rect.x + rect.width / 2 - 50}" y="${rect.y + rect.height / 2 + 76}" width="100" height="10" rx="5" fill="${accent}" opacity="0.15"/>`
          }
        </g>
        
        <!-- Device Overlay -->
        <g>${variant.overlay}</g>
      </g>
    `;
  }

  return `
    ${bgMarkup}
    ${innerCardMarkup}
    ${badgeMarkup}
    ${titleMarkup}
    ${subtitleMarkup}
    ${ratingsMarkup}
    ${btnMarkup}
    ${deviceMarkup}
  `;
}
