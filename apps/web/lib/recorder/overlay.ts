"use client";

/**
 * What goes on top of the recording each frame: the recorded cursor rubbed
 * out, the restyled cursor and its effects drawn in, and the camera bubble.
 * Shared by the preview and the exporter.
 */

import type { StageRect } from "./compose";
import { activeClicks, cursorAt, drawClickEffect, drawCursor, drawHalo, drawSpotlight, rawCursorAt, type CursorSettings, type SmoothCursor } from "./cursor";
import type { ClickEvent, CursorTrack } from "./track";

/* ------------------------------ cursor eraser ------------------------------ */

const PLATE_MAX_W = 1920;

/**
 * Hides the cursor baked into the recording. A "plate" keeps a copy of the
 * screen where the cursor isn't: every frame updates it everywhere except
 * under the cursor, so the pixels there are from the last moment the cursor
 * was elsewhere. Those get pasted back over the cursor's silhouette.
 */
export class CursorEraser {
  private plate: HTMLCanvasElement;
  private pctx: CanvasRenderingContext2D;
  private scratch: HTMLCanvasElement;
  private masks = new Map<number, HTMLCanvasElement>();
  readonly pw: number;
  readonly ph: number;
  /** false until the plate holds a frame (see init) */
  ready = false;

  constructor(
    private track: CursorTrack,
    srcW: number,
    srcH: number
  ) {
    const k = Math.min(1, PLATE_MAX_W / srcW);
    this.pw = Math.max(2, Math.round(srcW * k));
    this.ph = Math.max(2, Math.round(srcH * k));
    this.plate = document.createElement("canvas");
    this.plate.width = this.pw;
    this.plate.height = this.ph;
    this.pctx = this.plate.getContext("2d")!;
    this.scratch = document.createElement("canvas");
  }

  /** Where the recorded cursor is at `t`, in plate pixels, with a margin. */
  rect(t: number): { x: number; y: number; w: number; h: number; shape?: number } | null {
    const p = rawCursorAt(this.track, t);
    if (!p.visible) return null;
    const res = this.track.res;
    const shape = p.shape != null ? this.track.shapes[p.shape] : null;
    const sw = (shape ? shape.w / res.w : this.track.w) * this.pw;
    const sh = (shape ? shape.h / res.h : this.track.h) * this.ph;
    const m = Math.max(3, (this.pw / res.w) * 2.5);
    return { x: p.x * this.pw - m, y: p.y * this.ph - m, w: sw + m * 2, h: sh + m * 2, shape: p.shape };
  }

  /** Start from a frame where the cursor is somewhere else. */
  init(clean: CanvasImageSource) {
    this.pctx.drawImage(clean, 0, 0, this.pw, this.ph);
    this.ready = true;
  }

  /** Take in the current frame, except under the cursor. */
  update(frame: CanvasImageSource, t: number) {
    const r = this.rect(t);
    const c = this.pctx;
    c.save();
    if (r) {
      c.beginPath();
      c.rect(0, 0, this.pw, this.ph);
      c.rect(r.x, r.y, r.w, r.h);
      c.clip("evenodd");
    }
    c.drawImage(frame, 0, 0, this.pw, this.ph);
    c.restore();
  }

  private mask(shape: number, scale: number, margin: number): HTMLCanvasElement {
    const key = shape * 1000 + Math.round(scale * 100);
    let m = this.masks.get(key);
    if (m) return m;
    const s = this.track.shapes[shape];
    const base = document.createElement("canvas");
    base.width = s.w;
    base.height = s.h;
    const bctx = base.getContext("2d")!;
    const img = bctx.createImageData(s.w, s.h);
    for (let i = 0; i < s.mask.length; i++) if (s.mask[i]) img.data[i * 4 + 3] = 255;
    bctx.putImageData(img, 0, 0);
    // fill the holes between mask pixels and grow it a little, so no edge of the cursor survives
    m = document.createElement("canvas");
    m.width = Math.ceil(s.w * scale + margin * 2);
    m.height = Math.ceil(s.h * scale + margin * 2);
    const mctx = m.getContext("2d")!;
    const d = Math.max(1, scale * 1.5);
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) mctx.drawImage(base, margin + (dx * d) / 2, margin + (dy * d) / 2, s.w * scale, s.h * scale);
    this.masks.set(key, m);
    return m;
  }

  /** Paste the clean pixels over the cursor, inside `video` (the recording's rect on the canvas). */
  patch(ctx: CanvasRenderingContext2D, video: StageRect, t: number) {
    if (!this.ready) return;
    const r = this.rect(t);
    if (!r) return;
    const w = Math.max(1, Math.ceil(r.w));
    const h = Math.max(1, Math.ceil(r.h));
    if (this.scratch.width < w || this.scratch.height < h) {
      this.scratch.width = Math.max(this.scratch.width, w);
      this.scratch.height = Math.max(this.scratch.height, h);
    }
    const sc = this.scratch.getContext("2d")!;
    sc.clearRect(0, 0, w, h);
    sc.drawImage(this.plate, r.x, r.y, w, h, 0, 0, w, h);
    if (r.shape != null) {
      const scale = this.pw / this.track.res.w;
      const margin = (w - this.track.shapes[r.shape].w * scale) / 2;
      sc.globalCompositeOperation = "destination-in";
      sc.drawImage(this.mask(r.shape, scale, Math.max(0, margin)), 0, 0);
      sc.globalCompositeOperation = "source-over";
    }
    const kx = video.w / this.pw;
    const ky = video.h / this.ph;
    ctx.drawImage(this.scratch, 0, 0, w, h, video.x + r.x * kx, video.y + r.y * ky, w * kx, h * ky);
  }
}

/** A time near `t` when the cursor was far from where it is at `t`, for initialising the eraser. */
export function cleanFrameTime(track: CursorTrack, t: number, durationMs: number): number | null {
  const here = rawCursorAt(track, t);
  if (!here.visible) return t;
  const far = (u: number) => {
    const p = rawCursorAt(track, u);
    return !p.visible || Math.abs(p.x - here.x) > track.w * 2.5 || Math.abs(p.y - here.y) > track.h * 2.5;
  };
  for (let d = 100; d < durationMs; d += 100) {
    if (t + d <= durationMs && far(t + d)) return t + d;
    if (t - d >= 0 && far(t - d)) return t - d;
  }
  return null;
}

/* ------------------------------- cursor layer ------------------------------ */

export interface CursorLayer {
  track: CursorTrack;
  smooth: SmoothCursor;
  clicks: ClickEvent[];
  settings: CursorSettings;
  eraser: CursorEraser | null;
}

/** Draw the cursor layer for time `t` over the recording at `video`. */
export function drawCursorLayer(ctx: CanvasRenderingContext2D, video: StageRect, t: number, L: CursorLayer) {
  const s = L.settings;
  const custom = s.style !== "original";
  if (custom && L.eraser) L.eraser.patch(ctx, video, t);
  const pose = cursorAt(L.smooth, t);
  const px = video.x + pose.x * video.w;
  const py = video.y + pose.y * video.h;
  const height = Math.max(8, L.track.h * video.h * (custom ? s.size : 1));
  // glows sit on the arrow's body; round pointers are centred on the tip already
  const round = s.style === "dot" || s.style === "ring" || s.style === "glass";
  const gx = round ? px : px + height * 0.22;
  const gy = round ? py : py + height * 0.32;
  if (s.highlight === "spotlight") drawSpotlight(ctx, video, gx, gy, height * 3.2, pose.alpha);
  if (s.highlight === "halo") drawHalo(ctx, gx, gy, height * 1.5, s.color, pose.alpha);

  for (const { click, age } of activeClicks(L.clicks, t)) {
    // effects ring the tip where the drawn cursor was at the click, so they line up with it
    const at = custom ? cursorAt(L.smooth, click.t) : click;
    drawClickEffect(ctx, s.clickEffect, video.x + at.x * video.w, video.y + at.y * video.h, age, height, s.color);
  }

  if (custom) {
    drawCursor(ctx, {
      style: s.style,
      x: px,
      y: py,
      height,
      alpha: pose.alpha,
      press: pose.press,
      color: s.color,
      vx: s.motionBlur ? pose.vx * video.w : 0,
      vy: s.motionBlur ? pose.vy * video.h : 0,
    });
  }
}

/* ------------------------------- camera bubble ----------------------------- */

export type CameraCorner = "br" | "bl" | "tr" | "tl";
export type CameraShape = "circle" | "rounded" | "square";

export interface CameraSettings {
  visible: boolean;
  corner: CameraCorner;
  /** diameter as a share of the canvas's shorter side */
  size: number;
  shape: CameraShape;
  mirror: boolean;
  border: boolean;
  /** get smaller while the screen is zoomed in, so it hides less */
  shrinkOnZoom: boolean;
}

export const DEFAULT_CAMERA: CameraSettings = { visible: true, corner: "br", size: 0.24, shape: "circle", mirror: true, border: true, shrinkOnZoom: true };

export function drawCameraBubble(ctx: CanvasRenderingContext2D, W: number, H: number, source: CanvasImageSource, srcW: number, srcH: number, s: CameraSettings, zoom: number) {
  if (!s.visible || !srcW || !srcH) return;
  const unit = Math.min(W, H);
  const shrink = s.shrinkOnZoom ? 1 / (1 + Math.max(0, zoom - 1) * 0.35) : 1;
  const d = unit * s.size * shrink;
  const m = unit * 0.035;
  const x = s.corner.endsWith("l") ? m : W - m - d;
  const y = s.corner.startsWith("t") ? m : H - m - d;
  const r = s.shape === "circle" ? d / 2 : s.shape === "rounded" ? d * 0.2 : d * 0.04;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = unit * 0.03;
  ctx.shadowOffsetY = unit * 0.01;
  ctx.beginPath();
  ctx.roundRect(x, y, d, d, r);
  ctx.fillStyle = "#111";
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, d, d, r);
  ctx.clip();
  // cover-crop the camera into the square
  const side = Math.min(srcW, srcH);
  const sx = (srcW - side) / 2;
  const sy = (srcH - side) / 2;
  if (s.mirror) {
    ctx.translate(x + d, y);
    ctx.scale(-1, 1);
    ctx.drawImage(source, sx, sy, side, side, 0, 0, d, d);
  } else ctx.drawImage(source, sx, sy, side, side, x, y, d, d);
  ctx.restore();

  if (s.border) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x + 1, y + 1, d - 2, d - 2, Math.max(0, r - 1));
    ctx.lineWidth = Math.max(2, unit * 0.005);
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.stroke();
    ctx.restore();
  }
}
