import { describe, expect, it } from "vitest";
import { FrameCache } from "../source";

describe("frame cache", () => {
  it("gives back every frame exactly, keeping only what changed", () => {
    const w = 100;
    const h = 70;
    const frames: Uint8Array[] = [];
    let g = new Uint8Array(w * h).map((_, i) => (i * 7) % 251);
    for (let f = 0; f < 6; f++) {
      g = g.slice();
      // a small change each frame, and a whole-screen one in the middle
      if (f === 3) g.forEach((v, i) => (g[i] = 255 - v));
      else g[(f * 37 + 5) * w + f * 9] = 0;
      frames.push(g);
    }
    const cache = new FrameCache(w, h);
    frames.forEach((fr, i) => cache.add(fr, i * 33));
    expect(cache.ok).toBe(true);
    const out: [Uint8Array, number][] = [];
    for (const [buf, t] of cache.replay()) out.push([buf.slice(), t]);
    expect(out).toHaveLength(frames.length);
    out.forEach(([buf, t], i) => {
      expect(t).toBe(i * 33);
      expect(buf).toEqual(frames[i]);
    });
  });
});
