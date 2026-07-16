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

/* ---------------------------------- aurora ---------------------------------- */
/* borealis ribbons — soft glowing curtains of light over a starry night sky */

function aurora(seed: number, sky: [string, string], ribbons: string[]): string {
  const rng = mulberry32(seed);
  const p = `au${seed}`;
  const bands = ribbons
    .map((c, i) => {
      const x = W * (0.16 + (i / Math.max(1, ribbons.length - 1)) * 0.68 + (rng() - 0.5) * 0.12);
      const sway = 140 + rng() * 200;
      const sw = 130 + rng() * 170;
      const d = `M ${Math.round(x)} -120 C ${Math.round(x + sway)} ${Math.round(H * 0.32)}, ${Math.round(x - sway)} ${Math.round(H * 0.62)}, ${Math.round(x + sway * 0.4)} ${H + 80}`;
      return `<path d="${d}" fill="none" stroke="${c}" stroke-width="${Math.round(sw)}" stroke-linecap="round" opacity="0.5"/>`;
    })
    .join("");
  const stars: string[] = [];
  for (let i = 0; i < 70; i++) {
    stars.push(
      `<circle cx="${Math.round(rng() * W)}" cy="${Math.round(rng() * H * 0.66)}" r="${(0.4 + rng() * 1.5).toFixed(1)}" fill="#fff" opacity="${(0.25 + rng() * 0.55).toFixed(2)}"/>`
    );
  }
  return uri(
    `<defs><linearGradient id="${p}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient>` +
      `<filter id="${p}b" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="95"/></filter></defs>` +
      `<rect width="${W}" height="${H}" fill="url(#${p}s)"/>${stars.join("")}` +
      `<g filter="url(#${p}b)">${bands}</g>`
  );
}

/* ---------------------------------- bokeh ----------------------------------- */
/* out-of-focus light orbs — dreamy photographic depth */

function bokeh(seed: number, base: [string, string], lights: string[]): string {
  const rng = mulberry32(seed);
  const p = `bk${seed}`;
  const orbs: string[] = [];
  for (let i = 0; i < 30; i++) {
    const c = lights[Math.floor(rng() * lights.length)];
    orbs.push(
      `<circle cx="${Math.round(rng() * W)}" cy="${Math.round(rng() * H)}" r="${Math.round(36 + rng() * 210)}" fill="${c}" opacity="${(0.1 + rng() * 0.4).toFixed(2)}"/>`
    );
  }
  return uri(
    `<defs><radialGradient id="${p}g" cx="0.5" cy="0.38" r="0.9"><stop offset="0" stop-color="${base[0]}"/><stop offset="1" stop-color="${base[1]}"/></radialGradient>` +
      `<filter id="${p}b" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="30"/></filter></defs>` +
      `<rect width="${W}" height="${H}" fill="url(#${p}g)"/>` +
      `<g filter="url(#${p}b)">${orbs.join("")}</g>`
  );
}

/* ------------------------------- topographic -------------------------------- */
/* nested contour lines — a clean topographic-map look */

function topographic(seed: number, base: string, line: string): string {
  const rng = mulberry32(seed);
  const centers: [number, number][] = [
    [W * (0.24 + rng() * 0.12), H * (0.32 + rng() * 0.14)],
    [W * (0.68 + rng() * 0.12), H * (0.58 + rng() * 0.14)],
  ];
  const rings: string[] = [];
  const h1 = rng() * 6;
  const h2 = rng() * 6;
  centers.forEach(([cx, cy], ci) => {
    for (let r = 58; r < Math.max(W, H) * 0.9; r += 50) {
      const pts: string[] = [];
      for (let a = 0; a <= 360; a += 10) {
        const rad = (a * Math.PI) / 180;
        const wob = 1 + 0.07 * Math.sin(rad * 3 + h1 + ci) + 0.045 * Math.sin(rad * 5 + h2 + r * 0.01);
        pts.push(`${Math.round(cx + Math.cos(rad) * r * wob)},${Math.round(cy + Math.sin(rad) * r * wob)}`);
      }
      rings.push(`<polygon points="${pts.join(" ")}" fill="none" stroke="${line}" stroke-width="1.6" opacity="0.42"/>`);
    }
  });
  return uri(`<rect width="${W}" height="${H}" fill="${base}"/>${rings.join("")}`);
}

/* ---------------------------------- grid ------------------------------------ */
/* perspective grid receding to a glowing horizon — retro-futuristic */

function gridPerspective(seed: number, sky: [string, string], grid: string, glow: string): string {
  const rng = mulberry32(seed);
  const p = `gp${seed}`;
  const horizon = Math.round(H * 0.5);
  const vp = W / 2;
  const lines: string[] = [];
  for (let i = -12; i <= 12; i++) {
    lines.push(`<line x1="${Math.round(vp + i * 34)}" y1="${horizon}" x2="${Math.round(vp + i * (W / 8))}" y2="${H}" stroke="${grid}" stroke-width="2" opacity="0.5"/>`);
  }
  let y = horizon + 8;
  let gap = 9;
  while (y < H) {
    lines.push(`<line x1="0" y1="${Math.round(y)}" x2="${W}" y2="${Math.round(y)}" stroke="${grid}" stroke-width="2" opacity="0.4"/>`);
    y += gap;
    gap *= 1.32;
  }
  void rng;
  return uri(
    `<defs><linearGradient id="${p}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient>` +
      `<radialGradient id="${p}g" cx="0.5" cy="1" r="0.7"><stop offset="0" stop-color="${glow}" stop-opacity="0.85"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient></defs>` +
      `<rect width="${W}" height="${horizon}" fill="url(#${p}s)"/>` +
      `<rect y="${horizon}" width="${W}" height="${H - horizon}" fill="${sky[1]}"/>` +
      `<circle cx="${vp}" cy="${horizon}" r="${Math.round(H * 0.46)}" fill="url(#${p}g)"/>` +
      `<g>${lines.join("")}</g>`
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

// aurora — glowing borealis curtains over a night sky
register("au-borealis", "Borealis", aurora(201, ["#04122a", "#010409"], ["#34d399", "#22d3ee", "#a3e635"]));
register("au-violet", "Violet Veil", aurora(211, ["#160a2e", "#05030f"], ["#a855f7", "#ec4899", "#6366f1"]));
register("au-ember", "Ember Sky", aurora(223, ["#1a0a12", "#0a0406"], ["#fb7185", "#fbbf24", "#f97316"]));
register("au-glacier", "Glacier", aurora(233, ["#041c2a", "#020a12"], ["#67e8f9", "#a5f3fc", "#818cf8"]));

// bokeh — dreamy out-of-focus light orbs
register("bk-noir", "Noir Lights", bokeh(301, ["#1e293b", "#020617"], ["#f8fafc", "#93c5fd", "#c4b5fd"]));
register("bk-warm", "Warm Glow", bokeh(313, ["#3b1d0e", "#180a04"], ["#fde68a", "#fdba74", "#fca5a5"]));
register("bk-candy", "Candy", bokeh(323, ["#2e1065", "#0f0524"], ["#f0abfc", "#a5b4fc", "#67e8f9"]));
register("bk-mint", "Mint", bokeh(331, ["#022c22", "#01120d"], ["#6ee7b7", "#a7f3d0", "#5eead4"]));

// topographic — clean contour-map lines
register("topo-paper", "Paper Map", topographic(401, "#f4efe4", "#b7a98c"));
register("topo-noir", "Noir Map", topographic(413, "#0d1117", "#39507a"));
register("topo-blue", "Blueprint", topographic(423, "#0a2547", "#4f86c6"));
register("topo-sage", "Sage Map", topographic(431, "#e7efe6", "#93b39a"));

// grid — perspective grid to a glowing horizon
register("grid-sunset", "Sunset Grid", gridPerspective(501, ["#2b0a3d", "#0a0212"], "#ec4899", "#fb7185"));
register("grid-cyber", "Cyber", gridPerspective(513, ["#04121f", "#01060c"], "#22d3ee", "#0ea5e9"));
register("grid-mono", "Mono Grid", gridPerspective(523, ["#18181b", "#050506"], "#71717a", "#a1a1aa"));
register("grid-acid", "Acid", gridPerspective(531, ["#0a1f05", "#020a01"], "#a3e635", "#4ade80"));

export function resolveBuiltin(assetId: string): (ResolvedAsset & { label: string }) | undefined {
  return BUILTIN_BACKGROUNDS[assetId];
}
