/**
 * Auto-zoom for screen recordings: where to zoom (from on-screen activity)
 * and a spring camera that glides between zooms the way Screen Studio does.
 * Pure and deterministic, so the preview and the exported file match.
 *
 * Coordinates are fractions of the recording (0..1); times are ms.
 */

export interface ZoomSegment {
  id: string;
  startMs: number;
  endMs: number;
  /** focus point, 0..1 of the recording */
  x: number;
  y: number;
  /** 1 = whole recording; 2 = half the width visible */
  scale: number;
}

/** What changed between two sampled frames. */
export interface ActivitySample {
  t: number;
  /** share of the frame that changed, 0..1 */
  energy: number;
  /** bounding box of the change, 0..1, null when nothing changed */
  box: { x: number; y: number; w: number; h: number } | null;
}

export const MIN_ZOOM = 1.25;
export const MAX_ZOOM = 3;
export const DEFAULT_ZOOM = 1.8;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

let nextId = 0;
export const zoomId = () => `z${Date.now().toString(36)}${(nextId++).toString(36)}`;

/** Keep the zoomed view inside the recording. */
export function clampFocus(x: number, y: number, scale: number): { x: number; y: number } {
  const half = 0.5 / Math.max(1, scale);
  return { x: clamp(x, half, 1 - half), y: clamp(y, half, 1 - half) };
}

/** Sorted, non-overlapping, clamped copy of `segments`. */
export function normalizeZooms(segments: ZoomSegment[], durationMs: number): ZoomSegment[] {
  const sorted = [...segments]
    .map((s) => ({ ...s, scale: clamp(s.scale, MIN_ZOOM, MAX_ZOOM), startMs: clamp(s.startMs, 0, durationMs), endMs: clamp(s.endMs, 0, durationMs) }))
    .filter((s) => s.endMs - s.startMs >= 200)
    .sort((a, b) => a.startMs - b.startMs);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startMs < sorted[i - 1].endMs) sorted[i - 1] = { ...sorted[i - 1], endMs: sorted[i].startMs };
  }
  return sorted.filter((s) => s.endMs - s.startMs >= 200).map((s) => ({ ...s, ...clampFocus(s.x, s.y, s.scale) }));
}

interface DetectOpts {
  /** ignore changes smaller than this (the cursor alone) */
  minEnergy?: number;
  /** ignore changes bigger than this (scrolling, page loads) */
  maxEnergy?: number;
  /** start zooming this early, so the camera arrives as the action starts */
  leadMs?: number;
  /** stay zoomed this long after the action stops */
  holdMs?: number;
}

/**
 * Zooms from activity: bursts of local change (typing, a menu opening, a
 * button reacting to a click) close together in time and space become one
 * zoom on their centre. Whole-screen changes don't zoom.
 */
export function detectZooms(samples: ActivitySample[], durationMs: number, opts: DetectOpts = {}): ZoomSegment[] {
  const { minEnergy = 0.003, maxEnergy = 0.3, leadMs = 450, holdMs = 1300 } = opts;
  type Hit = { t: number; cx: number; cy: number; size: number; e: number };
  const hits: Hit[] = [];
  for (const s of samples) {
    if (!s.box || s.energy < minEnergy || s.energy > maxEnergy) continue;
    if (s.box.w * s.box.h > 0.4) continue;
    hits.push({ t: s.t, cx: s.box.x + s.box.w / 2, cy: s.box.y + s.box.h / 2, size: Math.max(s.box.w, s.box.h), e: s.energy });
  }

  const clusters: Hit[][] = [];
  for (const h of hits) {
    const c = clusters.at(-1);
    const last = c?.at(-1);
    if (c && last && h.t - last.t <= 900) {
      const w = c.reduce((a, x) => a + x.e, 0);
      const mx = c.reduce((a, x) => a + x.cx * x.e, 0) / w;
      const my = c.reduce((a, x) => a + x.cy * x.e, 0) / w;
      if (Math.hypot(h.cx - mx, h.cy - my) <= 0.2) {
        c.push(h);
        continue;
      }
    }
    clusters.push([h]);
  }

  const zooms: ZoomSegment[] = [];
  for (const c of clusters) {
    const w = c.reduce((a, x) => a + x.e, 0);
    const x = c.reduce((a, h) => a + h.cx * h.e, 0) / w;
    const y = c.reduce((a, h) => a + h.cy * h.e, 0) / w;
    const sizes = c.map((h) => h.size).sort((a, b) => a - b);
    const size = sizes[Math.floor(sizes.length / 2)];
    // show the action with room around it
    const scale = clamp(0.45 / Math.max(size, 0.05), 1.4, 2);
    const startMs = Math.max(0, c[0].t - leadMs);
    const endMs = Math.min(durationMs, c.at(-1)!.t + holdMs);
    const prev = zooms.at(-1);
    // a short gap between two zooms on nearly the same spot reads as one zoom
    if (prev && startMs - prev.endMs < 700 && Math.hypot(prev.x - x, prev.y - y) < 0.25) {
      prev.endMs = endMs;
      continue;
    }
    zooms.push({ id: zoomId(), startMs, endMs, x, y, scale: Math.round(scale * 10) / 10 });
  }
  return normalizeZooms(
    zooms.filter((z) => z.endMs - z.startMs >= 1000),
    durationMs
  );
}

/* --------------------------------- camera --------------------------------- */

export interface CameraPose {
  /** centre of the view, 0..1 of the recording */
  x: number;
  y: number;
  scale: number;
}

export interface CameraTrack {
  fps: number;
  poses: CameraPose[];
}

/** Where the camera wants to be at `t`. */
export function cameraTarget(segments: ZoomSegment[], t: number): CameraPose {
  const z = segments.find((s) => t >= s.startMs && t < s.endMs);
  return z ? { x: z.x, y: z.y, scale: z.scale } : { x: 0.5, y: 0.5, scale: 1 };
}

/**
 * Critically damped springs chase the target, sampled at `fps`: the camera
 * eases in, overshoots nothing, and pans straight from one zoom to the next.
 * `omega` sets the speed (higher is snappier).
 */
export function cameraTrack(segments: ZoomSegment[], durationMs: number, fps = 60, omega = 5.6): CameraTrack {
  const n = Math.max(1, Math.ceil((durationMs / 1000) * fps) + 1);
  const dt = 1 / fps;
  const poses: CameraPose[] = [];
  const pos = { x: 0.5, y: 0.5, scale: 1 };
  const vel = { x: 0, y: 0, scale: 0 };
  const keys = ["x", "y", "scale"] as const;
  for (let i = 0; i < n; i++) {
    const target = cameraTarget(segments, (i / fps) * 1000);
    for (let half = 0; half < 2; half++) {
      const h = dt / 2;
      for (const k of keys) {
        // x'' = -2ζω x' - ω²(x - target), ζ = 1
        const acc = -2 * omega * vel[k] - omega * omega * (pos[k] - target[k]);
        vel[k] += acc * h;
        pos[k] += vel[k] * h;
      }
    }
    const scale = Math.max(1, pos.scale);
    poses.push({ ...clampFocus(pos.x, pos.y, scale), scale });
  }
  return { fps, poses };
}

/** The camera at `t`, interpolated between samples. */
export function cameraAt(track: CameraTrack, t: number): CameraPose {
  const f = clamp((t / 1000) * track.fps, 0, track.poses.length - 1);
  const i = Math.floor(f);
  const a = track.poses[i];
  const b = track.poses[Math.min(i + 1, track.poses.length - 1)];
  const k = f - i;
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, scale: a.scale + (b.scale - a.scale) * k };
}

/** The part of the recording the camera shows, as a 0..1 rect. */
export function viewRect(pose: CameraPose): { x: number; y: number; w: number; h: number } {
  const w = 1 / pose.scale;
  return { x: pose.x - w / 2, y: pose.y - w / 2, w, h: w };
}
