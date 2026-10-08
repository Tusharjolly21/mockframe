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
 *
 * When the screen changed under a resting cursor (a scroll, a hover colour,
 * a new page) the plate is out of date there. The ring of pixels just around
 * the cursor gives that away, and then the hole is filled in from its
 * surroundings in the current frame instead.
 */
export class CursorEraser {
  private plate: HTMLCanvasElement;
  private pctx: CanvasRenderingContext2D;
  private scratch: HTMLCanvasElement;
  private sctx: CanvasRenderingContext2D;
  private probe: HTMLCanvasElement;
  private prctx: CanvasRenderingContext2D;
  private masks = new Map<number, { canvas: HTMLCanvasElement; alpha: Uint8ClampedArray }>();
  /** the current frame's pixels around the cursor, from `update` */
  private here: { t: number; x: number; y: number; w: number; h: number; px: Uint8ClampedArray } | null = null;
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
    this.sctx = this.scratch.getContext("2d", { willReadFrequently: true })!;
    this.probe = document.createElement("canvas");
    this.prctx = this.probe.getContext("2d", { willReadFrequently: true })!;
  }

  /** Where the recorded cursor is at `t`, in whole plate pixels, with a margin. */
  rect(t: number): { x: number; y: number; w: number; h: number; shape?: number } | null {
    const p = rawCursorAt(this.track, t);
    if (!p.visible) return null;
    const res = this.track.res;
    // points are the cursor's hotspot (an arrow's tip, an I-beam's middle); the shape hangs off it
    const shape = this.track.shapes[p.shape ?? 0] ?? null;
    const kx = this.pw / res.w;
    const ky = this.ph / res.h;
    const sw = shape ? shape.w * kx : this.track.w * this.pw;
    const sh = shape ? shape.h * ky : this.track.h * this.ph;
    const m = Math.ceil(Math.max(3, kx * 2.5));
    const x = Math.round(p.x * this.pw - (shape ? shape.hx * kx : 0)) - m;
    const y = Math.round(p.y * this.ph - (shape ? shape.hy * ky : 0)) - m;
    return { x, y, w: Math.ceil(sw) + m * 2, h: Math.ceil(sh) + m * 2, shape: shape ? (p.shape ?? 0) : undefined };
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
    this.here = null;
    if (r) {
      // keep what's under the cursor right now, to check the plate against
      this.fit(this.probe, r.w, r.h);
      this.prctx.clearRect(0, 0, r.w, r.h);
      this.prctx.drawImage(frame, -r.x, -r.y, this.pw, this.ph);
      this.here = { t, x: r.x, y: r.y, w: r.w, h: r.h, px: this.prctx.getImageData(0, 0, r.w, r.h).data };
    }
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

  private fit(cv: HTMLCanvasElement, w: number, h: number) {
    if (cv.width < w || cv.height < h) {
      cv.width = Math.max(cv.width, w);
      cv.height = Math.max(cv.height, h);
    }
  }

  /** The cursor's silhouette at plate scale inside a `w` x `h` rect with margin `margin`, grown a little so no edge survives. */
  private mask(shape: number, w: number, h: number, margin: number) {
    const scale = this.pw / this.track.res.w;
    const key = shape * 1e8 + w * 1e4 + h;
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
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const mctx = canvas.getContext("2d", { willReadFrequently: true })!;
    const d = Math.max(1, scale * 1.5);
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) mctx.drawImage(base, margin + (dx * d) / 2, margin + (dy * d) / 2, s.w * scale, s.h * scale);
    const raw = mctx.getImageData(0, 0, w, h).data;
    const alpha = new Uint8ClampedArray(w * h);
    for (let i = 0; i < alpha.length; i++) alpha[i] = raw[i * 4 + 3];
    m = { canvas, alpha };
    this.masks.set(key, m);
    return m;
  }

  /** Paste clean pixels over the cursor, inside `video` (the recording's rect on the canvas). */
  patch(ctx: CanvasRenderingContext2D, video: StageRect, t: number) {
    if (!this.ready) return;
    const r = this.rect(t);
    if (!r) return;
    const { w, h } = r;
    this.fit(this.scratch, w, h);
    const sc = this.sctx;
    sc.clearRect(0, 0, w, h);
    sc.drawImage(this.plate, r.x, r.y, w, h, 0, 0, w, h);
    if (r.shape != null) {
      const margin = Math.ceil(Math.max(3, (this.pw / this.track.res.w) * 2.5));
      const M = this.mask(r.shape, w, h, margin);
      const here = this.here && this.here.t === t && this.here.x === r.x && this.here.y === r.y && this.here.w === w && this.here.h === h ? this.here.px : null;
      const img = sc.getImageData(0, 0, w, h);
      if (here && !matches(img.data, here, w, h)) fillHole(img.data, here, M.alpha, w, h);
      for (let i = 0; i < M.alpha.length; i++) img.data[i * 4 + 3] = M.alpha[i];
      sc.putImageData(img, 0, 0);
    }
    const kx = video.w / this.pw;
    const ky = video.h / this.ph;
    ctx.drawImage(this.scratch, 0, 0, w, h, video.x + r.x * kx, video.y + r.y * ky, w * kx, h * ky);
  }
}

/** Whether the plate still agrees with the frame on the rect's outer ring (where the cursor never is). */
function matches(plate: Uint8ClampedArray, frame: Uint8ClampedArray, w: number, h: number): boolean {
  let sum = 0;
  let n = 0;
  const add = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    sum += Math.abs(plate[i] - frame[i]) + Math.abs(plate[i + 1] - frame[i + 1]) + Math.abs(plate[i + 2] - frame[i + 2]);
    n += 3;
  };
  for (let x = 0; x < w; x++) {
    add(x, 0);
    add(x, h - 1);
  }
  for (let y = 1; y < h - 1; y++) {
    add(0, y);
    add(w - 1, y);
  }
  return sum / n < 10;
}

/** Fill the masked pixels of `out` from their unmasked neighbours in `frame`, ring by ring from the edge in. */
function fillHole(out: Uint8ClampedArray, frame: Uint8ClampedArray, alpha: Uint8ClampedArray, w: number, h: number) {
  const known = new Uint8Array(w * h);
  for (let i = 0; i < known.length; i++) {
    if (alpha[i] < 8) {
      known[i] = 1;
      out[i * 4] = frame[i * 4];
      out[i * 4 + 1] = frame[i * 4 + 1];
      out[i * 4 + 2] = frame[i * 4 + 2];
    }
  }
  let todo = known.length;
  const next: number[] = [];
  for (let pass = 0; pass < 64 && todo; pass++) {
    next.length = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (known[i]) continue;
        let r = 0, g = 0, b = 0, n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= h) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= w || !known[yy * w + xx]) continue;
            const j = (yy * w + xx) * 4;
            r += out[j];
            g += out[j + 1];
            b += out[j + 2];
            n++;
          }
        }
        if (!n) continue;
        out[i * 4] = r / n;
        out[i * 4 + 1] = g / n;
        out[i * 4 + 2] = b / n;
        next.push(i);
      }
    }
    if (!next.length) break;
    for (const i of next) known[i] = 1;
    todo -= next.length;
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
