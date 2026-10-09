import { describe, expect, it } from "vitest";
import { BG_REST, backgroundPose, coverScale, isRest, LIVE_BACKGROUNDS, liveBackgroundAt } from "../backgroundMotion";
import { MOTION_PRESETS, motionPreset } from "../motion";

const W = 1600;
const H = 1000;

/** the background box after offset + scale must still cover the canvas */
function covers(m: { x: number; y: number; scale: number }) {
  const halfW = (W * m.scale) / 2;
  const halfH = (H * m.scale) / 2;
  return halfW - Math.abs(m.x) >= W / 2 - 1e-6 && halfH - Math.abs(m.y) >= H / 2 - 1e-6;
}

describe("live backgrounds", () => {
  it("off is a no-op", () => {
    expect(isRest(liveBackgroundAt("off", 0.3, W, H))).toBe(true);
  });

  it("every style loops seamlessly", () => {
    for (const { id } of LIVE_BACKGROUNDS) {
      const a = liveBackgroundAt(id, 0, W, H);
      const b = liveBackgroundAt(id, 1, W, H);
      expect(b.x).toBeCloseTo(a.x, 6);
      expect(b.y).toBeCloseTo(a.y, 6);
      expect(b.scale).toBeCloseTo(a.scale, 6);
      expect(b.hue).toBeCloseTo(a.hue, 6);
    }
  });

  it("never uncovers the canvas edges", () => {
    for (const { id } of LIVE_BACKGROUNDS) {
      for (let t = 0; t <= 1; t += 0.05) expect(covers(liveBackgroundAt(id, t, W, H)), `${id} @ ${t}`).toBe(true);
    }
  });
});

describe("parallax", () => {
  const parallax = motionPreset("parallax");

  it("is a loop whose background moves against the devices", () => {
    expect(parallax.kind).toBe("loop");
    const t = 0.25;
    const device = parallax.sample(t, H).x ?? 0;
    const bg = parallax.background!(t).x;
    expect(Math.sign(device)).toBe(-Math.sign(bg));
  });

  it("keeps edges covered when combined with any live background", () => {
    for (const { id } of LIVE_BACKGROUNDS) {
      for (let t = 0; t <= 1; t += 0.05) expect(covers(backgroundPose(id, t, W, H, parallax.background!(t)))).toBe(true);
    }
  });

  it("other presets leave the background alone", () => {
    for (const p of MOTION_PRESETS.filter((m) => m.id !== "parallax")) expect(p.background).toBeUndefined();
  });
});

describe("coverScale", () => {
  it("only ever grows the scale", () => {
    expect(coverScale({ ...BG_REST, scale: 1.2 }, W, H).scale).toBe(1.2);
    expect(coverScale({ ...BG_REST, x: 80 }, W, H).scale).toBeCloseTo(1.1);
  });
});
