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
  /** 1 = whole recording; 2 = half the width visible; below 1 pulls back to show more background */
  scale: number;
  /** keep the cursor in view: the camera pans after it while zoomed */
  follow?: boolean;
}

/** What changed between two sampled frames. */
export interface ActivitySample {
  t: number;
  /** share of the frame that changed, 0..1 */
  energy: number;
  /** bounding box of the change, 0..1, null when nothing changed */
  box: { x: number; y: number; w: number; h: number } | null;
}

export const MIN_ZOOM = 0.6;
export const MAX_ZOOM = 4;
export const DEFAULT_ZOOM = 1.8;

/** How the camera moves between zooms. */
export type ZoomMotion = "smooth" | "snappy" | "slow" | "bouncy" | "instant";

export const ZOOM_MOTIONS: { id: ZoomMotion; label: string; hint: string }[] = [
  { id: "smooth", label: "Smooth", hint: "Glides in and out" },
  { id: "snappy", label: "Snappy", hint: "Quick and crisp" },
  { id: "slow", label: "Cinematic", hint: "Slow, film-like moves" },
  { id: "bouncy", label: "Bouncy", hint: "A little overshoot" },
  { id: "instant", label: "Cut", hint: "Jumps straight there" },
];

/** spring speed and damping for each motion (damping 1 = no overshoot) */
const MOTION: Record<ZoomMotion, { omega: number; zeta: number }> = {
  smooth: { omega: 5.6, zeta: 1 },
  snappy: { omega: 10, zeta: 1 },
  slow: { omega: 3.2, zeta: 1 },
  bouncy: { omega: 7.5, zeta: 0.55 },
  instant: { omega: 60, zeta: 1 },
};

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
  /** clicks found in the recording: the strongest reason to zoom */
  clicks?: { t: number; x: number; y: number }[];
  /** bursts of typing */
  typing?: { startMs: number; endMs: number; x: number; y: number }[];
}

/**
 * Zooms from activity: bursts of local change (typing, a menu opening, a
 * button reacting to a click) close together in time and space become one
 * zoom on their centre. Whole-screen changes don't zoom.
 */
export function detectZooms(samples: ActivitySample[], durationMs: number, opts: DetectOpts = {}): ZoomSegment[] {
  const { minEnergy = 0.003, maxEnergy = 0.3, leadMs = 450, holdMs = 1300, clicks = [], typing = [] } = opts;
  type Hit = { t: number; cx: number; cy: number; size: number; e: number; click?: boolean };
  const hits: Hit[] = [];
  for (const s of samples) {
    if (!s.box || s.energy < minEnergy || s.energy > maxEnergy) continue;
    if (s.box.w * s.box.h > 0.4) continue;
    hits.push({ t: s.t, cx: s.box.x + s.box.w / 2, cy: s.box.y + s.box.h / 2, size: Math.max(s.box.w, s.box.h), e: s.energy });
  }
  // a click outweighs any amount of on-screen change; typing comes next
  for (const c of clicks) hits.push({ t: c.t, cx: c.x, cy: c.y, size: 0.2, e: 0.5, click: true });
  for (const b of typing) for (let t = b.startMs; t <= b.endMs; t += 250) hits.push({ t, cx: b.x, cy: b.y, size: 0.22, e: 0.2 });
  hits.sort((a, b) => a.t - b.t);

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

  const zooms: (ZoomSegment & { click?: boolean })[] = [];
  for (const c of clusters) {
    const w = c.reduce((a, x) => a + x.e, 0);
    const x = c.reduce((a, h) => a + h.cx * h.e, 0) / w;
    const y = c.reduce((a, h) => a + h.cy * h.e, 0) / w;
    const sizes = c.map((h) => h.size).sort((a, b) => a - b);
    const size = sizes[Math.floor(sizes.length / 2)];
    // show the action with room around it
    // clicks get a proper close-up; other changes zoom just enough to show them
    const scale = c.some((h) => h.click) ? 1.8 : clamp(0.45 / Math.max(size, 0.05), 1.4, 2);
    const startMs = Math.max(0, c[0].t - leadMs);
    const endMs = Math.min(durationMs, c.at(-1)!.t + holdMs);
    const prev = zooms.at(-1);
    // a short gap between two zooms on nearly the same spot reads as one zoom
    const click = c.some((h) => h.click);
    if (prev && startMs - prev.endMs < 700 && Math.hypot(prev.x - x, prev.y - y) < 0.25) {
      prev.endMs = endMs;
      // a click outranks whatever the zoom was about before
      if (click && !prev.click) Object.assign(prev, { x, y, click });
      prev.scale = Math.max(prev.scale, Math.round(scale * 10) / 10);
      continue;
    }
    zooms.push({ id: zoomId(), startMs, endMs, x, y, scale: Math.round(scale * 10) / 10, click });
  }
  return normalizeZooms(
    zooms.filter((z) => z.endMs - z.startMs >= 1000).map((z) => {
      const { click, ...rest } = z;
      void click;
      return rest;
    }),
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

export interface CameraOpts {
  motion?: ZoomMotion;
  /** where the cursor is at `t` (0..1), for zooms that follow it */
  cursor?: (t: number) => { x: number; y: number; visible: boolean } | null;
}

/**
 * Springs chase the target, sampled at `fps`: the camera eases in and pans
 * straight from one zoom to the next. With the default motion the spring is
 * critically damped, so nothing overshoots.
 *
 * A zoom that follows the cursor keeps it inside the middle of the view: the
 * camera only pans when the cursor heads for the edge, like a cameraman
 * keeping up rather than a camera glued to the pointer.
 */
export function cameraTrack(segments: ZoomSegment[], durationMs: number, fps = 60, opts: CameraOpts = {}): CameraTrack {
  const { omega, zeta } = MOTION[opts.motion ?? "smooth"];
  const n = Math.max(1, Math.ceil((durationMs / 1000) * fps) + 1);
  const dt = 1 / fps;
  const poses: CameraPose[] = [];
  const pos = { x: 0.5, y: 0.5, scale: 1 };
  const vel = { x: 0, y: 0, scale: 0 };
  const keys = ["x", "y", "scale"] as const;
  let follow = null as { id: string; x: number; y: number } | null;
  // step finer than a frame so fast springs stay stable
  const sub = Math.max(2, Math.ceil((omega * dt) / 0.15));
  for (let i = 0; i < n; i++) {
    const t = (i / fps) * 1000;
    const z = segments.find((s) => t >= s.startMs && t < s.endMs);
    const target = z ? { x: z.x, y: z.y, scale: z.scale } : { x: 0.5, y: 0.5, scale: 1 };
    if (z?.follow && opts.cursor) {
      if (follow?.id !== z.id) follow = { id: z.id, x: z.x, y: z.y };
      const c = opts.cursor(t);
      if (c?.visible) {
        // dead zone: the middle 40% of the view
        const half = (0.5 / Math.max(1, z.scale)) * 0.4;
        if (c.x < follow.x - half) follow.x = c.x + half;
        if (c.x > follow.x + half) follow.x = c.x - half;
        if (c.y < follow.y - half) follow.y = c.y + half;
        if (c.y > follow.y + half) follow.y = c.y - half;
        Object.assign(follow, clampFocus(follow.x, follow.y, z.scale));
      }
      target.x = follow.x;
      target.y = follow.y;
    } else follow = null;
    for (let step = 0; step < sub; step++) {
      const h = dt / sub;
      for (const k of keys) {
        // x'' = -2ζω x' - ω²(x - target)
        const acc = -2 * zeta * omega * vel[k] - omega * omega * (pos[k] - target[k]);
        vel[k] += acc * h;
        pos[k] += vel[k] * h;
      }
    }
    const scale = Math.max(MIN_ZOOM * 0.8, pos.scale);
    poses.push({ ...clampFocus(pos.x, pos.y, scale), scale });
  }
  return { fps, poses };
}

/** How fast the camera is moving at `t` (view widths per second, roughly). For motion blur. */
export function cameraSpeed(track: CameraTrack, t: number): number {
  const i = Math.min(track.poses.length - 2, Math.max(0, Math.floor((t / 1000) * track.fps)));
  if (i < 0 || track.poses.length < 2) return 0;
  const a = track.poses[i];
  const b = track.poses[i + 1];
  return (Math.hypot((b.x - a.x) * a.scale, (b.y - a.y) * a.scale) + Math.abs(Math.log(b.scale / a.scale))) * track.fps;
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
