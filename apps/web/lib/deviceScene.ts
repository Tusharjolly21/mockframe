import { getDevice, suggestDevice, type DeviceCategory } from "@framekit/devices";
import { createMockupLayer, createScene, type Background, type MockupLayer, type SceneDocument } from "@framekit/scene";
import { encodeScreenAsset } from "./screens";
import { defaultScreenDoc, SCREEN_APP_LABELS, type ScreenApp } from "./screens/types";

type DeviceLike = {
  category: DeviceCategory;
  frame: { width: number; height: number };
  plate?: { width: number; height: number; backdrop?: string };
};

/** Device-aware starting compositions keep a fresh editor scene from feeling generic. */
export function presentationForDevice(device: DeviceLike): {
  width: number;
  height: number;
  background: Background;
  backdrop: NonNullable<SceneDocument["canvas"]["backdrop"]>;
} {
  const category = device.category;
  const plate = device.plate;
  if (plate?.backdrop) {
    // a photo scene with its backdrop cut out: start on the photo's own colour, free to restyle
    return { width: plate.width, height: plate.height, background: { type: "solid", color: plate.backdrop }, backdrop: {} };
  }
  const frameRatio = plate ? plate.width / plate.height : device.frame.width / device.frame.height;
  const portrait = frameRatio < 0.82;
  const wide = frameRatio > 1.45;

  if (category === "laptop" || category === "desktop" || category === "browser") {
    return {
      width: 1600,
      height: 1000,
      background: { type: "linear-gradient", angle: 132, stops: [{ at: 0, color: "#0f172a" }, { at: 0.52, color: "#164e63" }, { at: 1, color: "#312e81" }] },
      backdrop: { pattern: { kind: "grid", intensity: 0.22, thickness: 0.35, color: "#bae6fd" }, portrait: { mode: "stage", position: 50, distance: 28 } },
    };
  }
  if (category === "watch") {
    return {
      width: 1200,
      height: 1200,
      background: { type: "radial-gradient", cx: 0.5, cy: 0.32, stops: [{ at: 0, color: "#7c3aed" }, { at: 0.48, color: "#312e81" }, { at: 1, color: "#111827" }] },
      backdrop: { pattern: { kind: "circles", intensity: 0.18, thickness: 0.28, color: "#ddd6fe" }, portrait: { mode: "stage", position: 50, distance: 22 } },
    };
  }
  if (category === "tablet" || (!portrait && !wide)) {
    return {
      width: 1440,
      height: 1200,
      background: { type: "mesh-gradient", seed: 23, colors: ["#082f49", "#0e7490", "#4338ca", "#172554"] },
      backdrop: { pattern: { kind: "waves", intensity: 0.16, thickness: 0.3, color: "#bae6fd" }, portrait: { mode: "stage", position: 50, distance: 24 } },
    };
  }
  return {
    width: 1080,
    height: 1350,
    background: { type: "linear-gradient", angle: 145, stops: [{ at: 0, color: "#312e81" }, { at: 0.55, color: "#7c3aed" }, { at: 1, color: "#0e7490" }] },
    backdrop: { pattern: { kind: "dots", intensity: 0.18, thickness: 0.32, color: "#e0e7ff" }, portrait: { mode: "stage", position: 50, distance: 24 } },
  };
}

/**
 * Build a fresh editor scene holding a single device, ready to receive the
 * user's screenshot. Handles both parametric/SVG frames (16:9 canvas, device
 * scaled to ~78% height like the editor default) and raster photo "scene"
 * devices (canvas sized to the plate aspect with breathing room). Mirrors
 * `initialScene()` in store.ts and `makeSceneDeviceScene()` in screenTemplates.ts
 * so a deep-linked device looks identical to picking it in the editor.
 */
export function buildDeviceScene(deviceId: string): SceneDocument | null {
  const device = getDevice(deviceId);
  if (!device) return null;

  if (device.plate?.fullBleed) {
    // a finished photo: canvas = plate, laid on at scale 1, no margin or shadow
    const presentation = presentationForDevice(device);
    const scene = createScene({ width: device.plate.width, height: device.plate.height, background: presentation.background, backdrop: presentation.backdrop });
    const layer = createMockupLayer({ deviceId: device.id, media: null });
    layer.shadow = { ...layer.shadow!, opacity: 0 };
    scene.id = `scene-device-${device.id}`;
    layer.id = "layer-device";
    scene.layers.push(layer);
    return scene;
  }

  if (device.category === "scene" && device.plate) {
    const margin = 1.22;
    const width = Math.round(device.plate.width * margin);
    const height = Math.round(device.plate.height * margin);
    const presentation = presentationForDevice(device);
    const scene = createScene({ width, height, background: presentation.background, backdrop: presentation.backdrop });
    const layer = createMockupLayer({ deviceId: device.id, media: null });
    layer.transform = { ...layer.transform, scale: Math.round((1 / margin) * 1000) / 1000 };
    layer.shadow = { mode: "adaptive", lightAngle: 90, distance: 40, softness: 90, opacity: 0.26, color: "#0b0b17" };
    scene.id = `scene-device-${device.id}`;
    layer.id = "layer-device";
    scene.layers.push(layer);
    return scene;
  }

  const presentation = presentationForDevice(device);
  const scene = createScene({ width: presentation.width, height: presentation.height, background: presentation.background, backdrop: presentation.backdrop });
  const layer = createMockupLayer({
    deviceId: device.id,
    frameHeight: device.frame.height,
    canvasHeight: scene.canvas.height,
  });
  scene.id = `scene-device-${device.id}`;
  layer.id = "layer-device";
  scene.layers.push(layer);
  return scene;
}

/** The phone the /tools chat-screen deep-links open on. */
const SCREEN_DEVICE_ID = "iphone-16-pro";

export function isScreenApp(value: string): value is ScreenApp {
  return value in SCREEN_APP_LABELS;
}

/**
 * A starting scene for a chat/app screen (the /tools "…chat generator" pages
 * land here via ?screen=<app>): an iPhone holding that app's default screen,
 * ready to edit. Returns null for an unknown app.
 */
export function buildScreenScene(app: ScreenApp): SceneDocument | null {
  const scene = buildDeviceScene(SCREEN_DEVICE_ID);
  if (!scene) return null;
  const layer = scene.layers.find((l): l is MockupLayer => l.type === "mockup");
  if (!layer) return scene;
  layer.media = {
    assetId: encodeScreenAsset(defaultScreenDoc(app)),
    kind: "image",
    fit: "cover",
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  };
  scene.id = `scene-screen-${app}`;
  return scene;
}

/**
 * The device a dropped screenshot reads best in, from its size: an exact
 * screen match when there is one, otherwise the closest-looking common frame
 * (phone, iPad, MacBook, or a browser window for tall full-page web
 * captures). Never a photo scene.
 */
export function deviceForScreenshot(width: number, height: number): string {
  const exact = suggestDevice(width, height);
  if (exact && (exact.category === "phone" || exact.category === "tablet") && !exact.id.includes("psd")) return exact.id;
  const ar = width / height;
  if (ar < 0.4 && width >= 1600) return "safari-browser"; // full-page desktop capture
  if (ar < 0.58) return "iphone-17-pro";
  if (ar < 0.72) return "ipad-pro-11";
  if (ar < 1) return "ipad-pro-13";
  if (ar < 1.42) return "ipad-pro-13-landscape";
  if (ar < 1.68) return "macbook-pro-14";
  return "macbook-pro-16";
}
