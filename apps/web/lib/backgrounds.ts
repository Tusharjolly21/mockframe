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
