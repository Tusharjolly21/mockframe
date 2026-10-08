import { describe, expect, it } from "vitest";
import { canvasSize, canvasToRecording, DEFAULT_RECORDER_STYLE, stageLayout, stageTransform } from "../compose";

describe("recorder stage", () => {
  it("sizes each shape with even dimensions", () => {
    expect(canvasSize("16:9", 1920)).toEqual({ width: 1920, height: 1080 });
    expect(canvasSize("9:16", 1920)).toEqual({ width: 1080, height: 1920 });
    expect(canvasSize("4:5", 1351).height % 2).toBe(0);
  });

  it("fits the recording inside the padding and window bar", () => {
    const lay = stageLayout(1920, 1080, 2560, 1600, DEFAULT_RECORDER_STYLE);
    expect(lay.window.y).toBeGreaterThan(0);
    expect(lay.window.y + lay.window.h).toBeLessThanOrEqual(1080);
    expect(lay.video.w / lay.video.h).toBeCloseTo(1.6, 2);
    const mid = canvasToRecording(lay.video.x + lay.video.w / 2, lay.video.y + lay.video.h / 2, 1920, 1080, 2560, 1600, DEFAULT_RECORDER_STYLE);
    expect(mid.x).toBeCloseTo(0.5, 2);
    expect(mid.y).toBeCloseTo(0.5, 2);
  });

  it("does nothing at zoom 1 and never shows past the background when zoomed", () => {
    const { video } = stageLayout(1920, 1080, 2560, 1600, DEFAULT_RECORDER_STYLE);
    expect(stageTransform(1920, 1080, video, { x: 0.3, y: 0.3, scale: 1 })).toEqual({ s: 1, ox: 0, oy: 0 });
    for (const [x, y] of [[0, 0], [1, 1], [0.1, 0.9], [0.5, 0.5]]) {
      const t = stageTransform(1920, 1080, video, { x, y, scale: 2.5 });
      expect(t.ox).toBeLessThanOrEqual(0.001);
      expect(t.oy).toBeLessThanOrEqual(0.001);
      expect(t.ox + t.s * 1920).toBeGreaterThanOrEqual(1919.999);
      expect(t.oy + t.s * 1080).toBeGreaterThanOrEqual(1079.999);
    }
  });
});
