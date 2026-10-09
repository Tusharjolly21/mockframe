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
  type ZoomShot,
} from "@framekit/scene";
import type { MotionPresetId } from "./motion";
import type { LiveBackground } from "./backgroundMotion";
import { zoomClipDuration } from "./cameraZoom";

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
  /**
   * Video templates open with their animation ready: a motion preset (Motion
   * tab) or camera zooms (Zoom tab), plus a live background. Stored on the
   * scene's timeline, so it survives drafts and share links.
   */
  video?: { tab: "motion" | "zoom"; live: LiveBackground };
  build: () => SceneDocument;
}

/** Prefixes for the timeline's free-form `presets` list. */
export const MOTION_PRESET_TAG = "motion:";
export const LIVE_BG_TAG = "live:";

/** The motion preset and live background a scene was set up with (templates), if any. */
export function sceneMotionSetup(scene: SceneDocument): { preset?: MotionPresetId; live?: LiveBackground } {
  const tags = scene.timeline?.presets ?? [];
  const preset = tags.find((t) => t.startsWith(MOTION_PRESET_TAG))?.slice(MOTION_PRESET_TAG.length) as MotionPresetId | undefined;
  const live = tags.find((t) => t.startsWith(LIVE_BG_TAG))?.slice(LIVE_BG_TAG.length) as LiveBackground | undefined;
  return { ...(preset ? { preset } : {}), ...(live ? { live } : {}) };
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

  /** A frameless screenshot (no device), sized by its on-canvas width. */
  frameless(assetId: string, o: { x?: number; y?: number; width: number; naturalWidth: number; radius?: number; tiltX?: number; tiltY?: number; rotate?: number; shadow?: Partial<Shadow> | null }): MockupLayer {
    const layer: MockupLayer = {
      type: "mockup",
      id: this.id("shot"),
      deviceId: null,
      screenshotStyle: "default",
      cornerRadius: o.radius ?? 20,
      media: { assetId, kind: "image", fit: "cover", offsetX: 0, offsetY: 0, scale: 1 },
      transform: {
        ...IDENTITY_TRANSFORM,
        x: Math.round(o.x ?? 0),
        y: Math.round(o.y ?? 0),
        scale: Math.round((o.width / o.naturalWidth) * 10000) / 10000,
        rotate: o.rotate ?? 0,
        tiltX: o.tiltX ?? 0,
        tiltY: o.tiltY ?? 0,
      },
      shadow: o.shadow === null ? null : { ...SHADOW, ...o.shadow },
    };
    this.layers.push(layer);
    return layer;
  }

  /** a straight arrow; rotate 180 points left */
  pointer(o: { x: number; y: number; scale: number; rotate?: number; tint: string }) {
    this.layers.push({
      type: "sticker",
      id: this.id("pointer"),
      stickerId: "annot-arrow-straight",
      tint: o.tint,
      transform: { ...IDENTITY_TRANSFORM, x: o.x, y: o.y, scale: o.scale, rotate: o.rotate ?? 0 },
    });
  }

  /** video templates: a motion preset and/or camera zooms, plus a live background */
  motion: { preset?: MotionPresetId; live?: LiveBackground; zooms?: Omit<ZoomShot, "id">[] } = {};

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
    const { preset, live, zooms } = this.motion;
    if (preset || live || zooms?.length) {
      const shots = (zooms ?? []).map((z) => ({ ...z, id: this.id("zoom") }));
      scene.timeline = {
        durationMs: zoomClipDuration(shots),
        fps: 30,
        tracks: [],
        presets: [...(preset ? [MOTION_PRESET_TAG + preset] : []), ...(live ? [LIVE_BG_TAG + live] : [])],
        ...(shots.length ? { zooms: shots } : {}),
      };
    }
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

/* ------------------------- the 2026 collection (Pro) ------------------------ */
/* Ten originals: six stills and four video templates that open with their
   motion ready. Each takes its look from the app it's dressed in — a sleep
   app at night, a fitness app as a Swiss poster, a finance app as a spec
   sheet — rather than one house style. */

/** focus point of a device for camera zooms, as fractions of the canvas */
const focus = (W: number, H: number, x: number, y: number) => ({ x: Math.round(((W / 2 + x) / W) * 1000) / 1000, y: Math.round(((H / 2 + y) / H) * 1000) / 1000 });

function lateShift(): SceneDocument {
  const c = new Composer(1080, 1350);
  // moonlight from the top right, slatted window light across the room
  c.background = radial(0.82, 0.12, ["#2a3a72", "#141e45", "#070b1d"]);
  c.backdrop = { overlay: { kind: "blinds", intensity: 0.3 } };
  c.text("Made for\nlate nights.", { top: 112, left: 84, width: 900, size: 118, family: "Newsreader", weight: 400, italic: true, color: "#f4ead7", lineHeight: 0.98, letterSpacing: -0.025 });
  c.text("Sleep sounds that fade out with you.", { top: 382, left: 88, width: 560, size: 32, family: "Newsreader", weight: 400, color: "#aeb6d6", lineHeight: 1.3, letterSpacing: -0.005 });
  c.device(PHONE, sample("hush", 2), { x: 190, y: 400, height: 1180, rotate: -8, tiltY: 8, variant: "black-titanium", shadow: { distance: 90, softness: 150, opacity: 0.6, color: "#02040c" } });
  c.text("Hush", { top: 1238, left: 88, width: 200, size: 34, family: "Newsreader", weight: 600, color: "#f4ead7", letterSpacing: -0.01 });
  return c.build("late-shift", true);
}

function signalPoster(): SceneDocument {
  const c = new Composer(1080, 1350);
  c.background = { type: "solid", color: "#e63b2e" };
  c.backdrop = { pattern: { kind: "grid", intensity: 0.07, thickness: 0.2, color: "#ffffff" } };
  c.text("Move\nmore.", { top: 64, left: 62, width: 980, size: 252, family: "Archivo Black", weight: 400, uppercase: true, color: "#ffffff", lineHeight: 0.86, letterSpacing: -0.035 });
  c.text("Stride turns every walk into progress you can see.", { top: 566, left: 68, width: 370, lines: 3, size: 30, family: "Schibsted Grotesk", weight: 500, color: "#ffe3de", lineHeight: 1.3, letterSpacing: -0.01 });
  c.device(PHONE, sample("stride", 1), { x: 200, y: 440, height: 1100, shadow: { distance: 60, softness: 110, opacity: 0.35, color: "#5a0d07" } });
  c.text("Free on iOS and Android", { top: 1236, left: 68, width: 420, size: 24, family: "Schibsted Grotesk", weight: 700, color: "#ffffff", letterSpacing: 0 });
  return c.build("signal-poster", true);
}

function glassSlab(): SceneDocument {
  const c = new Composer(1600, 900);
  c.background = { type: "mesh-gradient", seed: 7, colors: ["#0f3b3a", "#1c6d63", "#b9e6a1", "#0d2b45"] };
  c.backdrop = { pattern: { kind: "noise", intensity: 0.14, thickness: 0.4, color: "#ffffff" } };
  c.text("Calm software\nfor busy teams.", { top: 236, left: 96, width: 620, size: 72, family: "Syne", weight: 700, color: "#f1fff4", lineHeight: 1.02, letterSpacing: -0.03 });
  c.text("One quiet workspace for docs, tasks and decisions.", { top: 424, left: 98, width: 430, lines: 2, size: 22, family: "Geist", weight: 400, color: "#cfe9df", lineHeight: 1.45, letterSpacing: -0.005 });
  c.text("Start free", { top: 536, left: 98, size: 19, family: "Geist", weight: 600, color: "#0f3b3a", chipWidth: 150, letterSpacing: 0, highlight: { color: "#c7f0a8", radius: 999, padX: 26, padY: 14 } });
  c.frameless(sample("web", 1, "desktop"), { x: 370, y: 30, width: 780, naturalWidth: 2400, radius: 18, tiltY: -14, tiltX: 5, shadow: { distance: 70, softness: 140, opacity: 0.45, color: "#04191a" } });
  return c.build("glass-slab", true);
}

function twoTone(): SceneDocument {
  const c = new Composer(1920, 1080);
  c.background = {
    type: "linear-gradient",
    angle: 90,
    stops: [
      { at: 0, color: "#d7dfcc" },
      { at: 0.5, color: "#d7dfcc" },
      { at: 0.5, color: "#1d3a2f" },
      { at: 1, color: "#1d3a2f" },
    ],
  };
  c.text("Plan it.", { top: 112, x: -480, align: "center", width: 800, size: 132, family: "Fraunces", weight: 600, color: "#1d3a2f", letterSpacing: -0.03 });
  c.text("Do it.", { top: 112, x: 480, align: "center", width: 800, size: 132, family: "Fraunces", weight: 600, italic: true, color: "#d7dfcc", letterSpacing: -0.03 });
  c.device(PHONE, sample("habitat", 3), { x: -175, y: 235, height: 860, rotate: -4, tiltY: 18, shadow: { opacity: 0.32, color: "#0e1f18" } });
  c.device(PHONE, sample("habitat", 1), { x: 175, y: 205, height: 900, rotate: 4, tiltY: -18, shadow: { opacity: 0.5, color: "#050d0a" } });
  return c.build("two-tone", true);
}

function fieldNotes(): SceneDocument {
  const c = new Composer(1600, 900);
  c.background = radial(0.62, 0.5, ["#262a33", "#17191f", "#0e0f13"]);
  c.backdrop = { pattern: { kind: "grid", intensity: 0.06, thickness: 0.2, color: "#8b93a7" } };
  c.text("Every detail,\nconsidered.", { top: 282, left: 92, width: 540, size: 66, family: "Space Grotesk", weight: 700, color: "#f2f4f8", lineHeight: 1.04, letterSpacing: -0.03 });
  c.text("Penny keeps your money organised, private and ready offline.", { top: 450, left: 94, width: 420, lines: 2, size: 22, family: "Space Grotesk", weight: 400, color: "#9aa3b5", lineHeight: 1.45, letterSpacing: -0.005 });
  c.device(PHONE, sample("penny", 1), { x: 190, y: 20, height: 780, shadow: { distance: 50, softness: 120, opacity: 0.6, color: "#000000" } });
  // callouts to the right of the phone, each with a pointer back toward it
  const notes = ["Works offline", "Face ID lock", "Home-screen widgets"];
  notes.forEach((label, i) => {
    const top = 244 + i * 170;
    c.text(label, { top, left: 1268, size: 20, family: "Geist Mono", weight: 500, color: "#e7ecf5", chipWidth: 230, letterSpacing: 0, highlight: { color: "#2a2e38", radius: 8, padX: 14, padY: 9 } });
    c.pointer({ x: 1206 - 800, y: top + 19 - 450, scale: 0.34, rotate: 180, tint: "#8fb4ff" });
  });
  return c.build("field-notes", true);
}

function fanned(): SceneDocument {
  const c = new Composer(1080, 1920);
  // sunrise rising from the bottom edge
  c.background = radial(0.5, 1.0, ["#ffb36b", "#ff5e7e", "#5b21b6"]);
  c.text("Three screens.\nOne habit.", { top: 150, left: 80, width: 920, size: 92, family: "Unbounded", weight: 800, color: "#ffffff", lineHeight: 1.02, letterSpacing: -0.035 });
  c.text("Stride turns small steps into streaks.", { top: 372, left: 84, width: 860, size: 32, family: "Unbounded", weight: 400, color: "#ffe4ec", lineHeight: 1.3, letterSpacing: -0.01 });
  c.device(PHONE, sample("stride", 2), { x: -270, y: 270, height: 900, rotate: -14, shadow: { opacity: 0.4, color: "#3b0a3f" } });
  c.device(PHONE, sample("stride", 3), { x: 270, y: 270, height: 900, rotate: 14, shadow: { opacity: 0.4, color: "#3b0a3f" } });
  c.device(PHONE, sample("stride", 1), { x: 0, y: 210, height: 1000, shadow: { distance: 80, softness: 140, opacity: 0.5, color: "#2a0838" } });
  c.text("Try it free", { top: 1730, align: "center", size: 30, family: "Unbounded", weight: 600, color: "#5b21b6", letterSpacing: -0.01, highlight: { color: "#ffffff", radius: 999, padX: 40, padY: 22 } });
  return c.build("fanned", true);
}

/* --------------------------------- video ---------------------------------- */

function zoomTour(): SceneDocument {
  const c = new Composer(1920, 1080);
  c.background = radial(0.5, 0.0, ["#2b3445", "#151a24", "#0b0e14"]);
  c.backdrop = { overlay: { kind: "top-light", intensity: 0.3 } };
  c.text("Everywhere you work.", { top: 86, align: "center", width: 1400, size: 64, family: "Red Hat Display", weight: 700, color: "#f3f6fb", letterSpacing: -0.025 });
  c.device(LAPTOP, sample("web", 1, "desktop"), { x: -170, y: 120, height: 640, variant: "silver", shadow: { distance: 50, softness: 120, opacity: 0.5, color: "#000000" } });
  c.device(PHONE, sample("penny", 3), { x: 540, y: 180, height: 620, shadow: { distance: 50, softness: 110, opacity: 0.55, color: "#000000" } });
  const phone = focus(1920, 1080, 540, 160);
  const laptop = focus(1920, 1080, -170, 80);
  c.motion = {
    live: "drift",
    zooms: [
      { startMs: 600, holdMs: 1600, ...phone, zoom: 2.1, tilt: -6 },
      { startMs: 3700, holdMs: 1800, ...laptop, zoom: 1.7, tilt: 0 },
    ],
  };
  return c.build("zoom-tour", true);
}

function turntable(): SceneDocument {
  const c = new Composer(1080, 1080);
  c.background = radial(0.5, 0.48, ["#3d2152", "#1a0f26", "#09060e"]);
  c.backdrop = { overlay: { kind: "top-light", intensity: 0.3 } };
  c.text("Lumen", { top: 64, align: "center", width: 900, size: 60, family: "Bricolage Grotesque", weight: 800, color: "#f3e8ff", letterSpacing: -0.035 });
  c.text("Sleep better tonight.", { top: 140, align: "center", width: 900, size: 26, family: "Bricolage Grotesque", weight: 500, color: "#c4b5fd", letterSpacing: -0.01 });
  c.device(PHONE, sample("hush", 1), { x: 0, y: 90, height: 800, tiltX: 6, variant: "black-titanium", shadow: { distance: 60, softness: 140, opacity: 0.6, color: "#6d28d9" } });
  c.motion = { preset: "orbit", live: "hue" };
  return c.build("turntable", true);
}

function depthStory(): SceneDocument {
  const c = new Composer(1080, 1920);
  c.background = { type: "mesh-gradient", seed: 23, colors: ["#0f2f2a", "#1e5c4a", "#e2c48f", "#0b1f1c"] };
  c.backdrop = { pattern: { kind: "topography", intensity: 0.12, thickness: 0.3, color: "#ffffff" } };
  c.text("Go deeper.", { top: 168, align: "center", width: 1000, size: 164, family: "Instrument Serif", weight: 400, color: "#f6efe0", letterSpacing: -0.02 });
  c.text("Habitat turns tiny routines into a life you like.", { top: 372, align: "center", width: 760, lines: 2, size: 42, family: "Instrument Serif", weight: 400, italic: true, color: "#d9e6dc", lineHeight: 1.2, letterSpacing: -0.005 });
  c.device(PHONE, sample("habitat", 2), { x: 0, y: 290, height: 1180, shadow: { distance: 90, softness: 150, opacity: 0.55, color: "#03100d" } });
  c.motion = { preset: "parallax", live: "breathe" };
  return c.build("depth-story", true);
}

function featureTour(): SceneDocument {
  const c = new Composer(1920, 1080);
  c.background = { type: "solid", color: "#e7ebf0" };
  c.backdrop = { pattern: { kind: "crosses", intensity: 0.5, thickness: 0.05, color: "#b6bfcc" } };
  c.text("A quick tour", { top: 80, left: 100, width: 700, size: 54, family: "Geist", weight: 700, color: "#111827", letterSpacing: -0.035 });
  c.text("Three things Penny does better.", { top: 152, left: 102, width: 700, size: 24, family: "Geist", weight: 400, color: "#4b5563", letterSpacing: -0.01 });
  const xs = [-520, 0, 520];
  const screens = [1, 2, 4];
  xs.forEach((x, i) => c.device(PHONE, sample("penny", screens[i]), { x, y: 130, height: 760, shadow: { distance: 40, softness: 90, opacity: 0.22, color: "#334155" } }));
  c.motion = {
    live: "off",
    zooms: xs.map((x, i) => ({ startMs: 500 + i * 2900, holdMs: 1300, ...focus(1920, 1080, x, 100), zoom: 1.9, tilt: 0 })),
  };
  return c.build("feature-tour", true);
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
  // the 2026 collection
  { slug: "late-shift", name: "Late Shift", use: "Instagram · 4:5", blurb: "Moonlit navy, slatted window light and an italic serif for night-time apps.", width: 1080, height: 1350, pro: true, cardBg: "radial-gradient(circle at 82% 12%,#2a3a72,#141e45 55%,#070b1d)", build: lateShift },
  { slug: "signal-poster", name: "Signal Poster", use: "Instagram · posters", blurb: "Swiss-style signal red, a headline that fills the frame, one confident phone.", width: 1080, height: 1350, pro: true, cardBg: "#e63b2e", build: signalPoster },
  { slug: "glass-slab", name: "Glass Slab", use: "Website hero · 16:9", blurb: "A frameless web app floating in a deep-green mesh, with room for your pitch.", width: 1600, height: 900, pro: true, cardBg: "linear-gradient(135deg,#0f3b3a,#1c6d63 55%,#b9e6a1)", build: glassSlab },
  { slug: "two-tone", name: "Two Tone", use: "Slides · landing page", blurb: "A hard split down the middle and two phones turning toward each other.", width: 1920, height: 1080, pro: true, cardBg: "linear-gradient(90deg,#d7dfcc 50%,#1d3a2f 50%)", build: twoTone },
  { slug: "field-notes", name: "Field Notes", use: "X / LinkedIn · feature post", blurb: "A graphite spec sheet: your phone, three callouts and a calm headline.", width: 1600, height: 900, pro: true, cardBg: "radial-gradient(circle at 62% 50%,#262a33,#17191f 55%,#0e0f13)", build: fieldNotes },
  { slug: "fanned", name: "Fanned", use: "Stories · 9:16", blurb: "Three phones fanned out over a sunrise gradient, with a bold rounded headline.", width: 1080, height: 1920, pro: true, cardBg: "radial-gradient(circle at 50% 100%,#ffb36b,#ff5e7e 50%,#5b21b6)", build: fanned },
  { slug: "zoom-tour", name: "Zoom Tour", use: "Video · product demo", blurb: "Laptop and phone; the camera zooms into each in turn over a drifting backdrop.", width: 1920, height: 1080, pro: true, cardBg: "radial-gradient(circle at 50% 0%,#2b3445,#151a24 55%,#0b0e14)", video: { tab: "zoom", live: "drift" }, build: zoomTour },
  { slug: "turntable", name: "Turntable", use: "Video · square loop", blurb: "One phone turning slowly under a spotlight while the colours shift.", width: 1080, height: 1080, pro: true, cardBg: "radial-gradient(circle at 50% 48%,#3d2152,#1a0f26 55%,#09060e)", video: { tab: "motion", live: "hue" }, build: turntable },
  { slug: "depth-story", name: "Depth Story", use: "Video · Reels · 9:16", blurb: "Parallax depth: the phone sways while the contoured backdrop breathes behind it.", width: 1080, height: 1920, pro: true, cardBg: "linear-gradient(160deg,#0f2f2a,#1e5c4a 55%,#e2c48f)", video: { tab: "motion", live: "breathe" }, build: depthStory },
  { slug: "feature-tour", name: "Feature Tour", use: "Video · walkthrough", blurb: "Three screens in a row; the camera visits each one, left to right.", width: 1920, height: 1080, pro: true, cardBg: "#e7ebf0", video: { tab: "zoom", live: "off" }, build: featureTour },
];

export function premiumTemplateBySlug(slug: string): PremiumTemplate | undefined {
  return PREMIUM_TEMPLATES.find((t) => t.slug === slug);
}

export const premiumPreviewUrl = (slug: string) => `/templates/premium/${slug}.webp`;
