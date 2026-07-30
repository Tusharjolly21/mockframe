/**
 * Parametric SVG frame generator.
 *
 * Writes registry/<id>/device.json + frame-<variant>.svg for the launch set.
 * Generated frames are a starting point — any device can later be replaced by a
 * hand-traced SVG as long as device.json stays accurate (CI validates both).
 *
 * SVG file layout (markers are consumed by build-registry.mjs):
 *   <!--BODY-->   frame drawn BELOW the screenshot
 *   <!--SCREEN--> placeholder screen fill, used only for standalone previews
 *   <!--OVERLAY-->elements drawn ON TOP of the screenshot (island, punch-hole, notch)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "registry");

/* ------------------------------- svg helpers ------------------------------- */

const rr = (x, y, w, h, r) => {
  const c = typeof r === "number" ? { tl: r, tr: r, br: r, bl: r } : r;
  return [
    `M${x + c.tl} ${y}`,
    `H${x + w - c.tr}`,
    c.tr ? `A${c.tr} ${c.tr} 0 0 1 ${x + w} ${y + c.tr}` : "",
    `V${y + h - c.br}`,
    c.br ? `A${c.br} ${c.br} 0 0 1 ${x + w - c.br} ${y + h}` : "",
    `H${x + c.bl}`,
    c.bl ? `A${c.bl} ${c.bl} 0 0 1 ${x} ${y + h - c.bl}` : "",
    `V${y + c.tl}`,
    c.tl ? `A${c.tl} ${c.tl} 0 0 1 ${x + c.tl} ${y}` : "",
    "Z",
  ]
    .filter(Boolean)
    .join(" ");
};

const linGrad = (id, stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">` +
  stops.map(([at, color]) => `<stop offset="${at}" stop-color="${color}"/>`).join("") +
  `</linearGradient>`;

/* ---------------------------- screen placeholders --------------------------- */
/* Preview screens show wallpaper-style art, not black glass — the picker should
   feel like real devices (shots.so parity). */

function screenFill(meta, variantId, g) {
  const p = `fk_scr_${meta.id}_${variantId}`;
  const r = g.screenRect;
  if (meta.category === "browser") {
    return `<path d="${g.maskPath}" fill="#f6f7f9"/>
<rect x="${r.x + r.width * 0.06}" y="${r.y + r.height * 0.08}" width="${r.width * 0.42}" height="${r.height * 0.06}" rx="${(r.height * 0.06) / 2}" fill="#e2e5ea"/>
<rect x="${r.x + r.width * 0.06}" y="${r.y + r.height * 0.2}" width="${r.width * 0.88}" height="${r.height * 0.4}" rx="28" fill="#e9ecf1"/>
<rect x="${r.x + r.width * 0.06}" y="${r.y + r.height * 0.66}" width="${r.width * 0.42}" height="${r.height * 0.22}" rx="24" fill="#eef0f4"/>
<rect x="${r.x + r.width * 0.52}" y="${r.y + r.height * 0.66}" width="${r.width * 0.42}" height="${r.height * 0.22}" rx="24" fill="#eef0f4"/>`;
  }
  const [c1, c2, c3] = meta.wallpaper ?? ["#6d28d9", "#2563eb", "#e879f9"];
  return `<defs>
<linearGradient id="${p}_a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
<radialGradient id="${p}_b" cx="0.28" cy="0.22" r="0.8"><stop offset="0" stop-color="${c3}" stop-opacity="0.95"/><stop offset="1" stop-color="${c3}" stop-opacity="0"/></radialGradient>
<radialGradient id="${p}_c" cx="0.85" cy="0.92" r="0.9"><stop offset="0" stop-color="#ffffff" stop-opacity="0.32"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
</defs>
<path d="${g.maskPath}" fill="url(#${p}_a)"/>
<path d="${g.maskPath}" fill="url(#${p}_b)"/>
<path d="${g.maskPath}" fill="url(#${p}_c)"/>`;
}

/* ------------------------------ phone generator ---------------------------- */

function phone({ id, variant, screenW, screenH, screenR, bezel, bodyR, rail, bodyFill, camera, buttons }) {
  const M = 12; // margin for button protrusion
  const bodyW = screenW + bezel * 2;
  const bodyH = screenH + bezel * 2;
  const W = bodyW + M * 2;
  const H = bodyH + M * 2;
  const sx = M + bezel;
  const sy = M + bezel;
  const p = `fk_${id}_${variant}`;

  const btn = (side, y, len) => {
    const w = 16;
    const x = side === "left" ? M - w + 6 : W - M - 6;
    return `<rect x="${x}" y="${y}" width="${w}" height="${len}" rx="7" fill="url(#${p}_btn)"/>`;
  };

  const body = `
<defs>
${linGrad(`${p}_rail`, rail, 0, 0, 1, 1)}
${linGrad(`${p}_btn`, [[0, rail[0][1]], [1, rail[rail.length - 1][1]]], 0, 0, 1, 0)}
<radialGradient id="${p}_sheen" cx="0.25" cy="0.05" r="1.4">
  <stop offset="0" stop-color="#ffffff" stop-opacity="0.10"/>
  <stop offset="0.4" stop-color="#ffffff" stop-opacity="0.02"/>
  <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
</radialGradient>
</defs>
${buttons.map((b) => btn(b.side, M + b.y, b.len)).join("\n")}
<path d="${rr(M, M, bodyW, bodyH, bodyR)}" fill="url(#${p}_rail)"/>
<path d="${rr(M + 7, M + 7, bodyW - 14, bodyH - 14, bodyR - 7)}" fill="${bodyFill}"/>
<path d="${rr(M + 7, M + 7, bodyW - 14, bodyH - 14, bodyR - 7)}" fill="url(#${p}_sheen)"/>
`;

  let overlay = "";
  if (camera.kind === "island") {
    const iw = camera.w, ih = camera.h;
    const ix = M + bodyW / 2 - iw / 2;
    const iy = sy + camera.top;
    overlay = `
<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" rx="${ih / 2}" fill="#020204"/>
<circle cx="${ix + iw - ih / 2}" cy="${iy + ih / 2}" r="${ih * 0.30}" fill="#08080d"/>
<circle cx="${ix + iw - ih / 2}" cy="${iy + ih / 2}" r="${ih * 0.14}" fill="#141824"/>
<circle cx="${ix + iw - ih / 2 - ih * 0.09}" cy="${iy + ih / 2 - ih * 0.11}" r="${ih * 0.05}" fill="#2d3550" opacity="0.9"/>`;
  } else if (camera.kind === "punch") {
    const cx = M + bodyW / 2;
    const cy = sy + camera.top;
    const r = camera.r;
    overlay = `
<circle cx="${cx}" cy="${cy}" r="${r}" fill="#020204"/>
<circle cx="${cx}" cy="${cy}" r="${r * 0.55}" fill="#0c0e16"/>
<circle cx="${cx - r * 0.22}" cy="${cy - r * 0.25}" r="${r * 0.16}" fill="#28304a" opacity="0.9"/>`;
  } else if (camera.kind === "bezel-dot") {
    // camera sits in the bezel above the screen (tablets)
    const cx = M + bodyW / 2;
    const cy = (M + 7 + sy) / 2;
    overlay = `
<circle cx="${cx}" cy="${cy}" r="14" fill="#020204"/>
<circle cx="${cx}" cy="${cy}" r="7" fill="#101623"/>`;
  }

  return {
    W, H,
    screenRect: { x: sx, y: sy, width: screenW, height: screenH },
    maskPath: rr(sx, sy, screenW, screenH, screenR),
    body, overlay,
  };
}

/* ------------------------------ watch generator ---------------------------- */

function watch({ id, variant, screenW, screenH, screenR, bezel, rail, bodyFill, band, ultra }) {
  const bodyW = screenW + bezel * 2;
  const bodyH = screenH + bezel * 2;
  const bodyR = Math.min(bodyW, bodyH) * 0.4;
  const bandW = Math.round(bodyW * 0.58);
  const bandLen = 170;
  const crownW = 26;
  const M = 14;
  const W = M + bodyW + crownW + M;
  const H = M + bandLen + bodyH + bandLen + M;
  const bx = M;
  const by = M + bandLen;
  const sx = bx + bezel;
  const sy = by + bezel;
  const p = `fk_${id}_${variant}`;
  const bandX = bx + bodyW / 2 - bandW / 2;

  const body = `
<defs>
${linGrad(`${p}_rail`, rail, 0, 0, 1, 1)}
${linGrad(`${p}_band`, band, 0, 0, 1, 0)}
${linGrad(`${p}_crown`, [[0, rail[0][1]], [1, rail[rail.length - 1][1]]], 0, 0, 1, 0)}
<radialGradient id="${p}_sheen" cx="0.25" cy="0.1" r="1.3">
  <stop offset="0" stop-color="#ffffff" stop-opacity="0.12"/>
  <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
</radialGradient>
</defs>
<path d="${rr(bandX, M, bandW, bandLen + 40, { tl: 38, tr: 38, br: 0, bl: 0 })}" fill="url(#${p}_band)"/>
<rect x="${bandX + 14}" y="${M + 24}" width="${bandW - 28}" height="6" rx="3" fill="#00000030"/>
<rect x="${bandX + 14}" y="${M + 66}" width="${bandW - 28}" height="6" rx="3" fill="#00000030"/>
<rect x="${bandX + 14}" y="${M + 108}" width="${bandW - 28}" height="6" rx="3" fill="#00000030"/>
<path d="${rr(bandX, by + bodyH - 40, bandW, bandLen + 40, { tl: 0, tr: 0, br: 38, bl: 38 })}" fill="url(#${p}_band)"/>
<rect x="${bandX + 14}" y="${by + bodyH + 60}" width="${bandW - 28}" height="6" rx="3" fill="#00000030"/>
<rect x="${bandX + 14}" y="${by + bodyH + 102}" width="${bandW - 28}" height="6" rx="3" fill="#00000030"/>
<rect x="${bx + bodyW - 6}" y="${by + bodyH * 0.2}" width="${crownW + 4}" height="76" rx="12" fill="url(#${p}_crown)"/>
<rect x="${bx + bodyW - 2}" y="${by + bodyH * 0.2 + 8}" width="${crownW - 4}" height="60" rx="9" fill="#00000022"/>
<rect x="${bx + bodyW - 4}" y="${by + bodyH * 0.52}" width="${crownW - 6}" height="112" rx="9" fill="url(#${p}_crown)"/>
${ultra ? `<rect x="${bx - 8}" y="${by + bodyH * 0.32}" width="18" height="100" rx="9" fill="#f97316"/>` : ""}
<path d="${rr(bx, by, bodyW, bodyH, bodyR)}" fill="url(#${p}_rail)"/>
<path d="${rr(bx + 8, by + 8, bodyW - 16, bodyH - 16, bodyR - 8)}" fill="${bodyFill}"/>
<path d="${rr(bx + 8, by + 8, bodyW - 16, bodyH - 16, bodyR - 8)}" fill="url(#${p}_sheen)"/>
`;

  return {
    W, H,
    screenRect: { x: sx, y: sy, width: screenW, height: screenH },
    maskPath: rr(sx, sy, screenW, screenH, screenR),
    body,
    overlay: "",
  };
}

/* ----------------------------- laptop generator ---------------------------- */

function laptop({ id, variant, screenW, screenH, bezel, bezelBottom, alum, deckFill, lidFill, notch }) {
  const lidW = screenW + bezel * 2;
  const lidH = screenH + bezel + bezelBottom;
  const baseW = Math.round(lidW * 1.21);
  const baseH = 118;
  const M = 10;
  const W = baseW + M * 2;
  const H = M + lidH + baseH + M;
  const lidX = M + (baseW - lidW) / 2;
  const sx = lidX + bezel;
  const sy = M + bezel;
  const p = `fk_${id}_${variant}`;

  const body = `
<defs>
${linGrad(`${p}_alum`, alum, 0, 0, 0, 1)}
${linGrad(`${p}_deck`, deckFill, 0, 0, 0, 1)}
</defs>
<path d="${rr(lidX, M, lidW, lidH, { tl: 96, tr: 96, br: 24, bl: 24 })}" fill="url(#${p}_alum)"/>
<path d="${rr(lidX + 10, M + 10, lidW - 20, lidH - 20, { tl: 86, tr: 86, br: 16, bl: 16 })}" fill="${lidFill}"/>
<path d="${rr(M, M + lidH, baseW, baseH, { tl: 14, tr: 14, br: 58, bl: 58 })}" fill="url(#${p}_deck)"/>
<path d="${rr(M + baseW / 2 - 290, M + lidH, 580, 34, { tl: 0, tr: 0, br: 30, bl: 30 })}" fill="#00000022"/>
<rect x="${M}" y="${M + lidH}" width="${baseW}" height="6" fill="#ffffff" opacity="0.14"/>
`;

  const nw = notch.w, nh = notch.h;
  const overlay = `
<path d="${rr(sx + screenW / 2 - nw / 2, sy, nw, nh, { tl: 0, tr: 0, br: 18, bl: 18 })}" fill="#000000"/>
<circle cx="${sx + screenW / 2}" cy="${sy + nh / 2}" r="${nh * 0.16}" fill="#101418"/>
<circle cx="${sx + screenW / 2}" cy="${sy + nh / 2}" r="${nh * 0.08}" fill="#1d2b3a"/>`;

  return {
    W, H,
    screenRect: { x: sx, y: sy, width: screenW, height: screenH },
    maskPath: rr(sx, sy, screenW, screenH, { tl: 26, tr: 26, br: 0, bl: 0 }),
    body, overlay,
  };
}

/* ----------------------------- browser generator --------------------------- */

function browser({ id, variant, viewW, viewH, kind, chrome: c }) {
  const M = 10;
  const toolbarH = kind === "chrome" ? 150 : (kind === "arc" ? 120 : 104);
  const sidebarW = kind === "arc" ? 440 : 0;
  const W = viewW + M * 2 + sidebarW;
  const H = M + toolbarH + viewH + M;
  const p = `fk_${id}_${variant}`;
  const winR = 26;

  const lights = `
<circle cx="${M + 44}" cy="${M + (kind === "chrome" ? 38 : (kind === "arc" ? 48 : toolbarH / 2))}" r="13" fill="#ff5f57"/>
<circle cx="${M + 88}" cy="${M + (kind === "chrome" ? 38 : (kind === "arc" ? 48 : toolbarH / 2))}" r="13" fill="#febc2e"/>
<circle cx="${M + 132}" cy="${M + (kind === "chrome" ? 38 : (kind === "arc" ? 48 : toolbarH / 2))}" r="13" fill="#28c840"/>`;

  let toolbar = "";
  if (kind === "chrome") {
    const tabW = 520;
    toolbar = `
<path d="${rr(M, M, viewW, toolbarH, { tl: winR, tr: winR, br: 0, bl: 0 })}" fill="${c.tabstrip}"/>
${lights}
<path d="${rr(M + 180, M + 16, tabW, 60, { tl: 18, tr: 18, br: 0, bl: 0 })}" fill="${c.toolbar}"/>
<circle cx="${M + 216}" cy="${M + 46}" r="15" fill="${c.accentDot}"/>
<rect x="${M + 246}" y="${M + 36}" width="300" height="20" rx="10" fill="${c.textDim}"/>
<rect x="${M}" y="${M + 76}" width="${viewW}" height="${toolbarH - 76}" fill="${c.toolbar}"/>
<rect x="${M + 170}" y="${M + 88}" width="${viewW - 420}" height="52" rx="26" fill="${c.urlbar}"/>
<circle cx="${M + 200}" cy="${M + 114}" r="10" fill="none" stroke="${c.textDim}" stroke-width="4"/>
<text x="${M + 226}" y="${M + 123}" font-family="ui-sans-serif, -apple-system, 'Segoe UI', sans-serif" font-size="30" fill="${c.text}" id="fk_urltext_${p}">framekit.app</text>
<g fill="${c.textDim}">
  <circle cx="${M + 60}" cy="${M + 114}" r="3.6"/><circle cx="${M + 60}" cy="${M + 114}" r="3.6"/>
  <path d="M${M + 96} ${M + 104} l-12 10 12 10" stroke="${c.textDim}" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M${M + 124} ${M + 104} l12 10 -12 10" stroke="${c.textDim}" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.45"/>
  <circle cx="${viewW - M - 150}" cy="${M + 114}" r="4"/><circle cx="${viewW - M - 132}" cy="${M + 114}" r="4"/><circle cx="${viewW - M - 114}" cy="${M + 114}" r="4"/>
</g>
<rect x="${M}" y="${M + toolbarH - 2}" width="${viewW}" height="2" fill="${c.divider}"/>`;
  } else if (kind === "arc") {
    toolbar = `
<path d="${rr(M, M, viewW + sidebarW, toolbarH + viewH, winR)}" fill="${c.windowEdge}"/>
<path d="${rr(M, M, sidebarW, toolbarH + viewH, { tl: winR, tr: 0, br: 0, bl: winR })}" fill="${c.tabstrip}"/>
${lights}
<rect x="${M + 24}" y="${M + 90}" width="${sidebarW - 48}" height="56" rx="14" fill="${c.urlbar}" stroke="${c.divider}" stroke-width="1"/>
<!-- search lock icon -->
<g stroke="${c.textDim}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" transform="translate(${M + 44}, ${M + 106})">
  <rect x="2" y="7" width="12" height="9" rx="2"/>
  <path d="M5 7 V4 a3 3 0 0 1 6 0 v3"/>
</g>
<text x="${M + 76}" y="${M + 128}" font-family="ui-sans-serif, -apple-system, 'Segoe UI', sans-serif" font-size="24" font-weight="600" fill="${c.text}" id="fk_urltext_${p}">framekit.app</text>

<!-- dummy tabs inside sidebar -->
<g fill="${c.textDim}" opacity="0.6" transform="translate(${M + 24}, ${M + 176})">
  <!-- Pinned Tab 1 -->
  <rect x="0" y="0" width="84" height="84" rx="18" fill="${c.toolbar}"/>
  <rect x="26" y="26" width="32" height="32" rx="8" fill="${c.text}"/>
  <!-- Pinned Tab 2 -->
  <rect x="100" y="0" width="84" height="84" rx="18" fill="${c.toolbar}"/>
  <rect x="126" y="26" width="32" height="32" rx="8" fill="${c.text}"/>
  <!-- Pinned Tab 3 -->
  <rect x="200" y="0" width="84" height="84" rx="18" fill="${c.toolbar}"/>
  <rect x="226" y="26" width="32" height="32" rx="8" fill="${c.text}"/>
  
  <!-- Folder/Link list -->
  <g transform="translate(0, 116)">
    <!-- Item 1 -->
    <rect x="0" y="0" width="${sidebarW - 48}" height="42" rx="10" fill="none"/>
    <rect x="16" y="13" width="16" height="16" rx="4" fill="${c.text}"/>
    <rect x="48" y="16" width="160" height="10" rx="5" fill="${c.text}"/>
    <!-- Item 2 -->
    <rect x="0" y="58" width="${sidebarW - 48}" height="42" rx="10" fill="none"/>
    <rect x="16" y="71" width="16" height="16" rx="4" fill="${c.text}"/>
    <rect x="48" y="74" width="120" height="10" rx="5" fill="${c.text}"/>
  </g>
</g>
`;
  } else {
    toolbar = `
<path d="${rr(M, M, viewW, toolbarH, { tl: winR, tr: winR, br: 0, bl: 0 })}" fill="${c.toolbar}"/>
${lights}
<rect x="${M + viewW / 2 - 460}" y="${M + 24}" width="920" height="56" rx="16" fill="${c.urlbar}"/>
<text x="${M + viewW / 2}" y="${M + 62}" text-anchor="middle" font-family="ui-sans-serif, -apple-system, 'Segoe UI', sans-serif" font-size="30" fill="${c.text}" id="fk_urltext_${p}">framekit.app</text>
<g stroke="${c.textDim}" stroke-width="5" fill="none" stroke-linecap="round">
  <path d="M${M + 210} ${M + 40} l-14 12 14 12"/>
  <path d="M${M + 250} ${M + 40} l14 12 -14 12" opacity="0.45"/>
</g>
<rect x="${M}" y="${M + toolbarH - 2}" width="${viewW}" height="2" fill="${c.divider}"/>`;
  }

  const body = kind === "arc" ? `
<defs></defs>
${toolbar}
<!-- Content area backing card -->
<path d="${rr(M + sidebarW + 16, M + 16, viewW - 32, toolbarH + viewH - 32, 16)}" fill="${c.toolbar}"/>
` : `
<defs></defs>
<path d="${rr(M - 2, M - 2, viewW + 4, toolbarH + viewH + 4, winR + 2)}" fill="${c.windowEdge}"/>
${toolbar}
<rect x="${M}" y="${M + toolbarH}" width="${viewW}" height="${viewH}" fill="${c.toolbar}"/>
`;

  return {
    W, H,
    screenRect: kind === "arc" 
      ? { x: M + sidebarW + 16, y: M + 16, width: viewW - 32, height: toolbarH + viewH - 32 }
      : { x: M, y: M + toolbarH, width: viewW, height: viewH },
    maskPath: kind === "arc"
      ? rr(M + sidebarW + 16, M + 16, viewW - 32, toolbarH + viewH - 32, 16)
      : rr(M, M + toolbarH, viewW, viewH, { tl: 0, tr: 0, br: winR, bl: winR }),
    body,
    overlay: "",
  };
}

/* --------------------------------- registry -------------------------------- */

// reusable finish palettes { rail: gradient stops, body: fill }
const BLACK_TI = { rail: [[0, "#5a5a5f"], [0.5, "#2b2b2f"], [1, "#4a4a4f"]], body: "#0a0a0c" };
const NATURAL_TI = { rail: [[0, "#c2beb5"], [0.5, "#8f8b82"], [1, "#b3afa6"]], body: "#101012" };
const WHITE_TI = { rail: [[0, "#eef0f2"], [0.5, "#c4c7cc"], [1, "#e2e4e8"]], body: "#14151a" };
const BLUE_TI = { rail: [[0, "#8fa6c4"], [0.5, "#5f7a9c"], [1, "#7f98b8"]], body: "#0c1019" };
const DESERT_TI = { rail: [[0, "#d8c3a5"], [0.5, "#a98f6d"], [1, "#c8b291"]], body: "#15110b" };
const AL_BLACK = { rail: [[0, "#4d4d52"], [0.5, "#232326"], [1, "#3d3d41"]], body: "#0a0a0c" };
const AL_WHITE = { rail: [[0, "#eef0f3"], [0.5, "#c8ccd2"], [1, "#e2e5ea"]], body: "#15161a" };
const AL_PINK = { rail: [[0, "#ffd4de"], [0.5, "#e39fb2"], [1, "#f8c6d4"]], body: "#1a0e13" };
const AL_BLUE = { rail: [[0, "#bcd5fb"], [0.5, "#87a8d8"], [1, "#adc9f2"]], body: "#0d1119" };
const AL_TEAL = { rail: [[0, "#9fdcd6"], [0.5, "#5aa8a0"], [1, "#8fd0c9"]], body: "#0c1615" };

// standard button set for an island-camera iPhone, scaled to the body height
const iBtns = (h) => [
  { side: "left", y: Math.round(h * 0.19), len: Math.round(h * 0.037) },
  { side: "left", y: Math.round(h * 0.26), len: Math.round(h * 0.069) },
  { side: "left", y: Math.round(h * 0.34), len: Math.round(h * 0.069) },
  { side: "right", y: Math.round(h * 0.24), len: Math.round(h * 0.115) },
];

const DEVICES = [
  {
    meta: {
      id: "iphone-16-pro", name: "iPhone 16 Pro", brand: "apple", category: "phone",
      released: "2024-09",
      screen: { width: 1206, height: 2622, cornerRadius: 165 },
      aliases: ["apple iphone 16 pro"],
      seo: { monthlyQueries: ["iphone 16 pro mockup", "iphone mockup png"] },
      wallpaper: ["#5b21b6", "#2563eb", "#c084fc"],
    },
    gen: (variant, colors) =>
      phone({
        id: "iphone-16-pro", variant,
        screenW: 1206, screenH: 2622, screenR: 165, bezel: 36, bodyR: 200,
        rail: colors.rail, bodyFill: colors.body,
        camera: { kind: "island", w: 372, h: 110, top: 33 },
        buttons: [
          { side: "left", y: 500, len: 96 },
          { side: "left", y: 680, len: 180 },
          { side: "left", y: 900, len: 180 },
          { side: "right", y: 640, len: 300 },
        ],
      }),
    variants: [
      { id: "black-titanium", label: "Black Titanium", colors: { rail: [[0, "#5a5a5f"], [0.5, "#2b2b2f"], [1, "#4a4a4f"]], body: "#0a0a0c" } },
      { id: "natural-titanium", label: "Natural Titanium", colors: { rail: [[0, "#c2beb5"], [0.5, "#8f8b82"], [1, "#b3afa6"]], body: "#101012" } },
    ],
  },
  {
    meta: {
      id: "iphone-16", name: "iPhone 16", brand: "apple", category: "phone",
      released: "2024-09",
      screen: { width: 1179, height: 2556, cornerRadius: 150 },
      aliases: ["apple iphone 16"],
      seo: { monthlyQueries: ["iphone 16 mockup"] },
      wallpaper: ["#0ea5e9", "#7c3aed", "#f9a8d4"],
    },
    gen: (variant, colors) =>
      phone({
        id: "iphone-16", variant,
        screenW: 1179, screenH: 2556, screenR: 150, bezel: 40, bodyR: 190,
        rail: colors.rail, bodyFill: colors.body,
        camera: { kind: "island", w: 340, h: 104, top: 32 },
        buttons: [
          { side: "left", y: 480, len: 94 },
          { side: "left", y: 650, len: 170 },
          { side: "left", y: 860, len: 170 },
          { side: "right", y: 620, len: 280 },
        ],
      }),
    variants: [
      { id: "ultramarine", label: "Ultramarine", colors: { rail: [[0, "#7d9bff"], [0.5, "#3f5fd7"], [1, "#6f8dfa"]], body: "#0d1024" } },
      { id: "teal", label: "Teal", colors: { rail: [[0, "#9fdcd6"], [0.5, "#5aa8a0"], [1, "#8fd0c9"]], body: "#0c1615" } },
      { id: "pink", label: "Pink", colors: { rail: [[0, "#ffd1e0"], [0.5, "#e39cb4"], [1, "#f8c3d5"]], body: "#1a0e13" } },
    ],
  },

  /* ---- iPhone 17 family (2025) ---- */
  {
    meta: {
      id: "iphone-17-pro-max", name: "iPhone 17 Pro Max", brand: "apple", category: "phone",
      released: "2025-09", screen: { width: 1320, height: 2868, cornerRadius: 168 },
      aliases: ["apple iphone 17 pro max"], seo: { monthlyQueries: ["iphone 17 pro max mockup"] },
      wallpaper: ["#4c1d95", "#1e3a8a", "#c084fc"],
    },
    gen: (variant, colors) => phone({ id: "iphone-17-pro-max", variant, screenW: 1320, screenH: 2868, screenR: 168, bezel: 36, bodyR: 205, rail: colors.rail, bodyFill: colors.body, camera: { kind: "island", w: 372, h: 110, top: 34 }, buttons: iBtns(2868) }),
    variants: [
      { id: "black-titanium", label: "Black Titanium", colors: BLACK_TI },
      { id: "natural-titanium", label: "Natural Titanium", colors: NATURAL_TI },
      { id: "desert-titanium", label: "Desert Titanium", colors: DESERT_TI },
    ],
  },
  {
    meta: {
      id: "iphone-17-pro", name: "iPhone 17 Pro", brand: "apple", category: "phone",
      released: "2025-09", screen: { width: 1206, height: 2622, cornerRadius: 165 },
      aliases: ["apple iphone 17 pro"], seo: { monthlyQueries: ["iphone 17 pro mockup"] },
      wallpaper: ["#5b21b6", "#2563eb", "#c084fc"],
    },
    gen: (variant, colors) => phone({ id: "iphone-17-pro", variant, screenW: 1206, screenH: 2622, screenR: 165, bezel: 36, bodyR: 200, rail: colors.rail, bodyFill: colors.body, camera: { kind: "island", w: 372, h: 110, top: 33 }, buttons: iBtns(2622) }),
    variants: [
      { id: "black-titanium", label: "Black Titanium", colors: BLACK_TI },
      { id: "natural-titanium", label: "Natural Titanium", colors: NATURAL_TI },
      { id: "desert-titanium", label: "Desert Titanium", colors: DESERT_TI },
    ],
  },
  {
    meta: {
      id: "iphone-17-air", name: "iPhone 17 Air", brand: "apple", category: "phone",
      released: "2025-09", screen: { width: 1260, height: 2736, cornerRadius: 160 },
      aliases: ["apple iphone 17 air"], seo: { monthlyQueries: ["iphone 17 air mockup"] },
      wallpaper: ["#0ea5e9", "#6366f1", "#a5f3fc"],
    },
    gen: (variant, colors) => phone({ id: "iphone-17-air", variant, screenW: 1260, screenH: 2736, screenR: 160, bezel: 34, bodyR: 196, rail: colors.rail, bodyFill: colors.body, camera: { kind: "island", w: 356, h: 106, top: 32 }, buttons: iBtns(2736) }),
    variants: [
      { id: "sky-blue", label: "Sky Blue", colors: BLUE_TI },
      { id: "space-black", label: "Space Black", colors: BLACK_TI },
      { id: "cloud-white", label: "Cloud White", colors: WHITE_TI },
    ],
  },
  {
    meta: {
      id: "iphone-17", name: "iPhone 17", brand: "apple", category: "phone",
      released: "2025-09", screen: { width: 1206, height: 2622, cornerRadius: 158 },
      aliases: ["apple iphone 17"], seo: { monthlyQueries: ["iphone 17 mockup"] },
      wallpaper: ["#16a34a", "#0891b2", "#86efac"],
    },
    gen: (variant, colors) => phone({ id: "iphone-17", variant, screenW: 1206, screenH: 2622, screenR: 158, bezel: 40, bodyR: 192, rail: colors.rail, bodyFill: colors.body, camera: { kind: "island", w: 344, h: 104, top: 32 }, buttons: iBtns(2622) }),
    variants: [
      { id: "sage", label: "Sage", colors: AL_TEAL },
      { id: "lavender", label: "Lavender", colors: { rail: [[0, "#d8d2ea"], [0.5, "#a89fc9"], [1, "#cbc4e0"]], body: "#100e16" } },
      { id: "black", label: "Black", colors: AL_BLACK },
    ],
  },

  /* ---- iPhone 16 Plus / Pro Max ---- */
  {
    meta: {
      id: "iphone-16-pro-max", name: "iPhone 16 Pro Max", brand: "apple", category: "phone",
      released: "2024-09", screen: { width: 1320, height: 2868, cornerRadius: 168 },
      aliases: ["apple iphone 16 pro max"], seo: { monthlyQueries: ["iphone 16 pro max mockup"] },
      wallpaper: ["#5b21b6", "#1d4ed8", "#c084fc"],
    },
    gen: (variant, colors) => phone({ id: "iphone-16-pro-max", variant, screenW: 1320, screenH: 2868, screenR: 168, bezel: 36, bodyR: 205, rail: colors.rail, bodyFill: colors.body, camera: { kind: "island", w: 372, h: 110, top: 34 }, buttons: iBtns(2868) }),
    variants: [
      { id: "black-titanium", label: "Black Titanium", colors: BLACK_TI },
      { id: "natural-titanium", label: "Natural Titanium", colors: NATURAL_TI },
      { id: "desert-titanium", label: "Desert Titanium", colors: DESERT_TI },
    ],
  },
  {
    meta: {
      id: "iphone-16-plus", name: "iPhone 16 Plus", brand: "apple", category: "phone",
      released: "2024-09", screen: { width: 1290, height: 2796, cornerRadius: 154 },
      aliases: ["apple iphone 16 plus"], seo: { monthlyQueries: ["iphone 16 plus mockup"] },
      wallpaper: ["#0ea5e9", "#7c3aed", "#f9a8d4"],
    },
    gen: (variant, colors) => phone({ id: "iphone-16-plus", variant, screenW: 1290, screenH: 2796, screenR: 154, bezel: 40, bodyR: 194, rail: colors.rail, bodyFill: colors.body, camera: { kind: "island", w: 348, h: 104, top: 32 }, buttons: iBtns(2796) }),
    variants: [
      { id: "ultramarine", label: "Ultramarine", colors: { rail: [[0, "#7d9bff"], [0.5, "#3f5fd7"], [1, "#6f8dfa"]], body: "#0d1024" } },
      { id: "teal", label: "Teal", colors: AL_TEAL },
      { id: "pink", label: "Pink", colors: AL_PINK },
    ],
  },

  /* ---- iPhone 15 family ---- */
  {
    meta: {
      id: "iphone-15-pro-max", name: "iPhone 15 Pro Max", brand: "apple", category: "phone",
      released: "2023-09", screen: { width: 1290, height: 2796, cornerRadius: 160 },
      aliases: ["apple iphone 15 pro max"], seo: { monthlyQueries: ["iphone 15 pro max mockup"] },
      wallpaper: ["#4c1d95", "#1e3a8a", "#c4b5fd"],
    },
    gen: (variant, colors) => phone({ id: "iphone-15-pro-max", variant, screenW: 1290, screenH: 2796, screenR: 160, bezel: 38, bodyR: 198, rail: colors.rail, bodyFill: colors.body, camera: { kind: "island", w: 360, h: 108, top: 33 }, buttons: iBtns(2796) }),
    variants: [
      { id: "natural-titanium", label: "Natural Titanium", colors: NATURAL_TI },
      { id: "blue-titanium", label: "Blue Titanium", colors: BLUE_TI },
      { id: "black-titanium", label: "Black Titanium", colors: BLACK_TI },
    ],
  },
  {
    meta: {
      id: "iphone-15-pro", name: "iPhone 15 Pro", brand: "apple", category: "phone",
      released: "2023-09", screen: { width: 1179, height: 2556, cornerRadius: 150 },
      aliases: ["apple iphone 15 pro"], seo: { monthlyQueries: ["iphone 15 pro mockup"] },
      wallpaper: ["#5b21b6", "#2563eb", "#a5b4fc"],
    },
    gen: (variant, colors) => phone({ id: "iphone-15-pro", variant, screenW: 1179, screenH: 2556, screenR: 150, bezel: 38, bodyR: 190, rail: colors.rail, bodyFill: colors.body, camera: { kind: "island", w: 340, h: 104, top: 32 }, buttons: iBtns(2556) }),
    variants: [
      { id: "natural-titanium", label: "Natural Titanium", colors: NATURAL_TI },
      { id: "blue-titanium", label: "Blue Titanium", colors: BLUE_TI },
      { id: "white-titanium", label: "White Titanium", colors: WHITE_TI },
    ],
  },
  {
    meta: {
      id: "iphone-15-plus", name: "iPhone 15 Plus", brand: "apple", category: "phone",
      released: "2023-09", screen: { width: 1290, height: 2796, cornerRadius: 154 },
      aliases: ["apple iphone 15 plus"], seo: { monthlyQueries: ["iphone 15 plus mockup"] },
      wallpaper: ["#16a34a", "#0891b2", "#fde68a"],
    },
    gen: (variant, colors) => phone({ id: "iphone-15-plus", variant, screenW: 1290, screenH: 2796, screenR: 154, bezel: 42, bodyR: 194, rail: colors.rail, bodyFill: colors.body, camera: { kind: "island", w: 344, h: 104, top: 32 }, buttons: iBtns(2796) }),
    variants: [
      { id: "pink", label: "Pink", colors: AL_PINK },
      { id: "blue", label: "Blue", colors: AL_BLUE },
      { id: "yellow", label: "Yellow", colors: { rail: [[0, "#f7e6a2"], [0.5, "#d8bf62"], [1, "#efdd8f"]], body: "#191505" } },
    ],
  },
  {
    meta: {
      id: "iphone-15", name: "iPhone 15", brand: "apple", category: "phone",
      released: "2023-09", screen: { width: 1179, height: 2556, cornerRadius: 150 },
      aliases: ["apple iphone 15"], seo: { monthlyQueries: ["iphone 15 mockup"] },
      wallpaper: ["#ec4899", "#8b5cf6", "#fbcfe8"],
    },
    gen: (variant, colors) => phone({ id: "iphone-15", variant, screenW: 1179, screenH: 2556, screenR: 150, bezel: 42, bodyR: 190, rail: colors.rail, bodyFill: colors.body, camera: { kind: "island", w: 340, h: 104, top: 32 }, buttons: iBtns(2556) }),
    variants: [
      { id: "pink", label: "Pink", colors: AL_PINK },
      { id: "blue", label: "Blue", colors: AL_BLUE },
      { id: "black", label: "Black", colors: AL_BLACK },
    ],
  },

  /* ---- Nothing Phone ---- */
  {
    meta: {
      id: "nothing-phone-2", name: "Nothing Phone (2)", brand: "nothing", category: "phone",
      released: "2023-07", screen: { width: 1080, height: 2412, cornerRadius: 120 },
      aliases: ["nothing phone", "nothing phone 2"], seo: { monthlyQueries: ["nothing phone mockup"] },
      wallpaper: ["#3f3f46", "#111113", "#e4e4e7"],
    },
    gen: (variant, colors) => phone({ id: "nothing-phone-2", variant, screenW: 1080, screenH: 2412, screenR: 120, bezel: 30, bodyR: 168, rail: colors.rail, bodyFill: colors.body, camera: { kind: "punch", r: 34, top: 78 }, buttons: [{ side: "left", y: 720, len: 200 }, { side: "right", y: 640, len: 150 }] }),
    variants: [
      { id: "white", label: "White", colors: { rail: [[0, "#ececed"], [0.5, "#c6c6c9"], [1, "#e0e0e2"]], body: "#eff0f1" } },
      { id: "dark-grey", label: "Dark Grey", colors: { rail: [[0, "#4c4c52"], [0.5, "#232327"], [1, "#3d3d43"]], body: "#0c0c0e" } },
    ],
  },
  {
    meta: {
      id: "pixel-9-pro", name: "Pixel 9 Pro", brand: "google", category: "phone",
      released: "2024-08",
      screen: { width: 1280, height: 2856, cornerRadius: 96 },
      aliases: ["google pixel 9 pro"],
      seo: { monthlyQueries: ["pixel 9 pro mockup", "pixel 9 pro png frame"] },
      wallpaper: ["#0f766e", "#134e4a", "#5eead4"],
    },
    gen: (variant, colors) =>
      phone({
        id: "pixel-9-pro", variant,
        screenW: 1280, screenH: 2856, screenR: 96, bezel: 48, bodyR: 150,
        rail: colors.rail, bodyFill: colors.body,
        camera: { kind: "punch", r: 42, top: 100 },
        buttons: [
          { side: "right", y: 560, len: 210 },
          { side: "right", y: 820, len: 330 },
        ],
      }),
    variants: [
      { id: "obsidian", label: "Obsidian", colors: { rail: [[0, "#4d5156"], [0.5, "#26282b"], [1, "#3f4347"]], body: "#0b0b0d" } },
      { id: "porcelain", label: "Porcelain", colors: { rail: [[0, "#efece6"], [0.5, "#c9c5bd"], [1, "#e4e0d8"]], body: "#101013" } },
    ],
  },
  {
    meta: {
      id: "pixel-8a", name: "Pixel 8a", brand: "google", category: "phone",
      released: "2024-05",
      screen: { width: 1080, height: 2400, cornerRadius: 110 },
      aliases: ["google pixel 8a"],
      seo: { monthlyQueries: ["pixel 8a mockup"] },
      wallpaper: ["#16a34a", "#065f46", "#a7f3d0"],
    },
    gen: (variant, colors) =>
      phone({
        id: "pixel-8a", variant,
        screenW: 1080, screenH: 2400, screenR: 110, bezel: 56, bodyR: 170,
        rail: colors.rail, bodyFill: colors.body,
        camera: { kind: "punch", r: 36, top: 92 },
        buttons: [
          { side: "right", y: 480, len: 180 },
          { side: "right", y: 700, len: 290 },
        ],
      }),
    variants: [
      { id: "obsidian", label: "Obsidian", colors: { rail: [[0, "#4a4d52"], [0.5, "#232528"], [1, "#3c3f44"]], body: "#0b0b0d" } },
      { id: "aloe", label: "Aloe", colors: { rail: [[0, "#c8ecd4"], [0.5, "#93c1a2"], [1, "#badfc7"]], body: "#0f1512" } },
      { id: "bay", label: "Bay", colors: { rail: [[0, "#bcd5fb"], [0.5, "#87a8d8"], [1, "#adc9f2"]], body: "#0d1119" } },
    ],
  },
  {
    meta: {
      id: "oneplus-13", name: "OnePlus 13", brand: "oneplus", category: "phone",
      released: "2025-01",
      screen: { width: 1440, height: 3168, cornerRadius: 120 },
      aliases: ["oneplus 13"],
      seo: { monthlyQueries: ["oneplus 13 mockup"] },
      wallpaper: ["#b91c1c", "#7f1d1d", "#fb923c"],
    },
    gen: (variant, colors) =>
      phone({
        id: "oneplus-13", variant,
        screenW: 1440, screenH: 3168, screenR: 120, bezel: 34, bodyR: 150,
        rail: colors.rail, bodyFill: colors.body,
        camera: { kind: "punch", r: 38, top: 100 },
        buttons: [
          { side: "left", y: 620, len: 150 },
          { side: "right", y: 640, len: 210 },
          { side: "right", y: 900, len: 300 },
        ],
      }),
    variants: [
      { id: "black-eclipse", label: "Black Eclipse", colors: { rail: [[0, "#43454a"], [0.5, "#1f2023"], [1, "#37393d"]], body: "#08080a" } },
      { id: "arctic-dawn", label: "Arctic Dawn", colors: { rail: [[0, "#f2f4f7"], [0.5, "#c4c9d2"], [1, "#e6e9ee"]], body: "#101216" } },
    ],
  },
  {
    meta: {
      id: "galaxy-s24-ultra", name: "Galaxy S24 Ultra", brand: "samsung", category: "phone",
      released: "2024-01",
      // Same 1440×3120 QHD+ panel as the S25 Ultra, but the S24 Ultra's flat
      // display has visibly squarer corners — hence the smaller radii.
      screen: { width: 1440, height: 3120, cornerRadius: 34 },
      aliases: ["samsung galaxy s24 ultra", "s24 ultra"],
      seo: { monthlyQueries: ["galaxy s24 ultra mockup", "s24 ultra mockup", "samsung s24 mockup"] },
      wallpaper: ["#6d28d9", "#1e1b4b", "#c4b5fd"],
    },
    gen: (variant, colors) =>
      phone({
        id: "galaxy-s24-ultra", variant,
        screenW: 1440, screenH: 3120, screenR: 34, bezel: 30, bodyR: 70,
        rail: colors.rail, bodyFill: colors.body,
        camera: { kind: "punch", r: 38, top: 96 },
        buttons: [
          { side: "right", y: 700, len: 200 },
          { side: "right", y: 950, len: 320 },
        ],
      }),
    variants: [
      { id: "titanium-black", label: "Titanium Black", colors: { rail: [[0, "#3d3d42"], [0.5, "#1c1c20"], [1, "#313136"]], body: "#08080a" } },
      { id: "titanium-gray", label: "Titanium Gray", colors: { rail: [[0, "#aeb0b5"], [0.5, "#82848a"], [1, "#a0a2a8"]], body: "#0e0e11" } },
      { id: "titanium-violet", label: "Titanium Violet", colors: { rail: [[0, "#b6aec7"], [0.5, "#8a819e"], [1, "#a89fba"]], body: "#0f0d14" } },
    ],
  },
  {
    meta: {
      id: "galaxy-s25-ultra", name: "Galaxy S25 Ultra", brand: "samsung", category: "phone",
      released: "2025-01",
      screen: { width: 1440, height: 3120, cornerRadius: 56 },
      aliases: ["samsung galaxy s25 ultra", "s25 ultra"],
      seo: { monthlyQueries: ["galaxy s25 ultra mockup", "samsung s25 mockup"] },
      wallpaper: ["#312e81", "#0f172a", "#a5b4fc"],
    },
    gen: (variant, colors) =>
      phone({
        id: "galaxy-s25-ultra", variant,
        screenW: 1440, screenH: 3120, screenR: 56, bezel: 30, bodyR: 92,
        rail: colors.rail, bodyFill: colors.body,
        camera: { kind: "punch", r: 38, top: 96 },
        buttons: [
          { side: "right", y: 700, len: 200 },
          { side: "right", y: 950, len: 320 },
        ],
      }),
    variants: [
      { id: "titanium-black", label: "Titanium Black", colors: { rail: [[0, "#3f3f44"], [0.5, "#1d1d21"], [1, "#333338"]], body: "#08080a" } },
      { id: "titanium-gray", label: "Titanium Gray", colors: { rail: [[0, "#a9abb0"], [0.5, "#7c7e84"], [1, "#9b9da3"]], body: "#0e0e11" } },
    ],
  },
  {
    meta: {
      id: "ipad-pro-11", name: "iPad Pro 11″ (M4)", brand: "apple", category: "tablet",
      released: "2024-05",
      screen: { width: 1668, height: 2420, cornerRadius: 40 },
      aliases: ["apple ipad pro 11", "ipad pro 11 m4"],
      seo: { monthlyQueries: ["ipad pro mockup", "ipad mockup png", "ipad pro m4 mockup"] },
      wallpaper: ["#7c3aed", "#1d4ed8", "#f0abfc"],
    },
    gen: (variant, colors) =>
      phone({
        id: "ipad-pro-11", variant,
        screenW: 1668, screenH: 2420, screenR: 40, bezel: 80, bodyR: 106,
        rail: colors.rail, bodyFill: colors.body,
        camera: { kind: "bezel-dot" },
        buttons: [
          { side: "right", y: 200, len: 160 },
        ],
      }),
    variants: [
      { id: "space-black", label: "Space Black", colors: { rail: [[0, "#4a4a4e"], [0.5, "#242427"], [1, "#3d3d41"]], body: "#0a0a0c" } },
      { id: "silver", label: "Silver", colors: { rail: [[0, "#e9ebef"], [0.5, "#bcbfc6"], [1, "#dcdee3"]], body: "#101014" } },
    ],
  },
  {
    meta: {
      id: "ipad-pro-13", name: "iPad Pro 13″ (M4)", brand: "apple", category: "tablet",
      released: "2024-05",
      screen: { width: 2064, height: 2752, cornerRadius: 44 },
      aliases: ["apple ipad pro 13", "ipad pro 13 m4"],
      seo: { monthlyQueries: ["ipad pro 13 mockup", "ipad pro m4 mockup"] },
      wallpaper: ["#0ea5e9", "#1e3a8a", "#a5f3fc"],
    },
    gen: (variant, colors) =>
      phone({
        id: "ipad-pro-13", variant,
        screenW: 2064, screenH: 2752, screenR: 44, bezel: 86, bodyR: 118,
        rail: colors.rail, bodyFill: colors.body,
        camera: { kind: "bezel-dot" },
        buttons: [
          { side: "right", y: 220, len: 180 },
        ],
      }),
    variants: [
      { id: "space-black", label: "Space Black", colors: { rail: [[0, "#4a4a4e"], [0.5, "#242427"], [1, "#3d3d41"]], body: "#0a0a0c" } },
      { id: "silver", label: "Silver", colors: { rail: [[0, "#e9ebef"], [0.5, "#bcbfc6"], [1, "#dcdee3"]], body: "#101014" } },
    ],
  },
  {
    meta: {
      id: "ipad-mini", name: "iPad Mini", brand: "apple", category: "tablet",
      released: "2024-10",
      screen: { width: 1488, height: 2266, cornerRadius: 42 },
      aliases: ["apple ipad mini 7"],
      seo: { monthlyQueries: ["ipad mini mockup"] },
      wallpaper: ["#ea580c", "#9a3412", "#fdba74"],
    },
    gen: (variant, colors) =>
      phone({
        id: "ipad-mini", variant,
        screenW: 1488, screenH: 2266, screenR: 42, bezel: 76, bodyR: 100,
        rail: colors.rail, bodyFill: colors.body,
        camera: { kind: "bezel-dot" },
        buttons: [
          { side: "right", y: 180, len: 140 },
        ],
      }),
    variants: [
      { id: "starlight", label: "Starlight", colors: { rail: [[0, "#f1ece3"], [0.5, "#c7c0b2"], [1, "#e6e0d4"]], body: "#12100c" } },
      { id: "purple", label: "Purple", colors: { rail: [[0, "#d8d2ea"], [0.5, "#a89fc9"], [1, "#cbc4e0"]], body: "#100e16" } },
    ],
  },
  {
    meta: {
      id: "ipad-air", name: "iPad Air (M2)", brand: "apple", category: "tablet",
      released: "2024-05", screen: { width: 1640, height: 2360, cornerRadius: 38 },
      aliases: ["apple ipad air", "ipad air m2"], seo: { monthlyQueries: ["ipad air mockup"] },
      wallpaper: ["#2563eb", "#1e3a8a", "#93c5fd"],
    },
    gen: (variant, colors) => phone({ id: "ipad-air", variant, screenW: 1640, screenH: 2360, screenR: 38, bezel: 78, bodyR: 104, rail: colors.rail, bodyFill: colors.body, camera: { kind: "bezel-dot" }, buttons: [{ side: "right", y: 190, len: 150 }] }),
    variants: [
      { id: "blue", label: "Blue", colors: AL_BLUE },
      { id: "starlight", label: "Starlight", colors: { rail: [[0, "#f1ece3"], [0.5, "#c7c0b2"], [1, "#e6e0d4"]], body: "#12100c" } },
      { id: "purple", label: "Purple", colors: { rail: [[0, "#d8d2ea"], [0.5, "#a89fc9"], [1, "#cbc4e0"]], body: "#100e16" } },
    ],
  },
  {
    meta: {
      id: "macbook-pro-14", name: "MacBook Pro 14″", brand: "apple", category: "laptop",
      released: "2024-10",
      screen: { width: 3024, height: 1964, cornerRadius: 26 },
      aliases: ["macbook pro 14 m4", "macbook mockup"],
      seo: { monthlyQueries: ["macbook pro mockup", "macbook mockup png"] },
      wallpaper: ["#f97316", "#db2777", "#a78bfa"],
    },
    gen: (variant, colors) =>
      laptop({
        id: "macbook-pro-14", variant,
        screenW: 3024, screenH: 1964, bezel: 80, bezelBottom: 110,
        alum: colors.alum, deckFill: colors.deck, lidFill: "#050506",
        notch: { w: 340, h: 74 },
      }),
    variants: [
      { id: "space-black", label: "Space Black", colors: { alum: [[0, "#4a4a4e"], [1, "#232326"]], deck: [[0, "#39393d"], [1, "#1a1a1d"]] } },
      { id: "silver", label: "Silver", colors: { alum: [[0, "#e6e8ec"], [1, "#b9bcc2"]], deck: [[0, "#d7d9de"], [1, "#a9acb3"]] } },
    ],
  },
  {
    meta: {
      id: "macbook-air-13", name: "MacBook Air 13″", brand: "apple", category: "laptop",
      released: "2024-03",
      screen: { width: 2560, height: 1664, cornerRadius: 22 },
      aliases: ["macbook air m3", "macbook air mockup"],
      seo: { monthlyQueries: ["macbook air mockup"] },
      wallpaper: ["#0891b2", "#1e40af", "#67e8f9"],
    },
    gen: (variant, colors) =>
      laptop({
        id: "macbook-air-13", variant,
        screenW: 2560, screenH: 1664, bezel: 66, bezelBottom: 90,
        alum: colors.alum, deckFill: colors.deck, lidFill: "#050506",
        notch: { w: 290, h: 62 },
      }),
    variants: [
      { id: "midnight", label: "Midnight", colors: { alum: [[0, "#3a4250"], [1, "#1c212b"]], deck: [[0, "#2c3340"], [1, "#161a22"]] } },
      { id: "starlight", label: "Starlight", colors: { alum: [[0, "#f2ede2"], [1, "#c8c1b0"]], deck: [[0, "#e5dfd1"], [1, "#b8b1a0"]] } },
      { id: "silver", label: "Silver", colors: { alum: [[0, "#e8eaee"], [1, "#b9bcc3"]], deck: [[0, "#d9dbe0"], [1, "#abaeb5"]] } },
    ],
  },
  {
    meta: {
      id: "macbook-pro-16", name: "MacBook Pro 16″", brand: "apple", category: "laptop",
      released: "2024-10", screen: { width: 3456, height: 2234, cornerRadius: 28 },
      aliases: ["macbook pro 16 m4", "macbook pro 16 mockup"], seo: { monthlyQueries: ["macbook pro 16 mockup"] },
      wallpaper: ["#7c3aed", "#1e40af", "#c4b5fd"],
    },
    gen: (variant, colors) => laptop({ id: "macbook-pro-16", variant, screenW: 3456, screenH: 2234, bezel: 86, bezelBottom: 118, alum: colors.alum, deckFill: colors.deck, lidFill: "#050506", notch: { w: 360, h: 78 } }),
    variants: [
      { id: "space-black", label: "Space Black", colors: { alum: [[0, "#4a4a4e"], [1, "#232326"]], deck: [[0, "#39393d"], [1, "#1a1a1d"]] } },
      { id: "silver", label: "Silver", colors: { alum: [[0, "#e6e8ec"], [1, "#b9bcc2"]], deck: [[0, "#d7d9de"], [1, "#a9acb3"]] } },
    ],
  },
  {
    meta: {
      id: "chrome-browser", name: "Chrome", brand: "google", category: "browser",
      released: "2026-01",
      screen: { width: 2560, height: 1600, cornerRadius: 0 },
      aliases: ["chrome browser mockup", "browser frame"],
      seo: { monthlyQueries: ["chrome mockup", "browser mockup generator"] },
      urlBarText: "mockframe.app",
    },
    gen: (variant, colors) =>
      browser({ id: "chrome-browser", variant, viewW: 2560, viewH: 1600, kind: "chrome", chrome: colors }),
    variants: [
      { id: "light", label: "Light", colors: { tabstrip: "#dee1e6", toolbar: "#ffffff", urlbar: "#f1f3f4", text: "#3c4043", textDim: "#9aa0a6", divider: "#e8eaed", windowEdge: "#c8ccd2", accentDot: "#8ab4f8" } },
      { id: "dark", label: "Dark", colors: { tabstrip: "#202124", toolbar: "#35363a", urlbar: "#282a2d", text: "#e8eaed", textDim: "#80868b", divider: "#1b1c1e", windowEdge: "#121316", accentDot: "#8ab4f8" } },
    ],
  },
  {
    meta: {
      id: "safari-browser", name: "Safari", brand: "apple", category: "browser",
      released: "2026-01",
      screen: { width: 2560, height: 1600, cornerRadius: 0 },
      aliases: ["safari browser mockup", "safari frame"],
      seo: { monthlyQueries: ["safari mockup", "safari browser png"] },
      urlBarText: "mockframe.app",
    },
    gen: (variant, colors) =>
      browser({ id: "safari-browser", variant, viewW: 2560, viewH: 1600, kind: "safari", chrome: colors }),
    variants: [
      { id: "light", label: "Light", colors: { toolbar: "#f5f4f6", urlbar: "#e9e8ec", text: "#3a3a3c", textDim: "#98989d", divider: "#e2e1e5", windowEdge: "#cfced3", accentDot: "#0a84ff" } },
      { id: "dark", label: "Dark", colors: { toolbar: "#2d2c31", urlbar: "#3a393f", text: "#d7d7dc", textDim: "#8e8e93", divider: "#232227", windowEdge: "#141317", accentDot: "#0a84ff" } },
    ],
  },
  {
    meta: {
      id: "arc-browser", name: "Arc", brand: "browser-company", category: "browser",
      released: "2026-01",
      screen: { width: 2560, height: 1600, cornerRadius: 0 },
      aliases: ["arc browser mockup", "arc frame"],
      seo: { monthlyQueries: ["arc mockup", "arc browser mockup"] },
      urlBarText: "mockframe.app",
    },
    gen: (variant, colors) =>
      browser({ id: "arc-browser", variant, viewW: 2560, viewH: 1600, kind: "arc", chrome: colors }),
    variants: [
      { id: "light", label: "Light", colors: { tabstrip: "#f3f4f6", toolbar: "#ffffff", urlbar: "#ffffff", text: "#1f2937", textDim: "#9ca3af", divider: "#dee1e6", windowEdge: "#e5e7eb", accentDot: "#3b82f6" } },
      { id: "dark", label: "Dark", colors: { tabstrip: "#18181b", toolbar: "#09090b", urlbar: "#202124", text: "#f3f4f6", textDim: "#71717a", divider: "#2c2d30", windowEdge: "#27272a", accentDot: "#3b82f6" } },
    ],
  },
];

/* ---------------------------------- write ---------------------------------- */

for (const dev of DEVICES) {
  const dir = path.join(ROOT, dev.meta.id);
  fs.mkdirSync(dir, { recursive: true });
  let frameBox = null;

  const variants = [];
  for (const v of dev.variants) {
    const g = dev.gen(v.id, v.colors);
    frameBox = g;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${g.W} ${g.H}">
<!--BODY-->${g.body}<!--/BODY-->
<!--SCREEN-->${screenFill(dev.meta, v.id, g)}<!--/SCREEN-->
<!--OVERLAY-->${g.overlay}<!--/OVERLAY-->
</svg>`;
    fs.writeFileSync(path.join(dir, `frame-${v.id}.svg`), svg);
    variants.push({ id: v.id, label: v.label, svg: `frame-${v.id}.svg` });
  }

  const json = {
    ...dev.meta,
    frame: {
      width: frameBox.W,
      height: frameBox.H,
      screenRect: frameBox.screenRect,
      maskPath: frameBox.maskPath,
      overlaySelector: "#overlay",
    },
    variants,
  };
  fs.writeFileSync(path.join(dir, "device.json"), JSON.stringify(json, null, 2));
  console.log(`generated ${dev.meta.id} (${variants.length} variants)`);
}
