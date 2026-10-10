"use client";

import { esc, truncate, textWidth } from "../common";

/**
 * Shared Google Maps cartography for the phone navigation screen and the
 * desktop directions page: palette, a road renderer (casing + fill + names set
 * along the road), building footprints, parks, water, route lines and labels.
 */

export type Pt = [number, number];
export type RoadKind = "hwy" | "art" | "loc";

export interface Road {
  pts: Pt[];
  kind: RoadKind;
  name?: string;
  /** highway shield number drawn on the road, e.g. "85" */
  shield?: string;
  /** where along the road (0..1) to set its name */
  at?: number;
}

export interface MapPalette {
  land: string;
  built: string;
  building: string;
  loc: string;
  locCasing: string;
  art: string;
  artCasing: string;
  hwy: string;
  hwyCasing: string;
  park: string;
  parkDot: string;
  water: string;
  roadText: string;
  placeText: string;
  parkText: string;
  waterText: string;
  halo: string;
  poiText: string;
}

export function mapPalette(dark: boolean): MapPalette {
  return dark
    ? {
        land: "#242f3e",
        built: "#27334a",
        building: "#2d3a4e",
        loc: "#38414e",
        locCasing: "#212a37",
        art: "#4a5565",
        artCasing: "#212a37",
        hwy: "#8a7a55",
        hwyCasing: "#1f2835",
        park: "#263c3f",
        parkDot: "#2e4a48",
        water: "#1d3a5c",
        roadText: "#aab2bd",
        placeText: "#d6dbe3",
        parkText: "#6b9a7b",
        waterText: "#515c6d",
        halo: "#242f3e",
        poiText: "#b3bac5",
      }
    : {
        land: "#f3f1ec",
        built: "#eceae3",
        building: "#e4e0d6",
        loc: "#ffffff",
        locCasing: "#dcd8cd",
        art: "#ffffff",
        artCasing: "#cfcabe",
        hwy: "#fbd067",
        hwyCasing: "#e0a42e",
        park: "#cfe8cc",
        parkDot: "#b9dcb6",
        water: "#a8d3f5",
        roadText: "#5f6368",
        placeText: "#3c4043",
        parkText: "#188038",
        waterText: "#4f8fcb",
        halo: "#ffffff",
        poiText: "#5f6368",
      };
}

/** Deterministic PRNG so every render of a doc draws the same city. */
export function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const f = (n: number) => n.toFixed(1);

/** Catmull-Rom through the points as cubic beziers (straight for two points). */
export function pathD(pts: Pt[], smooth = true): string {
  if (pts.length < 2) return "";
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  if (pts.length === 2 || !smooth) {
    for (let i = 1; i < pts.length; i++) d += `L${f(pts[i][0])} ${f(pts[i][1])}`;
    return d;
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

/** Sample a smoothed polyline densely (used for distances and label placement). */
export function samplePath(pts: Pt[], step = 6): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const n = Math.max(1, Math.ceil(len / step));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      if (pts.length === 2) {
        out.push([p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t]);
        continue;
      }
      const t2 = t * t;
      const t3 = t2 * t;
      const h = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([h(p0[0], p1[0], p2[0], p3[0]), h(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

const BASE_W: Record<RoadKind, number> = { loc: 4.6, art: 7.4, hwy: 10.5 };

export function roadWidth(kind: RoadKind, k: number): number {
  return BASE_W[kind] * k;
}

/** Point and tangent angle (deg, flipped to stay upright) at fraction t. */
function along(pts: Pt[], t: number): { x: number; y: number; angle: number } {
  const s = samplePath(pts, 4);
  const i = Math.min(s.length - 2, Math.max(0, Math.round((s.length - 1) * t)));
  const a = s[Math.max(0, i - 3)];
  const b = s[Math.min(s.length - 1, i + 3)];
  let angle = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  if (angle > 90) angle -= 180;
  if (angle < -90) angle += 180;
  return { x: s[i][0], y: s[i][1], angle };
}

export function roadLabel(
  text: string,
  pts: Pt[],
  t: number,
  size: number,
  pal: MapPalette,
  font: string,
  fill?: string
): string {
  const p = along(pts, t);
  return `<text transform="translate(${f(p.x)} ${f(p.y)}) rotate(${f(p.angle)})" x="0" y="${f(size * 0.35)}" text-anchor="middle" font-family="${font}" font-size="${size}" font-weight="500" fill="${fill ?? pal.roadText}" stroke="${pal.halo}" stroke-width="${f(size * 0.28)}" stroke-opacity="0.85" paint-order="stroke" stroke-linejoin="round">${esc(text)}</text>`;
}

function shield(num: string, x: number, y: number, size: number, dark: boolean): string {
  const w = Math.max(size * 1.6, textWidth(num, size) + 6);
  const h = size * 1.5;
  return (
    `<rect x="${f(x - w / 2)}" y="${f(y - h / 2)}" width="${f(w)}" height="${f(h)}" rx="${f(h * 0.34)}" fill="${dark ? "#1f2835" : "#ffffff"}" stroke="${dark ? "#9aa5b4" : "#5f6368"}" stroke-width="1.1"/>` +
    `<text x="${f(x)}" y="${f(y + size * 0.36)}" text-anchor="middle" font-family="Roboto,Arial,sans-serif" font-size="${size}" font-weight="700" fill="${dark ? "#e8eaed" : "#202124"}">${esc(num)}</text>`
  );
}

/** Roads of every class: casings then fills per class (so higher classes bridge lower ones), then names. */
export function renderRoads(
  roads: Road[],
  pal: MapPalette,
  k: number,
  font: string,
  dark: boolean,
  opts?: { labelSize?: number; noLabels?: boolean }
): { body: string; labels: string } {
  let body = "";
  const kinds: RoadKind[] = ["loc", "art", "hwy"];
  for (const kind of kinds) {
    const rs = roads.filter((r) => r.kind === kind);
    if (!rs.length) continue;
    const w = roadWidth(kind, k);
    const cw = kind === "hwy" ? 1.6 * Math.max(1, k * 0.7) : 1.2 * Math.max(1, k * 0.6);
    const casing = kind === "loc" ? pal.locCasing : kind === "art" ? pal.artCasing : pal.hwyCasing;
    const fill = kind === "loc" ? pal.loc : kind === "art" ? pal.art : pal.hwy;
    body += `<g fill="none" stroke-linecap="round" stroke-linejoin="round">`;
    body += rs.map((r) => `<path d="${pathD(r.pts)}" stroke="${casing}" stroke-width="${f(w + cw * 2)}"/>`).join("");
    body += rs.map((r) => `<path d="${pathD(r.pts)}" stroke="${fill}" stroke-width="${f(w)}"/>`).join("");
    body += `</g>`;
  }
  let labels = "";
  if (!opts?.noLabels) {
    for (const r of roads) {
      const size = opts?.labelSize ?? (r.kind === "loc" ? 9 : 10) * Math.max(1, k * 0.75);
      const t = r.at ?? 0.5;
      if (r.shield) {
        const p = along(r.pts, Math.min(0.92, t + 0.18));
        labels += shield(r.shield, p.x, p.y, size * 0.95, dark);
      }
      if (r.name) labels += roadLabel(r.name, r.pts, t, size, pal, font);
    }
  }
  return { body, labels };
}

/** Roads clipped by a bounding box are not culled; callers pass the whole scene. */
export function buildings(
  area: { x: number; y: number; w: number; h: number },
  roads: Road[],
  k: number,
  pal: MapPalette,
  seed: number,
  opts?: { cell?: number; density?: number; skip?: (x: number, y: number, pad: number) => boolean }
): string {
  const cell = opts?.cell ?? 24 * k;
  const density = opts?.density ?? 0.72;
  const rand = rng(seed);
  const pts: Array<{ p: Pt; r: number }> = [];
  for (const r of roads) {
    const half = roadWidth(r.kind, k) / 2 + 2;
    for (const p of samplePath(r.pts, 5)) pts.push({ p, r: half });
  }
  let out = "";
  for (let cy = area.y; cy < area.y + area.h; cy += cell) {
    for (let cx = area.x; cx < area.x + area.w; cx += cell) {
      const bw = cell * (0.45 + rand() * 0.45);
      const bh = cell * (0.4 + rand() * 0.45);
      const x = cx + (cell - bw) * rand();
      const y = cy + (cell - bh) * rand();
      if (rand() > density) continue;
      const mx = x + bw / 2;
      const my = y + bh / 2;
      const diag = Math.hypot(bw, bh) / 2;
      if (pts.some((q) => Math.hypot(q.p[0] - mx, q.p[1] - my) < q.r + diag * 0.82)) continue;
      if (opts?.skip?.(mx, my, diag)) continue;
      out += `<rect x="${f(x)}" y="${f(y)}" width="${f(bw)}" height="${f(bh)}" rx="1.2" fill="${pal.building}"/>`;
    }
  }
  return out;
}

/** An irregular rounded blob (parks, ponds). */
export function blobPath(cx: number, cy: number, rx: number, ry: number, seed: number, n = 9): string {
  const rand = rng(seed);
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const j = 0.82 + rand() * 0.3;
    pts.push([cx + Math.cos(a) * rx * j, cy + Math.sin(a) * ry * j]);
  }
  pts.push(pts[0], pts[1]);
  // closed catmull-rom
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + "Z";
}

/** A park with scattered tree dots; `rect` shapes read as city parks, blobs as open land. */
export function park(d: string, bounds: { x: number; y: number; w: number; h: number }, pal: MapPalette, seed: number, dots = 14): string {
  const rand = rng(seed);
  let trees = "";
  for (let i = 0; i < dots; i++) {
    const x = bounds.x + bounds.w * (0.15 + rand() * 0.7);
    const y = bounds.y + bounds.h * (0.15 + rand() * 0.7);
    trees += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(2.4 + rand() * 2.2)}" fill="${pal.parkDot}"/>`;
  }
  return `<path d="${d}" fill="${pal.park}"/>${trees}`;
}

export function placeLabel(text: string, x: number, y: number, size: number, color: string, pal: MapPalette, font: string, opts?: { weight?: number; italic?: boolean; spacing?: number }): string {
  return `<text x="${f(x)}" y="${f(y)}" text-anchor="middle" font-family="${font}" font-size="${size}" font-weight="${opts?.weight ?? 500}"${opts?.italic ? ` font-style="italic"` : ""}${opts?.spacing ? ` letter-spacing="${opts.spacing}"` : ""} fill="${color}" stroke="${pal.halo}" stroke-width="${f(size * 0.26)}" stroke-opacity="0.8" paint-order="stroke" stroke-linejoin="round">${esc(text)}</text>`;
}

/** A small POI dot with a name beside it. */
export function poi(x: number, y: number, color: string, label: string, pal: MapPalette, font: string, size = 10, glyph: "cup" | "bag" | "dot" | "gas" = "dot", side: "left" | "right" = "right"): string {
  const g =
    glyph === "cup"
      ? `<path d="M${f(x - 2.6)} ${f(y - 2.2)}h4.6v3a2.3 2.3 0 0 1-2.3 2.3 2.3 2.3 0 0 1-2.3-2.3z" fill="#fff"/>`
      : glyph === "bag"
        ? `<path d="M${f(x - 2.8)} ${f(y - 1.4)}h5.6l.5 4.4h-6.6z" fill="#fff"/>`
        : glyph === "gas"
          ? `<rect x="${f(x - 2.4)}" y="${f(y - 3)}" width="4" height="6" rx="0.8" fill="#fff"/>`
          : `<circle cx="${f(x)}" cy="${f(y)}" r="2.2" fill="#fff"/>`;
  const r = size * 0.62;
  return (
    `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${color}"/>${g}` +
    `<text x="${f(side === "right" ? x + r + 4 : x - r - 4)}" y="${f(y + size * 0.36)}" text-anchor="${side === "right" ? "start" : "end"}" font-family="${font}" font-size="${size}" font-weight="500" fill="${pal.poiText}" stroke="${pal.halo}" stroke-width="${f(size * 0.26)}" stroke-opacity="0.85" paint-order="stroke" stroke-linejoin="round">${esc(truncate(label, size, 120))}</text>`
  );
}

/** Blue route line: darker casing, bright core. */
export function routeLine(d: string, color: string, w: number, casing?: string): string {
  return (
    `<path d="${d}" fill="none" stroke="${casing ?? "#1a56c4"}" stroke-width="${f(w + 4)}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round"/>`
  );
}

/** A white rounded time bubble with a pointer, as on alternative routes. */
export function timeBubble(x: number, y: number, label: string, font: string, dark: boolean, opts?: { bold?: boolean; sub?: string }): string {
  const size = 12.5;
  const w = textWidth(label, size) + 18 + (opts?.sub ? textWidth(opts.sub, 11) + 6 : 0);
  const h = 24;
  const fill = dark ? "#303134" : "#ffffff";
  const ink = dark ? "#e8eaed" : "#202124";
  return (
    `<g style="filter:drop-shadow(0 1px 3px rgba(0,0,0,0.35))">` +
    `<rect x="${f(x - w / 2)}" y="${f(y - h / 2)}" width="${f(w)}" height="${h}" rx="12" fill="${fill}"/>` +
    `<path d="M${f(x - 5)} ${f(y + h / 2 - 1)}L${f(x)} ${f(y + h / 2 + 5)}L${f(x + 5)} ${f(y + h / 2 - 1)}Z" fill="${fill}"/></g>` +
    `<text x="${f(x - w / 2 + 9)}" y="${f(y + 4.4)}" font-family="${font}" font-size="${size}" font-weight="${opts?.bold ? 700 : 500}" fill="${ink}">${esc(label)}</text>` +
    (opts?.sub
      ? `<text x="${f(x - w / 2 + 9 + textWidth(label, size) + 6)}" y="${f(y + 4.2)}" font-family="${font}" font-size="11" fill="${dark ? "#9aa0a6" : "#5f6368"}">${esc(opts.sub)}</text>`
      : "")
  );
}

/** "9:41" or "9:41 AM" plus minutes → "10:05 AM". */
export function arrivalTime(time: string, addMinutes: number): string {
  const m = time.trim().match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])?/);
  let h = m ? Number(m[1]) : 9;
  const min = m ? Number(m[2]) : 41;
  let pm = m?.[3] ? /p/i.test(m[3]) : h >= 12 && h < 24;
  if (!m?.[3] && h > 12) {
    h -= 12;
    pm = true;
  }
  let h24 = (h % 12) + (pm ? 12 : 0);
  let total = h24 * 60 + min + Math.max(0, Math.round(addMinutes));
  total %= 24 * 60;
  h24 = Math.floor(total / 60);
  const mm = total % 60;
  const ap = h24 >= 12 ? "PM" : "AM";
  return `${h24 % 12 || 12}:${String(mm).padStart(2, "0")} ${ap}`;
}

/** 24 → "24 min", 75 → "1 hr 15 min". */
export function durationText(min: number): string {
  const m = Math.max(1, Math.round(min));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} hr ${r} min` : `${h} hr`;
}

/** Pull the road out of "Merge onto CA-85 N toward Mountain View" → "CA-85 N". */
export function parseInstruction(instruction: string): {
  kind: "left" | "right" | "straight" | "merge" | "uturn";
  road: string;
  rest: string;
} {
  const s = instruction.trim();
  const lower = s.toLowerCase();
  const kind: "left" | "right" | "straight" | "merge" | "uturn" = /u-?turn/.test(lower)
    ? "uturn"
    : /\bleft\b/.test(lower)
      ? "left"
      : /\bright\b/.test(lower)
        ? "right"
        : /merge|ramp|exit|keep/.test(lower)
          ? "merge"
          : "straight";
  const m = s.match(/\b(?:onto|on|to|toward)\s+(.+?)(?:\s+(?:toward|towards)\s+(.+))?$/i);
  const road = m ? m[1].trim() : s;
  return { kind, road, rest: m?.[2]?.trim() ?? "" };
}

/** Filled maneuver arrow in a 0..64 box, scaled to `size` and centered at cx,cy. */
export function maneuverArrow(kind: "left" | "right" | "straight" | "merge" | "uturn", cx: number, cy: number, size: number, color: string): string {
  const s = size / 64;
  const t = `translate(${f(cx - size / 2)} ${f(cy - size / 2)}) scale(${s.toFixed(3)})`;
  let shape: string;
  switch (kind) {
    case "right":
      shape = `<path d="M24 62V34c0-5.5 4.5-10 10-10h8V12l18 16-18 16V32h-6c-1.1 0-2 .9-2 2v28z" />`;
      break;
    case "left":
      shape = `<path d="M40 62V34c0-5.5-4.5-10-10-10h-8V12L4 28l18 16V32h6c1.1 0 2 .9 2 2v28z" />`;
      break;
    case "uturn":
      shape = `<path d="M18 62V26c0-9.4 7.6-17 17-17s17 7.6 17 17v8h9L48 52 34 34h9v-8c0-4.4-3.600-8-8-8s-8 3.600-8 8v36z" />`;
      break;
    case "merge":
      // ramp that bends up and to the right, arrowhead pointing up-right
      shape = `<path d="M20 62V46c0-4 1.600-7.800 4.400-10.600L36 23.800l-6.200-6.200L52 12l-5.600 22.200-6.200-6.200-8.400 8.400c-1.200 1.200-1.800 2.800-1.800 4.400V62z" />`;
      break;
    default:
      shape = `<path d="M26 62V28h-12L32 6l18 22H38v34z" />`;
  }
  return `<g transform="${t}" fill="${color}" stroke="${color}" stroke-width="1.5" stroke-linejoin="round">${shape}</g>`;
}
