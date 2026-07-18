import { describe, expect, it } from "vitest";
import { SceneDocumentSchema } from "@framekit/scene";
import { compileLaunchScene, compilePack, packReadme } from "../compile";
import { createPack, PACK_LAUNCH_SURFACES, PACK_LAUNCH_SURFACE_IDS } from "../schema";

function packWith(surfaces: Partial<Record<string, boolean>>, tagline = "Plan your day, effortlessly") {
  const p = createPack();
  p.appName = "Focusly";
  p.screens[0].assetId = "screen:demo";
  p.launch = { tagline, surfaces: { "product-hunt": false, "og-image": false, "x-post": false, "story": false, ...surfaces } as any };
  return p;
}

describe("compileLaunchScene", () => {
  it("every surface → schema-valid scene at exact dims", () => {
    const p = packWith({});
    for (const id of PACK_LAUNCH_SURFACE_IDS) {
      const scene = compileLaunchScene(p, id);
      expect(SceneDocumentSchema.safeParse(scene).success, id).toBe(true);
      expect(scene.canvas.width, id).toBe(PACK_LAUNCH_SURFACES[id].width);
      expect(scene.canvas.height, id).toBe(PACK_LAUNCH_SURFACES[id].height);
    }
  });
  it("omits the tagline layer when tagline is blank but keeps the headline", () => {
    const p = packWith({}, "");
    const scene = compileLaunchScene(p, "og-image");
    const texts = scene.layers.filter((l) => l.type === "text");
    expect(texts.some((t: any) => t.content === "Focusly")).toBe(true);
    expect(texts.length).toBe(1);
  });
  it("renders without a hero asset (null media)", () => {
    const p = packWith({}); p.screens[0].assetId = null;
    expect(SceneDocumentSchema.safeParse(compileLaunchScene(p, "story")).success).toBe(true);
  });
});

describe("compilePack launch entries", () => {
  it("appends exactly the enabled surfaces under Launch Kit/", () => {
    const p = packWith({ "product-hunt": true, "story": true });
    p.targets = { "appstore-69": false, "appstore-65": false, "appstore-ipad13": false, "play-phone": false, "play-feature": false };
    const paths = compilePack(p).map((e) => e.path);
    expect(paths).toEqual(["Launch Kit/product-hunt-1270x760.png", "Launch Kit/instagram-story-1080x1920.png"]);
  });
  it("emits NO launch entries when launch is absent (back-compat)", () => {
    const p = createPack(); delete (p as any).launch;
    p.appName = "X"; p.screens[0].assetId = "screen:x";
    const paths = compilePack(p).map((e) => e.path);
    expect(paths.every((x) => !x.startsWith("Launch Kit/"))).toBe(true);
  });
  it("emits no launch entries when all surfaces off", () => {
    const p = packWith({});
    expect(compilePack(p).every((e) => !e.path.startsWith("Launch Kit/"))).toBe(true);
  });
});

describe("packReadme", () => {
  it("lists enabled launch surfaces", () => {
    const p = packWith({ "x-post": true });
    const txt = packReadme(p);
    expect(txt).toContain("LAUNCH KIT");
    expect(txt).toContain("x-linkedin-1600x900.png");
    expect(txt).not.toContain("product-hunt-1270x760.png");
  });
});
