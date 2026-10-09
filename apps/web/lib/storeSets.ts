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
 * Store listing sets: eight ready-made App Store / Google Play screenshots per
 * set, designed together (one story, one palette, one type system) for a
 * sample app. Every shot is an ordinary scene, so a set opens in the editor as
 * an eight-shot batch the user restyles shot by shot, then swaps in their own
 * screens.
 *
 * Sizes are the ones the stores ask for: iPhone 6.9" (1320 × 2868) for the App
 * Store, and 1080 × 1920 (9:16) for Google Play phone screenshots. Layouts are
 * written once in canvas fractions and text units, then built for either.
 */

export type StorePlatform = "ios" | "android";

export interface StoreSet {
  slug: string;
  /** the sample app the screens show */
  app: string;
  name: string;
  /** what the app is, for the gallery */
  kind: string;
  blurb: string;
  /** CSS background for gallery cards */
  cardBg: string;
  /** gallery card ink */
  ink: string;
  shots: ShotSpec[];
}

interface ShotSpec {
  name: string;
  draw: (s: ShotBuilder) => void;
}

export const STORE_PLATFORMS: Record<StorePlatform, { label: string; store: string; width: number; height: number; deviceId: string }> = {
  ios: { label: "iPhone", store: "App Store", width: 1320, height: 2868, deviceId: "iphone-17-pro-max" },
  android: { label: "Android", store: "Google Play", width: 1080, height: 1920, deviceId: "pixel-10-pro" },
};

/** the sample screens' pixel size, and their CSS viewport (crops are written in iOS CSS px) */
const SCREEN_PX = { ios: { w: 1206, h: 2622, cssW: 402, cssH: 874, bar: 54 }, android: { w: 1277, h: 2852, cssW: 412, cssH: 920, bar: 36 } };

export const sampleScreenId = (app: string, platform: StorePlatform, n: number) =>
  `builtin:sample/${app}/${platform}-${String(n).padStart(2, "0")}`;

export const isSampleScreen = (assetId: string | undefined) => !!assetId && assetId.startsWith("builtin:sample/");

/* ------------------------------- the builder -------------------------------- */

type Crop = { x: number; y: number; w: number; h: number };

const FONT_WIDTH: Record<string, number> = {
  "Plus Jakarta Sans": 1.0,
  Manrope: 1.0,
  Outfit: 0.93,
  Sora: 1.1,
  Inter: 1.0,
  Unbounded: 1.28,
  "Space Grotesk": 1.02,
  "Instrument Serif": 0.8,
  Fraunces: 1.0,
  Geist: 0.98,
};

/** rough advance of a string in em, good enough to place wrapped headlines */
function emWidth(text: string, family: string, letterSpacing: number) {
  let w = 0;
  for (const ch of text) {
    if (ch === " ") w += 0.27;
    else if (/[iljtfr.,:;'’!|]/.test(ch)) w += 0.31;
    else if (/[mwMW]/.test(ch)) w += 0.84;
    else if (/[A-Z0-9€★]/.test(ch)) w += 0.66;
    else w += 0.55;
    w += letterSpacing;
  }
  return w * (FONT_WIDTH[family] ?? 1);
}

function lineCount(text: string, size: number, maxWidth: number | null, family: string, ls: number) {
  return text.split("\n").reduce((sum, para) => {
    if (!maxWidth) return sum + 1;
    let lines = 1;
    let line = 0;
    for (const word of para.split(" ")) {
      const ww = emWidth(word, family, ls) * size;
      const space = line ? emWidth(" ", family, ls) * size : 0;
      if (line && line + space + ww > maxWidth) {
        lines++;
        line = ww;
      } else line += space + ww;
    }
    return sum + lines;
  }, 0);
}

type TextOpts = {
  /** px from the top edge to the block's top; or `bottom` px from the bottom edge */
  top?: number;
  bottom?: number;
  size: number;
  family: string;
  weight?: number;
  color?: string;
  align?: "left" | "center" | "right";
  /** block width in px (defaults to the canvas minus margins) */
  width?: number;
  /** horizontal centre offset (px from canvas centre); left/right aligned blocks hug their margin when omitted */
  x?: number;
  lineHeight?: number;
  letterSpacing?: number;
  gradient?: TextLayer["gradient"];
  highlight?: TextLayer["highlight"];
  rotate?: number;
  /** a chip: one line, sized to its content */
  chip?: boolean;
};

type PhoneOpts = {
  /** top edge of the frame, px from the canvas top (may be negative to bleed off the top) */
  top: number;
  /** frame height in px */
  height: number;
  /** horizontal centre offset in px from the canvas centre */
  x?: number;
  rotate?: number;
  variant?: string;
  shadow?: Partial<Shadow> | null;
};

type CardOpts = {
  /** centre in px from the canvas centre */
  x: number;
  y: number;
  /** displayed width in px */
  width: number;
  rotate?: number;
  /** corner radius in canvas px */
  radius?: number;
  style?: MockupLayer["screenshotStyle"];
  shadow?: Partial<Shadow> | null;
};

const PHONE_SHADOW: Shadow = { mode: "adaptive", lightAngle: 90, distance: 60, softness: 110, opacity: 0.32, color: "#0b0b17" };
const CARD_SHADOW: Shadow = { mode: "spread", lightAngle: 90, distance: 34, softness: 70, opacity: 0.26, color: "#0b0b17" };

export class ShotBuilder {
  readonly W: number;
  readonly H: number;
  /** one text unit: 1 px on the 1320 px wide iPhone canvas */
  readonly u: number;
  /** side margin */
  readonly m: number;
  layers: Layer[] = [];
  background: Background = { type: "solid", color: "#ffffff" };
  backdrop?: Backdrop;
  panorama = false;
  private n = 0;

  constructor(
    readonly platform: StorePlatform,
    readonly app: string,
  ) {
    this.W = STORE_PLATFORMS[platform].width;
    this.H = STORE_PLATFORMS[platform].height;
    this.u = this.W / 1320;
    this.m = Math.round(96 * this.u);
  }

  /** pick a value per platform (iPhone canvases are taller: 2.17 vs 1.78) */
  pick<T>(ios: T, android: T): T {
    return this.platform === "ios" ? ios : android;
  }

  screen(n: number) {
    return sampleScreenId(this.app, this.platform, n);
  }

  private id(kind: string) {
    this.n += 1;
    return `${kind}-${this.n}-${createId().slice(0, 6)}`;
  }

  /** Adds a text block; returns its top and bottom edges in px from the canvas top. */
  text(content: string, o: TextOpts): { top: number; bottom: number } {
    const size = Math.round(o.size * this.u);
    const lh = o.lineHeight ?? 1.08;
    const ls = o.letterSpacing ?? -0.03;
    const align = o.align ?? "left";
    const width = o.chip ? null : Math.round(o.width ?? this.W - this.m * 2);
    const lines = o.chip ? 1 : lineCount(content, size, width, o.family, ls);
    const padY = o.highlight?.padY ?? 0;
    const h = lines * size * lh + padY * 2;
    const top = o.top ?? this.H - (o.bottom ?? 0) - h;
    const boxW = width ?? emWidth(content, o.family, ls) * size + (o.highlight?.padX ?? 0) * 2;
    const x =
      o.x ??
      (align === "left" ? -this.W / 2 + this.m + boxW / 2 : align === "right" ? this.W / 2 - this.m - boxW / 2 : 0);
    const layer: TextLayer = {
      type: "text",
      id: this.id("text"),
      content,
      font: { family: o.family, weight: o.weight ?? 700, size, lineHeight: lh, letterSpacing: ls },
      color: o.color ?? "#ffffff",
      align,
      maxWidth: width,
      transform: { ...IDENTITY_TRANSFORM, x: Math.round(x), y: Math.round(top + h / 2 - this.H / 2), rotate: o.rotate ?? 0 },
      ...(o.gradient ? { gradient: o.gradient } : {}),
      ...(o.highlight ? { highlight: o.highlight } : {}),
    };
    this.layers.push(layer);
    return { top, bottom: top + h };
  }

  /** A phone holding sample screen `n`. */
  phone(n: number, o: PhoneOpts): MockupLayer {
    const deviceId = STORE_PLATFORMS[this.platform].deviceId;
    const device = getDevice(deviceId);
    const frameH = device?.frame.height ?? 2964;
    const layer: MockupLayer = {
      type: "mockup",
      id: this.id("phone"),
      deviceId,
      frameVariant: o.variant,
      media: { assetId: this.screen(n), kind: "image", fit: "cover", offsetX: 0, offsetY: 0, scale: 1 },
      transform: {
        ...IDENTITY_TRANSFORM,
        x: Math.round(o.x ?? 0),
        y: Math.round(o.top + o.height / 2 - this.H / 2),
        scale: Math.round((o.height / frameH) * 10000) / 10000,
        rotate: o.rotate ?? 0,
      },
      shadow: o.shadow === null ? null : { ...PHONE_SHADOW, ...o.shadow },
    };
    this.layers.push(layer);
    return layer;
  }

  /**
   * A frameless piece of sample screen `n`, lifted out of the phone as a
   * floating card. `crop` is in iOS CSS px (402 × 874 viewport) and is
   * mapped onto the Android render, whose status bar is shorter.
   */
  card(n: number, crop: Crop, o: CardOpts): MockupLayer {
    const px = SCREEN_PX[this.platform];
    const ios = SCREEN_PX.ios;
    const sx = this.platform === "ios" ? 1 : px.cssW / ios.cssW;
    const dy = this.platform === "ios" ? 0 : px.bar - ios.bar;
    const c = {
      x: (crop.x * sx) / px.cssW,
      y: (crop.y + dy) / px.cssH,
      w: (crop.w * sx) / px.cssW,
      h: crop.h / px.cssH,
    };
    const naturalW = px.w * c.w;
    const layer: MockupLayer = {
      type: "mockup",
      id: this.id("card"),
      deviceId: null,
      screenshotStyle: o.style ?? "default",
      media: { assetId: this.screen(n), kind: "image", fit: "cover", offsetX: 0, offsetY: 0, scale: 1, crop: c },
      cornerRadius: Math.round(((o.radius ?? 44) * this.u * naturalW) / o.width),
      transform: {
        ...IDENTITY_TRANSFORM,
        x: Math.round(o.x),
        y: Math.round(o.y),
        scale: Math.round((o.width / naturalW) * 10000) / 10000,
        rotate: o.rotate ?? 0,
      },
      shadow: o.shadow === null ? null : { ...CARD_SHADOW, ...o.shadow },
    };
    this.layers.push(layer);
    return layer;
  }

  /** Height a card of `crop` gets at `width` px, for stacking. */
  cardHeight(crop: Crop, width: number) {
    return (crop.h / crop.w) * width;
  }

  build(): SceneDocument {
    const scene = createScene({
      width: this.W,
      height: this.H,
      background: this.background,
      ...(this.backdrop ? { backdrop: this.backdrop } : {}),
      ...(this.panorama ? { panoramaBackground: true } : {}),
    });
    scene.layers = this.layers;
    return scene;
  }
}

/* -------------------------------- the sets ---------------------------------- */

const lin = (angle: number, colors: string[]): Background => ({
  type: "linear-gradient",
  angle,
  stops: colors.map((color, i) => ({ at: i / (colors.length - 1), color })),
});
const radial = (cx: number, cy: number, colors: string[]): Background => ({
  type: "radial-gradient",
  cx,
  cy,
  stops: colors.map((color, i) => ({ at: i / (colors.length - 1), color })),
});

/* ---------- Stride: running. Hot coral, contour lines, big tilted phones ---------- */

const STRIDE_FONT = "Plus Jakarta Sans";

function strideBase(s: ShotBuilder, angle = 165) {
  s.background = lin(angle, ["#ff8f5a", "#ff5a5f", "#e8336d"]);
  s.backdrop = { pattern: { kind: "topography", intensity: 0.16, thickness: 0.35, color: "#ffffff" } };
}

function strideHead(s: ShotBuilder, text: string, top = 0) {
  return s.text(text, {
    top: top || s.pick(210, 150) * s.u,
    size: s.pick(124, 112),
    family: STRIDE_FONT,
    weight: 800,
    lineHeight: 1.02,
    letterSpacing: -0.035,
    width: s.W - s.m * 2,
  });
}

const STRIDE: StoreSet = {
  slug: "stride",
  app: "stride",
  name: "Stride",
  kind: "Running and fitness",
  blurb: "Hot coral, contour lines and big tilted phones with stats lifted out of the screen.",
  cardBg: "linear-gradient(165deg,#ff8f5a,#ff5a5f 50%,#e8336d)",
  ink: "#ffffff",
  shots: [
    {
      name: "Every run, tracked",
      draw: (s) => {
        strideBase(s);
        const chip = s.text("★★★★★  4.9 from 120k runners", {
          top: s.pick(200, 130) * s.u,
          size: 40,
          family: STRIDE_FONT,
          weight: 700,
          letterSpacing: 0,
          chip: true,
          color: "#ffffff",
          highlight: { color: "rgba(255,255,255,0.2)", radius: 999, padX: 30 * s.u, padY: 16 * s.u },
        });
        const head = strideHead(s, "Every run,\nbeautifully\ntracked.", chip.bottom + 44 * s.u);
        s.phone(1, { top: head.bottom + s.pick(120, 70) * s.u, height: s.H * s.pick(0.74, 0.8), x: s.W * 0.1, rotate: -7, variant: "natural-titanium" });
      },
    },
    {
      name: "Live stats",
      draw: (s) => {
        strideBase(s, 175);
        const head = strideHead(s, "Live pace,\ndistance and\nheart rate");
        const top = head.bottom + s.pick(110, 70) * s.u;
        // a big phone bleeding off the bottom; its stats sheet lifted out over the map
        s.phone(2, { top, height: s.H * s.pick(0.86, 0.92), x: s.W * 0.1, variant: "natural-titanium" });
        const crop = { x: 6, y: 548, w: 390, h: 200 };
        s.card(2, crop, { x: -s.W * 0.08, y: top + s.H * s.pick(0.3, 0.32) - s.H / 2, width: s.W * 0.78, rotate: -4, radius: 40 });
      },
    },
    {
      name: "Splits",
      draw: (s) => {
        strideBase(s, 155);
        const head = strideHead(s, "Splits that\ntell the whole\nstory");
        const top = head.bottom + s.pick(110, 70) * s.u;
        s.phone(3, { top, height: s.H * s.pick(0.74, 0.8), x: -s.W * 0.12, rotate: 6, variant: "natural-titanium" });
        const crop = { x: 20, y: 392, w: 362, h: 242 };
        s.card(3, crop, { x: s.W * 0.14, y: top + s.H * s.pick(0.36, 0.38) - s.H / 2, width: s.W * 0.72, rotate: 3, radius: 40 });
      },
    },
    {
      name: "Training plan",
      draw: (s) => {
        strideBase(s, 185);
        // phone hangs from the top, headline sits below it
        s.phone(4, { top: -s.H * 0.2, height: s.H * s.pick(0.78, 0.84), rotate: 0, variant: "natural-titanium" });
        s.text("A plan that gets\nyou to race day", {
          bottom: s.pick(230, 140) * s.u,
          size: s.pick(112, 100),
          family: STRIDE_FONT,
          weight: 800,
          lineHeight: 1.04,
          letterSpacing: -0.035,
          align: "center",
        });
      },
    },
    {
      name: "Heart rate zones",
      draw: (s) => {
        strideBase(s, 160);
        const head = strideHead(s, "Train in\nthe right zone");
        const top = head.bottom + s.pick(120, 80) * s.u;
        s.phone(5, { top, height: s.H * s.pick(0.72, 0.78), x: s.W * 0.16, rotate: -5, variant: "natural-titanium" });
        const crop = { x: 16, y: 433, w: 366, h: 248 };
        s.card(5, crop, { x: -s.W * 0.1, y: top + s.H * s.pick(0.38, 0.4) - s.H / 2, width: s.W * 0.72, rotate: -3, radius: 40 });
      },
    },
    {
      name: "Challenges",
      draw: (s) => {
        strideBase(s, 170);
        const head = strideHead(s, "Run together,\neven apart");
        const top = head.bottom + s.pick(110, 70) * s.u;
        // two phones, overlapping like a pair of runners
        s.phone(1, { top: top + s.H * 0.06, height: s.H * s.pick(0.64, 0.7), x: -s.W * 0.22, rotate: -8, variant: "natural-titanium", shadow: { opacity: 0.24 } });
        s.phone(6, { top, height: s.H * s.pick(0.7, 0.76), x: s.W * 0.17, rotate: 4, variant: "natural-titanium" });
      },
    },
    {
      name: "Achievements",
      draw: (s) => {
        strideBase(s, 150);
        const head = strideHead(s, "Collect every\nmilestone");
        const top = head.bottom + s.pick(120, 80) * s.u;
        s.phone(7, { top, height: s.H * s.pick(0.74, 0.8), variant: "natural-titanium" });
        const crop = { x: 24, y: 120, w: 354, h: 230 };
        s.card(7, crop, { x: s.W * 0.2, y: top + s.H * 0.11 - s.H / 2, width: s.W * 0.56, rotate: 6, radius: 40 });
      },
    },
    {
      name: "Recovery",
      draw: (s) => {
        strideBase(s, 180);
        const head = strideHead(s, "Know when to\npush, and when\nto rest");
        const top = head.bottom + s.pick(110, 70) * s.u;
        s.phone(8, { top, height: s.H * s.pick(0.74, 0.8), x: -s.W * 0.1, rotate: 5, variant: "natural-titanium" });
        s.text("Download Stride free", {
          bottom: s.pick(150, 90) * s.u,
          size: 46,
          family: STRIDE_FONT,
          weight: 700,
          letterSpacing: -0.01,
          chip: true,
          align: "right",
          color: "#e8336d",
          highlight: { color: "#ffffff", radius: 999, padX: 40 * s.u, padY: 22 * s.u },
        });
      },
    },
  ],
};

/* ---------- Penny: money. One teal panorama across all 8, a phone that spans 2 shots ---------- */

const PENNY_FONT = "Manrope";

function pennyBase(s: ShotBuilder) {
  // one long gradient read left to right across the whole set
  s.background = lin(100, ["#0b3b3f", "#0e7c6b", "#14b892", "#0e7c6b", "#0f2f3a", "#0b5a52", "#16c49c", "#0e6b62", "#0b2733"]);
  s.panorama = true;
}

function pennyHead(s: ShotBuilder, text: string, sub?: string) {
  const head = s.text(text, {
    top: s.pick(230, 150) * s.u,
    size: s.pick(112, 100),
    family: PENNY_FONT,
    weight: 800,
    align: "center",
    lineHeight: 1.05,
    letterSpacing: -0.035,
  });
  if (!sub) return head;
  return s.text(sub, {
    top: head.bottom + 34 * s.u,
    size: 46,
    family: PENNY_FONT,
    weight: 500,
    align: "center",
    lineHeight: 1.3,
    letterSpacing: -0.01,
    color: "#b8f5e2",
  });
}

const PENNY: StoreSet = {
  slug: "penny",
  app: "penny",
  name: "Penny",
  kind: "Personal finance",
  blurb: "One teal gradient flowing across all eight shots, with a phone that spans the second and third.",
  cardBg: "linear-gradient(100deg,#0b3b3f,#14b892 40%,#0f2f3a)",
  ink: "#ffffff",
  shots: [
    {
      name: "Money, calm",
      draw: (s) => {
        pennyBase(s);
        const head = pennyHead(s, "Money,\nfinally calm.", "Every account, budget and bill in one quiet place");
        s.phone(1, { top: head.bottom + s.pick(120, 70) * s.u, height: s.H * s.pick(0.72, 0.78), variant: "black-titanium" });
      },
    },
    {
      name: "Spending",
      draw: (s) => {
        pennyBase(s);
        const head = pennyHead(s, "See where\nevery euro goes");
        const top = head.bottom + s.pick(120, 70) * s.u;
        s.phone(2, { top, height: s.H * s.pick(0.7, 0.76), x: -s.W * 0.1, variant: "black-titanium" });
        // the card phone starts here and carries on into the next shot
        s.phone(3, { top: top + s.H * 0.05, height: s.H * s.pick(0.7, 0.76), x: s.W / 2, rotate: 0, variant: "black-titanium" });
      },
    },
    {
      name: "Your card",
      draw: (s) => {
        pennyBase(s);
        const head = pennyHead(s, "A card\nyou control");
        const top = head.bottom + s.pick(120, 70) * s.u;
        // the same phone, its other half (shot 2 places it at +W/2, top + 5%)
        const top2 = pennyHead2Top(s, "See where\nevery euro goes") + s.H * 0.05;
        s.phone(3, { top: top2, height: s.H * s.pick(0.7, 0.76), x: -s.W / 2, variant: "black-titanium" });
        const crop = { x: 16, y: 110, w: 370, h: 240 };
        s.card(3, crop, { x: s.W * 0.12, y: top + s.H * 0.32 - s.H / 2, width: s.W * 0.66, rotate: -4, radius: 48 });
      },
    },
    {
      name: "Budgets",
      draw: (s) => {
        pennyBase(s);
        const head = pennyHead(s, "Budgets that\nkeep you on track");
        s.phone(4, { top: head.bottom + s.pick(120, 70) * s.u, height: s.H * s.pick(0.72, 0.78), variant: "black-titanium" });
      },
    },
    {
      name: "Savings",
      draw: (s) => {
        pennyBase(s);
        const head = pennyHead(s, "Save for\nwhat matters");
        const top = head.bottom + s.pick(120, 70) * s.u;
        s.phone(5, { top, height: s.H * s.pick(0.72, 0.78), x: s.W * 0.14, rotate: 4, variant: "black-titanium" });
        const crop = { x: 16, y: 150, w: 370, h: 190 };
        s.card(5, crop, { x: -s.W * 0.12, y: top + s.H * 0.24 - s.H / 2, width: s.W * 0.64, rotate: -3, radius: 44 });
      },
    },
    {
      name: "Send money",
      draw: (s) => {
        pennyBase(s);
        const head = pennyHead(s, "Send money\nin seconds");
        s.phone(6, { top: head.bottom + s.pick(120, 70) * s.u, height: s.H * s.pick(0.72, 0.78), variant: "black-titanium" });
      },
    },
    {
      name: "Bills",
      draw: (s) => {
        pennyBase(s);
        const head = pennyHead(s, "Never miss\na bill");
        const top = head.bottom + s.pick(120, 70) * s.u;
        s.phone(7, { top, height: s.H * s.pick(0.72, 0.78), x: -s.W * 0.14, rotate: -4, variant: "black-titanium" });
        const crop = { x: 16, y: 200, w: 370, h: 150 };
        s.card(7, crop, { x: s.W * 0.13, y: top + s.H * 0.3 - s.H / 2, width: s.W * 0.64, rotate: 3, radius: 44 });
      },
    },
    {
      name: "Insights",
      draw: (s) => {
        pennyBase(s);
        const head = pennyHead(s, "Insights that\nactually help", "Get Penny free on your phone");
        s.phone(8, { top: head.bottom + s.pick(120, 70) * s.u, height: s.H * s.pick(0.72, 0.78), variant: "black-titanium" });
      },
    },
  ],
};

/** the top edge shot 2's phones are placed from, so shot 3 can continue them */
function pennyHead2Top(s: ShotBuilder, text: string) {
  const probe = new ShotBuilder(s.platform, s.app);
  const head = pennyHead(probe, text);
  return head.bottom + s.pick(120, 70) * s.u;
}

/* ---------- Hush: sleep. Night sky, soft type, captions under glass ---------- */

const HUSH_FONT = "Outfit";

function hushBase(s: ShotBuilder) {
  s.background = { type: "image", assetId: "builtin:set-night", fit: "cover", blur: 0, opacity: 1 };
}

function hushHead(s: ShotBuilder, text: string, o: { top?: number; bottom?: number } = {}) {
  return s.text(text, {
    ...o,
    ...(o.top === undefined && o.bottom === undefined ? { top: s.pick(230, 150) * s.u } : {}),
    size: s.pick(108, 98),
    family: HUSH_FONT,
    weight: 500,
    align: "center",
    lineHeight: 1.08,
    letterSpacing: -0.025,
    gradient: [
      { at: 0, color: "#ffffff" },
      { at: 1, color: "#d9ccff" },
    ],
  });
}

const HUSH: StoreSet = {
  slug: "hush",
  app: "hush",
  name: "Hush",
  kind: "Sleep and meditation",
  blurb: "A starry night sky, soft lavender type and a glass player card for a calm, dark listing.",
  cardBg: "radial-gradient(circle at 50% 0%,#3b3a8f,#141a3d 50%,#070a1c)",
  ink: "#ffffff",
  shots: [
    {
      name: "Sleep deeper",
      draw: (s) => {
        hushBase(s);
        const head = hushHead(s, "Sleep deeper,\nwake up lighter");
        s.phone(1, { top: head.bottom + s.pick(130, 80) * s.u, height: s.H * s.pick(0.72, 0.78), variant: "black-titanium", shadow: { color: "#000000", opacity: 0.5 } });
      },
    },
    {
      name: "Sleep stages",
      draw: (s) => {
        hushBase(s);
        // phone first, headline at the foot of the shot
        const bottom = s.pick(200, 120) * s.u;
        const head = hushHead(s, "See your night,\nstage by stage", { bottom });
        s.phone(2, { top: -s.H * 0.08, height: head.top - s.pick(110, 70) * s.u + s.H * 0.08, variant: "black-titanium", shadow: { color: "#000000", opacity: 0.5 } });
      },
    },
    {
      name: "Soundscapes",
      draw: (s) => {
        hushBase(s);
        const head = hushHead(s, "Fall asleep to rain,\nwaves or wind");
        const top = head.bottom + s.pick(130, 80) * s.u;
        s.phone(3, { top, height: s.H * s.pick(0.7, 0.76), x: -s.W * 0.12, rotate: -5, variant: "black-titanium", shadow: { color: "#000000", opacity: 0.5 } });
        // the first row of sound tiles, lifted out
        const crop = { x: 16, y: 284, w: 370, h: 142 };
        s.card(3, crop, { x: s.W * 0.13, y: top + s.H * 0.27 - s.H / 2, width: s.W * 0.74, rotate: 4, radius: 40, shadow: { color: "#000000", opacity: 0.5 } });
      },
    },
    {
      name: "Wind-downs",
      draw: (s) => {
        hushBase(s);
        const head = hushHead(s, "Wind-downs that\nquiet a busy mind");
        const top = head.bottom + s.pick(130, 80) * s.u;
        s.phone(4, { top, height: s.H * s.pick(0.72, 0.78), variant: "black-titanium", shadow: { color: "#000000", opacity: 0.5 } });
      },
    },
    {
      name: "Breathe",
      draw: (s) => {
        hushBase(s);
        const head = hushHead(s, "Breathe your\nway to calm");
        const top = head.bottom + s.pick(130, 80) * s.u;
        s.phone(5, { top, height: s.H * s.pick(0.72, 0.78), x: s.W * 0.1, rotate: 4, variant: "black-titanium", shadow: { color: "#000000", opacity: 0.5 } });
      },
    },
    {
      name: "Stories",
      draw: (s) => {
        hushBase(s);
        const head = hushHead(s, "Stories to\ndrift off to");
        const top = head.bottom + s.pick(130, 80) * s.u;
        s.phone(6, { top, height: s.H * s.pick(0.72, 0.78), x: -s.W * 0.1, rotate: -4, variant: "black-titanium", shadow: { color: "#000000", opacity: 0.5 } });
        // the featured story card
        const crop = { x: 18, y: 166, w: 366, h: 182 };
        s.card(6, crop, { x: s.W * 0.13, y: top + s.H * 0.33 - s.H / 2, width: s.W * 0.72, rotate: 3, radius: 44, shadow: { color: "#000000", opacity: 0.5 } });
      },
    },
    {
      name: "Smart alarm",
      draw: (s) => {
        hushBase(s);
        const bottom = s.pick(200, 120) * s.u;
        const head = hushHead(s, "Wake up gently,\nat the right moment", { bottom });
        s.phone(7, { top: -s.H * 0.08, height: head.top - s.pick(110, 70) * s.u + s.H * 0.08, variant: "black-titanium", shadow: { color: "#000000", opacity: 0.5 } });
      },
    },
    {
      name: "Bedtime habit",
      draw: (s) => {
        hushBase(s);
        const head = hushHead(s, "Build a bedtime\nyou keep");
        const top = head.bottom + s.pick(130, 80) * s.u;
        s.phone(8, { top, height: s.H * s.pick(0.72, 0.78), variant: "black-titanium", shadow: { color: "#000000", opacity: 0.5 } });
      },
    },
  ],
};

/* ---------- Habitat: habits. A new pastel every shot, chips, a dark finale ---------- */

const HABITAT_FONT = "Sora";
const HABITAT_INK = "#16161d";

function habitatBase(s: ShotBuilder, base: string, light: string) {
  s.background = radial(0.5, 0.18, [light, base]);
}

function habitatHead(s: ShotBuilder, chip: string, chipColor: string, text: string, ink = HABITAT_INK) {
  const c = s.text(chip, {
    top: s.pick(210, 130) * s.u,
    size: 38,
    family: HABITAT_FONT,
    weight: 600,
    letterSpacing: -0.01,
    chip: true,
    color: ink,
    highlight: { color: chipColor, radius: 999, padX: 30 * s.u, padY: 15 * s.u },
  });
  return s.text(text, {
    top: c.bottom + 40 * s.u,
    size: s.pick(104, 94),
    family: HABITAT_FONT,
    weight: 700,
    color: ink,
    lineHeight: 1.08,
    letterSpacing: -0.04,
  });
}

const HABITAT: StoreSet = {
  slug: "habitat",
  app: "habitat",
  name: "Habitat",
  kind: "Habit tracker",
  blurb: "A different pastel on every shot, friendly chips and a dark-mode finale.",
  cardBg: "linear-gradient(135deg,#d9f5e8,#ffe3d3 35%,#dceeff 70%,#ebe2ff)",
  ink: HABITAT_INK,
  shots: [
    {
      name: "Small habits",
      draw: (s) => {
        habitatBase(s, "#bfeedb", "#ecfbf4");
        const head = habitatHead(s, "Habit tracker", "#ffffff", "Small habits.\nBig change.");
        s.phone(1, { top: head.bottom + s.pick(120, 70) * s.u, height: s.H * s.pick(0.74, 0.8), x: s.W * 0.06, variant: "desert-titanium", shadow: { opacity: 0.18 } });
      },
    },
    {
      name: "Streaks",
      draw: (s) => {
        habitatBase(s, "#ffd5bf", "#fff1e8");
        const head = habitatHead(s, "32-day streak", "#ffffff", "Streaks that\nkeep you going");
        const top = head.bottom + s.pick(120, 70) * s.u;
        s.phone(2, { top, height: s.H * s.pick(0.72, 0.78), x: -s.W * 0.14, variant: "desert-titanium", shadow: { opacity: 0.18 } });
        const crop = { x: 16, y: 300, w: 370, h: 300 };
        s.card(2, crop, { x: s.W * 0.16, y: top + s.H * 0.34 - s.H / 2, width: s.W * 0.6, rotate: 3, radius: 44, shadow: { opacity: 0.16 } });
      },
    },
    {
      name: "New habit",
      draw: (s) => {
        habitatBase(s, "#c9e4ff", "#eef6ff");
        const head = habitatHead(s, "Takes 10 seconds", "#ffffff", "Build any habit\nin seconds");
        s.phone(3, { top: head.bottom + s.pick(120, 70) * s.u, height: s.H * s.pick(0.74, 0.8), x: s.W * 0.06, variant: "desert-titanium", shadow: { opacity: 0.18 } });
      },
    },
    {
      name: "Progress",
      draw: (s) => {
        habitatBase(s, "#ddd0ff", "#f4efff");
        const head = habitatHead(s, "87% this week", "#ffffff", "See your\nprogress add up");
        const top = head.bottom + s.pick(120, 70) * s.u;
        s.phone(4, { top, height: s.H * s.pick(0.72, 0.78), x: s.W * 0.14, variant: "desert-titanium", shadow: { opacity: 0.18 } });
        const crop = { x: 16, y: 130, w: 370, h: 230 };
        s.card(4, crop, { x: -s.W * 0.13, y: top + s.H * 0.24 - s.H / 2, width: s.W * 0.62, rotate: -3, radius: 44, shadow: { opacity: 0.16 } });
      },
    },
    {
      name: "Focus mode",
      draw: (s) => {
        habitatBase(s, "#ffe9a8", "#fff8de");
        const head = habitatHead(s, "Focus mode", "#ffffff", "Deep work,\none timer away");
        s.phone(5, { top: head.bottom + s.pick(120, 70) * s.u, height: s.H * s.pick(0.74, 0.8), x: s.W * 0.06, variant: "desert-titanium", shadow: { opacity: 0.18 } });
      },
    },
    {
      name: "Reminders",
      draw: (s) => {
        habitatBase(s, "#ffcfca", "#fff0ee");
        const head = habitatHead(s, "Quiet hours included", "#ffffff", "Reminders at\nthe right time");
        const top = head.bottom + s.pick(120, 70) * s.u;
        s.phone(6, { top, height: s.H * s.pick(0.72, 0.78), x: -s.W * 0.12, variant: "desert-titanium", shadow: { opacity: 0.18 } });
        const crop = { x: 16, y: 140, w: 370, h: 160 };
        s.card(6, crop, { x: s.W * 0.15, y: top + s.H * 0.2 - s.H / 2, width: s.W * 0.62, rotate: 3, radius: 44, shadow: { opacity: 0.16 } });
      },
    },
    {
      name: "Widgets",
      draw: (s) => {
        habitatBase(s, "#c4ecf0", "#effbfc");
        const head = habitatHead(s, "Home screen widgets", "#ffffff", "Your habits,\nat a glance");
        s.phone(7, { top: head.bottom + s.pick(120, 70) * s.u, height: s.H * s.pick(0.74, 0.8), x: s.W * 0.06, variant: "desert-titanium", shadow: { opacity: 0.18 } });
      },
    },
    {
      name: "Dark mode",
      draw: (s) => {
        habitatBase(s, "#121218", "#2a2a38");
        const head = habitatHead(s, "Dark mode", "#2f2f3d", "Easy on the\neyes at night", "#ffffff");
        s.phone(8, { top: head.bottom + s.pick(120, 70) * s.u, height: s.H * s.pick(0.74, 0.8), x: s.W * 0.06, variant: "black-titanium", shadow: { color: "#000000", opacity: 0.5 } });
      },
    },
  ],
};


/* ------------------------- shared staging for the newer sets ------------------------- */

type Lift = { x: number; y: number; w: number; h: number };

/**
 * The phone + lifted card staging: the phone sits under the headline on one
 * side, a piece of its own screen floats out over the other side at `at`
 * (fraction of the canvas height from the phone's top edge).
 */
function phoneAndCard(
  s: ShotBuilder,
  n: number,
  crop: Lift,
  top: number,
  o: { side?: 1 | -1; at?: number; width?: number; rotate?: number; phoneRotate?: number; variant: string; shadow?: Partial<Shadow>; radius?: number; height?: number },
) {
  const side = o.side ?? 1;
  s.phone(n, { top, height: o.height ?? s.H * s.pick(0.72, 0.78), x: side * s.W * 0.13, rotate: o.phoneRotate ?? side * 4, variant: o.variant, shadow: o.shadow });
  const width = o.width ?? s.W * 0.72;
  s.card(n, crop, { x: -side * s.W * 0.11, y: top + s.H * (o.at ?? 0.3) - s.H / 2, width, rotate: o.rotate ?? -side * 3, radius: o.radius ?? 44, shadow: o.shadow });
}

/* ---------- Tempo: music. Black stage, a new album glow every shot, a lime finale ---------- */

const TEMPO_FONT = "Unbounded";
const TEMPO_LIME = "#c6ff3d";
const TEMPO_SHADOW = { color: "#000000", opacity: 0.6 };

function tempoBase(s: ShotBuilder, glow: string, glow2: string, cy = 0.62) {
  s.background = radial(0.5, cy, [glow, glow2, "#0b0b10", "#060609"]);
  s.backdrop = { pattern: { kind: "noise", intensity: 0.1, thickness: 0.3, color: "#ffffff" } };
}

function tempoHead(s: ShotBuilder, text: string, o: { top?: number; bottom?: number; color?: string } = {}) {
  return s.text(text, {
    ...(o.bottom !== undefined ? { bottom: o.bottom } : { top: o.top ?? s.pick(220, 140) * s.u }),
    size: s.pick(96, 86),
    family: TEMPO_FONT,
    weight: 700,
    color: o.color ?? "#ffffff",
    lineHeight: 1.06,
    letterSpacing: -0.045,
  });
}

function tempoChip(s: ShotBuilder, text: string, top: number, dark = false) {
  return s.text(text, {
    top,
    size: 38,
    family: "Space Grotesk",
    weight: 600,
    letterSpacing: -0.01,
    chip: true,
    color: dark ? TEMPO_LIME : "#0b0e02",
    highlight: { color: dark ? "#0b0e02" : TEMPO_LIME, radius: 999, padX: 28 * s.u, padY: 14 * s.u },
  });
}

const TEMPO: StoreSet = {
  slug: "tempo",
  app: "tempo",
  name: "Tempo",
  kind: "Music streaming",
  blurb: "A black stage lit by each album's colours, wide type, lime chips and a lime finale.",
  cardBg: "radial-gradient(circle at 50% 70%,#3fd0c9,#0d5a70 30%,#0b0b10 70%)",
  ink: "#ffffff",
  shots: [
    {
      name: "Music for every moment",
      draw: (s) => {
        tempoBase(s, "#3fd0c9", "#0d5a70");
        const chip = tempoChip(s, "100 million songs", s.pick(220, 140) * s.u);
        const head = tempoHead(s, "Music for\nevery\nmoment", { top: chip.bottom + 44 * s.u });
        const top = head.bottom + s.pick(110, 60) * s.u;
        phoneAndCard(s, 1, { x: 18, y: 402, w: 366, h: 215 }, top, { variant: "black-titanium", shadow: TEMPO_SHADOW, at: 0.27 });
      },
    },
    {
      name: "Now playing",
      draw: (s) => {
        tempoBase(s, "#ff8fb1", "#5a2380", 0.55);
        const head = tempoHead(s, "Play it\nloud");
        s.phone(2, { top: head.bottom + s.pick(110, 60) * s.u, height: s.H * s.pick(0.78, 0.84), x: -s.W * 0.06, rotate: -6, variant: "black-titanium", shadow: TEMPO_SHADOW });
      },
    },
    {
      name: "Lyrics",
      draw: (s) => {
        tempoBase(s, "#3fd0c9", "#0d5a70", 0.7);
        const head = tempoHead(s, "Sing every\nword");
        const top = head.bottom + s.pick(120, 70) * s.u;
        s.phone(3, { top, height: s.H * s.pick(0.74, 0.8), variant: "black-titanium", shadow: TEMPO_SHADOW });
        // the line being sung, lifted right across the shot
        s.card(3, { x: 12, y: 342, w: 378, h: 138 }, { x: 0, y: top + s.H * 0.33 - s.H / 2, width: s.W * 0.92, rotate: -3, radius: 48, shadow: TEMPO_SHADOW });
      },
    },
    {
      name: "Library",
      draw: (s) => {
        tempoBase(s, "#7a2cff", "#2a1260");
        const head = tempoHead(s, "Everything\nyou love,\none tap away");
        phoneAndCard(s, 4, { x: 18, y: 202, w: 366, h: 94 }, head.bottom + s.pick(110, 60) * s.u, { side: -1, variant: "black-titanium", shadow: TEMPO_SHADOW, at: 0.17, width: s.W * 0.8 });
      },
    },
    {
      name: "Discover",
      draw: (s) => {
        tempoBase(s, "#ff6a4e", "#5a1a10");
        const head = tempoHead(s, "Find your\nnext favourite");
        phoneAndCard(s, 5, { x: 207, y: 319, w: 177, h: 104 }, head.bottom + s.pick(110, 60) * s.u, { variant: "black-titanium", shadow: TEMPO_SHADOW, at: 0.24, width: s.W * 0.5, rotate: -8, radius: 36 });
      },
    },
    {
      name: "Playlists",
      draw: (s) => {
        tempoBase(s, "#ff4fa3", "#3a1060", 0.3);
        const bottom = s.pick(210, 130) * s.u;
        const head = tempoHead(s, "Playlists for\nevery mood", { bottom });
        s.phone(6, { top: -s.H * 0.12, height: head.top - s.pick(110, 70) * s.u + s.H * 0.12, variant: "black-titanium", shadow: TEMPO_SHADOW });
      },
    },
    {
      name: "Live radio",
      draw: (s) => {
        tempoBase(s, "#ffc76e", "#a3361f");
        const chip = tempoChip(s, "Live now", s.pick(220, 140) * s.u);
        const head = tempoHead(s, "Radio,\nhosted by\nhumans", { top: chip.bottom + 44 * s.u });
        phoneAndCard(s, 7, { x: 18, y: 112, w: 366, h: 328 }, head.bottom + s.pick(110, 60) * s.u, { side: -1, variant: "black-titanium", shadow: TEMPO_SHADOW, at: 0.2, width: s.W * 0.66 });
      },
    },
    {
      name: "Your year",
      draw: (s) => {
        s.background = radial(0.5, 0.2, ["#e4ff8c", TEMPO_LIME, "#9ad11a"]);
        const head = tempoHead(s, "Your year,\nin music", { color: "#0b0e02" });
        phoneAndCard(s, 8, { x: 18, y: 125, w: 366, h: 226 }, head.bottom + s.pick(110, 60) * s.u, { variant: "black-titanium", shadow: { color: "#1c2a00", opacity: 0.45 }, at: 0.2 });
      },
    },
  ],
};

/* ---------- Parla: Italian. A bright new colour every shot, chunky type, white chips ---------- */

const PARLA_FONT = "Outfit";
const PARLA_INK = "#2b1a5e";

function parlaHead(s: ShotBuilder, bg: [string, string], chip: string, text: string, ink = "#ffffff") {
  s.background = radial(0.5, 0.2, bg);
  s.backdrop = { pattern: { kind: "dots", intensity: 0.14, thickness: 0.3, color: ink === "#ffffff" ? "#ffffff" : PARLA_INK } };
  const c = s.text(chip, {
    top: s.pick(210, 130) * s.u,
    size: 40,
    family: PARLA_FONT,
    weight: 700,
    letterSpacing: -0.01,
    chip: true,
    color: PARLA_INK,
    highlight: { color: "#ffffff", radius: 999, padX: 30 * s.u, padY: 15 * s.u },
  });
  return s.text(text, {
    top: c.bottom + 40 * s.u,
    size: s.pick(118, 104),
    family: PARLA_FONT,
    weight: 800,
    color: ink,
    lineHeight: 1.0,
    letterSpacing: -0.035,
  });
}

const PARLA_SHADOW = { color: PARLA_INK, opacity: 0.28 };

const PARLA: StoreSet = {
  slug: "parla",
  app: "parla",
  name: "Parla",
  kind: "Language learning",
  blurb: "Tomato, sunflower, sky and basil: a bright colour per shot, chunky type and lessons lifted out.",
  cardBg: "linear-gradient(135deg,#ff4d3d,#ffc531 50%,#4aa8ff)",
  ink: "#ffffff",
  shots: [
    {
      name: "Speak Italian",
      draw: (s) => {
        const head = parlaHead(s, ["#ff7a5c", "#ff4d3d"], "5 minutes a day", "Speak Italian.\nFor real.");
        phoneAndCard(s, 1, { x: 20, y: 506, w: 362, h: 202 }, head.bottom + s.pick(110, 60) * s.u, { variant: "natural-titanium", shadow: PARLA_SHADOW, at: 0.36 });
      },
    },
    {
      name: "Bite-size lessons",
      draw: (s) => {
        const head = parlaHead(s, ["#ffd96b", "#ffc531"], "One sentence at a time", "Bite-size\nlessons", PARLA_INK);
        phoneAndCard(s, 2, { x: 20, y: 315, w: 362, h: 192 }, head.bottom + s.pick(110, 60) * s.u, { side: -1, variant: "natural-titanium", shadow: PARLA_SHADOW, at: 0.24 });
      },
    },
    {
      name: "Speaking",
      draw: (s) => {
        const head = parlaHead(s, ["#7cc0ff", "#4aa8ff"], "Pronunciation score", "Say it out loud,\nget it right");
        phoneAndCard(s, 3, { x: 20, y: 394, w: 362, h: 231 }, head.bottom + s.pick(110, 60) * s.u, { variant: "natural-titanium", shadow: PARLA_SHADOW, at: 0.3 });
      },
    },
    {
      name: "Flashcards",
      draw: (s) => {
        const head = parlaHead(s, ["#4fd08f", "#20b26b"], "Spaced repetition", "Words that\nactually stick");
        phoneAndCard(s, 4, { x: 20, y: 192, w: 362, h: 474 }, head.bottom + s.pick(110, 60) * s.u, { side: -1, variant: "natural-titanium", shadow: PARLA_SHADOW, at: 0.27, width: s.W * 0.56, rotate: 5 });
      },
    },
    {
      name: "Streaks",
      draw: (s) => {
        const head = parlaHead(s, ["#4a2f96", PARLA_INK], "46 days and counting", "Keep your\nstreak alive");
        phoneAndCard(s, 5, { x: 20, y: 291, w: 362, h: 385 }, head.bottom + s.pick(110, 60) * s.u, { variant: "natural-titanium", shadow: { color: "#000000", opacity: 0.45 }, at: 0.22, width: s.W * 0.66 });
      },
    },
    {
      name: "Leagues",
      draw: (s) => {
        const head = parlaHead(s, ["#ff7a5c", "#ff4d3d"], "Gold league", "Climb the\nweekly league");
        phoneAndCard(s, 6, { x: 20, y: 323, w: 362, h: 62 }, head.bottom + s.pick(110, 60) * s.u, { side: -1, variant: "natural-titanium", shadow: PARLA_SHADOW, at: 0.22, width: s.W * 0.86, rotate: -2, radius: 36 });
      },
    },
    {
      name: "AI tutor",
      draw: (s) => {
        const head = parlaHead(s, ["#7cc0ff", "#4aa8ff"], "Your AI tutor", "Practise real\nconversations");
        phoneAndCard(s, 7, { x: 63, y: 473, w: 319, h: 117 }, head.bottom + s.pick(110, 60) * s.u, { variant: "natural-titanium", shadow: PARLA_SHADOW, at: 0.36, width: s.W * 0.7 });
      },
    },
    {
      name: "Progress",
      draw: (s) => {
        const head = parlaHead(s, ["#ffd96b", "#ffc531"], "A2 to B1", "Watch yourself\nget fluent", PARLA_INK);
        phoneAndCard(s, 8, { x: 20, y: 114, w: 362, h: 214 }, head.bottom + s.pick(110, 60) * s.u, { side: -1, variant: "natural-titanium", shadow: PARLA_SHADOW, at: 0.1 });
      },
    },
  ],
};

/* ---------- Vault: investing. Green-black, champagne serif, charts lifted out ---------- */

const VAULT_FONT = "Instrument Serif";
const VAULT_SHADOW = { color: "#000000", opacity: 0.55 };
const VAULT_GOLD = [
  { at: 0, color: "#f6ead0" },
  { at: 1, color: "#d9bd84" },
];

function vaultBase(s: ShotBuilder, cy = 0.12) {
  s.background = radial(0.5, cy, ["#1f4234", "#0d1a15", "#050907"]);
  s.backdrop = { pattern: { kind: "grid", intensity: 0.07, thickness: 0.2, color: "#e8d3a2" } };
}

function vaultHead(s: ShotBuilder, text: string, o: { top?: number; bottom?: number } = {}) {
  return s.text(text, {
    ...(o.bottom !== undefined ? { bottom: o.bottom } : { top: o.top ?? s.pick(220, 140) * s.u }),
    size: s.pick(136, 120),
    family: VAULT_FONT,
    weight: 400,
    align: "center",
    lineHeight: 1.0,
    letterSpacing: -0.02,
    gradient: VAULT_GOLD,
  });
}

const VAULT: StoreSet = {
  slug: "vault",
  app: "vault",
  name: "Vault",
  kind: "Investing",
  blurb: "Green-black and champagne, a big serif and live charts lifted out of the screen.",
  cardBg: "radial-gradient(circle at 50% 10%,#1f4234,#0d1a15 55%,#050907)",
  ink: "#f6ead0",
  shots: [
    {
      name: "Quiet confidence",
      draw: (s) => {
        vaultBase(s);
        const head = vaultHead(s, "Invest with\nquiet confidence");
        phoneAndCard(s, 1, { x: 20, y: 247, w: 362, h: 244 }, head.bottom + s.pick(120, 70) * s.u, { variant: "black-titanium", shadow: VAULT_SHADOW, at: 0.16 });
      },
    },
    {
      name: "Every number",
      draw: (s) => {
        vaultBase(s);
        const head = vaultHead(s, "Every number,\nin plain sight");
        phoneAndCard(s, 2, { x: 20, y: 434, w: 362, h: 210 }, head.bottom + s.pick(120, 70) * s.u, { side: -1, variant: "black-titanium", shadow: VAULT_SHADOW, at: 0.32 });
      },
    },
    {
      name: "Buy in a swipe",
      draw: (s) => {
        vaultBase(s);
        const head = vaultHead(s, "Buy in\none swipe");
        s.phone(3, { top: head.bottom + s.pick(120, 70) * s.u, height: s.H * s.pick(0.74, 0.8), variant: "black-titanium", shadow: VAULT_SHADOW });
      },
    },
    {
      name: "Movers",
      draw: (s) => {
        vaultBase(s);
        const head = vaultHead(s, "Catch the movers\nas they move");
        phoneAndCard(s, 4, { x: 20, y: 302, w: 362, h: 220 }, head.bottom + s.pick(120, 70) * s.u, { variant: "black-titanium", shadow: VAULT_SHADOW, at: 0.22 });
      },
    },
    {
      name: "Diversification",
      draw: (s) => {
        vaultBase(s);
        const head = vaultHead(s, "Know how\nbalanced you are");
        phoneAndCard(s, 5, { x: 20, y: 236, w: 362, h: 252 }, head.bottom + s.pick(120, 70) * s.u, { side: -1, variant: "black-titanium", shadow: VAULT_SHADOW, at: 0.16 });
      },
    },
    {
      name: "Dividends",
      draw: (s) => {
        vaultBase(s, 0.85);
        const bottom = s.pick(210, 130) * s.u;
        const head = vaultHead(s, "Watch your\ndividends grow", { bottom });
        const h = head.top - s.pick(110, 70) * s.u + s.H * 0.12;
        s.phone(6, { top: -s.H * 0.12, height: h, x: s.W * 0.12, variant: "black-titanium", shadow: VAULT_SHADOW });
        s.card(6, { x: 20, y: 118, w: 362, h: 226 }, { x: -s.W * 0.1, y: s.H * 0.02, width: s.W * 0.7, rotate: -3, radius: 44, shadow: VAULT_SHADOW });
      },
    },
    {
      name: "News",
      draw: (s) => {
        vaultBase(s);
        const head = vaultHead(s, "News that\nmoves markets");
        phoneAndCard(s, 7, { x: 20, y: 164, w: 362, h: 294 }, head.bottom + s.pick(120, 70) * s.u, { variant: "black-titanium", shadow: VAULT_SHADOW, at: 0.12, width: s.W * 0.66 });
      },
    },
    {
      name: "Crypto",
      draw: (s) => {
        vaultBase(s);
        const head = vaultHead(s, "Crypto, bought\nslow and kept cold");
        phoneAndCard(s, 8, { x: 20, y: 521, w: 362, h: 186 }, head.bottom + s.pick(120, 70) * s.u, { side: -1, variant: "black-titanium", shadow: VAULT_SHADOW, at: 0.36 });
      },
    },
  ],
};

/* ---------- Orbit: tasks. One indigo panorama with orbit rings, a phone across shots 1 and 2 ---------- */

const ORBIT_FONT = "Geist";
const ORBIT_SHADOW = { color: "#0c0a3a", opacity: 0.45 };

function orbitBase(s: ShotBuilder) {
  s.background = lin(100, ["#17153f", "#2a2577", "#4f46e5", "#3b34b8", "#221e63", "#4338ca", "#6d5cf0", "#3730a3", "#17153f"]);
  s.backdrop = { pattern: { kind: "circles", intensity: 0.12, thickness: 0.22, color: "#c7d2fe" } };
  s.panorama = true;
}

function orbitHead(s: ShotBuilder, text: string) {
  return s.text(text, {
    top: s.pick(220, 140) * s.u,
    size: s.pick(108, 96),
    family: ORBIT_FONT,
    weight: 700,
    lineHeight: 1.04,
    letterSpacing: -0.045,
  });
}

/** where shot 1 puts the phone it shares with shot 2 */
function orbitSharedTop(s: ShotBuilder) {
  const probe = new ShotBuilder(s.platform, s.app);
  return orbitHead(probe, "Plan your day\nin one place").bottom + s.pick(140, 80) * s.u;
}

const ORBIT: StoreSet = {
  slug: "orbit",
  app: "orbit",
  name: "Orbit",
  kind: "Tasks and planning",
  blurb: "One indigo panorama with orbit rings across all eight, and a calendar phone that spans the first two.",
  cardBg: "linear-gradient(100deg,#17153f,#4f46e5 45%,#221e63)",
  ink: "#ffffff",
  shots: [
    {
      name: "Plan your day",
      draw: (s) => {
        orbitBase(s);
        orbitHead(s, "Plan your day\nin one place");
        const top = orbitSharedTop(s);
        s.phone(1, { top, height: s.H * s.pick(0.72, 0.78), x: -s.W * 0.08, variant: "black-titanium", shadow: ORBIT_SHADOW });
        // the week view starts here and carries on into shot 2
        s.phone(2, { top: top + s.H * 0.06, height: s.H * s.pick(0.72, 0.78), x: s.W * 0.56, rotate: 0, variant: "black-titanium", shadow: ORBIT_SHADOW });
        s.card(1, { x: 18, y: 205, w: 366, h: 167 }, { x: -s.W * 0.02, y: top + s.H * 0.2 - s.H / 2, width: s.W * 0.78, rotate: -3, radius: 48, shadow: ORBIT_SHADOW });
      },
    },
    {
      name: "Your week",
      draw: (s) => {
        orbitBase(s);
        orbitHead(s, "Your week,\nat a glance");
        const top = orbitSharedTop(s) + s.H * 0.06;
        s.phone(2, { top, height: s.H * s.pick(0.72, 0.78), x: -s.W * 0.44, variant: "black-titanium", shadow: ORBIT_SHADOW });
        // today's column, lifted out tall
        s.card(2, { x: 184, y: 261, w: 66, h: 525 }, { x: s.W * 0.1, y: top + s.H * 0.36 - s.H / 2, width: s.W * 0.22, rotate: 4, radius: 30, shadow: ORBIT_SHADOW });
      },
    },
    {
      name: "Projects",
      draw: (s) => {
        orbitBase(s);
        const head = orbitHead(s, "Projects that\nship on time");
        phoneAndCard(s, 3, { x: 200, y: 309, w: 172, h: 248 }, head.bottom + s.pick(140, 80) * s.u, { side: -1, variant: "black-titanium", shadow: ORBIT_SHADOW, at: 0.26, width: s.W * 0.46, rotate: 5, radius: 40 });
      },
    },
    {
      name: "Focus",
      draw: (s) => {
        orbitBase(s);
        const head = orbitHead(s, "Focus mode,\nbuilt in");
        phoneAndCard(s, 4, { x: 18, y: 547, w: 366, h: 149 }, head.bottom + s.pick(140, 80) * s.u, { variant: "black-titanium", shadow: ORBIT_SHADOW, at: 0.46 });
      },
    },
    {
      name: "Task details",
      draw: (s) => {
        orbitBase(s);
        const head = orbitHead(s, "Every detail,\nin one task");
        phoneAndCard(s, 5, { x: 18, y: 287, w: 366, h: 288 }, head.bottom + s.pick(140, 80) * s.u, { side: -1, variant: "black-titanium", shadow: ORBIT_SHADOW, at: 0.3, width: s.W * 0.68 });
      },
    },
    {
      name: "Quick add",
      draw: (s) => {
        orbitBase(s);
        const head = orbitHead(s, "Type it.\nOrbit sorts it.");
        phoneAndCard(s, 6, { x: 18, y: 116, w: 366, h: 206 }, head.bottom + s.pick(140, 80) * s.u, { variant: "black-titanium", shadow: ORBIT_SHADOW, at: 0.12, width: s.W * 0.8 });
      },
    },
    {
      name: "Stats",
      draw: (s) => {
        orbitBase(s);
        const head = orbitHead(s, "See what you\nget done");
        const top = head.bottom + s.pick(140, 80) * s.u;
        phoneAndCard(s, 7, { x: 18, y: 162, w: 366, h: 324 }, top, { side: -1, variant: "black-titanium", shadow: ORBIT_SHADOW, at: 0.22, width: s.W * 0.66 });
        s.card(7, { x: 18, y: 496, w: 178, h: 103 }, { x: -s.W * 0.2, y: top + s.H * 0.44 - s.H / 2, width: s.W * 0.4, rotate: 4, radius: 36, shadow: ORBIT_SHADOW });
      },
    },
    {
      name: "Widgets",
      draw: (s) => {
        orbitBase(s);
        const head = orbitHead(s, "Your day, on\nyour home screen");
        const top = head.bottom + s.pick(140, 80) * s.u;
        phoneAndCard(s, 8, { x: 24, y: 64, w: 354, h: 338 }, top, { variant: "black-titanium", shadow: ORBIT_SHADOW, at: 0.18, width: s.W * 0.6 });
        s.card(8, { x: 24, y: 435, w: 162, h: 162 }, { x: -s.W * 0.26, y: top + s.H * 0.42 - s.H / 2, width: s.W * 0.34, rotate: -6, radius: 44, shadow: ORBIT_SHADOW });
      },
    },
  ],
};

/* ---------- Atlas: travel. Editorial serif on paper, navy and orange interludes ---------- */

const ATLAS_FONT = "Fraunces";
const ATLAS_NAVY = "#0f1b2d";
const ATLAS_ORANGE = "#ff5a1f";

function atlasHead(s: ShotBuilder, tone: "paper" | "navy" | "orange" | "sky", kicker: string, text: string) {
  const bg = { paper: ["#ffffff", "#f1ede6"], navy: ["#1d2d47", ATLAS_NAVY], orange: ["#ff8a52", ATLAS_ORANGE], sky: ["#f2f7ff", "#d9e7fb"] }[tone];
  const ink = tone === "navy" || tone === "orange" ? "#ffffff" : ATLAS_NAVY;
  s.background = radial(0.2, 0.08, bg);
  if (tone === "paper" || tone === "sky") s.backdrop = { pattern: { kind: "topography", intensity: 0.08, thickness: 0.3, color: ATLAS_NAVY } };
  const k = s.text(kicker, {
    top: s.pick(220, 140) * s.u,
    size: 38,
    family: "Inter",
    weight: 600,
    letterSpacing: -0.005,
    color: tone === "orange" ? "#ffffff" : tone === "navy" ? "#ffb08f" : ATLAS_ORANGE,
  });
  return s.text(text, {
    top: k.bottom + 26 * s.u,
    size: s.pick(118, 104),
    family: ATLAS_FONT,
    weight: 600,
    color: ink,
    lineHeight: 1.02,
    letterSpacing: -0.035,
  });
}

const ATLAS_SHADOW = { color: ATLAS_NAVY, opacity: 0.26 };
const ATLAS_SHADOW_DARK = { color: "#000000", opacity: 0.5 };

const ATLAS: StoreSet = {
  slug: "atlas",
  app: "atlas",
  name: "Atlas",
  kind: "Travel planner",
  blurb: "An editorial serif on warm paper, with navy and orange shots in between and tickets lifted out.",
  cardBg: "linear-gradient(135deg,#f1ede6,#ffffff 45%,#ff8a52)",
  ink: ATLAS_NAVY,
  shots: [
    {
      name: "Every trip, planned",
      draw: (s) => {
        const head = atlasHead(s, "paper", "Lisbon, 18 to 24 October", "Every trip,\nbeautifully\nplanned.");
        phoneAndCard(s, 1, { x: 20, y: 182, w: 362, h: 345 }, head.bottom + s.pick(110, 60) * s.u, { variant: "natural-titanium", shadow: ATLAS_SHADOW, at: 0.2, width: s.W * 0.66 });
      },
    },
    {
      name: "Boarding pass",
      draw: (s) => {
        const head = atlasHead(s, "navy", "Works offline", "Your boarding\npass, ready");
        phoneAndCard(s, 2, { x: 20, y: 164, w: 362, h: 459 }, head.bottom + s.pick(110, 60) * s.u, { side: -1, variant: "black-titanium", shadow: ATLAS_SHADOW_DARK, at: 0.24, width: s.W * 0.58, rotate: 5 });
      },
    },
    {
      name: "Itinerary",
      draw: (s) => {
        const head = atlasHead(s, "paper", "Day 2 of 7", "Days that\nplan themselves");
        phoneAndCard(s, 3, { x: 88, y: 339, w: 294, h: 188 }, head.bottom + s.pick(110, 60) * s.u, { variant: "natural-titanium", shadow: ATLAS_SHADOW, at: 0.3, width: s.W * 0.66 });
      },
    },
    {
      name: "Map",
      draw: (s) => {
        const head = atlasHead(s, "sky", "12 saved places", "Everything you\nsaved, on a map");
        phoneAndCard(s, 4, { x: 10, y: 432, w: 382, h: 345 }, head.bottom + s.pick(110, 60) * s.u, { side: -1, variant: "natural-titanium", shadow: ATLAS_SHADOW, at: 0.4, width: s.W * 0.68 });
      },
    },
    {
      name: "Stay",
      draw: (s) => {
        const head = atlasHead(s, "paper", "Confirmed", "Your stay,\nin your pocket");
        phoneAndCard(s, 5, { x: 20, y: 402, w: 362, h: 352 }, head.bottom + s.pick(110, 60) * s.u, { variant: "natural-titanium", shadow: ATLAS_SHADOW, at: 0.4, width: s.W * 0.64 });
      },
    },
    {
      name: "Explore",
      draw: (s) => {
        const head = atlasHead(s, "orange", "Weekend escapes", "Where to\nnext?");
        phoneAndCard(s, 6, { x: 20, y: 283, w: 175, h: 235 }, head.bottom + s.pick(110, 60) * s.u, { side: -1, variant: "natural-titanium", shadow: { color: "#6b1d00", opacity: 0.4 }, at: 0.28, width: s.W * 0.44, rotate: 6, radius: 40 });
      },
    },
    {
      name: "Budget",
      draw: (s) => {
        const head = atlasHead(s, "paper", "Split with friends", "Shared costs,\nno maths");
        phoneAndCard(s, 7, { x: 20, y: 166, w: 362, h: 313 }, head.bottom + s.pick(110, 60) * s.u, { variant: "natural-titanium", shadow: ATLAS_SHADOW, at: 0.2, width: s.W * 0.66 });
      },
    },
    {
      name: "Packing",
      draw: (s) => {
        const head = atlasHead(s, "navy", "Packing list", "Pack for the\nweather you’ll get");
        phoneAndCard(s, 8, { x: 20, y: 215, w: 362, h: 217 }, head.bottom + s.pick(110, 60) * s.u, { side: -1, variant: "black-titanium", shadow: ATLAS_SHADOW_DARK, at: 0.18 });
      },
    },
  ],
};

export const STORE_SETS: StoreSet[] = [STRIDE, PENNY, HUSH, HABITAT, TEMPO, PARLA, VAULT, ORBIT, ATLAS];

export function storeSetBySlug(slug: string): StoreSet | undefined {
  return STORE_SETS.find((set) => set.slug === slug);
}

/** Android frames have their own colours; map the iPhone finish to the closest one */
const ANDROID_VARIANT: Record<string, string> = {
  "natural-titanium": "moonstone",
  "black-titanium": "obsidian",
  "desert-titanium": "moonstone",
};

/** Builds a set's eight scenes for a platform. */
export function buildStoreSet(set: StoreSet, platform: StorePlatform): { name: string; scene: SceneDocument }[] {
  return set.shots.map((spec, i) => {
    const s = new ShotBuilder(platform, set.app);
    spec.draw(s);
    if (platform === "android") {
      for (const layer of s.layers) {
        if (layer.type === "mockup" && layer.frameVariant) layer.frameVariant = ANDROID_VARIANT[layer.frameVariant] ?? undefined;
      }
    }
    const scene = s.build();
    scene.id = `store-set-${set.slug}-${platform}-${i + 1}-${createId().slice(0, 6)}`;
    // Every store listing set is Pro to export (guardProScreens reads this).
    scene.template = { id: `store-set-${set.slug}`, pro: true };
    return { name: `${i + 1}. ${spec.name}`, scene };
  });
}
