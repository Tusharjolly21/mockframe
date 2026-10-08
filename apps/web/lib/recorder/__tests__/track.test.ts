import { describe, expect, it } from "vitest";
import { RecordingAnalyzer } from "../track";
import { synthFrames, waypoints } from "./synth";

const W = 640;
const H = 360;

function run(frames: { t: number; gray: Uint8Array }[], durationMs: number) {
  const a = new RecordingAnalyzer(W, H, durationMs);
  for (const f of frames) a.push(f.gray, f.t);
  return a.finish();
}

function errorStats(points: { t: number; x: number; y: number; visible: boolean }[], path: (t: number) => { x: number; y: number } | null) {
  const errs: number[] = [];
  let missing = 0;
  for (const p of points) {
    const truth = path(p.t);
    if (!truth) continue;
    if (!p.visible) {
      missing++;
      continue;
    }
    errs.push(Math.hypot(p.x * W - truth.x, p.y * H - truth.y));
  }
  errs.sort((a, b) => a - b);
  return { median: errs[Math.floor(errs.length / 2)], p95: errs[Math.floor(errs.length * 0.95)], missing, n: errs.length };
}

const tour = waypoints([
  { x: 80, y: 60, at: 0, wait: 600 },
  { x: 400, y: 200, at: 1400, wait: 700 },
  { x: 200, y: 300, at: 2300, wait: 500 },
  { x: 560, y: 90, at: 3300, wait: 900 },
  { x: 320, y: 180, at: 4200, wait: 800 },
]);

describe("cursor tracking", () => {
  it("follows a dark macOS-style arrow across a busy screen", () => {
    const frames = synthFrames({ W, H, fps: 30, durationMs: 5000, path: tour, scale: 0.9 });
    const r = run(frames, 5000);
    expect(r.cursor).not.toBeNull();
    const s = errorStats(r.cursor!.points, tour);
    expect(s.median).toBeLessThan(2.5);
    expect(s.p95).toBeLessThan(4);
    // it can't be found before it first moves; after that it shouldn't get lost
    expect(s.missing).toBeLessThan(25);
  });

  it("follows a white Windows-style arrow too, at a lower frame rate", () => {
    const frames = synthFrames({ W, H, fps: 15, durationMs: 5000, path: tour, look: "win", scale: 0.8 });
    const r = run(frames, 5000);
    const s = errorStats(r.cursor!.points, tour);
    expect(s.median).toBeLessThan(1.5);
    expect(s.p95).toBeLessThan(5);
  });

  it("reports a cursor size close to the real one", () => {
    const frames = synthFrames({ W, H, fps: 30, durationMs: 5000, path: tour, scale: 1 });
    const r = run(frames, 5000);
    expect(r.cursor!.h * H).toBeGreaterThan(12);
    expect(r.cursor!.h * H).toBeLessThan(26);
  });

  it("ignores a blinking icon that never moves", () => {
    const blink = (f: Uint8Array, t: number) => {
      if (Math.floor(t / 500) % 2) for (let y = 300; y < 312; y++) for (let x = 600; x < 610; x++) f[y * W + x] = 20;
    };
    const frames = synthFrames({ W, H, fps: 30, durationMs: 4000, path: () => null, paint: blink });
    const r = run(frames, 4000);
    expect(r.cursor).toBeNull();
  });
});

describe("click detection", () => {
  // a button at (380..440, 190..215) that darkens when pressed at 1700 ms, and a menu that opens at 3600 ms
  const button = (f: Uint8Array, t: number) => {
    const v = t >= 1700 && t < 1850 ? 90 : 170;
    for (let y = 190; y < 215; y++) for (let x = 380; x < 440; x++) f[y * W + x] = v;
    if (t >= 3600) for (let y = 100; y < 170; y++) for (let x = 520; x < 600; x++) f[y * W + x] = 196;
  };

  it("finds the clicks where the screen reacts under a resting cursor", () => {
    const frames = synthFrames({ W, H, fps: 30, durationMs: 5000, path: tour, paint: button });
    const r = run(frames, 5000);
    expect(r.clicks.length).toBe(2);
    expect(Math.abs(r.clicks[0].t - 1650)).toBeLessThan(150);
    expect(r.clicks[0].x * W).toBeCloseTo(400, -1);
    expect(r.clicks[0].y * H).toBeCloseTo(200, -1);
    expect(Math.abs(r.clicks[1].t - 3550)).toBeLessThan(150);
  });

  it("doesn't call a hover a click: a change while the cursor is still moving", () => {
    const hover = (f: Uint8Array, t: number) => {
      // lights up as the cursor passes over, mid-glide
      if (t > 1000 && t < 1300) for (let y = 120; y < 150; y++) for (let x = 230; x < 280; x++) f[y * W + x] = 120;
    };
    const frames = synthFrames({ W, H, fps: 30, durationMs: 5000, path: tour, paint: hover });
    const r = run(frames, 5000);
    expect(r.clicks).toEqual([]);
  });
});

describe("typing detection", () => {
  it("finds a run of keystrokes away from the cursor", () => {
    const typing = (f: Uint8Array, t: number) => {
      // a glyph every 120 ms from 1000 to 2500 ms on one line
      const n = t < 1000 ? 0 : Math.min(13, Math.floor((t - 1000) / 120));
      for (let i = 0; i < n; i++) for (let y = 250; y < 260; y++) for (let x = 250 + i * 7; x < 255 + i * 7; x++) f[y * W + x] = 30;
    };
    const still = () => ({ x: 100, y: 100 });
    const frames = synthFrames({ W, H, fps: 30, durationMs: 3500, path: still, paint: typing });
    const r = run(frames, 3500);
    expect(r.typing).toHaveLength(1);
    expect(r.typing[0].startMs).toBeGreaterThanOrEqual(1000);
    expect(r.typing[0].startMs).toBeLessThan(1200);
    expect(r.typing[0].endMs).toBeGreaterThan(2300);
  });

  it("doesn't mistake a blinking caret for typing", () => {
    const caret = (f: Uint8Array, t: number) => {
      if (Math.floor(t / 530) % 2 === 0) for (let y = 250; y < 262; y++) f[y * W + 300] = 20;
    };
    const frames = synthFrames({ W, H, fps: 30, durationMs: 5000, path: () => ({ x: 100, y: 100 }), paint: caret });
    expect(run(frames, 5000).typing).toEqual([]);
  });
});
