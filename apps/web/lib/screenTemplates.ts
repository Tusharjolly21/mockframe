"use client";

import { getDevice, listDevices } from "@framekit/devices";
import { createMockupLayer, createScene, type SceneDocument } from "@framekit/scene";
import { defaultTemplateDoc, encodeScreenAsset, resolveScreenAsset } from "./screens";

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

/** A fresh scene holding just this template — a content card or a photo scene. */
export function makeTemplateScene(meta: TemplateMeta): SceneDocument {
  if (meta.deviceId) return makeSceneDeviceScene(meta.deviceId);

  const isPost = meta.app === "social";
  const isTestimonial = meta.app === "testimonial";
  const scene = isPost
    ? createScene({
        width: 1080,
        height: 1080,
        background: { type: "solid", color: "#82b5e8" },
        backdrop: { pattern: { kind: "stripes", intensity: 0.12, thickness: 0.56, color: "#dceeff" } },
      })
    : isTestimonial
      ? createScene({
          width: 1080,
          height: 1080,
          background: { type: "linear-gradient", angle: 138, stops: [{ at: 0, color: "#111827" }, { at: 0.52, color: "#183b45" }, { at: 1, color: "#6d5dfc" }] },
          backdrop: { pattern: { kind: "waves", intensity: 0.1, thickness: 0.3, color: "#d7fff5" } },
        })
    : meta.app === "ios-notification"
      ? createScene({
          width: 1080,
          height: 1080,
          background: { type: "linear-gradient", angle: 138, stops: [{ at: 0, color: "#1e1b4b" }, { at: 0.5, color: "#311042" }, { at: 1, color: "#4338ca" }] },
          backdrop: { pattern: { kind: "waves", intensity: 0.15, thickness: 0.35, color: "#a5b4fc" } },
        })
    : meta.app === "spotify"
      ? createScene({
          width: 1080,
          height: 1080,
          background: { type: "radial-gradient", cx: 0.5, cy: 0.5, stops: [{ at: 0, color: "#1e293b" }, { at: 1, color: "#09090b" }] },
        })
    : meta.app === "appstore"
      ? createScene({
          width: 1080,
          height: 1080,
          background: { type: "linear-gradient", angle: 135, stops: [{ at: 0, color: "#0284c7" }, { at: 1, color: "#075985" }] },
        })
    : meta.app === "googlemaps"
      ? createScene({
          width: 1080,
          height: 1080,
          background: { type: "linear-gradient", angle: 135, stops: [{ at: 0, color: "#166534" }, { at: 1, color: "#14532d" }] },
        })
    : meta.app === "googleplay"
      ? createScene({
          width: 1080,
          height: 1080,
          background: { type: "linear-gradient", angle: 135, stops: [{ at: 0, color: "#01875f" }, { at: 1, color: "#004d34" }] },
        })
    : createScene({ width: 1920, height: 1080 });
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
  // Standalone cards resolve at 3x logical pixels. The generic device-derived
  // initial scale makes them tiny, so start them at a useful composition size.
  let initialScale = 0.72;
  if (isPost) initialScale = 0.5;
  else if (isTestimonial) initialScale = 0.37;
  else if (meta.app === "github") initialScale = 0.58;
  else if (meta.app === "ios-notification") initialScale = 0.6;
  else if (meta.app === "spotify") initialScale = 0.5;
  else if (meta.app === "appstore") initialScale = 0.45;
  else if (meta.app === "googlemaps") initialScale = 0.52;
  else if (meta.app === "googleplay") initialScale = 0.45;

  layer.transform = {
    ...layer.transform,
    scale: initialScale,
  };
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
