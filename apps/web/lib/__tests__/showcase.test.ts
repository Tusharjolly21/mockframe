import { describe, expect, it } from "vitest";
import { SceneDocumentSchema, type MockupLayer } from "@framekit/scene";
import { POSTER_TILES, showcaseBeforeAfter, showcasePoster, showcaseShots, type ShowcaseTile } from "../showcase";

const phone = { assetId: "raw", width: 1206, height: 2622, name: "IMG_1.PNG" };
const laptop = { assetId: "raw", width: 2880, height: 1800 };
const palette = ["#1a1a2e", "#7c3aed", "#f5f5f7"];

const mockups = (layers: { type: string }[]) => layers.filter((l): l is MockupLayer => l.type === "mockup");

describe("showcase", () => {
  it("builds four valid shots holding the screenshot", () => {
    for (const img of [phone, laptop]) {
      const shots = showcaseShots(img, palette);
      expect(shots.map((s) => s.key)).toEqual(["photo", "headline", "pair", "hand"]);
      for (const s of shots) {
        expect(SceneDocumentSchema.safeParse(s.scene).success).toBe(true);
        expect(mockups(s.scene.layers).every((m) => m.media?.assetId === "raw")).toBe(true);
      }
    }
  });

  it("tiles the poster with crops that stay inside each image", () => {
    const shots = showcaseShots(phone, palette);
    const tiles: ShowcaseTile[] = shots.map((shot, i) => ({ shot, image: { assetId: `t${i}`, width: 1600 + i * 300, height: 1200 } }));
    const poster = showcasePoster(phone, tiles);
    expect(SceneDocumentSchema.safeParse(poster).success).toBe(true);
    const cards = mockups(poster.layers);
    expect(cards).toHaveLength(1 + POSTER_TILES.length);
    for (const c of cards.slice(1)) {
      const crop = c.media!.crop!;
      expect(crop.x).toBeGreaterThanOrEqual(0);
      expect(crop.y).toBeGreaterThanOrEqual(0);
      expect(crop.x + crop.w).toBeLessThanOrEqual(1.0001);
      expect(crop.y + crop.h).toBeLessThanOrEqual(1.0001);
    }
    // the big tile lands where the layout says: 640 px wide, left edge at 440
    const big = cards[1];
    const crop = big.media!.crop!;
    expect(1600 * crop.w * big.transform.scale).toBeCloseTo(640, 0);
    expect(big.transform.x - 320 + 800).toBeCloseTo(440, 0);
  });

  it("puts the raw screenshot and a device side by side for before / after", () => {
    const scene = showcaseBeforeAfter(phone, palette);
    expect(SceneDocumentSchema.safeParse(scene).success).toBe(true);
    const [before, after] = mockups(scene.layers);
    expect(before.deviceId).toBeNull();
    expect(before.transform.x).toBeLessThan(0);
    expect(after.deviceId).toBe("iphone-17-pro");
    expect(after.transform.x).toBeGreaterThan(0);
  });
});
