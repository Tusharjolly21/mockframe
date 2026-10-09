import { describe, expect, it } from "vitest";
import { getDevice, listDevices } from "@framekit/devices";
import { presentationForDevice } from "../deviceScene";

describe("photo scenes with an editable backdrop", () => {
  const cutouts = listDevices().filter((d) => d.plate?.backdrop);

  it("exist for the iPhone, podium, MacBook and Watch Ultra scenes", () => {
    expect(cutouts.length).toBe(19);
    expect(cutouts.every((d) => d.plate?.fullBleed)).toBe(true);
  });

  it("start on the photo's own backdrop colour as a plain background that Style can replace", () => {
    const device = getDevice("psd-scene-iphone-17-1")!;
    const p = presentationForDevice(device);
    expect(p.background).toEqual({ type: "solid", color: device.plate!.backdrop });
    expect(p.width).toBe(device.plate!.width);
    expect(p.height).toBe(device.plate!.height);
  });

  it("leave scenes whose backdrop is a real photo alone", () => {
    const chair = getDevice("psd-scene-macbook-chair-1")!;
    expect(chair.plate?.backdrop).toBeUndefined();
  });

  it("mark the solid subject so the editor's selection hugs the device, not the whole plate", () => {
    for (const d of cutouts) {
      const r = d.plate!.contentRect;
      expect(r, d.id).toBeDefined();
      expect(r!.x).toBeGreaterThanOrEqual(0);
      expect(r!.y).toBeGreaterThanOrEqual(0);
      expect(r!.x + r!.width).toBeLessThanOrEqual(d.plate!.width);
      expect(r!.y + r!.height).toBeLessThanOrEqual(d.plate!.height);
      // a box as big as the plate would be the bug this fixes
      expect(r!.width * r!.height, d.id).toBeLessThan(d.plate!.width * d.plate!.height);
    }
  });
});
