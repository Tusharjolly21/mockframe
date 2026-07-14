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

function mixHex(a: string, b: string, amount: number): string {
  const parse = (value: string) => {
    const clean = value.replace("#", "");
    const hex = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
    const number = Number.parseInt(hex, 16);
    return Number.isFinite(number) && hex.length === 6
      ? [(number >> 16) & 255, (number >> 8) & 255, number & 255]
      : [125, 211, 252];
  };
  const from = parse(a);
  const to = parse(b);
  return `#${from
    .map((channel, index) => Math.round(channel + (to[index]! - channel) * amount).toString(16).padStart(2, "0"))
    .join("")}`;
}

function patternPalette(color: string, seed = 0): string[] {
  const colors = [
    color,
    mixHex(color, "#ffffff", 0.62),
    mixHex(color, "#c084fc", 0.52),
    mixHex(color, "#22d3ee", 0.45),
    mixHex(color, "#f9a8d4", 0.42),
  ];
  const offset = Math.abs(seed) % colors.length;
  return [...colors.slice(offset), ...colors.slice(0, offset)];
}

function randomFor(seed = 1): () => number {
  let value = seed | 0;
  return () => {
    value = Math.imul(value + 0x6d2b79f5, 1);
    value ^= value >>> 15;
    value = Math.imul(value, value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasPattern(inner: string, p: Pattern, defs = ""): CSSProperties {
  const blur = p.blur ?? 0;
  const filter = blur > 0 ? `<filter id='pattern-blur' x='-20%' y='-20%' width='140%' height='140%'><feGaussianBlur stdDeviation='${blur}'/></filter>` : "";
  const filterAttr = blur > 0 ? " filter='url(#pattern-blur)'" : "";
  const rotation = p.rotation ?? 0;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='1000' height='1000' viewBox='0 0 1000 1000' preserveAspectRatio='xMidYMid slice'><defs>${filter}${defs}</defs><g transform='rotate(${rotation} 500 500)'${filterAttr}>${inner}</g></svg>`;
  return {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    opacity: p.intensity,
    mixBlendMode: p.blendMode ?? "normal",
    backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
  };
}

/** Style for the pattern layer (rendered behind the mockups). */
export function patternStyle(p: Pattern): CSSProperties {
  const t = p.thickness;
  const c = p.color;
  const base: CSSProperties = { position: "absolute", inset: 0, pointerEvents: "none", opacity: p.intensity };
  switch (p.kind) {
    case "circles": {
      const random = randomFor(p.seed ?? 17);
      const palette = patternPalette(c, p.paletteSeed);
      const size = 0.7 + t * 0.72;
      const anchors = [
        [-15, 175, 176],
        [605, 45, 210],
        [320, 680, 188],
        [1010, 680, 250],
        [825, 1040, 150],
      ];
      const shapes = anchors
        .map(([x, y, radius], index) => {
          const jitterX = (random() - 0.5) * 110;
          const jitterY = (random() - 0.5) * 110;
          return `<circle cx='${x! + jitterX}' cy='${y! + jitterY}' r='${radius! * size}' fill='${palette[index % palette.length]}'/>`;
        })
        .join("");
      return canvasPattern(shapes, p);
    }
    case "dots": {
      const random = randomFor(p.seed ?? 29);
      const radius = 18 + t * 35;
      const shapes = Array.from({ length: 17 }, (_, index) => {
        const x = -40 + random() * 1080;
        const y = -30 + random() * 1060;
        const r = radius * (0.72 + random() * 0.46);
        return `<circle cx='${x}' cy='${y}' r='${r}' fill='${c}' opacity='${index % 4 === 0 ? 0.78 : 1}'/>`;
      }).join("");
      return canvasPattern(shapes, p);
    }
    case "harmony": {
      const palette = patternPalette(c, p.paletteSeed);
      const scale = 0.78 + t * 0.62;
      const panels = [
        [-240, -100, 660, 470, -42],
        [355, -130, 720, 560, 38],
        [-210, 535, 720, 560, 42],
        [490, 430, 760, 650, -38],
      ];
      const shapes = panels
        .map(([x, y, width, height, angle], index) => `<rect x='${x}' y='${y}' width='${width! * scale}' height='${height! * scale}' rx='8' fill='${palette[(index + 1) % palette.length]}' stroke='${mixHex(palette[index % palette.length]!, "#ffffff", 0.72)}' stroke-width='7' transform='rotate(${angle} ${x! + width! / 2} ${y! + height! / 2})'/>`)
        .join("");
      return canvasPattern(shapes, p);
    }
    case "grid": {
      const divisions = Math.max(2, Math.round(2 + (1 - t) * 5));
      const stroke = 1.5 + t * 4;
      const lines = Array.from({ length: divisions + 1 }, (_, index) => {
        const position = (index / divisions) * 1000;
        return `<path d='M${position} 0V1000 M0 ${position}H1000' fill='none' stroke='${c}' stroke-width='${stroke}'/>`;
      }).join("");
      return canvasPattern(lines, p);
    }
    case "sight": {
      const random = randomFor(p.seed ?? 43);
      const palette = patternPalette(c, p.paletteSeed);
      const stroke = 4 + t * 8;
      const orbits = [
        `<ellipse cx='505' cy='70' rx='435' ry='350' fill='none' stroke='${palette[1]}' stroke-width='${stroke}'/>`,
        `<ellipse cx='525' cy='135' rx='475' ry='430' fill='none' stroke='${palette[1]}' stroke-width='${stroke * 0.82}' transform='rotate(-10 525 135)'/>`,
        `<ellipse cx='480' cy='-20' rx='590' ry='520' fill='none' stroke='${palette[3]}' stroke-width='${stroke * 0.66}' transform='rotate(11 480 -20)'/>`,
      ];
      const nodes = Array.from({ length: 9 }, (_, index) => {
        const x = random() * 1080 - 40;
        const y = random() * 1040 - 20;
        const r = 13 + random() * (25 + t * 35);
        return `<circle cx='${x}' cy='${y}' r='${r}' fill='${palette[index % palette.length]}'/>`;
      });
      return canvasPattern([...orbits, ...nodes].join(""), p);
    }
    case "chimes": {
      const palette = patternPalette(c, p.paletteSeed);
      const size = 0.72 + t * 0.7;
      const fourPoint = (x: number, y: number, radius: number, color: string) =>
        `<path d='M${x} ${y - radius} C${x + radius * 0.12} ${y - radius * 0.22} ${x + radius * 0.22} ${y - radius * 0.12} ${x + radius} ${y} C${x + radius * 0.22} ${y + radius * 0.12} ${x + radius * 0.12} ${y + radius * 0.22} ${x} ${y + radius} C${x - radius * 0.12} ${y + radius * 0.22} ${x - radius * 0.22} ${y + radius * 0.12} ${x - radius} ${y} C${x - radius * 0.22} ${y - radius * 0.12} ${x - radius * 0.12} ${y - radius * 0.22} ${x} ${y - radius}Z' fill='${color}'/>`;
      const defs = `<radialGradient id='chime-glow-a'><stop offset='0' stop-color='${palette[1]}'/><stop offset='1' stop-color='${palette[1]}' stop-opacity='0'/></radialGradient><radialGradient id='chime-glow-b'><stop offset='0' stop-color='${palette[2]}'/><stop offset='1' stop-color='${palette[2]}' stop-opacity='0'/></radialGradient>`;
      const shapes =
        `<circle cx='130' cy='220' r='150' fill='url(#chime-glow-a)'/><circle cx='980' cy='250' r='145' fill='url(#chime-glow-b)'/>` +
        fourPoint(310, 385, 34 * size, palette[1]!) + fourPoint(355, 350, 17 * size, palette[3]!) + fourPoint(354, 405, 20 * size, palette[1]!) +
        fourPoint(740, 655, 48 * size, palette[1]!) + fourPoint(795, 620, 25 * size, palette[3]!) + fourPoint(795, 688, 30 * size, palette[1]!) +
        fourPoint(480, 980, 32 * size, palette[0]!) + fourPoint(520, 955, 18 * size, palette[3]!);
      return canvasPattern(shapes, p, defs);
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
      const width = 20 + t * 78;
      const paths = [
        "M-330 -80 C-20 130 180 55 430 230 S875 520 1320 260",
        "M-350 120 C-10 325 180 250 420 430 S850 735 1340 465",
        "M-380 330 C-40 520 160 470 390 650 S825 920 1360 700",
        "M-390 560 C-70 735 145 710 355 865 S770 1110 1340 930",
      ];
      const shapes = paths.map((d, index) => `<path d='${d}' fill='none' stroke='${mixHex(c, "#ffffff", index * 0.08)}' stroke-width='${width}' stroke-linecap='round'/>`).join("");
      return canvasPattern(shapes, p);
    }
    case "diamonds": {
      const random = randomFor(p.seed ?? 71);
      const palette = patternPalette(c, p.paletteSeed);
      const size = 150 + t * 220;
      const anchors = [[80, 185], [610, 80], [335, 690], [960, 650], [800, 1050]];
      const shapes = anchors.map(([x, y], index) => {
        const radius = size * (0.7 + random() * 0.55);
        return `<path d='M${x} ${y! - radius} L${x! + radius} ${y} L${x} ${y! + radius} L${x! - radius} ${y}Z' fill='${palette[(index + 2) % palette.length]}'/>`;
      }).join("");
      return canvasPattern(shapes, p);
    }
    case "mixed-shapes": {
      const random = randomFor(p.seed ?? 83);
      const palette = patternPalette(c, p.paletteSeed);
      const size = 0.72 + t * 0.72;
      const anchors = [[80, 150, "square"], [610, 60, "square"], [320, 690, "circle"], [1010, 680, "circle"], [790, 1030, "square"]] as const;
      const shapes = anchors.map(([x, y, kind], index) => {
        const dimension = (165 + random() * 120) * size;
        return kind === "circle"
          ? `<circle cx='${x}' cy='${y}' r='${dimension}' fill='${palette[(index + 1) % palette.length]}'/>`
          : `<rect x='${x - dimension}' y='${y - dimension}' width='${dimension * 2}' height='${dimension * 2}' fill='${palette[(index + 2) % palette.length]}'/>`;
      }).join("");
      return canvasPattern(shapes, p);
    }
    case "confetti": {
      const random = randomFor(p.seed ?? 97);
      const palette = patternPalette(c, p.paletteSeed);
      const count = Math.round(14 + t * 14);
      const heart = "M0 9 C-22 -9 -36 20 0 46 C36 20 22 -9 0 9Z";
      const star = "M0 -34 L8 -10 L34 -10 L13 5 L21 31 L0 15 L-21 31 L-13 5 L-34 -10 L-8 -10Z";
      const shapes = Array.from({ length: count }, (_, index) => {
        const x = random() * 1060 - 30;
        const y = random() * 1060 - 30;
        const scale = 0.55 + random() * 0.9;
        const rotate = random() * 160 - 80;
        const color = palette[index % palette.length]!;
        switch (index % 5) {
          case 0:
            return `<path d='${heart}' fill='${color}' transform='translate(${x} ${y}) rotate(${rotate}) scale(${scale})'/>`;
          case 1:
            return `<path d='${star}' fill='none' stroke='${color}' stroke-width='8' stroke-linejoin='round' transform='translate(${x} ${y}) rotate(${rotate}) scale(${scale})'/>`;
          case 2:
            return `<rect x='${x - 26 * scale}' y='${y - 26 * scale}' width='${52 * scale}' height='${52 * scale}' fill='${color}' transform='rotate(${rotate} ${x} ${y})'/>`;
          case 3:
            return `<path d='M${x - 35 * scale} ${y - 22 * scale} Q${x + 5 * scale} ${y + 5 * scale} ${x - 8 * scale} ${y + 45 * scale}' fill='none' stroke='${color}' stroke-width='${10 * scale}' stroke-linecap='round'/>`;
          default:
            return `<path d='M${x - 35 * scale} ${y} Q${x} ${y - 42 * scale} ${x + 35 * scale} ${y}' fill='none' stroke='${color}' stroke-width='${9 * scale}' stroke-linecap='round'/>`;
        }
      }).join("");
      return canvasPattern(shapes, p);
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
