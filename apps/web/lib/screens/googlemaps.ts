"use client";

import { esc, systemFont, textBlock, wrapText } from "./common";
import type { GoogleMapsDoc } from "./types";

/* ------------------------------ standalone card ------------------------------
   Turn-by-turn navigation: a drawn map with the route, the green turn banner
   over it and the ETA sheet underneath. */

const CARD_X = 14;
const CARD_W = 402 - CARD_X * 2;
const CARD_H = 430;
const MAP_H = 300;

function renderGoogleMapsCard(doc: GoogleMapsDoc): string {
  const dark = !!doc.dark;
  const font = systemFont("android");
  const x = CARD_X;
  const y = 14;
  const route = doc.routeColor || "#1a73e8";
  const land = dark ? "#1d2127" : "#eef0ea";
  const block = dark ? "#252a31" : "#f8f8f4";
  const road = dark ? "#3a404a" : "#ffffff";
  const roadEdge = dark ? "#2b3038" : "#dadce0";
  const park = dark ? "#1f3326" : "#cfe8c8";
  const water = dark ? "#16293d" : "#aad3f5";
  const hwy = dark ? "#6b5a2c" : "#fde293";
  const ink = dark ? "#e8eaed" : "#202124";
  const sub = dark ? "#9aa0a6" : "#5f6368";
  const eta = dark ? "#81c995" : "#188038";
  const mx = x;
  const my = y;
  // streets: a slightly skewed grid, a highway and a river
  let streets = "";
  for (let i = -1; i < 9; i++) streets += `<path d="M${mx + i * 52} ${my} l${-40} ${MAP_H}" stroke="${roadEdge}" stroke-width="9"/><path d="M${mx + i * 52} ${my} l${-40} ${MAP_H}" stroke="${road}" stroke-width="6.5"/>`;
  for (let j = 0; j < 7; j++) streets += `<path d="M${mx} ${my + 20 + j * 48} l${CARD_W} ${-24}" stroke="${roadEdge}" stroke-width="9"/><path d="M${mx} ${my + 20 + j * 48} l${CARD_W} ${-24}" stroke="${road}" stroke-width="6.5"/>`;
  const routePath = `M${mx + 64} ${my + 222} L${mx + 108} ${my + 196} L${mx + 156} ${my + 200} L${mx + 196} ${my + 162} L${mx + 262} ${my + 150} L${mx + 300} ${my + 128}`;
  const pinX = mx + 300;
  const pinY = my + 140;
  const banner = 78;
  const bx = x + 12;
  const by = y + 12;
  const instr = wrapText(doc.instruction, 16, CARD_W - 24 - 70).slice(0, 2);
  const sheetY = y + MAP_H;
  return `
<defs>
  <filter id="gm-card-sh" x="-15%" y="-10%" width="130%" height="130%"><feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#0b1a2c" flood-opacity="${dark ? 0.5 : 0.18}"/></filter>
  <filter id="gm-soft" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#000000" flood-opacity="0.22"/></filter>
  <clipPath id="gm-map"><path d="M${x} ${y + 28} a28 28 0 0 1 28 -28 h${CARD_W - 56} a28 28 0 0 1 28 28 v${MAP_H - 28} h-${CARD_W} Z"/></clipPath>
</defs>
<rect x="${x}" y="${y}" width="${CARD_W}" height="${CARD_H}" rx="28" fill="${dark ? "#202124" : "#ffffff"}" filter="url(#gm-card-sh)"/>
<g clip-path="url(#gm-map)">
  <rect x="${mx}" y="${my}" width="${CARD_W}" height="${MAP_H}" fill="${land}"/>
  <rect x="${mx + 20}" y="${my + 30}" width="${CARD_W}" height="${MAP_H}" fill="${block}" opacity="0.6"/>
  <path d="M${mx + 210} ${my + 200} q40 -30 90 -10 t70 30 v80 h-170 Z" fill="${park}"/>
  <path d="M${mx - 10} ${my + 70} q60 -20 90 10 t60 60 q-50 20 -90 -10 t-70 -20 Z" fill="${park}"/>
  <g fill="none" stroke-linecap="round">${streets}</g>
  <path d="M${mx - 10} ${my + MAP_H - 40} C${mx + 90} ${my + MAP_H - 70} ${mx + 180} ${my + MAP_H - 10} ${mx + CARD_W + 10} ${my + MAP_H - 60}" stroke="${water}" stroke-width="26" fill="none"/>
  <path d="M${mx - 10} ${my + 60} C${mx + 120} ${my + 110} ${mx + 230} ${my + 40} ${mx + CARD_W + 10} ${my + 70}" stroke="${dark ? "#4a3f22" : "#f2c94c"}" stroke-width="14" fill="none"/>
  <path d="M${mx - 10} ${my + 60} C${mx + 120} ${my + 110} ${mx + 230} ${my + 40} ${mx + CARD_W + 10} ${my + 70}" stroke="${hwy}" stroke-width="10" fill="none"/>
  <path d="${routePath}" stroke="${dark ? "#0b3d91" : "#174ea6"}" stroke-width="13" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${routePath}" stroke="${route}" stroke-width="8.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="${mx + 64}" cy="${my + 222}" r="16" fill="${route}" opacity="0.18"/>
  <circle cx="${mx + 64}" cy="${my + 222}" r="8.5" fill="${route}" stroke="#ffffff" stroke-width="3"/>
  <g filter="url(#gm-soft)"><path d="M${pinX} ${pinY + 2} c-7 -9 -13 -15 -13 -23 a13 13 0 0 1 26 0 c0 8 -6 14 -13 23 Z" fill="#ea4335"/></g>
  <circle cx="${pinX}" cy="${pinY - 21}" r="5" fill="#a50e0e"/>
  <rect x="${mx + 186}" y="${my + 186}" width="62" height="24" rx="12" fill="${dark ? "#202124" : "#ffffff"}" filter="url(#gm-soft)"/>
  <text x="${mx + 217}" y="${my + 202}" font-family="${font}" font-size="11.5" font-weight="600" fill="${ink}" text-anchor="middle">${esc(`${doc.durationMinutes} min`)}</text>
</g>
<g filter="url(#gm-soft)"><rect x="${bx}" y="${by}" width="${CARD_W - 24}" height="${banner}" rx="20" fill="#0f7b3e"/></g>
<g transform="translate(${bx + 16} ${by + 19})" fill="none" stroke="#ffffff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 38V20c0-5 3-8 8-8h14"/><path d="M24 4l8 8-8 8"/></g>
<text x="${bx + 66}" y="${by + 27}" font-family="${font}" font-size="12.5" font-weight="500" fill="#ffffff" opacity="0.85">In 1/4 mi</text>
${textBlock(instr, { font, x: bx + 66, y: by + 47, size: 16, lineHeight: 19, color: "#ffffff", weight: 600 })}
<text x="${x + 24}" y="${sheetY + 44}" font-family="${font}" font-size="28" font-weight="600" fill="${eta}" letter-spacing="-0.5">${esc(`${doc.durationMinutes} min`)}</text>
<text x="${x + 24}" y="${sheetY + 70}" font-family="${font}" font-size="14" fill="${sub}">${esc(`${doc.distanceText} · ${doc.start} → ${doc.destination}`)}</text>
<text x="${x + 24}" y="${sheetY + 92}" font-family="${font}" font-size="12.5" fill="${sub}">Fastest route now due to traffic conditions</text>
<circle cx="${x + CARD_W - 50}" cy="${sheetY + 50}" r="24" fill="#d93025"/>
<path d="M${x + CARD_W - 57} ${sheetY + 43} l14 14 M${x + CARD_W - 43} ${sheetY + 43} l-14 14" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
<rect x="${x + CARD_W / 2 - 18}" y="${sheetY + 10}" width="36" height="4" rx="2" fill="${dark ? "#5f6368" : "#dadce0"}"/>`;
}

export function googleMapsCardSize(doc: GoogleMapsDoc): { width: number; height: number } {
  return { width: 402, height: CARD_H + 28 };
}

export function renderGoogleMaps(doc: GoogleMapsDoc): string {
  if (doc.standalone) return renderGoogleMapsCard(doc);
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
