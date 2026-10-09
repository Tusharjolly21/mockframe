import { describe, expect, it } from "vitest";
import { createScene, SceneDocumentSchema, type SceneDocument, type ZoomShot } from "@framekit/scene";
import {
  autoZoomShots,
  cameraAt,
  newZoomShot,
  RAMP_MS,
  sampleCameraScene,
  shotEnd,
  shotWeight,
  withZooms,
  zoomClipDuration,
} from "../cameraZoom";

const shot = (o: Partial<ZoomShot> = {}): ZoomShot => ({ id: "s", startMs: 1000, holdMs: 1000, x: 0.5, y: 0.5, zoom: 2, tilt: 0, ...o });

function sceneWithDevices(n: number): SceneDocument {
  const scene = createScene({ width: 1600, height: 1000, background: { type: "solid", color: "#ffffff" } });
  for (let i = 0; i < n; i++) {
    scene.layers.push({
      type: "mockup",
      id: `d${i}`,
      deviceId: "iphone-16-pro",
      media: null,
      transform: { x: -400 + i * 800, y: 0, scale: 1, rotate: 0, tiltX: 0, tiltY: 0, perspective: 1200 },
      shadow: null,
    } as SceneDocument["layers"][number]);
  }
  return scene;
}

describe("shot timing", () => {
  it("ramps in, holds at full, ramps out", () => {
    const s = shot();
    expect(shotWeight(s, 999)).toBe(0);
    expect(shotWeight(s, 1000 + RAMP_MS / 2)).toBeCloseTo(0.5, 5);
    expect(shotWeight(s, 1000 + RAMP_MS + 500)).toBe(1);
    expect(shotWeight(s, shotEnd(s))).toBe(0);
  });

  it("sizes the clip to the last shot plus a tail, at least 2 s", () => {
    expect(zoomClipDuration([])).toBe(2000);
    expect(zoomClipDuration([shot()])).toBeGreaterThanOrEqual(shotEnd(shot()));
  });
});

describe("cameraAt", () => {
  it("is at rest outside any shot", () => {
    expect(cameraAt([shot()], 0)).toMatchObject({ zoom: 1, engage: 0 });
  });

  it("reaches the shot's zoom and focus while holding", () => {
    const cam = cameraAt([shot({ x: 0.2, y: 0.8, zoom: 2.5 })], 1000 + RAMP_MS + 100);
    expect(cam.zoom).toBeCloseTo(2.5);
    expect(cam.fx).toBeCloseTo(0.2);
    expect(cam.fy).toBeCloseTo(0.8);
  });

  it("glides between back-to-back shots without dropping to zoom 1", () => {
    const a = shot({ id: "a", startMs: 0, holdMs: 500, x: 0.2, zoom: 2 });
    const b = shot({ id: "b", startMs: shotEnd(a) - RAMP_MS, holdMs: 500, x: 0.8, zoom: 2 });
    const mid = shotEnd(a) - RAMP_MS / 2;
    const cam = cameraAt([a, b], mid);
    expect(cam.zoom).toBeGreaterThan(1.9);
    expect(cam.fx).toBeGreaterThan(0.2);
    expect(cam.fx).toBeLessThan(0.8);
  });
});

describe("sampleCameraScene", () => {
  it("leaves every layer untouched when the camera is at rest", () => {
    const scene = sceneWithDevices(2);
    const poses = sampleCameraScene(scene, [shot()], 0);
    for (const l of scene.layers) expect(poses.get(l.id)).toEqual(l.transform);
  });

  it("scales around the focus and pulls it toward the centre", () => {
    const scene = sceneWithDevices(2);
    // focus on the left device (x = -400 → 0.25 of the canvas width)
    const poses = sampleCameraScene(scene, [shot({ x: 0.25, zoom: 2 })], 1000 + RAMP_MS + 10);
    const left = poses.get("d0")!;
    const right = poses.get("d1")!;
    expect(left.scale).toBeCloseTo(2);
    expect(Math.abs(left.x)).toBeLessThan(400); // moved toward the centre
    expect(right.x).toBeGreaterThan(800); // pushed out of frame
  });

  it("only tilts devices", () => {
    const scene = sceneWithDevices(1);
    const poses = sampleCameraScene(scene, [shot({ tilt: 12 })], 1000 + RAMP_MS + 10);
    expect(poses.get("d0")!.tiltY).toBeCloseTo(12);
  });
});

describe("building shots", () => {
  it("queues new shots after the existing ones", () => {
    const first = newZoomShot([], 0.3, 0.4);
    const second = newZoomShot([first], 0.7, 0.6);
    expect(second.startMs).toBeGreaterThan(shotEnd(first));
  });

  it("auto-tours each device", () => {
    const shots = autoZoomShots(sceneWithDevices(2));
    expect(shots).toHaveLength(2);
    expect(shots[0].x).toBeCloseTo(0.25);
    expect(shots[1].x).toBeCloseTo(0.75);
  });

  it("stores shots on the timeline in a valid scene, and removes them cleanly", () => {
    const scene = withZooms(sceneWithDevices(1), [shot({ id: "b", startMs: 3000 }), shot({ id: "a", startMs: 500 })]);
    expect(scene.timeline?.zooms?.map((s) => s.id)).toEqual(["a", "b"]);
    expect(SceneDocumentSchema.safeParse(scene).success).toBe(true);
    expect(withZooms(scene, []).timeline?.zooms).toBeUndefined();
  });
});
