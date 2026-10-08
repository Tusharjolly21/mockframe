/**
 * The cursor as drawn on top of a recording: smoothed motion, a choice of
 * cursor looks, highlights and click effects. Pure (apart from drawing), so
 * preview and export agree frame for frame.
 */

import type { ClickEvent, CursorTrack } from "./track";

export type CursorStyleId = "original" | "mac" | "white" | "hand" | "neon" | "dot" | "ring" | "glass";
export type ClickEffect = "none" | "ripple" | "pulse" | "burst" | "rings";
export type Highlight = "none" | "halo" | "spotlight";

export interface CursorSettings {
  style: CursorStyleId;
  /** size against the recorded cursor (1 = same size) */
  size: number;
  /** 0 = follow the recording exactly, 1 = very smooth */
  smoothing: number;
  hideIdle: boolean;
  highlight: Highlight;
  clickEffect: ClickEffect;
  /** accent for dots, rings, glows and click effects */
  color: string;
  /** stretch the cursor along fast moves */
  motionBlur: boolean;
}

export const DEFAULT_CURSOR: CursorSettings = {
  style: "mac",
  size: 1.6,
  smoothing: 0.55,
  hideIdle: false,
  highlight: "none",
  clickEffect: "ripple",
  color: "#8b5cf6",
  motionBlur: true,
};

export const CURSOR_STYLES: { id: CursorStyleId; label: string }[] = [
  { id: "original", label: "As recorded" },
  { id: "mac", label: "macOS" },
  { id: "white", label: "White" },
  { id: "hand", label: "Hand" },
  { id: "neon", label: "Neon" },
  { id: "dot", label: "Dot" },
  { id: "ring", label: "Ring" },
  { id: "glass", label: "Glass" },
];

export const CLICK_EFFECTS: { id: ClickEffect; label: string }[] = [
  { id: "ripple", label: "Ripple" },
  { id: "pulse", label: "Pulse" },
  { id: "burst", label: "Burst" },
  { id: "rings", label: "Rings" },
  { id: "none", label: "None" },
];

export const CURSOR_COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#ffffff", "#111827"];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/* --------------------------------- motion --------------------------------- */

export interface CursorPose {
  /** tip, 0..1 of the recording */
  x: number;
  y: number;
  /** 0..1 */
  alpha: number;
  /** velocity, recording widths per second */
  vx: number;
  vy: number;
  /** 0..1: how pressed it looks (a quick squeeze on each click) */
  press: number;
}

export interface SmoothCursor {
  fps: number;
  poses: CursorPose[];
}

/** The recorded cursor at `t`: straight interpolation, no smoothing. */
export function rawCursorAt(track: CursorTrack, t: number): { x: number; y: number; visible: boolean; shape?: number } {
  const pts = track.points;
  if (!pts.length) return { x: 0, y: 0, visible: false };
  let lo = 0;
  let hi = pts.length - 1;
  if (t <= pts[0].t) return pts[0];
  if (t >= pts[hi].t) return pts[hi];
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (pts[mid].t <= t) lo = mid;
    else hi = mid;
  }
  const a = pts[lo];
  const b = pts[hi];
  if (!a.visible || !b.visible) return t - a.t < b.t - t ? a : b;
  const k = (t - a.t) / Math.max(1, b.t - a.t);
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, visible: true, shape: k < 0.5 ? a.shape : b.shape };
}

/**
 * Sample the cursor at `fps`, chased by a critically damped spring for the
 * smooth, gliding look. Fades in and out where it appears, disappears or
 * (with hideIdle) rests.
 */
export function smoothCursor(track: CursorTrack, clicks: ClickEvent[], durationMs: number, fps: number, s: Pick<CursorSettings, "smoothing" | "hideIdle">): SmoothCursor {
  const n = Math.max(1, Math.ceil((durationMs / 1000) * fps) + 1);
  const dt = 1 / fps;
  // smoothing 0 → no spring; 1 → a slow, floaty one
  const omega = s.smoothing <= 0.02 ? Infinity : 30 - 24 * clamp(s.smoothing, 0, 1);
  const poses: CursorPose[] = [];
  const pos = { x: 0, y: 0 };
  const vel = { x: 0, y: 0 };
  let started = false;
  let alpha = 0;
  let lastMove = -Infinity;
  let prevRaw: { x: number; y: number } | null = null;
  const sortedClicks = [...clicks].sort((a, b) => a.t - b.t);
  let ci = 0;
  for (let i = 0; i < n; i++) {
    const t = (i / fps) * 1000;
    const raw = rawCursorAt(track, t);
    if (raw.visible) {
      if (!started || !Number.isFinite(omega)) {
        if (started) {
          vel.x = (raw.x - pos.x) / dt;
          vel.y = (raw.y - pos.y) / dt;
        }
        pos.x = raw.x;
        pos.y = raw.y;
        started = true;
      } else {
        for (let half = 0; half < 2; half++) {
          const h = dt / 2;
          for (const k of ["x", "y"] as const) {
            const acc = -2 * omega * vel[k] - omega * omega * (pos[k] - raw[k]);
            vel[k] += acc * h;
            pos[k] += vel[k] * h;
          }
        }
      }
      if (!prevRaw || Math.hypot(raw.x - prevRaw.x, raw.y - prevRaw.y) > 0.0015) lastMove = t;
      prevRaw = { x: raw.x, y: raw.y };
    }
    // a click wakes an idle cursor too
    while (ci < sortedClicks.length && sortedClicks[ci].t <= t) {
      lastMove = Math.max(lastMove, sortedClicks[ci].t);
      ci++;
    }
    const idle = s.hideIdle && t - lastMove > 1600;
    const want = raw.visible && !idle ? 1 : 0;
    alpha += (want - alpha) * Math.min(1, dt * (want ? 14 : 8));
    poses.push({ x: pos.x, y: pos.y, alpha: started ? alpha : 0, vx: vel.x, vy: vel.y, press: pressAt(sortedClicks, t) });
  }
  return { fps, poses };
}

function pressAt(clicks: ClickEvent[], t: number): number {
  let p = 0;
  for (const c of clicks) {
    const d = t - c.t;
    if (d < -60) break;
    if (d > 260) continue;
    // squeeze down quickly, spring back
    const v = d < 0 ? 1 + d / 60 : d < 90 ? 1 : 1 - (d - 90) / 170;
    p = Math.max(p, clamp(v, 0, 1));
  }
  return p;
}

export function cursorAt(sm: SmoothCursor, t: number): CursorPose {
  const f = clamp((t / 1000) * sm.fps, 0, sm.poses.length - 1);
  const i = Math.floor(f);
  const a = sm.poses[i];
  const b = sm.poses[Math.min(i + 1, sm.poses.length - 1)];
  const k = f - i;
  const mix = (u: number, v: number) => u + (v - u) * k;
  return { x: mix(a.x, b.x), y: mix(a.y, b.y), alpha: mix(a.alpha, b.alpha), vx: mix(a.vx, b.vx), vy: mix(a.vy, b.vy), press: mix(a.press, b.press) };
}

/* -------------------------------- drawing --------------------------------- */

// shapes in a 24-unit box, tip (hotspot) at (0, 0)
const ARROW = "M0 0 L0 21.5 L5.1 16.6 L8.6 24.6 L12.2 23.1 L8.8 15.2 L15.6 15.2 Z";
const HAND =
  "M5.5 2 C5.5 0.6 6.4 0 7.25 0 C8.1 0 9 0.6 9 2 L9 9.5 L9.3 9.5 L9.3 8.6 C9.3 7.4 10.1 6.9 10.9 6.9 C11.7 6.9 12.5 7.4 12.5 8.6 L12.5 10 " +
  "L12.8 10 L12.8 9.4 C12.8 8.3 13.6 7.9 14.3 7.9 C15 7.9 15.8 8.3 15.8 9.4 L15.8 10.8 L16.1 10.8 C16.1 9.9 16.8 9.5 17.4 9.5 " +
  "C18.1 9.5 18.7 10 18.7 10.9 L18.7 16 C18.7 20 16.6 23.5 13 23.5 L10.5 23.5 C8.3 23.5 7 22.6 5.8 21 L1.3 15.2 " +
  "C0.4 14 1.6 12.4 3 13.3 L5.5 15.3 Z";

let arrowPath: Path2D | null = null;
let handPath: Path2D | null = null;
const paths = () => {
  arrowPath ??= new Path2D(ARROW);
  handPath ??= new Path2D(HAND);
  return { arrow: arrowPath, hand: handPath };
};

/** hand's hotspot is the fingertip, not the box corner */
const HOTSPOT: Partial<Record<CursorStyleId, [number, number]>> = { hand: [7.25, 0.4] };

export interface DrawCursorOpts {
  style: CursorStyleId;
  /** tip on the canvas */
  x: number;
  y: number;
  /** cursor height in canvas px */
  height: number;
  alpha: number;
  press: number;
  color: string;
  /** canvas px per second, for the motion stretch */
  vx?: number;
  vy?: number;
}

export function drawCursor(ctx: CanvasRenderingContext2D, o: DrawCursorOpts) {
  if (o.style === "original" || o.alpha <= 0.01) return;
  const unit = o.height / 24;
  const squeeze = 1 - o.press * 0.16;
  ctx.save();
  ctx.globalAlpha = clamp(o.alpha, 0, 1);
  ctx.translate(o.x, o.y);
  // a little stretch along fast moves reads as motion blur
  const speed = Math.hypot(o.vx ?? 0, o.vy ?? 0);
  const stretch = clamp(speed / (o.height * 60), 0, 0.35);
  if (stretch > 0.02) {
    const ang = Math.atan2(o.vy!, o.vx!);
    ctx.rotate(ang);
    ctx.scale(1 + stretch, 1 - stretch * 0.25);
    ctx.rotate(-ang);
  }
  ctx.scale(unit * squeeze, unit * squeeze);
  const hot = HOTSPOT[o.style];
  if (hot) ctx.translate(-hot[0], -hot[1]);
  const { arrow, hand } = paths();

  switch (o.style) {
    case "mac":
    case "white":
    case "neon": {
      ctx.lineJoin = "round";
      if (o.style === "neon") {
        ctx.shadowColor = o.color;
        ctx.shadowBlur = 10 * unit;
      } else {
        ctx.shadowColor = "rgba(0,0,0,0.35)";
        ctx.shadowBlur = 3.5 * unit;
        ctx.shadowOffsetY = 1.2 * unit;
      }
      ctx.lineWidth = 1.7;
      ctx.strokeStyle = o.style === "white" ? "#000" : o.style === "neon" ? "#fff" : "#fff";
      ctx.stroke(arrow);
      ctx.shadowColor = "transparent";
      ctx.fillStyle = o.style === "mac" ? "#000" : o.style === "white" ? "#fff" : o.color;
      ctx.fill(arrow);
      break;
    }
    case "hand": {
      ctx.lineJoin = "round";
      ctx.shadowColor = "rgba(0,0,0,0.35)";
      ctx.shadowBlur = 3.5 * unit;
      ctx.shadowOffsetY = 1.2 * unit;
      ctx.fillStyle = "#fff";
      ctx.fill(hand);
      ctx.shadowColor = "transparent";
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = "#000";
      ctx.stroke(hand);
      break;
    }
    case "dot":
    case "ring":
    case "glass": {
      // round pointers sit centred on the tip
      const r = o.style === "dot" ? 5.5 : 8;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      if (o.style === "dot") {
        ctx.shadowColor = "rgba(0,0,0,0.35)";
        ctx.shadowBlur = 4;
        ctx.fillStyle = o.color;
        ctx.fill();
        ctx.shadowColor = "transparent";
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = "#fff";
        ctx.stroke();
      } else if (o.style === "ring") {
        ctx.lineWidth = 2.6;
        ctx.strokeStyle = o.color;
        ctx.shadowColor = "rgba(0,0,0,0.3)";
        ctx.shadowBlur = 4;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = o.color;
        ctx.fill();
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.28)";
        ctx.shadowColor = "rgba(0,0,0,0.25)";
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowColor = "transparent";
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = "rgba(255,255,255,0.85)";
        ctx.stroke();
      }
      break;
    }
  }
  ctx.restore();
}

/** Soft glow under the cursor. */
export function drawHalo(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, alpha: number) {
  if (alpha <= 0.01) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, withAlpha(color, 0.42 * alpha));
  g.addColorStop(0.6, withAlpha(color, 0.16 * alpha));
  g.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

/** Dim everything in `clip` except a soft circle around the cursor. */
export function drawSpotlight(ctx: CanvasRenderingContext2D, clip: { x: number; y: number; w: number; h: number }, x: number, y: number, radius: number, alpha: number) {
  if (alpha <= 0.01) return;
  const g = ctx.createRadialGradient(x, y, radius * 0.55, x, y, radius * 1.25);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${0.5 * alpha})`);
  ctx.fillStyle = g;
  ctx.fillRect(clip.x, clip.y, clip.w, clip.h);
}

export const CLICK_EFFECT_MS = 620;

/** One click's effect, `age` ms after it. `size` is the cursor height in canvas px. */
export function drawClickEffect(ctx: CanvasRenderingContext2D, effect: ClickEffect, x: number, y: number, age: number, size: number, color: string) {
  if (effect === "none" || age < 0 || age > CLICK_EFFECT_MS) return;
  const k = age / CLICK_EFFECT_MS;
  const out = 1 - (1 - k) ** 3; // ease out
  const fade = (1 - k) ** 1.4;
  ctx.save();
  ctx.lineCap = "round";
  switch (effect) {
    case "ripple": {
      ctx.beginPath();
      ctx.arc(x, y, size * (0.25 + out * 1.15), 0, Math.PI * 2);
      ctx.lineWidth = Math.max(1.5, size * 0.11 * (1 - k * 0.6));
      ctx.strokeStyle = withAlpha(color, 0.9 * fade);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, size * (0.2 + out * 0.7), 0, Math.PI * 2);
      ctx.fillStyle = withAlpha(color, 0.22 * fade);
      ctx.fill();
      break;
    }
    case "pulse": {
      const g = ctx.createRadialGradient(x, y, 0, x, y, size * (0.4 + out * 1.1));
      g.addColorStop(0, withAlpha(color, 0.55 * fade));
      g.addColorStop(1, withAlpha(color, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, size * (0.4 + out * 1.1), 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "burst": {
      ctx.strokeStyle = withAlpha(color, fade);
      ctx.lineWidth = Math.max(1.5, size * 0.1);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
        const r0 = size * (0.35 + out * 0.6);
        const r1 = r0 + size * 0.38 * (1 - k);
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
        ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
        ctx.stroke();
      }
      break;
    }
    case "rings": {
      for (let i = 0; i < 2; i++) {
        const kk = clamp(k * 1.25 - i * 0.25, 0, 1);
        if (kk <= 0 || kk >= 1) continue;
        const o = 1 - (1 - kk) ** 3;
        ctx.beginPath();
        ctx.arc(x, y, size * (0.2 + o * 1.3), 0, Math.PI * 2);
        ctx.lineWidth = Math.max(1.2, size * 0.07);
        ctx.strokeStyle = withAlpha(color, 0.85 * (1 - kk));
        ctx.stroke();
      }
      break;
    }
  }
  ctx.restore();
}

/** `#rrggbb` → rgba() with `a`. */
export function withAlpha(hex: string, a: number) {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(v, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${clamp(a, 0, 1)})`;
}

/** Clicks whose effect is playing at `t`, with their age. */
export function activeClicks(clicks: ClickEvent[], t: number): { click: ClickEvent; age: number }[] {
  const out: { click: ClickEvent; age: number }[] = [];
  for (const c of clicks) {
    const age = t - c.t;
    if (age >= 0 && age <= CLICK_EFFECT_MS) out.push({ click: c, age });
  }
  return out;
}
