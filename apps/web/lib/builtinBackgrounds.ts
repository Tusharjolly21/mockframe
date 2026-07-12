"use client";

import type { ResolvedAsset } from "@framekit/renderer";
import { mulberry32 } from "@framekit/renderer";

/**
 * Built-in background art: procedural SVGs rendered to data-URIs at module
 * load. Deterministic (seeded), self-contained (no fetches), and referenced
 * from scene documents as `builtin:<id>` asset ids — the future render worker
 * resolves the same generator, keeping re-render parity.
 */

const W = 1920;
const H = 1280;

const uri = (inner: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">${inner}</svg>`
  )}`;

/* ---------------------------------- glass ----------------------------------- */
/* fine parallel ribbon lines flowing across the frame */

function glass(seed: number, bg: string, strokes: string[], lineOpacity: number): string {
  const rng = mulberry32(seed);
  const phase = rng() * Math.PI * 2;
  const amp = 140 + rng() * 120;
  const freq = 1.6 + rng() * 1.2;
  const lines: string[] = [];
  const n = 64;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const yBase = -200 + t * (H + 400);
    const pts: string[] = [];
    for (let x = 0; x <= W; x += 96) {
      const y = yBase + Math.sin(phase + (x / W) * Math.PI * freq + t * 2.4) * amp * (0.6 + t * 0.5);
      pts.push(`${x},${Math.round(y)}`);
    }
    const color = strokes[i % strokes.length];
    lines.push(
      `<polyline points="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="2.2" opacity="${(lineOpacity * (0.35 + 0.65 * Math.sin(t * Math.PI))).toFixed(3)}"/>`
    );
  }
  return uri(`<rect width="${W}" height="${H}" fill="${bg}"/>${lines.join("")}`);
}

/* --------------------------------- desktop ---------------------------------- */
/* macOS-style soft blurred color fields */

function desktop(seed: number, base: string, blobs: string[]): string {
  const rng = mulberry32(seed);
  const shapes = blobs
    .map((c) => {
      const cx = Math.round(rng() * W);
      const cy = Math.round(rng() * H);
      const rx = Math.round(W * (0.28 + rng() * 0.3));
      const ry = Math.round(H * (0.26 + rng() * 0.3));
      const rot = Math.round(rng() * 180);
      return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${c}" transform="rotate(${rot} ${cx} ${cy})"/>`;
    })
    .join("");
  return uri(
    `<rect width="${W}" height="${H}" fill="${base}"/><g filter="url(#b)"><defs></defs>${shapes}</g><filter id="b" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="150"/></filter>`
  );
}

/* --------------------------------- abstract --------------------------------- */
/* bold layered wave bands with hard edges */

function abstractWaves(seed: number, colors: string[]): string {
  const rng = mulberry32(seed);
  const layers = colors
    .slice(1)
    .map((c, i) => {
      const yBase = H * (0.3 + (i / colors.length) * 0.65 + rng() * 0.08);
      const a1 = 120 + rng() * 200;
      const a2 = 120 + rng() * 200;
      const mid = W * (0.3 + rng() * 0.4);
      return `<path d="M0 ${yBase} C ${W * 0.22} ${yBase - a1}, ${mid} ${yBase + a2}, ${W} ${yBase - a1 * 0.5} L ${W} ${H} L 0 ${H} Z" fill="${c}"/>`;
    })
    .join("");
  return uri(`<rect width="${W}" height="${H}" fill="${colors[0]}"/>${layers}`);
}

/* ---------------------------------- refract ---------------------------------- */
/* colorful gradient fields seen through fluted (ridged) glass */

function refract(seed: number, base: string, blobs: string[]): string {
  const rng = mulberry32(seed);
  const p = `rf${seed}`;
  // soft color field behind the glass
  const field = blobs
    .map((c) => {
      const cx = Math.round(rng() * W);
      const cy = Math.round(rng() * H);
      const rx = Math.round(W * (0.24 + rng() * 0.28));
      const ry = Math.round(H * (0.3 + rng() * 0.34));
      const rot = Math.round(rng() * 180);
      return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${c}" transform="rotate(${rot} ${cx} ${cy})"/>`;
    })
    .join("");
  // fluted ridges: a light→dark gradient per ridge plus a bright caustic edge
  const angle = Math.round(-14 + rng() * 28);
  const ridge = 72 + Math.round(rng() * 48);
  const strips: string[] = [];
  for (let x = -W; x < W * 2; x += ridge) {
    strips.push(
      `<rect x="${x}" y="${-H}" width="${ridge}" height="${H * 3}" fill="url(#${p}g)"/>`,
      `<rect x="${x + ridge - 4}" y="${-H}" width="4" height="${H * 3}" fill="#ffffff" opacity="0.35"/>`
    );
  }
  return uri(
    `<defs>` +
      `<linearGradient id="${p}g" x1="0" y1="0" x2="1" y2="0">` +
      `<stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/>` +
      `<stop offset="0.35" stop-color="#ffffff" stop-opacity="0.02"/>` +
      `<stop offset="0.75" stop-color="#000000" stop-opacity="0.16"/>` +
      `<stop offset="1" stop-color="#000000" stop-opacity="0.03"/>` +
      `</linearGradient>` +
      `<filter id="${p}b" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="130"/></filter>` +
      `</defs>` +
      `<rect width="${W}" height="${H}" fill="${base}"/>` +
      `<g filter="url(#${p}b)">${field}</g>` +
      `<g transform="rotate(${angle} ${W / 2} ${H / 2})">${strips.join("")}</g>`
  );
}

/* ---------------------------------- texture --------------------------------- */

function paperTexture(seed: number, base: string, ink: string, freq: number, opacity: number): string {
  return uri(
    `<rect width="${W}" height="${H}" fill="${base}"/>` +
      `<filter id="t"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="3" seed="${seed}" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.9 0.9 0.9 0 0"/></filter>` +
      `<rect width="${W}" height="${H}" filter="url(#t)" fill="${ink}" opacity="${opacity}"/>`
  );
}

function weaveTexture(base: string, line: string, gap: number): string {
  return uri(
    `<rect width="${W}" height="${H}" fill="${base}"/>` +
      `<pattern id="p" width="${gap}" height="${gap}" patternUnits="userSpaceOnUse">` +
      `<path d="M0 0 H${gap}" stroke="${line}" stroke-width="1.1" opacity="0.5"/>` +
      `<path d="M0 0 V${gap}" stroke="${line}" stroke-width="1.1" opacity="0.35"/>` +
      `</pattern><rect width="${W}" height="${H}" fill="url(#p)"/>`
  );
}

/* --------------------------------- registry --------------------------------- */

export const BUILTIN_BACKGROUNDS: Record<string, ResolvedAsset & { label: string }> = {};

function register(id: string, label: string, url: string) {
  BUILTIN_BACKGROUNDS[`builtin:${id}`] = { url, width: W, height: H, label };
}

/* Glass — “paper ribbon” line art */
register("glass-midnight", "Midnight", glass(11, "#0b1020", ["#67e8f9", "#a5b4fc", "#f0abfc"], 0.5));
register("glass-ember", "Ember", glass(23, "#160a06", ["#fbbf24", "#fb7185", "#f97316"], 0.45));
register("glass-pearl", "Pearl", glass(37, "#f4f4f8", ["#94a3b8", "#c4b5fd", "#67e8f9"], 0.5));
register("glass-emerald", "Emerald", glass(51, "#03150f", ["#34d399", "#a7f3d0", "#22d3ee"], 0.42));

/* Refract — colorful fluted-glass patterns */
register("rf-prism", "Prism", refract(101, "#e8ecf7", ["#f472b6", "#818cf8", "#38bdf8", "#fbbf24"]));
register("rf-iris", "Iris", refract(113, "#120c2a", ["#8b5cf6", "#ec4899", "#22d3ee", "#4c1d95"]));
register("rf-flare", "Flare", refract(127, "#2a0a08", ["#fb923c", "#f43f5e", "#fde047", "#9a3412"]));
register("rf-lagoon", "Lagoon", refract(139, "#03222b", ["#2dd4bf", "#0ea5e9", "#a7f3d0", "#155e75"]));
register("rf-sorbet", "Sorbet", refract(151, "#fdf1f5", ["#fda4af", "#fbcfe8", "#a5b4fc", "#fde68a"]));
register("rf-neon", "Neon", refract(163, "#0a0a12", ["#a3e635", "#22d3ee", "#e879f9", "#365314"]));

/* Desktop — soft blurred wallpapers */
register("desk-sequoia", "Sequoia", desktop(7, "#1e3a8a", ["#7c3aed", "#2563eb", "#0ea5e9", "#c084fc"]));
register("desk-sonoma", "Sonoma", desktop(19, "#9a3412", ["#fb923c", "#fbbf24", "#f43f5e", "#fda4af"]));
register("desk-ventura", "Ventura", desktop(31, "#7f1d1d", ["#ea580c", "#e11d48", "#a21caf", "#fbbf24"]));
register("desk-monterey", "Monterey", desktop(43, "#312e81", ["#a855f7", "#ec4899", "#3b82f6", "#22d3ee"]));
register("desk-mist", "Mist", desktop(59, "#e2e8f0", ["#c7d2fe", "#fbcfe8", "#bae6fd", "#f5f5f4"]));
register("desk-slate", "Slate", desktop(67, "#0f172a", ["#334155", "#475569", "#1e293b", "#64748b"]));

/* Abstract — bold wave compositions */
register("abs-lava", "Lava", abstractWaves(13, ["#450a0a", "#dc2626", "#f97316", "#fbbf24"]));
register("abs-deep", "Deep", abstractWaves(29, ["#020617", "#1d4ed8", "#0ea5e9", "#67e8f9"]));
register("abs-orchid", "Orchid", abstractWaves(41, ["#2e1065", "#7c3aed", "#d946ef", "#f0abfc"]));
register("abs-forest", "Forest", abstractWaves(53, ["#052e16", "#15803d", "#4ade80", "#bbf7d0"]));
register("abs-sun", "Sun", abstractWaves(61, ["#7c2d12", "#ea580c", "#fbbf24", "#fef08a"]));
register("abs-mono", "Mono", abstractWaves(71, ["#09090b", "#3f3f46", "#a1a1aa", "#e4e4e7"]));

/* Texture — paper / weave / carbon */
register("tex-paper", "Paper", paperTexture(3, "#f5f2ea", "#8a8578", 0.5, 0.4));
register("tex-noir", "Noir", paperTexture(9, "#101013", "#5b5b66", 0.6, 0.5));
register("tex-canvas", "Canvas", weaveTexture("#ece7db", "#b8b09c", 14));
register("tex-carbon", "Carbon", weaveTexture("#131417", "#2e3138", 10));
register("tex-blueprint", "Blueprint", weaveTexture("#0c2a5b", "#3b6db3", 26));
register("tex-sand", "Sand", paperTexture(17, "#e8d8bd", "#a2814e", 0.35, 0.35));

export function resolveBuiltin(assetId: string): (ResolvedAsset & { label: string }) | undefined {
  return BUILTIN_BACKGROUNDS[assetId];
}
