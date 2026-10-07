"use client";

import { getDevice, listDevices } from "@framekit/devices";
import { createMockupLayer, createScene, type Backdrop, type Background, type SceneDocument } from "@framekit/scene";
import { defaultTemplateDoc, encodeScreenAsset, fitCardScale, resolveScreenAsset } from "./screens";

/**
 * /templates has two kinds of entry:
 *   • device SCENES — premium photoreal mockups (a hand-held iPhone, a floating
 *     iPad…). Grouped by device into category cards (iPhone, iPad, Mac, …); each
 *     category card opens /templates/collection/<group> listing every mockup in
 *     it. Backed by a raster scene `deviceId` (packages/devices/src/scenes.ts).
 *   • content CARDS — posts, code and standalone data charts (an `app` screen doc).
 * Both open the editor at /templates/<slug> via makeTemplateScene.
 *
 * To add more mockups: extract the PSD → add a scene device → add a
 * SCENE_TEMPLATE here with its `group`. New groups auto-appear once they have
 * at least one template.
 */

import { SCENE_GROUPS, type SceneGroup, type SceneGroupId } from "./sceneGroups";
// Re-export so existing client consumers keep importing these from here; the
// data itself lives in the server-safe ./sceneGroups module.
export { SCENE_GROUPS };
export type { SceneGroup, SceneGroupId };

export type TemplateApp = "code" | "social" | "github" | "stripe" | "testimonial" | "ios-notification" | "spotify" | "appstore" | "appstore-promo" | "googlemaps" | "googleplay";

export interface TemplateMeta {
  slug: string;
  label: string;
  blurb: string;
  accent: string;
  /** content-card template — an app screen doc */
  app?: TemplateApp;
  /** photo-scene template — a raster scene device from the registry */
  deviceId?: string;
  /** which device category card this scene lives under */
  group?: SceneGroupId;
}

/** Premium device mockups, one card each inside their category. */
export const SCENE_TEMPLATES: TemplateMeta[] = [
  { slug: "ipad-floating", deviceId: "ipad-pro-2024-psd-silver-2", group: "ipad", label: "iPad Pro · Silver Flat", blurb: "A calibrated iPad Pro 2024 PSD scene with exact perspective and screen masking. 2752 × 2064.", accent: "#9fb4c9" },
  { slug: "ipad-angled", deviceId: "ipad-pro-2024-psd-silver-1", group: "ipad", label: "iPad Pro · Silver Angled", blurb: "A calibrated perspective iPad Pro scene extracted from the original PSD. 2752 × 2064.", accent: "#9fb4c9" },
  { slug: "ipad-tilted", deviceId: "ipad-pro-2024-psd-space-black-1", group: "ipad", label: "iPad Pro · Space Black Angled", blurb: "A dark iPad Pro scene with exact screen quadrilateral, mask and foreground. 2752 × 2064.", accent: "#9fb4c9" },
  { slug: "ipad-front-back", deviceId: "ipad-pro-2024-psd-space-black-2", group: "ipad", label: "iPad Pro · Space Black Flat", blurb: "A clean flat iPad Pro scene using the reusable layered PSD template. 2752 × 2064.", accent: "#9fb4c9" },
  // Mac
  { slug: "macbook-pro-16", deviceId: "macbook-pro-16-mockup", group: "mac", label: "MacBook Pro 16″", blurb: "A clean front-on MacBook Pro 16″ (Space Gray). Drop in a 3456 × 2234 screenshot.", accent: "#c9c2b4" },
];

/** Content cards (macOS/Safari window etc.), shown in their own row. */
export const TEMPLATES: TemplateMeta[] = [
  { slug: "post", app: "social", label: "Post from URL", blurb: "Paste an X, Bluesky, Threads, LinkedIn or Mastodon link. MockFrame builds one polished, editable post card.", accent: "#60a5fa" },
  { slug: "code", app: "code", label: "Code", blurb: "Syntax-highlighted code in a macOS, Safari, Windows or Arc window — 9 themes, 8 fonts.", accent: "#2f81f7" },
  { slug: "github-contributions", app: "github", label: "GitHub contributions", blurb: "An editable contribution heatmap card. Fetch a profile, paint cells and resize it freely.", accent: "#238636" },
  { slug: "stripe-revenue", app: "stripe", label: "Stripe revenue", blurb: "A standalone revenue chart with editable data, dimensions and visual scale.", accent: "#635bff" },
  { slug: "testimonial", app: "testimonial", label: "Testimonial", blurb: "Premium quote cards with editable author details, photo, typography, dimensions, colors and social-proof styling.", accent: "#6d5dfc" },
  { slug: "ios-notification", app: "ios-notification", label: "iOS Notification", blurb: "Frosted-glass iOS notification banner. Edit title, body, app name, and time.", accent: "#38bdf8" },
  { slug: "spotify", app: "spotify", label: "Spotify playback", blurb: "Premium music card with album art, neon glow, custom song title, artist, and progress tracker.", accent: "#1db954" },
  { slug: "appstore", app: "appstore", label: "App Store detail", blurb: "App Store app info card with squircle icon, rating score, reviews count, and category details.", accent: "#007aff" },
  { slug: "appstore-promo", app: "appstore-promo", label: "App Store Promo Card", blurb: "App Store marketing promo card with app icon, review stars, customizable copy and screenshot frame.", accent: "#007aff" },
  { slug: "googlemaps", app: "googlemaps", label: "Google Maps routing", blurb: "Vector route path card with GPS marker dots, destination time, and next-turn prompts.", accent: "#34a853" },
  { slug: "googleplay", app: "googleplay", label: "Google Play detail", blurb: "Google Play details card with squircle app icon, ratings value, reviews count, and PEGI age ratings.", accent: "#01875f" },
];

const ALL = [...SCENE_TEMPLATES, ...TEMPLATES];

export function templateBySlug(slug: string): TemplateMeta | undefined {
  // Old platform-specific post links now open the unified URL post template.
  if (slug === "x-post" || slug === "bluesky-post") return TEMPLATES.find((template) => template.slug === "post");
  return ALL.find((t) => t.slug === slug);
}

/** Scene mockups in a category. */
export function scenesInGroup(group: string): TemplateMeta[] {
  return SCENE_TEMPLATES.filter((t) => t.group === group);
}

/** Only categories that actually have mockups. */
export function activeSceneGroups(): SceneGroup[] {
  return SCENE_GROUPS.filter((g) => scenesInGroup(g.id).length > 0);
}

export function sceneGroupById(id: string): SceneGroup | undefined {
  return SCENE_GROUPS.find((g) => g.id === id);
}

/** Preview image URL for a template card: plate photo for scenes, screen doc for cards. */
export function templatePreviewUrl(meta: TemplateMeta): string | null {
  if (meta.deviceId) return getDevice(meta.deviceId)?.plate?.src ?? null;
  if (meta.app) return resolveScreenAsset(encodeScreenAsset(defaultTemplateDoc(meta.app)))?.url ?? null;
  return null;
}

/** Category card thumbnail = its first mockup's plate. */
export function groupPreviewUrl(group: string): string | null {
  const first = scenesInGroup(group)[0];
  return first ? templatePreviewUrl(first) : null;
}

const meshBg = (seed: number, colors: string[]): Background => ({ type: "mesh-gradient", seed, colors });
const linBg = (angle: number, colors: string[]): Background => ({ type: "linear-gradient", angle, stops: colors.map((color, i) => ({ at: i / (colors.length - 1), color })) });
const radBg = (cx: number, cy: number, colors: string[]): Background => ({ type: "radial-gradient", cx, cy, stops: colors.map((color, i) => ({ at: i / (colors.length - 1), color })) });

export interface CardLook {
  width: number;
  height: number;
  background: Background;
  backdrop?: Backdrop;
  /** share of the canvas the card fills */
  fill: number;
  /** CSS mirror of the background for gallery cards */
  css: string;
}

/** The canvas each content card opens on: size, background and how big the card sits. */
export const CARD_LOOKS: Record<TemplateApp, CardLook> = {
  social: {
    width: 1080, height: 1080, fill: 0.8,
    background: { type: "solid", color: "#82b5e8" },
    backdrop: { pattern: { kind: "stripes", intensity: 0.12, thickness: 0.56, color: "#dceeff" } },
    css: "repeating-linear-gradient(45deg,rgba(220,238,255,.25) 0 26px,transparent 26px 92px),#82b5e8",
  },
  code: {
    width: 1600, height: 1000, fill: 0.74,
    background: radBg(0.5, 0.15, ["#2a3553", "#0f1424", "#070a12"]),
    backdrop: { pattern: { kind: "grid", intensity: 0.07, thickness: 0.2, color: "#94a3b8" } },
    css: "radial-gradient(circle at 50% 15%,#2a3553,#0f1424 55%,#070a12)",
  },
  github: {
    width: 1600, height: 900, fill: 0.86,
    background: radBg(0.5, 0.1, ["#ffffff", "#e3f9ea", "#b7ecc8"]),
    css: "radial-gradient(circle at 50% 10%,#ffffff,#e3f9ea 50%,#b7ecc8)",
  },
  stripe: {
    width: 1280, height: 1000, fill: 0.7,
    background: meshBg(23, ["#635bff", "#a960ee", "#ff6b9d", "#2b1b7c"]),
    css: "radial-gradient(circle at 15% 20%,#ff6b9d,transparent 45%),radial-gradient(circle at 85% 80%,#2b1b7c,transparent 50%),linear-gradient(135deg,#635bff,#a960ee)",
  },
  testimonial: {
    width: 1200, height: 1000, fill: 0.8,
    background: meshBg(61, ["#0f172a", "#312e81", "#6d28d9", "#0e7490"]),
    css: "radial-gradient(circle at 80% 15%,#6d28d9,transparent 50%),radial-gradient(circle at 15% 85%,#0e7490,transparent 50%),linear-gradient(140deg,#0f172a,#312e81)",
  },
  "ios-notification": {
    width: 1080, height: 1080, fill: 0.84,
    background: meshBg(17, ["#7dd3fc", "#a78bfa", "#f0abfc", "#6366f1"]),
    css: "radial-gradient(circle at 20% 20%,#7dd3fc,transparent 50%),radial-gradient(circle at 80% 75%,#f0abfc,transparent 50%),linear-gradient(135deg,#a78bfa,#6366f1)",
  },
  spotify: {
    width: 1080, height: 1350, fill: 0.84,
    background: meshBg(9, ["#1e1b4b", "#7c3aed", "#0b0b0f", "#be185d"]),
    css: "radial-gradient(circle at 25% 20%,#7c3aed,transparent 50%),radial-gradient(circle at 80% 80%,#be185d,transparent 45%),#0b0b0f",
  },
  appstore: {
    width: 1080, height: 1350, fill: 0.84,
    background: linBg(160, ["#eef2ff", "#c7d2fe", "#a5b4fc"]),
    css: "linear-gradient(160deg,#eef2ff,#c7d2fe 55%,#a5b4fc)",
  },
  "appstore-promo": {
    width: 1440, height: 1080, fill: 0.86,
    background: linBg(160, ["#e9e9f2", "#cfd0e3"]),
    css: "linear-gradient(160deg,#e9e9f2,#cfd0e3)",
  },
  googlemaps: {
    width: 1080, height: 1080, fill: 0.84,
    background: meshBg(33, ["#064e3b", "#047857", "#0f766e", "#022c22"]),
    css: "radial-gradient(circle at 75% 20%,#0f766e,transparent 50%),linear-gradient(150deg,#047857,#022c22)",
  },
  googleplay: {
    width: 1080, height: 1350, fill: 0.84,
    background: linBg(160, ["#f0fdf4", "#bbf7d0", "#6ee7b7"]),
    css: "linear-gradient(160deg,#f0fdf4,#bbf7d0 55%,#6ee7b7)",
  },
};

/** A fresh scene holding just this template — a content card or a photo scene. */
export function makeTemplateScene(meta: TemplateMeta): SceneDocument {
  if (meta.deviceId) return makeSceneDeviceScene(meta.deviceId);

  const look = CARD_LOOKS[meta.app!] ?? CARD_LOOKS.code;
  const scene = createScene({ width: look.width, height: look.height, background: look.background, ...(look.backdrop ? { backdrop: look.backdrop } : {}) });
  const iphone = getDevice("iphone-16-pro") ?? listDevices()[0];
  const layer = createMockupLayer({ deviceId: null, frameHeight: iphone.frame.height, canvasHeight: scene.canvas.height });
  layer.media = {
    assetId: encodeScreenAsset(defaultTemplateDoc(meta.app!)),
    kind: "image",
    fit: "cover",
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  };
  // Standalone cards resolve at 3x logical pixels; size each to fill its share
  // of the canvas so it opens composed rather than tiny or cropped.
  layer.transform = { ...layer.transform, scale: fitCardScale(layer.media.assetId, scene.canvas.width, scene.canvas.height, look.fill) ?? 0.6 };
  scene.id = `scene-template-${meta.app}`;
  layer.id = "layer-template";
  scene.layers.push(layer);
  return scene;
}

/**
 * Photo-scene template. The canvas is sized a bit larger than the plate (in the
 * plate's own aspect ratio) so the device sits centered with margin and the
 * scene background shows around it. The device fills ~82% — since the plate is
 * cropped to the subject, that reads well and CanvasStage auto-fits the zoom for
 * any viewport, so no manual zooming is needed.
 */
function makeSceneDeviceScene(deviceId: string): SceneDocument {
  const device = getDevice(deviceId);
  const plate = device?.plate;
  const pw = plate?.width ?? 1600;
  const ph = plate?.height ?? 1200;
  // canvas = plate aspect, scaled up 1.22× so there's breathing room around the device
  const margin = 1.22;
  const width = Math.round(pw * margin);
  const height = Math.round(ph * margin);
  const scene = createScene({
    width,
    height,
    background: { type: "linear-gradient", angle: 145, stops: [{ at: 0, color: "#eef1f6" }, { at: 1, color: "#d6dbe6" }] },
  });
  // scale so the device fills ~82% of the canvas height, centered with margin
  const layer = createMockupLayer({ deviceId, media: null });
  layer.transform = { ...layer.transform, scale: Math.round((1 / margin) * 1000) / 1000 };
  layer.shadow = { mode: "adaptive", lightAngle: 90, distance: 40, softness: 90, opacity: 0.26, color: "#0b0b17" };
  scene.id = `scene-template-${deviceId}`;
  layer.id = "layer-template";
  scene.layers.push(layer);
  return scene;
}
