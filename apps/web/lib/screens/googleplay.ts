"use client";

import { esc, systemFont } from "./common";
import type { GooglePlayDoc } from "./types";

export function googlePlayCardSize(doc: GooglePlayDoc): { width: number; height: number } {
  return {
    width: 402,
    height: 270,
  };
}

export function renderGooglePlay(doc: GooglePlayDoc, avatarUrl?: string): string {
  const isDark = !!doc.dark;
  const width = 402;
  const height = doc.standalone ? googlePlayCardSize(doc).height : 874;
  
  const marginX = 20;
  const marginY = 16;
  const cardW = width - marginX * 2;
  
  const font = systemFont("android");
  const textPrimary = isDark ? "#ffffff" : "#202124";
  const textSecondary = isDark ? "#9aa0a6" : "#5f6368";
  const appBg = isDark ? "#121212" : "#ffffff";
  const cardBg = isDark ? "#202124" : "#ffffff";
  const cardStroke = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const shadowColor = isDark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.08)";
  const playGreen = "#01875f";
  const dividerColor = isDark ? "#303134" : "#e8eaed";
  
  const iconSize = doc.standalone ? 64 : 72;
  const iconClipId = "gp-clip-" + Math.floor(Math.random() * 10000000);
  
  const getIconDrawing = (ix: number, iy: number) => avatarUrl
    ? `
      <defs>
        <clipPath id="${iconClipId}">
          <rect x="${ix}" y="${iy}" width="${iconSize}" height="${iconSize}" rx="14"/>
        </clipPath>
      </defs>
      <image href="${avatarUrl}" x="${ix}" y="${iy}" width="${iconSize}" height="${iconSize}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${iconClipId})"/>
    `
    : `
      <defs>
        <linearGradient id="gp-grad-${iconClipId}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#01875f"/>
          <stop offset="100%" stop-color="#004d34"/>
        </linearGradient>
      </defs>
      <rect x="${ix}" y="${iy}" width="${iconSize}" height="${iconSize}" rx="14" fill="url(#gp-grad-${iconClipId})"/>
      <text x="${ix + iconSize / 2}" y="${iy + iconSize / 2 + 10}" font-family="${font}" font-size="${doc.standalone ? 28 : 32}" font-weight="900" fill="#ffffff" text-anchor="middle">${esc(doc.title.slice(0,1).toUpperCase())}</text>
    `;

  const renderStandaloneCard = (x: number, y: number) => `
    <g>
      <defs>
        <filter id="googleplay-shadow" x="-8%" y="-8%" width="116%" height="120%">
          <feDropShadow dx="0" dy="5" stdDeviation="8" flood-color="${shadowColor}" flood-opacity="0.15"/>
        </filter>
      </defs>
      
      <!-- Base Card Container -->
      <rect x="${x - 4}" y="${y}" width="${cardW + 8}" height="${googlePlayCardSize(doc).height - y * 2}" rx="20" fill="${cardBg}" stroke="${cardStroke}" stroke-width="0.5" filter="url(#googleplay-shadow)"/>
      
      <!-- App Icon -->
      ${getIconDrawing(x + 12, y + 16)}
      
      <!-- App Title -->
      <text x="${x + 88}" y="${y + 34}" font-family="${font}" font-size="16" font-weight="700" fill="${textPrimary}" letter-spacing="-0.1">${esc(doc.title)}</text>
      
      <!-- App Developer -->
      <text x="${x + 88}" y="${y + 51}" font-family="${font}" font-size="12.5" font-weight="600" fill="${playGreen}">${esc(doc.developer)}</text>
      
      <!-- App Sub-labels (Ads / In-app purchases) -->
      <text x="${x + 88}" y="${y + 65}" font-family="${font}" font-size="10" font-weight="500" fill="${textSecondary}">Contains ads · In-app purchases</text>
      
      <!-- Install button (Full Width in card) -->
      <rect x="${x + 12}" y="${y + 86}" width="${cardW - 16}" height="32" rx="16" fill="${playGreen}"/>
      <text x="${x + cardW / 2}" y="${y + 107}" font-family="${font}" font-size="13" font-weight="700" fill="#ffffff" text-anchor="middle">Install</text>
      
      <!-- Horizontal Divider -->
      <line x1="${x + 12}" y1="${y + 138}" x2="${x + cardW - 12}" y2="${y + 138}" stroke="${dividerColor}" stroke-width="0.5"/>
      
      <!-- Summary metrics row -->
      <g transform="translate(${x}, ${y + 146})">
        <!-- Rating Column -->
        <g transform="translate(10, 0)">
          <text x="45" y="14" font-family="${font}" font-size="13" font-weight="700" fill="${textPrimary}" text-anchor="middle">${doc.ratingValue.toFixed(1)} ★</text>
          <text x="45" y="28" font-family="${font}" font-size="9.5" font-weight="600" fill="${textSecondary}" text-anchor="middle">${esc(doc.ratingCount)}</text>
        </g>
        
        <line x1="110" y1="4" x2="110" y2="28" stroke="${dividerColor}" stroke-width="0.5"/>
        
        <!-- Size Column -->
        <g transform="translate(118, 0)">
          <text x="45" y="14" font-family="${font}" font-size="13" font-weight="700" fill="${textPrimary}" text-anchor="middle">${esc(doc.appSize)}</text>
          <text x="45" y="28" font-family="${font}" font-size="9.5" font-weight="600" fill="${textSecondary}" text-anchor="middle">Verify size</text>
        </g>
        
        <line x1="218" y1="4" x2="218" y2="28" stroke="${dividerColor}" stroke-width="0.5"/>
        
        <!-- Content Rating Column -->
        <g transform="translate(226, 0)">
          <circle cx="45" cy="10" r="7" fill="none" stroke="${textPrimary}" stroke-width="1.2"/>
          <text x="45" y="13" font-family="${font}" font-size="9" font-weight="700" fill="${textPrimary}" text-anchor="middle">3</text>
          <text x="45" y="28" font-family="${font}" font-size="9.5" font-weight="600" fill="${textSecondary}" text-anchor="middle">${esc(doc.contentRating)}</text>
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
      <text x="${x + 88}" y="${y + 24}" font-family="${font}" font-size="17" font-weight="700" fill="${textPrimary}" letter-spacing="-0.1">${esc(doc.title)}</text>
      
      <!-- App Developer -->
      <text x="${x + 88}" y="${y + 42}" font-family="${font}" font-size="13" font-weight="600" fill="${playGreen}">${esc(doc.developer)}</text>
    </g>
  `;

  return `
    <rect width="${width}" height="${height}" fill="${appBg}"/>
    
    <!-- Top Nav Header -->
    <g transform="translate(0, 56)">
      <!-- Back Arrow -->
      <path d="M30,24 L16,24 M22,18 L16,24 L22,30" stroke="${textPrimary}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      
      <!-- Search & Options icons -->
      <circle cx="${width - 66}" cy="24" r="7" stroke="${textPrimary}" stroke-width="2" fill="none"/>
      <line x1="${width - 61}" y1="29" x2="${width - 56}" y2="34" stroke="${textPrimary}" stroke-width="2" stroke-linecap="round"/>
      
      <circle cx="${width - 24}" cy="16" r="1.5" fill="${textPrimary}"/>
      <circle cx="${width - 24}" cy="24" r="1.5" fill="${textPrimary}"/>
      <circle cx="${width - 24}" cy="32" r="1.5" fill="${textPrimary}"/>
    </g>
    
    <!-- Active Header content -->
    ${renderHeaderOnly(marginX, 110)}
    
    <!-- Stats Row (Google Play style) -->
    <g transform="translate(0, 206)">
      <!-- Rating Column -->
      <g transform="translate(42, 0)">
        <text x="30" y="16" font-family="${font}" font-size="13" font-weight="700" fill="${textPrimary}" text-anchor="middle">${doc.ratingValue.toFixed(1)} ★</text>
        <text x="30" y="32" font-family="${font}" font-size="10" font-weight="600" fill="${textSecondary}" text-anchor="middle">${esc(doc.ratingCount)}</text>
      </g>
      
      <line x1="116" y1="8" x2="116" y2="34" stroke="${dividerColor}" stroke-width="0.5"/>
      
      <!-- Size Column -->
      <g transform="translate(130, 0)">
        <text x="30" y="16" font-family="${font}" font-size="13" font-weight="700" fill="${textPrimary}" text-anchor="middle">${esc(doc.appSize)}</text>
        <text x="30" y="32" font-family="${font}" font-size="10" font-weight="600" fill="${textSecondary}" text-anchor="middle">Verify size</text>
      </g>
      
      <line x1="206" y1="8" x2="206" y2="34" stroke="${dividerColor}" stroke-width="0.5"/>
      
      <!-- Content Rating Column -->
      <g transform="translate(220, 0)">
        <circle cx="30" cy="12" r="8" fill="none" stroke="${textPrimary}" stroke-width="1.5"/>
        <text x="30" y="15" font-family="${font}" font-size="9.5" font-weight="700" fill="${textPrimary}" text-anchor="middle">3</text>
        <text x="30" y="32" font-family="${font}" font-size="10" font-weight="600" fill="${textSecondary}" text-anchor="middle">${esc(doc.contentRating)}</text>
      </g>
    </g>
    
    <!-- Install button (Full Width) -->
    <rect x="${marginX}" y="264" width="${cardW}" height="38" rx="19" fill="${playGreen}"/>
    <text x="${width / 2}" y="288" font-family="${font}" font-size="14.5" font-weight="700" fill="#ffffff" text-anchor="middle">Install</text>
    
    <!-- Screenshots Carousel -->
    <g transform="translate(${marginX}, 325)">
      <!-- Previews -->
      <rect x="0" y="0" width="102" height="182" rx="10" fill="${isDark ? "#202124" : "#f1f3f4"}" stroke="${dividerColor}" stroke-width="0.5"/>
      <rect x="116" y="0" width="102" height="182" rx="10" fill="${isDark ? "#202124" : "#f1f3f4"}" stroke="${dividerColor}" stroke-width="0.5"/>
      <rect x="232" y="0" width="102" height="182" rx="10" fill="${isDark ? "#202124" : "#f1f3f4"}" stroke="${dividerColor}" stroke-width="0.5"/>
      
      <!-- Dummy graphics inside previews -->
      <rect x="15" y="40" width="72" height="8" rx="2" fill="${isDark ? "#3c4043" : "#dadce0"}"/>
      <rect x="15" y="60" width="52" height="6" rx="1.5" fill="${isDark ? "#3c4043" : "#dadce0"}"/>
      <circle cx="51" cy="118" r="18" fill="${isDark ? "#3c4043" : "#dadce0"}"/>
      
      <rect x="131" y="40" width="72" height="8" rx="2" fill="${isDark ? "#3c4043" : "#dadce0"}"/>
      <rect x="131" y="60" width="52" height="6" rx="1.5" fill="${isDark ? "#3c4043" : "#dadce0"}"/>
      <circle cx="167" cy="118" r="18" fill="${isDark ? "#3c4043" : "#dadce0"}"/>
      
      <rect x="247" y="40" width="72" height="8" rx="2" fill="${isDark ? "#3c4043" : "#dadce0"}"/>
      <rect x="247" y="60" width="52" height="6" rx="1.5" fill="${isDark ? "#3c4043" : "#dadce0"}"/>
      <circle cx="283" cy="118" r="18" fill="${isDark ? "#3c4043" : "#dadce0"}"/>
    </g>
    
    <!-- About this app -->
    <g transform="translate(${marginX}, 535)">
      <text x="0" y="16" font-family="${font}" font-size="15" font-weight="700" fill="${textPrimary}">About this app</text>
      <path d="M${cardW - 8},8 L${cardW},14 L${cardW - 8},20" stroke="${textSecondary}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="0" y="38" font-family="${font}" font-size="12" font-weight="400" fill="${textSecondary}">Most Powerful Eye Exercises to Improve Eyesight...</text>
      
      <!-- Category Badge Chip -->
      <rect x="0" y="56" width="112" height="26" rx="13" fill="none" stroke="${dividerColor}" stroke-width="1"/>
      <text x="56" y="73" font-family="${font}" font-size="11.5" font-weight="600" fill="${textSecondary}" text-anchor="middle">Health &amp; Fitness</text>
    </g>
    
    <!-- Ratings & Reviews -->
    <g transform="translate(${marginX}, 660)">
      <text x="0" y="16" font-family="${font}" font-size="15" font-weight="700" fill="${textPrimary}">Ratings and reviews</text>
      <path d="M${cardW - 8},8 L${cardW},14 L${cardW - 8},20" stroke="${textSecondary}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      
      <!-- Big rating display -->
      <text x="0" y="58" font-family="${font}" font-size="44" font-weight="700" fill="${textPrimary}">4.6</text>
      <!-- Mini green stars -->
      <text x="0" y="76" font-family="${font}" font-size="12" font-weight="700" fill="${playGreen}">★★★★★</text>
      
      <!-- Bar chart layout -->
      <g transform="translate(100, 24)" fill="${isDark ? "#3c4043" : "#e8eaed"}" stroke="none">
        <rect x="0" y="0" width="150" height="6" rx="3" fill="${playGreen}"/>
        <rect x="0" y="10" width="150" height="6" rx="3" fill="${playGreen}" opacity="0.6"/>
        <rect x="0" y="20" width="150" height="6" rx="3"/>
        <rect x="0" y="30" width="150" height="6" rx="3"/>
        <rect x="0" y="40" width="150" height="6" rx="3"/>
      </g>
    </g>
    
    <!-- Navigation gesture line -->
    <rect x="${width / 2 - 40}" y="864" width="80" height="4" rx="2" fill="${textPrimary}" opacity="0.25"/>
  `;
}
