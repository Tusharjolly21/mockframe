import { describe, expect, it } from "vitest";
import { BG_CATEGORIES, PRO_BG_CATEGORY_IDS, PRO_BG_FREE_SAMPLES, backgroundCounts, isProBgSwatch } from "../backgrounds";

describe("background library gating", () => {
  it("never locks a collection that isn't Pro", () => {
    for (const category of BG_CATEGORIES.filter((c) => !PRO_BG_CATEGORY_IDS.has(c.id))) {
      for (const swatch of category.swatches) expect(isProBgSwatch(category.id, swatch.id), swatch.id).toBe(false);
    }
  });

  it("leaves the first swatch of every Pro collection free and locks the rest", () => {
    for (const category of BG_CATEGORIES.filter((c) => PRO_BG_CATEGORY_IDS.has(c.id))) {
      category.swatches.forEach((swatch, index) => {
        expect(isProBgSwatch(category.id, swatch.id), `${category.id}/${swatch.id}`).toBe(index >= PRO_BG_FREE_SAMPLES);
      });
    }
  });

  it("treats unknown swatches as free and every Pro collection as non-empty", () => {
    expect(isProBgSwatch("glass", "does-not-exist")).toBe(false);
    for (const id of PRO_BG_CATEGORY_IDS) {
      expect(BG_CATEGORIES.find((c) => c.id === id)?.swatches.length, id).toBeGreaterThan(PRO_BG_FREE_SAMPLES);
    }
  });

  it("counts free and total backgrounds consistently", () => {
    const { total, free } = backgroundCounts();
    expect(total).toBe(BG_CATEGORIES.reduce((n, c) => n + c.swatches.length, 0));
    expect(free).toBeGreaterThan(total / 2);
    expect(free).toBeLessThan(total);
  });
});
