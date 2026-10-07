import { describe, expect, it } from "vitest";
import { renderAppStorePromo } from "../screens/appstore-promo";
import { defaultScreenDoc, type AppStorePromoDoc } from "../screens/types";
import { wrapText } from "../screens/common";

const FORMATS: [number, number][] = [
  [1920, 1080],
  [1024, 500],
  [1080, 1920],
  [1080, 1350],
  [1080, 1080],
  [1270, 760],
  [1600, 900],
  [1200, 900],
];

const base = () => defaultScreenDoc("appstore-promo") as AppStorePromoDoc;
const texts = (svg: string) => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);

describe("store promo stage layout", () => {
  for (const [w, h] of FORMATS) {
    for (const showcase of ["app", "web", "both"] as const) {
      it(`renders ${w}×${h} (${showcase}) with finite geometry`, () => {
        const svg = renderAppStorePromo({ ...base(), cardWidth: w, cardHeight: h, showcase });
        expect(svg).not.toMatch(/NaN|Infinity|undefined/);
        expect(svg).toContain("ps-bg");
      });
    }
  }

  it("never splits a headline word across lines", () => {
    const doc = { ...base(), subtitle: "Supercalifragilistic productivity", cardWidth: 1080, cardHeight: 1080 };
    const lines = texts(renderAppStorePromo(doc));
    expect(lines.some((l) => l.includes("Supercalifragilistic"))).toBe(true);
  });

  it("keeps the classic card available", () => {
    const svg = renderAppStorePromo({ ...base(), layout: "classic", cardWidth: 1200, cardHeight: 900 });
    expect(svg).not.toContain("ps-bg");
    expect(texts(svg)).toContain("MockFrame");
  });
});

describe("wrapText", () => {
  it("keeps long words whole unless asked to break them", () => {
    expect(wrapText("MockFrame", 92, 300)).toEqual(["MockFrame"]);
    expect(wrapText("MockFrame", 92, 300, true).length).toBeGreaterThan(1);
  });
});
