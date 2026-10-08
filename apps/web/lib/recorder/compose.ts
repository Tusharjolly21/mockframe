import type { CameraPose } from "./zoom";

/**
 * Draws one frame of a styled screen recording on a 2D canvas: background,
 * a window (or plain rounded frame) with a soft shadow, the recording inside,
 * and the zoom camera over the whole stage. Shared by preview and export.
 */

export type FrameStyle = "window" | "rounded" | "none";
export type Aspect = "16:9" | "4:3" | "1:1" | "4:5" | "9:16";

export interface RecorderBackground {
  id: string;
  label: string;
  /** linear stops at `angle`, or a radial glow when `radial` */
  stops: string[];
  angle?: number;
  radial?: boolean;
}

export const RECORDER_BACKGROUNDS: RecorderBackground[] = [
  { id: "iris", label: "Iris", stops: ["#1e1b4b", "#6d28d9", "#c084fc"], angle: 135 },
  { id: "ocean", label: "Ocean", stops: ["#082f49", "#0e7490", "#5eead4"], angle: 150 },
  { id: "sunset", label: "Sunset", stops: ["#7c2d12", "#ea580c", "#fbbf24"], angle: 135 },
  { id: "rose", label: "Rose", stops: ["#4c0519", "#be185d", "#f9a8d4"], angle: 140 },
  { id: "forest", label: "Forest", stops: ["#052e16", "#15803d", "#bef264"], angle: 150 },
  { id: "midnight", label: "Midnight", stops: ["#4338ca", "#111827", "#030712"], radial: true },
  { id: "paper", label: "Paper", stops: ["#ffffff", "#e7e5e4"], radial: true },
  { id: "graphite", label: "Graphite", stops: ["#3f3f46", "#18181b"], angle: 160 },
];

export type Entrance = "none" | "fade" | "rise" | "zoom" | "drop";

export const ENTRANCES: { id: Entrance; label: string }[] = [
  { id: "none", label: "None" },
  { id: "fade", label: "Fade" },
  { id: "rise", label: "Rise" },
  { id: "zoom", label: "Zoom" },
  { id: "drop", label: "Drop" },
];

export interface RecorderStyle {
  background: string;
  frame: FrameStyle;
  aspect: Aspect;
  /** space around the recording, as a share of the shorter canvas side */
  padding: number;
  shadow: boolean;
  /** corner roundness, as a share of the shorter canvas side */
  radius: number;
  /** how the window arrives at the start and leaves at the end */
  intro: Entrance;
  outro: Entrance;
  /** blur fast camera moves, like a real camera's shutter */
  motionBlur: boolean;
}

export const DEFAULT_RECORDER_STYLE: RecorderStyle = {
  background: "iris",
  frame: "window",
  aspect: "16:9",
  padding: 0.08,
  shadow: true,
  radius: 0.016,
  intro: "none",
  outro: "none",
  motionBlur: true,
};

const ASPECTS: Record<Aspect, number> = { "16:9": 16 / 9, "4:3": 4 / 3, "1:1": 1, "4:5": 4 / 5, "9:16": 9 / 16 };

/** Output size for an aspect, with the long side at `long` px (even numbers for encoders). */
export function canvasSize(aspect: Aspect, long: number): { width: number; height: number } {
  const r = ASPECTS[aspect];
  const even = (v: number) => Math.round(v / 2) * 2;
  return r >= 1 ? { width: even(long), height: even(long / r) } : { width: even(long * r), height: even(long) };
}

/** Where the window and the recording sit on the canvas, before zoom. */
export function stageLayout(W: number, H: number, srcW: number, srcH: number, style: RecorderStyle) {
  const pad = style.frame === "none" && style.padding === 0 ? 0 : Math.round(Math.min(W, H) * style.padding);
  const bar = style.frame === "window" ? Math.round(Math.min(W, H) * 0.038) : 0;
  const availW = W - pad * 2;
  const availH = H - pad * 2 - bar;
  const s = Math.min(availW / srcW, availH / srcH);
  const vw = Math.round(srcW * s);
  const vh = Math.round(srcH * s);
  const x = Math.round((W - vw) / 2);
  const y = Math.round((H - vh - bar) / 2) + bar;
  const radius = style.frame === "none" ? 0 : Math.round(Math.min(W, H) * (style.radius ?? 0.016));
  return { video: { x, y, w: vw, h: vh }, window: { x, y: y - bar, w: vw, h: vh + bar }, bar, radius };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Paint the background once; drawFrame() stamps it every frame. */
export function paintBackground(ctx: CanvasRenderingContext2D, W: number, H: number, bgId: string) {
  const bg = RECORDER_BACKGROUNDS.find((b) => b.id === bgId) ?? RECORDER_BACKGROUNDS[0];
  let grad: CanvasGradient;
  if (bg.radial) {
    grad = ctx.createRadialGradient(W / 2, H * 0.3, 0, W / 2, H * 0.3, Math.hypot(W, H) * 0.65);
  } else {
    const a = ((bg.angle ?? 135) - 90) * (Math.PI / 180);
    const len = Math.abs(W * Math.cos(a)) + Math.abs(H * Math.sin(a));
    const cx = W / 2;
    const cy = H / 2;
    grad = ctx.createLinearGradient(cx - (Math.cos(a) * len) / 2, cy - (Math.sin(a) * len) / 2, cx + (Math.cos(a) * len) / 2, cy + (Math.sin(a) * len) / 2);
  }
  bg.stops.forEach((c, i) => grad.addColorStop(i / (bg.stops.length - 1), c));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

/**
 * The stage transform for a camera pose: the focus point (in the recording)
 * moves toward the canvas centre as the zoom grows, and the background always
 * covers the canvas.
 */
export function stageTransform(W: number, H: number, video: { x: number; y: number; w: number; h: number }, pose: CameraPose) {
  if (pose.scale < 1) {
    // pulled back: shrink toward the centre, the background stays put
    const s = pose.scale;
    return { s, ox: (W - s * W) / 2, oy: (H - s * H) / 2 };
  }
  const s = Math.max(1, pose.scale);
  const fx = video.x + pose.x * video.w;
  const fy = video.y + pose.y * video.h;
  const pull = 1 - 1 / s;
  let tx = fx + (W / 2 - fx) * pull;
  let ty = fy + (H / 2 - fy) * pull;
  tx = Math.min(s * fx, Math.max(W - s * (W - fx), tx));
  ty = Math.min(s * fy, Math.max(H - s * (H - fy), ty));
  // canvas point p maps to s * (p - f) + t
  return { s, ox: tx - s * fx, oy: ty - s * fy };
}

export interface StageRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FrameOpts {
  /** one pose, or several across the shutter for motion blur (they're averaged) */
  poses: CameraPose[];
  style: RecorderStyle;
  background: HTMLCanvasElement | OffscreenCanvas;
  /** ms into the recording, and its length: drives the entrance and exit */
  t?: number;
  durationMs?: number;
  /** draws on top of the recording, in canvas space before zoom (the cursor, click effects) */
  overlay?: (ctx: CanvasRenderingContext2D, video: StageRect) => void;
  /** draws on top of everything, unzoomed (the camera bubble) */
  top?: (ctx: CanvasRenderingContext2D) => void;
}

const ENTRANCE_MS = 650;

/** How far into the entrance (0 = not arrived, 1 = in place) the window is at `t`. */
function entrance(style: RecorderStyle, t: number | undefined, durationMs: number | undefined): { kind: Entrance; p: number } {
  if (t == null || !durationMs) return { kind: "none", p: 1 };
  const span = Math.min(ENTRANCE_MS, durationMs / 4);
  if (style.intro !== "none" && t < span) return { kind: style.intro, p: t / span };
  if (style.outro !== "none" && durationMs - t < span) return { kind: style.outro, p: Math.max(0, (durationMs - t) / span) };
  return { kind: "none", p: 1 };
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  o: FrameOpts
) {
  const { style } = o;
  const lay = stageLayout(W, H, srcW, srcH, style);
  const unit = Math.min(W, H);
  const enter = entrance(style, o.t, o.durationMs);
  const e = 1 - (1 - enter.p) ** 3;

  o.poses.forEach((pose, i) => {
    const { s, ox, oy } = stageTransform(W, H, lay.video, pose);
    ctx.save();
    ctx.globalAlpha = 1 / (i + 1);
    // the background zooms with the stage, but never shrinks
    if (s >= 1) ctx.setTransform(s, 0, 0, s, ox, oy);
    else ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(o.background as CanvasImageSource, 0, 0, W, H);
    ctx.setTransform(s, 0, 0, s, ox, oy);

    const win = lay.window;
    if (enter.kind !== "none" && enter.p < 1) {
      const cx = win.x + win.w / 2;
      const cy = win.y + win.h / 2;
      ctx.globalAlpha *= enter.kind === "fade" ? e : Math.min(1, e * 1.6);
      if (enter.kind === "rise") ctx.translate(0, (1 - e) * H * 0.12);
      if (enter.kind === "drop") ctx.translate(0, -(1 - e) * H * 0.12);
      if (enter.kind === "zoom") {
        const k = 0.82 + 0.18 * e;
        ctx.translate(cx, cy);
        ctx.scale(k, k);
        ctx.translate(-cx, -cy);
      }
    }

    if (style.shadow && style.frame !== "none") {
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
      ctx.shadowBlur = unit * 0.06;
      ctx.shadowOffsetY = unit * 0.022;
      roundRect(ctx, win.x, win.y, win.w, win.h, lay.radius);
      ctx.fillStyle = "#0b0b0f";
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    roundRect(ctx, win.x, win.y, win.w, win.h, lay.radius);
    ctx.clip();
    if (lay.bar) {
      ctx.fillStyle = "#1c1c22";
      ctx.fillRect(win.x, win.y, win.w, lay.bar);
      const dot = lay.bar * 0.26;
      ["#ff5f57", "#febc2e", "#28c840"].forEach((c, j) => {
        ctx.beginPath();
        ctx.arc(win.x + lay.bar * 0.62 + j * dot * 3.2, win.y + lay.bar / 2, dot, 0, Math.PI * 2);
        ctx.fillStyle = c;
        ctx.fill();
      });
    }
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, lay.video.x, lay.video.y, lay.video.w, lay.video.h);
    if (o.overlay) {
      ctx.save();
      roundRect(ctx, lay.video.x, lay.video.y, lay.video.w, lay.video.h, 0);
      ctx.clip();
      o.overlay(ctx, lay.video);
      ctx.restore();
    }
    ctx.restore();

    if (style.frame !== "none") {
      // hairline edge so the window reads on light and dark backgrounds
      roundRect(ctx, win.x + 0.5, win.y + 0.5, win.w - 1, win.h - 1, lay.radius);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = Math.max(1, unit * 0.0012);
      ctx.stroke();
    }
    ctx.restore();
  });
  if (o.top) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (enter.kind !== "none" && enter.p < 1) ctx.globalAlpha = e;
    o.top(ctx);
    ctx.restore();
  }
}

/** Map a point on the canvas back to the recording (0..1), at zoom 1. For click-to-focus. */
export function canvasToRecording(px: number, py: number, W: number, H: number, srcW: number, srcH: number, style: RecorderStyle) {
  const { video } = stageLayout(W, H, srcW, srcH, style);
  return { x: (px - video.x) / video.w, y: (py - video.y) / video.h };
}
