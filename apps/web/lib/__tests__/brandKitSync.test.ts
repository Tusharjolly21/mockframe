import { describe, expect, it } from "vitest";
import { BrandKitSchema, brandSyncAction, type BrandKitRecord } from "../brandKitSchema";

const kit = (updatedAt: number, accent = "#7c3aed"): BrandKitRecord => ({
  name: "Acme",
  accent,
  logoAssetId: null,
  updatedAt,
});

describe("brandSyncAction", () => {
  it("does nothing when neither side has a kit", () => {
    expect(brandSyncAction(null, null)).toBe("none");
  });

  it("pushes a local-only kit, including one saved before sync existed", () => {
    expect(brandSyncAction(kit(1000), null)).toBe("push");
    expect(brandSyncAction(kit(0), null)).toBe("push");
  });

  it("pulls the cloud kit onto a fresh device", () => {
    expect(brandSyncAction(null, kit(1000))).toBe("pull");
  });

  it("lets the newest edit win", () => {
    expect(brandSyncAction(kit(2000), kit(1000))).toBe("push");
    expect(brandSyncAction(kit(1000), kit(2000))).toBe("pull");
  });

  it("treats a pre-sync local kit as older than any cloud copy", () => {
    expect(brandSyncAction(kit(0, "#ff0000"), kit(1))).toBe("pull");
  });

  it("does nothing when both copies carry the same edit", () => {
    expect(brandSyncAction(kit(1500), kit(1500))).toBe("none");
  });
});

describe("BrandKitSchema", () => {
  it("accepts a valid kit with a logo", () => {
    expect(BrandKitSchema.safeParse({ ...kit(5), logoAssetId: "abc_DEF-123" }).success).toBe(true);
  });

  it("rejects bad colours, oversized names, path-like asset ids and missing timestamps", () => {
    expect(BrandKitSchema.safeParse({ ...kit(5), accent: "red" }).success).toBe(false);
    expect(BrandKitSchema.safeParse({ ...kit(5), name: "x".repeat(41) }).success).toBe(false);
    expect(BrandKitSchema.safeParse({ ...kit(5), logoAssetId: "../assets/other" }).success).toBe(false);
    const noStamp: Partial<BrandKitRecord> = kit(5);
    delete noStamp.updatedAt;
    expect(BrandKitSchema.safeParse(noStamp).success).toBe(false);
  });
});
