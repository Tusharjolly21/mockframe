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
});
