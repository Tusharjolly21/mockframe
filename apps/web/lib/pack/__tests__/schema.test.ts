import { describe, expect, it } from "vitest";
import {
  createPack,
  createPackScreen,
  PACK_TARGET_IDS,
  PACK_TARGETS,
  PackDocumentSchema,
} from "../schema";

describe("PackDocument schema", () => {
  it("factory output validates", () => {
    expect(PackDocumentSchema.safeParse(createPack()).success).toBe(true);
  });

  it("targets carry exact store dimensions", () => {
    expect(PACK_TARGETS["appstore-69"]).toMatchObject({ width: 1320, height: 2868, deviceId: "iphone-16-pro-max" });
    expect(PACK_TARGETS["appstore-65"]).toMatchObject({ width: 1284, height: 2778, deviceId: "iphone-16-plus" });
    expect(PACK_TARGETS["appstore-ipad13"]).toMatchObject({ width: 2064, height: 2752, deviceId: "ipad-pro-13" });
    expect(PACK_TARGETS["play-phone"]).toMatchObject({ width: 1080, height: 1920, deviceId: "pixel-9-pro" });
    expect(PACK_TARGETS["play-feature"]).toMatchObject({ width: 1024, height: 500 });
  });

  it("rejects more than 10 screens", () => {
    const pack = createPack();
    pack.screens = Array.from({ length: 11 }, () => createPackScreen());
    expect(PackDocumentSchema.safeParse(pack).success).toBe(false);
  });

  it("rejects zero screens", () => {
    const pack = createPack();
    pack.screens = [];
    expect(PackDocumentSchema.safeParse(pack).success).toBe(false);
  });

  it("default targets: both iPhone sizes + Play on, iPad off", () => {
    const pack = createPack();
    expect(pack.targets).toEqual({
      "appstore-69": true,
      "appstore-65": true,
      "appstore-ipad13": false,
      "play-phone": true,
      "play-feature": true,
    });
  });

  it("captions are per-locale maps", () => {
    const screen = createPackScreen("asset-1");
    expect(screen.captions.en).toEqual({ title: "" });
    expect(screen.assetId).toBe("asset-1");
  });

  it("target ids enumerate exactly the five targets", () => {
    expect([...PACK_TARGET_IDS].sort()).toEqual(
      ["appstore-65", "appstore-69", "appstore-ipad13", "play-feature", "play-phone"].sort()
    );
  });
});
