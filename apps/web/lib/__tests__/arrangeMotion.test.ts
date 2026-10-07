import { describe, expect, it } from "vitest";
import { createTextLayer, type SceneDocument } from "@framekit/scene";
import { alignLayers, distributeLayers, restackLayers, type LayerBox } from "../arrange";
import { MOTION_PRESETS, sampleScene } from "../motion";

function sceneWith(n: number): SceneDocument {
  const layers = Array.from({ length: n }, (_, i) => {
    const l = createTextLayer(`t${i}`);
    l.id = `l${i}`;
    return l;
  });
  return {
    schemaVersion: 1,
    id: "s",
    canvas: { width: 1000, height: 800, background: { type: "solid", color: "#fff" } },
    layers,
  } as unknown as SceneDocument;
}

const box = (id: string, l: number, t: number, w: number, h: number): LayerBox => ({ id, l, t, r: l + w, b: t + h });

describe("arrange", () => {
  it("aligns a single element to the canvas", () => {
    const s = alignLayers(sceneWith(1), [box("l0", 100, 50, 200, 100)], "right");
    expect(s.layers[0].transform.x).toBe(700); // right edge 300 → 1000
  });

  it("aligns several elements to their shared bounds", () => {
    const s = alignLayers(sceneWith(2), [box("l0", 100, 0, 100, 50), box("l1", 400, 0, 200, 50)], "left");
    expect(s.layers.map((l) => l.transform.x)).toEqual([0, -300]);
  });

  it("distributes with equal gaps and keeps the outer two in place", () => {
    const boxes = [box("l0", 0, 0, 100, 10), box("l1", 150, 0, 100, 10), box("l2", 600, 0, 100, 10)];
    const s = distributeLayers(sceneWith(3), boxes, "h");
    // span 700, sizes 300 → gaps 200: the middle one moves from 150 to 300
    expect(s.layers.map((l) => l.transform.x)).toEqual([0, 150, 0]);
  });

  it("restacks the selection to the front or back", () => {
    expect(restackLayers(sceneWith(3), ["l0"], "front").layers.map((l) => l.id)).toEqual(["l1", "l2", "l0"]);
    expect(restackLayers(sceneWith(3), ["l2"], "back").layers.map((l) => l.id)).toEqual(["l2", "l0", "l1"]);
  });
});

describe("motion presets", () => {
  const scene = sceneWith(1);
  scene.layers[0] = { ...scene.layers[0], type: "mockup" } as never;

  it("loops are seamless: the last pose matches the first", () => {
    for (const p of MOTION_PRESETS.filter((m) => m.kind === "loop")) {
      const a = sampleScene(scene, p, 0).get("l0")!;
      const b = sampleScene(scene, p, 1).get("l0")!;
      for (const k of ["x", "y", "scale", "rotate", "tiltX", "tiltY"] as const) expect(b[k]).toBeCloseTo(a[k], 6);
    }
  });

  it("intros settle exactly on the original layout", () => {
    for (const p of MOTION_PRESETS.filter((m) => m.kind === "intro")) {
      expect(sampleScene(scene, p, 1).get("l0")).toEqual(scene.layers[0].transform);
    }
  });
});
