"use client";

import { getDevice, getVariant } from "@framekit/devices";
import { esc, systemFont, textWidth, truncate, wrapText } from "./common";
import { appStorePromoCardSize, browserWindow, domainOf, laurel, luminance, rgb } from "./appstore-promo";
import type { AppStorePromoDoc } from "./types";

/**
 * Store Promo — "stage" layout: a full-bleed launch poster.
 *
 * A lit accent stage (studio light, soft glow behind the product, film grain)
 * carries the app icon + name, a heavy display headline, a supporting line, a
 * frosted chip with the rating and award laurels, and the GET pill. The
 * product — phone, browser or both — rises out of the stage.
 *
 * The arrangement follows the format: landscape formats (App Store event card,
 * Play feature graphic, Product Hunt, X) put copy left and the product right;
 * portrait and square formats (Story, Instagram) stack centred copy above a
 * phone rising from the bottom edge. Sizes derive from the card, and the copy
 * steps down (dropping the supporting line first) before it would crowd.
 */

const STAR = (cx: number, cy: number, R: number) => {
  const out: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? R : R * 0.45;
    out.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`);
  }
  return out.join(" ");
};

/** mix [r,g,b] toward white (t > 0) or black (t < 0) → #rrggbb */
function mix([r, g, b]: [number, number, number], t: number): string {
  const target = t > 0 ? 255 : 0;
  const a = Math.abs(t);
  const ch = (v: number) => Math.round(v + (target - v) * a).toString(16).padStart(2, "0");
  return `#${ch(r)}${ch(g)}${ch(b)}`;
}

const f1 = (v: number) => v.toFixed(1);

/** heavy display weights run ~8% wider than the regular-weight estimate */
const HEAVY = 1.08;

/** Largest size (≤ start) at which `text` wraps into ≤ maxLines without any line overflowing. */
function fitLines(text: string, start: number, min: number, maxW: number, maxLines: number, widthK = HEAVY): { size: number; lines: string[] } {
  let size = start;
  for (;;) {
    const lines = wrapText(text, size * widthK, maxW);
    const fits = lines.length <= maxLines && lines.every((l) => textWidth(l, size) * widthK <= maxW);
    if (fits || size <= min) {
      if (lines.length > maxLines) lines.splice(maxLines - 1, lines.length, truncate(lines.slice(maxLines - 1).join(" "), size * widthK, maxW));
      return { size, lines };
    }
    size = Math.max(min, Math.round(size * 0.92));
  }
}

export function renderPromoStage(doc: AppStorePromoDoc, avatarUrl?: string, screenshotUrl?: string, webShotUrl?: string): string {
  const { width: W, height: H } = appStorePromoCardSize(doc);
  const ratio = W / H;
  const wide = ratio >= 1.25;
  const banner = ratio >= 1.8; // Play feature graphic & other very wide strips
  const dark = doc.chrome?.dark ?? !!doc.dark;
  const font = systemFont("ios");
  const accent = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(doc.accentColor || "") ? doc.accentColor : "#6366f1";
  const A = rgb(accent);
  const pastel = !dark && luminance(A) > 0.7;
  const ink = pastel ? "#111114" : "#ffffff";
  const subOp = pastel ? 0.66 : 0.72;
  const showcase = doc.showcase ?? "app";

  const appName = (doc.title || "").trim() || "Your App";
  const headline = (doc.subtitle || "").trim() || appName;
  const tagline = (doc.tagline || "").trim();
  const category = (doc.category || "").trim();
  const badge = (doc.badgeText || "").trim();
  const rating = Math.max(0, Math.min(5, Number(doc.ratingValue) || 0));
  const ratingsText = (doc.reviewsCountText || "").trim();
  const btn = (doc.buttonText ?? "GET").trim();

  // unit: 1 = a 1920×1080 (wide) or 1080-wide (tall) design pixel
  const u = wide ? Math.min(H / 1080, W / 1500) : Math.min(W / 1080, H / 1100);

  /* ------------------------------- the stage ------------------------------- */
  const top = dark ? mix(A, -0.8) : mix(A, 0.14);
  const bottom = dark ? "#07070b" : mix(A, -0.42);
  const parts: string[] = [];
  const defs: string[] = [
    `<linearGradient id="ps-bg" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>`,
    `<radialGradient id="ps-key" cx="0.32" cy="-0.05" r="0.9"><stop offset="0" stop-color="#fff" stop-opacity="${dark ? 0.08 : 0.22}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`,
    `<filter id="ps-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.07 0"/></filter>`,
    `<filter id="ps-lift" x="-30%" y="-20%" width="160%" height="150%"><feDropShadow dx="0" dy="${f1(34 * u)}" stdDeviation="${f1(40 * u)}" flood-color="#000" flood-opacity="${dark ? 0.6 : 0.36}"/></filter>`,
    `<filter id="asp-window-shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="${f1(28 * u)}" stdDeviation="${f1(36 * u)}" flood-color="#000" flood-opacity="0.34"/></filter>`,
    `<filter id="ps-soft" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="${f1(10 * u)}" stdDeviation="${f1(14 * u)}" flood-color="#000" flood-opacity="0.18"/></filter>`,
  ];
  parts.push(`<rect width="${W}" height="${H}" fill="url(#ps-bg)"/>`, `<rect width="${W}" height="${H}" fill="url(#ps-key)"/>`);
  const stageEnd = parts.length; // product glow is inserted here once it's placed

  /* ------------------------------ copy blocks ------------------------------ */
  const iconS = Math.round(104 * u);
  const iconR = iconS * 0.2237;
  const nameSize = Math.round(36 * u);
  const catSize = Math.round(25 * u);

  function appIcon(x: number, y: number): string {
    const initial = esc(([...appName][0] || "A").toUpperCase());
    const ring = `<rect x="${f1(x + 0.75)}" y="${f1(y + 0.75)}" width="${f1(iconS - 1.5)}" height="${f1(iconS - 1.5)}" rx="${f1(iconR)}" fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="1.5"/>`;
    if (avatarUrl) {
      return `<g filter="url(#ps-soft)"><rect x="${x}" y="${y}" width="${iconS}" height="${iconS}" rx="${f1(iconR)}" fill="#fff"/></g><clipPath id="ps-icon"><rect x="${x}" y="${y}" width="${iconS}" height="${iconS}" rx="${f1(iconR)}"/></clipPath><image href="${avatarUrl}" x="${x}" y="${y}" width="${iconS}" height="${iconS}" preserveAspectRatio="xMidYMid slice" clip-path="url(#ps-icon)"/>${ring}`;
    }
    defs.push(
      `<linearGradient id="ps-icon-g" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="${mix(A, 0.32)}"/><stop offset="1" stop-color="${mix(A, -0.18)}"/></linearGradient>`,
      `<linearGradient id="ps-icon-sheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.35"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/></linearGradient>`
    );
    const glyph = luminance(A) > 0.72 ? "#111114" : "#ffffff";
    return (
      `<g filter="url(#ps-soft)"><rect x="${x}" y="${y}" width="${iconS}" height="${iconS}" rx="${f1(iconR)}" fill="url(#ps-icon-g)"/></g>` +
      `<rect x="${x}" y="${y}" width="${iconS}" height="${iconS}" rx="${f1(iconR)}" fill="url(#ps-icon-sheen)"/>` +
      `<text x="${f1(x + iconS / 2)}" y="${f1(y + iconS * 0.68)}" font-family="${font}" font-size="${Math.round(iconS * 0.5)}" font-weight="800" fill="${glyph}" text-anchor="middle">${initial}</text>${ring}`
    );
  }

  /** icon + name/category; returns its width and markup at (x, y) */
  function iconRow(x: number, y: number, maxW: number): { w: number; svg: string } {
    const gap = Math.round(26 * u);
    const textMax = maxW - iconS - gap;
    const name = truncate(appName, nameSize, textMax);
    const cat = category ? truncate(category, catSize, textMax) : "";
    const tw = Math.max(textWidth(name, nameSize) * 1.04, cat ? textWidth(cat, catSize) : 0);
    const cy = y + iconS / 2;
    const nameY = cat ? cy - Math.round(4 * u) : cy + nameSize * 0.36;
    const svg =
      appIcon(x, y) +
      `<text x="${f1(x + iconS + gap)}" y="${f1(nameY)}" font-family="${font}" font-size="${nameSize}" font-weight="700" fill="${ink}" letter-spacing="${f1(-nameSize * 0.015)}">${esc(name)}</text>` +
      (cat ? `<text x="${f1(x + iconS + gap)}" y="${f1(cy + catSize * 1.12)}" font-family="${font}" font-size="${catSize}" font-weight="500" fill="${ink}" fill-opacity="${subOp}">${esc(cat)}</text>` : "");
    return { w: iconS + gap + tw, svg };
  }

  /** frosted chip: rating | award laurels. Returns size + a drawer. */
  function infoChip(): { w: number; h: number; draw: (x: number, y: number) => string } | null {
    const showRating = rating > 0;
    if (!showRating && !badge) return null;
    const h = Math.round(108 * u);
    const pad = Math.round(30 * u);
    const numSize = Math.round(40 * u);
    const starS = Math.round(17 * u);
    const capSize = Math.round(13 * u);
    const track = capSize * 0.14;
    const capsW = (s: string) => textWidth(s.toUpperCase(), capSize) + track * s.length;
    const num = rating.toFixed(1);
    const numW = textWidth(num, numSize) * 1.02;
    const starsW = 5 * starS * 1.18;
    const countText = ratingsText.toUpperCase();
    const ratingW = showRating ? Math.max(numW + Math.round(12 * u) + starsW, countText ? capsW(countText) : 0) : 0;

    const awardSize = Math.round(14 * u);
    const awardTrack = awardSize * 0.12;
    const awardLines = badge ? wrapText(badge.toUpperCase(), awardSize * 1.18, Math.round(190 * u)).slice(0, 2) : [];
    const awardTextW = awardLines.length ? Math.max(...awardLines.map((l) => textWidth(l, awardSize) + awardTrack * l.length)) : 0;
    const lr = Math.round(30 * u);
    const awardW = badge ? awardTextW + lr * 1.5 : 0;
    const divGap = showRating && badge ? Math.round(30 * u) : 0;
    const w = pad * 2 + ratingW + awardW + divGap * 2;

    const draw = (x: number, y: number) => {
      const out: string[] = [
        `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${h}" rx="${f1(30 * u)}" fill="${pastel ? "#ffffff" : "#ffffff"}" fill-opacity="${pastel ? 0.5 : dark ? 0.07 : 0.13}"/>`,
        `<rect x="${f1(x + 0.75)}" y="${f1(y + 0.75)}" width="${f1(w - 1.5)}" height="${f1(h - 1.5)}" rx="${f1(30 * u)}" fill="none" stroke="#fff" stroke-opacity="${pastel ? 0.7 : 0.24}" stroke-width="1.5"/>`,
      ];
      let cx = x + pad;
      if (showRating) {
        const ny = y + h / 2 - (countText ? Math.round(6 * u) : -numSize * 0.36);
        out.push(`<text x="${f1(cx)}" y="${f1(ny)}" font-family="${font}" font-size="${numSize}" font-weight="800" fill="${ink}" letter-spacing="${f1(-numSize * 0.02)}">${esc(num)}</text>`);
        const sx = cx + numW + Math.round(12 * u);
        const sy = ny - numSize * 0.36;
        const stars: string[] = [];
        for (let i = 0; i < 5; i++) {
          const fill = Math.max(0, Math.min(1, rating - i));
          const scx = sx + starS / 2 + i * starS * 1.18;
          stars.push(`<polygon points="${STAR(scx, sy, starS / 2)}" fill="${ink}" fill-opacity="0.28"/>`);
          if (fill > 0) {
            defs.push(`<clipPath id="ps-star-${i}"><rect x="${f1(scx - starS / 2)}" y="${f1(sy - starS)}" width="${f1(starS * fill)}" height="${f1(starS * 2)}"/></clipPath>`);
            stars.push(`<polygon points="${STAR(scx, sy, starS / 2)}" fill="${pastel ? "#111114" : "#ffcc33"}" clip-path="url(#ps-star-${i})"/>`);
          }
        }
        out.push(stars.join(""));
        if (countText) {
          out.push(`<text x="${f1(cx)}" y="${f1(ny + Math.round(32 * u))}" font-family="${font}" font-size="${capSize}" font-weight="700" fill="${ink}" fill-opacity="${subOp}" letter-spacing="${f1(track)}">${esc(truncate(countText, capSize, ratingW + 4))}</text>`);
        }
        cx += ratingW;
      }
      if (showRating && badge) {
        cx += divGap;
        out.push(`<rect x="${f1(cx)}" y="${f1(y + h * 0.22)}" width="1.5" height="${f1(h * 0.56)}" fill="${ink}" fill-opacity="0.22"/>`);
        cx += divGap;
      }
      if (badge) {
        const acx = cx + awardW / 2;
        const acy = y + h / 2 + Math.round(4 * u);
        const half = awardTextW / 2 + lr * 0.12;
        out.push(laurel(acx - half, acy, lr, -1, ink), laurel(acx + half, acy, lr, 1, ink));
        const lh = Math.round(awardSize * 1.25);
        const a0 = y + h / 2 - ((awardLines.length - 1) * lh) / 2 + awardSize * 0.36;
        awardLines.forEach((l, i) =>
          out.push(`<text x="${f1(acx)}" y="${f1(a0 + i * lh)}" font-family="${font}" font-size="${awardSize}" font-weight="800" fill="${ink}" text-anchor="middle" letter-spacing="${f1(awardTrack)}">${esc(l)}</text>`)
        );
      }
      return out.join("");
    };
    return { w, h, draw };
  }

  function getPill(): { w: number; h: number; draw: (x: number, y: number) => string } | null {
    if (!btn) return null;
    const size = Math.round(24 * u);
    const h = Math.round(66 * u);
    const w = Math.max(Math.round(150 * u), Math.round(textWidth(btn.toUpperCase(), size) * 1.1 + 76 * u));
    const capSize = Math.round(12 * u);
    const pillFill = pastel ? "#111114" : "#ffffff";
    const pillInk = pastel ? "#ffffff" : dark ? mix(A, 0.25) : mix(A, -0.12);
    return {
      w,
      h: h + Math.round(30 * u),
      draw: (x, y) =>
        `<g filter="url(#ps-soft)"><rect x="${f1(x)}" y="${f1(y)}" width="${w}" height="${h}" rx="${f1(h / 2)}" fill="${pillFill}"/></g>` +
        `<text x="${f1(x + w / 2)}" y="${f1(y + h / 2 + size * 0.36)}" font-family="${font}" font-size="${size}" font-weight="800" fill="${pillInk}" text-anchor="middle" letter-spacing="${f1(size * 0.06)}">${esc(btn.toUpperCase())}</text>` +
        `<text x="${f1(x + w / 2)}" y="${f1(y + h + Math.round(26 * u))}" font-family="${font}" font-size="${capSize}" font-weight="700" fill="${ink}" fill-opacity="${subOp * 0.85}" text-anchor="middle" letter-spacing="${f1(capSize * 0.12)}">IN-APP PURCHASES</text>`,
    };
  }

  /* -------------------------------- layout -------------------------------- */
  const device = showcase === "web" ? undefined : getDevice(doc.deviceId || "iphone-17-pro") ?? getDevice("iphone-16-pro");
  const chip = infoChip();
  const pill = getPill();
  const copy: string[] = [];
  let product = { cx: W * 0.7, cy: H * 0.5, r: H * 0.5 }; // glow placement

  if (wide) {
    const fieldW = W * (showcase === "app" ? (banner ? 0.4 : 0.42) : 0.52);
    const P = Math.max(Math.round(64 * u), Math.round(W * 0.066));
    const colW = W - fieldW - P - Math.round(56 * u);
    const vPad = Math.round((banner ? 44 : 80) * u);

    // try progressively leaner copy until it fits the height
    const actionsFit = chip && pill ? chip.w + Math.round(24 * u) + pill.w <= colW : true;
    const actionsH = (chip?.h ?? 0) && pill ? (actionsFit ? Math.max(chip!.h, pill.h) : chip!.h + Math.round(24 * u) + pill.h) : chip?.h ?? pill?.h ?? 0;
    type Plan = { tag: boolean; hStart: number; lines: number; actions: boolean };
    const plans: Plan[] = [
      { tag: !!tagline, hStart: 124, lines: 3, actions: true },
      { tag: false, hStart: 124, lines: 3, actions: true },
      { tag: false, hStart: 100, lines: 2, actions: true },
      { tag: false, hStart: 92, lines: 2, actions: false },
    ];
    let chosen = null as null | { plan: Plan; head: { size: number; lines: string[] }; tag: { size: number; lines: string[] } | null; total: number };
    for (const plan of plans) {
      const head = fitLines(headline, Math.round(plan.hStart * u), Math.round(44 * u), colW, plan.lines);
      const tag = plan.tag ? fitLines(tagline, Math.round(30 * u), Math.round(22 * u), Math.min(colW, Math.round(780 * u)), 2, 1) : null;
      const total =
        iconS + Math.round(60 * u) +
        head.lines.length * head.size * 0.98 +
        (tag ? Math.round(30 * u) + tag.lines.length * tag.size * 1.32 : 0) +
        (plan.actions && actionsH ? Math.round(58 * u) + actionsH : 0);
      chosen = { plan, head, tag, total };
      if (total <= H - vPad * 2) break;
    }
    const { plan, head, tag, total } = chosen!;
    let y = Math.max(vPad, Math.round((H - total) / 2));
    copy.push(iconRow(P, y, colW).svg);
    y += iconS + Math.round(60 * u);
    for (const line of head.lines) {
      y += head.size * 0.8;
      copy.push(`<text x="${P}" y="${f1(y)}" font-family="${font}" font-size="${head.size}" font-weight="800" fill="${ink}" letter-spacing="${f1(-head.size * 0.035)}">${esc(line)}</text>`);
      y += head.size * 0.18;
    }
    if (tag) {
      y += Math.round(30 * u);
      for (const line of tag.lines) {
        y += tag.size;
        copy.push(`<text x="${P}" y="${f1(y)}" font-family="${font}" font-size="${tag.size}" font-weight="500" fill="${ink}" fill-opacity="${subOp}">${esc(line)}</text>`);
        y += tag.size * 0.32;
      }
    }
    if (plan.actions && actionsH) {
      y += Math.round(58 * u);
      if (chip) copy.push(chip.draw(P, y));
      if (pill) {
        const px = chip && actionsFit ? P + chip.w + Math.round(24 * u) : P;
        const py = chip && !actionsFit ? y + chip.h + Math.round(24 * u) : chip ? y + (chip.h - (pill.h - Math.round(30 * u))) / 2 : y;
        copy.push(pill.draw(px, py));
      }
    }

    // the product, rising on the right
    const fieldX = W - fieldW;
    if (showcase === "app" && device) {
      const fr = device.frame;
      let ph = H * (banner ? 1.12 : 0.98);
      let pw = (ph * fr.width) / fr.height;
      if (pw > fieldW * 0.8) {
        pw = fieldW * 0.8;
        ph = (pw * fr.height) / fr.width;
      }
      const px = fieldX + (fieldW - pw) / 2 - Math.round(16 * u);
      const py = banner ? H * 0.12 : Math.max(H * 0.11, H - ph * 0.9);
      product = { cx: px + pw / 2, cy: py + ph * 0.32, r: Math.max(pw, H * 0.5) };
      parts.push(phone(px, py, pw / fr.width));
    } else {
      const ww = showcase === "web" ? fieldW * 1.06 : fieldW * 0.98;
      const wh = ww * 0.66;
      const wx = showcase === "web" ? fieldX + fieldW * 0.06 : fieldX + fieldW * 0.18;
      const wy = showcase === "web" ? (H - wh) / 2 : H * 0.13;
      product = { cx: wx + ww * 0.4, cy: wy + wh * 0.45, r: ww * 0.7 };
      parts.push(browser(wx, wy, ww, wh));
      if (showcase === "both" && device) {
        const fr = device.frame;
        const ph = H * 0.8;
        const pw = (ph * fr.width) / fr.height;
        parts.push(phone(fieldX + fieldW * 0.02, H * 0.3, pw / fr.width));
      }
    }
  } else {
    // tall: centred copy over a product rising from the bottom edge
    const P = Math.round(80 * u);
    const colW = W - P * 2;
    const tallness = H / W; // 1 (square) … 1.78 (story)
    const topPad = Math.round((tallness > 1.5 ? 150 : tallness > 1.15 ? 110 : 76) * u);
    const minProduct = H * (tallness > 1.5 ? 0.46 : tallness > 1.15 ? 0.42 : 0.4);
    const actionsFit = chip && pill ? chip.w + Math.round(20 * u) + pill.w <= colW : true;
    const actionsH = chip && pill ? (actionsFit ? Math.max(chip.h, pill.h) : chip.h) : chip?.h ?? pill?.h ?? 0;
    const showPillAlone = !chip && !!pill;

    type Plan = { tag: boolean; hStart: number; lines: number; actions: boolean };
    const plans: Plan[] = [
      { tag: !!tagline, hStart: tallness > 1.5 ? 132 : 112, lines: 3, actions: true },
      { tag: false, hStart: tallness > 1.5 ? 132 : 104, lines: 3, actions: true },
      { tag: false, hStart: 92, lines: 2, actions: true },
      { tag: false, hStart: 84, lines: 2, actions: false },
    ];
    let chosen = null as null | { plan: Plan; head: { size: number; lines: string[] }; tag: { size: number; lines: string[] } | null; total: number };
    for (const plan of plans) {
      const head = fitLines(headline, Math.round(plan.hStart * u), Math.round(48 * u), colW, plan.lines);
      const tag = plan.tag ? fitLines(tagline, Math.round(32 * u), Math.round(24 * u), Math.min(colW, Math.round(820 * u)), 2, 1) : null;
      const total =
        iconS + Math.round(56 * u) +
        head.lines.length * head.size * 0.98 +
        (tag ? Math.round(26 * u) + tag.lines.length * tag.size * 1.32 : 0) +
        (plan.actions && actionsH ? Math.round(50 * u) + actionsH : 0);
      chosen = { plan, head, tag, total };
      if (topPad + total + Math.round(60 * u) <= H - minProduct) break;
    }
    const { plan, head, tag } = chosen!;
    let y = topPad;
    const row = iconRow(0, 0, colW);
    copy.push(`<g transform="translate(${f1((W - row.w) / 2)} ${f1(y)})">${row.svg}</g>`);
    y += iconS + Math.round(56 * u);
    for (const line of head.lines) {
      y += head.size * 0.8;
      copy.push(`<text x="${f1(W / 2)}" y="${f1(y)}" font-family="${font}" font-size="${head.size}" font-weight="800" fill="${ink}" text-anchor="middle" letter-spacing="${f1(-head.size * 0.035)}">${esc(line)}</text>`);
      y += head.size * 0.18;
    }
    if (tag) {
      y += Math.round(26 * u);
      for (const line of tag.lines) {
        y += tag.size;
        copy.push(`<text x="${f1(W / 2)}" y="${f1(y)}" font-family="${font}" font-size="${tag.size}" font-weight="500" fill="${ink}" fill-opacity="${subOp}" text-anchor="middle">${esc(line)}</text>`);
        y += tag.size * 0.32;
      }
    }
    if (plan.actions && actionsH) {
      y += Math.round(50 * u);
      const rowW = chip && pill && actionsFit ? chip.w + Math.round(20 * u) + pill.w : chip ? chip.w : pill!.w;
      let x = (W - rowW) / 2;
      if (chip) {
        copy.push(chip.draw(x, y));
        x += chip.w + Math.round(20 * u);
      }
      if (pill && (actionsFit || showPillAlone)) copy.push(pill.draw(x, chip ? y + (chip.h - (pill.h - Math.round(30 * u))) / 2 : y));
      y += actionsH;
    }

    const productTop = y + Math.round((tallness > 1.15 ? 76 : 56) * u);
    if (showcase === "app" && device) {
      const fr = device.frame;
      const pw = W * (tallness > 1.5 ? 0.64 : tallness > 1.15 ? 0.54 : 0.46);
      const s = pw / fr.width;
      const px = (W - pw) / 2;
      product = { cx: W / 2, cy: productTop + fr.height * s * 0.3, r: W * 0.6 };
      parts.push(phone(px, productTop, s));
    } else {
      const ww = showcase === "web" ? W * 0.9 : W * 0.86;
      const wh = ww * 0.7;
      const wx = showcase === "web" ? (W - ww) / 2 : W * 0.2;
      product = { cx: wx + ww / 2, cy: productTop + wh * 0.4, r: ww * 0.7 };
      parts.push(browser(wx, productTop, ww, wh));
      if (showcase === "both" && device) {
        const fr = device.frame;
        const pw = W * 0.34;
        parts.push(phone(W * 0.07, productTop + Math.round(90 * u), pw / fr.width));
      }
    }
  }

  // glow + orbit rings behind the product (inserted under it, over the stage)
  const glowCol = dark ? mix(A, 0.1) : "#ffffff";
  defs.push(
    `<radialGradient id="ps-glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${glowCol}" stop-opacity="${dark ? 0.55 : 0.34}"/><stop offset="0.55" stop-color="${glowCol}" stop-opacity="${dark ? 0.16 : 0.1}"/><stop offset="1" stop-color="${glowCol}" stop-opacity="0"/></radialGradient>`
  );
  const gr = product.r * 1.15;
  parts.splice(
    stageEnd,
    0,
    `<ellipse cx="${f1(product.cx)}" cy="${f1(product.cy)}" rx="${f1(gr)}" ry="${f1(gr * 0.9)}" fill="url(#ps-glow)"/>`,
    ...[0.62, 0.86].map(
      (k) => `<circle cx="${f1(product.cx)}" cy="${f1(product.cy)}" r="${f1(product.r * k)}" fill="none" stroke="${ink}" stroke-opacity="${dark ? 0.07 : 0.1}" stroke-width="${f1(1.5 * Math.max(1, u))}"/>`
    ),
    `<rect width="${W}" height="${H}" filter="url(#ps-grain)" opacity="0.9"/>`
  );

  return `<defs>${defs.join("")}</defs>${parts.join("\n")}${copy.join("\n")}`;

  /* ------------------------------- products ------------------------------- */
  function phone(x: number, y: number, s: number): string {
    const fr = device!.frame;
    const variant = getVariant(device!, pastel ? "light" : "dark");
    const r = fr.screenRect;
    const screen = screenshotUrl
      ? `<image href="${screenshotUrl}" x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" preserveAspectRatio="xMidYMin slice"/>`
      : sampleScreen(r.x, r.y, r.width, r.height);
    return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s.toFixed(5)})">
      <g filter="url(#ps-lift)">${variant.body}</g>
      <clipPath id="ps-screen"><path d="${fr.maskPath}"/></clipPath>
      <g clip-path="url(#ps-screen)">${screen}</g>
      <g>${variant.overlay}</g>
    </g>`;
  }

  function browser(x: number, y: number, w: number, h: number): string {
    const domain = domainOf(doc.webUrl || "") || `${appName.toLowerCase().replace(/[^a-z0-9]+/g, "") || "app"}.com`;
    return browserWindow({
      x,
      y,
      w,
      h,
      style: doc.webFrame ?? "safari",
      dark: dark || !pastel,
      domain,
      font,
      content: (cx, cy, cw, ch) =>
        webShotUrl ? `<image href="${webShotUrl}" x="${cx}" y="${f1(cy)}" width="${cw}" height="${f1(ch)}" preserveAspectRatio="xMidYMin slice"/>` : sampleSite(cx, cy, cw, ch),
    });
  }

  /** no screenshot yet: a polished sample app screen in the accent */
  function sampleScreen(x: number, y: number, w: number, h: number): string {
    const k = w / 400;
    const bg = "#0c0c10";
    const card = "#18181d";
    const pad = 24 * k;
    const ring = 92 * k;
    const rcx = x + w / 2;
    const rcy = y + 300 * k;
    const circ = 2 * Math.PI * ring;
    const done = 0.78;
    const rows = ["Morning focus", "Hydrate 2.5L", "Read 20 pages"].map((t, i) => {
      const ry = y + 470 * k + i * 88 * k;
      const checked = i === 1;
      return (
        `<rect x="${f1(x + pad)}" y="${f1(ry)}" width="${f1(w - pad * 2)}" height="${f1(74 * k)}" rx="${f1(20 * k)}" fill="${checked ? "#ffffff" : card}"/>` +
        `<rect x="${f1(x + pad + 14 * k)}" y="${f1(ry + 15 * k)}" width="${f1(44 * k)}" height="${f1(44 * k)}" rx="${f1(13 * k)}" fill="${accent}" fill-opacity="${checked ? 1 : 0.28}"/>` +
        (checked
          ? `<path d="M${f1(x + pad + 26 * k)} ${f1(ry + 38 * k)} l${f1(7 * k)} ${f1(7 * k)} l${f1(13 * k)} ${f1(-14 * k)}" fill="none" stroke="#fff" stroke-width="${f1(3.5 * k)}" stroke-linecap="round" stroke-linejoin="round"/>`
          : `<text x="${f1(x + pad + 36 * k)}" y="${f1(ry + 43 * k)}" font-family="${font}" font-size="${f1(15 * k)}" font-weight="700" fill="#fff" text-anchor="middle">0${i + 1}</text>`) +
        `<text x="${f1(x + pad + 74 * k)}" y="${f1(ry + 33 * k)}" font-family="${font}" font-size="${f1(16 * k)}" font-weight="700" fill="${checked ? "#111114" : "#fff"}">${t}</text>` +
        `<text x="${f1(x + pad + 74 * k)}" y="${f1(ry + 54 * k)}" font-family="${font}" font-size="${f1(12.5 * k)}" font-weight="500" fill="${checked ? "#6b6b76" : "#8e8e98"}">${checked ? "Completed at 10:45" : i === 0 ? "15 minutes" : "Not started"}</text>` +
        `<circle cx="${f1(x + w - pad - 30 * k)}" cy="${f1(ry + 37 * k)}" r="${f1(11 * k)}" fill="none" stroke="${checked ? accent : "#3a3a44"}" stroke-width="${f1(2.5 * k)}"/>`
      );
    });
    return (
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${bg}"/>` +
      `<text x="${f1(x + pad)}" y="${f1(y + 112 * k)}" font-family="${font}" font-size="${f1(14 * k)}" font-weight="600" fill="#8e8e98">${esc(truncate(appName, 14 * k, w * 0.6))}</text>` +
      `<text x="${f1(x + pad)}" y="${f1(y + 146 * k)}" font-family="${font}" font-size="${f1(32 * k)}" font-weight="800" fill="#fff" letter-spacing="${f1(-0.6 * k)}">Today</text>` +
      `<circle cx="${f1(x + w - pad - 20 * k)}" cy="${f1(y + 134 * k)}" r="${f1(20 * k)}" fill="${accent}" fill-opacity="0.35"/>` +
      `<circle cx="${f1(rcx)}" cy="${f1(rcy)}" r="${f1(ring)}" fill="none" stroke="#24242b" stroke-width="${f1(20 * k)}"/>` +
      `<circle cx="${f1(rcx)}" cy="${f1(rcy)}" r="${f1(ring)}" fill="none" stroke="${mix(A, 0.25)}" stroke-width="${f1(20 * k)}" stroke-linecap="round" stroke-dasharray="${f1(circ * done)} ${f1(circ)}" transform="rotate(-90 ${f1(rcx)} ${f1(rcy)})"/>` +
      `<text x="${f1(rcx)}" y="${f1(rcy + 14 * k)}" font-family="${font}" font-size="${f1(46 * k)}" font-weight="800" fill="#fff" text-anchor="middle" letter-spacing="${f1(-1.5 * k)}">78%</text>` +
      `<text x="${f1(rcx)}" y="${f1(rcy + 40 * k)}" font-family="${font}" font-size="${f1(11 * k)}" font-weight="700" fill="#8e8e98" text-anchor="middle" letter-spacing="${f1(1.4 * k)}">WEEKLY GOAL</text>` +
      rows.join("")
    );
  }

  /** no website screenshot yet: a clean landing page */
  function sampleSite(x: number, y: number, w: number, h: number): string {
    const k = w / 1000;
    // with a phone in front of the window's left side, centre the page's hero on the visible part
    const mid = x + (showcase === "both" ? w * 0.57 : w / 2);
    const out: string[] = [`<rect x="${x}" y="${f1(y)}" width="${w}" height="${f1(h)}" fill="#0c0c10"/>`];
    const ny = y + 46 * k;
    out.push(
      `<rect x="${f1(x + 48 * k)}" y="${f1(ny - 16 * k)}" width="${f1(32 * k)}" height="${f1(32 * k)}" rx="${f1(8 * k)}" fill="${accent}"/>`,
      `<text x="${f1(x + 92 * k)}" y="${f1(ny + 7 * k)}" font-family="${font}" font-size="${f1(20 * k)}" font-weight="700" fill="#fff">${esc(truncate(appName, 20 * k, 260 * k))}</text>`,
      ...[0, 1, 2].map((i) => `<rect x="${f1(x + w - 380 * k + i * 86 * k)}" y="${f1(ny - 5 * k)}" width="${f1(58 * k)}" height="${f1(10 * k)}" rx="${f1(5 * k)}" fill="#fff" fill-opacity="0.25"/>`),
      `<rect x="${f1(x + w - 128 * k)}" y="${f1(ny - 18 * k)}" width="${f1(84 * k)}" height="${f1(36 * k)}" rx="${f1(18 * k)}" fill="#fff"/>`
    );
    const hs = 58 * k;
    let hy = y + 180 * k;
    for (const l of wrapText(headline, hs * HEAVY, w * (showcase === "both" ? 0.42 : 0.7)).slice(0, 2)) {
      out.push(`<text x="${f1(mid)}" y="${f1(hy)}" font-family="${font}" font-size="${f1(hs)}" font-weight="800" fill="#fff" text-anchor="middle" letter-spacing="${f1(-hs * 0.03)}">${esc(l)}</text>`);
      hy += hs * 1.06;
    }
    hy += 10 * k;
    out.push(
      `<rect x="${f1(mid - 92 * k)}" y="${f1(hy)}" width="${f1(184 * k)}" height="${f1(48 * k)}" rx="${f1(24 * k)}" fill="${accent}"/>`,
      `<text x="${f1(mid)}" y="${f1(hy + 31 * k)}" font-family="${font}" font-size="${f1(18 * k)}" font-weight="700" fill="${luminance(A) > 0.72 ? "#111114" : "#fff"}" text-anchor="middle">Get started</text>`,
      `<rect x="${f1(mid - w * 0.4)}" y="${f1(hy + 86 * k)}" width="${f1(w * 0.8)}" height="${f1(h)}" rx="${f1(18 * k)}" fill="${accent}" fill-opacity="0.22"/>`,
      `<rect x="${f1(mid - w * 0.4)}" y="${f1(hy + 86 * k)}" width="${f1(w * 0.8)}" height="${f1(h)}" rx="${f1(18 * k)}" fill="none" stroke="#fff" stroke-opacity="0.12"/>`
    );
    return out.join("");
  }
}
