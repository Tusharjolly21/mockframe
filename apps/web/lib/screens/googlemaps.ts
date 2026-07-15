"use client";

import { esc, systemFont } from "./common";
import type { GoogleMapsDoc } from "./types";

export function googleMapsCardSize(doc: GoogleMapsDoc): { width: number; height: number } {
  return {
    width: 402,
    height: 185,
  };
}

export function renderGoogleMaps(doc: GoogleMapsDoc): string {
  const isDark = !!doc.dark;
  const width = 402;
  const height = doc.standalone ? googleMapsCardSize(doc).height : 874;
  
  const marginX = 12;
  const marginY = 16;
  const cardW = width - marginX * 2;
  
  const font = systemFont("android");
  const textPrimary = isDark ? "#ffffff" : "#202124";
  const textSecondary = isDark ? "#9aa0a6" : "#5f6368";
  const mapBg = isDark ? "#121212" : "#f8f9fa";
  const roadColor = isDark ? "#2a2b2e" : "#ffffff";
  const parkColor = isDark ? "#1c3222" : "#e8f5e9";
  const waterColor = isDark ? "#122a3d" : "#c6ecff";
  
  const greenHeaderBg = "#137333";
  const greenText = "#137333";
  const redEndBg = "#d93025";
  const cardBg = isDark ? "#202124" : "#ffffff";
  const cardStroke = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const shadowColor = isDark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.15)";

  const renderNavCard = (x: number, y: number, isStandaloneCard = false) => {
    const cardH = isStandaloneCard ? googleMapsCardSize(doc).height - 32 : 142;
    
    return `
      <g>
        <defs>
          <filter id="maps-shadow-${y}" x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="${shadowColor}" flood-opacity="0.22"/>
          </filter>
        </defs>
        <!-- Base Card -->
        <rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="20" fill="${cardBg}" stroke="${cardStroke}" stroke-width="0.5" filter="url(#maps-shadow-${y})"/>
        
        <!-- Top Green Instruction Segment -->
        <path d="M ${x + 20},${y} L ${x + cardW - 20},${y} A 20,20 0 0 1 ${x + cardW},${y + 20} L ${x + cardW},${y + 68} L ${x},${y + 68} L ${x},${y + 20} A 20,20 0 0 1 ${x + 20},${y} Z" fill="${greenHeaderBg}"/>
        
        <!-- Green Arrow Turn Indicator Icon -->
        <circle cx="${x + 28}" cy="${y + 34}" r="16" fill="rgba(255,255,255,0.15)"/>
        <path d="M${x + 23},${y + 40} L${x + 23},${y + 30} A4,4 0 0,1 ${x + 27},${y + 26} L${x + 33},${y + 26}" stroke="#ffffff" stroke-width="3.5" fill="none" stroke-linecap="round"/>
        <path d="M${x + 30},${y + 22} L${x + 35},${y + 26} L${x + 30},${y + 30}" fill="#ffffff" stroke="#ffffff" stroke-width="1" stroke-linejoin="round"/>
        
        <!-- Instruction Text inside Green header -->
        <text x="${x + 58}" y="${y + 34}" font-family="${font}" font-size="14.5" font-weight="700" fill="#ffffff" letter-spacing="-0.15">${esc(doc.instruction)}</text>
        <text x="${x + 58}" y="${y + 51}" font-family="${font}" font-size="11.5" font-weight="500" fill="rgba(255,255,255,0.85)">In 1/4 mi · Merge onto highway</text>
        
        <!-- Bottom Stats segment inside card -->
        <g transform="translate(0, 68)">
          <!-- Time info (e.g. 24 min) -->
          <text x="${x + 20}" y="${y + 28}" font-family="${font}" font-size="19" font-weight="700" fill="${greenText}">${esc(String(doc.durationMinutes))} min</text>
          <!-- Distance and ETA details -->
          <text x="${x + 20}" y="${y + 45}" font-family="${font}" font-size="12" font-weight="600" fill="${textSecondary}">${esc(doc.distanceText)} · 10:18 AM</text>
          
          <!-- Route itinerary -->
          <text x="${x + 20}" y="${y + 58}" font-family="${font}" font-size="10.5" font-weight="500" fill="${textSecondary}">Via ${esc(doc.start)} to ${esc(doc.destination)}</text>
          
          <!-- Red End Button -->
          <rect x="${x + cardW - 56}" y="${y + 14}" width="36" height="36" rx="18" fill="${redEndBg}" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))"/>
          <!-- Bold X close path inside button -->
          <path d="M${x + cardW - 44},${y + 26} L${x + cardW - 32},${y + 38} M${x + cardW - 32},${y + 26} L${x + cardW - 44},${y + 38}" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
        </g>
      </g>
    `;
  };

  if (doc.standalone) {
    return `
      <g>
        ${renderNavCard(marginX, marginY, true)}
      </g>
    `;
  }

  // Full Phone HUD view
  return `
    <rect width="${width}" height="${height}" fill="${mapBg}"/>
    
    <!-- Parks -->
    <rect x="0" y="80" width="160" height="220" rx="16" fill="${parkColor}"/>
    <rect x="260" y="480" width="180" height="190" rx="20" fill="${parkColor}"/>
    
    <!-- Lake -->
    <path d="M-10,340 C100,320 200,380 260,340 C320,300 380,310 420,330 L420,440 C380,420 320,410 260,430 C200,450 100,390 -10,410 Z" fill="${waterColor}"/>
    
    <!-- Roads network -->
    <g stroke="${roadColor}" fill="none" stroke-linecap="round">
      <path d="M40,0 L40,874" stroke-width="6"/>
      <path d="M140,0 L140,874" stroke-width="4"/>
      <path d="M240,0 L240,874" stroke-width="4"/>
      <path d="M340,0 L340,874" stroke-width="6"/>
      
      <path d="M0,160 L402,160" stroke-width="5"/>
      <path d="M0,320 L402,320" stroke-width="4"/>
      <path d="M0,520 L402,520" stroke-width="4"/>
      <path d="M0,720 L402,720" stroke-width="6"/>
    </g>

    <!-- Navigation Blue route path -->
    <g fill="none" stroke-linecap="round" stroke-linejoin="round">
      <!-- Shadow path -->
      <path d="M40,720 L140,520 L240,320 L340,160" stroke="rgba(0,0,0,0.12)" stroke-width="12"/>
      <!-- Active navigation highlight -->
      <path d="M40,720 L140,520 L240,320 L340,160" stroke="${doc.routeColor || "#1a73e8"}" stroke-width="8"/>
    </g>
    
    <!-- Destination Pin (Red) -->
    <g transform="translate(340, 160)">
      <circle cx="0" cy="0" r="16" fill="rgba(217, 48, 37, 0.2)"/>
      <path d="M0,0 C-8,-12 -8,-24 0,-32 C8,-24 8,-12 0,0 Z" fill="#ea4335" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.25))"/>
      <circle cx="0" cy="-20" r="4.5" fill="#ffffff"/>
    </g>
    
    <!-- Current location arrow navigation GPS dot -->
    <g transform="translate(140, 520)">
      <circle cx="0" cy="0" r="22" fill="rgba(66, 133, 244, 0.22)"/>
      <circle cx="0" cy="0" r="12" fill="#ffffff" filter="drop-shadow(0 2px 5px rgba(0,0,0,0.2))"/>
      <circle cx="0" cy="0" r="8" fill="#4285f4"/>
      <!-- Small pointer arrow -->
      <polygon points="0,-7 4,3 0,1 -4,3" fill="#ffffff" transform="rotate(-35)"/>
    </g>

    <!-- Top floating Navigation Instruction card -->
    ${renderNavCard(marginX, 56)}
    
    <!-- Bottom HUD stats segment -->
    <g transform="translate(${marginX}, 712)">
      <rect width="${cardW}" height="90" rx="16" fill="${cardBg}" stroke="${cardStroke}" stroke-width="0.5" filter="drop-shadow(0 4px 12px ${shadowColor})"/>
      <text x="24" y="32" font-family="${font}" font-size="22" font-weight="700" fill="${greenText}">16 min</text>
      <text x="24" y="52" font-family="${font}" font-size="13" font-weight="600" fill="${textSecondary}">4.8 mi · 9:57 AM</text>
      
      <!-- Red circle close end navigation button -->
      <rect x="${cardW - 64}" y="20" width="40" height="40" rx="20" fill="${redEndBg}" filter="drop-shadow(0 2px 6px rgba(0,0,0,0.12))"/>
      <path d="M${cardW - 50},30 L${cardW - 38},42 M${cardW - 38},30 L${cardW - 50},42" stroke="#ffffff" stroke-width="2.8" stroke-linecap="round"/>
    </g>
    
    <!-- Home Bar -->
    <rect x="${width / 2 - 65}" y="856" width="130" height="5" rx="2.5" fill="${textPrimary}" opacity="0.45"/>
  `;
}
