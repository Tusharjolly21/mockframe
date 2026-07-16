"use client";

import type { Background } from "@framekit/scene";

/** Curated background library, shots.so-style categories. Every swatch is an
 *  ordinary Background document value — nothing special downstream. */
export interface BgSwatch {
  id: string;
  bg: Background;
}

export interface BgCategory {
  id: string;
  label: string;
  swatches: BgSwatch[];
}

/**
 * Pro-only background collections — the designer procedural art. Applying one
 * while free opens the upgrade modal; Shuffle skips them for free users. Every
 * solid, gradient, mesh and Unsplash photo stays free, so the free tier still
 * has ~70 backgrounds and every building block. This gates curation, not
 * capability — the underlying Background values are ordinary, and a free user
 * can hand-build a similar look. Single source of truth for the gate.
 */
export const PRO_BG_CATEGORY_IDS = new Set([
  "glass",
  "refract",
  "abstract",
  "desktop",
  "aurora",
  "bokeh",
  "topographic",
  "grid",
]);

export function isProBgCategory(categoryId: string): boolean {
  return PRO_BG_CATEGORY_IDS.has(categoryId);
}

const lin = (id: string, angle: number, colors: string[]): BgSwatch => ({
  id,
  bg: {
    type: "linear-gradient",
    angle,
    stops: colors.map((c, i) => ({ at: colors.length === 1 ? 0 : i / (colors.length - 1), color: c })),
  },
});

const mesh = (id: string, seed: number, colors: string[]): BgSwatch => ({
  id,
  bg: { type: "mesh-gradient", seed, colors },
});

const rad = (id: string, cx: number, cy: number, colors: string[]): BgSwatch => ({
  id,
  bg: {
    type: "radial-gradient",
    cx,
    cy,
    stops: colors.map((c, i) => ({ at: i / (colors.length - 1), color: c })),
  },
});

const solid = (id: string, color: string): BgSwatch => ({ id, bg: { type: "solid", color } });

const img = (id: string): BgSwatch => ({
  id,
  bg: { type: "image", assetId: `builtin:${id}`, fit: "cover", blur: 0, opacity: 1 },
});

export const BG_CATEGORIES: BgCategory[] = [
  {
    id: "solid",
    label: "Solid",
    swatches: [
      solid("s-white", "#ffffff"),
      solid("s-fog", "#eceef2"),
      solid("s-slate", "#c7ccd6"),
      solid("s-ink", "#17171c"),
      solid("s-cream", "#f6efe3"),
      solid("s-sage", "#dbe7dc"),
      solid("s-blush", "#f7dfe4"),
      solid("s-navy", "#101a33"),
    ],
  },
  {
    id: "gradient",
    label: "Gradient",
    swatches: [
      lin("g-sunrise", 120, ["#fde047", "#fb923c", "#e11d48"]),
      lin("g-berry", 135, ["#f43f5e", "#a21caf", "#4c1d95"]),
      lin("g-candy", 120, ["#f0abfc", "#a78bfa", "#60a5fa"]),
      lin("g-ocean", 140, ["#22d3ee", "#2563eb"]),
      lin("g-lime", 135, ["#bef264", "#22c55e", "#0d9488"]),
      lin("g-peach", 135, ["#fde68a", "#fb7185"]),
      lin("g-dusk", 160, ["#7c3aed", "#0891b2"]),
      lin("g-honey", 180, ["#fef08a", "#d97706"]),
      lin("g-flame", 150, ["#f97316", "#dc2626", "#7f1d1d"]),
      lin("g-mint", 135, ["#a7f3d0", "#2dd4bf", "#0e7490"]),
      lin("g-royal", 145, ["#1e3a8a", "#6d28d9", "#c026d3"]),
      lin("g-steel", 170, ["#e2e8f0", "#64748b", "#1e293b"]),
    ],
  },
  {
    id: "glass",
    label: "Glass",
    swatches: [img("glass-midnight"), img("glass-ember"), img("glass-pearl"), img("glass-emerald")],
  },
  {
    id: "refract",
    label: "Refract",
    swatches: [
      img("rf-prism"),
      img("rf-iris"),
      img("rf-flare"),
      img("rf-lagoon"),
      img("rf-sorbet"),
      img("rf-neon"),
    ],
  },
  {
    id: "aurora",
    label: "Aurora",
    swatches: [img("au-borealis"), img("au-violet"), img("au-ember"), img("au-glacier")],
  },
  {
    id: "bokeh",
    label: "Bokeh",
    swatches: [img("bk-noir"), img("bk-warm"), img("bk-candy"), img("bk-mint")],
  },
  {
    id: "topographic",
    label: "Topographic",
    swatches: [img("topo-paper"), img("topo-noir"), img("topo-blue"), img("topo-sage")],
  },
  {
    id: "grid",
    label: "Grid",
    swatches: [img("grid-sunset"), img("grid-cyber"), img("grid-mono"), img("grid-acid")],
  },
  {
    id: "cosmic",
    label: "Cosmic",
    swatches: [
      mesh("c-nebula", 17, ["#0f172a", "#4c1d95", "#a21caf", "#1e1b4b"]),
      mesh("c-void", 5, ["#020617", "#1e293b", "#4338ca", "#0f172a"]),
      mesh("c-ember", 23, ["#1c1917", "#7c2d12", "#dc2626", "#451a03"]),
      mesh("c-aurora", 41, ["#022c22", "#0e7490", "#4ade80", "#064e3b"]),
    ],
  },
  {
    id: "mystic",
    label: "Mystic",
    swatches: [
      mesh("m-lilac", 9, ["#ede9fe", "#c4b5fd", "#f5f3ff", "#ddd6fe"]),
      mesh("m-dawn", 31, ["#fef3c7", "#fbcfe8", "#e0e7ff", "#fdf4ff"]),
      mesh("m-mist", 13, ["#e0f2fe", "#bae6fd", "#f0f9ff", "#c7d2fe"]),
      mesh("m-pearl", 27, ["#f8fafc", "#e2e8f0", "#fdf2f8", "#eef2ff"]),
      mesh("m-rose", 21, ["#ffe4e6", "#fecdd3", "#fff1f2", "#fbcfe8"]),
      mesh("m-sage", 35, ["#ecfdf5", "#bbf7d0", "#d1fae5", "#e0f2fe"]),
    ],
  },
  {
    id: "desktop",
    label: "Desktop",
    swatches: [
      img("desk-sequoia"),
      img("desk-sonoma"),
      img("desk-ventura"),
      img("desk-monterey"),
      img("desk-mist"),
      img("desk-slate"),
    ],
  },
  {
    id: "abstract",
    label: "Abstract",
    swatches: [
      img("abs-lava"),
      img("abs-deep"),
      img("abs-orchid"),
      img("abs-forest"),
      img("abs-sun"),
      img("abs-mono"),
    ],
  },
  {
    id: "radiant",
    label: "Radiant",
    swatches: [
      rad("r-sun", 0.5, 0.35, ["#fde047", "#f97316", "#9a3412"]),
      rad("r-orchid", 0.3, 0.25, ["#f0abfc", "#a855f7", "#3b0764"]),
      rad("r-sea", 0.7, 0.3, ["#67e8f9", "#0284c7", "#082f49"]),
      rad("r-rose", 0.5, 0.8, ["#fecdd3", "#f43f5e", "#4c0519"]),
    ],
  },
  {
    id: "prism",
    label: "Prism",
    swatches: [
      lin("p-electric", 118, ["#020617", "#1d4ed8", "#7c3aed", "#ec4899"]),
      lin("p-cyan-flare", 142, ["#082f49", "#06b6d4", "#a7f3d0", "#f8fafc"]),
      lin("p-solar", 128, ["#172554", "#2563eb", "#f59e0b", "#fef3c7"]),
      lin("p-magenta-void", 156, ["#111827", "#581c87", "#db2777", "#fb7185"]),
      mesh("p-aurora", 67, ["#042f2e", "#0f766e", "#22d3ee", "#312e81"]),
      mesh("p-ultraviolet", 73, ["#0f172a", "#312e81", "#9333ea", "#f0abfc"]),
    ],
  },
  {
    id: "earth",
    label: "Earth",
    swatches: [
      lin("e-sand", 160, ["#f5e7d3", "#d9b98c"]),
      lin("e-clay", 150, ["#e7c8b4", "#a16247"]),
      lin("e-moss", 160, ["#dce8d5", "#7d9b76"]),
      lin("e-stone", 180, ["#e8e6e1", "#a8a29e"]),
      lin("e-dune", 155, ["#fbe6c2", "#c98d46", "#7a4a1f"]),
      lin("e-sea", 165, ["#d1fae5", "#67c5b0", "#1d6a5f"]),
    ],
  },
  {
    id: "spectral",
    label: "Spectral",
    swatches: [
      lin("sp-cosmic-pink", 124, ["#020617", "#1e1b4b", "#7e22ce", "#ec4899"]),
      lin("sp-cyan-violet", 138, ["#0c4a6e", "#06b6d4", "#6366f1", "#c026d3"]),
      lin("sp-lagoon", 154, ["#042f2e", "#0f766e", "#0891b2", "#1d4ed8"]),
      lin("sp-polar", 112, ["#172554", "#38bdf8", "#e0f2fe", "#a5b4fc"]),
      lin("sp-coral-night", 145, ["#1f2937", "#7f1d1d", "#f43f5e", "#fdba74"]),
      lin("sp-lime-orbit", 132, ["#052e16", "#16a34a", "#a3e635", "#fef08a"]),
      lin("sp-royal-fire", 160, ["#111827", "#3730a3", "#c026d3", "#fb923c"]),
      lin("sp-blue-hour", 175, ["#020617", "#1e3a8a", "#2563eb", "#67e8f9"]),
      mesh("sp-neon-water", 81, ["#082f49", "#0e7490", "#4f46e5", "#db2777"]),
      mesh("sp-ember-glass", 87, ["#1c1917", "#9a3412", "#ea580c", "#fef3c7"]),
      mesh("sp-forest-light", 93, ["#022c22", "#166534", "#14b8a6", "#d9f99d"]),
      mesh("sp-iris-cloud", 101, ["#1e1b4b", "#4338ca", "#a855f7", "#f5d0fe"]),
      lin("sp-sandstorm", 168, ["#292524", "#92400e", "#f59e0b", "#fef3c7"]),
      lin("sp-rose-steel", 118, ["#1f2937", "#475569", "#e11d48", "#fda4af"]),
      lin("sp-mint-dusk", 146, ["#134e4a", "#14b8a6", "#818cf8", "#312e81"]),
      lin("sp-electric-sun", 102, ["#172554", "#2563eb", "#facc15", "#fff7ed"]),
    ],
  },
  {
    id: "texture",
    label: "Texture",
    swatches: [
      img("tex-paper"),
      img("tex-noir"),
      img("tex-canvas"),
      img("tex-carbon"),
      img("tex-blueprint"),
      img("tex-sand"),
    ],
  },
];

/** "Magic" swatches derived from the uploaded screenshot's palette. */
export function magicSwatches(palette: string[]): BgSwatch[] {
  if (palette.length < 2) return [];
  const [a, b, c, d, e] = [...palette, ...palette].slice(0, 5);
  return [
    mesh("magic-mesh", 11, [a, c, e, b]),
    lin("magic-deep", 135, [a, b]),
    lin("magic-pop", 120, [b, d, e]),
    rad("magic-glow", 0.5, 0.35, [e, c, a]),
    solid("magic-base", b),
    solid("magic-bright", e),
  ];
}
