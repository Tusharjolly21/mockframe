/**
 * Perspective (projective) mapping of an axis-aligned source rectangle onto an
 * arbitrary destination quadrilateral, expressed as a CSS `matrix3d`. This is
 * what lets a flat screenshot warp onto an ANGLED device screen in a photo
 * scene — the quad comes from the PSD smart object's `nonAffineTransform`.
 *
 * Standard 2D homography → 4×4 CSS matrix technique (adjugate method).
 */

export type Point = [number, number];
export type Quad = [Point, Point, Point, Point]; // TL, TR, BR, BL

function adj(m: number[]): number[] {
  return [
    m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4],
    m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6], m[2] * m[3] - m[0] * m[5],
    m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3],
  ];
}

function multmm(a: number[], b: number[]): number[] {
  const r = new Array(9);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let s = 0;
      for (let k = 0; k < 3; k++) s += a[3 * i + k] * b[3 * k + j];
      r[3 * i + j] = s;
    }
  }
  return r;
}

function multmv(m: number[], v: number[]): number[] {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

function basisToPoints(p: number[]): number[] {
  const [x1, y1, x2, y2, x3, y3, x4, y4] = p;
  const m = [x1, x2, x3, y1, y2, y3, 1, 1, 1];
  const v = multmv(adj(m), [x4, y4, 1]);
  return multmm(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]);
}

/** Homography mapping the four source points to the four dest points. */
function general2DProjection(src: number[], dst: number[]): number[] {
  return multmm(basisToPoints(dst), adj(basisToPoints(src)));
}

/**
 * CSS `matrix3d(...)` that maps the box (0,0)-(w,h) onto the quad `q`
 * (corners in TL, TR, BR, BL order). Apply with `transform-origin: 0 0`.
 */
export function quadMatrix3d(w: number, h: number, q: Quad): string {
  const src = [0, 0, w, 0, w, h, 0, h];
  const dst = [q[0][0], q[0][1], q[1][0], q[1][1], q[2][0], q[2][1], q[3][0], q[3][1]];
  const t = general2DProjection(src, dst);
  for (let i = 0; i < 9; i++) t[i] /= t[8];
  // 2D homography [[t0,t1,t2],[t3,t4,t5],[t6,t7,t8]] → column-major 4×4
  const m = [t[0], t[3], 0, t[6], t[1], t[4], 0, t[7], 0, 0, 1, 0, t[2], t[5], 0, t[8]];
  return `matrix3d(${m.map((v) => (Math.abs(v) < 1e-6 ? 0 : +v.toFixed(6))).join(",")})`;
}

/** Normalized 3×3 homography mapping the box (0,0)-(w,h) onto the quad.
 *  Row-major [t0..t8]: src (x,y) → dest via (t0x+t1y+t2, t3x+t4y+t5) / (t6x+t7y+t8).
 *  Exported for perspective UNWARP (straighten a photographed screen): map each
 *  flat OUTPUT pixel through this to find its source sample inside the quad. */
export function quadHomography(w: number, h: number, q: Quad): number[] {
  return homography(w, h, q);
}

function homography(w: number, h: number, q: Quad): number[] {
  const src = [0, 0, w, 0, w, h, 0, h];
  const dst = [q[0][0], q[0][1], q[1][0], q[1][1], q[2][0], q[2][1], q[3][0], q[3][1]];
  const t = general2DProjection(src, dst);
  for (let i = 0; i < 9; i++) t[i] /= t[8];
  return t;
}

function apply(t: number[], x: number, y: number): Point {
  const X = t[0] * x + t[1] * y + t[2];
  const Y = t[3] * x + t[4] * y + t[5];
  const W = t[6] * x + t[7] * y + t[8];
  return [X / W, Y / W];
}

/**
 * Convert a delta in PLATE space to a delta in the screen box (screen-res)
 * space, using the homography's Jacobian at the screen centre. Lets a drag on
 * the canvas pan the screenshot along the screen's own axes under perspective.
 */
export function plateToBoxDelta(w: number, h: number, q: Quad, dx: number, dy: number): Point {
  const t = homography(w, h, q);
  const cx = w / 2;
  const cy = h / 2;
  const p0 = apply(t, cx, cy);
  const px = apply(t, cx + 1, cy);
  const py = apply(t, cx, cy + 1);
  const a = px[0] - p0[0];
  const b = py[0] - p0[0];
  const c = px[1] - p0[1];
  const d = py[1] - p0[1];
  const det = a * d - b * c;
  if (Math.abs(det) < 1e-9) return [0, 0];
  return [(d * dx - b * dy) / det, (-c * dx + a * dy) / det];
}

/** Axis-aligned rect → quad (TL, TR, BR, BL). */
export function rectToQuad(r: { x: number; y: number; width: number; height: number }): Quad {
  return [
    [r.x, r.y],
    [r.x + r.width, r.y],
    [r.x + r.width, r.y + r.height],
    [r.x, r.y + r.height],
  ];
}

/** Approximate on-screen size of a quad, for the source box the screenshot fills. */
export function quadSize(q: Quad): { w: number; h: number } {
  const dist = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  return {
    w: Math.round(Math.max(dist(q[0], q[1]), dist(q[3], q[2]))),
    h: Math.round(Math.max(dist(q[0], q[3]), dist(q[1], q[2]))),
  };
}
