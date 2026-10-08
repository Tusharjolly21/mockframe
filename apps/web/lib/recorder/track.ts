/**
 * Cursor, click and typing tracking from the pixels of a screen recording.
 *
 * A web page can't see the mouse once you switch to another app, so the
 * recording itself is the only record of where the cursor went. The browser
 * draws the cursor into every captured frame, so we find it there:
 *
 *  1. Learn its look: something small that appears in frame t and is gone
 *     again in t+1 (and wasn't there in t-1) is a moving object. If it is
 *     drawn in black and white like a pointer, its pixels become one
 *     observation of a cursor shape. Many observations over different
 *     backgrounds tell the cursor's own pixels (always the same) from the
 *     screen showing through (always different), so the model stops
 *     matching plain white or black areas. Arrow, hand and text beam each
 *     get their own model.
 *  2. Track: each frame, match the models near where the cursor was and
 *     wherever the frame changed. A cursor standing still still matches.
 *  3. Clean up: shapes that never move (an icon, a spinner) are dropped, and
 *     short gaps (a shape change, a fast flick) are filled.
 *
 * Clicks are a cursor that rests and then something changes right at its
 * tip (a button presses, a menu opens, a caret appears). Scrolling, things
 * that animate all the time and tooltips beside the cursor don't count.
 * Typing is a run of small changes that walk along a line.
 *
 * Pure and synchronous: frames go in as grayscale bytes, so it runs the same
 * in the browser and in tests.
 */

import type { ActivitySample } from "./zoom";

export interface CursorPoint {
  t: number;
  /** cursor hotspot (the tip of an arrow, the fingertip of a hand), 0..1 of the recording */
  x: number;
  y: number;
  visible: boolean;
  /** which of `CursorTrack.shapes` the cursor looked like */
  shape?: number;
}

/** A cursor shape as recorded, at analysis resolution. */
export interface CursorShape {
  w: number;
  h: number;
  /** 0/1: every pixel the cursor covers, shadow included (what to rub out) */
  mask: Uint8Array;
  /** the hotspot inside the mask */
  hx: number;
  hy: number;
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
/** a cursor pixel stands out from what's behind it by at least this much */
const STRONG = 48;
/** a model matches if its own pixels differ by less than this on average */
const ACCEPT = 30;
const ACTIVITY_STEP_MS = 200;
const MAX_MODELS = 8;
/** margin around an observation, in analysis pixels */
const PAD = 3;
/** side of the cells that remember how often a spot changes */
const CELL = 16;
/** cells changing in more than this share of recent frames are animating, not reacting */
const BUSY = 0.4;

interface Comp {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  n: number;
}

interface Observation {
  /** window in the frame */
  x0: number;
  y0: number;
  w: number;
  h: number;
  /** 1 where the window shows the cursor itself */
  ev: Uint8Array;
  /** the frame's pixels in the window */
  vals: Uint8Array;
  evN: number;
}

/** What one cursor shape looks like, learned from observations over different backgrounds. */
class Model {
  readonly id: number;
  readonly CW: number;
  readonly CH: number;
  private n: Uint16Array;
  private ev: Uint16Array;
  private sum: Float32Array;
  private sum2: Float32Array;
  obs = 0;
  bestEv = 0;
  lastUsed = 0;
  /** where it has been seen moving: a pointer travels, a spinner stays put */
  seenBox = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  confirmed = false;
  // compiled for matching
  idx = new Int32Array(0);
  vals = new Uint8Array(0);
  /** the same pixels as canvas coordinates */
  cx = new Int16Array(0);
  cy = new Int16Array(0);
  count = 0;
  /** has both dark and light pixels of its own, so it can't match a plain area */
  contrast = false;
  /** box of its own pixels and of everything it touches, canvas coords */
  own = { x0: 0, y0: 0, x1: -1, y1: -1 };
  touch = { x0: 0, y0: 0, x1: -1, y1: -1 };
  hx = 0;
  hy = 0;
  private stride = 0;

  constructor(id: number, CW: number, CH: number) {
    this.id = id;
    this.CW = CW;
    this.CH = CH;
    const n = CW * CH;
    this.n = new Uint16Array(n);
    this.ev = new Uint16Array(n);
    this.sum = new Float32Array(n);
    this.sum2 = new Float32Array(n);
  }

  /** Add an observation whose window starts at (ox, oy) in canvas coordinates. */
  add(o: Observation, ox: number, oy: number, W: number, t: number) {
    const b = this.seenBox;
    b.x0 = Math.min(b.x0, o.x0 - ox);
    b.y0 = Math.min(b.y0, o.y0 - oy);
    b.x1 = Math.max(b.x1, o.x0 - ox);
    b.y1 = Math.max(b.y1, o.y0 - oy);
    if (this.obs >= 1 && Math.max(b.x1 - b.x0, b.y1 - b.y0) >= W * 0.03) this.confirmed = true;
    for (let j = 0; j < o.h; j++) {
      const cy = oy + j;
      if (cy < 0 || cy >= this.CH) continue;
      for (let i = 0; i < o.w; i++) {
        const cx = ox + i;
        if (cx < 0 || cx >= this.CW) continue;
        const c = cy * this.CW + cx;
        const k = j * o.w + i;
        const v = o.vals[k];
        this.n[c]++;
        this.sum[c] += v;
        this.sum2[c] += v * v;
        if (o.ev[k]) this.ev[c]++;
      }
    }
    this.obs++;
    this.bestEv = Math.max(this.bestEv, o.evN);
    this.lastUsed = t;
    this.compile(W);
  }

  /** Which canvas pixels are the cursor's own, and their brightness. */
  private ownAt(c: number): number {
    const n = this.n[c];
    if (!n) return -1;
    const e = this.ev[c] / n;
    const mean = this.sum[c] / n;
    if (this.obs < 3) return e >= 0.99 ? mean : -1;
    const sd = Math.sqrt(Math.max(0, this.sum2[c] / n - mean * mean));
    return e >= 0.4 && sd <= 32 ? mean : -1;
  }

  compile(W: number) {
    const idx: number[] = [];
    const vals: number[] = [];
    const cxs: number[] = [];
    const cys: number[] = [];
    let dark = 0;
    let light = 0;
    const own = { x0: Infinity, y0: Infinity, x1: -1, y1: -1 };
    const touch = { x0: Infinity, y0: Infinity, x1: -1, y1: -1 };
    for (let y = 0; y < this.CH; y++) {
      for (let x = 0; x < this.CW; x++) {
        const c = y * this.CW + x;
        const n = this.n[c];
        if (n && this.ev[c] / n >= 0.08) {
          if (x < touch.x0) touch.x0 = x;
          if (x > touch.x1) touch.x1 = x;
          if (y < touch.y0) touch.y0 = y;
          if (y > touch.y1) touch.y1 = y;
        }
        const v = this.ownAt(c);
        if (v < 0) continue;
        idx.push(y * W + x);
        vals.push(Math.round(v));
        cxs.push(x);
        cys.push(y);
        if (v < 85) dark++;
        else if (v > 170) light++;
        if (x < own.x0) own.x0 = x;
        if (x > own.x1) own.x1 = x;
        if (y < own.y0) own.y0 = y;
        if (y > own.y1) own.y1 = y;
      }
    }
    this.idx = Int32Array.from(idx);
    this.vals = Uint8Array.from(vals);
    this.cx = Int16Array.from(cxs);
    this.cy = Int16Array.from(cys);
    this.count = idx.length;
    this.stride = W;
    this.contrast = this.count > 0 && dark / this.count >= 0.1 && light / this.count >= 0.1;
    this.own = own.x1 < 0 ? { x0: 0, y0: 0, x1: -1, y1: -1 } : own;
    this.touch = touch.x1 < 0 ? this.own : touch;
    // hotspot: the topmost pixel (an arrow's tip, a finger); a text beam's middle
    const ow = this.own.x1 - this.own.x0 + 1;
    const oh = this.own.y1 - this.own.y0 + 1;
    const widths = new Array<number>(oh).fill(0);
    for (let i = 0; i < cys.length; i++) widths[cys[i] - this.own.y0]++;
    const third = Math.max(1, Math.floor(oh / 3));
    const mid = widths.slice(third, oh - third);
    const midMean = mid.reduce((a, b) => a + b, 0) / Math.max(1, mid.length);
    const topMax = Math.max(...widths.slice(0, third));
    const beam = oh > 0 && midMean <= ow * 0.6 && topMax >= ow * 0.75 && Math.max(...widths.slice(oh - third)) >= ow * 0.75;
    if (beam) {
      this.hx = (this.own.x0 + this.own.x1) / 2;
      this.hy = (this.own.y0 + this.own.y1) / 2;
    } else {
      let found = false;
      for (let y = this.own.y0; y <= this.own.y1 && !found; y++) {
        for (let x = this.own.x0; x <= this.own.x1; x++) {
          if (this.ownAt(y * this.CW + x) >= 0) {
            this.hx = x;
            this.hy = y;
            found = true;
            break;
          }
        }
      }
    }
  }

  /** The model's own pixels drawn on mid gray, which neither black nor white pixels match. */
  glyph(): Uint8Array {
    const g = new Uint8Array(this.CW * this.CH).fill(128);
    for (let i = 0; i < this.count; i++) g[this.cy[i] * this.CW + this.cx[i]] = this.vals[i];
    return g;
  }

  /** Is this model just (a part of) `B`, seen another way? */
  within(B: Model): boolean {
    const g = B.glyph();
    for (let dy = -this.CH + 1; dy < this.CH; dy++) {
      for (let dx = -this.CW + 1; dx < this.CW; dx++) {
        let sum = 0;
        let ok = true;
        for (let i = 0; i < this.count; i++) {
          const x = this.cx[i] + dx;
          const y = this.cy[i] + dy;
          const v = x < 0 || y < 0 || x >= B.CW || y >= B.CH ? 128 : g[y * B.CW + x];
          const d = v - this.vals[i];
          sum += d < 0 ? -d : d;
          if (sum > ACCEPT * this.count) {
            ok = false;
            break;
          }
        }
        if (ok) return true;
      }
    }
    return false;
  }

  /** Mask of every pixel the cursor touches (shadow included), cropped to `touch`. */
  touchMask(): { w: number; h: number; mask: Uint8Array } {
    const t = this.touch;
    const w = Math.max(1, t.x1 - t.x0 + 1);
    const h = Math.max(1, t.y1 - t.y0 + 1);
    const mask = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const c = (t.y0 + y) * this.CW + t.x0 + x;
        const n = this.n[c];
        if ((n && this.ev[c] / n >= 0.08) || this.ownAt(c) >= 0) mask[y * w + x] = 1;
      }
    }
    return { w, h, mask };
  }

  /** Mean difference of the model's own pixels placed at canvas origin (ox, oy), or Infinity. */
  score(F: Uint8Array, W: number, H: number, ox: number, oy: number, limit: number): number {
    if (!this.count || this.stride !== W) return Infinity;
    if (ox + this.own.x0 < 0 || oy + this.own.y0 < 0 || ox + this.own.x1 >= W || oy + this.own.y1 >= H) return Infinity;
    const base = oy * W + ox;
    const stop = limit * this.count;
    let sum = 0;
    for (let i = 0; i < this.count; i++) {
      const d = F[base + this.idx[i]] - this.vals[i];
      sum += d < 0 ? -d : d;
      if (sum > stop) return Infinity;
    }
    return sum / this.count;
  }

  /** Best canvas origin inside [ax..bx] x [ay..by]: a coarse pass, then a fine one. */
  search(F: Uint8Array, W: number, H: number, ax: number, ay: number, bx: number, by: number): { x: number; y: number; score: number } | null {
    ax = Math.round(ax);
    ay = Math.round(ay);
    bx = Math.round(Math.max(bx, ax));
    by = Math.round(Math.max(by, ay));
    let best = { x: 0, y: 0, score: Infinity };
    const step = (bx - ax) * (by - ay) > 64 ? 2 : 1;
    for (let y = ay; y <= by; y += step) {
      for (let x = ax; x <= bx; x += step) {
        // a coarse step can land a pixel off a thin outline, so don't give up on it early
        const s = this.score(F, W, H, x, y, step > 1 ? Math.min(best.score, 150) : Math.min(best.score, ACCEPT * 2.5));
        if (s < best.score) best = { x, y, score: s };
      }
    }
    if (best.score === Infinity) return null;
    if (step > 1) {
      const c = best;
      for (let y = c.y - 1; y <= c.y + 1; y++) {
        for (let x = c.x - 1; x <= c.x + 1; x++) {
          const s = this.score(F, W, H, x, y, best.score);
          if (s < best.score) best = { x, y, score: s };
        }
      }
    }
    return best;
  }
}

interface FrameInfo {
  t: number;
  /** model canvas origin in analysis pixels, or null */
  ox: number | null;
  oy: number | null;
  model: number;
  /** changed pixels close around the tip that aren't the cursor itself */
  tip: number;
  /** the change at the tip is the screen sliding (a scroll), not a reaction */
  slide: boolean;
  /** a big share of the screen changed (scroll, new page, app switch) */
  big: boolean;
  /** changed pixels anywhere, cursor and animations excluded */
  changed: number;
  /** small changes away from the cursor: centres and sizes */
  far: { x: number; y: number; n: number }[];
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
  private models: Model[] = [];
  private allModels = new Map<number, Model>();
  private nextId = 1;
  private last: { x: number; y: number; t: number; model: number } | null = null;
  private vel = { x: 0, y: 0 };
  private frames: FrameInfo[] = [];
  /** the last few distinct frames, to look back for the cursor once we first learn its shape */
  private history: { gray: Uint8Array; info: FrameInfo }[] = [];
  private activity: ActivitySample[] = [];
  private act = { start: 0, n: 0, x0: Infinity, y0: Infinity, x1: -1, y1: -1 };
  private readonly CW: number;
  private readonly CH: number;
  private readonly cw: number;
  private readonly ch: number;
  private rate: Float32Array;
  private hits: Uint16Array;
  private readonly maxCW: number;
  private readonly maxCH: number;
  private readonly minCW: number;
  private readonly minCH: number;
  private readonly minN: number;
  private readonly durationMs: number;
  /** first pass: only learn what the cursor looks like */
  private learning = false;
  /** look for the cursor everywhere (it may be resting where nothing moves) */
  private searchAll = true;
  private lostFrames = 0;

  constructor(W: number, H: number, durationMs: number) {
    this.W = W;
    this.H = H;
    this.N = W * H;
    this.durationMs = durationMs;
    this.dNext = new Uint8Array(this.N);
    this.seen = new Uint8Array(this.N);
    this.stack = new Int32Array(this.N);
    this.maxCW = Math.max(8, Math.round(W * 0.04));
    this.maxCH = Math.max(10, Math.round(W * 0.05));
    // a text beam is only a couple of pixels wide
    this.minCW = 2;
    this.minCH = Math.max(5, Math.round(W * 0.007));
    this.minN = Math.max(8, Math.round(W * 0.0002 * W * 0.04));
    this.CW = this.maxCW + PAD * 2 + 6;
    this.CH = this.maxCH + PAD * 2 + 6;
    this.cw = Math.ceil(W / CELL);
    this.ch = Math.ceil(H / CELL);
    this.rate = new Float32Array(this.cw * this.ch);
    this.hits = new Uint16Array(this.cw * this.ch);
  }

  /**
   * Optional first pass: feed every frame to `learn` (what the cursor looks
   * like), then call `startTracking` and feed them all again to `push`.
   * Tracking then knows the cursor's every shape from the first frame.
   */
  learn(gray: Uint8Array, t: number) {
    this.learning = true;
    this.push(gray, t);
  }

  startTracking() {
    this.learning = false;
    this.models = this.distinct().slice(-MAX_MODELS);
    this.prev = this.cur = this.dCur = null;
    this.compsCur = null;
    this.curT = 0;
    this.dCurCount = 0;
    this.last = null;
    this.vel = { x: 0, y: 0 };
    this.frames = [];
    this.history = [];
    this.activity = [];
    this.act = { start: 0, n: 0, x0: Infinity, y0: Infinity, x1: -1, y1: -1 };
    this.rate.fill(0);
    this.searchAll = true;
    this.lostFrames = 0;
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
    this.learning = false;
    if (this.cur && this.prev) this.step(null, 0);
    this.flushActivity(this.durationMs, true);
    return this.result();
  }

  /* ------------------------------ per frame ------------------------------ */

  /** Decide where the cursor is in `cur`, now that the frame after it (`next`) is known. */
  private step(next: Uint8Array | null, nextCount: number) {
    const F = this.cur!;
    const info: FrameInfo = { t: this.curT, ox: null, oy: null, model: 0, tip: 0, slide: false, big: false, changed: 0, far: [] };
    if (this.learning) {
      if (!this.prev || !this.dCur || !next) return;
      const big = this.dCurCount > this.N * 0.2;
      const comps = big ? [] : components(this.dCur, this.W, this.H, this.seen, this.stack);
      this.updateBusy(comps, [], big);
      if (!big && nextCount <= this.N * 0.2 && this.dCurCount <= this.N * 0.06 && comps.length <= 80) {
        const seen = this.observeMoving(F, this.prev, next, comps);
        const S = seen && this.allModels.get(seen.model);
        if (seen && S?.confirmed) this.last = { x: seen.x, y: seen.y, t: this.curT, model: seen.model };
      }
      return;
    }
    if (!this.prev || !this.dCur) {
      // the first frame: the cursor may be resting anywhere
      const found = this.searchAll ? this.findAnywhere(F) : null;
      this.searchAll = false;
      if (found) {
        this.last = { ...found, t: this.curT };
        Object.assign(info, { ox: found.x, oy: found.y, model: found.model });
      }
      this.frames.push(info);
      this.history.push({ gray: F, info });
      return;
    }
    const big = this.dCurCount > this.N * 0.2;
    const comps = this.compsCur ?? (this.compsCur = big ? [] : components(this.dCur, this.W, this.H, this.seen, this.stack));

    let found = this.track(F, comps);
    // lost for a while (hidden while typing, say): look everywhere now and then
    if (!found && !this.last && ++this.lostFrames % 30 === 0) found = this.findAnywhere(F);
    if (found) this.lostFrames = 0;
    let tentative: { x: number; y: number; model: number } | null = null;
    // while the screen scrolls or loads, letters and icons move too: don't learn from them
    const calm = this.dCurCount <= this.N * 0.06 && comps.length <= 80;
    if (next && nextCount <= this.N * 0.2 && !big && calm) {
      const seen = this.observeMoving(F, this.prev, next, comps);
      if (seen && !this.allModels.get(seen.model)!.confirmed) {
        // not proven to be the cursor yet: note it, but don't follow it
        if (!found) tentative = seen;
      } else if (seen) {
        // a match that stood still while a known cursor moved elsewhere was a false match
        const still = found && this.last && Math.abs(found.x - this.last.x) <= 2 && Math.abs(found.y - this.last.y) <= 2;
        const M = found && this.allModels.get(found.model);
        const S = this.allModels.get(seen.model)!;
        const overlaps =
          found && M && found.x + M.own.x0 <= seen.x + S.own.x1 && found.x + M.own.x1 >= seen.x + S.own.x0 && found.y + M.own.y0 <= seen.y + S.own.y1 && found.y + M.own.y1 >= seen.y + S.own.y0;
        if (!found || (still && !overlaps && seen.known)) found = seen;
      }
    }
    if (found) {
      if (this.last) {
        const dt = Math.max(1, this.curT - this.last.t);
        this.vel = { x: ((found.x - this.last.x) / dt) * 33, y: ((found.y - this.last.y) / dt) * 33 };
      }
      this.last = { x: found.x, y: found.y, t: this.curT, model: found.model };
      info.ox = found.x;
      info.oy = found.y;
      info.model = found.model;
    } else if (tentative) {
      info.ox = tentative.x;
      info.oy = tentative.y;
      info.model = tentative.model;
    } else if (this.last && this.curT - this.last.t > 400) {
      this.last = null;
      this.vel = { x: 0, y: 0 };
    }
    info.big = big;
    this.measureChanges(info, comps, F, this.prev);
    this.frames.push(info);
    this.history.push({ gray: F, info });
    if (this.history.length > 12) this.history.shift();
  }

  /** Confirmed models, minus any that are only a part of a fuller one (a glimpse at the screen's edge). */
  private distinct(): Model[] {
    const ms = [...this.allModels.values()].filter((M) => M.confirmed && M.contrast).sort((a, b) => b.count - a.count);
    const keep: Model[] = [];
    for (const M of ms) if (!keep.some((B) => M.within(B))) keep.push(M);
    return keep;
  }

  /** The cursor anywhere in the frame, with a strict match. */
  private findAnywhere(F: Uint8Array): { x: number; y: number; model: number } | null {
    let best: { x: number; y: number; model: number; score: number } | null = null;
    for (const M of this.models) {
      if (!this.ready(M)) continue;
      const r = M.search(F, this.W, this.H, -M.own.x0, -M.own.y0, this.W - M.own.x1 - 1, this.H - M.own.y1 - 1);
      if (r && r.score <= ACCEPT * 0.8 && (!best || r.score < best.score)) best = { x: r.x, y: r.y, model: M.id, score: r.score };
    }
    return best && { x: best.x, y: best.y, model: best.model };
  }

  /** Remember how often each cell changes: a spinner or a playing video changes all the time. */
  private updateBusy(comps: Comp[], rects: [number, number, number, number][], big: boolean) {
    const W = this.W;
    const D = this.dCur!;
    const hits = this.hits;
    hits.fill(0);
    if (!big) {
      for (const c of comps) {
        for (let y = c.y0; y <= c.y1; y++) {
          for (let x = c.x0, k = y * W + c.x0; x <= c.x1; x++, k++) {
            if (!D[k]) continue;
            let inside = false;
            for (const [a, b, cc, d] of rects) if (x >= a && x <= cc && y >= b && y <= d) inside = true;
            if (!inside) hits[((y / CELL) | 0) * this.cw + ((x / CELL) | 0)]++;
          }
        }
      }
    }
    for (let i = 0; i < this.rate.length; i++) this.rate[i] = this.rate[i] * 0.9 + (big || hits[i] >= 3 ? 0.1 : 0);
  }

  /** The models that can be matched anywhere (not just where something moved). */
  private ready(M: Model) {
    return M.confirmed && M.count >= this.minN * 0.6 && M.contrast;
  }

  private track(F: Uint8Array, comps: Comp[]): { x: number; y: number; model: number } | null {
    if (!this.models.length) return null;
    let best: { x: number; y: number; model: number; cost: number } | null = null;
    const last = this.last;
    const pred = last ? { x: last.x + this.vel.x, y: last.y + this.vel.y } : null;
    // where something changed near the cursor's size, closest to where it was first
    const near = comps
      .filter((c) => c.n >= 3 && c.x1 - c.x0 <= this.maxCW * 4 && c.y1 - c.y0 <= this.maxCH * 4)
      .sort((a, b) => (last ? Math.hypot(a.x0 - last.x, a.y0 - last.y) - Math.hypot(b.x0 - last.x, b.y0 - last.y) : b.n - a.n))
      .slice(0, 40);
    for (const M of this.models) {
      if (!this.ready(M)) continue;
      const regions: [number, number, number, number][] = [];
      // the cursor keeps its hotspot when it changes shape: line the models' hotspots up
      if (last) {
        const L = this.allModels.get(last.model);
        const dx = L ? L.hx - M.hx : 0;
        const dy = L ? L.hy - M.hy : 0;
        regions.push([last.x + dx - 2, last.y + dy - 2, last.x + dx + 2, last.y + dy + 2]);
        if (pred && (Math.abs(this.vel.x) > 1 || Math.abs(this.vel.y) > 1)) regions.push([pred.x + dx - 5, pred.y + dy - 5, pred.x + dx + 5, pred.y + dy + 5]);
      }
      for (const c of near) {
        regions.push([c.x0 - M.own.x1 + 1, c.y0 - M.own.y1 + 1, c.x1 - M.own.x0, c.y1 - M.own.y0]);
      }
      for (const [ax, ay, bx, by] of regions) {
        const r = M.search(F, this.W, this.H, ax, ay, bx, by);
        if (!r || r.score > ACCEPT) continue;
        const hx = r.x + M.hx;
        const hy = r.y + M.hy;
        const L = last && this.allModels.get(last.model);
        const dist = pred && L ? Math.hypot(hx - (pred.x + L.hx), hy - (pred.y + L.hy)) : 0;
        const cost = r.score + Math.min(12, dist * 0.05) + (last && M.id !== last.model ? 2 : 0);
        if (!best || cost < best.cost) best = { x: r.x, y: r.y, model: M.id, cost };
      }
    }
    if (!best) return null;
    this.allModels.get(best.model)!.lastUsed = this.curT;
    return { x: best.x, y: best.y, model: best.model };
  }

  /**
   * Moving objects that look like a pointer teach the models what the cursor
   * looks like. Returns where the best one is, as a model origin.
   */
  private observeMoving(F: Uint8Array, P: Uint8Array, N: Uint8Array, comps: Comp[]): { x: number; y: number; model: number; known: boolean } | null {
    let best: { x: number; y: number; model: number; known: boolean; d: number } | null = null;
    let tried = 0;
    for (const c of comps) {
      const bw = c.x1 - c.x0 + 1;
      const bh = c.y1 - c.y0 + 1;
      if (bw > this.maxCW * 3 || bh > this.maxCH * 3 || c.n < this.minN) continue;
      if (this.rate[(((c.y0 + c.y1) / 2 / CELL) | 0) * this.cw + (((c.x0 + c.x1) / 2 / CELL) | 0)] > BUSY) continue;
      if (++tried > 24) break;
      const o = this.observe(F, P, N, c);
      if (!o) continue;
      // the shape we know it as, lined up
      let match: { M: Model; x: number; y: number; score: number } | null = null;
      for (const M of this.models) {
        if (!M.count) continue;
        // anywhere the shape overlaps the glimpse: a slow move shows only part of it
        const r = M.search(F, this.W, this.H, o.x0 - M.own.x1, o.y0 - M.own.y1, o.x0 + o.w - M.own.x0, o.y0 + o.h - M.own.y0);
        if (r && r.score <= ACCEPT * 1.2 && (!match || r.score < match.score)) match = { M, ...r };
      }
      let at: { x: number; y: number; model: number; known: boolean };
      if (match) {
        // a partial glimpse (it barely moved) doesn't teach the model anything
        const was = match.M.confirmed;
        if (o.evN >= match.M.bestEv * 0.6) match.M.add(o, o.x0 - match.x, o.y0 - match.y, this.W, this.curT);
        // just proven to be the cursor: find it in the frames before, too
        if (!was && match.M.confirmed) this.backfill(match.M, match.x, match.y);
        at = { x: match.x, y: match.y, model: match.M.id, known: match.M.confirmed };
      } else {
        const M = new Model(this.nextId++, this.CW, this.CH);
        const ox = o.x0 - 3;
        const oy = o.y0 - 3;
        M.add(o, 3, 3, this.W, this.curT);
        if (!M.contrast) continue;
        // a new shape right where the cursor just was: the cursor changing shape (arrow to hand or text beam)
        const L = this.last && this.allModels.get(this.last.model);
        if (L && this.last && this.curT - this.last.t <= 300) {
          const d = Math.hypot(ox + M.hx - (this.last.x + L.hx), oy + M.hy - (this.last.y + L.hy));
          if (d <= Math.max(L.own.y1 - L.own.y0, this.W * 0.02)) M.confirmed = true;
        }
        this.models.push(M);
        this.allModels.set(M.id, M);
        if (this.models.length > MAX_MODELS) {
          this.models.sort((a, b) => b.lastUsed - a.lastUsed);
          this.models.length = MAX_MODELS;
        }
        at = { x: ox, y: oy, model: M.id, known: M.confirmed };
      }
      const L = this.last && this.allModels.get(this.last.model);
      const d = this.last && L ? Math.hypot(at.x - this.last.x, at.y - this.last.y) : 0;
      if (!best || d < best.d) best = { ...at, d };
    }
    return best;
  }

  /** The cursor's pixels in `F` around a moving object, or null if it doesn't look like a pointer. */
  private observe(F: Uint8Array, P: Uint8Array, N: Uint8Array, c: Comp): Observation | null {
    const W = this.W;
    let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1, n = 0;
    const ax = Math.max(0, c.x0 - 2);
    const ay = Math.max(0, c.y0 - 2);
    const bx = Math.min(W - 1, c.x1 + 2);
    const by = Math.min(this.H - 1, c.y1 + 2);
    for (let y = ay; y <= by; y++) {
      for (let x = ax, k = y * W + ax; x <= bx; x++, k++) {
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
    if (n < this.minN) return null;
    const sw = x1 - x0 + 1;
    const sh = y1 - y0 + 1;
    if (sw < this.minCW || sh < this.minCH || sw > this.maxCW || sh > this.maxCH) return null;
    if (n / (sw * sh) < 0.12) return null;
    // half off the screen: only part of the shape
    if (x0 < PAD || y0 < PAD || x1 >= W - PAD || y1 >= this.H - PAD) return null;
    // the window, with a margin
    const wx = Math.max(0, x0 - PAD);
    const wy = Math.max(0, y0 - PAD);
    const ww = Math.min(W - 1, x1 + PAD) - wx + 1;
    const wh = Math.min(this.H - 1, y1 + PAD) - wy + 1;
    const vals = new Uint8Array(ww * wh);
    const strong = new Uint8Array(ww * wh);
    for (let j = 0; j < wh; j++) {
      for (let i = 0; i < ww; i++) {
        const k = (wy + j) * W + wx + i;
        vals[j * ww + i] = F[k];
        const a = F[k] - P[k];
        const b = F[k] - N[k];
        if ((a > STRONG || a < -STRONG) && (b > STRONG || b < -STRONG)) strong[j * ww + i] = 1;
      }
    }
    // inside an outline is the cursor too, even where it matches the screen behind it
    const filled = fillHoles(strong, ww, wh);
    let dark0 = 0;
    let light0 = 0;
    let cnt = 0;
    for (let i = 0; i < filled.length; i++) {
      if (!filled[i]) continue;
      cnt++;
      if (vals[i] < 85) dark0++;
      else if (vals[i] > 170) light0++;
    }
    // a black arrow on a white page shows no white outline: the rim around it is that outline
    const ev = filled.slice();
    const want = dark0 < cnt * 0.1 ? "dark" : light0 < cnt * 0.1 ? "light" : null;
    if (want) {
      for (let j = 0; j < wh; j++) {
        for (let i = 0; i < ww; i++) {
          const k = j * ww + i;
          if (filled[k]) continue;
          const touches = (i > 0 && filled[k - 1]) || (i < ww - 1 && filled[k + 1]) || (j > 0 && filled[k - ww]) || (j < wh - 1 && filled[k + ww]);
          if (touches && (want === "dark" ? vals[k] < 85 : vals[k] > 170)) ev[k] = 1;
        }
      }
    }
    let evN = 0;
    let dark = 0;
    let light = 0;
    for (let i = 0; i < ev.length; i++) {
      if (!ev[i]) continue;
      evN++;
      if (vals[i] < 85) dark++;
      else if (vals[i] > 170) light++;
    }
    // pointers are drawn in black and white
    if (dark / evN < 0.1 || light / evN < 0.1 || (dark + light) / evN < 0.55) return null;
    return { x0: wx, y0: wy, w: ww, h: wh, ev, vals, evN };
  }

  /**
   * We only learn the cursor's shape once it moves. Look back through the
   * frames before that for the same shape, so a cursor resting at the start
   * is found too.
   */
  private backfill(M: Model, ox: number, oy: number) {
    let ref = { x: ox, y: oy };
    const r = Math.round(this.W * 0.12);
    for (let i = this.history.length - 1; i >= 0; i--) {
      const h = this.history[i];
      if (h.info.ox != null && this.allModels.get(h.info.model)?.confirmed && h.info.model !== M.id) break;
      const m = M.search(h.gray, this.W, this.H, ref.x - r, ref.y - r, ref.x + r, ref.y + r);
      if (!m || m.score > ACCEPT) break;
      Object.assign(h.info, { ox: m.x, oy: m.y, model: M.id });
      ref = m;
    }
  }

  /** Changes in `cur` that aren't the cursor or a running animation: at the tip (clicks), away from it (typing) and overall (zooms). */
  private measureChanges(info: FrameInfo, comps: Comp[], F: Uint8Array, P: Uint8Array) {
    const W = this.W;
    const H = this.H;
    const D = this.dCur!;
    // the cursor's old and new spots, with a margin
    const rects: [number, number, number, number][] = [];
    const prevInfo = this.frames.at(-1);
    for (const f of [prevInfo, info]) {
      if (!f || f.ox == null) continue;
      const M = this.allModels.get(f.model)!;
      rects.push([f.ox + M.touch.x0 - 2, f.oy! + M.touch.y0 - 2, f.ox + M.touch.x1 + 2, f.oy! + M.touch.y1 + 2]);
    }
    const inRects = (x: number, y: number) => {
      for (const [a, b, c, d] of rects) if (x >= a && x <= c && y >= b && y <= d) return true;
      return false;
    };
    this.updateBusy(comps, rects, info.big);
    const busyAt = (x: number, y: number) => this.rate[((y / CELL) | 0) * this.cw + ((x / CELL) | 0)] > BUSY;

    if (info.big) {
      info.changed = this.dCurCount;
      this.addActivity(0, 0, W - 1, H - 1, this.dCurCount);
      return;
    }
    const M = info.ox != null ? this.allModels.get(info.model)! : prevInfo?.ox != null ? this.allModels.get(prevInfo.model)! : null;
    const tx = info.ox != null ? info.ox + M!.hx : prevInfo?.ox != null ? prevInfo.ox + M!.hx : null;
    const ty = info.oy != null ? info.oy + M!.hy : prevInfo?.oy != null ? prevInfo.oy + M!.hy : null;
    const ch = M ? M.own.y1 - M.own.y0 + 1 : Math.round(W * 0.016);
    const rTip = Math.max(ch * 0.9, W * 0.012);
    const rNear = Math.max(ch * 3, W * 0.04);
    let tip = 0;
    let tipBox: [number, number, number, number] | null = null;
    for (const c of comps) {
      // a component that is only the cursor moving doesn't count
      if (rects.some(([a, b, cc, d]) => c.x0 >= a && c.y0 >= b && c.x1 <= cc && c.y1 <= d)) continue;
      const mx = (c.x0 + c.x1) / 2;
      const my = (c.y0 + c.y1) / 2;
      // things that animate all the time aren't reactions to anything
      if (busyAt(mx, my) && c.x1 - c.x0 < W * 0.2) continue;
      let n = 0;
      let nTip = 0;
      const overlapsCursor = rects.some(([a, b, cc, d]) => c.x1 >= a && c.x0 <= cc && c.y1 >= b && c.y0 <= d);
      const closeToTip = tx != null && c.x1 >= tx - rTip && c.x0 <= tx + rTip && c.y1 >= ty! - rTip && c.y0 <= ty! + rTip;
      if (overlapsCursor || closeToTip) {
        for (let y = c.y0; y <= c.y1; y++) {
          for (let x = c.x0, k = y * W + c.x0; x <= c.x1; x++, k++) {
            if (!D[k] || inRects(x, y)) continue;
            n++;
            if (closeToTip && Math.abs(x - tx!) <= rTip && Math.abs(y - ty!) <= rTip) nTip++;
          }
        }
        if (!n) continue;
      } else n = c.n;
      info.changed += n;
      tip += nTip;
      if (nTip) tipBox = tipBox ? [Math.min(tipBox[0], c.x0), Math.min(tipBox[1], c.y0), Math.max(tipBox[2], c.x1), Math.max(tipBox[3], c.y1)] : [c.x0, c.y0, c.x1, c.y1];
      this.addActivity(c.x0, c.y0, c.x1, c.y1, n);
      const d = tx == null ? Infinity : Math.hypot(mx - tx, my - ty!);
      if (d > rNear && c.x1 - c.x0 < W * 0.05 && c.y1 - c.y0 < W * 0.035 && info.far.length < 6) info.far.push({ x: mx, y: my, n: c.n });
    }
    info.tip = tip;
    // the screen sliding under a resting pointer is a scroll, not a click
    if (tip && tx != null) info.slide = slides(F, P, W, H, Math.round(tx), Math.round(ty!), Math.round(rNear));
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
    // shapes that never went anywhere aren't the cursor
    const extent = new Map<number, { x0: number; y0: number; x1: number; y1: number; n: number }>();
    for (const f of frames) {
      if (!f.model) continue;
      const e = extent.get(f.model) ?? { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity, n: 0 };
      e.x0 = Math.min(e.x0, f.ox!);
      e.y0 = Math.min(e.y0, f.oy!);
      e.x1 = Math.max(e.x1, f.ox!);
      e.y1 = Math.max(e.y1, f.oy!);
      e.n++;
      extent.set(f.model, e);
    }
    // the cursor moves; a shape seen once in a corner is something else
    const moving = new Set<number>();
    for (const [id, e] of extent) {
      const M = this.allModels.get(id)!;
      if (Math.max(e.x1 - e.x0, e.y1 - e.y0) >= W * 0.04 && e.n >= 3 && M.obs >= 2) moving.add(id);
    }
    const live = [...moving].map((id) => this.allModels.get(id)!);
    const shapeOf = new Map(live.map((M, i) => [M.id, i]));
    const shapes: CursorShape[] = live.map((M) => {
      const { w, h, mask } = M.touchMask();
      return { w, h, mask, hx: M.hx - M.touch.x0, hy: M.hy - M.touch.y0 };
    });

    const points: CursorPoint[] = frames.map((f) => {
      if (!f.model || !moving.has(f.model)) return { t: f.t, x: 0, y: 0, visible: false };
      const M = this.allModels.get(f.model)!;
      return { t: f.t, x: (f.ox! + M.hx) / W, y: (f.oy! + M.hy) / H, visible: true, shape: shapeOf.get(f.model) };
    });
    fillGaps(points, 450);
    holdStills(points);
    const visible = points.filter((p) => p.visible).length;
    let cursor: CursorTrack | null = null;
    if (visible >= 3 && live.length) {
      // the size of the main pointer: the shape seen most
      const seen = new Map<number, number>();
      for (const p of points) if (p.visible && p.shape != null) seen.set(p.shape, (seen.get(p.shape) ?? 0) + 1);
      const main = [...seen].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
      const M = live[main];
      cursor = { points, shapes, res: { w: W, h: H }, w: (M.own.x1 - M.own.x0 + 1) / W, h: (M.own.y1 - M.own.y0 + 1) / H };
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
    // what's under a resting pointer changed so much it no longer matches: it's
    // most likely still there, so hold it briefly
    const before = points[i - 2];
    if (a && before?.visible && Math.hypot(a.x - before.x, a.y - before.y) < 0.002 && (!b || Math.hypot(b.x - a.x, b.y - a.y) > 0.01 || b.t - a.t > maxMs)) {
      for (let k = i; k < j && points[k].t - a.t <= 300; k++) points[k] = { ...points[k], x: a.x, y: a.y, visible: true, shape: a.shape };
    } else if (a && b && b.t - a.t <= maxMs) {
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
  const minTip = Math.max(8, cursor.w * W * cursor.h * H * 0.12);
  const clicks: ClickEvent[] = [];
  let stillSince: number | null = null;
  let lastClick = -Infinity;
  let lastBig = -Infinity;
  let prevTip = 0;
  let prev: CursorPoint | undefined;
  // the pointer rests through a click; a change as it sets off is it leaving (a hover ending)
  const staysPut = (i: number, p: CursorPoint) => {
    for (let j = i + 1; j < frames.length && frames[j].t <= frames[i].t + 70; j++) {
      const q = byT.get(frames[j].t);
      if (q && Math.hypot((q.x - p.x) * W, (q.y - p.y) * H) > 4) return false;
    }
    return true;
  };
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    if (f.big) lastBig = f.t;
    const p = byT.get(f.t);
    if (!p) {
      stillSince = null;
      prev = undefined;
      prevTip = f.tip;
      continue;
    }
    const moved = prev ? Math.hypot((p.x - prev.x) * W, (p.y - prev.y) * H) : Infinity;
    // screen capture skips identical frames: a short last step before a long gap
    // means the cursor arrived right after the previous frame, not now
    if (moved > 2.5) stillSince = prev && f.t - prev.t > 150 && moved < W * 0.03 ? prev.t + 40 : null;
    else if (stillSince == null) stillSince = prev?.t ?? f.t;
    const dwell = stillSince == null ? 0 : f.t - stillSince;
    // something new right at the tip, not the screen sliding (a scroll) or a whole-screen change
    const onset = f.tip >= minTip && prevTip < minTip * 0.5 && !f.slide && f.t - lastBig > 250;
    // one click per stop: what follows (typing, a menu animating) isn't another click
    const sameStop = stillSince != null && lastClick >= stillSince && f.t - lastClick < 2500;
    if (dwell >= 80 && onset && f.t - lastClick > 400 && !sameStop && staysPut(i, p)) {
      // the press happened a moment before the screen reacted
      const t = Math.max(stillSince ?? f.t, f.t - 70);
      clicks.push({ id: clickId(), t, x: p.x, y: p.y });
      lastClick = f.t;
    }
    prev = p;
    prevTip = f.tip;
  }
  return clicks;
}

/**
 * Typing: small changes landing one after another along a line, each a
 * little further on (text growing at a caret). A spinner or a blinking caret
 * changes in one place, so it doesn't count.
 */
function detectTyping(frames: FrameInfo[], W: number, H: number): TypingBurst[] {
  type Ev = { t: number; x: number; y: number };
  const events: Ev[] = [];
  for (const f of frames) {
    if (f.big || !f.far.length || f.far.length > 3 || f.tip) continue;
    const c = f.far.reduce((a, b) => (b.n > a.n ? b : a));
    events.push({ t: f.t, x: c.x, y: c.y });
  }
  const bursts: TypingBurst[] = [];
  let run: Ev[] = [];
  const close = () => {
    if (run.length >= 5) {
      const gaps = run.slice(1).map((e, i) => e.t - run[i].t).sort((a, b) => a - b);
      const median = gaps[Math.floor(gaps.length / 2)];
      const xs = run.map((e) => e.x);
      // text grows: most steps move right, and it ends well right of where it began
      let fwd = 0;
      for (let i = 1; i < run.length; i++) if (run[i].x - run[i - 1].x > 0.5) fwd++;
      const progress = xs.at(-1)! - xs[0];
      if (median <= 300 && fwd >= (run.length - 1) * 0.6 && progress >= W * 0.02) {
        bursts.push({
          startMs: run[0].t,
          endMs: run.at(-1)!.t,
          x: xs.reduce((a, b) => a + b, 0) / xs.length / W,
          y: run.reduce((a, e) => a + e.y, 0) / run.length / H,
        });
      }
    }
    run = [];
  };
  for (const e of events) {
    const last = run.at(-1);
    if (last && (e.t - last.t > 650 || Math.abs(e.y - last.y) > H * 0.03 || e.x < last.x - W * 0.05 || e.x > last.x + W * 0.08)) close();
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

/** The mask with every region it encloses filled in. */
function fillHoles(mask: Uint8Array, w: number, h: number): Uint8Array {
  const outside = new Uint8Array(w * h);
  const stack: number[] = [];
  const push = (k: number) => {
    if (!mask[k] && !outside[k]) {
      outside[k] = 1;
      stack.push(k);
    }
  };
  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    push(y * w);
    push(y * w + w - 1);
  }
  while (stack.length) {
    const k = stack.pop()!;
    const x = k % w;
    const y = (k - x) / w;
    if (x > 0) push(k - 1);
    if (x < w - 1) push(k + 1);
    if (y > 0) push(k - w);
    if (y < h - 1) push(k + w);
  }
  const out = new Uint8Array(w * h);
  for (let i = 0; i < out.length; i++) out[i] = outside[i] ? 0 : 1;
  return out;
}

/**
 * Did the area around (cx, cy) slide (scroll) between P and F? True when
 * some small vertical or sideways shift of P lines up with F much better than
 * P as it was.
 */
function slides(F: Uint8Array, P: Uint8Array, W: number, H: number, cx: number, cy: number, r: number): boolean {
  const x0 = Math.max(0, cx - r);
  const x1 = Math.min(W - 1, cx + r);
  const y0 = Math.max(0, cy - r);
  const y1 = Math.min(H - 1, cy + r);
  const mad = (dx: number, dy: number) => {
    let s = 0;
    let n = 0;
    for (let y = y0; y <= y1; y += 2) {
      const py = y + dy;
      if (py < 0 || py >= H) continue;
      for (let x = x0; x <= x1; x += 2) {
        const px = x + dx;
        if (px < 0 || px >= W) continue;
        const d = F[y * W + x] - P[py * W + px];
        s += d < 0 ? -d : d;
        n++;
      }
    }
    return n ? s / n : Infinity;
  };
  const still = mad(0, 0);
  if (still < 2) return false;
  const lim = Math.round(r * 0.6);
  for (let d = 1; d <= lim; d++) {
    for (const [dx, dy] of [[0, d], [0, -d], [d, 0], [-d, 0]]) if (mad(dx, dy) < still * 0.4) return true;
  }
  return false;
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
