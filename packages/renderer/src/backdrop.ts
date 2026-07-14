import type { Backdrop } from "@framekit/scene";
import type { CSSProperties } from "react";

/**
 * Scene-wide backdrop layers (PostSpark parity). Pure CSS/SVG so they rasterize
 * identically in the editor and in html-to-image exports:
 *  - Pattern: repeating decoration painted BEHIND the subject
 *  - Overlay: cast light / shadow painted ON TOP of everything (blended)
 *  - Portrait: a depth treatment (spotlight Stage or background Blur)
 */

type Pattern = NonNullable<Backdrop["pattern"]>;
type Overlay = NonNullable<Backdrop["overlay"]>;
type Portrait = NonNullable<Backdrop["portrait"]>;

/** Grayscale turbulence tile (local copy so backdrop has no import cycle). */
function noiseUrl(seed: number, freq: number): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='2' seed='${seed}' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='200' height='200' filter='url(#n)'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** SVG sine-wave tile for the "waves" pattern. */
export function waveTile(color: string, thickness: number): string {
  const amp = 3.5 + thickness * 6;
  const w = 40;
  const h = 16 + amp * 2;
  const sw = (1 + thickness * 2.4).toFixed(1);
  const yc = h / 2;
  const path = `M0 ${yc} q ${w / 4} -${amp}, ${w / 2} 0 t ${w / 2} 0`;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'><path d='${path}' fill='none' stroke='${color}' stroke-width='${sw}'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function patternTile(inner: string, width: number, height = width): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}'>${inner}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** Style for the pattern layer (rendered behind the mockups). */
export function patternStyle(p: Pattern): CSSProperties {
  const t = p.thickness;
  const c = p.color;
  const base: CSSProperties = { position: "absolute", inset: 0, pointerEvents: "none", opacity: p.intensity };
  switch (p.kind) {
    case "circles": {
      const lw = (1 + t * 3).toFixed(1);
      const gap = (16 + (1 - t) * 26).toFixed(0);
      return { ...base, backgroundImage: `repeating-radial-gradient(circle at 50% 50%, ${c} 0 ${lw}px, transparent ${lw}px ${gap}px)` };
    }
    case "dots": {
      const r = (1.2 + t * 3.5).toFixed(1);
      const g = (14 + (1 - t) * 22).toFixed(0);
      return { ...base, backgroundImage: `radial-gradient(${c} ${r}px, transparent ${r}px)`, backgroundSize: `${g}px ${g}px` };
    }
    case "grid": {
      const lw = (1 + t * 2).toFixed(1);
      const g = (22 + (1 - t) * 30).toFixed(0);
      return { ...base, backgroundImage: `linear-gradient(${c} ${lw}px, transparent ${lw}px), linear-gradient(90deg, ${c} ${lw}px, transparent ${lw}px)`, backgroundSize: `${g}px ${g}px` };
    }
    case "stripes": {
      const lw = 2 + t * 9;
      const gap = lw * 3;
      return { ...base, backgroundImage: `repeating-linear-gradient(45deg, ${c} 0 ${lw.toFixed(1)}px, transparent ${lw.toFixed(1)}px ${gap.toFixed(1)}px)` };
    }
    case "rays": {
      const a = 1.4 + t * 5;
      return { ...base, backgroundImage: `repeating-conic-gradient(from 0deg at 50% 50%, ${c} 0 ${a.toFixed(2)}deg, transparent ${a.toFixed(2)}deg ${(a * 2).toFixed(2)}deg)` };
    }
    case "waves": {
      const h = (16 + 3.5 + 6 * t) * 2;
      return { ...base, backgroundImage: waveTile(c, t), backgroundSize: `40px ${h.toFixed(0)}px`, backgroundRepeat: "repeat" };
    }
    case "diamonds": {
      const size = Math.round(28 + (1 - t) * 30);
      const stroke = (1 + t * 2.5).toFixed(1);
      const tile = patternTile(`<path d='M${size / 2} 0 L${size} ${size / 2} L${size / 2} ${size} L0 ${size / 2} Z' fill='none' stroke='${c}' stroke-width='${stroke}'/>`, size);
      return { ...base, backgroundImage: tile, backgroundSize: `${size}px ${size}px`, backgroundRepeat: "repeat" };
    }
    case "checker": {
      const size = Math.round(28 + (1 - t) * 32);
      return {
        ...base,
        backgroundImage: `conic-gradient(from 90deg, ${c} 25%, transparent 0 75%, ${c} 0)`,
        backgroundSize: `${size}px ${size}px`,
      };
    }
    case "crosses": {
      const size = Math.round(30 + (1 - t) * 32);
      const arm = Math.round(5 + t * 8);
      const stroke = (1.2 + t * 2.4).toFixed(1);
      const half = size / 2;
      const tile = patternTile(`<path d='M${half - arm} ${half} H${half + arm} M${half} ${half - arm} V${half + arm}' fill='none' stroke='${c}' stroke-width='${stroke}' stroke-linecap='round'/>`, size);
      return { ...base, backgroundImage: tile, backgroundSize: `${size}px ${size}px`, backgroundRepeat: "repeat" };
    }
    case "arcs": {
      const size = Math.round(38 + (1 - t) * 38);
      const stroke = (1.2 + t * 3).toFixed(1);
      const tile = patternTile(
        `<path d='M0 ${size} A${size} ${size} 0 0 1 ${size} 0 M0 ${size / 2} A${size / 2} ${size / 2} 0 0 1 ${size / 2} 0' fill='none' stroke='${c}' stroke-width='${stroke}'/>`,
        size
      );
      return { ...base, backgroundImage: tile, backgroundSize: `${size}px ${size}px`, backgroundRepeat: "repeat" };
    }
    case "topography": {
      const size = Math.round(78 + (1 - t) * 54);
      const stroke = (0.8 + t * 2).toFixed(1);
      const tile = patternTile(
        `<g fill='none' stroke='${c}' stroke-width='${stroke}' stroke-linecap='round'>` +
          `<path d='M-8 ${size * 0.2} C${size * 0.14} ${size * 0.02},${size * 0.32} ${size * 0.42},${size * 0.55} ${size * 0.2} S${size * 0.9} ${size * 0.02},${size + 8} ${size * 0.22}'/>` +
          `<path d='M-8 ${size * 0.48} C${size * 0.18} ${size * 0.25},${size * 0.34} ${size * 0.72},${size * 0.6} ${size * 0.48} S${size * 0.88} ${size * 0.3},${size + 8} ${size * 0.52}'/>` +
          `<path d='M-8 ${size * 0.78} C${size * 0.17} ${size * 0.57},${size * 0.4} ${size * 0.98},${size * 0.62} ${size * 0.76} S${size * 0.88} ${size * 0.62},${size + 8} ${size * 0.8}'/>` +
        `</g>`,
        size
      );
      return { ...base, backgroundImage: tile, backgroundSize: `${size}px ${size}px`, backgroundRepeat: "repeat" };
    }
    case "noise":
      return { ...base, backgroundImage: noiseUrl(3, 0.7), opacity: p.intensity * 0.5, mixBlendMode: "overlay" };
  }
}

/* Cast-shadow silhouettes (PostSpark's Shadow Overlay images) — hand-drawn SVG
   shapes with a heavy gaussian blur, so they read as soft real-world shadows.
   Data URIs → export-safe, no assets to license. */

function shadowSvg(inner: string, blur: number, w = 800, h = 600): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'><filter id='b' x='-30%' y='-30%' width='160%' height='160%'><feGaussianBlur stdDeviation='${blur}'/></filter><g filter='url(#b)' fill='#000'>${inner}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const LEAF_SHADOW = shadowSvg(
  // monstera-ish leaves reaching in from the top-left corner
  "<ellipse cx='120' cy='60' rx='150' ry='70' transform='rotate(-32 120 60)'/>" +
    "<ellipse cx='260' cy='140' rx='170' ry='64' transform='rotate(-18 260 140)'/>" +
    "<ellipse cx='80' cy='230' rx='190' ry='70' transform='rotate(-46 80 230)'/>" +
    "<ellipse cx='300' cy='320' rx='150' ry='52' transform='rotate(-30 300 320)'/>" +
    "<rect x='-40' y='-40' width='260' height='46' rx='23' transform='rotate(38 90 0)'/>",
  16
);

const BRANCH_SHADOW = shadowSvg(
  // slender branch with scattered leaves from the top-right
  "<rect x='420' y='-30' width='16' height='420' rx='8' transform='rotate(34 620 60)'/>" +
    "<rect x='560' y='40' width='10' height='240' rx='5' transform='rotate(64 640 120)'/>" +
    ["520,90", "610,150", "560,220", "680,240", "620,320", "700,120", "740,300", "480,300"]
      .map(
        (p, i) =>
          `<ellipse cx='${p.split(",")[0]}' cy='${p.split(",")[1]}' rx='52' ry='20' transform='rotate(${((i * 47) % 120) - 60} ${p.split(",")[0]} ${p.split(",")[1]})'/>`
      )
      .join(""),
  9
);

const PALM_SHADOW = shadowSvg(
  // fan of long tapered palm fronds from the top-right corner
  Array.from({ length: 7 }, (_, i) => {
    const a = -18 - i * 16;
    return `<ellipse cx='700' cy='90' rx='330' ry='${13 + (i % 3) * 5}' transform='rotate(${a} 780 20)'/>`;
  }).join(""),
  8
);

const WINDOW_GRID_SHADOW = shadowSvg(
  // 2×3 window-pane frame projected at an angle
  "<g transform='rotate(16 400 300) skewX(-12)'>" +
    "<rect x='90' y='20' width='34' height='560'/><rect x='384' y='20' width='34' height='560'/><rect x='678' y='20' width='34' height='560'/>" +
    "<rect x='60' y='60' width='700' height='30'/><rect x='60' y='300' width='700' height='30'/><rect x='60' y='540' width='700' height='30'/>" +
    "</g>",
  7
);

/** Style for the overlay layer (cast light / shadow, rendered on top, blended). */
export function overlayStyle(o: Overlay): CSSProperties {
  const base: CSSProperties = { position: "absolute", inset: 0, pointerEvents: "none" };
  const I = o.intensity;
  const cast = (img: string): CSSProperties => ({
    ...base,
    backgroundImage: img,
    backgroundSize: "cover",
    backgroundPosition: "top left",
    mixBlendMode: "multiply",
    opacity: I * 0.6,
  });
  switch (o.kind) {
    case "blinds":
      return { ...base, backgroundImage: "repeating-linear-gradient(8deg, rgba(0,0,0,0.62) 0 9px, rgba(0,0,0,0) 9px 30px)", mixBlendMode: "multiply", opacity: I * 0.85 };
    case "window":
      return { ...base, backgroundImage: "linear-gradient(115deg, transparent 0 14%, rgba(255,255,255,0.55) 14% 40%, transparent 40% 47%, rgba(255,255,255,0.42) 47% 72%, transparent 72%)", mixBlendMode: "soft-light", opacity: I };
    case "diagonal":
      return { ...base, backgroundImage: "linear-gradient(115deg, transparent 28%, rgba(255,255,255,0.42) 44%, transparent 54%, rgba(255,255,255,0.3) 68%, transparent 80%)", mixBlendMode: "screen", opacity: I * 0.9 };
    case "spotlight":
      return { ...base, backgroundImage: "radial-gradient(ellipse 62% 55% at 30% 2%, rgba(255,255,255,0.6), transparent 66%)", mixBlendMode: "screen", opacity: I };
    case "top-light":
      return { ...base, backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.5) 0%, transparent 46%)", mixBlendMode: "soft-light", opacity: I };
    case "leaves":
      return cast(LEAF_SHADOW);
    case "branch":
      return cast(BRANCH_SHADOW);
    case "palm":
      return cast(PALM_SHADOW);
    case "window-grid":
      return cast(WINDOW_GRID_SHADOW);
  }
}

/** CSS filter string for the backdrop-only filter (never applied to devices). */
export function backdropFilterCss(f: NonNullable<Backdrop["filter"]>): string {
  const parts: string[] = [];
  if (f.blur > 0) parts.push(`blur(${f.blur}px)`);
  if (f.saturation !== 1) parts.push(`saturate(${f.saturation})`);
  if (f.opacity !== 1) parts.push(`opacity(${f.opacity})`);
  return parts.join(" ") || "none";
}

/** Style for the Portrait "stage" spotlight + floor (rendered behind the subject). */
export function stageStyle(p: Portrait): CSSProperties {
  const spread = 26 + (p.distance / 100) * 42;
  return {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    backgroundImage:
      `radial-gradient(ellipse ${spread.toFixed(0)}% ${(spread * 0.82).toFixed(0)}% at ${p.position}% 42%, rgba(255,255,255,0.5), transparent 68%),` +
      "linear-gradient(180deg, transparent 58%, rgba(0,0,0,0.34) 100%)",
  };
}

/** blur px + mask for the Portrait "blur" depth-of-field layer. */
export function portraitBlur(p: Portrait): { blurPx: number; mask: string } {
  const blurPx = 3 + (p.distance / 100) * 30;
  const focal = 16 + (p.distance / 100) * 22;
  const mask = `radial-gradient(circle at ${p.position}% 46%, transparent ${focal.toFixed(0)}%, black ${(focal + 34).toFixed(0)}%)`;
  return { blurPx, mask };
}
