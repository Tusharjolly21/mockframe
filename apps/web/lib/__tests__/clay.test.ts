import { describe, expect, it } from "vitest";
import { MockupLayerSchema, createMockupLayer } from "@framekit/scene";
import { clayMatrix, parseHex } from "../../../../packages/renderer/src/clay";

/** apply a 4×5 feColorMatrix to an opaque rgb pixel */
const apply = (values: string, [r, g, b]: number[]) => {
  const m = values.split(" ").map(Number);
  return [0, 1, 2, 3].map((row) => Math.min(1, m[row * 5] * r + m[row * 5 + 1] * g + m[row * 5 + 2] * b + m[row * 5 + 3] * 1 + m[row * 5 + 4]));
};

describe("clay", () => {
  it("parses short and long hex", () => {
    expect(parseHex("#fff")).toEqual([1, 1, 1]);
    expect(parseHex("#336699")).toEqual([0.2, 0.4, 0.6]);
    expect(parseHex("red")).toBeNull();
  });
  it("turns any frame colour into shades of the clay colour and keeps alpha", () => {
    const m = clayMatrix("#cddbc6");
    expect(m.split(" ")).toHaveLength(20);
    const black = apply(m, [0, 0, 0]);
    const grey = apply(m, [0.6, 0.6, 0.6]);
    expect(black[3]).toBe(1);
    // same hue family: green is the strongest channel for sage
    expect(grey[1]).toBeGreaterThan(grey[0]);
    expect(grey[1]).toBeGreaterThan(grey[2]);
    // shading survives: lit parts are lighter than the bezel
    expect(grey[1]).toBeGreaterThan(black[1]);
  });
  it("is part of the mockup schema (hex only)", () => {
    const layer = createMockupLayer({ deviceId: "iphone-16-pro" });
    expect(MockupLayerSchema.safeParse({ ...layer, clay: { color: "#cddbc6" } }).success).toBe(true);
    expect(MockupLayerSchema.safeParse({ ...layer, clay: { color: "url(#x)" } }).success).toBe(false);
  });
});
