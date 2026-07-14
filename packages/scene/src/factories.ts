import { createId } from "@paralleldrive/cuid2";
import {
  SCHEMA_VERSION,
  type Background,
  type MockupLayer,
  type SceneDocument,
  type Shadow,
  type TextLayer,
  type Transform,
} from "./schema";

export const IDENTITY_TRANSFORM: Transform = {
  x: 0,
  y: 0,
  scale: 1,
  rotate: 0,
  tiltX: 0,
  tiltY: 0,
  perspective: 1200,
};

export const DEFAULT_SHADOW: Shadow = {
  mode: "adaptive",
  lightAngle: 90,
  distance: 24,
  softness: 60,
  opacity: 0.4,
  color: "#000000",
};

export const DEFAULT_BACKGROUND: Background = {
  type: "mesh-gradient",
  seed: 7,
  colors: ["#6d28d9", "#0e7490", "#1e1b4b", "#0f172a"],
};

export const CANVAS_PRESETS = [
  { id: "wide-16-9", label: "16:9 · Wide", width: 1920, height: 1080 },
  { id: "og-image", label: "OG Image", width: 1200, height: 630 },
  { id: "twitter-post", label: "X / Twitter", width: 1600, height: 900 },
  { id: "square-1-1", label: "1:1 · Square", width: 1440, height: 1440 },
  { id: "story-9-16", label: "9:16 · Story", width: 1080, height: 1920 },
  { id: "product-hunt", label: "Product Hunt", width: 1270, height: 760 },
  { id: "dribbble", label: "Dribbble", width: 1600, height: 1200 },
  { id: "classic-4-3", label: "4:3 · Classic", width: 1600, height: 1200 },
] as const;

export function createScene(partial?: Partial<SceneDocument["canvas"]>): SceneDocument {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: createId(),
    canvas: {
      ...partial,
      width: partial?.width ?? 1920,
      height: partial?.height ?? 1080,
      background: partial?.background ?? DEFAULT_BACKGROUND,
    },
    layers: [],
  };
}

export function createMockupLayer(init: {
  deviceId: string | null;
  frameVariant?: string;
  media?: MockupLayer["media"];
  /** realistic-render metadata: original screenshot + Mockuuups render params */
  render?: MockupLayer["render"];
  /** frame height in device logical px; used to pick a sensible initial scale */
  frameHeight?: number;
  canvasHeight?: number;
}): MockupLayer {
  const scale =
    init.frameHeight && init.canvasHeight
      ? Math.round(((init.canvasHeight * 0.78) / init.frameHeight) * 1000) / 1000
      : 1;
  return {
    type: "mockup",
    id: createId(),
    deviceId: init.deviceId,
    frameVariant: init.frameVariant,
    media: init.media ?? null,
    render: init.render,
    transform: { ...IDENTITY_TRANSFORM, scale },
    shadow: { ...DEFAULT_SHADOW },
  };
}

export function createTextLayer(content = "Your headline"): TextLayer {
  return {
    type: "text",
    id: createId(),
    content,
    font: { family: "Inter", weight: 700, size: 72, lineHeight: 1.15, letterSpacing: -0.02 },
    color: "#ffffff",
    align: "center",
    maxWidth: null,
    transform: { ...IDENTITY_TRANSFORM },
  };
}

export { createId };
