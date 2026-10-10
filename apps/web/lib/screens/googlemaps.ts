"use client";

import { SH, SW, esc, homeIndicator, statusBar, systemFont, textBlock, truncate, wrapText } from "./common";
import {
  arrivalTime,
  buildings,
  durationText,
  mapPalette,
  maneuverArrow,
  parseInstruction,
  park,
  pathD,
  placeLabel,
  poi,
  renderRoads,
  routeLine,
  type Pt,
  type Road,
} from "./web/gm-map";
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
<rect x="${x}" y="${y}" width="${CARD_W}" height="${CARD_H}" rx="28" fill="${dark ? "#202124" : "#ffffff"}"/>
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
  void doc;
  return { width: 402, height: CARD_H + 28 };
}


/* ------------------------------ phone navigation -----------------------------
   The real Google Maps driving screen: green maneuver banner (under the status
   bar), the north-up-ish map with the route and the blue arrow puck, floating
   round buttons, and the white ETA bar with the exit X. */

const SHEET_H = 112;

function navMap(doc: GoogleMapsDoc, flip: boolean, sheetY: number, font: string): string {
  const dark = !!doc.dark;
  const pal = mapPalette(dark);
  const routeCol = doc.routeColor || "#4285f4";
  const mx = (x: number) => (flip ? SW - x : x);
  const P = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [mx(x), y] as Pt);

  const roads: Road[] = [
    { pts: P([[-40, 296], [80, 342], [200, 352], [250, 342], [340, 310], [450, 262]]), kind: "hwy", name: "CA-85 N", shield: "85", at: 0.2 },
    { pts: P([[200, 930], [200, 480], [200, 360], [200, -30]]), kind: "art" },
    { pts: P([[316, -30], [318, 300], [320, 500], [322, 930]]), kind: "art", name: "Wolfe Rd", at: 0.5 },
    { pts: P([[-30, 522], [200, 514], [430, 498]]), kind: "art", name: "Bubb Rd", at: 0.2 },
    { pts: P([[-30, 232], [430, 208]]), kind: "art", name: "Homestead Rd", at: 0.8 },
    { pts: P([[40, -30], [36, 350], [32, 930]]), kind: "loc", name: "Pasadena Ave", at: 0.31 },
    { pts: P([[118, -30], [116, 330], [112, 930]]), kind: "loc", name: "Rainbow Dr", at: 0.34 },
    { pts: P([[372, -30], [374, 930]]), kind: "loc" },
    { pts: P([[-30, 640], [200, 634], [430, 620]]), kind: "loc", name: "Mary Ave", at: 0.18 },
    { pts: P([[-30, 728], [430, 712]]), kind: "loc", name: "Alves Dr", at: 0.35 },
    { pts: P([[-30, 430], [200, 424], [430, 414]]), kind: "loc", name: "Cali Dr", at: 0.8 },
    { pts: P([[430, 580], [350, 606], [300, 660], [286, 780]]), kind: "loc" },
  ];
  const routeD = flip
    ? `M${SW - 200} 930V430C${SW - 200} 372 ${SW - 226} 350 ${SW - 262} 334C${SW - 300} 318 ${SW - 340} 308 ${SW - 372} 296C${SW - 400} 286 ${SW - 430} 272 ${SW - 450} 262`
    : "M200 930V430C200 372 226 350 262 334C300 318 340 308 372 296C400 286 430 272 450 262";
  const parkRect = { x: flip ? SW - 304 : 216, y: 530, w: 88, h: 94 };
  const park2 = { x: flip ? SW - 106 : 46, y: 536, w: 60, h: 96 };
  const inRect = (r: { x: number; y: number; w: number; h: number }, x: number, y: number, pad: number) =>
    x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad;
  const k = 1.65;
  const { body, labels } = renderRoads(roads, pal, k, font, dark, { labelSize: 10.5 });
  const creek: Pt[] = P([[-30, 472], [60, 470], [130, 486], [196, 474]]);
  const bld = buildings({ x: -10, y: 150, w: SW + 20, h: SH }, roads, k, pal, 7, {
    cell: 30,
    density: 0.78,
    skip: (x, y, pad) => inRect(parkRect, x, y, pad) || inRect(park2, x, y, pad) || (y > 450 && y < 500 && x < mx(210) + (flip ? 40 : 0)),
  });
  const pk = (r: { x: number; y: number; w: number; h: number }, seed: number) =>
    park(`M${r.x + 10} ${r.y}h${r.w - 20}a10 10 0 0 1 10 10v${r.h - 20}a10 10 0 0 1-10 10h${-(r.w - 20)}a10 10 0 0 1-10-10v${-(r.h - 20)}a10 10 0 0 1 10-10z`, r, pal, seed, 16);
  const px = mx(200);
  const py = 678;
  // navigation chevron: blue arrow with a white border, soft ground shadow
  const puck =
    `<ellipse cx="${px}" cy="${py + 12}" rx="22" ry="9" fill="#000" opacity="0.16"/>` +
    `<path d="M${px} ${py - 25}L${px + 19} ${py + 19}L${px} ${py + 9}L${px - 19} ${py + 19}Z" fill="#ffffff" stroke="#ffffff" stroke-width="5" stroke-linejoin="round"/>` +
    `<path d="M${px} ${py - 22}L${px + 16} ${py + 16}L${px} ${py + 7.5}L${px - 16} ${py + 16}Z" fill="#1a73e8" stroke="#1a73e8" stroke-width="1.5" stroke-linejoin="round"/>` +
    `<path d="M${px} ${py - 22}L${px + 16} ${py + 16}L${px} ${py + 7.5}Z" fill="#4c8dff"/>`;
  return `
<rect width="${SW}" height="${SH}" fill="${pal.land}"/>
<rect x="0" y="150" width="${SW}" height="${sheetY - 120}" fill="${pal.built}" opacity="0.7"/>
${bld}
${pk(parkRect, 31)}
${pk(park2, 53)}
<path d="${pathD(creek)}" fill="none" stroke="${pal.water}" stroke-width="13" stroke-linecap="round"/>
${body}
${labels}
${placeLabel("Cuesta Park", parkRect.x + parkRect.w / 2, parkRect.y + parkRect.h / 2 + 4, 10.5, pal.parkText, pal, font, { weight: 500 })}
${placeLabel("Calabazas Creek", mx(92), 463, 9.5, pal.waterText, pal, font, { italic: true })}
${poi(mx(flip ? 222 : 224), 474, "#e8710a", "Coffee House", pal, font, 10.5, "cup", flip ? "left" : "right")}
${poi(mx(252), 686, "#4285f4", "Market", pal, font, 10.5, "bag", flip ? "left" : "right")}
${poi(mx(flip ? 140 : 128), 585, "#4285f4", "Gas Mart", pal, font, 10.5, "gas")}
${routeLine(routeD, routeCol, 16)}
${puck}`;
}

/** Round white map button with a shadow. */
function roundBtn(cx: number, cy: number, r: number, dark: boolean, glyph: string): string {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${dark ? "#2d2e31" : "#ffffff"}" style="filter:drop-shadow(0 1px 4px rgba(0,0,0,0.3))"/>${glyph}`;
}

export function renderGoogleMaps(doc: GoogleMapsDoc): string {
  if (doc.standalone) return renderGoogleMapsCard(doc);
  const dark = !!doc.dark || !!doc.chrome.dark;
  const platform = doc.chrome.platform === "android" ? "android" : "ios";
  const font = systemFont("android"); // Google Maps ships Google Sans / Roboto on both OSes
  const ink = dark ? "#e8eaed" : "#202124";
  const sub = dark ? "#9aa0a6" : "#5f6368";
  const eta = dark ? "#81c995" : "#188038";
  const sheetBg = dark ? "#202124" : "#ffffff";
  const chip = dark ? "#3c4043" : "#f1f3f4";
  const banner = dark ? "#0d6b3a" : "#0b8043";
  const bannerDark = dark ? "#0a4f2b" : "#096336";
  const parsed = parseInstruction(doc.instruction);
  const flip = parsed.kind === "left";
  const sheetY = SH - SHEET_H;

  // ---- banner geometry: distance, road (up to two lines), "toward" line
  const textX = 122;
  const roadLines = wrapText(parsed.road, 23, SW - textX - 20).slice(0, 2);
  const restLine = parsed.rest ? truncate(`toward ${parsed.rest}`, 16, SW - textX - 20) : "";
  const distY = 94;
  const roadY = distY + 32;
  const lastY = roadY + (roadLines.length - 1) * 27;
  const restY = lastY + 25;
  const bannerBottom = Math.max(restLine ? restY + 20 : lastY + 22, 168);
  const arrowCy = (46 + bannerBottom) / 2 + 2;

  const thenY = bannerBottom - 18;
  const then =
    `<rect x="16" y="${thenY}" width="108" height="${50}" rx="18" fill="${bannerDark}"/>` +
    `<text x="34" y="${thenY + 44}" font-family="${font}" font-size="16" font-weight="500" fill="#ffffff">Then</text>` +
    maneuverArrow(parsed.kind === "left" ? "right" : "left", 104, thenY + 38, 22, "#ffffff");

  const bannerShape =
    `<path d="M0 0H${SW}V${bannerBottom - 24}a24 24 0 0 1-24 24H24a24 24 0 0 1-24-24z" fill="${banner}" style="filter:drop-shadow(0 3px 6px rgba(0,0,0,0.3))"/>`;

  // ---- floating buttons
  const bx = SW - 42;
  const ic = ink;
  const speaker =
    `<path d="M${bx - 9} ${sheetY - 191}h4l6-5v16l-6-5h-4z" fill="${ic}"/><path d="M${bx + 5} ${sheetY - 190}a5 5 0 0 1 0 6" fill="none" stroke="${ic}" stroke-width="1.8" stroke-linecap="round"/><path d="M${bx + 8.5} ${sheetY - 194}a10 10 0 0 1 0 14" fill="none" stroke="${ic}" stroke-width="1.8" stroke-linecap="round"/>`;
  const search =
    `<circle cx="${bx - 1.5}" cy="${sheetY - 134.5}" r="6.5" fill="none" stroke="${ic}" stroke-width="2.2"/><path d="M${bx + 3.5} ${sheetY - 129.5}l6 6" stroke="${ic}" stroke-width="2.4" stroke-linecap="round"/>`;
  const report =
    `<path d="M${bx - 10} ${sheetY - 80}h20a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-14l-6 5v-18a2 2 0 0 1 0-4z" fill="none" stroke="${ic}" stroke-width="2" stroke-linejoin="round"/><path d="M${bx} ${sheetY - 75}v5M${bx} ${sheetY - 66.5}v.2" stroke="${ic}" stroke-width="2.2" stroke-linecap="round"/>`;

  // ---- speed limit sign (bottom left)
  const sl =
    `<g style="filter:drop-shadow(0 1px 3px rgba(0,0,0,0.3))"><rect x="16" y="${sheetY - 84}" width="46" height="60" rx="6" fill="#ffffff" stroke="#202124" stroke-width="2"/></g>` +
    `<text x="39" y="${sheetY - 66}" font-family="${font}" font-size="8.5" font-weight="700" fill="#202124" text-anchor="middle">SPEED</text>` +
    `<text x="39" y="${sheetY - 57}" font-family="${font}" font-size="8.5" font-weight="700" fill="#202124" text-anchor="middle">LIMIT</text>` +
    `<text x="39" y="${sheetY - 34}" font-family="${font}" font-size="25" font-weight="700" fill="#202124" text-anchor="middle">65</text>`;

  // ---- ETA bar
  const dur = durationText(doc.durationMinutes);
  const arrive = arrivalTime(doc.chrome.time, doc.durationMinutes);
  const cy = sheetY + 50;
  const sub1 = truncate(`${doc.distanceText} · ${arrive}`, 15.5, 170);
  return `
${navMap(doc, flip, sheetY, font)}
${then}
${bannerShape}
${statusBar({ time: doc.chrome.time, battery: doc.chrome.battery, color: "#ffffff", platform })}
${maneuverArrow(parsed.kind, 62, arrowCy, 76, "#ffffff")}
<text x="${textX}" y="${distY}" font-family="${font}" font-size="36" font-weight="700" fill="#ffffff" letter-spacing="-0.5">400 ft</text>
${textBlock(roadLines, { font, x: textX, y: roadY, size: 23, lineHeight: 27, color: "#ffffff", weight: 500 })}
${restLine ? `<text x="${textX}" y="${restY}" font-family="${font}" font-size="16" fill="#ffffff" fill-opacity="0.82">${esc(restLine)}</text>` : ""}
${roundBtn(bx, sheetY - 186, 24, dark, speaker)}
${roundBtn(bx, sheetY - 130, 24, dark, search)}
${roundBtn(bx, sheetY - 74, 24, dark, report)}
${sl}
<path d="M0 ${sheetY + 26}a26 26 0 0 1 26-26H${SW - 26}a26 26 0 0 1 26 26V${SH}H0z" fill="${sheetBg}" style="filter:drop-shadow(0 -2px 8px rgba(0,0,0,0.22))"/>
<circle cx="48" cy="${cy}" r="24" fill="${chip}"/>
<path d="M40.5 ${cy - 7.5}l15 15M55.5 ${cy - 7.5}l-15 15" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"/>
<text x="${SW / 2}" y="${cy + 3}" font-family="${font}" font-size="${dur.length > 8 ? 26 : 30}" font-weight="500" fill="${eta}" text-anchor="middle">${esc(dur)}</text>
<text x="${SW / 2}" y="${cy + 27}" font-family="${font}" font-size="15.5" fill="${sub}" text-anchor="middle">${esc(sub1)}</text>
<circle cx="${SW - 48}" cy="${cy}" r="24" fill="${chip}"/>
<g fill="none" stroke="${ink}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" transform="translate(${SW - 48} ${cy})"><path d="M0 10V2M0 2L-7 -5M0 2L7 -5"/><path d="M-7 -1V-5H-3M7 -1V-5H3" /></g>
${homeIndicator(dark ? "#e8eaed" : "#202124", platform)}`;
}
