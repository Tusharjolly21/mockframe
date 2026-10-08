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

export const STORE_SETS: StoreSet[] = [STRIDE, PENNY, HUSH, HABITAT];

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
