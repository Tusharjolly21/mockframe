import { describe, expect, it } from "vitest";
import { PromoProjectSchema } from "../types";
import { createPromoProject, getPromoTemplate, PROMO_TEMPLATE_IDS, PROMO_TEMPLATES } from "../registry";

describe("promo registry", () => {
  it("ships the six templates", () => {
    expect(PROMO_TEMPLATE_IDS).toEqual([
      "rise-reveal",
      "spin-showcase",
      "feature-pop",
      "scroll-story",
      "tilt-parallax",
      "quick-cut",
    ]);
  });

  it("every template has whole-frame durations, a hex accent and at least one text slot", () => {
    for (const t of PROMO_TEMPLATES) {
      expect(Number.isInteger(t.defaultDurationInFrames)).toBe(true);
      expect(t.defaultDurationInFrames).toBeGreaterThan(0);
      expect(t.defaultAccent).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(t.textSlots.length).toBeGreaterThan(0);
    }
  });

  it("template ids are unique", () => {
    expect(new Set(PROMO_TEMPLATE_IDS).size).toBe(PROMO_TEMPLATE_IDS.length);
  });

  it("getPromoTemplate returns undefined for unknown ids", () => {
    expect(getPromoTemplate("nope")).toBeUndefined();
  });

  it("createPromoProject builds a schema-valid project seeded from the template", () => {
    for (const id of PROMO_TEMPLATE_IDS) {
      const p = createPromoProject(id, ["asset_9"]);
      expect(PromoProjectSchema.safeParse(p).success).toBe(true);
      expect(p.screenshotAssetIds).toEqual(["asset_9"]);
      expect(p.format).toBe("9:16");
      const t = getPromoTemplate(id)!;
      expect(p.texts).toEqual(t.textSlots.map((slot) => slot.placeholder));
    }
  });

  it("createPromoProject throws on an unknown template", () => {
    expect(() => createPromoProject("nope", ["asset_1"])).toThrow();
  });
});
