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
 *   • content CARDS — Code / Bluesky / X post (an `app` screen doc).
 * Both open the editor at /templates/<slug> via makeTemplateScene.
 *
 * To add more mockups: extract the PSD → add a scene device → add a
 * SCENE_TEMPLATE here with its `group`. New groups auto-appear once they have
 * at least one template.
 */

export type TemplateApp = "code" | "bluesky" | "xpost" | "social";
export type SceneGroupId = "iphone" | "ipad" | "mac" | "watch" | "android";

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

export interface SceneGroup {
  id: SceneGroupId;
  label: string;
  blurb: string;
  accent: string;
}

/** Category cards on /templates. Only those with ≥1 template are shown. */
export const SCENE_GROUPS: SceneGroup[] = [
  { id: "ipad", label: "iPad", blurb: "Clean floating iPad scenes for app, portfolio & product shots.", accent: "#9fb4c9" },
  { id: "mac", label: "Mac", blurb: "MacBook Pro & Air mockups in premium studio angles.", accent: "#c9c2b4" },
  { id: "watch", label: "Apple Watch", blurb: "Apple Watch Ultra mockups — drop your watchOS screen in.", accent: "#c4b4c9" },
  { id: "android", label: "Android", blurb: "Pixel & Galaxy device mockups. Coming soon.", accent: "#a9c9b4" },
];

/** Premium device mockups, one card each inside their category. */
export const SCENE_TEMPLATES: TemplateMeta[] = [
  { slug: "ipad-floating", deviceId: "ipad-floating", group: "ipad", label: "iPad Floating", blurb: "A clean straight-on iPad floating in space. Drop in a 1451 × 2073 screenshot.", accent: "#9fb4c9" },
  { slug: "ipad-angled", deviceId: "ipad-angle", group: "ipad", label: "iPad Angled", blurb: "A perspective iPad tilted in space — your screenshot warps onto the angled screen. 1451 × 2073.", accent: "#9fb4c9" },
  { slug: "ipad-tilted", deviceId: "ipad-tilt", group: "ipad", label: "iPad Tilted", blurb: "A dynamic floating iPad at an angle. Your screenshot maps into the perspective screen. 1451 × 2073.", accent: "#9fb4c9" },
  { slug: "ipad-front-back", deviceId: "ipad-duo", group: "ipad", label: "iPad Front & Back", blurb: "Two iPads — one showing your screen, one showing the back. 1451 × 2073.", accent: "#9fb4c9" },
  // Mac
  { slug: "macbook-pro-16", deviceId: "macbook-pro-16-mockup", group: "mac", label: "MacBook Pro 16″", blurb: "A clean front-on MacBook Pro 16″ (Space Gray). Drop in a 3456 × 2234 screenshot.", accent: "#c9c2b4" },
];

/** Content cards (macOS/Safari window etc.), shown in their own row. */
export const TEMPLATES: TemplateMeta[] = [
  { slug: "post", app: "social", label: "Post URL", blurb: "Paste an X, Bluesky, Threads, LinkedIn or Mastodon URL into a provider-neutral MockFrame card.", accent: "#7c3aed" },
  { slug: "code", app: "code", label: "Code", blurb: "Syntax-highlighted code in a macOS, Safari, Windows or Arc window — 9 themes, 8 fonts.", accent: "#2f81f7" },
  { slug: "bluesky-post", app: "bluesky", label: "Bluesky post", blurb: "A Bluesky post card with an embedded link preview and engagement counts.", accent: "#1083fe" },
  { slug: "x-post", app: "xpost", label: "X post", blurb: "A tweet card with a 1–4 photo media grid, verified badge and counts.", accent: "#111111" },
];

const ALL = [...SCENE_TEMPLATES, ...TEMPLATES];

export function templateBySlug(slug: string): TemplateMeta | undefined {
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

  const scene = createScene({ width: 1920, height: 1080 });
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
  layer.transform = { ...layer.transform, scale: 0.72 };
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
