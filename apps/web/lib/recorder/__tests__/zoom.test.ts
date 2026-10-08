import { describe, expect, it } from "vitest";
import { cameraAt, cameraTrack, clampFocus, detectZooms, normalizeZooms, viewRect, type ActivitySample } from "../zoom";

const quiet = (t: number): ActivitySample => ({ t, energy: 0, box: null });
const local = (t: number, x: number, y: number, size = 0.08, energy = 0.02): ActivitySample => ({ t, energy, box: { x: x - size / 2, y: y - size / 2, w: size, h: size } });

describe("auto zoom detection", () => {
  it("zooms on a burst of local activity and ignores the quiet parts", () => {
    const samples: ActivitySample[] = [];
    for (let t = 0; t <= 10_000; t += 250) {
      if (t >= 2000 && t <= 3500) samples.push(local(t, 0.3, 0.7));
      else samples.push(quiet(t));
    }
    const zooms = detectZooms(samples, 10_000);
    expect(zooms).toHaveLength(1);
    expect(zooms[0].startMs).toBe(1550);
    expect(zooms[0].endMs).toBe(4800);
    expect(zooms[0].x).toBeCloseTo(0.3, 2);
    expect(zooms[0].y).toBeCloseTo(0.7, 2);
    expect(zooms[0].scale).toBeGreaterThanOrEqual(1.5);
  });

  it("skips scrolling and page loads, and the cursor alone", () => {
    const samples = [
      ...[0, 250, 500, 750, 1000].map((t) => ({ t, energy: 0.6, box: { x: 0, y: 0, w: 1, h: 1 } })),
      ...[2000, 2250, 2500, 2750].map((t) => local(t, 0.5, 0.5, 0.01, 0.0005)),
    ];
    expect(detectZooms(samples, 5000)).toEqual([]);
  });

  it("makes separate zooms for actions in different places", () => {
    const samples = [
      ...[1000, 1250, 1500, 1750].map((t) => local(t, 0.2, 0.2)),
      ...[2000, 2250, 2500, 2750].map((t) => local(t, 0.8, 0.8)),
    ];
    const zooms = detectZooms(samples, 8000);
    expect(zooms).toHaveLength(2);
    expect(zooms[0].endMs).toBeLessThanOrEqual(zooms[1].startMs);
  });

  it("with the cursor known, follows it and glides between nearby actions instead of zooming out and back", () => {
    const samples = [
      ...[1000, 1250, 1500, 1750].map((t) => local(t, 0.2, 0.2)),
      ...[3000, 3250, 3500].map((t) => local(t, 0.8, 0.8)),
    ];
    const zooms = detectZooms(samples, 8000, { follow: true });
    expect(zooms).toHaveLength(1);
    expect(zooms[0].follow).toBe(true);
    expect(zooms[0].endMs).toBeGreaterThan(3500);
  });

  it("keeps the view inside the recording", () => {
    expect(clampFocus(0, 1, 2)).toEqual({ x: 0.25, y: 0.75 });
    const [z] = normalizeZooms([{ id: "a", startMs: -100, endMs: 9000, x: 0.99, y: 0.01, scale: 9 }], 5000);
    expect(z).toMatchObject({ startMs: 0, endMs: 5000, scale: 4 });
    const r = viewRect({ ...z, scale: z.scale });
    expect(r.x + r.w).toBeLessThanOrEqual(1);
    expect(r.y).toBeGreaterThanOrEqual(0);
  });
});

describe("spring camera", () => {
  const zooms = [{ id: "a", startMs: 1000, endMs: 3000, x: 0.3, y: 0.3, scale: 2 }];
  const track = cameraTrack(zooms, 6000, 60);

  it("starts wide, eases into the zoom without overshooting, and comes back out", () => {
    expect(cameraAt(track, 0)).toEqual({ x: 0.5, y: 0.5, scale: 1 });
    const scales = track.poses.map((p) => p.scale);
    expect(Math.max(...scales)).toBeLessThanOrEqual(2.0001);
    expect(cameraAt(track, 1100).scale).toBeLessThan(1.5);
    expect(cameraAt(track, 2900).scale).toBeGreaterThan(1.95);
    expect(cameraAt(track, 5900).scale).toBeLessThan(1.02);
    const mid = cameraAt(track, 2900);
    expect(mid.x).toBeCloseTo(0.3, 1);
  });

  it("pans after the cursor while following it", () => {
    const z = [{ id: "a", startMs: 0, endMs: 6000, x: 0.3, y: 0.5, scale: 2, follow: true }];
    const track = cameraTrack(z, 6000, 60, { cursor: (t) => ({ x: t < 2000 ? 0.3 : 0.7, y: 0.5, visible: true }) });
    expect(cameraAt(track, 1900).x).toBeCloseTo(0.3, 1);
    expect(cameraAt(track, 5500).x).toBeGreaterThan(0.6);
  });

  it("is deterministic", () => {
    expect(cameraTrack(zooms, 6000, 60)).toEqual(track);
  });
});
