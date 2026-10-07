import { describe, expect, it } from "vitest";
import { TextAnimationSchema, TextLayerSchema, createTextLayer } from "@framekit/scene";
import { blockAnimStyle, pieceAnimStyle, splitPieces, textAnimProgress, typewriterCount } from "../../../../packages/renderer/src/textAnim";

const anim = { type: "fade-up" as const, delayMs: 200, durationMs: 800 };

describe("textAnimProgress", () => {
  it("is finished without a clip time or animation", () => {
    expect(textAnimProgress(anim, null)).toBe(1);
    expect(textAnimProgress(undefined, 300)).toBe(1);
  });
  it("runs from the delay over the duration", () => {
    expect(textAnimProgress(anim, 0)).toBe(0);
    expect(textAnimProgress(anim, 200)).toBe(0);
    expect(textAnimProgress(anim, 600)).toBeCloseTo(0.5);
    expect(textAnimProgress(anim, 5000)).toBe(1);
  });
});

describe("styles", () => {
  it("block animations start hidden and end untouched", () => {
    for (const type of ["fade-up", "blur-in", "pop", "slide"] as const) {
      expect(blockAnimStyle(type, 0)?.opacity).toBe(0);
      expect(blockAnimStyle(type, 1)).toBeNull();
    }
  });
  it("staggers pieces: the first leads, the last trails, all finish together", () => {
    const first = pieceAnimStyle(0.3, 0, 5)?.opacity as number;
    const last = pieceAnimStyle(0.3, 4, 5)?.opacity as number;
    expect(first).toBeGreaterThan(0);
    expect(last).toBe(0);
    expect(pieceAnimStyle(1, 4, 5)).toBeUndefined();
    expect(pieceAnimStyle(0.999, 0, 5)).toBeUndefined();
  });
});

describe("pieces", () => {
  it("splits words keeping whitespace unanimated", () => {
    expect(splitPieces("Ship  it\nnow", "words")).toEqual([
      { text: "Ship", animated: true },
      { text: "  ", animated: false },
      { text: "it", animated: true },
      { text: "\n", animated: false },
      { text: "now", animated: true },
    ]);
  });
  it("splits letters by code point (emoji stay whole)", () => {
    expect(splitPieces("Hi 👋", "letters").map((p) => p.text)).toEqual(["H", "i", " ", "👋"]);
  });
  it("typewriter counts code points", () => {
    expect(typewriterCount("Hi 👋", 0.5)).toBe(2);
    expect(typewriterCount("Hi 👋", 1)).toBe(4);
  });
});

describe("schema", () => {
  it("accepts text layers with and without an animation", () => {
    const layer = createTextLayer();
    expect(TextLayerSchema.safeParse(layer).success).toBe(true);
    expect(TextLayerSchema.safeParse({ ...layer, animation: anim }).success).toBe(true);
    expect(TextAnimationSchema.safeParse({ ...anim, type: "spin" }).success).toBe(false);
  });
});
