import { getDevice } from "@framekit/devices";
import { createMockupLayer, createScene, type SceneDocument } from "@framekit/scene";

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
    const scene = createScene({
      width,
      height,
      background: {
        type: "linear-gradient",
        angle: 145,
        stops: [
          { at: 0, color: "#eef1f6" },
          { at: 1, color: "#d6dbe6" },
        ],
      },
    });
    const layer = createMockupLayer({ deviceId: device.id, media: null });
    layer.transform = { ...layer.transform, scale: Math.round((1 / margin) * 1000) / 1000 };
    layer.shadow = { mode: "adaptive", lightAngle: 90, distance: 40, softness: 90, opacity: 0.26, color: "#0b0b17" };
    scene.id = `scene-device-${device.id}`;
    layer.id = "layer-device";
    scene.layers.push(layer);
    return scene;
  }

  const scene = createScene({ width: 1920, height: 1080 });
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
