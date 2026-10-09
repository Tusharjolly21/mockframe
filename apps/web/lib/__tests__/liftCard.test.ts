import { describe, expect, it } from "vitest";
import { createMockupLayer } from "@framekit/scene";
import { getDevice } from "@framekit/devices";
import { detectCards, liftCard } from "../liftCard";

function screen(w: number, h: number, panels: { x: number; y: number; w: number; h: number }[]) {
  const data = new Uint8ClampedArray(w * h * 4).fill(245);
  for (const p of panels)
    for (let y = p.y; y < p.y + p.h; y++)
      for (let x = p.x; x < p.x + p.w; x++) {
        const i = (y * w + x) * 4;
        data[i] = 40;
        data[i + 1] = 60;
        data[i + 2] = 200;
      }
  return { width: w, height: h, data };
}

describe("detectCards", () => {
  it("finds filled panels, top to bottom", () => {
    const found = detectCards(screen(200, 400, [{ x: 20, y: 200, w: 160, h: 80 }, { x: 20, y: 60, w: 160, h: 100 }]));
    expect(found.length).toBeGreaterThanOrEqual(2);
    expect(found[0].y).toBeCloseTo(60 / 400, 1);
    expect(found[1].y).toBeCloseTo(200 / 400, 1);
    expect(found[0].w).toBeCloseTo(0.8, 1);
  });

  it("returns nothing for a blank screen", () => {
    expect(detectCards(screen(200, 400, []))).toEqual([]);
  });
});

describe("liftCard", () => {
  const device = getDevice("iphone-17-pro")!;
  const layer = createMockupLayer({
    deviceId: device.id,
    frameHeight: device.frame.height,
    canvasHeight: 2000,
    media: { assetId: "a", kind: "image", fit: "cover", offsetX: 0, offsetY: 0, scale: 1 },
  });
  const sizeOf = () => ({ width: 1206, height: 2622 });

  it("crops the same image and floats it larger than the region", () => {
    const card = liftCard(layer, { x: 0.05, y: 0.4, w: 0.9, h: 0.2 }, sizeOf)!;
    expect(card.deviceId).toBeNull();
    expect(card.media?.assetId).toBe("a");
    expect(card.media?.crop).toEqual({ x: 0.05, y: 0.4, w: 0.9, h: 0.2 });
    const drawnW = 1206 * 0.9 * card.transform.scale;
    const regionW = device.frame.screenRect.width * 0.9 * layer.transform.scale;
    expect(drawnW).toBeGreaterThan(regionW);
    expect(card.shadow).not.toBeNull();
  });

  it("slides toward the side it is asked to", () => {
    const left = liftCard(layer, { x: 0.05, y: 0.4, w: 0.9, h: 0.2 }, sizeOf, { side: "left" })!;
    const right = liftCard(layer, { x: 0.05, y: 0.4, w: 0.9, h: 0.2 }, sizeOf, { side: "right" })!;
    expect(left.transform.x).toBeLessThan(0);
    expect(right.transform.x).toBeGreaterThan(0);
  });
});
