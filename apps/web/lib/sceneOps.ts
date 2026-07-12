"use client";

import { suggestDevice, getDevice } from "@framekit/devices";
import {
  createId,
  createMockupLayer,
  createTextLayer,
  type Layer,
  type SceneDocument,
  type StickerLayer,
} from "@framekit/scene";
import type { GuestAsset } from "./assets";

export function addLayer(scene: SceneDocument, layer: Layer): SceneDocument {
  return { ...scene, layers: [...scene.layers, layer] };
}

export function removeLayer(scene: SceneDocument, id: string): SceneDocument {
  return { ...scene, layers: scene.layers.filter((l) => l.id !== id) };
}

export function duplicateLayer(scene: SceneDocument, id: string): SceneDocument {
  const src = scene.layers.find((l) => l.id === id);
  if (!src) return scene;
  const copy: Layer = {
    ...structuredClone(src),
    id: createId(),
    transform: { ...src.transform, x: src.transform.x + 32, y: src.transform.y + 32 },
  };
  return { ...scene, layers: [...scene.layers, copy] };
}

export function reorderLayer(scene: SceneDocument, id: string, dir: 1 | -1): SceneDocument {
  const idx = scene.layers.findIndex((l) => l.id === id);
  const to = idx + dir;
  if (idx < 0 || to < 0 || to >= scene.layers.length) return scene;
  const layers = [...scene.layers];
  const [l] = layers.splice(idx, 1);
  layers.splice(to, 0, l);
  return { ...scene, layers };
}

/**
 * Drop/paste entry point. Exact-resolution device match first (the registry
 * "magic moment"), else fill the selected empty mockup, else a frameless layer.
 */
export function placeAsset(
  scene: SceneDocument,
  asset: GuestAsset,
  opts: { selectedId?: string | null } = {}
): { scene: SceneDocument; layerId: string } {
  const media = {
    assetId: asset.id,
    kind: "image" as const,
    fit: "cover" as const,
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  };

  // 1. selected mockup takes the drop
  if (opts.selectedId) {
    const sel = scene.layers.find((l) => l.id === opts.selectedId);
    if (sel?.type === "mockup") {
      return {
        scene: {
          ...scene,
          layers: scene.layers.map((l) => (l.id === sel.id ? { ...sel, media } : l)),
        },
        layerId: sel.id,
      };
    }
  }

  // 2. first empty mockup slot
  const empty = scene.layers.find((l) => l.type === "mockup" && !l.media);
  if (empty && empty.type === "mockup") {
    return {
      scene: {
        ...scene,
        layers: scene.layers.map((l) => (l.id === empty.id ? { ...empty, media } : l)),
      },
      layerId: empty.id,
    };
  }

  // 3. new layer — suggest a device from the image's dimensions
  const device = suggestDevice(asset.width, asset.height);
  const layer = createMockupLayer({
    deviceId: device?.id ?? null,
    media,
    frameHeight: device?.frame.height ?? asset.height,
    canvasHeight: scene.canvas.height,
  });
  if (!device) layer.cornerRadius = Math.round(Math.min(asset.width, asset.height) * 0.03);
  return { scene: addLayer(scene, layer), layerId: layer.id };
}

export function addDeviceLayer(scene: SceneDocument, deviceId: string): { scene: SceneDocument; layerId: string } {
  const device = getDevice(deviceId);
  if (!device) return { scene, layerId: "" };
  const layer = createMockupLayer({
    deviceId,
    frameHeight: device.frame.height,
    canvasHeight: scene.canvas.height,
  });
  // offset stacked additions so they don't hide each other
  const n = scene.layers.filter((l) => l.type === "mockup").length;
  layer.transform.x = n * 48;
  layer.transform.y = n * 24;
  return { scene: addLayer(scene, layer), layerId: layer.id };
}

export function addText(scene: SceneDocument): { scene: SceneDocument; layerId: string } {
  const layer = createTextLayer();
  layer.transform.y = -scene.canvas.height * 0.38;
  return { scene: addLayer(scene, layer), layerId: layer.id };
}

/** Drop an emoji sticker (a big text layer — scalable, rotatable, exportable). */
export function addEmoji(scene: SceneDocument, emoji: string): { scene: SceneDocument; layerId: string } {
  const layer = createTextLayer(emoji);
  layer.font.size = Math.round(scene.canvas.height * 0.16);
  // scatter slightly so repeated drops don't stack perfectly
  const n = scene.layers.length;
  layer.transform.x = ((n % 5) - 2) * scene.canvas.width * 0.08;
  layer.transform.y = -scene.canvas.height * 0.22 + (n % 3) * scene.canvas.height * 0.06;
  return { scene: addLayer(scene, layer), layerId: layer.id };
}

/** Place an uploaded image as a masked app icon (App Store / Play Store shots). */
export function addAppIcon(
  scene: SceneDocument,
  assetId: string,
  iconMask: "ios" | "android" | "square" = "ios"
): { scene: SceneDocument; layerId: string } {
  const id = createId();
  const scale = Math.round(((scene.canvas.height * 0.26) / 512) * 1000) / 1000;
  const layer: Layer = {
    type: "sticker",
    id,
    assetId,
    iconMask,
    transform: { x: 0, y: -scene.canvas.height * 0.12, scale, rotate: 0, tiltX: 0, tiltY: 0, perspective: 1200 },
  };
  return { scene: addLayer(scene, layer), layerId: id };
}

export type AnnotationStickerId =
  | "annot-arrow"
  | "annot-highlight"
  | "annot-redact"
  | "annot-blur"
  | `annot-step-${1 | 2 | 3 | 4 | 5}`;

const ANNOTATION_DEFAULTS: Record<AnnotationStickerId, { tint: string; scale: number; x: number; y: number; rotate?: number }> = {
  "annot-arrow": { tint: "#ff3b30", scale: 1.1, x: 0.18, y: -0.12, rotate: -8 },
  "annot-highlight": { tint: "#ffe066", scale: 1.05, x: 0, y: 0.16 },
  "annot-redact": { tint: "#111111", scale: 1.05, x: 0, y: 0.08 },
  "annot-blur": { tint: "#ffffff", scale: 1.05, x: 0, y: 0.08 },
  "annot-step-1": { tint: "#7c3aed", scale: 1, x: -0.18, y: -0.18 },
  "annot-step-2": { tint: "#7c3aed", scale: 1, x: -0.18, y: -0.18 },
  "annot-step-3": { tint: "#7c3aed", scale: 1, x: -0.18, y: -0.18 },
  "annot-step-4": { tint: "#7c3aed", scale: 1, x: -0.18, y: -0.18 },
  "annot-step-5": { tint: "#7c3aed", scale: 1, x: -0.18, y: -0.18 },
};

/** Built-in annotation stickers: arrows, steps, highlights, redaction, blur. */
export function addAnnotation(scene: SceneDocument, stickerId: AnnotationStickerId): { scene: SceneDocument; layerId: string } {
  const id = createId();
  const d = ANNOTATION_DEFAULTS[stickerId];
  const layer: StickerLayer = {
    type: "sticker",
    id,
    stickerId,
    tint: d.tint,
    transform: {
      x: Math.round(scene.canvas.width * d.x),
      y: Math.round(scene.canvas.height * d.y),
      scale: d.scale,
      rotate: d.rotate ?? 0,
      tiltX: 0,
      tiltY: 0,
      perspective: 1200,
    },
  };
  return { scene: addLayer(scene, layer), layerId: id };
}
