/**
 * Cursor, click and typing tracking from the pixels of a screen recording.
 *
 * A web page can't see the mouse once you switch to another app, so the
 * recording itself is the only record of where the cursor went. The browser
 * draws the cursor into every captured frame, so we find it there:
 *
 *  1. Acquire: something small that appears in frame t and is gone again in
 *     frame t+1 (and wasn't there in t-1) is a moving object. Its pixels in
 *     frame t become a template of the cursor.
 *  2. Track: each frame, match the templates near where the cursor was and
 *     wherever the frame changed. A cursor standing still still matches.
 *  3. Clean up: templates that never move (a blinking icon, a spinner) are
 *     dropped, and short gaps (a shape change, a fast flick) are filled.
 *
 * Clicks are a cursor that stops and then something changes right under it;
 * typing is a run of small changes away from the cursor in quick succession.
 *
 * Pure and synchronous: frames go in as grayscale bytes, so it runs the same
 * in the browser and in tests.
 */

import type { ActivitySample } from "./zoom";

export interface CursorPoint {
  t: number;
  /** cursor tip, 0..1 of the recording */
  x: number;
  y: number;
  visible: boolean;
  /** which of `CursorTrack.shapes` the cursor looked like */
  shape?: number;
}

/** A cursor shape as recorded: a 0/1 mask at analysis resolution, tip at the top left. */
export interface CursorShape {
  w: number;
  h: number;
  mask: Uint8Array;
}

export interface CursorTrack {
  points: CursorPoint[];
  shapes: CursorShape[];
  /** analysis resolution the shapes are measured in */
  res: { w: number; h: number };
  /** size of the recorded cursor, as a share of the recording's width and height */
  w: number;
  h: number;
}

export interface ClickEvent {
  id: string;
  t: number;
  x: number;
  y: number;
}

export interface TypingBurst {
  startMs: number;
  endMs: number;
  x: number;
  y: number;
}

export interface Analysis {
  activity: ActivitySample[];
  cursor: CursorTrack | null;
  clicks: ClickEvent[];
  typing: TypingBurst[];
}

/** a pixel changed if its brightness moved by more than this (0..255) */
const DIFF = 20;
/** a template matches if pixels differ by less than this on average */
const ACCEPT = 26;
/** a cursor pixel stands out from what's behind it by at least this much */
const STRONG = 48;
const ACTIVITY_STEP_MS = 200;
const MAX_TEMPLATES = 6;

interface Comp {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  n: number;
}

interface Template {
  id: number;
  w: number;
  h: number;
  /** mask pixel offsets (dy * W + dx) and their brightness */
  idx: Int32Array;
  vals: Uint8Array;
  n: number;
  lastUsed: number;
}

interface FrameInfo {
  t: number;
  /** tip in analysis pixels, or null */
  px: number | null;
  py: number | null;
  tpl: number;
  /** changed pixels near the cursor that aren't the cursor itself */
  near: number;
  /** changed pixels anywhere, cursor excluded */
  changed: number;
  /** small changes away from the cursor: centre of the biggest, and how many */
  farX: number;
  farY: number;
  farN: number;
  farComps: number;
}

let clickSeq = 0;
export const clickId = () => `c${Date.now().toString(36)}${(clickSeq++).toString(36)}`;

/** Sample size and rate for analysing a recording of this size and length. */
export function analysisPlan(srcW: number, srcH: number, durationMs: number) {
  const w = Math.min(srcW, 1280);
  const h = Math.max(8, Math.round((w * srcH) / srcW));
  // about 6000 frames at most: 30 fps for a minute, 10 fps for ten
  const fps = Math.max(8, Math.min(30, Math.floor(6000 / Math.max(1, durationMs / 1000))));
  return { w, h, fps };
}

export class RecordingAnalyzer {
  readonly W: number;
  readonly H: number;
  private readonly N: number;
  private prev: Uint8Array | null = null;
  private cur: Uint8Array | null = null;
  private curT = 0;
  private dCur: Uint8Array | null = null;
  private dCurCount = 0;
  private compsCur: Comp[] | null = null;
  private dNext: Uint8Array;
  private seen: Uint8Array;
  private stack: Int32Array;
  private templates: Template[] = [];
  /** every template ever made, by id (the live list drops old ones) */
  private allTemplates = new Map<number, Template>();
  private nextTplId = 1;
  private last: { x: number; y: number; t: number; tpl: number } | null = null;
  private vel = { x: 0, y: 0 };
  private frames: FrameInfo[] = [];
  /** the last few distinct frames, to look back for the cursor once we first learn its shape */
  private history: { gray: Uint8Array; info: FrameInfo }[] = [];
  private activity: ActivitySample[] = [];
  private act = { start: 0, n: 0, x0: Infinity, y0: Infinity, x1: -1, y1: -1 };
  private readonly maxCW: number;
  private readonly maxCH: number;
  private readonly minCW: number;
  private readonly minCH: number;
  private readonly minN: number;
  private readonly durationMs: number;

  constructor(W: number, H: number, durationMs: number) {
    this.W = W;
    this.H = H;
    this.N = W * H;
    this.durationMs = durationMs;
    this.dNext = new Uint8Array(this.N);
    this.seen = new Uint8Array(this.N);
    this.stack = new Int32Array(this.N);
    this.maxCW = Math.max(8, Math.round(W * 0.045));
    this.maxCH = Math.max(10, Math.round(W * 0.06));
    this.minCW = Math.max(3, Math.round(W * 0.004));
    this.minCH = Math.max(4, Math.round(W * 0.0065));
    this.minN = Math.max(8, Math.round(this.minCW * this.minCH * 0.3));
  }

  /** Feed the next frame (grayscale, W*H bytes) shown at `t` ms. Frames must come in time order. */
  push(gray: Uint8Array, t: number) {
    if (!this.cur) {
      this.cur = gray.slice();
      this.curT = t;
      this.act.start = t;
      return;
    }
    const count = diffMask(this.cur, gray, this.dNext, DIFF);
    if (count < 3) {
      // a repeated frame (screen capture only sends frames when something changes)
      this.flushActivity(t);
      return;
    }
    this.step(gray, count);
    // shift: cur becomes prev, the new frame becomes cur
    this.prev = this.cur;
    this.cur = gray.slice();
    this.curT = t;
    const swap = this.dCur ?? new Uint8Array(this.N);
    this.dCur = this.dNext;
    this.dCurCount = count;
    this.dNext = swap;
    this.compsCur = null;
    this.flushActivity(t);
  }

  finish(): Analysis {
    if (this.cur && this.prev) this.step(null, 0);
    this.flushActivity(this.durationMs, true);
    return this.result();
  }

  /* ------------------------------ per frame ------------------------------ */

  /** Decide where the cursor is in `cur`, now that the frame after it (`next`) is known. */
  private step(next: Uint8Array | null, nextCount: number) {
    const F = this.cur!;
    const info: FrameInfo = { t: this.curT, px: null, py: null, tpl: 0, near: 0, changed: 0, farX: 0, farY: 0, farN: 0, farComps: 0 };
    if (!this.prev || !this.dCur) {
      this.frames.push(info);
      this.history.push({ gray: F, info });
      return;
    }
    const comps = this.compsCur ?? (this.compsCur = this.dCurCount > this.N * 0.25 ? [] : components(this.dCur, this.W, this.H, this.seen, this.stack));

    let found = this.trackTemplates(F, comps);
    const moving = next ? this.findMoving(F, this.prev, next, comps, nextCount) : null;
    if (moving) {
      // a match that stood still while a cursor-like thing moved elsewhere was a false match
      const still = found && this.last && Math.abs(found.x - this.last.x) <= 2 && Math.abs(found.y - this.last.y) <= 2;
      const T = found && this.templates.find((t) => t.id === found!.tpl);
      const overlaps = found && T && found.x <= moving.x1 && found.x + T.w >= moving.x0 && found.y <= moving.y1 && found.y + T.h >= moving.y0;
      if (!found || (still && !overlaps)) found = this.matchNear(F, moving) ?? (this.fullEnough(moving.n) ? this.register(F, this.prev, next!, moving) : found);
    }
    if (found) {
      if (this.last) {
        const dt = Math.max(1, this.curT - this.last.t);
        this.vel = { x: ((found.x - this.last.x) / dt) * 33, y: ((found.y - this.last.y) / dt) * 33 };
      }
      this.last = { x: found.x, y: found.y, t: this.curT, tpl: found.tpl };
      info.px = found.x;
      info.py = found.y;
      info.tpl = found.tpl;
    } else if (this.last && this.curT - this.last.t > 400) {
      this.last = null;
      this.vel = { x: 0, y: 0 };
    }
    this.measureChanges(info, comps);
    this.frames.push(info);
    this.history.push({ gray: F, info });
    if (this.history.length > 12) this.history.shift();
  }

  /**
   * We only learn the cursor's shape once it moves. Look back through the
   * frames before that for the same shape, so a cursor resting at the start
   * is found too.
   */
  private backfill(T: Template, from: { x: number; y: number }) {
    let ref = from;
    const r = Math.round(this.W * 0.12);
    for (let i = this.history.length - 1; i >= 0; i--) {
      const h = this.history[i];
      if (h.info.px != null) break;
      const m = searchTemplate(h.gray, this.W, this.H, T, ref.x - r, ref.y - r, ref.x + r, ref.y + r);
      if (!m || m.score > ACCEPT) break;
      Object.assign(h.info, { px: m.x, py: m.y, tpl: T.id });
      ref = m;
    }
  }

  private trackTemplates(F: Uint8Array, comps: Comp[]): { x: number; y: number; tpl: number } | null {
    if (!this.templates.length) return null;
    let best: { x: number; y: number; tpl: number; score: number; cost: number } | null = null;
    const last = this.last;
    const pred = last ? { x: last.x + this.vel.x, y: last.y + this.vel.y } : null;
    for (const T of this.templates) {
      const regions: [number, number, number, number][] = [];
      if (last) regions.push([last.x - 2, last.y - 2, last.x + 2, last.y + 2]);
      if (pred && last && (Math.abs(this.vel.x) > 1 || Math.abs(this.vel.y) > 1)) regions.push([pred.x - 5, pred.y - 5, pred.x + 5, pred.y + 5]);
      for (const c of comps) {
        const bw = c.x1 - c.x0 + 1;
        const bh = c.y1 - c.y0 + 1;
        if (bw > this.maxCW * 4 || bh > this.maxCH * 4 || c.n < 4) continue;
        regions.push([c.x0 - 3, c.y0 - 3, c.x1 + 3 - Math.round(T.w * 0.4), c.y1 + 3 - Math.round(T.h * 0.4)]);
      }
      for (const [ax, ay, bx, by] of regions) {
        const r = searchTemplate(F, this.W, this.H, T, ax, ay, bx, by);
        if (!r || r.score > ACCEPT) continue;
        const dist = pred ? Math.hypot(r.x - pred.x, r.y - pred.y) : 0;
        const cost = r.score + dist * 0.06 + (last && T.id !== last.tpl ? 3 : 0);
        if (!best || cost < best.cost) best = { ...r, tpl: T.id, cost };
      }
    }
    if (!best) return null;
    const T = this.templates.find((x) => x.id === best!.tpl)!;
    T.lastUsed = this.curT;
    return { x: best.x, y: best.y, tpl: best.tpl };
  }

  /**
   * Something cursor-sized that appeared in `cur` and is gone again in `next`:
   * a moving object. Only strong changes count, so video compression
   * flicker doesn't qualify.
   */
  private findMoving(F: Uint8Array, P: Uint8Array, N: Uint8Array, comps: Comp[], nextCount: number) {
    if (nextCount > this.N * 0.25) return null;
    const W = this.W;
    let best: { x0: number; y0: number; x1: number; y1: number; n: number; score: number } | null = null;
    for (const c of comps) {
      const bw = c.x1 - c.x0 + 1;
      const bh = c.y1 - c.y0 + 1;
      if (bw > this.maxCW * 3 || bh > this.maxCH * 3 || c.n < this.minN) continue;
      let n = 0;
      let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
      for (let y = c.y0; y <= c.y1; y++) {
        for (let x = c.x0, k = y * W + c.x0; x <= c.x1; x++, k++) {
          const a = F[k] - P[k];
          const b = F[k] - N[k];
          if ((a > STRONG || a < -STRONG) && (b > STRONG || b < -STRONG)) {
            n++;
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
        }
      }
      if (n < this.minN) continue;
      const w = x1 - x0 + 1;
      const h = y1 - y0 + 1;
      if (w < this.minCW || h < this.minCH || w > this.maxCW || h > this.maxCH) continue;
      if (n / (w * h) < 0.16) continue;
      // near where we last saw it beats far away; bigger (a fuller shape) beats smaller
      const dist = this.last ? Math.hypot(x0 - this.last.x, y0 - this.last.y) / W : 0.2;
      const score = dist * 200 - n * 0.05;
      if (!best || score < best.score) best = { x0, y0, x1, y1, n, score };
    }
    return best;
  }

  /** A known cursor shape on or around a moving object. */
  private matchNear(F: Uint8Array, m: { x0: number; y0: number; x1: number; y1: number }): { x: number; y: number; tpl: number } | null {
    let best: { x: number; y: number; tpl: number; score: number } | null = null;
    for (const T of this.templates) {
      const r = searchTemplate(F, this.W, this.H, T, m.x0 - T.w / 2, m.y0 - T.h / 2, m.x1 - T.w / 2, m.y1 - T.h / 2);
      if (r && r.score <= ACCEPT && (!best || r.score < best.score)) best = { ...r, tpl: T.id };
    }
    if (best) this.templates.find((t) => t.id === best!.tpl)!.lastUsed = this.curT;
    return best;
  }

  /** A partial glimpse (the cursor barely moved) isn't worth a new shape once we know a fuller one. */
  private fullEnough(n: number) {
    const most = Math.max(0, ...this.templates.map((t) => t.n));
    return n >= most * 0.6;
  }

  /** Remember a moving object as a cursor shape (or refresh the matching one). */
  private register(F: Uint8Array, P: Uint8Array, N: Uint8Array, best: { x0: number; y0: number; x1: number; y1: number }): { x: number; y: number; tpl: number } {
    const W = this.W;
    const w = best.x1 - best.x0 + 1;
    const h = best.y1 - best.y0 + 1;
    const idx: number[] = [];
    const vals: number[] = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const k = (best.y0 + y) * W + best.x0 + x;
        const a = F[k] - P[k];
        const b = F[k] - N[k];
        if ((a > STRONG || a < -STRONG) && (b > STRONG || b < -STRONG)) {
          idx.push(y * W + x);
          vals.push(F[k]);
        }
      }
    }
    // the same shape seen again: keep the fuller template
    const same = this.templates.find((t) => Math.abs(t.w - w) <= 2 && Math.abs(t.h - h) <= 2 && (searchTemplate(F, W, this.H, t, best.x0 - 2, best.y0 - 2, best.x0 + 2, best.y0 + 2)?.score ?? Infinity) <= ACCEPT);
    if (same) {
      if (idx.length > same.n) Object.assign(same, { w, h, idx: Int32Array.from(idx), vals: Uint8Array.from(vals), n: idx.length });
      same.lastUsed = this.curT;
      return { x: best.x0, y: best.y0, tpl: same.id };
    }
    const T: Template = { id: this.nextTplId++, w, h, idx: Int32Array.from(idx), vals: Uint8Array.from(vals), n: idx.length, lastUsed: this.curT };
    const first = this.allTemplates.size === 0;
    this.templates.push(T);
    this.allTemplates.set(T.id, T);
    if (first) this.backfill(T, { x: best.x0, y: best.y0 });
    if (this.templates.length > MAX_TEMPLATES) {
      this.templates.sort((a, b) => b.lastUsed - a.lastUsed);
      this.templates.length = MAX_TEMPLATES;
    }
    return { x: best.x0, y: best.y0, tpl: T.id };
  }

  /** Changes in `cur` that aren't the cursor: near it (clicks), away from it (typing) and overall (zooms). */
  private measureChanges(info: FrameInfo, comps: Comp[]) {
    const W = this.W;
    const D = this.dCur!;
    const tw = this.cursorBox();
    // the cursor's old and new spots, with a margin
    const rects: [number, number, number, number][] = [];
    const prevInfo = this.frames.at(-1);
    for (const p of [prevInfo?.px != null ? [prevInfo.px, prevInfo.py!] : null, info.px != null ? [info.px, info.py!] : null]) {
      if (p) rects.push([p[0] - 3, p[1] - 3, p[0] + tw.w + 3, p[1] + tw.h + 3]);
    }
    const inRects = (x: number, y: number) => rects.some(([a, b, c, d]) => x >= a && x <= c && y >= b && y <= d);
    const cx = info.px ?? prevInfo?.px ?? null;
    const cy = info.py ?? prevInfo?.py ?? null;
    const R = Math.max(tw.h * 3.5, W * 0.04);

    if (this.dCurCount > this.N * 0.25) {
      info.changed = this.dCurCount;
      this.addActivity(0, 0, W - 1, this.H - 1, this.dCurCount);
      return;
    }
    let far: Comp | null = null;
    for (const c of comps) {
      // a component that is only the cursor moving doesn't count
      const covered = rects.some(([a, b, cc, d]) => c.x0 >= a && c.y0 >= b && c.x1 <= cc && c.y1 <= d);
      if (covered) continue;
      let n = c.n;
      if (rects.length && rects.some(([a, b, cc, d]) => c.x1 >= a && c.x0 <= cc && c.y1 >= b && c.y0 <= d)) {
        n = 0;
        for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0, k = y * W + c.x0; x <= c.x1; x++, k++) if (D[k] && !inRects(x, y)) n++;
        if (!n) continue;
      }
      info.changed += n;
      this.addActivity(c.x0, c.y0, c.x1, c.y1, n);
      const mx = (c.x0 + c.x1) / 2;
      const my = (c.y0 + c.y1) / 2;
      const d = cx == null ? Infinity : Math.hypot(mx - (cx + tw.w / 2), my - (cy! + tw.h / 2));
      if (d <= R) info.near += n;
      else if (c.x1 - c.x0 < W * 0.06 && c.y1 - c.y0 < W * 0.04) {
        info.farComps++;
        if (!far || c.n > far.n) far = c;
      }
    }
    if (far) {
      info.farX = (far.x0 + far.x1) / 2;
      info.farY = (far.y0 + far.y1) / 2;
      info.farN = far.n;
    }
  }

  private cursorBox() {
    const t = this.templates.find((x) => x.id === this.last?.tpl) ?? this.templates[0];
    return t ? { w: t.w, h: t.h } : { w: Math.round(this.W * 0.01), h: Math.round(this.W * 0.016) };
  }

  /* ------------------------------- activity ------------------------------- */

  private addActivity(x0: number, y0: number, x1: number, y1: number, n: number) {
    const a = this.act;
    a.n += n;
    a.x0 = Math.min(a.x0, x0);
    a.y0 = Math.min(a.y0, y0);
    a.x1 = Math.max(a.x1, x1);
    a.y1 = Math.max(a.y1, y1);
  }

  private flushActivity(t: number, final = false) {
    const a = this.act;
    while (t - a.start >= ACTIVITY_STEP_MS || (final && t > a.start)) {
      const end = a.start + ACTIVITY_STEP_MS;
      this.activity.push({
        t: end,
        energy: Math.min(1, a.n / this.N),
        box: a.n ? { x: a.x0 / this.W, y: a.y0 / this.H, w: (a.x1 - a.x0 + 1) / this.W, h: (a.y1 - a.y0 + 1) / this.H } : null,
      });
      Object.assign(a, { start: end, n: 0, x0: Infinity, y0: Infinity, x1: -1, y1: -1 });
      if (final && t <= a.start) break;
    }
  }

  /* -------------------------------- result -------------------------------- */

  private result(): Analysis {
    const W = this.W;
    const H = this.H;
    const frames = this.frames;
    // templates that never went anywhere aren't the cursor
    const extent = new Map<number, { x0: number; y0: number; x1: number; y1: number; n: number }>();
    for (const f of frames) {
      if (!f.tpl) continue;
      const e = extent.get(f.tpl) ?? { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity, n: 0 };
      e.x0 = Math.min(e.x0, f.px!);
      e.y0 = Math.min(e.y0, f.py!);
      e.x1 = Math.max(e.x1, f.px!);
      e.y1 = Math.max(e.y1, f.py!);
      e.n++;
      extent.set(f.tpl, e);
    }
    const moving = new Set<number>();
    for (const [id, e] of extent) if (Math.max(e.x1 - e.x0, e.y1 - e.y0) >= W * 0.04 && e.n >= 3) moving.add(id);
    const live = [...moving].map((id) => this.allTemplates.get(id)!);
    const shapeOf = new Map(live.map((t, i) => [t.id, i]));
    const shapes: CursorShape[] = live.map((t) => {
      const mask = new Uint8Array(t.w * t.h);
      for (const k of t.idx) {
        const x = k % W;
        mask[((k - x) / W) * t.w + x] = 1;
      }
      return { w: t.w, h: t.h, mask };
    });

    const points: CursorPoint[] = frames.map((f) =>
      f.tpl && moving.has(f.tpl) ? { t: f.t, x: f.px! / W, y: f.py! / H, visible: true, shape: shapeOf.get(f.tpl) } : { t: f.t, x: 0, y: 0, visible: false }
    );
    fillGaps(points, 450);
    holdStills(points);
    const visible = points.filter((p) => p.visible).length;
    let cursor: CursorTrack | null = null;
    if (visible >= 3 && live.length) {
      const sizes = live.map((t) => ({ w: t.w, h: t.h })).sort((a, b) => b.w * b.h - a.w * a.h);
      cursor = { points, shapes, res: { w: W, h: H }, w: sizes[0].w / W, h: sizes[0].h / H };
    }
    return {
      activity: this.activity,
      cursor,
      clicks: cursor ? detectClicks(frames, points, W, H, cursor) : [],
      typing: detectTyping(frames, W, H),
    };
  }
}

/* ------------------------------- post steps ------------------------------- */

/** Bridge short stretches where the cursor was lost (a shape change, a fast flick). */
function fillGaps(points: CursorPoint[], maxMs: number) {
  let i = 0;
  while (i < points.length) {
    if (points[i].visible) {
      i++;
      continue;
    }
    let j = i;
    while (j < points.length && !points[j].visible) j++;
    const a = points[i - 1];
    const b = points[j];
    if (a && b && b.t - a.t <= maxMs) {
      for (let k = i; k < j; k++) {
        const f = (points[k].t - a.t) / (b.t - a.t);
        points[k] = { t: points[k].t, x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, visible: true, shape: f < 0.5 ? a.shape : b.shape };
      }
    }
    i = j;
  }
}

/**
 * Screen capture only sends a frame when something changes, so two samples
 * can be far apart in time. The cursor stood still in between: add a point
 * just before the next one so it doesn't drift slowly across the gap.
 */
function holdStills(points: CursorPoint[]) {
  for (let i = points.length - 1; i > 0; i--) {
    const a = points[i - 1];
    const b = points[i];
    if (a.visible && b.visible && b.t - a.t > 160) points.splice(i, 0, { t: b.t - 40, x: a.x, y: a.y, visible: true, shape: a.shape });
  }
}

function detectClicks(frames: FrameInfo[], points: CursorPoint[], W: number, H: number, cursor: CursorTrack): ClickEvent[] {
  const byT = new Map(points.filter((p) => p.visible).map((p) => [p.t, p]));
  const cursorPx = cursor.w * W * cursor.h * H;
  const minNear = Math.max(10, cursorPx * 0.25);
  const clicks: ClickEvent[] = [];
  let stillSince: number | null = null;
  let lastClick = -Infinity;
  let prevNear = 0;
  let prev: CursorPoint | undefined;
  for (const f of frames) {
    const p = byT.get(f.t);
    if (!p) {
      stillSince = null;
      prev = undefined;
      prevNear = f.near;
      continue;
    }
    const moved = prev ? Math.hypot((p.x - prev.x) * W, (p.y - prev.y) * H) : Infinity;
    // screen capture skips identical frames: a short last step before a long gap
    // means the cursor arrived right after the previous frame, not now
    if (moved > 2.5) stillSince = prev && f.t - prev.t > 150 && moved < W * 0.03 ? prev.t + 40 : null;
    else if (stillSince == null) stillSince = prev?.t ?? f.t;
    const dwell = stillSince == null ? 0 : f.t - stillSince;
    const onset = f.near >= minNear && prevNear < minNear * 0.6;
    const pageChange = f.changed > W * H * 0.2;
    // one click per stop: what follows (typing, a menu animating) isn't another click
    const sameStop = stillSince != null && lastClick >= stillSince && f.t - lastClick < 2500;
    if (dwell >= 60 && (onset || pageChange) && f.t - lastClick > 450 && !sameStop) {
      // the press happened a moment before the screen reacted
      const t = Math.max(stillSince ?? f.t, f.t - 70);
      clicks.push({ id: clickId(), t, x: p.x, y: p.y });
      lastClick = f.t;
    }
    prev = p;
    prevNear = f.near;
  }
  return clicks;
}

function detectTyping(frames: FrameInfo[], W: number, H: number): TypingBurst[] {
  const events = frames.filter((f) => f.farComps >= 1 && f.farComps <= 4 && f.near === 0 && f.changed < W * H * 0.02);
  const bursts: TypingBurst[] = [];
  let run: FrameInfo[] = [];
  const close = () => {
    if (run.length >= 5) {
      const gaps = run.slice(1).map((f, i) => f.t - run[i].t).sort((a, b) => a - b);
      const median = gaps[Math.floor(gaps.length / 2)];
      const xs = run.map((f) => f.farX);
      const spread = Math.max(...xs) - Math.min(...xs);
      // keys land faster than a caret blinks, and the text moves along
      if (median <= 300 && spread >= W * 0.012) {
        bursts.push({
          startMs: run[0].t,
          endMs: run.at(-1)!.t,
          x: xs.reduce((a, b) => a + b, 0) / xs.length / W,
          y: run.reduce((a, f) => a + f.farY, 0) / run.length / H,
        });
      }
    }
    run = [];
  };
  for (const e of events) {
    const last = run.at(-1);
    if (last && (e.t - last.t > 650 || Math.abs(e.farY - last.farY) > H * 0.06)) close();
    run.push(e);
  }
  close();
  return bursts;
}

/* -------------------------------- pixel ops -------------------------------- */

/** Rec. 601 luma of RGBA pixels, into `out`. */
export function toGray(rgba: Uint8ClampedArray | Uint8Array, out: Uint8Array) {
  for (let p = 0, q = 0; q < out.length; p += 4, q++) out[q] = (rgba[p] * 77 + rgba[p + 1] * 150 + rgba[p + 2] * 29) >> 8;
  return out;
}

function diffMask(a: Uint8Array, b: Uint8Array, out: Uint8Array, thr: number): number {
  let n = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    if (d > thr || d < -thr) {
      out[i] = 1;
      n++;
    } else out[i] = 0;
  }
  return n;
}

/** 8-connected components of a 0/1 mask. */
function components(mask: Uint8Array, W: number, H: number, seen: Uint8Array, stack: Int32Array): Comp[] {
  const comps: Comp[] = [];
  const touched: number[] = [];
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i] || seen[i]) continue;
    let sp = 0;
    stack[sp++] = i;
    seen[i] = 1;
    touched.push(i);
    const c: Comp = { x0: W, y0: H, x1: -1, y1: -1, n: 0 };
    while (sp) {
      const k = stack[--sp];
      const x = k % W;
      const y = (k - x) / W;
      c.n++;
      if (x < c.x0) c.x0 = x;
      if (x > c.x1) c.x1 = x;
      if (y < c.y0) c.y0 = y;
      if (y > c.y1) c.y1 = y;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= H) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= W) continue;
          const q = yy * W + xx;
          if (mask[q] && !seen[q]) {
            seen[q] = 1;
            touched.push(q);
            stack[sp++] = q;
          }
        }
      }
    }
    comps.push(c);
  }
  for (const k of touched) seen[k] = 0;
  return comps;
}

function matchAt(F: Uint8Array, W: number, H: number, T: Template, x: number, y: number, limit: number): number {
  if (x < 0 || y < 0 || x + T.w > W || y + T.h > H) return Infinity;
  const base = y * W + x;
  const stop = limit * T.n;
  let sum = 0;
  for (let i = 0; i < T.n; i++) {
    const d = F[base + T.idx[i]] - T.vals[i];
    sum += d < 0 ? -d : d;
    if (sum > stop) return Infinity;
  }
  return sum / T.n;
}

/** Best placement of `T` with its tip inside [ax..bx] x [ay..by]: a coarse pass, then a fine one. */
function searchTemplate(F: Uint8Array, W: number, H: number, T: Template, ax: number, ay: number, bx: number, by: number): { x: number; y: number; score: number } | null {
  ax = Math.max(0, Math.round(ax));
  ay = Math.max(0, Math.round(ay));
  bx = Math.min(W - T.w, Math.round(Math.max(bx, ax)));
  by = Math.min(H - T.h, Math.round(Math.max(by, ay)));
  if (bx < ax || by < ay) return null;
  let best = { x: -1, y: -1, score: Infinity };
  const step = (bx - ax) * (by - ay) > 64 ? 2 : 1;
  for (let y = ay; y <= by; y += step) {
    for (let x = ax; x <= bx; x += step) {
      // a coarse step can land a pixel off a thin outline, so don't give up on it early
      const s = matchAt(F, W, H, T, x, y, step > 1 ? Math.min(best.score, 160) : Math.min(best.score, ACCEPT * 2.5));
      if (s < best.score) best = { x, y, score: s };
    }
  }
  if (best.x < 0) return null;
  if (step > 1) {
    const c = best;
    for (let y = c.y - 1; y <= c.y + 1; y++) {
      for (let x = c.x - 1; x <= c.x + 1; x++) {
        const s = matchAt(F, W, H, T, x, y, best.score);
        if (s < best.score) best = { x, y, score: s };
      }
    }
  }
  return best;
}
