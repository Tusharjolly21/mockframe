import { describe, expect, it } from "vitest";
import { FORMAT_DIMENSIONS, PROMO_FORMATS, PROMO_FPS, PromoProjectSchema } from "../types";

const valid = {
  templateId: "rise-reveal",
  deviceId: "iphone-16-pro",
  screenshotAssetIds: ["asset_1", "asset_2"],
  texts: ["Hello", "World"],
  accent: "#7c3aed",
  background: "aurora",
  pattern: null,
  format: "9:16",
  durationInFrames: 300,
  music: null,
};

describe("promo types", () => {
  it("fps is 30", () => {
    expect(PROMO_FPS).toBe(30);
  });

  it("every format has exact dimensions", () => {
    expect(FORMAT_DIMENSIONS["9:16"]).toEqual({ width: 1080, height: 1920 });
    expect(FORMAT_DIMENSIONS["1:1"]).toEqual({ width: 1080, height: 1080 });
    expect(FORMAT_DIMENSIONS["16:9"]).toEqual({ width: 1920, height: 1080 });
    expect(PROMO_FORMATS.every((f) => FORMAT_DIMENSIONS[f])).toBe(true);
  });

  it("accepts a valid project", () => {
    expect(PromoProjectSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a non-hex accent", () => {
    expect(PromoProjectSchema.safeParse({ ...valid, accent: "purple" }).success).toBe(false);
  });

  it("rejects an unknown format", () => {
    expect(PromoProjectSchema.safeParse({ ...valid, format: "4:5" }).success).toBe(false);
  });

  it("rejects a duration over 30s (900 frames)", () => {
    expect(PromoProjectSchema.safeParse({ ...valid, durationInFrames: 901 }).success).toBe(false);
  });

  it("requires at least one screenshot and caps at 4", () => {
    expect(PromoProjectSchema.safeParse({ ...valid, screenshotAssetIds: [] }).success).toBe(false);
    expect(PromoProjectSchema.safeParse({ ...valid, screenshotAssetIds: ["a", "b", "c", "d", "e"] }).success).toBe(false);
    expect(PromoProjectSchema.safeParse({ ...valid, screenshotAssetIds: ["a"] }).success).toBe(true);
  });
});
