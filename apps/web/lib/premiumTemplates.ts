"use client";

import { getDevice } from "@framekit/devices";
import {
  IDENTITY_TRANSFORM,
  createId,
  createScene,
  type Background,
  type Backdrop,
  type Layer,
  type MockupLayer,
  type SceneDocument,
  type Shadow,
  type TextLayer,
} from "@framekit/scene";

/**
 * Premium layouts: complete, ready-to-post compositions for the moments an
 * app team actually ships — a launch hero, a feature trio, a keynote reveal,
 * a Product Hunt gallery image, a before/after, release notes, a reel cover.
 * Each opens as an ordinary scene (real devices, editable type, sample
 * screens to swap) sized for where it will be posted. Directions were
 * explored on the Superdesign canvas, then rebuilt from editor primitives.
 *
 * Two are free; the rest need Pro to export (see `scene.template`).
 */

export interface PremiumTemplate {
  slug: string;
  name: string;
  /** where it's meant to be posted */
  use: string;
  blurb: string;
  width: number;
  height: number;
  pro: boolean;
  /** gallery card background behind the preview */
  cardBg: string;
  build: () => SceneDocument;
}

/* --------------------------------- builder ---------------------------------- */

const SHADOW: Shadow = { mode: "adaptive", lightAngle: 90, distance: 60, softness: 110, opacity: 0.3, color: "#0b0b17" };

const radial = (cx: number, cy: number, colors: string[]): Background => ({
  type: "radial-gradient",
  cx,
  cy,
  stops: colors.map((color, i) => ({ at: i / (colors.length - 1), color })),
});

type TextOpts = {
  /** top edge of the block in px from the canvas top */
  top: number;
  size: number;
  family: string;
  weight?: number;
  color?: string;
  align?: "left" | "center" | "right";
  /** left edge in px from the canvas left (left-aligned blocks), or centre x offset for centred ones */
  left?: number;
  x?: number;
  /** wrap width in px; null = single line hugging its content */
  width?: number | null;
  /** lines the block occupies, for vertical placement */
  lines?: number;
  lineHeight?: number;
  letterSpacing?: number;
  italic?: boolean;
  uppercase?: boolean;
  gradient?: TextLayer["gradient"];
  highlight?: TextLayer["highlight"];
  shadow?: TextLayer["shadow"];
  rotate?: number;
  /** approximate content width for chips placed by their left edge */
  chipWidth?: number;
};

type DeviceOpts = {
  /** centre, px from the canvas centre */
  x?: number;
  y?: number;
  /** frame height in px */
  height: number;
  rotate?: number;
  tiltX?: number;
  tiltY?: number;
  variant?: string;
  clay?: string;
  shadow?: Partial<Shadow> | null;
};

class Composer {
  layers: Layer[] = [];
  background: Background = { type: "solid", color: "#ffffff" };
  backdrop?: Backdrop;
  private n = 0;

  constructor(
    readonly W: number,
    readonly H: number,
  ) {}

  private id(kind: string) {
    this.n += 1;
    return `${kind}-${this.n}-${createId().slice(0, 6)}`;
  }

  text(content: string, o: TextOpts): TextLayer {
    const lh = o.lineHeight ?? 1.05;
    const lines = o.lines ?? content.split("\n").length;
    const padY = o.highlight?.padY ?? 0;
    const h = lines * o.size * lh + padY * 2;
    const align = o.align ?? "left";
    const width = o.width === undefined ? null : o.width;
    let x = o.x ?? 0;
    if (o.left !== undefined) {
      const boxW = width ?? o.chipWidth ?? 0;
      x = o.left + boxW / 2 - this.W / 2;
    }
    const layer: TextLayer = {
      type: "text",
      id: this.id("text"),
      content,
      font: { family: o.family, weight: o.weight ?? 700, size: o.size, lineHeight: lh, letterSpacing: o.letterSpacing ?? -0.02 },
      color: o.color ?? "#ffffff",
      align,
      maxWidth: width,
      transform: { ...IDENTITY_TRANSFORM, x: Math.round(x), y: Math.round(o.top + h / 2 - this.H / 2), rotate: o.rotate ?? 0 },
      ...(o.italic ? { italic: true } : {}),
      ...(o.uppercase ? { uppercase: true } : {}),
      ...(o.gradient ? { gradient: o.gradient } : {}),
      ...(o.highlight ? { highlight: o.highlight } : {}),
      ...(o.shadow ? { shadow: o.shadow } : {}),
    };
    this.layers.push(layer);
    return layer;
  }

  device(deviceId: string, assetId: string | null, o: DeviceOpts): MockupLayer {
    const frameH = getDevice(deviceId)?.frame.height ?? 2718;
    const layer: MockupLayer = {
      type: "mockup",
      id: this.id("device"),
      deviceId,
      ...(o.variant ? { frameVariant: o.variant } : {}),
      media: assetId ? { assetId, kind: "image", fit: "cover", offsetX: 0, offsetY: 0, scale: 1 } : null,
      transform: {
        ...IDENTITY_TRANSFORM,
        x: Math.round(o.x ?? 0),
        y: Math.round(o.y ?? 0),
        scale: Math.round((o.height / frameH) * 10000) / 10000,
        rotate: o.rotate ?? 0,
        tiltX: o.tiltX ?? 0,
        tiltY: o.tiltY ?? 0,
      },
      shadow: o.shadow === null ? null : { ...SHADOW, ...o.shadow },
      ...(o.clay ? { clay: { color: o.clay } } : {}),
    };
    this.layers.push(layer);
    return layer;
  }

  arrow(o: { x: number; y: number; scale: number; rotate?: number; tint: string }) {
    this.layers.push({
      type: "sticker",
      id: this.id("arrow"),
      stickerId: "annot-arrow",
      tint: o.tint,
      transform: { ...IDENTITY_TRANSFORM, x: o.x, y: o.y, scale: o.scale, rotate: o.rotate ?? 0 },
    });
  }

  build(slug: string, pro: boolean): SceneDocument {
    const scene = createScene({
      width: this.W,
      height: this.H,
      background: this.background,
      ...(this.backdrop ? { backdrop: this.backdrop } : {}),
    });
    scene.layers = this.layers;
    scene.template = { id: slug, pro };
    return scene;
  }
}

const sample = (app: string, n: number, platform: "ios" | "android" | "desktop" = "ios") =>
  `builtin:sample/${app}/${platform}-${String(n).padStart(2, "0")}`;

const PHONE = "iphone-17-pro";
const LAPTOP = "macbook-pro-16";

/* -------------------------------- templates --------------------------------- */

function launchHero(): SceneDocument {
  const c = new Composer(1600, 900);
  c.background = { type: "mesh-gradient", seed: 41, colors: ["#efe9ff", "#ffe8d6", "#fbe3f1", "#e3e8ff"] };
  c.backdrop = { pattern: { kind: "noise", intensity: 0.18, thickness: 0.4, color: "#ffffff" } };
  const left = 120;
  c.text("NEW  ·  VERSION 1.0", {
    top: 176, left, size: 17, family: "Plus Jakarta Sans", weight: 800, color: "#5b4bd6", letterSpacing: 0.12, chipWidth: 230,
    highlight: { color: "#ffffff", radius: 999, padX: 18, padY: 9 },
  });
  c.text("Your app,\nbeautifully\nshipped.", {
    top: 250, left, width: 760, size: 92, family: "Plus Jakarta Sans", weight: 800, color: "#17153a", lineHeight: 1.0, letterSpacing: -0.045,
  });
  c.text("Track spending, plan goals and grow your savings — all in one calm, private place.", {
    top: 556, left, width: 560, lines: 2, size: 25, family: "Plus Jakarta Sans", weight: 500, color: "#5a5873", lineHeight: 1.45, letterSpacing: -0.005,
  });
  c.text("  Download on the App Store  ", {
    top: 676, left, size: 20, family: "Plus Jakarta Sans", weight: 700, color: "#ffffff", chipWidth: 320,
    highlight: { color: "#17153a", radius: 16, padX: 22, padY: 16 },
  });
  c.text("  Get it on Google Play  ", {
    top: 676, left: left + 360, size: 20, family: "Plus Jakarta Sans", weight: 700, color: "#17153a", chipWidth: 270,
    highlight: { color: "#ffffff", radius: 16, padX: 22, padY: 16 },
  });
  c.device(PHONE, sample("penny", 1), { x: 400, y: 30, height: 900, rotate: 12, tiltY: -10, variant: "natural-titanium", shadow: { distance: 80, softness: 130, opacity: 0.28, color: "#3b2a8a" } });
  return c.build("launch-hero", false);
}

function featureTrio(): SceneDocument {
  const c = new Composer(1920, 1080);
  c.background = radial(0.5, 0.18, ["#1f9d78", "#0c6b5a", "#06403a"]);
  c.backdrop = { overlay: { kind: "top-light", intensity: 0.35 } };
  const captions = ["Track every habit", "See your streaks", "Celebrate wins"];
  const xs = [-560, 0, 560];
  captions.forEach((cap, i) => {
    c.text(cap, { top: i === 1 ? 92 : 132, x: xs[i], align: "center", width: 520, size: i === 1 ? 50 : 42, family: "Outfit", weight: 700, color: "#ffffff", letterSpacing: -0.02 });
  });
  c.device(PHONE, sample("habitat", 1), { x: -560, y: 180, height: 820, shadow: { opacity: 0.4, color: "#021b17" } });
  c.device(PHONE, sample("habitat", 2), { x: 0, y: 150, height: 900, shadow: { opacity: 0.45, color: "#021b17" } });
  c.device(PHONE, sample("habitat", 3), { x: 560, y: 180, height: 820, shadow: { opacity: 0.4, color: "#021b17" } });
  return c.build("feature-trio", false);
}

function clayStudio(): SceneDocument {
  const c = new Composer(1080, 1350);
  c.background = radial(0.5, 0.35, ["#f6efe5", "#eadfcf", "#d9cab5"]);
  c.backdrop = { overlay: { kind: "window", intensity: 0.22 } };
  c.text("CASE STUDY", { top: 104, align: "center", size: 18, family: "Inter", weight: 600, color: "#8a7b66", letterSpacing: 0.32, width: 600 });
  c.text("Made with", { top: 148, align: "center", size: 96, family: "Instrument Serif", weight: 400, color: "#2b241c", letterSpacing: -0.02, width: 900 });
  c.text("care.", { top: 240, align: "center", size: 132, family: "Instrument Serif", weight: 400, color: "#2b241c", italic: true, letterSpacing: -0.02, width: 900 });
  c.device(PHONE, sample("habitat", 4), { x: -150, y: 250, height: 740, rotate: -9, clay: "#f3f1ec", shadow: { distance: 70, softness: 120, opacity: 0.22, color: "#5b4632" } });
  c.device(PHONE, sample("habitat", 2), { x: 170, y: 205, height: 780, rotate: 6, clay: "#f3f1ec", shadow: { distance: 80, softness: 130, opacity: 0.26, color: "#5b4632" } });
  return c.build("clay-studio", true);
}

function keynoteStage(): SceneDocument {
  const c = new Composer(1920, 1080);
  c.background = radial(0.5, 0.0, ["#26222e", "#0b0a0f", "#000000"]);
  c.backdrop = { overlay: { kind: "spotlight", intensity: 0.55 } };
  c.text("Introducing", { top: 70, align: "center", size: 30, family: "Inter", weight: 500, color: "#9b98a6", letterSpacing: 0.02, width: 800 });
  c.text("Aurora", {
    top: 112, align: "center", size: 170, family: "Plus Jakarta Sans", weight: 800, letterSpacing: -0.05, width: 1400, color: "#c084fc",
    gradient: [{ at: 0, color: "#a78bfa" }, { at: 0.55, color: "#f472b6" }, { at: 1, color: "#fb923c" }],
  });
  c.device(PHONE, sample("hush", 3), { x: 0, y: 420, height: 1080, tiltX: 16, variant: "black-titanium", shadow: { distance: 40, softness: 160, opacity: 0.6, color: "#7c3aed" } });
  return c.build("keynote-stage", true);
}

function productHunt(): SceneDocument {
  const c = new Composer(1270, 760);
  c.background = radial(0.75, 0.45, ["#fff8ee", "#fbf3e7", "#f4e8d6"]);
  c.backdrop = { pattern: { kind: "grid", intensity: 0.08, thickness: 0.18, color: "#c9b597" } };
  const left = 72;
  c.text("🚀  LAUNCHING TODAY ON PRODUCT HUNT", {
    top: 196, left, size: 15, family: "Inter", weight: 800, color: "#ffffff", letterSpacing: 0.06, chipWidth: 370,
    highlight: { color: "#ff6154", radius: 999, padX: 16, padY: 9 },
  });
  c.text("Notely", { top: 252, left, width: 470, size: 92, family: "Bricolage Grotesque", weight: 800, color: "#1d1a17", letterSpacing: -0.04 });
  c.text("The distraction-free workspace where your best ideas come to live and grow.", {
    top: 362, left, width: 430, lines: 2, size: 21, family: "Inter", weight: 500, color: "#6d6359", lineHeight: 1.45, letterSpacing: -0.005,
  });
  c.text("▲  UPVOTE", {
    top: 480, left, size: 18, family: "Inter", weight: 800, color: "#ff6154", letterSpacing: 0.06, chipWidth: 150,
    highlight: { color: "#ffffff", radius: 14, padX: 20, padY: 14 },
  });
  c.device(LAPTOP, sample("web", 1, "desktop"), { x: 330, y: 10, height: 440, variant: "silver", shadow: { distance: 40, softness: 90, opacity: 0.2, color: "#5b4632" } });
  c.device(PHONE, sample("penny", 2), { x: 500, y: 120, height: 400, shadow: { distance: 40, softness: 80, opacity: 0.3, color: "#3a2a1a" } });
  return c.build("product-hunt", true);
}

function beforeAfter(): SceneDocument {
  const c = new Composer(1600, 1000);
  c.background = {
    type: "linear-gradient",
    angle: 90,
    stops: [
      { at: 0, color: "#e9eaee" },
      { at: 0.5, color: "#dfe1e7" },
      { at: 0.5, color: "#5b4bff" },
      { at: 1, color: "#7c3aed" },
    ],
  };
  c.text("BEFORE", { top: 64, x: -400, align: "center", size: 18, family: "Inter", weight: 800, color: "#5f6470", letterSpacing: 0.18, highlight: { color: "#cfd2da", radius: 999, padX: 18, padY: 8 } });
  c.text("AFTER", { top: 64, x: 400, align: "center", size: 18, family: "Inter", weight: 800, color: "#5b4bff", letterSpacing: 0.18, highlight: { color: "#ffffff", radius: 999, padX: 18, padY: 8 } });
  c.device(PHONE, sample("penny", 5), { x: -400, y: -30, height: 720, variant: "natural-titanium", shadow: { opacity: 0.18 } });
  c.device(PHONE, sample("penny", 1), { x: 400, y: -30, height: 720, variant: "black-titanium", shadow: { opacity: 0.4, color: "#1e1157" } });
  c.arrow({ x: 0, y: -60, scale: 0.55, tint: "#ffffff", rotate: 8 });
  c.text("Same app. Whole new feel.", { top: 852, align: "center", size: 50, family: "Plus Jakarta Sans", weight: 800, color: "#ffffff", letterSpacing: -0.03, highlight: { color: "#12101f", radius: 999, padX: 40, padY: 18 } });
  return c.build("before-after", true);
}

function whatsNew(): SceneDocument {
  const c = new Composer(1080, 1350);
  c.background = radial(0.5, 0.3, ["#1e3a8a", "#0f1d4a", "#070d24"]);
  c.backdrop = { pattern: { kind: "grid", intensity: 0.06, thickness: 0.2, color: "#93c5fd" } };
  c.text("VERSION 2.0", { top: 96, align: "center", size: 18, family: "Inter", weight: 800, color: "#93c5fd", letterSpacing: 0.2, highlight: { color: "rgba(59,130,246,0.18)", radius: 999, padX: 18, padY: 9 } });
  c.text("What's new", { top: 150, align: "center", size: 108, family: "Plus Jakarta Sans", weight: 800, color: "#ffffff", letterSpacing: -0.045, width: 980 });
  c.device(PHONE, sample("hush", 4), { x: -200, y: 170, height: 860, rotate: -6, variant: "black-titanium", shadow: { opacity: 0.55, color: "#020617" } });
  const items: [string, string, string][] = [
    ["🌙", "Dark mode\neverywhere", "#4338ca"],
    ["🧩", "Widgets on your\nhome screen", "#0e7490"],
    ["⚡", "2× faster\nsync", "#b45309"],
  ];
  items.forEach(([icon, label, chip], i) => {
    const top = 520 + i * 200;
    c.text(icon, { top, left: 650, size: 40, family: "Inter", weight: 400, color: "#ffffff", chipWidth: 72, highlight: { color: chip, radius: 22, padX: 16, padY: 12 } });
    c.text(label, { top: top + 2, left: 760, width: 280, lines: 2, size: 30, family: "Plus Jakarta Sans", weight: 700, color: "#e2e8f0", lineHeight: 1.15 });
  });
  return c.build("whats-new", true);
}

function reelCover(): SceneDocument {
  const c = new Composer(1080, 1920);
  c.background = radial(0.3, 0.2, ["#3b82f6", "#1d4ed8", "#1e1b8f"]);
  c.backdrop = { pattern: { kind: "rays", intensity: 0.12, thickness: 0.4, color: "#ffffff" } };
  c.text("Stop\nscrolling.\nStart", { top: 120, left: 80, width: 920, size: 150, family: "Anton", weight: 400, color: "#ffffff", uppercase: true, lineHeight: 0.92, letterSpacing: 0 });
  c.text("building.", { top: 540, left: 80, size: 150, family: "Anton", weight: 400, color: "#0a0a0a", uppercase: true, lineHeight: 0.92, letterSpacing: 0, chipWidth: 640, highlight: { color: "#c6f432", radius: 6, padX: 18, padY: 0 } });
  c.text("Turn your screen time into something you're proud of.", { top: 742, left: 80, width: 640, lines: 2, size: 30, family: "Inter", weight: 600, color: "#dbeafe", lineHeight: 1.35, letterSpacing: -0.01 });
  c.device(PHONE, sample("stride", 1), { x: 140, y: 660, height: 1320, rotate: 8, shadow: { distance: 90, softness: 150, opacity: 0.5, color: "#0b0b3a" } });
  c.text("Download free", { top: 1740, x: -230, align: "center", size: 30, family: "Plus Jakarta Sans", weight: 800, color: "#1d4ed8", highlight: { color: "#ffffff", radius: 999, padX: 34, padY: 18 } });
  return c.build("reel-cover", true);
}

export const PREMIUM_TEMPLATES: PremiumTemplate[] = [
  { slug: "launch-hero", name: "Launch Hero", use: "Website hero · X / LinkedIn", blurb: "Big headline, store buttons and one tilted phone on a soft mesh.", width: 1600, height: 900, pro: false, cardBg: "linear-gradient(135deg,#efe9ff,#ffe8d6 55%,#fbe3f1)", build: launchHero },
  { slug: "feature-trio", name: "Feature Trio", use: "Landing page · slides", blurb: "Three phones, three captions — your best features at a glance.", width: 1920, height: 1080, pro: false, cardBg: "radial-gradient(circle at 50% 18%,#1f9d78,#0c6b5a 55%,#06403a)", build: featureTrio },
  { slug: "clay-studio", name: "Clay Studio", use: "Portfolio · case study", blurb: "Matte porcelain clay phones and an editorial serif — gallery-calm.", width: 1080, height: 1350, pro: true, cardBg: "radial-gradient(circle at 50% 35%,#f6efe5,#eadfcf 55%,#d9cab5)", build: clayStudio },
  { slug: "keynote-stage", name: "Keynote Stage", use: "Launch video · reveal", blurb: "A spotlit black stage and a gradient product name, keynote-style.", width: 1920, height: 1080, pro: true, cardBg: "radial-gradient(circle at 50% 0%,#26222e,#0b0a0f 55%,#000)", build: keynoteStage },
  { slug: "product-hunt", name: "Product Hunt Gallery", use: "Product Hunt · 1270 × 760", blurb: "Launch-day gallery image: laptop + phone, upvote badge, warm cream.", width: 1270, height: 760, pro: true, cardBg: "radial-gradient(circle,#e6d9c6 1.2px,transparent 1.4px) 0 0/18px 18px,#fbf6ef", build: productHunt },
  { slug: "before-after", name: "Before / After", use: "Redesign reveal · X", blurb: "A split comparison that sells the redesign in one glance.", width: 1600, height: 1000, pro: true, cardBg: "linear-gradient(90deg,#e9eaee 50%,#5b4bff 50%)", build: beforeAfter },
  { slug: "whats-new", name: "What's New", use: "Release notes · Instagram", blurb: "Version pill, tilted phone and three feature chips for every update.", width: 1080, height: 1350, pro: true, cardBg: "radial-gradient(circle at 50% 30%,#1e3a8a,#0f1d4a 55%,#070d24)", build: whatsNew },
  { slug: "reel-cover", name: "Reel Cover", use: "Reels · TikTok · Stories", blurb: "Loud stacked type and an oversized phone, built for 9:16 feeds.", width: 1080, height: 1920, pro: true, cardBg: "radial-gradient(circle at 30% 20%,#3b82f6,#1d4ed8 55%,#1e1b8f)", build: reelCover },
];

export function premiumTemplateBySlug(slug: string): PremiumTemplate | undefined {
  return PREMIUM_TEMPLATES.find((t) => t.slug === slug);
}

export const premiumPreviewUrl = (slug: string) => `/templates/premium/${slug}.webp`;
