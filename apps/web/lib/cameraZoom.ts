import { createId, type Layer, type SceneDocument, type ZoomShot } from "@framekit/scene";

/**
 * Video zoom: a camera that eases in on chosen points of the canvas, holds,
 * and eases back out (the move shots.so is known for). Pure functions of
 * time, like lib/motion.ts: preview and export pose the layers transiently
 * and the scene document only stores the shots (scene.timeline.zooms).
 *
 * The camera moves every layer; the background stays put, which reads as a
 * gentle parallax rather than a flat crop-zoom.
 */

/** ease-in and ease-out time of every shot */
export const RAMP_MS = 700;
/** quiet time after the last shot before the clip ends */
const TAIL_MS = 400;
/** how far a zoom pulls its focus point toward the centre (0 = stays put, 1 = centred) */
const CENTER_PULL = 0.55;
export const MAX_ZOOMS = 12;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export const shotEnd = (s: ZoomShot) => s.startMs + RAMP_MS + s.holdMs + RAMP_MS;

export function sceneZooms(scene: SceneDocument): ZoomShot[] {
  return [...(scene.timeline?.zooms ?? [])].sort((a, b) => a.startMs - b.startMs);
}

/** Clip length: through the last shot plus a short tail, never under 2 s. */
export function zoomClipDuration(zooms: ZoomShot[]): number {
  const end = zooms.reduce((m, s) => Math.max(m, shotEnd(s)), 0);
  return Math.max(2000, Math.ceil((end + TAIL_MS) / 100) * 100);
}

/** How much shot `s` is "on" at time t: 0 → 1 over the ramp in, 1 while holding, 1 → 0 over the ramp out. */
export function shotWeight(s: ZoomShot, tMs: number): number {
  const local = tMs - s.startMs;
  if (local <= 0 || tMs >= shotEnd(s)) return 0;
  if (local < RAMP_MS) return easeInOutCubic(local / RAMP_MS);
  if (local < RAMP_MS + s.holdMs) return 1;
  return easeInOutCubic(1 - (local - RAMP_MS - s.holdMs) / RAMP_MS);
}

export interface CameraState {
  /** zoom factor, 1 = no zoom */
  zoom: number;
  /** focus as a fraction of the canvas */
  fx: number;
  fy: number;
  /** 0..1, how engaged the camera is (drives centring and tilt) */
  engage: number;
  tilt: number;
}

/**
 * The camera at time t. Overlapping shots blend: zoom and focus are weighted
 * by each shot's weight, so back-to-back shots glide from one point to the
 * next instead of snapping out and in again.
 */
export function cameraAt(zooms: ZoomShot[], tMs: number): CameraState {
  let wSum = 0;
  let zoom = 0;
  let fx = 0;
  let fy = 0;
  let tilt = 0;
  let engage = 0;
  for (const s of zooms) {
    const w = shotWeight(s, tMs);
    if (w <= 0) continue;
    wSum += w;
    zoom += w * s.zoom;
    fx += w * s.x;
    fy += w * s.y;
    tilt += w * (s.tilt ?? 0);
    engage = Math.max(engage, w);
  }
  if (wSum === 0) return { zoom: 1, fx: 0.5, fy: 0.5, engage: 0, tilt: 0 };
  // a lone shot ramps 1 → zoom; overlapping shots (weights summing past 1)
  // average their zooms, so a hand-over between two shots never dips out
  const z = wSum >= 1 ? zoom / wSum : 1 + zoom - wSum;
  return {
    zoom: Math.max(1, z),
    fx: fx / wSum,
    fy: fy / wSum,
    engage,
    tilt: (tilt / wSum) * engage,
  };
}

/** Every layer's transform at time t under the camera; layers keep their own scale/rotation. */
export function sampleCameraScene(scene: SceneDocument, zooms: ZoomShot[], tMs: number): Map<string, Layer["transform"]> {
  const cam = cameraAt(zooms, tMs);
  const out = new Map<string, Layer["transform"]>();
  const W = scene.canvas.width;
  const H = scene.canvas.height;
  // focus in layer coordinates (offset from the canvas centre)
  const Fx = (cam.fx - 0.5) * W;
  const Fy = (cam.fy - 0.5) * H;
  const pull = CENTER_PULL * cam.engage;
  for (const l of scene.layers) {
    const t = l.transform;
    const isDevice = l.type === "mockup";
    out.set(l.id, {
      ...t,
      // the focus point drifts toward the centre while everything scales around it
      x: Fx * (1 - pull) + (t.x - Fx) * cam.zoom,
      y: Fy * (1 - pull) + (t.y - Fy) * cam.zoom,
      scale: t.scale * cam.zoom,
      tiltY: isDevice ? clamp(t.tiltY + cam.tilt, -60, 60) : t.tiltY,
      tiltX: isDevice ? clamp(t.tiltX - Math.abs(cam.tilt) * 0.3, -60, 60) : t.tiltX,
    });
  }
  return out;
}

/** A new shot at a canvas point, starting after the existing ones. */
export function newZoomShot(zooms: ZoomShot[], x: number, y: number): ZoomShot {
  const last = zooms.reduce((m, s) => Math.max(m, shotEnd(s)), 0);
  return {
    id: createId(),
    // first shot after a short establishing beat; later ones follow back to back
    startMs: zooms.length ? last + 200 : 500,
    holdMs: 1400,
    x: clamp(x, 0, 1),
    y: clamp(y, 0, 1),
    zoom: 1.8,
    tilt: 0,
  };
}

/**
 * One-click start: a shot on each device (top to bottom, left to right),
 * so a multi-device scene tours its screens. Empty when there are none.
 */
export function autoZoomShots(scene: SceneDocument): ZoomShot[] {
  const W = scene.canvas.width;
  const H = scene.canvas.height;
  const devices = scene.layers
    .filter((l) => l.type === "mockup")
    .map((l) => ({ x: clamp(0.5 + l.transform.x / W, 0.05, 0.95), y: clamp(0.5 + l.transform.y / H, 0.05, 0.95) }))
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .slice(0, 4);
  const shots: ZoomShot[] = [];
  for (const d of devices) shots.push({ ...newZoomShot(shots, d.x, d.y), zoom: devices.length > 1 ? 1.9 : 1.6 });
  return shots;
}

/** The scene with its zoom shots replaced (an empty list removes them). */
export function withZooms(scene: SceneDocument, zooms: ZoomShot[]): SceneDocument {
  const sorted = [...zooms].sort((a, b) => a.startMs - b.startMs).slice(0, MAX_ZOOMS);
  const timeline = scene.timeline ?? { durationMs: zoomClipDuration(sorted), fps: 30 as const, tracks: [] };
  const next = { ...timeline, durationMs: zoomClipDuration(sorted), zooms: sorted };
  if (!sorted.length) delete (next as { zooms?: ZoomShot[] }).zooms;
  return { ...scene, timeline: next };
}
