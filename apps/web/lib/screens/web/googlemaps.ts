"use client";

import { WEB_H, WEB_W } from "../webPage";
import { ANDROID_FONT, avatar, esc, glyph, textBlock, truncate, wrapText } from "../common";
import type { GoogleMapsDoc } from "../types";
import {
  blobPath,
  durationText,
  mapPalette,
  maneuverArrow,
  parseInstruction,
  park,
  pathD,
  placeLabel,
  renderRoads,
  rng,
  routeLine,
  timeBubble,
  type Pt,
  type Road,
} from "./gm-map";

/* maps.google.com directions: a 410px sidebar (modes, from/to, route cards,
   steps) beside a full-bleed map with the drawn routes and map controls. */

const SIDEBAR_W = 410;
const FONT = ANDROID_FONT;

// Material icon paths (24 box)
const CAR = "M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z";
const TRANSIT = "M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h2.23l2-2H14l2 2h2v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-3.58-4-8-4zM7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm3.5-7H6V6h5v4zm2 0V6h5v4h-5zm3.5 7c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z";
const WALK = "M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7";
const BIKE = "M15.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM5 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5zM10.8 10.5l2.4-2.4.8.8c1.3 1.3 3 2.1 5.1 2.1V9c-1.5 0-2.7-.6-3.6-1.5l-1.9-1.9c-.5-.4-1-.6-1.6-.6s-1.1.2-1.4.6L7.8 8.4c-.4.4-.6.9-.6 1.4 0 .6.2 1.1.6 1.4L11 14v5h2v-6.5l-2.2-2zM19 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5z";
const FLIGHT = "M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z";
const PIN = "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z";

interface Theme {
  dark: boolean;
  bg: string;
  ink: string;
  sub: string;
  line: string;
  blue: string;
  green: string;
  red: string;
  sel: string;
  field: string;
  hover: string;
}

function theme(dark: boolean): Theme {
  return dark
    ? { dark, bg: "#202124", ink: "#e8eaed", sub: "#9aa0a6", line: "#3c4043", blue: "#8ab4f8", green: "#81c995", red: "#f28b82", sel: "#2b3a55", field: "#2d2e31", hover: "#303134" }
    : { dark, bg: "#ffffff", ink: "#202124", sub: "#5f6368", line: "#dadce0", blue: "#1a73e8", green: "#188038", red: "#d93025", sel: "#e8f0fe", field: "#ffffff", hover: "#f1f3f4" };
}

/* ---------------------------------- map ------------------------------------- */

const A: Pt = [1120, 730];
const B: Pt = [700, 215];

function routes(doc: GoogleMapsDoc) {
  const sel: Pt[] = [A, [1070, 690], [1010, 640], [960, 590], [930, 520], [900, 450], [880, 380], [840, 320], [790, 280], [730, 245], B];
  const alt1: Pt[] = [A, [1160, 640], [1140, 540], [1090, 430], [1020, 330], [950, 270], [860, 230], [780, 214], B];
  const alt2: Pt[] = [A, [1000, 760], [900, 700], [800, 620], [745, 520], [722, 420], [708, 320], B];
  return { sel, alt1, alt2, key: doc.start + doc.destination };
}

function mapSvg(doc: GoogleMapsDoc, th: Theme): string {
  const pal = mapPalette(th.dark);
  const x0 = SIDEBAR_W;
  const W = WEB_W - x0;
  const r = routes(doc);
  const route = doc.routeColor || (th.dark ? "#5b9cf6" : "#4285f4");

  // thin street grid across the built-up land, rotated like a real street plan
  const gridRand = rng(5);
  const ang = (-24 * Math.PI) / 180;
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const rot = (x: number, y: number): Pt => [x0 + 560 + (x - 560) * ca - (y - 450) * sa, 450 + (x - 560) * sa + (y - 450) * ca];
  // thin street grid across the built-up land, rotated like a real street plan; some streets dropped for irregularity
  let gridD = "";
  for (let gx = -900; gx <= 1500; gx += 40) if (gridRand() > 0.18) gridD += pathD([rot(gx, -900), rot(gx, 1800)]);
  for (let gy = -900; gy <= 1800; gy += 36) if (gridRand() > 0.18) gridD += pathD([rot(-1200, gy), rot(2000, gy)]);
  const hwy1: Pt[] = [[1230, 880], [1100, 750], [1010, 640], [960, 590], [930, 520], [900, 450], [880, 380], [840, 320], [790, 280], [730, 245], [650, 205], [520, 140], [420, 95]];
  const hwy3: Pt[] = [[1300, 900], [1190, 760], [1160, 640], [1140, 540], [1090, 430], [1020, 330], [950, 270], [860, 230], [780, 214], [700, 215], [560, 222], [420, 232]];
  const hwy2: Pt[] = [[420, 650], [600, 640], [780, 580], [1000, 520], [1200, 560], [1440, 520]];
  const arts: Road[] = [
    { pts: [[420, 420], [600, 440], [760, 410], [900, 455], [1100, 430], [1300, 480], [1440, 450]], kind: "art", name: "Fairview Ave", at: 0.12 },
    { pts: [[470, 900], [560, 760], [640, 600], [700, 420], [760, 250], [800, 80], [820, -20]], kind: "art", name: "Oakdale Rd", at: 0.58 },
    { pts: [[1000, 900], [1030, 760], [1050, 620], [1080, 450], [1100, 300], [1120, 120], [1130, -20]], kind: "art", name: "Lakeshore Blvd", at: 0.22 },
    { pts: [[420, 330], [560, 310], [700, 340], [840, 300]], kind: "art", name: "Hillcrest Dr", at: 0.3 },
    { pts: [[760, 840], [900, 800], [1050, 810], [1200, 780], [1440, 800]], kind: "art", name: "Mission Way", at: 0.78 },
    { pts: [[420, 540], [520, 520], [640, 520]], kind: "art" },
  ];
  const roads: Road[] = [
    { pts: hwy1, kind: "hwy", name: "CA-85 N", shield: "85", at: 0.86 },
    { pts: hwy3, kind: "hwy", name: "Foothill Expy", shield: "237", at: 0.18 },
    { pts: hwy2, kind: "hwy", shield: "280", at: 0.82 },
    ...arts,
  ];
  const k = { main: 0.82 };
  const main = renderRoads(roads, pal, k.main, FONT, th.dark, { labelSize: 10.5 });

  // parks + water, drawn above the grid so they interrupt it
  const parks = [
    { cx: x0 + 160, cy: 205, rx: 90, ry: 55, seed: 3, name: "Hillcrest Preserve" },
    { cx: 1260, cy: 640, rx: 90, ry: 52, seed: 9, name: "Lakeshore Park" },
    { cx: 560, cy: 745, rx: 78, ry: 46, seed: 14, name: "Oak Grove" },
    { cx: 860, cy: 120, rx: 58, ry: 36, seed: 5, name: "" },
  ];
  const parkSvg = parks
    .map((p) => park(blobPath(p.cx, p.cy, p.rx, p.ry, p.seed), { x: p.cx - p.rx, y: p.cy - p.ry, w: p.rx * 2, h: p.ry * 2 }, pal, p.seed, 12))
    .join("");
  const bay = `M1440 0H1290C1250 60 1286 140 1340 190C1380 226 1420 250 1440 262Z`;
  const lake = blobPath(1000, 880, 120, 40, 22, 8);
  const pond = blobPath(x0 + 110, 520, 52, 30, 41, 8);
  const water = `<path d="${bay}" fill="${pal.water}"/><path d="${lake}" fill="${pal.water}"/><path d="${pond}" fill="${pal.water}"/>`;

  const city = (t: string, x: number, y: number, s = 15) => placeLabel(t, x, y, s, pal.placeText, pal, FONT, { weight: 500, spacing: 0.4 });
  const labels =
    city("Riverside", 800, 360, 16) +
    city("Fairview", 1240, 400, 15) +
    city("Oakdale", 560, 590, 15) +
    city("Lakewood", 1040, 600, 16) +
    parks.filter((p) => p.name).map((p) => placeLabel(p.name, p.cx, p.cy + 4, 11, pal.parkText, pal, FONT)).join("") +
    placeLabel("Harbor Bay", 1385, 130, 11.5, pal.waterText, pal, FONT, { italic: true }) +
    placeLabel("Mirror Lake", 1000, 884, 11, pal.waterText, pal, FONT, { italic: true });

  const built = `<path d="${blobPath(x0 + 560, 450, 640, 520, 6, 12)}" fill="${pal.built}"/>`;
  // routes: alternatives under the selected line
  const alt = (pts: Pt[]) =>
    `<path d="${pathD(pts)}" fill="none" stroke="${th.dark ? "#1b2330" : "#ffffff"}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/><path d="${pathD(pts)}" fill="none" stroke="${th.dark ? "#7d8691" : "#9aa0a6"}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`;
  const dur = doc.durationMinutes;

  const startPin =
    `<circle cx="${A[0]}" cy="${A[1]}" r="11" fill="#ffffff" style="filter:drop-shadow(0 1px 3px rgba(0,0,0,0.35))"/><circle cx="${A[0]}" cy="${A[1]}" r="6.5" fill="#ffffff" stroke="#1a73e8" stroke-width="3.5"/>`;
  const endPin =
    `<g style="filter:drop-shadow(0 2px 3px rgba(0,0,0,0.35))">${glyph(PIN, B[0], B[1] - 22, 52, "#ea4335")}</g><circle cx="${B[0]}" cy="${B[1] - 24}" r="5" fill="#7c0a02"/>`;
  const nameTag = (t: string, x: number, y: number) =>
    placeLabel(truncate(t, 14, 170), x, y, 14, th.dark ? "#e8eaed" : "#202124", pal, FONT, { weight: 700 });

  return `
<g>
<rect x="${x0}" y="0" width="${W}" height="${WEB_H}" fill="${pal.land}"/>
${built}
<path d="${gridD}" fill="none" stroke="${pal.loc}" stroke-width="1.6"/>
${parkSvg}
${water}
${main.body}
${main.labels}
${labels}
${alt(r.alt2)}
${alt(r.alt1)}
${routeLine(pathD(r.sel), route, 8, th.dark ? "#2a63c8" : "#1a56c4")}
${timeBubble(1148, 548, durationText(Math.round(dur * 1.3)), FONT, th.dark)}
${timeBubble(742, 508, durationText(Math.round(dur * 1.18)), FONT, th.dark)}
${timeBubble(900, 452, durationText(dur), FONT, th.dark, { bold: true })}
${startPin}
${endPin}
${nameTag(doc.start, A[0], A[1] + 32)}
${nameTag(doc.destination, B[0], B[1] + 22)}
</g>`;
}

/* -------------------------------- map chrome --------------------------------- */

function mapControls(th: Theme): string {
  const card = th.dark ? "#303134" : "#ffffff";
  const ink = th.dark ? "#e8eaed" : "#5f6368";
  const sh = `style="filter:drop-shadow(0 1px 3px rgba(0,0,0,${th.dark ? 0.6 : 0.3}))"`;
  const R = WEB_W - 28; // right edge of the controls
  const cx = R - 20;
  // layers tile
  const lx = SIDEBAR_W + 22;
  const ly = WEB_H - 98;
  const layers =
    `<g ${sh}><rect x="${lx}" y="${ly}" width="66" height="66" rx="8" fill="${card}"/></g>` +
    `<defs><linearGradient id="gm-lay" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5b8f5a"/><stop offset="0.55" stop-color="#7a9a62"/><stop offset="1" stop-color="#3f6f8e"/></linearGradient><clipPath id="gm-layc"><rect x="${lx + 3}" y="${ly + 3}" width="60" height="42" rx="6"/></clipPath></defs>` +
    `<g clip-path="url(#gm-layc)"><rect x="${lx + 3}" y="${ly + 3}" width="60" height="42" fill="url(#gm-lay)"/><path d="M${lx + 3} ${ly + 30}l22-10 14 6 24-12v34h-60z" fill="#2f5d7c" opacity="0.55"/><path d="M${lx + 8} ${ly + 3}l30 42M${lx + 36} ${ly + 3}l10 42M${lx + 3} ${ly + 18}h60" stroke="#e8e0c8" stroke-width="1.2" opacity="0.7"/></g>` +
    `<text x="${lx + 33}" y="${ly + 59}" font-family="${FONT}" font-size="11" font-weight="500" fill="${th.dark ? "#e8eaed" : "#3c4043"}" text-anchor="middle">Layers</text>`;

  // zoom stack
  const zy = WEB_H - 48 - 88;
  const zoom =
    `<g ${sh}><rect x="${cx - 20}" y="${zy}" width="40" height="88" rx="8" fill="${card}"/></g>` +
    `<path d="M${cx - 8} ${zy + 22}h16M${cx} ${zy + 14}v16" stroke="${ink}" stroke-width="2" stroke-linecap="round"/>` +
    `<rect x="${cx - 20}" y="${zy + 43.5}" width="40" height="1" fill="${th.dark ? "#4a4d51" : "#e8eaed"}"/>` +
    `<path d="M${cx - 8} ${zy + 66}h16" stroke="${ink}" stroke-width="2" stroke-linecap="round"/>`;
  const my = zy - 16 - 40;
  const locate =
    `<g ${sh}><circle cx="${cx}" cy="${my + 20}" r="20" fill="${card}"/></g>` +
    `<g fill="none" stroke="${ink}" stroke-width="2"><circle cx="${cx}" cy="${my + 20}" r="6"/><path d="M${cx} ${my + 8}v4M${cx} ${my + 28}v4M${cx - 12} ${my + 20}h4M${cx + 8} ${my + 20}h4" stroke-linecap="round"/></g><circle cx="${cx}" cy="${my + 20}" r="2.4" fill="${ink}"/>`;
  const py = my - 16 - 40;
  const pegman =
    `<g ${sh}><circle cx="${cx}" cy="${py + 20}" r="20" fill="${card}"/></g>` +
    `<g fill="${ink}" transform="translate(${cx} ${py + 20})"><circle cx="0" cy="-8" r="3.2"/><path d="M-5.5 -3.5h11l1.5 8h-3.2l-.8 7h-2.6v-4.6h-1.8v4.6h-2.6l-.8-7h-3.2z"/></g>`;
  // footer: scale bar + terms
  const fy = WEB_H - 16;
  const foot =
    `<rect x="${WEB_W - 408}" y="${fy}" width="408" height="16" fill="${th.dark ? "rgba(32,33,36,0.8)" : "rgba(255,255,255,0.75)"}"/>` +
    `<text x="${WEB_W - 120}" y="${fy + 12}" font-family="${FONT}" font-size="10.5" fill="${th.dark ? "#9aa0a6" : "#5f6368"}" text-anchor="end">Terms     Privacy     Send product feedback</text>` +
    `<text x="${WEB_W - 62}" y="${fy + 12}" font-family="${FONT}" font-size="10.5" fill="${th.dark ? "#9aa0a6" : "#5f6368"}" text-anchor="end">5 mi</text>` +
    `<path d="M${WEB_W - 58} ${fy + 4}v8h-52" fill="none" stroke="${th.dark ? "#9aa0a6" : "#5f6368"}" stroke-width="1.5"/>`;
  // top-right: apps grid + account
  const dots = [0, 1, 2].flatMap((i) => [0, 1, 2].map((j) => `<circle cx="${WEB_W - 84 + j * 6.5}" cy="${34 + i * 6.5}" r="1.9" fill="${th.dark ? "#e8eaed" : "#5f6368"}"/>`)).join("");
  const top = dots + avatar("Alex Rivera", WEB_W - 36, 40, 17, "gm-acct");
  return layers + pegman + locate + zoom + foot + top;
}

/* --------------------------------- sidebar ----------------------------------- */

function modeIcon(path: string, cx: number, cy: number, color: string): string {
  return glyph(path, cx, cy, 22, color);
}

/** A small maneuver glyph (arrow) used in the step list. */
function stepIcon(kind: ReturnType<typeof parseInstruction>["kind"] | "start", cx: number, cy: number, color: string): string {
  if (kind === "start") return `<circle cx="${cx}" cy="${cy}" r="5" fill="none" stroke="${color}" stroke-width="2"/>`;
  return maneuverArrow(kind, cx, cy, 22, color);
}

function sidebar(doc: GoogleMapsDoc, th: Theme): string {
  const W = SIDEBAR_W;
  const { ink, sub, line, blue, green, red } = th;
  const parsed = parseInstruction(doc.instruction);
  const dur = doc.durationMinutes;
  const miles = parseFloat(doc.distanceText);
  const unitRaw = doc.distanceText.replace(/^[\d.,\s]+/, "").trim() || "mi";
  const unit = unitRaw === "mi" ? "miles" : unitRaw === "km" ? "km" : unitRaw;
  const dist = (mult: number) => (Number.isFinite(miles) ? `${(miles * mult).toFixed(1)} ${unit}` : doc.distanceText);
  let out = `<g>`;
  out += `<rect x="0" y="0" width="${W}" height="${WEB_H}" fill="${th.bg}" style="filter:drop-shadow(0 0 6px rgba(0,0,0,${th.dark ? 0.7 : 0.35}))"/>`;

  // travel modes
  const modes = [CAR, TRANSIT, WALK, BIKE, FLIGHT];
  const tabW = 58;
  modes.forEach((p, i) => {
    const cx = 36 + i * tabW;
    if (i === 0) out += `<rect x="${cx - 24}" y="14" width="48" height="36" rx="18" fill="${th.dark ? "#394457" : "#e8f0fe"}"/>`;
    out += modeIcon(p, cx, 32, i === 0 ? blue : sub);
  });
  out += `<path d="M${W - 38} 25l14 14M${W - 24} 25l-14 14" stroke="${sub}" stroke-width="2" stroke-linecap="round"/>`;

  // from / to
  const fx = 56;
  const fw = 276;
  const fy = 68;
  const field = (y: number, text: string) =>
    `<rect x="${fx}" y="${y}" width="${fw}" height="44" rx="8" fill="${th.field}" stroke="${line}"/>` +
    `<text x="${fx + 14}" y="${y + 27.5}" font-family="${FONT}" font-size="15" fill="${ink}">${esc(truncate(text, 15, fw - 28))}</text>`;
  out += field(fy, doc.start) + field(fy + 52, doc.destination);
  out += `<circle cx="30" cy="${fy + 22}" r="6" fill="none" stroke="${sub}" stroke-width="2.2"/>`;
  out += [0, 1, 2].map((i) => `<circle cx="30" cy="${fy + 38 + i * 6}" r="1.3" fill="${sub}"/>`).join("");
  out += glyph(PIN, 30, fy + 74, 24, red) + `<circle cx="30" cy="${fy + 71}" r="2.3" fill="${th.bg}"/>`;
  // swap
  const sx = W - 40;
  const sy = fy + 48;
  out += `<g fill="none" stroke="${sub}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M${sx - 5} ${sy - 9}v18M${sx - 9} ${sy + 5}l4 4 4-4"/><path d="M${sx + 5} ${sy + 9}v-18M${sx + 1} ${sy - 5}l4-4 4 4"/></g>`;

  // leave now / options
  const ry = fy + 52 + 44 + 16;
  const pill = (x: number, w: number, label: string, icon?: string) =>
    `<rect x="${x}" y="${ry}" width="${w}" height="34" rx="17" fill="none" stroke="${line}"/>` +
    (icon ?? "") +
    `<text x="${x + (icon ? 36 : 16)}" y="${ry + 22}" font-family="${FONT}" font-size="14" fill="${ink}">${esc(label)}</text>` +
    `<path d="M${x + w - 24} ${ry + 15}l5 5 5-5" fill="none" stroke="${sub}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  const clock = `<g fill="none" stroke="${sub}" stroke-width="1.8" stroke-linecap="round"><circle cx="${24 + 4}" cy="${ry + 17}" r="7"/><path d="M${28} ${ry + 13}v4l3 2"/></g>`;
  out += pill(20, 150, "Leave now", clock);
  out += pill(180, 118, "Options");
  out += `<rect x="0" y="${ry + 52}" width="${W}" height="1" fill="${line}"/>`;

  // route cards
  let y = ry + 53;
  const card = (opts: { selected: boolean; via: string; time: string; timeColor: string; note: string; distance: string; details: boolean }) => {
    const x0 = 18;
    const noteLines = wrapText(opts.note, 13, 232).slice(0, 2);
    const h = 54 + noteLines.length * 17 + (opts.details ? 28 : 6) - 8;
    let s = "";
    if (opts.selected) s += `<rect x="0" y="${y}" width="${W}" height="${h}" fill="${th.sel}"/><rect x="0" y="${y}" width="4" height="${h}" fill="${blue}"/>`;
    s += glyph(CAR, x0 + 12, y + 28, 22, opts.selected ? blue : sub);
    s += `<text x="${x0 + 40}" y="${y + 31}" font-family="${FONT}" font-size="15.5" font-weight="500" fill="${ink}">${esc(truncate(`via ${opts.via}`, 15.5, 190))}</text>`;
    s += `<text x="${W - 22}" y="${y + 32}" font-family="${FONT}" font-size="21" font-weight="500" fill="${opts.timeColor}" text-anchor="end">${esc(opts.time)}</text>`;
    s += textBlock(noteLines, { font: FONT, x: x0 + 40, y: y + 54, size: 13, lineHeight: 17, color: sub });
    s += `<text x="${W - 22}" y="${y + 54}" font-family="${FONT}" font-size="13" fill="${sub}" text-anchor="end">${esc(opts.distance)}</text>`;
    if (opts.details) s += `<text x="${x0 + 40}" y="${y + 54 + noteLines.length * 17 + 8}" font-family="${FONT}" font-size="13" font-weight="500" fill="${blue}">Details</text>`;
    out += s;
    y += h;
    out += `<rect x="0" y="${y}" width="${W}" height="1" fill="${line}"/>`;
    y += 1;
  };
  card({ selected: true, via: parsed.road.replace(/\s+toward.*$/i, ""), time: durationText(dur), timeColor: green, note: "Fastest route now due to traffic conditions", distance: dist(1), details: true });

  // step-by-step for the selected route
  const steps: Array<{ kind: ReturnType<typeof parseInstruction>["kind"] | "start"; text: string; dist: string }> = [
    { kind: "straight", text: `Head north on Main St toward ${doc.start} Blvd`, dist: dist(0.03) },
    { kind: "right", text: "Turn right onto De Anza Blvd", dist: dist(0.09) },
    { kind: parsed.kind, text: doc.instruction, dist: dist(0.74) },
    { kind: "left", text: `Turn left onto ${doc.destination.trim().split(/\s+/).slice(0, 2).join(" ")} Ave`, dist: dist(0.14) },
  ];
  out += `<g>`;
  out += `<circle cx="36" cy="${y + 24}" r="5.5" fill="none" stroke="${sub}" stroke-width="2"/><text x="64" y="${y + 29}" font-family="${FONT}" font-size="14.5" font-weight="500" fill="${ink}">${esc(truncate(doc.start, 14.5, 300))}</text>`;
  y += 44;
  for (const st of steps) {
    const lines = wrapText(st.text, 13.5, W - 64 - 26).slice(0, 2);
    const h = 18 + lines.length * 18 + 22;
    out += stepIcon(st.kind, 36, y + 24, sub);
    out += textBlock(lines, { font: FONT, x: 64, y: y + 28, size: 13.5, lineHeight: 18, color: ink });
    out += `<text x="64" y="${y + 28 + lines.length * 18 + 4}" font-family="${FONT}" font-size="12" fill="${sub}">${esc(st.dist)}</text>`;
    y += h;
  }
  out += glyph(PIN, 36, y + 22, 22, red) + `<circle cx="36" cy="${y + 20}" r="2.1" fill="${th.bg}"/>`;
  out += `<text x="64" y="${y + 28}" font-family="${FONT}" font-size="14.5" font-weight="500" fill="${ink}">${esc(truncate(doc.destination, 14.5, 300))}</text>`;
  y += 46;
  out += `</g><rect x="0" y="${y}" width="${W}" height="1" fill="${line}"/>`;
  y += 1;

  card({ selected: false, via: "Foothill Expy", time: durationText(Math.round(dur * 1.3)), timeColor: red, note: "Heavier traffic than usual", distance: dist(1.08), details: false });
  card({ selected: false, via: "Oakdale Rd", time: durationText(Math.round(dur * 1.18)), timeColor: ink, note: "Typical traffic", distance: dist(0.94), details: false });

  // footer (covers any overflow): send to phone
  const fy2 = WEB_H - 64;
  out += `<rect x="0" y="${fy2}" width="${W}" height="64" fill="${th.bg}"/><rect x="0" y="${fy2}" width="${W}" height="1" fill="${line}"/>`;
  out += `<rect x="${W / 2 - 100}" y="${fy2 + 15}" width="200" height="36" rx="18" fill="none" stroke="${line}"/>`;
  out += `<rect x="${W / 2 - 80}" y="${fy2 + 22}" width="11" height="20" rx="2.5" fill="none" stroke="${blue}" stroke-width="1.8"/>`;
  out += `<text x="${W / 2 - 58}" y="${fy2 + 38}" font-family="${FONT}" font-size="13.5" font-weight="500" fill="${blue}">Send to your phone</text>`;
  out += `</g>`;
  return out;
}

export function renderGoogleMapsWeb(doc: GoogleMapsDoc): string {
  const th = theme(!!doc.dark || !!doc.chrome.dark);
  // collapse handle on the sidebar edge
  const hx = SIDEBAR_W;
  const handle =
    `<g style="filter:drop-shadow(0 1px 3px rgba(0,0,0,0.35))"><path d="M${hx} 424h14a6 6 0 0 1 6 6v36a6 6 0 0 1-6 6h-14z" fill="${th.bg}"/></g>` +
    `<path d="M${hx + 12} 440l-5 8 5 8" fill="none" stroke="${th.sub}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  return `<rect width="${WEB_W}" height="${WEB_H}" fill="${th.bg}"/>
<defs><clipPath id="gm-page"><rect width="${WEB_W}" height="${WEB_H}"/></clipPath></defs>
<g clip-path="url(#gm-page)">
${mapSvg(doc, th)}
${mapControls(th)}
${sidebar(doc, th)}
${handle}
</g>`;
}
