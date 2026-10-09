import { getDevice } from "@framekit/devices";
import {
  IDENTITY_TRANSFORM,
  createId,
  createScene,
  type Background,
  type MockupLayer,
  type SceneDocument,
  type Shadow,
  type TextLayer,
} from "@framekit/scene";
import { buildDeviceScene } from "./deviceScene";
import { applyLayout, LAYOUT_PRESETS } from "./layouts";
import { hsl, pickAccent } from "./prettify";

/**
 * Showcase: one screenshot in, a finished set out. A headline promo and three
 * photo scenes (live, editable scenes), then two composites built from them:
 * a "One screenshot. Four finished shots." poster and a before / after post.
 *
 * Everything here is pure. The poster needs the four shots as flat images
 * (photo scenes can't be cropped into rounded tiles live), so the editor
 * renders those first and passes them in as `tiles`.
 */

export interface ShowcaseImage {
  assetId: string;
  width: number;
  height: number;
  /** file name shown under the "Before" column */
  name?: string;
}

export interface ShowcaseShot {
  key: "headline" | "photo" | "pair" | "hand";
  name: string;
  scene: SceneDocument;
  /** how the poster crops this shot into its tile: focal point, 0..1 */
  focus: { x: number; y: number };
}

const HEAD_FONT = "Bricolage Grotesque";
const BODY_FONT = "Inter";

/** Phone-shaped (portrait) screenshots get phones; anything wider gets a MacBook. */
export function isWideShot(img: { width: number; height: number }) {
  return img.width / img.height > 0.9;
}

const media = (img: ShowcaseImage): NonNullable<MockupLayer["media"]> => ({
  assetId: img.assetId,
  kind: "image",
  fit: "cover",
  offsetX: 0,
  offsetY: 0,
  scale: 1,
});

function withMedia(scene: SceneDocument, img: ShowcaseImage): SceneDocument {
  return {
    ...scene,
    id: createId(),
    layers: scene.layers.map((l) => (l.type === "mockup" ? { ...l, id: createId(), media: media(img) } : l)),
  };
}

function text(content: string, o: Partial<TextLayer> & { size: number; family?: string; weight?: number; x: number; y: number }): TextLayer {
  const { size, family, weight, x, y, ...rest } = o;
  return {
    type: "text",
    id: createId(),
    content,
    font: { family: family ?? HEAD_FONT, weight: weight ?? 700, size, lineHeight: 1.04, letterSpacing: -0.035 },
    color: "#ffffff",
    align: "center",
    maxWidth: null,
    ...rest,
    transform: { ...IDENTITY_TRANSFORM, x: Math.round(x), y: Math.round(y) },
  };
}

/** A palette-derived accent, as hue + saturation. */
export function showcaseAccent(palette: string[]) {
  return pickAccent(palette, 0);
}

/* ------------------------------ live shots ------------------------------- */

function headlineShot(img: ShowcaseImage, hue: number, sat: number, wide: boolean): SceneDocument {
  const W = wide ? 1600 : 1080;
  const H = wide ? 1200 : 1350;
  const deviceId = wide ? "macbook-pro-14" : "iphone-17-pro";
  const device = getDevice(deviceId);
  const scene = createScene({
    width: W,
    height: H,
    background: {
      type: "linear-gradient",
      angle: 160,
      stops: [
        { at: 0, color: hsl(hue, sat * 0.75, 0.1) },
        { at: 0.55, color: hsl(hue, sat, 0.3) },
        { at: 1, color: hsl(hue + 22, sat, 0.55) },
      ],
    },
  });
  const frameH = device?.frame.height ?? 2622;
  const phone: MockupLayer = {
    type: "mockup",
    id: createId(),
    deviceId,
    media: media(img),
    transform: { ...IDENTITY_TRANSFORM, scale: Math.round(((H * 0.78) / frameH) * 1000) / 1000 },
    shadow: { mode: "adaptive", lightAngle: 90, distance: 44, softness: 96, opacity: 0.45, color: hsl(hue, 0.5, 0.04) },
  };
  scene.layers.push(phone);
  // rises from the bottom edge, leaving the top for the headline
  const rising = LAYOUT_PRESETS.find((p) => p.id === (wide ? "solo-center" : "solo-peek"));
  let staged = rising ? applyLayout(scene, rising) : scene;
  if (wide) {
    staged = {
      ...staged,
      layers: staged.layers.map((l) => (l.type === "mockup" ? { ...l, transform: { ...l.transform, y: Math.round(H * 0.14), scale: l.transform.scale * 0.92 } } : l)),
    };
  }
  const size = wide ? 92 : 84;
  staged.layers.push(
    text("Everything you need.\nNothing you don’t.", {
      size,
      x: 0,
      y: -H / 2 + (wide ? 120 : 112) + size * 1.04,
      maxWidth: W - 160,
    }),
  );
  return staged;
}

function photoShot(deviceId: string, img: ShowcaseImage, background?: Background): SceneDocument | null {
  const base = buildDeviceScene(deviceId);
  if (!base) return null;
  const scene = withMedia(base, img);
  return background ? { ...scene, canvas: { ...scene.canvas, background } } : scene;
}

/** The hand composites are cut-outs, not full-bleed photos: lay one on a canvas of its own size. */
function handShot(img: ShowcaseImage, hue: number): SceneDocument | null {
  const device = getDevice("psd-composite-iphone-01");
  if (!device?.plate) return null;
  const k = 0.5;
  const scene = createScene({
    width: Math.round(device.plate.width * k),
    height: Math.round(device.plate.height * k),
    background: {
      type: "radial-gradient",
      cx: 0.62,
      cy: 0.38,
      stops: [
        { at: 0, color: hsl(hue, 0.35, 0.97) },
        { at: 1, color: hsl(hue, 0.28, 0.86) },
      ],
    },
  });
  scene.layers.push({
    type: "mockup",
    id: createId(),
    deviceId: device.id,
    media: media(img),
    transform: { ...IDENTITY_TRANSFORM, scale: k },
    shadow: null,
  });
  return scene;
}

/**
 * The four live shots, in the order the poster lays them out: the hero photo
 * (big tile), the headline promo, then two smaller photos.
 */
export function showcaseShots(img: ShowcaseImage, palette: string[]): ShowcaseShot[] {
  const wide = isWideShot(img);
  const { hue, sat } = showcaseAccent(palette);
  const pastel: Background = {
    type: "linear-gradient",
    angle: 150,
    stops: [
      { at: 0, color: hsl(hue, 0.55, 0.9) },
      { at: 1, color: hsl(hue + 18, 0.5, 0.78) },
    ],
  };
  const out: (ShowcaseShot | null)[] = wide
    ? [
        mk("photo", "On a chair", photoShot("psd-scene-macbook-chair-1", img), { x: 0.62, y: 0.42 }),
        mk("headline", "Headline", headlineShot(img, hue, sat, true), { x: 0.5, y: 0.3 }),
        mk("pair", "Three-quarter", photoShot("psd-scene-macbook-pro-2", img, pastel), { x: 0.42, y: 0.42 }),
        mk("hand", "Straight on", photoShot("psd-scene-macbook-pro-1", img, pastel), { x: 0.5, y: 0.42 }),
      ]
    : [
        mk("photo", "On stone", photoShot("psd-scene-iphone-pro-1", img), { x: 0.53, y: 0.5 }),
        mk("headline", "Headline", headlineShot(img, hue, sat, false), { x: 0.5, y: 0 }),
        mk("pair", "Front and back", photoShot("psd-scene-iphone-17-1", img, pastel), { x: 0.49, y: 0.5 }),
        mk("hand", "In hand", handShot(img, hue), { x: 0.6, y: 0.5 }),
      ];
  return out.filter((s): s is ShowcaseShot => !!s);

  function mk(key: ShowcaseShot["key"], name: string, scene: SceneDocument | null, focus: ShowcaseShot["focus"]): ShowcaseShot | null {
    return scene ? { key, name, scene, focus } : null;
  }
}

/* ------------------------------- composites ------------------------------- */

const TILE_SHADOW: Shadow = { mode: "spread", lightAngle: 90, distance: 18, softness: 40, opacity: 0.2, color: "#17161c" };

/**
 * A frameless image, cropped to a `w × h` box (canvas px, top-left at x, y on a
 * W × H canvas) around `focus`, like CSS object-fit: cover.
 */
function tile(
  img: { assetId: string; width: number; height: number },
  box: { x: number; y: number; w: number; h: number },
  canvas: { W: number; H: number },
  o: { focus?: { x: number; y: number }; radius?: number; shadow?: Shadow | null; border?: MockupLayer["border"]; fit?: "cover" | "contain" } = {},
): MockupLayer {
  const f = o.focus ?? { x: 0.5, y: 0.5 };
  const imgAr = img.width / img.height;
  const boxAr = box.w / box.h;
  let crop = { x: 0, y: 0, w: 1, h: 1 };
  let { x, y, w, h } = box;
  if (o.fit === "contain") {
    // shrink the box to the image's own shape, pinned to the box's top-left
    if (imgAr > boxAr) h = w / imgAr;
    else w = h * imgAr;
  } else if (imgAr > boxAr) {
    const cw = boxAr / imgAr;
    crop = { x: Math.min(1 - cw, Math.max(0, f.x - cw / 2)), y: 0, w: cw, h: 1 };
  } else {
    const ch = imgAr / boxAr;
    crop = { x: 0, y: Math.min(1 - ch, Math.max(0, f.y - ch / 2)), w: 1, h: ch };
  }
  const naturalW = img.width * crop.w;
  const scale = w / naturalW;
  const full = crop.w === 1 && crop.h === 1;
  return {
    type: "mockup",
    id: createId(),
    deviceId: null,
    screenshotStyle: "default",
    media: { ...media({ assetId: img.assetId, width: img.width, height: img.height }), ...(full ? {} : { crop }) },
    cornerRadius: Math.round(((o.radius ?? 0) / scale) * 100) / 100,
    ...(o.border ? { border: o.border } : {}),
    transform: {
      ...IDENTITY_TRANSFORM,
      x: Math.round(x + w / 2 - canvas.W / 2),
      y: Math.round(y + h / 2 - canvas.H / 2),
      scale: Math.round(scale * 10000) / 10000,
    },
    shadow: o.shadow === undefined ? TILE_SHADOW : o.shadow,
  };
}

/** Text placed by its top-left corner (left-aligned), the way a layout grid reads. */
function label(content: string, at: { x: number; top: number }, o: { size: number; family?: string; weight?: number; color: string; W: number; H: number; width?: number; letterSpacing?: number }): TextLayer {
  const lh = 1.04;
  const width = o.width ?? 600;
  return {
    type: "text",
    id: createId(),
    content,
    font: { family: o.family ?? BODY_FONT, weight: o.weight ?? 600, size: o.size, lineHeight: lh, letterSpacing: o.letterSpacing ?? -0.005 },
    color: o.color,
    align: "left",
    maxWidth: width,
    transform: { ...IDENTITY_TRANSFORM, x: Math.round(at.x + width / 2 - o.W / 2), y: Math.round(at.top + (o.size * lh) / 2 - o.H / 2) },
  };
}

/** Rendered shots for the poster: the shot plus the flat image of it. */
export interface ShowcaseTile {
  shot: ShowcaseShot;
  image: { assetId: string; width: number; height: number };
}

/** Where the poster puts the four shots (1600 × 900 canvas px), in `showcaseShots` order. */
export const POSTER_TILES = [
  { x: 440, y: 136, w: 640, h: 690 },
  { x: 1096, y: 136, w: 448, h: 368 },
  { x: 1096, y: 520, w: 216, h: 306 },
  { x: 1328, y: 520, w: 216, h: 306 },
];

const INK = "#17161c";
const MUTED = "#72757f";

/**
 * "One screenshot. Four finished shots." The raw screenshot in a flat grey
 * column, the four finished shots tiled beside it. 1600 × 900, X's 16:9.
 */
export function showcasePoster(raw: ShowcaseImage, tiles: ShowcaseTile[]): SceneDocument {
  const W = 1600;
  const H = 900;
  const col = 392 / W;
  const scene = createScene({
    width: W,
    height: H,
    background: {
      type: "linear-gradient",
      angle: 90,
      stops: [
        { at: 0, color: "#e3e5e9" },
        { at: col, color: "#e3e5e9" },
        { at: col, color: "#f6f6f4" },
        { at: 1, color: "#f6f6f4" },
      ],
    },
  });
  const c = { W, H };
  const wide = isWideShot(raw);
  // before: the screenshot as it came, no frame, no radius, a hairline edge
  scene.layers.push(
    tile(raw, { x: 40, y: wide ? 136 + (690 - 312 / (raw.width / raw.height)) / 2 : 136, w: 312, h: wide ? 312 / (raw.width / raw.height) : 690 }, c, {
      fit: "contain",
      shadow: null,
      border: { width: 1, color: "#cfd2d8", inset: 0 },
    }),
  );
  tiles.slice(0, 4).forEach((t, i) => scene.layers.push(tile(t.image, POSTER_TILES[i], c, { focus: t.shot.focus, radius: 14 })));
  scene.layers.push(
    label(`${tiles.length === 4 ? "One screenshot. Four finished shots." : "One screenshot. Finished shots."}`, { x: 440, top: 44 }, {
      size: 54,
      family: HEAD_FONT,
      weight: 700,
      color: INK,
      letterSpacing: -0.035,
      width: 1110,
      W,
      H,
    }),
    label("Before", { x: 40, top: 842 }, { size: 15, color: INK, width: 70, W, H }),
    label(raw.name ? raw.name.toUpperCase() : "SCREENSHOT.PNG", { x: 106, top: 843 }, { size: 14, weight: 500, color: MUTED, width: 240, W, H }),
    label("After, made in MockFrame", { x: 440, top: 842 }, { size: 15, color: INK, width: 400, W, H }),
  );
  scene.id = createId();
  return scene;
}

/**
 * Before / after: the raw screenshot on flat grey, the finished headline
 * shot beside it on its own colours. Both halves are live layers.
 */
export function showcaseBeforeAfter(raw: ShowcaseImage, palette: string[]): SceneDocument {
  const W = 1600;
  const H = 900;
  const wide = isWideShot(raw);
  const { hue, sat } = showcaseAccent(palette);
  const scene = createScene({
    width: W,
    height: H,
    background: {
      type: "linear-gradient",
      angle: 90,
      stops: [
        { at: 0, color: "#e7e8ec" },
        { at: 0.5, color: "#e7e8ec" },
        { at: 0.5, color: hsl(hue, sat * 0.8, 0.16) },
        { at: 1, color: hsl(hue + 20, sat, 0.42) },
      ],
    },
  });
  const c = { W, H };
  // before: flat, unframed, as it came off the phone
  const bw = wide ? 600 : 300;
  const bh = wide ? bw / (raw.width / raw.height) : 650;
  scene.layers.push(tile(raw, { x: W / 4 - bw / 2, y: H / 2 - bh / 2 + 30, w: bw, h: bh }, c, { fit: "contain", shadow: null, border: { width: 1, color: "#cfd2d8", inset: 0 } }));
  // after: a real device with a lit shadow
  const deviceId = wide ? "macbook-pro-14" : "iphone-17-pro";
  const device = getDevice(deviceId);
  const frameH = device?.frame.height ?? 2622;
  const frameW = device?.frame.width ?? 1206;
  const target = wide ? Math.min(560 * (frameH / frameW), 700) : 720;
  scene.layers.push({
    type: "mockup",
    id: createId(),
    deviceId,
    media: media(raw),
    transform: { ...IDENTITY_TRANSFORM, x: W / 4, y: 30, scale: Math.round((target / frameH) * 1000) / 1000 },
    shadow: { mode: "adaptive", lightAngle: 90, distance: 40, softness: 90, opacity: 0.5, color: hsl(hue, 0.5, 0.03) },
  });
  scene.layers.push(
    text("Before", {
      size: 22,
      family: BODY_FONT,
      weight: 600,
      color: INK,
      x: -W / 4,
      y: -H / 2 + 62,
      highlight: { color: "#ffffff", radius: 999, padX: 22, padY: 10 },
    }),
    text("After", {
      size: 22,
      family: BODY_FONT,
      weight: 600,
      color: INK,
      x: W / 4,
      y: -H / 2 + 62,
      highlight: { color: "#ffffff", radius: 999, padX: 22, padY: 10 },
    }),
  );
  return scene;
}
