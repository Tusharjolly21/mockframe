import { describe, expect, it } from "vitest";
import { createPack, packLaunch, PackDocumentSchema, PACK_LAUNCH_SURFACES, PACK_LAUNCH_SURFACE_IDS } from "../schema";

describe("launch surfaces", () => {
  it("defines all four surfaces with exact dims", () => {
    expect(PACK_LAUNCH_SURFACES["product-hunt"]).toMatchObject({ width: 1270, height: 760, orientation: "landscape" });
    expect(PACK_LAUNCH_SURFACES["og-image"]).toMatchObject({ width: 1200, height: 630 });
    expect(PACK_LAUNCH_SURFACES["x-post"]).toMatchObject({ width: 1600, height: 900 });
    expect(PACK_LAUNCH_SURFACES["story"]).toMatchObject({ width: 1080, height: 1920, orientation: "portrait" });
    expect([...PACK_LAUNCH_SURFACE_IDS].sort()).toEqual(["og-image","product-hunt","story","x-post"]);
  });
  it("every surface file path lives under Launch Kit/", () => {
    for (const id of PACK_LAUNCH_SURFACE_IDS) expect(PACK_LAUNCH_SURFACES[id].file.startsWith("Launch Kit/")).toBe(true);
  });
});

describe("launch pack field", () => {
  it("createPack has launch with all surfaces off and empty tagline", () => {
    const p = createPack();
    expect(p.launch).toEqual({ tagline: "", surfaces: { "product-hunt": false, "og-image": false, "x-post": false, "story": false } });
    expect(PackDocumentSchema.safeParse(p).success).toBe(true);
  });
  it("a legacy pack WITHOUT launch still parses (back-compat)", () => {
    const p = createPack();
    delete (p as { launch?: unknown }).launch;
    expect(PackDocumentSchema.safeParse(p).success).toBe(true);
  });
  it("packLaunch returns defaults for a launch-less pack and the value otherwise", () => {
    const legacy = createPack(); delete (legacy as { launch?: unknown }).launch;
    expect(packLaunch(legacy).surfaces["x-post"]).toBe(false);
    const p = createPack(); p.launch!.tagline = "Ship faster";
    expect(packLaunch(p).tagline).toBe("Ship faster");
  });
  it("rejects tagline over 120 chars", () => {
    const p = createPack(); p.launch!.tagline = "x".repeat(121);
    expect(PackDocumentSchema.safeParse(p).success).toBe(false);
  });
});
