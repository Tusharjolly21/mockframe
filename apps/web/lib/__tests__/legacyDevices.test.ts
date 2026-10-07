import { describe, expect, it } from "vitest";
import { getDevice } from "@framekit/devices";

describe("saved scenes keep their device size", () => {
  it("cropped MacBook Air plates keep the original logical screen width", () => {
    for (const id of ["realistic", "clay"]) {
      expect(getDevice(`macbook-air-13-psd-${id}`)!.frame.screenRect.width).toBeCloseTo(3444.27, 1);
    }
    expect(getDevice("macbook-air-13-psd-vector")!.frame.screenRect.width).toBeCloseTo(3437, 1);
  });

  it("the retired MacBook Pro 16 resolves to a realistic MacBook at its old screen width", () => {
    const d = getDevice("macbook-pro-16-mockup")!;
    expect(d.plate?.src).toContain("macbook-air-13");
    expect(d.frame.screenRect.width).toBeCloseTo(1496, 1);
    expect(d.plate!.screenRect.width).toBeCloseTo(1496, 1);
    expect(d.plate!.screenQuad![1][0] - d.plate!.screenQuad![0][0]).toBeCloseTo(1496, 1);
    // the shared Air device itself is untouched
    expect(getDevice("macbook-air-13-psd-realistic")!.frame.screenRect.width).toBeCloseTo(3444.27, 1);
  });
});
