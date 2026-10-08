import { describe, expect, it } from "vitest";
import { cursorAt, rawCursorAt, smoothCursor } from "../cursor";
import { buildSoundEvents, DEFAULT_SOUNDS, soundSample } from "../sounds";
import type { CursorTrack } from "../track";
import { cameraAt, cameraTrack } from "../zoom";

const track: CursorTrack = {
  points: [
    { t: 0, x: 0.1, y: 0.1, visible: true, shape: 0 },
    { t: 1000, x: 0.1, y: 0.1, visible: true, shape: 0 },
    { t: 1100, x: 0.6, y: 0.5, visible: true, shape: 0 },
    { t: 3000, x: 0.6, y: 0.5, visible: true, shape: 0 },
  ],
  shapes: [{ w: 10, h: 16, mask: new Uint8Array(160).fill(1) }],
  res: { w: 640, h: 360 },
  w: 10 / 640,
  h: 16 / 360,
};

describe("cursor motion", () => {
  it("interpolates the recorded cursor", () => {
    const p = rawCursorAt(track, 1050);
    expect(p.visible).toBe(true);
    expect(p.x).toBeCloseTo(0.35, 5);
    expect(p.y).toBeCloseTo(0.3, 5);
  });

  it("glides instead of jumping when smoothed, and settles on the target", () => {
    const sm = smoothCursor(track, [], 3000, 60, { smoothing: 0.6, hideIdle: false });
    const mid = cursorAt(sm, 1100);
    expect(mid.x).toBeGreaterThan(0.1);
    expect(mid.x).toBeLessThan(0.55);
    expect(cursorAt(sm, 2500).x).toBeCloseTo(0.6, 2);
    const raw = smoothCursor(track, [], 3000, 60, { smoothing: 0, hideIdle: false });
    expect(cursorAt(raw, 1100).x).toBeCloseTo(0.6, 2);
  });

  it("fades out when idle if asked, and wakes up on a click", () => {
    const sm = smoothCursor(track, [{ id: "c", t: 2900, x: 0.6, y: 0.5 }], 3000, 60, { smoothing: 0.5, hideIdle: true });
    expect(cursorAt(sm, 500).alpha).toBeGreaterThan(0.9);
    expect(cursorAt(sm, 2890).alpha).toBeLessThan(0.35);
    expect(cursorAt(sm, 3000).alpha).toBeGreaterThan(0.4);
    expect(cursorAt(sm, 2960).press).toBeGreaterThan(0.5);
  });
});

describe("sounds", () => {
  it("synthesises every sound as finite, audible, unclipped samples", () => {
    for (const key of ["click:mouse:0", "click:soft:1", "click:trackpad:2", "click:mechanical:3", "click:pop:0", "key:soft:4", "key:mechanical:5", "whoosh:whoosh:in", "whoosh:swish:out"]) {
      const s = soundSample(key);
      let peak = 0;
      for (const v of s) {
        expect(Number.isFinite(v)).toBe(true);
        peak = Math.max(peak, Math.abs(v));
      }
      expect(peak).toBeGreaterThan(0.3);
      expect(peak).toBeLessThanOrEqual(1);
    }
  });

  it("is deterministic", () => {
    expect(Array.from(soundSample("click:mouse:2").slice(0, 200))).toEqual(Array.from(soundSample("click:mouse:2").slice(0, 200)));
  });

  it("schedules clicks, keystrokes and whooshes in order, panned toward where they happen", () => {
    const ev = buildSoundEvents(
      [{ id: "a", t: 1000, x: 0.9, y: 0.5 }],
      [{ startMs: 2000, endMs: 3000, x: 0.5, y: 0.5 }],
      [{ id: "z", startMs: 500, endMs: 4000, x: 0.5, y: 0.5, scale: 2 }],
      { ...DEFAULT_SOUNDS, zoom: "whoosh" },
      6000
    );
    expect(ev.map((e) => e.t)).toEqual([...ev.map((e) => e.t)].sort((a, b) => a - b));
    const click = ev.find((e) => e.key.startsWith("click"))!;
    expect(click.pan).toBeGreaterThan(0.2);
    const keys = ev.filter((e) => e.key.startsWith("key"));
    expect(keys.length).toBeGreaterThanOrEqual(5);
    expect(keys.length).toBeLessThanOrEqual(11);
    expect(ev.filter((e) => e.key.startsWith("whoosh"))).toHaveLength(2);
    expect(buildSoundEvents([{ id: "a", t: 1000, x: 0.5, y: 0.5 }], [], [], { ...DEFAULT_SOUNDS, click: "none", typing: "none" }, 5000)).toEqual([]);
  });
});

describe("zoom motion", () => {
  const zooms = [{ id: "a", startMs: 500, endMs: 2500, x: 0.3, y: 0.3, scale: 2 }];

  it("bounces past the target with the bouncy motion, and not with smooth", () => {
    const smooth = cameraTrack(zooms, 3000, 60, { motion: "smooth" });
    const bouncy = cameraTrack(zooms, 3000, 60, { motion: "bouncy" });
    expect(Math.max(...smooth.poses.map((p) => p.scale))).toBeLessThanOrEqual(2.0001);
    expect(Math.max(...bouncy.poses.map((p) => p.scale))).toBeGreaterThan(2.05);
  });

  it("cuts almost instantly with the cut motion", () => {
    const cut = cameraTrack(zooms, 3000, 60, { motion: "instant" });
    expect(cameraAt(cut, 600).scale).toBeGreaterThan(1.9);
  });

  it("follows the cursor when it heads for the edge of the view", () => {
    const follow = [{ ...zooms[0], follow: true }];
    const cursor = (t: number) => ({ x: t < 1200 ? 0.3 : 0.75, y: 0.3, visible: true });
    const cam = cameraTrack(follow, 3000, 60, { cursor });
    expect(cameraAt(cam, 1100).x).toBeCloseTo(0.3, 1);
    expect(cameraAt(cam, 2400).x).toBeGreaterThan(0.6);
  });

  it("can pull back to show more background", () => {
    const out = cameraTrack([{ id: "o", startMs: 200, endMs: 2500, x: 0.5, y: 0.5, scale: 0.7 }], 3000, 60);
    expect(cameraAt(out, 2000).scale).toBeCloseTo(0.7, 2);
  });
});
