"use client";

import { createId, type Layer, type SceneDocument } from "@framekit/scene";
import { useSceneStore, useViewStore } from "./store";

/**
 * Layout operations for the editor's arrange tools: align, distribute,
 * stacking order and an in-app layer clipboard. Alignment works on the
 * layers' RENDERED boxes (devices differ wildly in size and tilt), measured
 * from the live DOM in canvas coordinates, and moves layers by translating
 * their transform, so it is exact whatever the device, scale or rotation.
 */

export interface LayerBox {
  id: string;
  l: number;
  t: number;
  r: number;
  b: number;
}

export type AlignMode = "left" | "center" | "right" | "top" | "middle" | "bottom";

/** rendered bounds of the given layers in canvas pixels (origin top-left) */
export function measureLayerBoxes(ids: string[], canvasWidth: number): LayerBox[] {
  const root = document.querySelector<HTMLElement>("#scene-canvas [data-scene-id]");
  if (!root) return [];
  const rr = root.getBoundingClientRect();
  const k = rr.width / canvasWidth || 1;
  return ids.flatMap((id) => {
    const node = root.querySelector<HTMLElement>(`[data-layer-id="${id}"]`);
    if (!node) return [];
    const r = node.getBoundingClientRect();
    return [{ id, l: (r.left - rr.left) / k, t: (r.top - rr.top) / k, r: (r.right - rr.left) / k, b: (r.bottom - rr.top) / k }];
  });
}

const moveBy = (scene: SceneDocument, deltas: Map<string, { dx: number; dy: number }>): SceneDocument => ({
  ...scene,
  layers: scene.layers.map((l) => {
    const d = deltas.get(l.id);
    if (!d || (!d.dx && !d.dy)) return l;
    return { ...l, transform: { ...l.transform, x: Math.round(l.transform.x + d.dx), y: Math.round(l.transform.y + d.dy) } } as Layer;
  }),
});

/** align to each other (2+ boxes) or to the canvas (1 box) */
export function alignLayers(scene: SceneDocument, boxes: LayerBox[], mode: AlignMode): SceneDocument {
  if (!boxes.length) return scene;
  const ref =
    boxes.length === 1
      ? { l: 0, t: 0, r: scene.canvas.width, b: scene.canvas.height }
      : {
          l: Math.min(...boxes.map((b) => b.l)),
          t: Math.min(...boxes.map((b) => b.t)),
          r: Math.max(...boxes.map((b) => b.r)),
          b: Math.max(...boxes.map((b) => b.b)),
        };
  const deltas = new Map<string, { dx: number; dy: number }>();
  for (const b of boxes) {
    let dx = 0;
    let dy = 0;
    if (mode === "left") dx = ref.l - b.l;
    if (mode === "right") dx = ref.r - b.r;
    if (mode === "center") dx = (ref.l + ref.r) / 2 - (b.l + b.r) / 2;
    if (mode === "top") dy = ref.t - b.t;
    if (mode === "bottom") dy = ref.b - b.b;
    if (mode === "middle") dy = (ref.t + ref.b) / 2 - (b.t + b.b) / 2;
    deltas.set(b.id, { dx, dy });
  }
  return moveBy(scene, deltas);
}

/** equal gaps between 3+ boxes along an axis; the outermost two stay put */
export function distributeLayers(scene: SceneDocument, boxes: LayerBox[], axis: "h" | "v"): SceneDocument {
  if (boxes.length < 3) return scene;
  const lo = (b: LayerBox) => (axis === "h" ? b.l : b.t);
  const size = (b: LayerBox) => (axis === "h" ? b.r - b.l : b.b - b.t);
  const sorted = [...boxes].sort((a, b) => lo(a) + size(a) / 2 - (lo(b) + size(b) / 2));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const span = lo(last) + size(last) - lo(first);
  const gap = (span - sorted.reduce((s, b) => s + size(b), 0)) / (sorted.length - 1);
  const deltas = new Map<string, { dx: number; dy: number }>();
  let cursor = lo(first);
  for (const b of sorted) {
    const d = cursor - lo(b);
    deltas.set(b.id, axis === "h" ? { dx: d, dy: 0 } : { dx: 0, dy: d });
    cursor += size(b) + gap;
  }
  return moveBy(scene, deltas);
}

/** move the given layers to the top (front) or bottom (back) of the stack */
export function restackLayers(scene: SceneDocument, ids: string[], to: "front" | "back"): SceneDocument {
  const picked = scene.layers.filter((l) => ids.includes(l.id));
  const rest = scene.layers.filter((l) => !ids.includes(l.id));
  return { ...scene, layers: to === "front" ? [...rest, ...picked] : [...picked, ...rest] };
}

/* ------------------------------ layer clipboard ------------------------------ */

let clipboard: { layers: Layer[]; pastes: number } | null = null;

export function copyLayers(scene: SceneDocument, ids: string[]): number {
  const layers = scene.layers.filter((l) => ids.includes(l.id));
  if (layers.length) clipboard = { layers: structuredClone(layers), pastes: 0 };
  return layers.length;
}

export const hasCopiedLayers = () => !!clipboard?.layers.length;

/** paste the copied layers with fresh ids (groups stay together), cascading
 *  each repeat paste a little further so copies never stack invisibly */
export function pasteLayers(scene: SceneDocument): { scene: SceneDocument; ids: string[] } {
  if (!clipboard) return { scene, ids: [] };
  clipboard.pastes += 1;
  const off = 40 * clipboard.pastes;
  const groups = new Map<string, string>();
  const copies = clipboard.layers.map((src) => {
    const l = structuredClone(src);
    l.id = createId();
    if (l.group) {
      if (!groups.has(l.group)) groups.set(l.group, `grp-${createId()}`);
      l.group = groups.get(l.group);
    }
    l.transform = { ...l.transform, x: l.transform.x + off, y: l.transform.y + off };
    return l;
  });
  return { scene: { ...scene, layers: [...scene.layers, ...copies] }, ids: copies.map((l) => l.id) };
}

/* ------------------------- selection-level commands ------------------------- */

export type ArrangeAction = AlignMode | "dist-h" | "dist-v" | "front" | "back";

const toast = (msg: string) => window.dispatchEvent(new CustomEvent("framekit:toast", { detail: msg }));

/** run an arrange command on the current selection (one undo step) */
export function runArrange(action: ArrangeAction): void {
  const { selectedIds } = useViewStore.getState();
  if (!selectedIds.length) return;
  const { scene, setScene } = useSceneStore.getState();
  if (action === "front" || action === "back") {
    setScene((s) => restackLayers(s, selectedIds, action));
    return;
  }
  const boxes = measureLayerBoxes(selectedIds, scene.canvas.width);
  if (action === "dist-h" || action === "dist-v") {
    if (boxes.length < 3) {
      toast("Select 3 or more elements to distribute");
      return;
    }
    setScene((s) => distributeLayers(s, boxes, action === "dist-h" ? "h" : "v"));
    return;
  }
  setScene((s) => alignLayers(s, boxes, action));
}
