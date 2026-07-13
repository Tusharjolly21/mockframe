"use client";

/**
 * Export watermarking — three layers of protection, all baked into pixels
 * (so screenshots of an export carry them too):
 *
 *  1. Tiled diagonal text across the WHOLE canvas, including device screens.
 *     Cropping can't remove it, and AI inpainting has to hallucinate the
 *     content underneath every tile — visibly degrading the screenshot.
 *  2. Corner brand badge (the classic "Made with MockFrame" pill).
 *  3. Invisible forensic watermark: a keyed ±2/255 spread-spectrum pattern in
 *     the blue channel. Survives PNG and mild JPEG/WebP compression; even if
 *     the visible marks are scrubbed, detectForensicWatermark() proves origin.
 *
 * Free tier gets all three; Pro (removeWatermark) still gets the forensic
 * layer only — invisible, and useful for abuse tracing.
 */

export interface WatermarkOptions {
  /** draw the tiled diagonal text layer */
  tile?: boolean;
  /** draw the corner badge */
  badge?: boolean;
  /** embed the invisible forensic pattern (key must match detection) */
  forensicKey?: string | null;
  /** brand string for tile + badge */
  brand?: string;
}

export const FORENSIC_KEY = "mockframe-v1"; // rotate if ever leaked

/* ------------------------------ visible layers ------------------------------ */

function drawTiles(ctx: CanvasRenderingContext2D, w: number, h: number, brand: string) {
  const fs = Math.max(18, Math.round(Math.min(w, h) * 0.042));
  const stepX = fs * 9.5;
  const stepY = fs * 5;
  ctx.save();
  ctx.font = `700 ${fs}px Inter, system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.translate(w / 2, h / 2);
  ctx.rotate((-28 * Math.PI) / 180);
  const reach = Math.hypot(w, h) / 2 + stepX;
  let row = 0;
  for (let y = -reach; y <= reach; y += stepY, row++) {
    // brick-lay alternate rows so vertical crops always intersect a mark
    const offset = (row % 2) * (stepX / 2);
    for (let x = -reach - offset; x <= reach; x += stepX) {
      // dual-tone: dark under-stroke + light fill stays legible on any background
      ctx.fillStyle = "rgba(10,10,16,0.10)";
      ctx.fillText(brand, x + 1.5, y + 1.5);
      ctx.fillStyle = "rgba(255,255,255,0.13)";
      ctx.fillText(brand, x, y);
    }
  }
  ctx.restore();
}

function drawBadge(ctx: CanvasRenderingContext2D, w: number, h: number, brand: string) {
  const fs = Math.max(16, Math.round(w * 0.018));
  const pad = Math.round(w * 0.018);
  const label = `Made with ${brand}`;
  ctx.save();
  ctx.font = `700 ${fs}px Inter, system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  const iconS = fs * 1.35;
  const gap = fs * 0.4;
  const padX = fs * 0.85;
  const padY = fs * 0.5;
  const textW = ctx.measureText(label).width;
  const bw = padX * 2 + iconS + gap + textW;
  const bh = iconS + padY * 2;
  const bx = w - pad - bw;
  const by = h - pad - bh;

  ctx.fillStyle = "rgba(15,16,22,0.62)";
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, bh / 2);
  ctx.fill();

  const ix = bx + padX;
  const iy = by + (bh - iconS) / 2;
  const grad = ctx.createLinearGradient(ix, iy, ix + iconS, iy + iconS);
  grad.addColorStop(0, "#7c3aed");
  grad.addColorStop(1, "#06b6d4");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(ix, iy, iconS, iconS, iconS * 0.3);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = `${fs * 0.8}px Inter, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("◆", ix + iconS / 2, iy + iconS / 2 + 1);

  ctx.textAlign = "left";
  ctx.font = `700 ${fs}px Inter, system-ui, sans-serif`;
  ctx.fillText(label, ix + iconS + gap, by + bh / 2 + 0.5);
  ctx.restore();
}

/* ---------------------------- forensic (invisible) ---------------------------- */

// FNV-1a string hash → 32-bit seed
function hashKey(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BLOCK = 4; // px per pattern cell — larger blocks survive compression better
const AMP = 2; // ±2/255 in blue: below visual threshold, above JPEG-85 noise floor

/** Deterministic ±1 for a pattern cell. Independent of image size, so crops
    still correlate as long as alignment is recovered (same origin). */
function cellSign(seed: number, cx: number, cy: number): number {
  // hash the cell coords into the seed, then one PRNG draw
  const s = (seed ^ Math.imul(cx, 0x9e3779b1) ^ Math.imul(cy, 0x85ebca77)) >>> 0;
  return mulberry32(s)() < 0.5 ? -1 : 1;
}

export function embedForensic(ctx: CanvasRenderingContext2D, w: number, h: number, key: string) {
  const seed = hashKey(key);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    const cy = (y / BLOCK) | 0;
    for (let x = 0; x < w; x++) {
      const cx = (x / BLOCK) | 0;
      const i = (y * w + x) * 4 + 2; // blue
      const v = d[i] + cellSign(seed, cx, cy) * AMP;
      d[i] = v < 0 ? 0 : v > 255 ? 255 : v;
    }
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * Correlation detector: compares each block's blue mean against its 4-neighbour
 * average, multiplied by the expected sign. Returns a z-score — an unmarked
 * image scores ~0; a marked one scores well above. `detected` uses z > 5
 * (p < 3e-7, no realistic false positives).
 */
export function detectForensicWatermark(
  canvas: HTMLCanvasElement,
  key: string = FORENSIC_KEY
): { z: number; detected: boolean } {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { z: 0, detected: false };
  const { width: w, height: h } = canvas;
  const seed = hashKey(key);
  const d = ctx.getImageData(0, 0, w, h).data;

  const bw = Math.floor(w / BLOCK);
  const bh = Math.floor(h / BLOCK);
  // per-block blue means
  const means = new Float64Array(bw * bh);
  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      let sum = 0;
      for (let y = 0; y < BLOCK; y++)
        for (let x = 0; x < BLOCK; x++)
          sum += d[((by * BLOCK + y) * w + (bx * BLOCK + x)) * 4 + 2];
      means[by * bw + bx] = sum / (BLOCK * BLOCK);
    }
  }

  let corr = 0;
  let n = 0;
  for (let by = 1; by < bh - 1; by++) {
    for (let bx = 1; bx < bw - 1; bx++) {
      const local =
        (means[by * bw + bx - 1] + means[by * bw + bx + 1] + means[(by - 1) * bw + bx] + means[(by + 1) * bw + bx]) / 4;
      const residual = means[by * bw + bx] - local;
      corr += cellSign(seed, bx, by) * residual;
      n++;
    }
  }
  if (!n) return { z: 0, detected: false };
  // Under H0 residuals are sign-symmetric noise; estimate its scale to normalize
  let varSum = 0;
  for (let by = 1; by < bh - 1; by++) {
    for (let bx = 1; bx < bw - 1; bx++) {
      const local =
        (means[by * bw + bx - 1] + means[by * bw + bx + 1] + means[(by - 1) * bw + bx] + means[(by + 1) * bw + bx]) / 4;
      const r = means[by * bw + bx] - local;
      varSum += r * r;
    }
  }
  const sd = Math.sqrt(varSum / n) || 1;
  const z = corr / (sd * Math.sqrt(n));
  return { z, detected: z > 5 };
}

/* --------------------------------- pipeline --------------------------------- */

/** Bake watermark layers into an export canvas, in place. */
export function applyWatermark(canvas: HTMLCanvasElement, opts: WatermarkOptions = {}): HTMLCanvasElement {
  const { tile = true, badge = true, forensicKey = FORENSIC_KEY, brand = "MockFrame" } = opts;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const { width: w, height: h } = canvas;
  if (tile) drawTiles(ctx, w, h, brand);
  if (badge) drawBadge(ctx, w, h, brand);
  if (forensicKey) embedForensic(ctx, w, h, forensicKey);
  return canvas;
}
