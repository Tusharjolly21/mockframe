"use client";

import { getDevice, getVariant } from "@framekit/devices";
import { esc, systemFont, textWidth, truncate, wrapText } from "./common";
import type { AppStorePromoDoc } from "./types";

/**
 * App Store promo card: a launch poster in the App Store's own vernacular.
 *
 * Left, on paper: the app icon, a large title, the subtitle, then the store's
 * info strip (rating with stars, the laurel award) and the GET pill. Right: a
 * solid accent field with the phone rising out of the bottom edge, showing the
 * user's screenshot or, without one, the app's launch screen.
 *
 * Everything is laid out from the card size, so custom card sizes keep their
 * proportions, and long titles step down in size instead of overflowing.
 */

export function appStorePromoCardSize(doc: AppStorePromoDoc): { width: number; height: number } {
  return {
    width: doc.cardWidth || 1200,
    height: doc.cardHeight || 900,
  };
}

/** #rgb / #rrggbb → [r,g,b]; falls back to indigo for anything else */
function rgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [99, 102, 241];
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join("") : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

const luminance = ([r, g, b]: [number, number, number]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

/** one laurel branch: pointed leaves along an arc, curving up around the award text */
function laurel(cx: number, cy: number, r: number, side: -1 | 1, color: string): string {
  const pt = (deg: number) => {
    const a = (deg * Math.PI) / 180;
    return { x: cx - side * Math.cos(a) * r * 0.62, y: cy + Math.sin(a) * r };
  };
  const leaves: string[] = [];
  const n = 8;
  for (let i = 0; i < n; i++) {
    const deg = 70 + (i / (n - 1)) * 175; // bottom of the stem → top
    const p = pt(deg);
    const q = pt(deg + 1);
    const tangent = (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI;
    const L = r * (0.42 - i * 0.018);
    const w = L * 0.36;
    // leaves on both sides of the stem, angled toward its tip
    for (const flip of [1, -1]) {
      if (i === 0 && flip === -1) continue;
      leaves.push(
        `<path d="M0 0 Q${(L / 2).toFixed(1)} ${(-w).toFixed(1)} ${L.toFixed(1)} 0 Q${(L / 2).toFixed(1)} ${w.toFixed(1)} 0 0Z" transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${(tangent + flip * 38).toFixed(1)})"/>`
      );
    }
  }
  const stem: string[] = [];
  for (let d = 70; d <= 245; d += 7) {
    const p = pt(d);
    stem.push(`${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
  }
  return `<g fill="${color}"><polyline points="${stem.join(" ")}" fill="none" stroke="${color}" stroke-width="${(r * 0.045).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/>${leaves.join("")}</g>`;
}

function stars(x: number, y: number, size: number, value: number, on: string, off: string): string {
  const pts = (cx: number, cy: number, R: number) => {
    const out: string[] = [];
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI / 5) * i - Math.PI / 2;
      const rr = i % 2 === 0 ? R : R * 0.45;
      out.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`);
    }
    return out.join(" ");
  };
  const R = size / 2;
  const clipW = Math.max(0, Math.min(5, value)) * size * 1.2;
  const row = (fill: string) =>
    Array.from({ length: 5 }, (_, i) => `<polygon points="${pts(x + R + i * size * 1.2, y + R, R)}" fill="${fill}"/>`).join("");
  return `<g>${row(off)}<clipPath id="asp-star-clip"><rect x="${x}" y="${y - 2}" width="${clipW.toFixed(1)}" height="${size + 4}"/></clipPath><g clip-path="url(#asp-star-clip)">${row(on)}</g></g>`;
}

export function renderAppStorePromo(doc: AppStorePromoDoc, avatarUrl?: string, screenshotUrl?: string): string {
  const { width: W, height: H } = appStorePromoCardSize(doc);
  const k = Math.min(W / 1200, H / 900);
  // the Light/Dark switch writes chrome.dark; older docs carry `dark`
  const dark = doc.chrome?.dark ?? !!doc.dark;
  const font = systemFont("ios");
  const accent = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(doc.accentColor || "") ? doc.accentColor : "#6366f1";
  const [ar, ag, ab] = rgb(accent);
  const accentIsLight = luminance([ar, ag, ab]) > 0.72;

  const c = dark
    ? { paper: "#161618", ink: "#f5f5f7", secondary: "#a1a1a6", hairline: "#3a3a3c", starOff: "#3a3a3c" }
    : { paper: "#fbfbfd", ink: "#1d1d1f", secondary: "#6e6e73", hairline: "#d2d2d7", starOff: "#d2d2d7" };
  // the GET pill and award read in the accent unless it would vanish on paper
  const accentInk = !dark && accentIsLight ? c.ink : accent;

  const P = Math.round(84 * k);
  const fieldW = Math.round(W * 0.42);
  const fieldX = W - fieldW;
  const colW = fieldX - P - Math.round(64 * k); // text column width

  const parts: string[] = [`<rect width="${W}" height="${H}" fill="${c.paper}"/>`];

  /* ------------------------------ accent field ------------------------------ */
  parts.push(
    `<defs>
      <linearGradient id="asp-field-shade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity="0.16"/>
        <stop offset="0.55" stop-color="#fff" stop-opacity="0"/>
        <stop offset="1" stop-color="#000" stop-opacity="0.18"/>
      </linearGradient>
      <radialGradient id="asp-field-glow" cx="0.5" cy="0.32" r="0.6">
        <stop offset="0" stop-color="#fff" stop-opacity="0.22"/>
        <stop offset="1" stop-color="#fff" stop-opacity="0"/>
      </radialGradient>
      <filter id="asp-phone-shadow" x="-30%" y="-10%" width="160%" height="130%">
        <feDropShadow dx="0" dy="${Math.round(30 * k)}" stdDeviation="${Math.round(34 * k)}" flood-color="#000" flood-opacity="0.32"/>
      </filter>
    </defs>`,
    `<rect x="${fieldX}" width="${fieldW}" height="${H}" fill="${accent}"/>`,
    `<rect x="${fieldX}" width="${fieldW}" height="${H}" fill="url(#asp-field-shade)"/>`,
    `<rect x="${fieldX}" width="${fieldW}" height="${H}" fill="url(#asp-field-glow)"/>`
  );

  /* -------------------------------- app icon -------------------------------- */
  const iconS = Math.round(116 * k);
  const iconR = Math.round(iconS * 0.225);
  const initial = esc(([...(doc.title || "A").trim()][0] || "A").toUpperCase());
  const iconAt = (x: number, y: number, s: number, r: number, id: string) =>
    avatarUrl
      ? `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${r}"/></clipPath><image href="${avatarUrl}" x="${x}" y="${y}" width="${s}" height="${s}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/><rect x="${x + 0.5}" y="${y + 0.5}" width="${s - 1}" height="${s - 1}" rx="${r}" fill="none" stroke="#000" stroke-opacity="0.08"/>`
      : `<linearGradient id="${id}-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.28"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${r}" fill="${accent}"/><rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${r}" fill="url(#${id}-g)"/><text x="${x + s / 2}" y="${y + s * 0.68}" font-family="${font}" font-size="${Math.round(s * 0.5)}" font-weight="700" fill="${accentIsLight ? "#1d1d1f" : "#fff"}" text-anchor="middle">${initial}</text>`;
  const topStart = parts.length;
  parts.push(iconAt(P, P, iconS, iconR, "asp-icon"));

  /* --------------------------- title + subtitle ---------------------------- */
  // step the title down until it fits in two lines
  let titleSize = Math.round(92 * k);
  let titleLines = wrapText(doc.title || "", titleSize, colW);
  while (titleLines.length > 2 && titleSize > 44 * k) {
    titleSize = Math.round(titleSize * 0.88);
    titleLines = wrapText(doc.title || "", titleSize, colW);
  }
  if (titleLines.length > 2) titleLines = [titleLines[0], truncate(titleLines.slice(1).join(" "), titleSize, colW)];
  const titleLH = Math.round(titleSize * 1.04);
  let y = P + iconS + Math.round(42 * k) + Math.round(titleSize * 0.78);
  for (const line of titleLines) {
    parts.push(
      `<text x="${P}" y="${y}" font-family="${font}" font-size="${titleSize}" font-weight="800" fill="${c.ink}" letter-spacing="${(-titleSize * 0.028).toFixed(2)}">${esc(line)}</text>`
    );
    y += titleLH;
  }

  const subSize = Math.round(29 * k);
  const subLH = Math.round(subSize * 1.32);
  let subLines = wrapText(doc.subtitle || "", subSize, Math.min(colW, subSize * 20));
  if (subLines.length > 3) subLines = [...subLines.slice(0, 2), truncate(subLines.slice(2).join(" "), subSize, colW)];
  y += Math.round(18 * k) - titleLH + Math.round(titleSize * 0.22) + subSize;
  for (const line of subLines) {
    parts.push(`<text x="${P}" y="${y}" font-family="${font}" font-size="${subSize}" font-weight="500" fill="${c.secondary}">${esc(line)}</text>`);
    y += subLH;
  }

  /* --------------- info strip + GET row, anchored to the bottom -------------- */
  const pillH = Math.round(50 * k);
  const pillY = H - P - pillH;
  const stripH = Math.round(112 * k);
  const stripTop = pillY - Math.round(40 * k) - stripH;

  // short copy leaves air under the subtitle: ease the top block down a little
  const blockBottom = y - subLH + Math.round(subSize * 0.3);
  const ease = Math.max(0, Math.round((stripTop - Math.round(56 * k) - blockBottom) * 0.4));
  if (ease > 0) parts.splice(topStart, parts.length - topStart, `<g transform="translate(0 ${ease})">${parts.slice(topStart).join("")}</g>`);

  parts.push(`<rect x="${P}" y="${stripTop}" width="${colW}" height="1" fill="${c.hairline}"/>`);
  const cellW = Math.min(Math.round(colW / 2), Math.round(250 * k));

  // rating cell
  const rating = Math.max(0, Math.min(5, Number(doc.ratingValue) || 0));
  const numSize = Math.round(40 * k);
  const ry = stripTop + Math.round(28 * k);
  parts.push(
    `<text x="${P}" y="${ry + numSize * 0.78}" font-family="${font}" font-size="${numSize}" font-weight="700" fill="${c.ink}" letter-spacing="${(-numSize * 0.02).toFixed(2)}">${rating.toFixed(1)}</text>`,
    stars(P + textWidth(rating.toFixed(1), numSize) + Math.round(12 * k), ry + numSize * 0.2, Math.round(17 * k), rating, "#ff9f0a", c.starOff),
    `<text x="${P}" y="${ry + numSize + Math.round(26 * k)}" font-family="${font}" font-size="${Math.round(16 * k)}" font-weight="500" fill="${c.secondary}">${esc(truncate(doc.reviewsCountText || "", Math.round(16 * k), cellW - 20 * k))}</text>`
  );

  // award cell: the badge text held between two laurel branches
  const badge = (doc.badgeText || "").trim();
  if (badge) {
    parts.push(`<rect x="${P + cellW}" y="${stripTop + Math.round(22 * k)}" width="1" height="${stripH - Math.round(30 * k)}" fill="${c.hairline}"/>`);
    const acx = P + cellW + Math.round(cellW / 2) + Math.round(8 * k);
    const acy = stripTop + Math.round(stripH / 2) + Math.round(6 * k);
    const lr = Math.round(40 * k);
    const awardSize = Math.round(16 * k);
    const awardInnerW = lr * 2 - Math.round(16 * k);
    // badges are often typed in caps; set them in the store's title case
    const label = badge === badge.toUpperCase() ? badge.toLowerCase().replace(/(^|\s)(\S)/g, (_, s, ch) => s + ch.toUpperCase()).replace(/\b(Of|The|A|An|And|For|In|On)\b/g, (w, _p, off) => (off === 0 ? w : w.toLowerCase())) : badge;
    let awardLines = wrapText(label, awardSize, awardInnerW);
    if (awardLines.length > 3) awardLines = [...awardLines.slice(0, 2), truncate(awardLines.slice(2).join(" "), awardSize, awardInnerW)];
    const aLH = Math.round(awardSize * 1.12);
    // branches sit just clear of the widest line
    const gap = Math.max(...awardLines.map((l) => textWidth(l, awardSize))) / 2 + lr * 0.12;
    const a0 = acy - ((awardLines.length - 1) * aLH) / 2 + awardSize * 0.35;
    parts.push(
      laurel(acx - gap, acy, lr, -1, accentInk),
      laurel(acx + gap, acy, lr, 1, accentInk),
      ...awardLines.map(
        (l, i) =>
          `<text x="${acx}" y="${(a0 + i * aLH).toFixed(1)}" font-family="${font}" font-size="${awardSize}" font-weight="700" fill="${c.ink}" text-anchor="middle" letter-spacing="-0.2">${esc(l)}</text>`
      )
    );
  }

  // GET pill + purchase note
  const btn = (doc.buttonText || "Get").trim() || "Get";
  const btnSize = Math.round(19 * k);
  const pillW = Math.max(Math.round(116 * k), Math.round(textWidth(btn, btnSize) + 56 * k));
  parts.push(
    `<rect x="${P}" y="${pillY}" width="${pillW}" height="${pillH}" rx="${pillH / 2}" fill="${accentInk}" fill-opacity="${dark ? 0.22 : 0.12}"/>`,
    `<text x="${P + pillW / 2}" y="${pillY + pillH / 2 + btnSize * 0.36}" font-family="${font}" font-size="${btnSize}" font-weight="800" fill="${dark && !accentIsLight ? "#fff" : accentInk}" text-anchor="middle" letter-spacing="0.2">${esc(btn)}</text>`,
    `<text x="${P + pillW + Math.round(18 * k)}" y="${pillY + pillH / 2 - Math.round(3 * k)}" font-family="${font}" font-size="${Math.round(14 * k)}" font-weight="500" fill="${c.secondary}">In-App</text>`,
    `<text x="${P + pillW + Math.round(18 * k)}" y="${pillY + pillH / 2 + Math.round(15 * k)}" font-family="${font}" font-size="${Math.round(14 * k)}" font-weight="500" fill="${c.secondary}">Purchases</text>`
  );

  /* ------------------ phone rising out of the accent field ------------------ */
  const device = getDevice(doc.deviceId || "iphone-17-pro") ?? getDevice("iphone-16-pro");
  if (device) {
    const variant = getVariant(device, dark ? "dark" : "light");
    const { frame } = device;
    const rect = frame.screenRect;
    // tall enough to run off the bottom edge, never wider than the field
    const s = Math.min((H * 1.0) / frame.height, (fieldW * 0.86) / frame.width);
    const dw = frame.width * s;
    const dx = fieldX + (fieldW - dw) / 2;
    // top ~12% down; the rest runs off the bottom edge
    const dy = Math.round(Math.max(H * 0.12, H - frame.height * s * 0.86));

    const sx = rect.x;
    const sy = rect.y;
    const sw = rect.width;
    const sh = rect.height;
    const screen = screenshotUrl
      ? `<image href="${screenshotUrl}" x="${sx}" y="${sy}" width="${sw}" height="${sh}" preserveAspectRatio="xMidYMin slice"/>`
      : // no screenshot yet: the app's launch screen, so an export still looks real
        `<rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="${c.paper}"/>
         <rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="${accent}" fill-opacity="${dark ? 0.1 : 0.06}"/>
         ${iconAt(sx + sw / 2 - sw * 0.14, sy + sh * 0.38, Math.round(sw * 0.28), Math.round(sw * 0.28 * 0.225), "asp-splash-icon")}
         <text x="${sx + sw / 2}" y="${sy + sh * 0.38 + sw * 0.28 + sw * 0.12}" font-family="${font}" font-size="${Math.round(sw * 0.07)}" font-weight="700" fill="${c.ink}" text-anchor="middle" letter-spacing="${(-sw * 0.0015).toFixed(2)}">${esc(truncate(doc.title || "", Math.round(sw * 0.07), sw * 0.8))}</text>`;

    parts.push(
      `<g transform="translate(${dx.toFixed(1)} ${dy}) scale(${s.toFixed(5)})">
        <g filter="url(#asp-phone-shadow)">${variant.body}</g>
        <clipPath id="asp-screen-clip"><path d="${frame.maskPath}"/></clipPath>
        <g clip-path="url(#asp-screen-clip)">${screen}</g>
        <g>${variant.overlay}</g>
      </g>`
    );
  }

  return parts.join("\n");
}
