import { describe, expect, it } from "vitest";
import { createMockupLayer, type MockupLayer } from "@framekit/scene";
import { mediaPlacement } from "@framekit/renderer";
import { cropForAspect, dragCrop, withCrop, zoomCrop } from "../adjust";

const W = 1000;
const H = 2000;

function shot(): MockupLayer {
  const l = createMockupLayer({ deviceId: null, frameHeight: 1000, canvasHeight: 1000 });
  return { ...l, transform: { ...l.transform, x: 0, y: 0, scale: 0.5, rotate: 0 }, media: { assetId: "a", kind: "image", fit: "cover", offsetX: 0, offsetY: 0, scale: 1 } };
}

describe("on-canvas crop", () => {
  it("keeps the remaining pixels in place when an edge is cropped", () => {
    const l = shot();
    const next = dragCrop({ x: 0, y: 0, w: 1, h: 1 }, "w", 0.2, 0);
    expect(next).toEqual({ x: 0.2, y: 0, w: 0.8, h: 1 });
    const out = withCrop(l, next, W, H);
    // window centre moved right by 0.1 * 1000px, at layer scale 0.5 → 50 canvas px
    expect(out.transform.x).toBeCloseTo(50);
    expect(out.transform.y).toBeCloseTo(0);
    // the right edge on canvas is unchanged: centre + half width (scaled)
    expect(out.transform.x + (0.8 * W * 0.5) / 2).toBeCloseTo((W * 0.5) / 2);
  });

  it("follows the layer's rotation", () => {
    const l = { ...shot(), transform: { ...shot().transform, rotate: 90 } };
    const out = withCrop(l, { x: 0.2, y: 0, w: 0.8, h: 1 }, W, H);
    expect(out.transform.x).toBeCloseTo(0);
    expect(out.transform.y).toBeCloseTo(50);
  });

  it("never crops past the image or below the minimum", () => {
    const c = dragCrop({ x: 0, y: 0, w: 1, h: 1 }, "se", -5, -5);
    expect(c.w).toBeGreaterThan(0);
    expect(c.h).toBeGreaterThan(0);
    const d = dragCrop({ x: 0.5, y: 0.5, w: 0.5, h: 0.5 }, "nw", -2, -2);
    expect(d).toEqual({ x: 0, y: 0, w: 1, h: 1 });
  });

  it("locks the pixel ratio on corners", () => {
    const c = dragCrop({ x: 0, y: 0, w: 1, h: 0.5 }, "se", -0.4, 0, 1, W / H);
    expect((c.w * W) / (c.h * H)).toBeCloseTo(1);
  });

  it("fits ratio presets inside the image", () => {
    const sq = cropForAspect(1, W, H, { x: 0, y: 0, w: 1, h: 1 });
    expect(sq.w * W).toBeCloseTo(sq.h * H);
    expect(sq.w).toBeLessThanOrEqual(1);
    expect(sq.y).toBeCloseTo(0.25);
  });

  it("clears the crop when it covers the whole image", () => {
    const l = { ...shot(), media: { ...shot().media!, crop: { x: 0.1, y: 0.1, w: 0.5, h: 0.5 } } };
    expect(withCrop(l, { x: 0, y: 0, w: 1, h: 1 }, W, H).media?.crop).toBeUndefined();
  });

  it("zooms the crop window about its centre", () => {
    const { crop, k } = zoomCrop({ x: 0, y: 0, w: 1, h: 1 }, 2);
    expect(k).toBe(2);
    expect(crop).toEqual({ x: 0.25, y: 0.25, w: 0.5, h: 0.5 });
    // can't zoom out past the full image
    expect(zoomCrop({ x: 0.25, y: 0.25, w: 0.5, h: 0.5 }, 0.1).crop.w).toBeCloseTo(1);
  });
});

describe("device placement", () => {
  it("places the cropped region, not the whole image", () => {
    const rect = { x: 0, y: 0, width: 100, height: 100 };
    const asset = { url: "", width: 200, height: 100 };
    const full = mediaPlacement(rect, asset, { assetId: "a", kind: "image", fit: "contain", offsetX: 0, offsetY: 0, scale: 1 });
    expect(full.h).toBeCloseTo(50);
    const cropped = mediaPlacement(rect, asset, { assetId: "a", kind: "image", fit: "contain", offsetX: 0, offsetY: 0, scale: 1, crop: { x: 0, y: 0, w: 0.5, h: 1 } });
    expect(cropped.w).toBeCloseTo(100);
    expect(cropped.h).toBeCloseTo(100);
  });
});
