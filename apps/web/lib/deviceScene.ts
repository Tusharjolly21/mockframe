import { getDevice, type DeviceCategory } from "@framekit/devices";
import { createMockupLayer, createScene, type Background, type SceneDocument } from "@framekit/scene";

type DeviceLike = {
  category: DeviceCategory;
  frame: { width: number; height: number };
  plate?: { width: number; height: number };
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
