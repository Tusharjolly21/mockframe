"use client";

/**
 * Export watermarking.
 *
 * Free exports carry one small "Made with MockFrame" glass badge in the bottom
 * corner (`badge`); Pro exports are clean. The diagonal `tile` layer stays OFF
 * on every tier (tiling destroys the artifact), and exportWatermarkOpts is the
 * single place that decides which tier gets what.
 *
 * Also available:
 *
 *  1. Invisible forensic watermark — a keyed ±2/255 spread-spectrum pattern in
 *     the blue channel, surviving PNG and mild JPEG/WebP compression. This is
 *     abuse tracing for fabricated chat screenshots (paired with the
 *     `disclosure` label), NOT billing enforcement. detectForensicWatermark()
 *     proves an image originated here.
 *
 *     FREE EXPORTS ONLY — exportWatermarkOpts passes `forensicKey: null` for
 *     Pro. Free exports are anonymous, so this is the only thread back to
 *     origin; a Pro export already has a billing record naming its author, so
 *     marking it buys nothing and costs a full pixel pass. Note the mark does
 *     NOT survive a resize (block alignment is lost), so treat it as weak
 *     origin evidence, not enforcement — and nothing reads it automatically
 *     today: detectForensicWatermark() has no callers and must be run by hand.
 *  2. `custom` — the user's OWN brand mark, a Pro feature they opt into.
 */

export interface WatermarkOptions {
  /** draw the tiled diagonal text layer — off on every tier */
  tile?: boolean;
  /** draw the "Made with MockFrame" corner badge — on for free exports */
  badge?: boolean;
  /** embed the invisible forensic pattern (key must match detection) */
  forensicKey?: string | null;
  /** brand string for tile + badge */
  brand?: string;
  /** Pro custom brand watermark — replaces the MockFrame visible marks */
  custom?: CustomBrandWatermark;
  /** fictional-recreation label, baked into pixels (free for everyone) */
  disclosure?: { enabled: boolean; text: string; position: "top" | "bottom" };
}

/** structurally matches lib/customWatermark's CustomWatermarkCfg — kept here
 *  so this module stays dependency-free */
export interface CustomBrandWatermark {
  mode: "badge" | "tiled";
  text: string;
  logo: string | null;
  position: "tl" | "tc" | "tr" | "ml" | "mc" | "mr" | "bl" | "bc" | "br";
  size: number;
  opacity: number;
  color: string;
  pill: boolean;
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

/** The MockFrame viewfinder mark — a gradient rounded square with white
 *  focus-corner brackets and a centre dot. Matches <BrandMark>. */
function drawMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const grad = ctx.createLinearGradient(x, y, x + size, y + size);
  grad.addColorStop(0, "#8b5cf6");
  grad.addColorStop(0.5, "#d946ef");
  grad.addColorStop(1, "#22d3ee");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, size * 0.28);
  ctx.fill();

  const k = size / 24;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.1;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(4, 9); ctx.lineTo(4, 4.4); ctx.lineTo(9, 4.4);
  ctx.moveTo(15, 4.4); ctx.lineTo(19.6, 4.4); ctx.lineTo(19.6, 9);
  ctx.moveTo(19.6, 15); ctx.lineTo(19.6, 19.6); ctx.lineTo(15, 19.6);
  ctx.moveTo(9, 19.6); ctx.lineTo(4, 19.6); ctx.lineTo(4, 15);
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(9.4, 9.4, 5.2, 5.2, 1.4);
  ctx.fill();
  ctx.restore();
}

/** Average luminance (0..1) of a canvas region, sampled on a coarse grid. */
function regionLuminance(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): number {
  try {
    const sw = Math.max(1, Math.min(24, Math.round(w)));
    const sh = Math.max(1, Math.min(8, Math.round(h)));
    const t = document.createElement("canvas");
    t.width = sw;
    t.height = sh;
    const tc = t.getContext("2d");
    if (!tc) return 0.2;
    tc.drawImage(ctx.canvas, x, y, w, h, 0, 0, sw, sh);
    const d = tc.getImageData(0, 0, sw, sh).data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    return sum / (d.length / 4) / 255;
  } catch {
    return 0.2;
  }
}

/**
 * The free-tier "Made with MockFrame" mark: a small frosted-glass pill in the
 * bottom-right corner. It blurs what is behind it, then tints light or dark
 * to suit the backdrop so it stays legible but quiet on any export.
 */
function drawBadge(ctx: CanvasRenderingContext2D, w: number, h: number, brand: string) {
  const fs = Math.max(13, Math.round(Math.min(w, h * 1.4) * 0.0165));
  const pad = Math.round(Math.min(w, h) * 0.026);
  ctx.save();
  ctx.textBaseline = "middle";
  const iconS = fs * 1.5;
  const gap = fs * 0.55;
  const padL = fs * 0.5;
  const padR = fs * 0.95;
  const padY = fs * 0.4;
  const fMade = `500 ${fs * 0.88}px Inter, system-ui, sans-serif`;
  const fBrand = `650 ${fs}px Inter, system-ui, sans-serif`;
  ctx.font = fMade;
  const w1 = ctx.measureText("Made with ").width;
  ctx.font = fBrand;
  const w2 = ctx.measureText(brand).width;
  const bw = padL + iconS + gap + w1 + w2 + padR;
  const bh = iconS + padY * 2;
  const bx = w - pad - bw;
  const by = h - pad - bh;
  const r = bh / 2;

  const light = regionLuminance(ctx, bx, by, bw, bh) > 0.62;

  // frosted glass: blurred copy of what's underneath, clipped to the pill
  const under = document.createElement("canvas");
  under.width = Math.ceil(bw);
  under.height = Math.ceil(bh);
  const uc = under.getContext("2d");
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, r);
  ctx.clip();
  if (uc) {
    uc.drawImage(ctx.canvas, bx, by, bw, bh, 0, 0, bw, bh);
    ctx.filter = `blur(${Math.max(6, fs * 0.7)}px) saturate(1.4)`;
    ctx.drawImage(under, bx - 1, by - 1, bw + 2, bh + 2);
    ctx.filter = "none";
  }
  const glass = ctx.createLinearGradient(bx, by, bx, by + bh);
  if (light) {
    glass.addColorStop(0, "rgba(255,255,255,0.62)");
    glass.addColorStop(1, "rgba(255,255,255,0.40)");
  } else {
    glass.addColorStop(0, "rgba(28,28,38,0.55)");
    glass.addColorStop(1, "rgba(10,10,16,0.62)");
  }
  ctx.fillStyle = glass;
  ctx.fillRect(bx, by, bw, bh);
  ctx.restore();

  // hairline edge with a brighter top, like a glass rim
  const rim = ctx.createLinearGradient(bx, by, bx, by + bh);
  rim.addColorStop(0, light ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.28)");
  rim.addColorStop(1, light ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.08)");
  ctx.beginPath();
  ctx.roundRect(bx + 0.5, by + 0.5, bw - 1, bh - 1, r);
  ctx.lineWidth = Math.max(1, fs * 0.06);
  ctx.strokeStyle = rim;
  ctx.stroke();

  drawMark(ctx, bx + padL, by + (bh - iconS) / 2, iconS);

  const tx = bx + padL + iconS + gap;
  const cy = by + bh / 2 + fs * 0.03;
  ctx.textAlign = "left";
  ctx.font = fMade;
  ctx.fillStyle = light ? "rgba(20,20,30,0.62)" : "rgba(255,255,255,0.68)";
  ctx.fillText("Made with ", tx, cy);
  ctx.font = fBrand;
  ctx.fillStyle = light ? "#14141c" : "#ffffff";
  ctx.fillText(brand, tx + w1, cy);
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

/* --------------------------- custom brand (Pro) --------------------------- */

function loadLogo(dataUrl: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // a broken logo must never kill an export
    img.src = dataUrl;
  });
}

async function drawCustomWatermark(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cfg: CustomBrandWatermark
): Promise<void> {
  const fs = Math.max(14, Math.round(Math.min(w, h) * 0.028 * cfg.size));
  const logo = cfg.logo ? await loadLogo(cfg.logo) : null;
  const text = cfg.text.trim();
  if (!text && !logo) return;

  if (cfg.mode === "tiled") {
    const stepX = fs * 10;
    const stepY = fs * 5.5;
    ctx.save();
    ctx.globalAlpha = cfg.opacity * 0.35; // tiles read best well below badge opacity
    ctx.font = `700 ${fs}px Inter, system-ui, sans-serif`;
    ctx.textBaseline = "middle";
    ctx.fillStyle = cfg.color;
    ctx.translate(w / 2, h / 2);
    ctx.rotate((-28 * Math.PI) / 180);
    const reach = Math.hypot(w, h) / 2 + stepX;
    const logoS = fs * 1.3;
    const textW = text ? ctx.measureText(text).width : 0;
    let row = 0;
    for (let y = -reach; y <= reach; y += stepY, row++) {
      const offset = (row % 2) * (stepX / 2);
      for (let x = -reach - offset; x <= reach; x += stepX) {
        let cx = x;
        if (logo) {
          ctx.drawImage(logo, cx, y - logoS / 2, logoS, logoS);
          cx += logoS + fs * 0.4;
        }
        if (text) ctx.fillText(text, cx, y);
        void textW;
      }
    }
    ctx.restore();
    return;
  }

  // badge mode — measure content, place on the 9-grid
  ctx.save();
  ctx.font = `700 ${fs}px Inter, system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  const logoS = logo ? fs * 1.6 : 0;
  const gap = logo && text ? fs * 0.45 : 0;
  const textW = text ? ctx.measureText(text).width : 0;
  const padX = cfg.pill ? fs * 0.8 : 0;
  const padY = cfg.pill ? fs * 0.5 : 0;
  const bw = padX * 2 + logoS + gap + textW;
  const bh = padY * 2 + Math.max(logoS, fs * 1.4);
  const margin = Math.round(Math.min(w, h) * 0.025);

  const bx = cfg.position.endsWith("l") ? margin : cfg.position.endsWith("c") ? (w - bw) / 2 : w - margin - bw;
  const by = cfg.position.startsWith("t") ? margin : cfg.position.startsWith("m") ? (h - bh) / 2 : h - margin - bh;

  ctx.globalAlpha = cfg.opacity;
  if (cfg.pill) {
    ctx.fillStyle = "rgba(15,16,22,0.62)";
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, bh / 2);
    ctx.fill();
  }
  let cx = bx + padX;
  const cy = by + bh / 2;
  if (logo) {
    ctx.drawImage(logo, cx, cy - logoS / 2, logoS, logoS);
    cx += logoS + gap;
  }
  if (text) {
    ctx.fillStyle = cfg.color;
    if (!cfg.pill) {
      // no pill → soft shadow keeps light text readable on light backgrounds
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = fs * 0.35;
    }
    ctx.fillText(text, cx, cy + fs * 0.05);
  }
  ctx.restore();
}

/* --------------------------------- pipeline --------------------------------- */

/** Bake watermark layers into an export canvas, in place. */
export async function applyWatermark(canvas: HTMLCanvasElement, opts: WatermarkOptions = {}): Promise<HTMLCanvasElement> {
  // tile/badge default OFF here; exportWatermarkOpts turns the badge on for free.
  const { tile = false, badge = false, forensicKey = FORENSIC_KEY, brand = "MockFrame", custom, disclosure } = opts;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const { width: w, height: h } = canvas;
  if (custom) {
    // Pro brand watermark replaces the MockFrame visible marks entirely
    await drawCustomWatermark(ctx, w, h, custom);
  } else {
    if (tile) drawTiles(ctx, w, h, brand);
    if (badge) drawBadge(ctx, w, h, brand);
  }
  if (disclosure?.enabled) {
    const { drawDisclosure } = await import("./disclosure");
    drawDisclosure(ctx, w, h, disclosure as import("./disclosure").DisclosureCfg);
  }
  if (forensicKey) embedForensic(ctx, w, h, forensicKey);
  return canvas;
}
