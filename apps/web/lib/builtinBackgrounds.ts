"use client";

import type { ResolvedAsset } from "@framekit/renderer";
import { mulberry32 } from "@framekit/renderer";

/**
 * Built-in background art: procedural SVGs rendered to data-URIs at module
 * load. Deterministic (seeded), self-contained (no fetches), and referenced
 * from scene documents as `builtin:<id>` asset ids — the future render worker
 * resolves the same generator, keeping re-render parity.
 */

const W = 1920;
const H = 1280;

const uri = (inner: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">${inner}</svg>`
  )}`;

/* ---------------------------------- glass ----------------------------------- */
/* fine parallel ribbon lines flowing across the frame */

function glass(seed: number, bg: string, strokes: string[], lineOpacity: number): string {
  const rng = mulberry32(seed);
  const phase = rng() * Math.PI * 2;
  const amp = 140 + rng() * 120;
  const freq = 1.6 + rng() * 1.2;
  const lines: string[] = [];
  const n = 64;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const yBase = -200 + t * (H + 400);
    const pts: string[] = [];
    for (let x = 0; x <= W; x += 96) {
      const y = yBase + Math.sin(phase + (x / W) * Math.PI * freq + t * 2.4) * amp * (0.6 + t * 0.5);
      pts.push(`${x},${Math.round(y)}`);
    }
    const color = strokes[i % strokes.length];
    lines.push(
      `<polyline points="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="2.2" opacity="${(lineOpacity * (0.35 + 0.65 * Math.sin(t * Math.PI))).toFixed(3)}"/>`
    );
  }
  return uri(`<rect width="${W}" height="${H}" fill="${bg}"/>${lines.join("")}`);
}

/* --------------------------------- desktop ---------------------------------- */
/* macOS-style soft blurred color fields */

function desktop(seed: number, base: string, blobs: string[]): string {
  const rng = mulberry32(seed);
  const shapes = blobs
    .map((c) => {
      const cx = Math.round(rng() * W);
      const cy = Math.round(rng() * H);
      const rx = Math.round(W * (0.28 + rng() * 0.3));
      const ry = Math.round(H * (0.26 + rng() * 0.3));
      const rot = Math.round(rng() * 180);
      return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${c}" transform="rotate(${rot} ${cx} ${cy})"/>`;
    })
    .join("");
  return uri(
    `<rect width="${W}" height="${H}" fill="${base}"/><g filter="url(#b)"><defs></defs>${shapes}</g><filter id="b" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="150"/></filter>`
  );
}

/* --------------------------------- abstract --------------------------------- */
/* bold layered wave bands with hard edges */

function abstractWaves(seed: number, colors: string[]): string {
  const rng = mulberry32(seed);
  const layers = colors
    .slice(1)
    .map((c, i) => {
      const yBase = H * (0.3 + (i / colors.length) * 0.65 + rng() * 0.08);
      const a1 = 120 + rng() * 200;
      const a2 = 120 + rng() * 200;
      const mid = W * (0.3 + rng() * 0.4);
      return `<path d="M0 ${yBase} C ${W * 0.22} ${yBase - a1}, ${mid} ${yBase + a2}, ${W} ${yBase - a1 * 0.5} L ${W} ${H} L 0 ${H} Z" fill="${c}"/>`;
    })
    .join("");
  return uri(`<rect width="${W}" height="${H}" fill="${colors[0]}"/>${layers}`);
}

/* ---------------------------------- refract ---------------------------------- */
/* colorful gradient fields seen through fluted (ridged) glass */

function refract(seed: number, base: string, blobs: string[]): string {
  const rng = mulberry32(seed);
  const p = `rf${seed}`;
  // soft color field behind the glass
  const field = blobs
    .map((c) => {
      const cx = Math.round(rng() * W);
      const cy = Math.round(rng() * H);
      const rx = Math.round(W * (0.24 + rng() * 0.28));
      const ry = Math.round(H * (0.3 + rng() * 0.34));
      const rot = Math.round(rng() * 180);
      return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${c}" transform="rotate(${rot} ${cx} ${cy})"/>`;
    })
    .join("");
  // fluted ridges: a light→dark gradient per ridge plus a bright caustic edge
  const angle = Math.round(-14 + rng() * 28);
  const ridge = 72 + Math.round(rng() * 48);
  const strips: string[] = [];
  for (let x = -W; x < W * 2; x += ridge) {
    strips.push(
      `<rect x="${x}" y="${-H}" width="${ridge}" height="${H * 3}" fill="url(#${p}g)"/>`,
      `<rect x="${x + ridge - 4}" y="${-H}" width="4" height="${H * 3}" fill="#ffffff" opacity="0.35"/>`
    );
  }
  return uri(
    `<defs>` +
      `<linearGradient id="${p}g" x1="0" y1="0" x2="1" y2="0">` +
      `<stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/>` +
      `<stop offset="0.35" stop-color="#ffffff" stop-opacity="0.02"/>` +
      `<stop offset="0.75" stop-color="#000000" stop-opacity="0.16"/>` +
      `<stop offset="1" stop-color="#000000" stop-opacity="0.03"/>` +
      `</linearGradient>` +
      `<filter id="${p}b" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="130"/></filter>` +
      `</defs>` +
      `<rect width="${W}" height="${H}" fill="${base}"/>` +
      `<g filter="url(#${p}b)">${field}</g>` +
      `<g transform="rotate(${angle} ${W / 2} ${H / 2})">${strips.join("")}</g>`
  );
}

/* ---------------------------------- texture --------------------------------- */

function paperTexture(seed: number, base: string, ink: string, freq: number, opacity: number): string {
  return uri(
    `<rect width="${W}" height="${H}" fill="${base}"/>` +
      `<filter id="t"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="3" seed="${seed}" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.9 0.9 0.9 0 0"/></filter>` +
      `<rect width="${W}" height="${H}" filter="url(#t)" fill="${ink}" opacity="${opacity}"/>`
  );
}

function weaveTexture(base: string, line: string, gap: number): string {
  return uri(
    `<rect width="${W}" height="${H}" fill="${base}"/>` +
      `<pattern id="p" width="${gap}" height="${gap}" patternUnits="userSpaceOnUse">` +
      `<path d="M0 0 H${gap}" stroke="${line}" stroke-width="1.1" opacity="0.5"/>` +
      `<path d="M0 0 V${gap}" stroke="${line}" stroke-width="1.1" opacity="0.35"/>` +
      `</pattern><rect width="${W}" height="${H}" fill="url(#p)"/>`
  );
}

/* ---------------------------------- aurora ---------------------------------- */
/* borealis ribbons — soft glowing curtains of light over a starry night sky */

function aurora(seed: number, sky: [string, string], ribbons: string[]): string {
  const rng = mulberry32(seed);
  const p = `au${seed}`;
  const bands = ribbons
    .map((c, i) => {
      const x = W * (0.16 + (i / Math.max(1, ribbons.length - 1)) * 0.68 + (rng() - 0.5) * 0.12);
      const sway = 140 + rng() * 200;
      const sw = 130 + rng() * 170;
      const d = `M ${Math.round(x)} -120 C ${Math.round(x + sway)} ${Math.round(H * 0.32)}, ${Math.round(x - sway)} ${Math.round(H * 0.62)}, ${Math.round(x + sway * 0.4)} ${H + 80}`;
      return `<path d="${d}" fill="none" stroke="${c}" stroke-width="${Math.round(sw)}" stroke-linecap="round" opacity="0.5"/>`;
    })
    .join("");
  const stars: string[] = [];
  for (let i = 0; i < 70; i++) {
    stars.push(
      `<circle cx="${Math.round(rng() * W)}" cy="${Math.round(rng() * H * 0.66)}" r="${(0.4 + rng() * 1.5).toFixed(1)}" fill="#fff" opacity="${(0.25 + rng() * 0.55).toFixed(2)}"/>`
    );
  }
  return uri(
    `<defs><linearGradient id="${p}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient>` +
      `<filter id="${p}b" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="95"/></filter></defs>` +
      `<rect width="${W}" height="${H}" fill="url(#${p}s)"/>${stars.join("")}` +
      `<g filter="url(#${p}b)">${bands}</g>`
  );
}

/* ---------------------------------- bokeh ----------------------------------- */
/* out-of-focus light orbs — dreamy photographic depth */

function bokeh(seed: number, base: [string, string], lights: string[]): string {
  const rng = mulberry32(seed);
  const p = `bk${seed}`;
  const orbs: string[] = [];
  for (let i = 0; i < 30; i++) {
    const c = lights[Math.floor(rng() * lights.length)];
    orbs.push(
      `<circle cx="${Math.round(rng() * W)}" cy="${Math.round(rng() * H)}" r="${Math.round(36 + rng() * 210)}" fill="${c}" opacity="${(0.1 + rng() * 0.4).toFixed(2)}"/>`
    );
  }
  return uri(
    `<defs><radialGradient id="${p}g" cx="0.5" cy="0.38" r="0.9"><stop offset="0" stop-color="${base[0]}"/><stop offset="1" stop-color="${base[1]}"/></radialGradient>` +
      `<filter id="${p}b" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="30"/></filter></defs>` +
      `<rect width="${W}" height="${H}" fill="url(#${p}g)"/>` +
      `<g filter="url(#${p}b)">${orbs.join("")}</g>`
  );
}

/* ------------------------------- topographic -------------------------------- */
/* nested contour lines — a clean topographic-map look */

function topographic(seed: number, base: string, line: string): string {
  const rng = mulberry32(seed);
  const centers: [number, number][] = [
    [W * (0.24 + rng() * 0.12), H * (0.32 + rng() * 0.14)],
    [W * (0.68 + rng() * 0.12), H * (0.58 + rng() * 0.14)],
  ];
  const rings: string[] = [];
  const h1 = rng() * 6;
  const h2 = rng() * 6;
  centers.forEach(([cx, cy], ci) => {
    for (let r = 58; r < Math.max(W, H) * 0.9; r += 50) {
      const pts: string[] = [];
      for (let a = 0; a <= 360; a += 10) {
        const rad = (a * Math.PI) / 180;
        const wob = 1 + 0.07 * Math.sin(rad * 3 + h1 + ci) + 0.045 * Math.sin(rad * 5 + h2 + r * 0.01);
        pts.push(`${Math.round(cx + Math.cos(rad) * r * wob)},${Math.round(cy + Math.sin(rad) * r * wob)}`);
      }
      rings.push(`<polygon points="${pts.join(" ")}" fill="none" stroke="${line}" stroke-width="1.6" opacity="0.42"/>`);
    }
  });
  return uri(`<rect width="${W}" height="${H}" fill="${base}"/>${rings.join("")}`);
}

/* ---------------------------------- grid ------------------------------------ */
/* perspective grid receding to a glowing horizon — retro-futuristic */

function gridPerspective(seed: number, sky: [string, string], grid: string, glow: string): string {
  const rng = mulberry32(seed);
  const p = `gp${seed}`;
  const horizon = Math.round(H * 0.5);
  const vp = W / 2;
  const lines: string[] = [];
  for (let i = -12; i <= 12; i++) {
    lines.push(`<line x1="${Math.round(vp + i * 34)}" y1="${horizon}" x2="${Math.round(vp + i * (W / 8))}" y2="${H}" stroke="${grid}" stroke-width="2" opacity="0.5"/>`);
  }
  let y = horizon + 8;
  let gap = 9;
  while (y < H) {
    lines.push(`<line x1="0" y1="${Math.round(y)}" x2="${W}" y2="${Math.round(y)}" stroke="${grid}" stroke-width="2" opacity="0.4"/>`);
    y += gap;
    gap *= 1.32;
  }
  void rng;
  return uri(
    `<defs><linearGradient id="${p}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient>` +
      `<radialGradient id="${p}g" cx="0.5" cy="1" r="0.7"><stop offset="0" stop-color="${glow}" stop-opacity="0.85"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient></defs>` +
      `<rect width="${W}" height="${horizon}" fill="url(#${p}s)"/>` +
      `<rect y="${horizon}" width="${W}" height="${H - horizon}" fill="${sky[1]}"/>` +
      `<circle cx="${vp}" cy="${horizon}" r="${Math.round(H * 0.46)}" fill="url(#${p}g)"/>` +
      `<g>${lines.join("")}</g>`
  );
}

/* ----------------------------------- silk ----------------------------------- */
/* draped satin: wide soft-edged ribbons with a specular sheen along each fold */

function silk(seed: number, base: string, colors: string[], sheen: string): string {
  const rng = mulberry32(seed);
  const defs: string[] = [];
  const ribbons = colors
    .map((c, i) => {
      const y0 = H * (-0.05 + i * (0.95 / colors.length)) + (rng() - 0.5) * 120;
      const a = 220 + rng() * 280;
      const b = 220 + rng() * 280;
      const thick = 420 + rng() * 220;
      // each fold: shadowed edges, lit crest, so overlapping folds read as draped fabric
      defs.push(
        `<linearGradient id="sk_f${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0.55"/><stop offset="0.3" stop-color="${c}"/><stop offset="0.45" stop-color="${sheen}" stop-opacity="0.85"/><stop offset="0.62" stop-color="${c}"/><stop offset="1" stop-color="#000" stop-opacity="0.6"/></linearGradient>`
      );
      const d = `M -300 ${y0} C ${W * 0.3} ${y0 - a}, ${W * 0.62} ${y0 + b}, ${W + 300} ${y0 - a * 0.4} L ${W + 300} ${y0 - a * 0.4 + thick} C ${W * 0.62} ${y0 + b + thick}, ${W * 0.3} ${y0 - a + thick}, -300 ${y0 + thick} Z`;
      return `<path d="${d}" fill="${c}" filter="url(#sk_soft)"/><path d="${d}" fill="url(#sk_f${i})" opacity="0.85" filter="url(#sk_soft)"/>`;
    })
    .join("");
  return uri(
    `<defs><filter id="sk_soft" x="-20%" y="-30%" width="140%" height="160%"><feGaussianBlur stdDeviation="34"/></filter>${defs.join("")}` +
      `<radialGradient id="sk_vig" cx="0.5" cy="0.45" r="0.8"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.4"/></radialGradient></defs>` +
      `<rect width="${W}" height="${H}" fill="${base}"/>${ribbons}<rect width="${W}" height="${H}" fill="url(#sk_vig)"/>`
  );
}

/* ---------------------------------- liquid ---------------------------------- */
/* glossy iridescent orbs floating over a blurred color field */

function liquid(seed: number, base: string, field: string[], orb: string[]): string {
  const rng = mulberry32(seed);
  const blobs = field
    .map((c) => `<circle cx="${Math.round(rng() * W)}" cy="${Math.round(rng() * H)}" r="${Math.round(380 + rng() * 300)}" fill="${c}"/>`)
    .join("");
  const orbs: string[] = [];
  const defs: string[] = [];
  for (let i = 0; i < 6; i++) {
    const r = Math.round(90 + rng() * 210);
    const cx = Math.round(r + rng() * (W - 2 * r));
    const cy = Math.round(r + rng() * (H - 2 * r));
    const c1 = orb[i % orb.length];
    const c2 = orb[(i + 1) % orb.length];
    defs.push(
      `<radialGradient id="lq_b${i}" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/><stop offset="0.18" stop-color="${c1}"/><stop offset="0.75" stop-color="${c2}"/><stop offset="1" stop-color="#000" stop-opacity="0.35"/></radialGradient>` +
        `<radialGradient id="lq_r${i}" cx="0.5" cy="0.5" r="0.5"><stop offset="0.78" stop-color="#fff" stop-opacity="0"/><stop offset="0.97" stop-color="#fff" stop-opacity="0.55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`
    );
    orbs.push(
      `<ellipse cx="${cx + r * 0.25}" cy="${cy + r * 1.05}" rx="${r * 0.8}" ry="${r * 0.16}" fill="#000" opacity="0.18" filter="url(#lq_sh)"/>` +
        `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#lq_b${i})"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#lq_r${i})"/>` +
        `<ellipse cx="${cx - r * 0.32}" cy="${cy - r * 0.42}" rx="${r * 0.3}" ry="${r * 0.16}" fill="#fff" opacity="0.6" transform="rotate(-30 ${cx - r * 0.32} ${cy - r * 0.42})" filter="url(#lq_hl)"/>`
    );
  }
  return uri(
    `<defs><filter id="lq_bg" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="140"/></filter><filter id="lq_sh"><feGaussianBlur stdDeviation="18"/></filter><filter id="lq_hl"><feGaussianBlur stdDeviation="6"/></filter>${defs.join("")}</defs>` +
      `<rect width="${W}" height="${H}" fill="${base}"/><g filter="url(#lq_bg)">${blobs}</g>${orbs.join("")}`
  );
}

/* ---------------------------------- studio ---------------------------------- */
/* seamless photo-studio sweep: wall, soft horizon, floor, overhead spotlight */

function studio(wallTop: string, wall: string, floor: string, light: string, intensity: number): string {
  const hz = H * 0.66;
  return uri(
    `<defs>` +
      `<linearGradient id="st_wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${wallTop}"/><stop offset="1" stop-color="${wall}"/></linearGradient>` +
      `<linearGradient id="st_floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${wall}" stop-opacity="0"/><stop offset="0.45" stop-color="${wall}"/><stop offset="1" stop-color="${floor}"/></linearGradient>` +
      `<radialGradient id="st_spot" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${light}" stop-opacity="${intensity}"/><stop offset="1" stop-color="${light}" stop-opacity="0"/></radialGradient>` +
      `<linearGradient id="st_cone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${light}" stop-opacity="${intensity * 0.55}"/><stop offset="1" stop-color="${light}" stop-opacity="0"/></linearGradient>` +
      `<radialGradient id="st_vig" cx="0.5" cy="0.45" r="0.75"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.45"/></radialGradient>` +
      `<filter id="st_b" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="60"/></filter>` +
      `</defs>` +
      `<rect width="${W}" height="${H}" fill="url(#st_wall)"/>` +
      `<rect y="${hz - 260}" width="${W}" height="${H - hz + 260}" fill="url(#st_floor)"/>` +
      `<path d="M${W * 0.36} 0 H ${W * 0.64} L ${W * 0.86} ${hz + 60} H ${W * 0.14} Z" fill="url(#st_cone)" filter="url(#st_b)"/>` +
      `<ellipse cx="${W / 2}" cy="${hz + 90}" rx="${W * 0.36}" ry="${H * 0.12}" fill="url(#st_spot)"/>` +
      `<rect width="${W}" height="${H}" fill="url(#st_vig)"/>`
  );
}

/* ----------------------------------- holo ----------------------------------- */
/* holographic foil: rainbow bands crossing at angles, soft-light grain */

function holo(seed: number, base: string, hues: string[]): string {
  const rng = mulberry32(seed);
  const band = (angle: number, offset: number, id: string) => {
    const stops = hues
      .concat(hues[0])
      .map((c, i, a) => `<stop offset="${(i / (a.length - 1)).toFixed(3)}" stop-color="${c}"/>`)
      .join("");
    return `<linearGradient id="${id}" x1="${offset}" y1="0" x2="${offset + 0.6}" y2="1" gradientTransform="rotate(${angle} 0.5 0.5)" spreadMethod="reflect">${stops}</linearGradient>`;
  };
  const a1 = Math.round(rng() * 40 - 20);
  const a2 = Math.round(90 + rng() * 40);
  return uri(
    `<defs>${band(a1, 0, "hl_a")}${band(a2, 0.2, "hl_b")}` +
      `<filter id="hl_n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${seed}"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.12 0"/></filter>` +
      `<filter id="hl_w"><feTurbulence type="turbulence" baseFrequency="0.0016 0.004" numOctaves="2" seed="${seed + 1}" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="220"/></filter>` +
      `<radialGradient id="hl_g" cx="0.3" cy="0.25" r="0.8"><stop offset="0" stop-color="#fff" stop-opacity="0.55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>` +
      `<rect width="${W}" height="${H}" fill="${base}"/>` +
      `<g filter="url(#hl_w)"><rect x="-200" y="-200" width="${W + 400}" height="${H + 400}" fill="url(#hl_a)" opacity="0.9"/><rect x="-200" y="-200" width="${W + 400}" height="${H + 400}" fill="url(#hl_b)" opacity="0.45" style="mix-blend-mode:soft-light"/></g>` +
      `<rect width="${W}" height="${H}" fill="url(#hl_g)" style="mix-blend-mode:soft-light"/>` +
      `<rect width="${W}" height="${H}" filter="url(#hl_n)"/>`
  );
}

/* ----------------------------------- beams ---------------------------------- */
/* keynote-style light beams fanning down from above onto a dark stage */

function beams(seed: number, base: string, colors: string[]): string {
  const rng = mulberry32(seed);
  const rays = Array.from({ length: 7 }, (_, i) => {
    const x = W * (0.1 + (i / 6) * 0.8) + (rng() - 0.5) * 120;
    const spread = 160 + rng() * 220;
    const c = colors[i % colors.length];
    return `<path d="M${W / 2 + (x - W / 2) * 0.15 - 12} -40 L ${W / 2 + (x - W / 2) * 0.15 + 12} -40 L ${x + spread} ${H + 40} L ${x - spread} ${H + 40} Z" fill="${c}" opacity="${(0.22 + rng() * 0.25).toFixed(2)}"/>`;
  }).join("");
  return uri(
    `<defs><filter id="bm_b" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="48"/></filter>` +
      `<radialGradient id="bm_src" cx="0.5" cy="0" r="0.6"><stop offset="0" stop-color="${colors[0]}" stop-opacity="0.9"/><stop offset="1" stop-color="${colors[0]}" stop-opacity="0"/></radialGradient>` +
      `<linearGradient id="bm_fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0.55" stop-color="${base}" stop-opacity="0"/><stop offset="1" stop-color="${base}" stop-opacity="0.95"/></linearGradient></defs>` +
      `<rect width="${W}" height="${H}" fill="${base}"/><g filter="url(#bm_b)" style="mix-blend-mode:screen">${rays}</g>` +
      `<rect width="${W}" height="${H * 0.7}" fill="url(#bm_src)"/><rect width="${W}" height="${H}" fill="url(#bm_fade)"/>`
  );
}

/* --------------------------------- registry --------------------------------- */

export const BUILTIN_BACKGROUNDS: Record<string, ResolvedAsset & { label: string }> = {};

function register(id: string, label: string, url: string) {
  BUILTIN_BACKGROUNDS[`builtin:${id}`] = { url, width: W, height: H, label };
}

/* Glass — “paper ribbon” line art */
register("glass-midnight", "Midnight", glass(11, "#0b1020", ["#67e8f9", "#a5b4fc", "#f0abfc"], 0.5));
register("glass-ember", "Ember", glass(23, "#160a06", ["#fbbf24", "#fb7185", "#f97316"], 0.45));
register("glass-pearl", "Pearl", glass(37, "#f4f4f8", ["#94a3b8", "#c4b5fd", "#67e8f9"], 0.5));
register("glass-emerald", "Emerald", glass(51, "#03150f", ["#34d399", "#a7f3d0", "#22d3ee"], 0.42));

/* Refract — colorful fluted-glass patterns */
register("rf-prism", "Prism", refract(101, "#e8ecf7", ["#f472b6", "#818cf8", "#38bdf8", "#fbbf24"]));
register("rf-iris", "Iris", refract(113, "#120c2a", ["#8b5cf6", "#ec4899", "#22d3ee", "#4c1d95"]));
register("rf-flare", "Flare", refract(127, "#2a0a08", ["#fb923c", "#f43f5e", "#fde047", "#9a3412"]));
register("rf-lagoon", "Lagoon", refract(139, "#03222b", ["#2dd4bf", "#0ea5e9", "#a7f3d0", "#155e75"]));
register("rf-sorbet", "Sorbet", refract(151, "#fdf1f5", ["#fda4af", "#fbcfe8", "#a5b4fc", "#fde68a"]));
register("rf-neon", "Neon", refract(163, "#0a0a12", ["#a3e635", "#22d3ee", "#e879f9", "#365314"]));

/* Desktop — soft blurred wallpapers */
register("desk-sequoia", "Sequoia", desktop(7, "#1e3a8a", ["#7c3aed", "#2563eb", "#0ea5e9", "#c084fc"]));
register("desk-sonoma", "Sonoma", desktop(19, "#9a3412", ["#fb923c", "#fbbf24", "#f43f5e", "#fda4af"]));
register("desk-ventura", "Ventura", desktop(31, "#7f1d1d", ["#ea580c", "#e11d48", "#a21caf", "#fbbf24"]));
register("desk-monterey", "Monterey", desktop(43, "#312e81", ["#a855f7", "#ec4899", "#3b82f6", "#22d3ee"]));
register("desk-mist", "Mist", desktop(59, "#e2e8f0", ["#c7d2fe", "#fbcfe8", "#bae6fd", "#f5f5f4"]));
register("desk-slate", "Slate", desktop(67, "#0f172a", ["#334155", "#475569", "#1e293b", "#64748b"]));

/* Abstract — bold wave compositions */
register("abs-lava", "Lava", abstractWaves(13, ["#450a0a", "#dc2626", "#f97316", "#fbbf24"]));
register("abs-deep", "Deep", abstractWaves(29, ["#020617", "#1d4ed8", "#0ea5e9", "#67e8f9"]));
register("abs-orchid", "Orchid", abstractWaves(41, ["#2e1065", "#7c3aed", "#d946ef", "#f0abfc"]));
register("abs-forest", "Forest", abstractWaves(53, ["#052e16", "#15803d", "#4ade80", "#bbf7d0"]));
register("abs-sun", "Sun", abstractWaves(61, ["#7c2d12", "#ea580c", "#fbbf24", "#fef08a"]));
register("abs-mono", "Mono", abstractWaves(71, ["#09090b", "#3f3f46", "#a1a1aa", "#e4e4e7"]));

/* Texture — paper / weave / carbon */
register("tex-paper", "Paper", paperTexture(3, "#f5f2ea", "#8a8578", 0.5, 0.4));
register("tex-noir", "Noir", paperTexture(9, "#101013", "#5b5b66", 0.6, 0.5));
register("tex-canvas", "Canvas", weaveTexture("#ece7db", "#b8b09c", 14));
register("tex-carbon", "Carbon", weaveTexture("#131417", "#2e3138", 10));
register("tex-blueprint", "Blueprint", weaveTexture("#0c2a5b", "#3b6db3", 26));
register("tex-sand", "Sand", paperTexture(17, "#e8d8bd", "#a2814e", 0.35, 0.35));

// aurora — glowing borealis curtains over a night sky
register("au-borealis", "Borealis", aurora(201, ["#04122a", "#010409"], ["#34d399", "#22d3ee", "#a3e635"]));
register("au-violet", "Violet Veil", aurora(211, ["#160a2e", "#05030f"], ["#a855f7", "#ec4899", "#6366f1"]));
register("au-ember", "Ember Sky", aurora(223, ["#1a0a12", "#0a0406"], ["#fb7185", "#fbbf24", "#f97316"]));
register("au-glacier", "Glacier", aurora(233, ["#041c2a", "#020a12"], ["#67e8f9", "#a5f3fc", "#818cf8"]));

// bokeh — dreamy out-of-focus light orbs
register("bk-noir", "Noir Lights", bokeh(301, ["#1e293b", "#020617"], ["#f8fafc", "#93c5fd", "#c4b5fd"]));
register("bk-warm", "Warm Glow", bokeh(313, ["#3b1d0e", "#180a04"], ["#fde68a", "#fdba74", "#fca5a5"]));
register("bk-candy", "Candy", bokeh(323, ["#2e1065", "#0f0524"], ["#f0abfc", "#a5b4fc", "#67e8f9"]));
register("bk-mint", "Mint", bokeh(331, ["#022c22", "#01120d"], ["#6ee7b7", "#a7f3d0", "#5eead4"]));

// topographic — clean contour-map lines
register("topo-paper", "Paper Map", topographic(401, "#f4efe4", "#b7a98c"));
register("topo-noir", "Noir Map", topographic(413, "#0d1117", "#39507a"));
register("topo-blue", "Blueprint", topographic(423, "#0a2547", "#4f86c6"));
register("topo-sage", "Sage Map", topographic(431, "#e7efe6", "#93b39a"));

// grid — perspective grid to a glowing horizon
register("grid-sunset", "Sunset Grid", gridPerspective(501, ["#2b0a3d", "#0a0212"], "#ec4899", "#fb7185"));
register("grid-cyber", "Cyber", gridPerspective(513, ["#04121f", "#01060c"], "#22d3ee", "#0ea5e9"));
register("grid-mono", "Mono Grid", gridPerspective(523, ["#18181b", "#050506"], "#71717a", "#a1a1aa"));
register("grid-acid", "Acid", gridPerspective(531, ["#0a1f05", "#020a01"], "#a3e635", "#4ade80"));

// silk — draped satin folds
register("silk-champagne", "Champagne", silk(601, "#2a1f17", ["#c9a27a", "#e8cfae", "#a87b55", "#f4e3cc"], "#fff6e8"));
register("silk-rose", "Rose", silk(613, "#3a0f1f", ["#e05a84", "#f7a8c0", "#b8325f", "#ffd6e2"], "#fff0f5"));
register("silk-midnight", "Midnight", silk(623, "#050816", ["#1e3a8a", "#3b5bdb", "#0f1d4a", "#7b93ff"], "#c7d2fe"));
register("silk-emerald", "Emerald", silk(631, "#021a12", ["#0f766e", "#34d399", "#065f46", "#a7f3d0"], "#ecfdf5"));
register("silk-pearl", "Pearl", silk(641, "#d9d6e4", ["#ffffff", "#e9e4f5", "#cfc8e2", "#f8f5ff"], "#ffffff"));

// liquid — glossy iridescent orbs
register("lq-iris", "Iris", liquid(701, "#0b0820", ["#4c1d95", "#1d4ed8", "#be185d"], ["#a78bfa", "#38bdf8", "#f472b6"]));
register("lq-candy", "Candy", liquid(713, "#fde7f1", ["#fbcfe8", "#bae6fd", "#fde68a"], ["#f472b6", "#60a5fa", "#fbbf24"]));
register("lq-chrome", "Chrome", liquid(723, "#0a0a0c", ["#27272a", "#3f3f46", "#18181b"], ["#e4e4e7", "#71717a", "#a1a1aa"]));
register("lq-lime", "Lime", liquid(733, "#04140b", ["#14532d", "#065f46", "#365314"], ["#a3e635", "#34d399", "#facc15"]));

// studio — seamless sweep with an overhead spotlight
register("st-white", "White Studio", studio("#d9dbe0", "#f1f2f5", "#c9ccd3", "#ffffff", 0.75));
register("st-graphite", "Graphite", studio("#0d0e11", "#24262c", "#0a0b0d", "#ffffff", 0.22));
register("st-sand", "Sand", studio("#d8c8b0", "#efe4d3", "#c7b393", "#fffaf0", 0.6));
register("st-blush", "Blush", studio("#e9c9cf", "#f8e6e9", "#d9aab3", "#ffffff", 0.6));
register("st-ocean", "Ocean", studio("#0c2a4a", "#1d4f80", "#081b30", "#9fd3ff", 0.35));
register("st-lilac", "Lilac", studio("#cfc6ea", "#ece7fb", "#b6a9dc", "#ffffff", 0.6));

// holo — holographic foil
register("holo-opal", "Opal", holo(801, "#e9e6f7", ["#f9a8d4", "#a5b4fc", "#67e8f9", "#bbf7d0", "#fde68a"]));
register("holo-night", "Night Foil", holo(811, "#0b0b14", ["#7c3aed", "#2563eb", "#06b6d4", "#db2777"]));
register("holo-pastel", "Pastel", holo(821, "#fdf2f8", ["#fecdd3", "#ddd6fe", "#bae6fd", "#d9f99d"]));
register("holo-sunset", "Sunset Foil", holo(831, "#1f0a10", ["#fb7185", "#f97316", "#fde047", "#c026d3"]));

// beams — keynote light beams
register("bm-violet", "Violet Beams", beams(901, "#06030f", ["#a855f7", "#6366f1", "#ec4899"]));
register("bm-ice", "Ice Beams", beams(913, "#020814", ["#38bdf8", "#e0f2fe", "#6366f1"]));
register("bm-gold", "Gold Beams", beams(923, "#0d0802", ["#fbbf24", "#fde68a", "#f97316"]));
register("bm-mint", "Mint Beams", beams(931, "#010d09", ["#34d399", "#a7f3d0", "#22d3ee"]));

/* ------------------------------ store-set art ------------------------------- */
/* Portrait backdrops for the store listing sets (lib/storeSets.ts), drawn at
   the App Store's 6.9" size so they stay crisp on every shot. */

const PW = 1320;
const PH = 2868;

function nightSky(seed: number, top: string, bottom: string, glow: string): string {
  const rng = mulberry32(seed);
  const stars = Array.from({ length: 170 }, () => {
    const x = Math.round(rng() * PW);
    const y = Math.round(rng() * PH);
    const r = (rng() < 0.12 ? 2.6 : 1.1 + rng() * 1.2).toFixed(1);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${(0.18 + rng() * 0.6).toFixed(2)}"/>`;
  }).join("");
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PW} ${PH}">` +
      `<defs><linearGradient id="ns_bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>` +
      `<radialGradient id="ns_glow" cx="0.5" cy="0.08" r="0.62"><stop offset="0" stop-color="${glow}" stop-opacity="0.55"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient></defs>` +
      `<rect width="${PW}" height="${PH}" fill="url(#ns_bg)"/><rect width="${PW}" height="${PH}" fill="url(#ns_glow)"/>${stars}</svg>`
  )}`;
}

BUILTIN_BACKGROUNDS["builtin:set-night"] = {
  url: nightSky(1201, "#1a1f4d", "#070a1c", "#7c6cf0"),
  width: PW,
  height: PH,
  label: "Night Sky",
};

/* Sample app screens shipped with the store sets: builtin:sample/<app>/<ios|android>-NN */
const SAMPLE_SIZE = { ios: { width: 1206, height: 2622 }, android: { width: 1277, height: 2852 } } as const;
const SAMPLE_RE = /^builtin:sample\/([a-z0-9-]+)\/(ios|android)-(\d{2})$/;

function resolveSample(assetId: string): (ResolvedAsset & { label: string }) | undefined {
  const m = SAMPLE_RE.exec(assetId);
  if (!m) return undefined;
  const [, app, platform, n] = m;
  const size = SAMPLE_SIZE[platform as keyof typeof SAMPLE_SIZE];
  return { url: `/store-sets/${app}/${platform}-${n}.webp`, ...size, label: `${app} screen ${Number(n)}` };
}

export function resolveBuiltin(assetId: string): (ResolvedAsset & { label: string }) | undefined {
  return BUILTIN_BACKGROUNDS[assetId] ?? resolveSample(assetId);
}
