import { describe, expect, it } from "vitest";
import { createScene, createMockupLayer, createTextLayer, type MockupLayer, type SceneDocument } from "@framekit/scene";
import { getDevice } from "@framekit/devices";
import { arrangeLineup, estimateBox, matchPhysicalScale, resizeCanvas } from "../lineup";

const sizeOf = () => undefined;

function withDevices(ids: string[], w = 1600, h = 1200): SceneDocument {
  const scene = createScene({ width: w, height: h });
  return {
    ...scene,
    layers: ids.map((id) => createMockupLayer({ deviceId: id, frameHeight: getDevice(id)!.frame.height, canvasHeight: h })),
  };
}

const inside = (scene: SceneDocument) =>
  scene.layers.every((l) => {
    const b = estimateBox(l, scene.canvas, sizeOf)!;
    return b.l >= -1 && b.t >= -1 && b.r <= scene.canvas.width + 1 && b.b <= scene.canvas.height + 1;
  });

describe("arrangeLineup", () => {
  it("puts a laptop, phone and tablet side by side, all inside the canvas", () => {
    const scene = arrangeLineup(withDevices(["iphone-17-pro", "macbook-pro-14", "ipad-pro-13"]), sizeOf);
    expect(inside(scene)).toBe(true);
    const [a, b, c] = scene.layers as MockupLayer[];
    // biggest first in the stack (at the back)
    expect(a.deviceId).toBe("macbook-pro-14");
    const xs = new Set([a.transform.x, b.transform.x, c.transform.x]);
    expect(xs.size).toBe(3);
    // the phone is drawn smaller than the laptop but not a speck
    const phone = scene.layers.find((l) => (l as MockupLayer).deviceId === "iphone-17-pro")!;
    const laptop = scene.layers.find((l) => (l as MockupLayer).deviceId === "macbook-pro-14")!;
    const ph = estimateBox(phone, scene.canvas, sizeOf)!;
    const lh = estimateBox(laptop, scene.canvas, sizeOf)!;
    expect(ph.b - ph.t).toBeLessThan(lh.b - lh.t);
    expect(ph.b - ph.t).toBeGreaterThan((lh.b - lh.t) * 0.5);
  });

  it("fits a single device", () => {
    const scene = withDevices(["macbook-pro-14"], 1080, 1920);
    scene.layers[0].transform.scale = 3;
    expect(inside(arrangeLineup(scene, sizeOf))).toBe(true);
  });
});

describe("resizeCanvas", () => {
  it("keeps a phone the same share of the height when the canvas turns landscape", () => {
    const scene = withDevices(["iphone-17-pro"], 1080, 1920);
    const box = estimateBox(scene.layers[0], scene.canvas, sizeOf)!;
    const share = (box.b - box.t) / 1920;
    const next = resizeCanvas(scene, 1920, 1080, sizeOf);
    const nb = estimateBox(next.layers[0], next.canvas, sizeOf)!;
    expect((nb.b - nb.t) / 1080).toBeCloseTo(share, 2);
    expect(inside(next)).toBe(true);
  });

  it("shrinks a wide lineup into a tall canvas without spilling", () => {
    const wide = arrangeLineup(withDevices(["macbook-pro-14", "iphone-17-pro", "ipad-pro-13"]), sizeOf);
    const tall = resizeCanvas(wide, 1080, 1920, sizeOf);
    expect(inside(tall)).toBe(true);
  });

  it("scales text with the devices", () => {
    const scene = withDevices(["iphone-17-pro"], 1080, 1080);
    const text = createTextLayer("Hello");
    text.transform.y = -400;
    scene.layers.push(text);
    const next = resizeCanvas(scene, 2160, 2160, sizeOf);
    expect(next.layers[1].transform.scale).toBeCloseTo(2, 1);
    expect(next.layers[1].transform.y).toBeLessThan(-700);
  });
});

describe("matchPhysicalScale", () => {
  it("draws a laptop larger than the phone it replaces", () => {
    const [phone] = withDevices(["iphone-17-pro"]).layers as MockupLayer[];
    const laptop = { ...phone, deviceId: "macbook-pro-14" };
    const s = matchPhysicalScale(phone, laptop, sizeOf);
    const ph = getDevice("iphone-17-pro")!.frame.height * phone.transform.scale;
    const lw = getDevice("macbook-pro-14")!.frame.width * s;
    expect(lw).toBeGreaterThan(ph);
  });
});
