"use client";

import { getDevice, getVariant } from "@framekit/devices";
import { esc, systemFont, textWidth, truncate, wrapText } from "./common";
import type { AppStorePromoDoc, PromoWebFrame } from "./types";

/**
 * App Store promo card: a launch poster in the App Store's own vernacular.
 *
 * Left, on paper: the app icon, a large title, the subtitle, then the store's
 * info strip (rating with stars, the laurel award) and the GET pill. Right: a
 * solid accent field showing the product: the phone rising out of the bottom
 * edge (app), a browser window running off the right edge (web), or both
 * together. Without screenshots the phone shows the app's launch screen and
 * the browser a simple landing page, so an export still looks real.
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

/** "https://www.example.com/path" → "example.com" */
function domainOf(url: string): string {
  return url.trim().replace(/^[a-z]+:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "");
}

interface BrowserOpts {
  x: number;
  y: number;
  w: number;
  h: number;
  style: PromoWebFrame;
  dark: boolean;
  domain: string;
  font: string;
  /** draws the page into (x, y, w, h) */
  content: (x: number, y: number, w: number, h: number) => string;
}

/** a desktop browser window: Safari, Chrome or minimal chrome around a page */
function browserWindow(o: BrowserOpts): string {
  const { x, y, w, h, style, dark, domain, font } = o;
  const u = w / 1000; // chrome scales with the window
  const r = 16 * u;
  const bar = dark ? "#2b2b2e" : "#ececef";
  const field = dark ? "#1c1c1e" : "#ffffff";
  const ink = dark ? "#e5e5ea" : "#3c3c43";
  const faint = dark ? "#8e8e93" : "#8e8e93";
  const barH = style === "chrome" ? 92 * u : style === "safari" ? 58 * u : 34 * u;
  const dots = (cx: number, cy: number) =>
    ["#ff5f57", "#febc2e", "#28c840"].map((f, i) => `<circle cx="${(cx + i * 20 * u).toFixed(1)}" cy="${cy.toFixed(1)}" r="${(6.5 * u).toFixed(1)}" fill="${f}"/>`).join("");
  const lock = (lx: number, ly: number, col: string) =>
    `<g fill="none" stroke="${col}" stroke-width="${(1.8 * u).toFixed(2)}"><rect x="${lx.toFixed(1)}" y="${(ly - 3 * u).toFixed(1)}" width="${(10 * u).toFixed(1)}" height="${(8 * u).toFixed(1)}" rx="${(1.5 * u).toFixed(1)}" fill="${col}"/><path d="M${(lx + 2.2 * u).toFixed(1)} ${(ly - 3 * u).toFixed(1)} v${(-3 * u).toFixed(1)} a${(2.8 * u).toFixed(1)} ${(2.8 * u).toFixed(1)} 0 0 1 ${(5.6 * u).toFixed(1)} 0 v${(3 * u).toFixed(1)}"/></g>`;

  let chrome = "";
  if (style === "safari") {
    const pw = w * 0.44;
    const px = x + (w - pw) / 2;
    const cy = y + barH / 2;
    const ds = Math.round(15 * u);
    const tw = textWidth(domain, ds);
    chrome = `${dots(x + 22 * u, cy)}
      <rect x="${px.toFixed(1)}" y="${(cy - 17 * u).toFixed(1)}" width="${pw.toFixed(1)}" height="${(34 * u).toFixed(1)}" rx="${(9 * u).toFixed(1)}" fill="${field}"/>
      ${lock(x + w / 2 - tw / 2 - 18 * u, cy + 3 * u, faint)}
      <text x="${(x + w / 2 + 6 * u).toFixed(1)}" y="${(cy + ds * 0.36).toFixed(1)}" font-family="${font}" font-size="${ds}" font-weight="500" fill="${ink}" text-anchor="middle">${esc(domain)}</text>`;
  } else if (style === "chrome") {
    const tabY = y + 10 * u;
    const tabH = 36 * u;
    const tabW = Math.min(250 * u, w * 0.3);
    const tx = x + 92 * u;
    const ds = Math.round(14 * u);
    const omniY = y + 50 * u;
    chrome = `${dots(x + 22 * u, y + 27 * u)}
      <path d="M${tx.toFixed(1)} ${(tabY + tabH).toFixed(1)} v${(-tabH + 9 * u).toFixed(1)} q0 ${(-9 * u).toFixed(1)} ${(9 * u).toFixed(1)} ${(-9 * u).toFixed(1)} h${(tabW - 18 * u).toFixed(1)} q${(9 * u).toFixed(1)} 0 ${(9 * u).toFixed(1)} ${(9 * u).toFixed(1)} v${(tabH - 9 * u).toFixed(1)} Z" fill="${field}"/>
      <circle cx="${(tx + 20 * u).toFixed(1)}" cy="${(tabY + tabH / 2 + 1 * u).toFixed(1)}" r="${(7 * u).toFixed(1)}" fill="${faint}" fill-opacity="0.5"/>
      <text x="${(tx + 36 * u).toFixed(1)}" y="${(tabY + tabH / 2 + ds * 0.4).toFixed(1)}" font-family="${font}" font-size="${ds}" font-weight="500" fill="${ink}">${esc(truncate(domain, ds, tabW - 56 * u))}</text>
      <rect x="${x}" y="${(y + 46 * u).toFixed(1)}" width="${w}" height="${(barH - 46 * u).toFixed(1)}" fill="${field}"/>
      <g fill="none" stroke="${faint}" stroke-width="${(2 * u).toFixed(2)}" stroke-linecap="round"><path d="M${(x + 26 * u).toFixed(1)} ${(omniY + 19 * u).toFixed(1)} l${(-6 * u).toFixed(1)} ${(-6 * u).toFixed(1)} ${(6 * u).toFixed(1)} ${(-6 * u).toFixed(1)}"/><path d="M${(x + 50 * u).toFixed(1)} ${(omniY + 7 * u).toFixed(1)} l${(6 * u).toFixed(1)} ${(6 * u).toFixed(1)} ${(-6 * u).toFixed(1)} ${(6 * u).toFixed(1)}"/></g>
      <rect x="${(x + 80 * u).toFixed(1)}" y="${(omniY - 1 * u).toFixed(1)}" width="${(w - 104 * u).toFixed(1)}" height="${(28 * u).toFixed(1)}" rx="${(14 * u).toFixed(1)}" fill="${bar}"/>
      ${lock(x + 98 * u, omniY + 17 * u, faint)}
      <text x="${(x + 118 * u).toFixed(1)}" y="${(omniY + 13 * u + ds * 0.36).toFixed(1)}" font-family="${font}" font-size="${ds}" font-weight="400" fill="${ink}">${esc(domain)}</text>`;
  } else {
    chrome = dots(x + 20 * u, y + barH / 2);
  }

  const cx = x;
  const cy = y + barH;
  const ch = h - barH;
  return `<g filter="url(#asp-window-shadow)"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r.toFixed(1)}" fill="${bar}"/></g>
    <clipPath id="asp-window-clip"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r.toFixed(1)}"/></clipPath>
    <g clip-path="url(#asp-window-clip)">
      <rect x="${x}" y="${y}" width="${w}" height="${barH.toFixed(1)}" fill="${bar}"/>
      ${chrome}
      <rect x="${cx}" y="${cy.toFixed(1)}" width="${w}" height="${ch.toFixed(1)}" fill="${dark ? "#161618" : "#ffffff"}"/>
      ${o.content(cx, cy, w, ch)}
      <rect x="${cx}" y="${(cy - 0.5).toFixed(1)}" width="${w}" height="1" fill="#000" fill-opacity="${dark ? 0.5 : 0.1}"/>
    </g>
    <rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="${r.toFixed(1)}" fill="none" stroke="#000" stroke-opacity="${dark ? 0.6 : 0.12}"/>`;
}

export function renderAppStorePromo(doc: AppStorePromoDoc, avatarUrl?: string, screenshotUrl?: string, webShotUrl?: string): string {
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

  const showcase = doc.showcase ?? "app";
  const P = Math.round(84 * k);
  // the web window needs a wider stage than a phone alone
  const fieldW = Math.round(W * (showcase === "app" ? 0.42 : showcase === "web" ? 0.54 : 0.58));
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
      <filter id="asp-window-shadow" x="-20%" y="-20%" width="140%" height="150%">
        <feDropShadow dx="0" dy="${Math.round(24 * k)}" stdDeviation="${Math.round(30 * k)}" flood-color="#000" flood-opacity="0.28"/>
      </filter>
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
  // heavy display weights run ~10% wider than the regular-weight estimate
  const titleW = (l: string, size: number) => textWidth(l, size) * 1.1;
  const fitTitle = (size: number) => wrapText(doc.title || "", size * 1.1, colW);
  let titleLines = fitTitle(titleSize);
  while ((titleLines.length > 2 || Math.max(...titleLines.map((l) => titleW(l, titleSize))) > colW) && titleSize > 40 * k) {
    titleSize = Math.round(titleSize * 0.9);
    titleLines = fitTitle(titleSize);
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

  // a believable app home screen built from the card's copy and accent
  function sampleHome(x: number, y: number, w: number, h: number): string {
    const u = w / 400;
    const pad = 22 * u;
    const ink = c.ink;
    const sub = c.secondary;
    const card = dark ? "#232326" : "#ffffff";
    const name = esc(truncate(doc.title || "App", 30 * u, w - pad * 2 - 60 * u));
    const bars = [0.42, 0.66, 0.5, 0.82, 0.6, 0.94, 0.74]
      .map((v, i) => `<rect x="${(x + pad + 20 * u + i * 42 * u).toFixed(1)}" y="${(y + 330 * u - v * 110 * u).toFixed(1)}" width="${(26 * u).toFixed(1)}" height="${(v * 110 * u).toFixed(1)}" rx="${(8 * u).toFixed(1)}" fill="#fff" fill-opacity="${i === 5 ? 1 : 0.42}"/>`)
      .join("");
    const rows = [0, 1, 2]
      .map((i) => {
        const ry = y + 410 * u + i * 86 * u;
        return (
          `<rect x="${x + pad}" y="${ry}" width="${w - pad * 2}" height="${74 * u}" rx="${20 * u}" fill="${card}"/>` +
          `<rect x="${x + pad + 14 * u}" y="${ry + 15 * u}" width="${44 * u}" height="${44 * u}" rx="${14 * u}" fill="${accent}" fill-opacity="${0.16 + i * 0.1}"/>` +
          `<rect x="${x + pad + 72 * u}" y="${ry + 22 * u}" width="${(150 - i * 24) * u}" height="${12 * u}" rx="${6 * u}" fill="${ink}" fill-opacity="0.82"/>` +
          `<rect x="${x + pad + 72 * u}" y="${ry + 44 * u}" width="${(100 + i * 16) * u}" height="${10 * u}" rx="${5 * u}" fill="${sub}" fill-opacity="0.45"/>` +
          `<rect x="${x + w - pad - 58 * u}" y="${ry + 26 * u}" width="${44 * u}" height="${22 * u}" rx="${11 * u}" fill="${accent}" fill-opacity="0.9"/>`
        );
      })
      .join("");
    return (
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${dark ? "#0f0f11" : "#f2f2f7"}"/>` +
      `<text x="${x + pad}" y="${y + 104 * u}" font-family="${font}" font-size="${(15 * u).toFixed(1)}" font-weight="600" fill="${sub}">Good morning</text>` +
      `<text x="${x + pad}" y="${y + 138 * u}" font-family="${font}" font-size="${(30 * u).toFixed(1)}" font-weight="800" fill="${ink}" letter-spacing="${(-0.6 * u).toFixed(2)}">${name}</text>` +
      `<circle cx="${x + w - pad - 20 * u}" cy="${y + 124 * u}" r="${20 * u}" fill="${accent}" fill-opacity="0.2"/>` +
      `<linearGradient id="asp-hero" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${accent}"/><stop offset="1" stop-color="${accent}" stop-opacity="0.72"/></linearGradient>` +
      `<rect x="${x + pad}" y="${y + 166 * u}" width="${w - pad * 2}" height="${196 * u}" rx="${26 * u}" fill="url(#asp-hero)"/>` +
      `<text x="${x + pad + 20 * u}" y="${y + 200 * u}" font-family="${font}" font-size="${(14 * u).toFixed(1)}" font-weight="600" fill="#fff" fill-opacity="0.85">This week</text>` +
      bars +
      rows
    );
  }

  /* ------------- the product: browser window and/or phone ------------- */
  if (showcase !== "app") {
    const ww = showcase === "web" ? fieldW * 1.02 : fieldW * 0.96;
    const wh = ww * 0.68;
    const wx = fieldX + (showcase === "web" ? fieldW * 0.1 : fieldW * 0.2);
    const wy = showcase === "web" ? (H - wh) / 2 : H * 0.11;
    const domain = domainOf(doc.webUrl || "") || `${(doc.title || "app").toLowerCase().replace(/[^a-z0-9]+/g, "") || "app"}.com`;
    parts.push(
      browserWindow({
        x: wx,
        y: wy,
        w: ww,
        h: wh,
        style: doc.webFrame ?? "safari",
        dark,
        domain,
        font,
        content: (x, y, w, h) =>
          webShotUrl
            ? `<image href="${webShotUrl}" x="${x}" y="${y.toFixed(1)}" width="${w}" height="${h.toFixed(1)}" preserveAspectRatio="xMidYMin slice"/>`
            : landingPage(x, y, w, h),
      })
    );
  }

  // no website screenshot yet: a simple landing page built from the app's copy
  function landingPage(x: number, y: number, w: number, h: number): string {
    const u = w / 1000;
    const out: string[] = [`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${accent}" fill-opacity="${dark ? 0.08 : 0.04}"/>`];
    const ny = y + 44 * u;
    out.push(
      `<rect x="${x + 48 * u}" y="${ny - 16 * u}" width="${32 * u}" height="${32 * u}" rx="${8 * u}" fill="${accent}"/>`,
      `<text x="${x + 92 * u}" y="${ny + 7 * u}" font-family="${font}" font-size="${Math.round(20 * u)}" font-weight="700" fill="${c.ink}">${esc(truncate(doc.title || "", Math.round(20 * u), 260 * u))}</text>`,
      ...[0, 1, 2].map((i) => `<rect x="${x + w - 380 * u + i * 86 * u}" y="${ny - 5 * u}" width="${58 * u}" height="${10 * u}" rx="${5 * u}" fill="${c.secondary}" fill-opacity="0.35"/>`),
      `<rect x="${x + w - 128 * u}" y="${ny - 18 * u}" width="${84 * u}" height="${36 * u}" rx="${18 * u}" fill="${accent}"/>`
    );
    const hs = Math.round(54 * u);
    const heroLines = wrapText(doc.title || "", hs, w * 0.7).slice(0, 2);
    let hy = y + 170 * u;
    for (const l of heroLines) {
      out.push(`<text x="${x + w / 2}" y="${hy}" font-family="${font}" font-size="${hs}" font-weight="800" fill="${c.ink}" text-anchor="middle" letter-spacing="${(-hs * 0.025).toFixed(2)}">${esc(l)}</text>`);
      hy += hs * 1.08;
    }
    const ss = Math.round(21 * u);
    const subLines = wrapText(doc.subtitle || "", ss, w * 0.56).slice(0, 2);
    hy += 6 * u;
    for (const l of subLines) {
      out.push(`<text x="${x + w / 2}" y="${hy}" font-family="${font}" font-size="${ss}" font-weight="500" fill="${c.secondary}" text-anchor="middle">${esc(l)}</text>`);
      hy += ss * 1.4;
    }
    hy += 18 * u;
    out.push(
      `<rect x="${x + w / 2 - 92 * u}" y="${hy}" width="${184 * u}" height="${48 * u}" rx="${24 * u}" fill="${accent}"/>`,
      `<text x="${x + w / 2}" y="${hy + 24 * u + 7 * u}" font-family="${font}" font-size="${Math.round(18 * u)}" font-weight="700" fill="${accentIsLight ? "#1d1d1f" : "#fff"}" text-anchor="middle">Get started</text>`,
      `<rect x="${x + w * 0.12}" y="${hy + 86 * u}" width="${w * 0.76}" height="${h}" rx="${18 * u}" fill="${accent}" fill-opacity="${dark ? 0.22 : 0.14}"/>`
    );
    return out.join("");
  }

  const device = showcase === "web" ? undefined : getDevice(doc.deviceId || "iphone-17-pro") ?? getDevice("iphone-16-pro");
  if (device) {
    const variant = getVariant(device, dark ? "dark" : "light");
    const { frame } = device;
    const rect = frame.screenRect;
    // app: tall enough to run off the bottom edge, never wider than the field;
    // both: smaller, in front of the browser at the field's left
    const s =
      showcase === "both"
        ? Math.min((H * 0.78) / frame.height, (fieldW * 0.4) / frame.width)
        : Math.min((H * 1.0) / frame.height, (fieldW * 0.86) / frame.width);
    const dw = frame.width * s;
    const dx = showcase === "both" ? fieldX + fieldW * 0.06 : fieldX + (fieldW - dw) / 2;
    // top ~12% down (app) / ~30% (both); the rest runs off the bottom edge
    const dy =
      showcase === "both"
        ? Math.round(Math.max(H * 0.3, H - frame.height * s * 0.88))
        : Math.round(Math.max(H * 0.12, H - frame.height * s * 0.86));

    const sx = rect.x;
    const sy = rect.y;
    const sw = rect.width;
    const sh = rect.height;
    const screen = screenshotUrl
      ? `<image href="${screenshotUrl}" x="${sx}" y="${sy}" width="${sw}" height="${sh}" preserveAspectRatio="xMidYMin slice"/>`
      : // no screenshot yet: a sample home screen in the app's accent, so an export still looks real
        sampleHome(sx, sy, sw, sh);

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
