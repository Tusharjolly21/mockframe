"use client";

import { avatar, esc, textBlock, wrapText, UI_FONT, IOS_FONT, systemFont } from "./common";
import type { SpotifyDoc } from "./types";

export function spotifyCardSize(doc: SpotifyDoc): { width: number; height: number } {
  return {
    width: 402,
    height: 440,
  };
}

export function renderSpotify(doc: SpotifyDoc, avatarUrl?: string): string {
  const isDark = doc.dark !== false; // default to dark mode for Spotify look
  const width = 402;
  const height = doc.standalone ? spotifyCardSize(doc).height : 874;
  
  const marginX = 16;
  const marginY = 16;
  const cardW = width - marginX * 2;
  const cardH = 400; // static card height
  
  const font = systemFont("ios");
  const textPrimary = isDark ? "#ffffff" : "#121212";
  const textSecondary = isDark ? "#b3b3b3" : "#535353";
  const cardBg = isDark ? "#121212" : "#ffffff";
  const cardStroke = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const shadowColor = isDark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.15)";
  const progressBg = isDark ? "#4d4d4d" : "#cccccc";
  const progressFill = "#1db954"; // Spotify green
  
  // Cover art rendering
  const artSize = 160;
  const artX = marginX + (cardW - artSize) / 2;
  const artY = marginY + 24;
  
  const defaultArtSvg = `
    <rect width="${artSize}" height="${artSize}" rx="8" fill="#282828"/>
    <!-- Musical note icon -->
    <path d="M90,50 L90,100 C90,110 80,115 70,115 C60,115 50,110 50,100 C50,90 60,85 70,85 C80,85 85,90 85,95 L85,60 L110,50 L110,65 L90,75 Z" fill="#b3b3b3" transform="translate(10, 5)"/>
  `;
  
  const coverDrawing = avatarUrl
    ? `<image href="${avatarUrl}" x="${artX}" y="${artY}" width="${artSize}" height="${artSize}" preserveAspectRatio="xMidYMid slice" clip-path="url(#spotify-art-clip)"/>`
    : `<g transform="translate(${artX} ${artY})">${defaultArtSvg}</g>`;

  const progressX = marginX + 24;
  const progressW = cardW - 48;
  const progressY = artY + artSize + 85;
  const fillW = (progressW * Math.min(100, Math.max(0, doc.progressPercent))) / 100;
  
  const playStateIcon = doc.isPlaying
    ? `
      <!-- Pause icon -->
      <rect x="189" y="322" width="6" height="20" rx="2" fill="${textPrimary}"/>
      <rect x="201" y="322" width="6" height="20" rx="2" fill="${textPrimary}"/>
    `
    : `
      <!-- Play icon -->
      <path d="M191,321 L209,332 L191,343 Z" fill="${textPrimary}"/>
    `;
    
  const renderPlayerCard = (x: number, y: number) => `
    <g>
      <defs>
        <filter id="spotify-shadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="8" stdDeviation="15" flood-color="${shadowColor}" flood-opacity="0.3"/>
        </filter>
        <clipPath id="spotify-art-clip"><rect x="${artX}" y="${artY}" width="${artSize}" height="${artSize}" rx="8"/></clipPath>
      </defs>
      
      <!-- Card background -->
      <rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="16" fill="${cardBg}" stroke="${cardStroke}" stroke-width="0.5" filter="url(#spotify-shadow)"/>
      
      <!-- Album Cover -->
      ${coverDrawing}
      
      <!-- Song Title (centered, clamped) -->
      <text x="${width / 2}" y="${artY + artSize + 32}" font-family="${font}" font-size="16" font-weight="700" fill="${textPrimary}" text-anchor="middle">${esc(doc.title)}</text>
      
      <!-- Artist & Album (centered) -->
      <text x="${width / 2}" y="${artY + artSize + 52}" font-family="${font}" font-size="13.5" font-weight="500" fill="${textSecondary}" text-anchor="middle">${esc(doc.artist)} • ${esc(doc.album)}</text>
      
      <!-- Progress Bar -->
      <rect x="${progressX}" y="${progressY}" width="${progressW}" height="4" rx="2" fill="${progressBg}"/>
      <rect x="${progressX}" y="${progressY}" width="${fillW}" height="4" rx="2" fill="${progressFill}"/>
      <circle cx="${progressX + fillW}" cy="${progressY + 2}" r="5" fill="#ffffff" filter="drop-shadow(0 1px 3px rgba(0,0,0,0.3))"/>
      
      <!-- Time stamps -->
      <text x="${progressX}" y="${progressY + 16}" font-family="${font}" font-size="11" font-weight="500" fill="${textSecondary}">${esc(doc.timeElapsed)}</text>
      <text x="${progressX + progressW}" y="${progressY + 16}" font-family="${font}" font-size="11" font-weight="500" fill="${textSecondary}" text-anchor="end">${esc(doc.timeTotal)}</text>
      
      <!-- Playback Controls -->
      <!-- Prev -->
      <g opacity="0.85" transform="translate(132, 322)">
        <path d="M14,0 L0,10 L14,20 Z" fill="${textPrimary}"/>
        <rect x="0" y="0" width="3" height="20" rx="1" fill="${textPrimary}"/>
      </g>
      
      <!-- Play/Pause Circle -->
      <circle cx="198" cy="332" r="24" fill="${isDark ? "#ffffff" : "#121212"}" opacity="0.08"/>
      <circle cx="198" cy="332" r="23" fill="none" stroke="${textPrimary}" stroke-width="1.5"/>
      ${playStateIcon}
      
      <!-- Next -->
      <g opacity="0.85" transform="translate(242, 322)">
        <path d="M0,0 L14,10 L0,20 Z" fill="${textPrimary}"/>
        <rect x="11" y="0" width="3" height="20" rx="1" fill="${textPrimary}"/>
      </g>
      
      <!-- Spotify Logo branding top-right -->
      <path d="M336,36 C342,36 348,41 348,48 C348,54 342,60 336,60 C330,60 324,54 324,48 C324,41 330,36 336,36 Z M336,40 C332,40 328,43 328,48 C328,52 332,56 336,56 C340,56 344,52 344,48 C344,43 340,40 336,40 Z" fill="${progressFill}" opacity="0.85" transform="translate(14, 0)"/>
    </g>
  `;
  
  if (doc.standalone) {
    return `
      <g>
        ${renderPlayerCard(marginX, marginY)}
      </g>
    `;
  }
  
  // Phone View: Draw full-bleed Spotify app mockup player view
  const spotGradientId = `spot-grad-${Math.round(Math.random() * 1000)}`;
  const spotBg = isDark ? "#121212" : "#f7f7f9";
  
  return `
    <rect width="${width}" height="${height}" fill="${spotBg}"/>
    
    <!-- Large background glow matching album art (very Spotify-like) -->
    <defs>
      <radialGradient id="${spotGradientId}" cx="50%" cy="30%" r="60%">
        <stop offset="0%" stop-color="#3c1e70" stop-opacity="${isDark ? "0.6" : "0.35"}"/>
        <stop offset="100%" stop-color="${spotBg}" stop-opacity="1"/>
      </radialGradient>
    </defs>
    <rect width="${width}" height="600" fill="url(#${spotGradientId})"/>
    
    <!-- Top Nav Header -->
    <g transform="translate(0, 56)">
      <!-- Back Arrow -->
      <path d="M28,14 L16,24 L28,34" stroke="${textPrimary}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- Header text -->
      <text x="${width / 2}" y="23" font-family="${font}" font-size="12" font-weight="700" fill="${textPrimary}" text-anchor="middle" letter-spacing="1">PLAYING FROM ALBUM</text>
      <text x="${width / 2}" y="38" font-family="${font}" font-size="13.5" font-weight="600" fill="${textSecondary}" text-anchor="middle">${esc(doc.album)}</text>
      <!-- Option Dots -->
      <circle cx="${width - 24}" cy="24" r="2.5" fill="${textPrimary}"/>
      <circle cx="${width - 24}" cy="16" r="2.5" fill="${textPrimary}"/>
      <circle cx="${width - 24}" cy="32" r="2.5" fill="${textPrimary}"/>
    </g>
    
    <!-- Player Card -->
    ${renderPlayerCard(marginX, 120)}
    
    <!-- Bottom Device Bar -->
    <rect x="${width / 2 - 65}" y="856" width="130" height="5" rx="2.5" fill="${textPrimary}" opacity="0.45"/>
  `;
}
