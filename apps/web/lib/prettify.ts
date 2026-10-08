import { getDevice } from "@framekit/devices";
import type { Backdrop, Background, Effect, MockupLayer, SceneDocument, Shadow } from "@framekit/scene";
import { applyLayout, LAYOUT_PRESETS } from "./layouts";

/**
 * "Make it pretty": one click turns the current scene into a finished look.
 * Each look is a background built from the screenshot's own colours, a
 * staging of the device, a matching shadow, and readable text colours.
 * Pure, so the tray can preview every look live before one is applied.
 */

export interface Look {
  id: string;
  label: string;
  scene: SceneDocument;
}

/* --------------------------------- colour --------------------------------- */

type Hsl = [h: number, s: number, l: number];

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHsl([r, g, b]: [number, number, number]): Hsl {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

/** CSS-style hsl → #rrggbb; hue wraps, s and l clamp to 0..1. */
export function hsl(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.min(1, Math.max(0, s));
  l = Math.min(1, Math.max(0, l));
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const hex = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0");
  return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`;
}

function luminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Hues to fall back on when the screenshot is greyscale. */
const FALLBACK_HUES = [262, 199, 158, 330, 24, 226];

/**
 * The accent the looks are built around: the most colourful palette entry
 * (round 0), then the next most colourful, then hue shifts, so Shuffle gives
 * genuinely different looks. Greyscale screenshots get a curated hue.
 */
export function pickAccent(palette: string[], round = 0): { hue: number; sat: number } {
  const colourful = palette
    .map((c) => hexToRgb(c))
    .filter((rgb): rgb is [number, number, number] => !!rgb)
    .map(rgbToHsl)
    .map(([h, s, l]) => ({ h, s, chroma: s * (1 - Math.abs(2 * l - 1)) }))
    .filter((c) => c.chroma >= 0.12)
    .sort((a, b) => b.chroma - a.chroma);
  if (!colourful.length) return { hue: FALLBACK_HUES[round % FALLBACK_HUES.length], sat: 0.7 };
  const base = colourful[round % Math.min(2, colourful.length)];
  const shift = round < 2 ? 0 : [0, 32, -32, 150][Math.floor(round / 2) % 4];
  return { hue: base.h + shift, sat: Math.min(0.85, Math.max(0.5, base.s)) };
}

/* --------------------------------- recipes -------------------------------- */

interface Recipe {
  id: string;
  label: string;
  light: boolean;
  background: (h: number, s: number, seed: number) => Background;
  backdrop?: (h: number, s: number) => Backdrop["pattern"];
  effects?: Effect[];
}

const RECIPES: Recipe[] = [
  {
    id: "deep",
    label: "Deep",
    light: false,
    background: (h, s) => ({
      type: "linear-gradient",
      angle: 150,
      stops: [
        { at: 0, color: hsl(h, s * 0.7, 0.09) },
        { at: 0.55, color: hsl(h, s, 0.3) },
        { at: 1, color: hsl(h + 24, s, 0.52) },
      ],
    }),
  },
  {
    id: "glow",
    label: "Glow",
    light: false,
    background: (h, s) => ({
      type: "radial-gradient",
      cx: 0.5,
      cy: 0.3,
      stops: [
        { at: 0, color: hsl(h, s, 0.6) },
        { at: 0.45, color: hsl(h, s * 0.85, 0.24) },
        { at: 1, color: hsl(h, s * 0.5, 0.05) },
      ],
    }),
    effects: [{ type: "vignette", intensity: 0.3, color: "#000000" }],
  },
  {
    id: "soft",
    label: "Soft",
    light: true,
    background: (h) => ({
      type: "linear-gradient",
      angle: 160,
      stops: [
        { at: 0, color: hsl(h, 0.6, 0.96) },
        { at: 1, color: hsl(h + 30, 0.55, 0.85) },
      ],
    }),
    backdrop: (h) => ({ kind: "dots", intensity: 0.22, thickness: 0.32, color: hsl(h, 0.45, 0.68) }),
  },
  {
    id: "aurora",
    label: "Aurora",
    light: false,
    background: (h, s, seed) => ({
      type: "mesh-gradient",
      seed,
      colors: [hsl(h, s, 0.52), hsl(h + 42, s, 0.46), hsl(h - 48, s * 0.9, 0.3), hsl(h, s * 0.6, 0.12)],
    }),
    effects: [{ type: "grain", intensity: 0.18, seed: 7 }],
  },
  {
    id: "duotone",
    label: "Duotone",
    light: false,
    background: (h, s) => ({
      type: "linear-gradient",
      angle: 120,
      stops: [
        { at: 0, color: hsl(h, s, 0.48) },
        { at: 1, color: hsl(h + 150, s * 0.9, 0.55) },
      ],
    }),
  },
  {
    id: "studio",
    label: "Studio",
    light: true,
    background: (h) => ({
      type: "radial-gradient",
      cx: 0.5,
      cy: 0.36,
      stops: [
        { at: 0, color: "#ffffff" },
        { at: 1, color: hsl(h, 0.2, 0.88) },
      ],
    }),
    backdrop: (h) => ({ kind: "grid", intensity: 0.18, thickness: 0.3, color: hsl(h, 0.25, 0.72) }),
  },
];

/** Stagings per device shape, rotated against the recipes on each round. */
const TALL_LAYOUTS = ["solo-center", "solo-turn", "solo-lean", "solo-showcase", "solo-hero", "solo-recline"];
const WIDE_LAYOUTS = ["solo-center", "solo-turn", "solo-showcase", "solo-small", "solo-center", "solo-turn"];

function shadowFor(h: number, light: boolean): Shadow {
  return light
    ? { mode: "adaptive", lightAngle: 90, distance: 34, softness: 80, opacity: 0.22, color: hsl(h, 0.4, 0.22) }
    : { mode: "adaptive", lightAngle: 90, distance: 44, softness: 96, opacity: 0.45, color: hsl(h, 0.5, 0.04) };
}

/** True when the scene has a screenshot to make pretty. */
export function canPrettify(scene: SceneDocument): boolean {
  return scene.layers.some((l) => l.type === "mockup" && !!l.media);
}

/**
 * Six finished looks for `scene`, built from `palette` (dark → light hex
 * colours of the screenshot, see lib/palette.ts). `round` reshuffles the
 * accent and the staging. A single-device scene is restaged; a scene with
 * several devices keeps its arrangement and only changes style.
 */
export function prettyLooks(scene: SceneDocument, palette: string[], round = 0): Look[] {
  const mockups = scene.layers.filter((l): l is MockupLayer => l.type === "mockup");
  const hero = mockups.find((m) => m.media) ?? mockups[0];
  const device = hero?.deviceId ? getDevice(hero.deviceId) : undefined;
  const photoScene = device?.category === "scene";
  const tall = !device || (device.category !== "laptop" && device.category !== "desktop" && device.category !== "browser" && device.frame.height >= device.frame.width);
  const layouts = tall ? TALL_LAYOUTS : WIDE_LAYOUTS;
  const restage = mockups.length === 1 && !photoScene;
  const { hue, sat } = pickAccent(palette, round);

  return RECIPES.map((r, i) => {
    let next: SceneDocument = scene;
    if (restage) {
      const preset = LAYOUT_PRESETS.find((p) => p.id === layouts[(i + round) % layouts.length]);
      if (preset) next = applyLayout(next, preset);
    }
    const pattern = r.backdrop?.(hue, sat);
    const backdrop: Backdrop | undefined = scene.canvas.backdrop?.portrait || pattern
      ? { ...(scene.canvas.backdrop?.portrait ? { portrait: scene.canvas.backdrop.portrait } : {}), ...(pattern ? { pattern } : {}) }
      : undefined;
    const textColor = r.light ? "#17171c" : "#ffffff";
    next = {
      ...next,
      canvas: {
        ...next.canvas,
        background: r.background(hue, sat, 11 + round * 7 + i),
        backdrop,
        effects: r.effects,
      },
      layers: next.layers.map((l) => {
        if (l.type === "mockup") return photoScene ? l : { ...l, shadow: shadowFor(hue, r.light) };
        if (l.type === "text" && !l.gradient) {
          const lum = luminance(l.color);
          // only flip text that would disappear on the new background
          if ((r.light && lum > 0.6) || (!r.light && lum < 0.18)) return { ...l, color: textColor };
        }
        return l;
      }),
    };
    return { id: r.id, label: r.label, scene: next };
  });
}
