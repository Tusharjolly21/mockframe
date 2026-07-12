"use client";

import type { Quad } from "@framekit/renderer";

/**
 * Auto-detect a device screen quad from an image's ALPHA channel (the
 * transparent screen hole in an extracted plate is ground truth). Used by the
 * /calibrate admin tool and the in-editor Custom Mockup modal. Ordinary opaque
 * photos have no alpha hole — detection returns null and the caller falls back
 * to manual corner dragging.
 *
 * Pipeline (on a ≤640px copy): alpha mask → erode (severs the thin seam that
 * usually connects the screen hole to the transparent background) → largest
 * INTERIOR component (<50% of area) → dilate back → 4 extreme corners.
 */

export function loadImg(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = url;
  });
}

/** Separable square erosion/dilation of a 0/1 mask.
 *  CRITICAL: erosion treats out-of-bounds as FOREGROUND (1) so the border-
 *  connected background does not erode inward and get mistaken for the screen;
 *  dilation treats OOB as background (0). */
function morph(mask: Uint8Array, w: number, h: number, r: number, dilate: boolean): Uint8Array {
  const pick = dilate ? Math.max : Math.min;
  const oob = dilate ? 0 : 1;
  const tmp = new Uint8Array(w * h);
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let v = dilate ? 0 : 1;
      for (let dx = -r; dx <= r; dx++) {
        const xx = x + dx;
        v = pick(v, xx < 0 || xx >= w ? oob : mask[y * w + xx]);
      }
      tmp[y * w + x] = v;
    }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let v = dilate ? 0 : 1;
      for (let dy = -r; dy <= r; dy++) {
        const yy = y + dy;
        v = pick(v, yy < 0 || yy >= h ? oob : tmp[yy * w + x]);
      }
      out[y * w + x] = v;
    }
  return out;
}

function largestInterior(mask: Uint8Array, w: number, h: number): number[] | null {
  const seen = new Uint8Array(w * h);
  let best: number[] | null = null;
  const stack: number[] = [];
  for (let i = 0; i < w * h; i++) {
    if (!mask[i] || seen[i]) continue;
    stack.length = 0;
    stack.push(i);
    seen[i] = 1;
    const px: number[] = [];
    let touches = false;
    while (stack.length) {
      const p = stack.pop()!;
      px.push(p);
      const x = p % w, y = (p / w) | 0;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touches = true;
      const nb = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
      for (const q of nb) if (q >= 0 && mask[q] && !seen[q]) { seen[q] = 1; stack.push(q); }
    }
    // a screen hole is interior and never more than ~half the plate (that'd be background)
    if (!touches && px.length < w * h * 0.5 && (!best || px.length > best.length)) best = px;
  }
  return best;
}

export async function detectScreenQuad(url: string, fullW: number, fullH: number): Promise<Quad | null> {
  const img = await loadImg(url);
  const s = Math.min(1, 640 / fullW);
  const w = Math.max(1, Math.round(fullW * s)), h = Math.max(1, Math.round(fullH * s));
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  const transp = new Uint8Array(w * h);
  let transparentCount = 0;
  for (let i = 0; i < w * h; i++) {
    transp[i] = d[i * 4 + 3] < 128 ? 1 : 0;
    transparentCount += transp[i];
  }
  if (transparentCount < w * h * 0.005) return null; // opaque photo — nothing to detect
  const r = Math.max(3, Math.round(w * 0.013));
  const comp = largestInterior(morph(transp, w, h, r, false), w, h);
  if (!comp) return null;
  const cm = new Uint8Array(w * h);
  for (const p of comp) cm[p] = 1;
  const dil = morph(cm, w, h, r + 1, true);
  let tl = 0, tr = 0, br = 0, bl = 0, tlV = Infinity, trV = -Infinity, brV = -Infinity, blV = Infinity;
  for (let i = 0; i < w * h; i++) {
    if (!dil[i] || !transp[i]) continue;
    const x = i % w, y = (i / w) | 0, sum = x + y, diff = x - y;
    if (sum < tlV) { tlV = sum; tl = i; }
    if (sum > brV) { brV = sum; br = i; }
    if (diff > trV) { trV = diff; tr = i; }
    if (diff < blV) { blV = diff; bl = i; }
  }
  const pt = (p: number): [number, number] => [Math.round((p % w) / s), Math.round(((p / w) | 0) / s)];
  return [pt(tl), pt(tr), pt(br), pt(bl)] as Quad;
}
