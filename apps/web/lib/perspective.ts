"use client";

import { quadHomography, quadSize, type Quad } from "@framekit/renderer";

/**
 * Perspective UNWARP (the scanner-app "straighten"): extract the quadrilateral
 * region marked by 4 corners and flatten it into a rectangle. The inverse of
 * the renderer's warp — same homography (quadHomography maps the flat output
 * box ONTO the quad, so each output pixel samples its source point inside the
 * quad). Bilinear sampling; pure canvas/ImageData, no WebGL.
 */

/** Natural output size for a quad — the longest of each pair of opposite edges. */
export function unwarpSize(quad: Quad, maxEdge = 4096): { w: number; h: number } {
  const { w, h } = quadSize(quad);
  const k = Math.min(1, maxEdge / Math.max(w, h));
  return { w: Math.max(8, Math.round(w * k)), h: Math.max(8, Math.round(h * k)) };
}

export function unwarpQuadToCanvas(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  quad: Quad,
  outW: number,
  outH: number
): HTMLCanvasElement {
  // rasterize the source once
  const sc = document.createElement("canvas");
  sc.width = srcW;
  sc.height = srcH;
  const sctx = sc.getContext("2d", { willReadFrequently: true })!;
  sctx.drawImage(source, 0, 0, srcW, srcH);
  const src = sctx.getImageData(0, 0, srcW, srcH).data;

  const t = quadHomography(outW, outH, quad); // output (x,y) → source point in the quad
  const out = document.createElement("canvas");
  out.width = outW;
  out.height = outH;
  const octx = out.getContext("2d")!;
  const dest = octx.createImageData(outW, outH);
  const d = dest.data;

  for (let y = 0; y < outH; y++) {
    const t1y2 = t[1] * y + t[2];
    const t4y5 = t[4] * y + t[5];
    const t7y8 = t[7] * y + t[8];
    for (let x = 0; x < outW; x++) {
      const w = t[6] * x + t7y8;
      const sx = (t[0] * x + t1y2) / w;
      const sy = (t[3] * x + t4y5) / w;
      const o = (y * outW + x) * 4;
      if (sx < 0 || sy < 0 || sx > srcW - 1 || sy > srcH - 1) {
        d[o + 3] = 0; // outside the photo — transparent
        continue;
      }
      // bilinear sample
      const x0 = sx | 0, y0 = sy | 0;
      const x1 = Math.min(x0 + 1, srcW - 1), y1 = Math.min(y0 + 1, srcH - 1);
      const fx = sx - x0, fy = sy - y0;
      const i00 = (y0 * srcW + x0) * 4, i10 = (y0 * srcW + x1) * 4;
      const i01 = (y1 * srcW + x0) * 4, i11 = (y1 * srcW + x1) * 4;
      const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
      d[o] = src[i00] * w00 + src[i10] * w10 + src[i01] * w01 + src[i11] * w11;
      d[o + 1] = src[i00 + 1] * w00 + src[i10 + 1] * w10 + src[i01 + 1] * w01 + src[i11 + 1] * w11;
      d[o + 2] = src[i00 + 2] * w00 + src[i10 + 2] * w10 + src[i01 + 2] * w01 + src[i11 + 2] * w11;
      d[o + 3] = src[i00 + 3] * w00 + src[i10 + 3] * w10 + src[i01 + 3] * w01 + src[i11 + 3] * w11;
    }
  }
  octx.putImageData(dest, 0, 0);
  return out;
}
