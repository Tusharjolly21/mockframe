import { describe, expect, it } from "vitest";
import { getDevice, listDevices } from "@framekit/devices";
import { canRotateDevice, isLandscape, landscapeScreenRect, mediaPlacement } from "@framekit/renderer";
import { MockupLayerSchema } from "@framekit/scene";

describe("landscape devices", () => {
  it("only framed phones and tablets turn", () => {
    expect(canRotateDevice(getDevice("iphone-16-pro")!)).toBe(true);
    for (const d of listDevices()) {
      if (d.plate || !["phone", "tablet"].includes(d.category)) expect(canRotateDevice(d), d.id).toBe(false);
    }
    const phone = getDevice("iphone-16-pro")!;
    expect(isLandscape({ orientation: "landscape" }, phone)).toBe(true);
    expect(isLandscape({}, phone)).toBe(false);
    const browser = listDevices().find((d) => d.category === "browser")!;
    expect(isLandscape({ orientation: "landscape" }, browser)).toBe(false);
  });

  it("lays the screenshot out in the turned screen, same centre", () => {
    const rect = { x: 20, y: 40, width: 400, height: 860 };
    const r = landscapeScreenRect(rect);
    expect(r.width).toBe(860);
    expect(r.height).toBe(400);
    expect(r.x + r.width / 2).toBe(rect.x + rect.width / 2);
    expect(r.y + r.height / 2).toBe(rect.y + rect.height / 2);
    // a 16:9 landscape shot fills the turned screen without being squeezed to portrait
    const placed = mediaPlacement(r, { url: "", width: 1920, height: 1080 }, { assetId: "a", kind: "image", fit: "contain", offsetX: 0, offsetY: 0, scale: 1 });
    expect(placed.w).toBeGreaterThan(placed.h);
  });

  it("orientation is optional on the layer schema", () => {
    const base = { type: "mockup", id: "l", deviceId: "iphone-16-pro", media: null, shadow: null, transform: { x: 0, y: 0, scale: 1, rotate: 0, tiltX: 0, tiltY: 0, perspective: 1200 } };
    expect(MockupLayerSchema.safeParse(base).success).toBe(true);
    expect(MockupLayerSchema.safeParse({ ...base, orientation: "landscape" }).success).toBe(true);
    expect(MockupLayerSchema.safeParse({ ...base, orientation: "sideways" }).success).toBe(false);
  });
});
