import { describe, expect, it } from "vitest";
import { createPack, PackDocumentSchema, PackSourceSchema, TONE_IDS } from "../schema";

describe("TONE_IDS", () => {
  it("lists the five supported tones", () => {
    expect(TONE_IDS).toEqual(["playful", "professional", "technical", "bold", "minimal"]);
  });
});

describe("PackSourceSchema", () => {
  it("accepts an empty object (all fields optional)", () => {
    expect(PackSourceSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a fully populated source", () => {
    const source = { description: "A calm daily planner.", tone: "playful", audience: "busy professionals" };
    expect(PackSourceSchema.safeParse(source).success).toBe(true);
  });

  it("rejects a description over 600 chars", () => {
    expect(PackSourceSchema.safeParse({ description: "x".repeat(601) }).success).toBe(false);
  });

  it("accepts a description at exactly 600 chars", () => {
    expect(PackSourceSchema.safeParse({ description: "x".repeat(600) }).success).toBe(true);
  });

  it("rejects an audience over 60 chars", () => {
    expect(PackSourceSchema.safeParse({ audience: "x".repeat(61) }).success).toBe(false);
  });

  it("accepts an audience at exactly 60 chars", () => {
    expect(PackSourceSchema.safeParse({ audience: "x".repeat(60) }).success).toBe(true);
  });

  it("rejects an unknown tone id", () => {
    expect(PackSourceSchema.safeParse({ tone: "vaporwave" }).success).toBe(false);
  });

  it("accepts every tone in TONE_IDS", () => {
    for (const tone of TONE_IDS) {
      expect(PackSourceSchema.safeParse({ tone }).success).toBe(true);
    }
  });
});

describe("pack.source back-compat", () => {
  it("createPack has no source and still validates (legacy packs parse)", () => {
    const p = createPack();
    expect((p as { source?: unknown }).source).toBeUndefined();
    expect(PackDocumentSchema.safeParse(p).success).toBe(true);
  });

  it("a pack WITH a valid source validates", () => {
    const p = createPack();
    (p as { source?: unknown }).source = { description: "Focus app", tone: "bold", audience: "students" };
    expect(PackDocumentSchema.safeParse(p).success).toBe(true);
  });

  it("a pack with an invalid source (bad tone) is rejected", () => {
    const p = createPack();
    (p as { source?: unknown }).source = { tone: "vaporwave" };
    expect(PackDocumentSchema.safeParse(p).success).toBe(false);
  });

  it("a pack with an over-cap source description is rejected", () => {
    const p = createPack();
    (p as { source?: unknown }).source = { description: "x".repeat(601) };
    expect(PackDocumentSchema.safeParse(p).success).toBe(false);
  });

  it("a pack with an over-cap source audience is rejected", () => {
    const p = createPack();
    (p as { source?: unknown }).source = { audience: "x".repeat(61) };
    expect(PackDocumentSchema.safeParse(p).success).toBe(false);
  });
});
