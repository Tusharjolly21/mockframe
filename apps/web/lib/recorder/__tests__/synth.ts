/**
 * Synthetic screen recordings for the tracker tests: a busy UI, a real
 * arrow-shaped cursor that moves, stops and clicks, a button that reacts,
 * text that gets typed, and compression-like noise.
 */

// classic arrow, tip at (0, 0), in cursor pixels at scale 1
const ARROW: [number, number][] = [
  [0, 0],
  [0, 16],
  [4, 12.5],
  [7, 18.5],
  [9.5, 17.5],
  [6.5, 11.5],
  [11.5, 11.5],
];

function inside(poly: [number, number][], x: number, y: number) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/** The cursor as a sprite: 0 = transparent, 1 = outline, 2 = fill. */
export function cursorSprite(scale: number): { w: number; h: number; px: Uint8Array } {
  const poly = ARROW.map(([x, y]) => [x * scale, y * scale] as [number, number]);
  const w = Math.ceil(12 * scale) + 2;
  const h = Math.ceil(19 * scale) + 2;
  const px = new Uint8Array(w * h);
  const o = Math.max(1, scale * 0.9);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const cx = x + 0.5 - 1;
      const cy = y + 0.5 - 1;
      if (inside(poly, cx, cy)) px[y * w + x] = 2;
      else {
        let edge = false;
        for (let a = 0; a < 8 && !edge; a++) edge = inside(poly, cx + Math.cos((a * Math.PI) / 4) * o, cy + Math.sin((a * Math.PI) / 4) * o);
        if (edge) px[y * w + x] = 1;
      }
    }
  }
  return { w, h, px };
}

/** deterministic noise */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export interface SynthOpts {
  W: number;
  H: number;
  fps: number;
  durationMs: number;
  /** cursor tip in pixels at time t, or null when hidden */
  path: (t: number) => { x: number; y: number } | null;
  /** extra drawing per frame (button states, typed text) */
  paint?: (frame: Uint8Array, t: number) => void;
  scale?: number;
  /** "mac" = black arrow with a white edge, "win" = white with a black edge */
  look?: "mac" | "win";
  noise?: number;
}

/** A busy desktop-ish background: panels, text lines, icons. */
export function background(W: number, H: number, seed = 7): Uint8Array {
  const r = rng(seed);
  const bg = new Uint8Array(W * H).fill(236);
  const rect = (x: number, y: number, w: number, h: number, v: number) => {
    for (let yy = Math.max(0, y); yy < Math.min(H, y + h); yy++) for (let xx = Math.max(0, x); xx < Math.min(W, x + w); xx++) bg[yy * W + xx] = v;
  };
  rect(0, 0, W, Math.round(H * 0.06), 40); // dark top bar
  rect(0, 0, Math.round(W * 0.18), H, 210); // sidebar
  for (let i = 0; i < 40; i++) {
    const y = Math.round(H * 0.1 + r() * H * 0.85);
    const x = Math.round(W * 0.2 + r() * W * 0.6);
    rect(x, y, Math.round(20 + r() * W * 0.25), 3, 90 + Math.round(r() * 60)); // text lines
  }
  for (let i = 0; i < 12; i++) rect(Math.round(r() * W), Math.round(r() * H), 14, 14, Math.round(r() * 255)); // icons
  return bg;
}

export function synthFrames(o: SynthOpts): { t: number; gray: Uint8Array }[] {
  const { W, H } = o;
  const base = background(W, H);
  const sprite = cursorSprite(o.scale ?? 1);
  const noise = rng(99);
  const amp = o.noise ?? 4;
  const out: { t: number; gray: Uint8Array }[] = [];
  const [edge, fill] = o.look === "win" ? [10, 250] : [252, 12];
  for (let t = 0; t <= o.durationMs; t += 1000 / o.fps) {
    const f = base.slice();
    o.paint?.(f, t);
    const p = o.path(t);
    if (p) {
      const px = Math.round(p.x);
      const py = Math.round(p.y);
      for (let y = 0; y < sprite.h; y++) {
        for (let x = 0; x < sprite.w; x++) {
          const v = sprite.px[y * sprite.w + x];
          if (!v) continue;
          // sprite has a 1px margin before the tip
          const X = px + x - 1;
          const Y = py + y - 1;
          if (X >= 0 && Y >= 0 && X < W && Y < H) f[Y * W + X] = v === 1 ? edge : fill;
        }
      }
    }
    if (amp) for (let i = 0; i < f.length; i++) f[i] = Math.max(0, Math.min(255, f[i] + Math.round((noise() - 0.5) * 2 * amp)));
    out.push({ t: Math.round(t), gray: f });
  }
  return out;
}

/** Piecewise path: glide between waypoints with ease in-out, wait at each. */
export function waypoints(stops: { x: number; y: number; at: number; wait: number }[]) {
  return (t: number) => {
    for (let i = 0; i < stops.length; i++) {
      const s = stops[i];
      if (t < s.at) {
        const a = stops[i - 1];
        if (!a) return { x: s.x, y: s.y };
        const t0 = a.at + a.wait;
        if (t <= t0) return { x: a.x, y: a.y };
        const k = (t - t0) / (s.at - t0);
        const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
        return { x: a.x + (s.x - a.x) * e, y: a.y + (s.y - a.y) * e };
      }
    }
    const l = stops.at(-1)!;
    return { x: l.x, y: l.y };
  };
}
