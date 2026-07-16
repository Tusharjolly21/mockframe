import { describe, expect, it } from "vitest";
import { SceneDocumentSchema, type TextLayer } from "@framekit/scene";
import { compileFeatureGraphic, compilePack, compilePackScene, packReadme } from "../compile";
import { createPack, createPackScreen, PACK_STYLE_IDS, PACK_TARGET_IDS, PACK_TARGETS } from "../schema";

function samplePack() {
  const pack = createPack();
  pack.appName = "Focusly";
  pack.screens = [createPackScreen("asset-a"), createPackScreen("asset-b"), createPackScreen("asset-c")];
  pack.screens[0].captions.en = { title: "Plan your day", subtitle: "In seconds" };
  pack.screens[1].captions.en = { title: "Track habits" };
  pack.screens[2].captions.en = { title: "" };
  return pack;
}

describe("compilePackScene", () => {
  it("every style × portrait target yields a schema-valid scene with exact dims", () => {
    const pack = samplePack();
    for (const styleId of PACK_STYLE_IDS) {
      pack.styleId = styleId;
      for (const targetId of PACK_TARGET_IDS.filter((t) => t !== "play-feature")) {
        const scene = compilePackScene(pack, 0, targetId);
        expect(SceneDocumentSchema.safeParse(scene).success, `${styleId}/${targetId}`).toBe(true);
        expect(scene.canvas.width).toBe(PACK_TARGETS[targetId].width);
        expect(scene.canvas.height).toBe(PACK_TARGETS[targetId].height);
      }
    }
  });

  it("uses the target's device and the screen's asset", () => {
    const scene = compilePackScene(samplePack(), 1, "play-phone");
    const mockup = scene.layers.find((l) => l.type === "mockup");
    expect(mockup && mockup.type === "mockup" && mockup.deviceId).toBe("pixel-9-pro");
    expect(mockup && mockup.type === "mockup" && mockup.media?.assetId).toBe("asset-b");
  });

  it("emits title and subtitle text layers with the pack font", () => {
    const scene = compilePackScene(samplePack(), 0, "appstore-69");
    const texts = scene.layers.filter((l): l is TextLayer => l.type === "text");
    expect(texts.map((t) => t.content)).toEqual(["Plan your day", "In seconds"]);
    expect(texts[0].font.family).toBe("Inter");
  });

  it("omits empty captions and hidden devices", () => {
    const pack = samplePack();
    pack.screens[2].overrides.hideDevice = true;
    const scene = compilePackScene(pack, 2, "appstore-69");
    expect(scene.layers).toHaveLength(0);
  });

  it("flipTilt negates the style rotation", () => {
    const pack = samplePack();
    pack.styleId = "tilted-rhythm";
    const plain = compilePackScene(pack, 0, "appstore-69");
    pack.screens[0].overrides.flipTilt = true;
    const flipped = compilePackScene(pack, 0, "appstore-69");
    const rot = (s: typeof plain) => s.layers.find((l) => l.type === "mockup")!.transform.rotate;
    expect(rot(flipped)).toBe(-rot(plain));
  });

  it("panorama style marks the canvas", () => {
    const pack = samplePack();
    pack.styleId = "panorama-flow";
    expect(compilePackScene(pack, 0, "appstore-69").canvas.panoramaBackground).toBe(true);
    pack.styleId = "minimal-light";
    expect(compilePackScene(pack, 0, "appstore-69").canvas.panoramaBackground).toBeUndefined();
  });

  it("style.background override wins over the style default", () => {
    const pack = samplePack();
    pack.style.background = { type: "solid", color: "#123456" };
    expect(compilePackScene(pack, 0, "appstore-69").canvas.background).toEqual({ type: "solid", color: "#123456" });
  });
});

describe("compileFeatureGraphic", () => {
  it("is 1024×500, schema-valid, and shows the app name", () => {
    const scene = compileFeatureGraphic(samplePack());
    expect(SceneDocumentSchema.safeParse(scene).success).toBe(true);
    expect([scene.canvas.width, scene.canvas.height]).toEqual([1024, 500]);
    const text = scene.layers.find((l) => l.type === "text");
    expect(text && text.type === "text" && text.content).toBe("Focusly");
  });
});

describe("compilePack", () => {
  it("orders entries per target with zero-padded names + feature graphic", () => {
    const pack = samplePack();
    pack.targets = { "appstore-69": true, "appstore-65": false, "appstore-ipad13": false, "play-phone": true, "play-feature": true };
    const entries = compilePack(pack);
    expect(entries.map((e) => e.path)).toEqual([
      "App Store/6.9-inch-1320x2868/01.png",
      "App Store/6.9-inch-1320x2868/02.png",
      "App Store/6.9-inch-1320x2868/03.png",
      "Play Store/phone-1080x1920/01.png",
      "Play Store/phone-1080x1920/02.png",
      "Play Store/phone-1080x1920/03.png",
      "Play Store/feature-graphic-1024x500.png",
    ]);
  });

  it("panorama indices span each target group independently", () => {
    const pack = samplePack();
    pack.styleId = "panorama-flow";
    pack.targets = { "appstore-69": true, "appstore-65": true, "appstore-ipad13": false, "play-phone": false, "play-feature": false };
    const entries = compilePack(pack);
    expect(entries.slice(0, 3).map((e) => e.panoramaIdx)).toEqual([0, 1, 2]);
    expect(entries.slice(3, 6).map((e) => e.panoramaIdx)).toEqual([0, 1, 2]);
    expect(entries.every((e) => e.panoramaTotal === 3)).toBe(true);
  });

  it("non-panorama styles emit no panorama indices", () => {
    const entries = compilePack(samplePack());
    expect(entries.every((e) => e.panoramaIdx === undefined)).toBe(true);
  });
});

describe("packReadme", () => {
  it("mentions every enabled folder and failed files", () => {
    const text = packReadme(samplePack(), ["Play Store/phone-1080x1920/02.png"]);
    expect(text).toContain("6.9-inch-1320x2868");
    expect(text).toContain("feature-graphic");
    expect(text).toContain("FAILED");
    expect(text).toContain("Play Store/phone-1080x1920/02.png");
  });
});
