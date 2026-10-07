import { describe, expect, it } from "vitest";
import { MAX_MACROBLOCKS, avcCandidates, avcLevel, describeVideo, isVideoSettings, videoBitrate, videoSize } from "../videoSettings";
import { replaySoundEvents } from "../replayAudio";
import type { AnimShot } from "../screens";

const mbs = (w: number, h: number) => Math.ceil(w / 16) * Math.ceil(h / 16);

describe("videoSize", () => {
  it("matches the short side to the resolution", () => {
    expect(videoSize(1080, 1350, "1080p")).toEqual({ width: 1080, height: 1350 });
    expect(videoSize(1080, 1350, "720p")).toEqual({ width: 720, height: 900 });
    expect(videoSize(1080, 1350, "2160p")).toEqual({ width: 2160, height: 2700 });
    expect(videoSize(1920, 1080, "2160p")).toEqual({ width: 3840, height: 2160 });
  });
  it("always returns even dimensions", () => {
    const { width, height } = videoSize(1179, 2556, "1080p");
    expect(width % 2).toBe(0);
    expect(height % 2).toBe(0);
  });
  it("shrinks very tall canvases to stay within H.264 level 5.2", () => {
    const { width, height } = videoSize(1242, 2688, "2160p");
    expect(mbs(width, height)).toBeLessThanOrEqual(MAX_MACROBLOCKS);
    expect(width / height).toBeCloseTo(1242 / 2688, 2);
    expect(width).toBeGreaterThan(1900);
  });
});

describe("avc levels", () => {
  it("picks the lowest level that fits size and rate", () => {
    expect(avcLevel(1280, 720, 30)).toBe("1f"); // 3.1
    expect(avcLevel(1080, 1350, 30)).toBe("28"); // 4.0
    expect(avcLevel(1080, 1350, 60)).toBe("2a"); // 4.2
    expect(avcLevel(2160, 2700, 30)).toBe("33"); // 5.1
    expect(avcLevel(2160, 2700, 60)).toBe("34"); // 5.2
  });
  it("tries High, Main then Baseline, lowest fitting level first", () => {
    const c = avcCandidates(1080, 1350, 60);
    expect(c[0]).toBe("avc1.64002a");
    expect(c).toContain("avc1.4d002a");
    expect(c).toContain("avc1.42e02a");
    expect(c.every((s) => /^avc1\.[0-9a-f]{6}$/.test(s))).toBe(true);
    expect(c.some((s) => s.endsWith("28"))).toBe(false); // level 4.0 can't do 60fps here
  });
});

describe("videoBitrate", () => {
  it("scales with pixels and frame rate within sane bounds", () => {
    expect(videoBitrate(1080, 1350, 60)).toBe(2 * videoBitrate(1080, 1350, 30));
    expect(videoBitrate(320, 240, 30)).toBe(8_000_000);
    expect(videoBitrate(3840, 2160, 60)).toBe(80_000_000);
  });
});

describe("settings", () => {
  it("validates stored settings", () => {
    expect(isVideoSettings({ fps: 60, resolution: "1440p" })).toBe(true);
    expect(isVideoSettings({ fps: 24, resolution: "1080p" })).toBe(false);
    expect(isVideoSettings({ fps: 30, resolution: "8k" })).toBe(false);
    expect(isVideoSettings(null)).toBe(false);
  });
  it("describes the output", () => {
    expect(describeVideo(1080, 1350, { fps: 60, resolution: "2160p" })).toBe("2160×2700 · 60 fps");
  });
});

describe("replaySoundEvents", () => {
  const shot = (p: Partial<AnimShot>): AnimShot => ({ k: 1, typing: false, fadeMs: 0, holdMs: 500, ...p }) as AnimShot;
  it("clicks on every typing-dot phase and pops when a message lands", () => {
    const events = replaySoundEvents([shot({ typing: true, holdMs: 400 }), shot({ k: 2, fadeMs: 100, holdMs: 400 }), shot({ k: 2, settled: true })]);
    expect(events).toEqual([
      { at: 0, kind: "click" },
      { at: 170, kind: "click" },
      { at: 340, kind: "click" },
      { at: 400, kind: "pop" },
    ]);
  });
});
