import { describe, expect, it } from "vitest";
import { SceneDocumentSchema, type MockupLayer, type SceneDocument } from "@framekit/scene";
import { PREMIUM_TEMPLATES } from "../premiumTemplates";
import { buildStoreSet, STORE_SETS } from "../storeSets";
import { fillScenes, shotFits, takesShots, type MyShot } from "../templateShots";

const phone = (n: number): MyShot => ({ assetId: `phone-${n}`, width: 1179, height: 2556 });
const desktop: MyShot = { assetId: "desktop", width: 2880, height: 1800 };
// sample screens are the size of the store-set renders
const sizeOf = (id: string) =>
  id.startsWith("builtin:sample/") ? (id.includes("/desktop-") ? { width: 2880, height: 1800 } : { width: 1206, height: 2622 }) : undefined;

const mockups = (scene: SceneDocument) => scene.layers.filter((l): l is MockupLayer => l.type === "mockup");
const premium = (slug: string) => PREMIUM_TEMPLATES.find((t) => t.slug === slug)!.build();

describe("templates with your screenshots", () => {
  it("matches screenshots to screens by shape", () => {
    expect(shotFits(phone(1), 1206 / 2622)).toBe(true);
    expect(shotFits(desktop, 1206 / 2622)).toBe(false);
    expect(shotFits(desktop, 3456 / 2234)).toBe(true);
    // a phone screenshot doesn't go in a portrait iPad or a watch
    expect(shotFits(phone(1), 2064 / 2752)).toBe(false);
    expect(shotFits(phone(1), 410 / 502)).toBe(false);
  });

  it("fills each phone of a layout in order and keeps it a valid scene", () => {
    const { scenes, filled } = fillScenes([premium("feature-trio")], [phone(1), phone(2)], sizeOf);
    expect(filled).toBe(3);
    // three different sample screens, two screenshots: the third cycles back
    expect(mockups(scenes[0]).map((m) => m.media?.assetId)).toEqual(["phone-1", "phone-2", "phone-1"]);
    expect(SceneDocumentSchema.safeParse(scenes[0]).success).toBe(true);
    expect(scenes[0].template).toEqual({ id: "feature-trio", pro: false });
  });

  it("puts a desktop screenshot only in the laptop", () => {
    const { scenes, filled } = fillScenes([premium("product-hunt")], [desktop], sizeOf);
    expect(filled).toBe(1);
    const ids = mockups(scenes[0]).map((m) => m.media?.assetId ?? "");
    expect(ids).toContain("desktop");
    expect(ids.some((id) => id.startsWith("builtin:sample/penny"))).toBe(true);
  });

  it("leaves a layout alone when nothing fits", () => {
    const scene = premium("reel-cover");
    expect(takesShots([scene], [desktop], sizeOf)).toBe(false);
    const { scenes, filled } = fillScenes([scene], [desktop], sizeOf);
    expect(filled).toBe(0);
    expect(scenes[0]).toBe(scene);
    expect(takesShots([scene], [], sizeOf)).toBe(false);
  });

  it("keeps a sample screen mapped to the same screenshot across a store set", () => {
    const set = buildStoreSet(STORE_SETS[0], "ios").map((s) => s.scene);
    const samples = new Map<string, string>();
    const { scenes } = fillScenes(set, [phone(1), phone(2), phone(3)], sizeOf);
    set.forEach((scene, i) => {
      mockups(scene).forEach((m, j) => {
        const was = m.media?.assetId;
        const now = mockups(scenes[i])[j].media?.assetId;
        if (!was?.startsWith("builtin:sample/")) return;
        expect(now).toMatch(/^phone-/);
        if (samples.has(was)) expect(now).toBe(samples.get(was));
        samples.set(was, now!);
      });
    });
    expect(new Set(samples.values()).size).toBe(3);
  });

  it("keeps frameless cards the same size and cut", () => {
    const set = buildStoreSet(STORE_SETS[0], "ios").map((s) => s.scene);
    const shot: MyShot = { assetId: "small", width: 603, height: 1311 };
    const { scenes } = fillScenes(set, [shot], sizeOf);
    set.forEach((scene, i) =>
      mockups(scene).forEach((m, j) => {
        if (m.deviceId || !m.media?.crop) return;
        const after = mockups(scenes[i])[j];
        expect(after.media?.crop).toEqual(m.media.crop);
        expect(after.transform.scale).toBeCloseTo(m.transform.scale * 2, 3);
      })
    );
  });

  it("doesn't touch screens that already hold a real screenshot", () => {
    const scene = premium("launch-hero");
    const m = mockups(scene)[0];
    m.media = { ...m.media!, assetId: "already-mine" };
    expect(fillScenes([scene], [phone(1)], sizeOf).filled).toBe(0);
  });
});

describe("store sets are Pro", () => {
  it("flags every shot of every set and platform as a Pro template", () => {
    for (const set of STORE_SETS) {
      for (const platform of ["ios", "android"] as const) {
        for (const { scene } of buildStoreSet(set, platform)) {
          expect(scene.template?.pro).toBe(true);
        }
      }
    }
  });
});
