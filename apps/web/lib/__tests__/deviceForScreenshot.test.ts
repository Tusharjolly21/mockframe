import { describe, expect, it } from "vitest";
import { getDevice } from "@framekit/devices";
import { buildDeviceScene, deviceForScreenshot } from "../deviceScene";

describe("deviceForScreenshot", () => {
  it("keeps an exact phone match and falls back by shape", () => {
    expect(deviceForScreenshot(1320, 2868)).toBe("iphone-16-pro-max");
    expect(deviceForScreenshot(1080, 2400)).toBe("pixel-8a");
    expect(deviceForScreenshot(900, 1800)).toBe("iphone-17-pro");
    expect(deviceForScreenshot(1668, 2420)).toBe("ipad-pro-11");
    expect(deviceForScreenshot(1200, 1200)).toBe("ipad-pro-13-landscape");
    expect(deviceForScreenshot(2880, 1800)).toBe("macbook-pro-14");
    expect(deviceForScreenshot(1920, 1080)).toBe("macbook-pro-16");
    expect(deviceForScreenshot(1920, 7000)).toBe("safari-browser");
  });

  it("only returns devices that exist and build a scene", () => {
    const sizes = [[1179, 2556], [1000, 1000], [2560, 1600], [3000, 1000], [400, 300], [1600, 5000]];
    for (const [w, h] of sizes) {
      const id = deviceForScreenshot(w, h);
      expect(getDevice(id), id).toBeTruthy();
      expect(buildDeviceScene(id)?.layers.some((l) => l.type === "mockup")).toBe(true);
    }
  });
});
