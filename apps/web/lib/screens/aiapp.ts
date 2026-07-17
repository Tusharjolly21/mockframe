"use client";

import { esc, IOS_FONT, SH, SW } from "./common";
import type { AiAppDoc, AiAppItem } from "./types";

/**
 * Generic concept-UI renderer for AI-generated packs. One deterministic
 * layout per archetype; every string passes through esc(); every numeric
 * position is computed from SW/SH so nothing depends on content length.
 */

const F = IOS_FONT;
const PAD = 24;
const CW = SW - PAD * 2; // content width

const clampItems = (items: AiAppItem[], n: number) => items.slice(0, n);

function statusBar(text: string): string {
  return `<text x="${PAD}" y="34" font-family="${F}" font-size="15" font-weight="700" fill="${text}">9:41</text>
    <g fill="${text}"><rect x="${SW - 64}" y="24" width="17" height="10" rx="2.5" opacity="0.9"/><rect x="${SW - 45}" y="26" width="3" height="6" rx="1" opacity="0.5"/><rect x="${SW - 88}" y="24" width="16" height="10" rx="2" opacity="0.35"/></g>`;
}

function tabBar(doc: AiAppDoc): string {
  const tabs = (doc.tabs ?? []).slice(0, 5);
  if (!tabs.length) return "";
  const { primary, card, muted, text } = doc.palette;
  const w = SW / tabs.length;
  const y = SH - 62;
  return `<rect x="0" y="${y - 14}" width="${SW}" height="${SH - y + 14}" fill="${card}"/>
    <rect x="0" y="${y - 14}" width="${SW}" height="1" fill="${text}" opacity="0.06"/>` +
    tabs.map((t, i) => {
      const cx = w * i + w / 2;
      const active = i === 0;
      return `<circle cx="${cx}" cy="${y + 6}" r="10" fill="${active ? primary : muted}" opacity="${active ? 1 : 0.35}"/>
        <text x="${cx}" y="${y + 34}" text-anchor="middle" font-family="${F}" font-size="10.5" font-weight="${active ? 700 : 500}" fill="${active ? primary : muted}">${esc(t)}</text>`;
    }).join("");
}

function headerBlock(doc: AiAppDoc, y: number): string {
  const { text, muted } = doc.palette;
  let out = `<text x="${PAD}" y="${y}" font-family="${F}" font-size="26" font-weight="800" fill="${text}" letter-spacing="-0.4">${esc(doc.header.title)}</text>`;
  if (doc.header.subtitle) {
    out += `<text x="${PAD}" y="${y + 24}" font-family="${F}" font-size="14" font-weight="500" fill="${muted}">${esc(doc.header.subtitle)}</text>`;
  }
  return out;
}

function statCards(doc: AiAppDoc, y: number): string {
  const stats = (doc.stats ?? []).slice(0, 4);
  if (!stats.length) return "";
  const { primary, card, text, muted } = doc.palette;
  const gap = 12;
  const w = (CW - gap * (stats.length - 1)) / stats.length;
  return stats.map((s, i) => {
    const x = PAD + i * (w + gap);
    return `<rect x="${x}" y="${y}" width="${w}" height="76" rx="16" fill="${card}"/>
      <text x="${x + 14}" y="${y + 32}" font-family="${F}" font-size="20" font-weight="800" fill="${i === 0 ? primary : text}">${esc(s.value)}</text>
      <text x="${x + 14}" y="${y + 54}" font-family="${F}" font-size="11" font-weight="600" fill="${muted}">${esc(s.label)}</text>`;
  }).join("");
}

function listRows(doc: AiAppDoc, y0: number, max: number, rowH = 76): string {
  const { primary, card, text, muted } = doc.palette;
  return clampItems(doc.items, max).map((it, i) => {
    const y = y0 + i * (rowH + 12);
    const icon = it.emoji
      ? `<text x="${PAD + 30}" y="${y + rowH / 2 + 8}" text-anchor="middle" font-size="22">${esc(it.emoji)}</text>`
      : `<circle cx="${PAD + 30}" cy="${y + rowH / 2}" r="17" fill="${primary}" opacity="0.16"/><circle cx="${PAD + 30}" cy="${y + rowH / 2}" r="7" fill="${primary}"/>`;
    return `<rect x="${PAD}" y="${y}" width="${CW}" height="${rowH}" rx="16" fill="${card}"/>${icon}
      <text x="${PAD + 58}" y="${y + (it.subtitle ? 33 : rowH / 2 + 5)}" font-family="${F}" font-size="15" font-weight="700" fill="${text}">${esc(it.title)}</text>
      ${it.subtitle ? `<text x="${PAD + 58}" y="${y + 53}" font-family="${F}" font-size="12" font-weight="500" fill="${muted}">${esc(it.subtitle)}</text>` : ""}
      ${it.value ? `<text x="${PAD + CW - 16}" y="${y + rowH / 2 + 5}" text-anchor="end" font-family="${F}" font-size="14" font-weight="700" fill="${primary}">${esc(it.value)}</text>` : ""}`;
  }).join("");
}

function ctaButton(doc: AiAppDoc, y: number): string {
  if (!doc.cta) return "";
  const { primary } = doc.palette;
  return `<rect x="${PAD}" y="${y}" width="${CW}" height="56" rx="28" fill="${primary}"/>
    <text x="${SW / 2}" y="${y + 35}" text-anchor="middle" font-family="${F}" font-size="16" font-weight="700" fill="#ffffff">${esc(doc.cta)}</text>`;
}

export function renderAiApp(doc: AiAppDoc): string {
  const { primary, bg, card, text, muted } = doc.palette;
  const parts: string[] = [`<rect width="${SW}" height="${SH}" fill="${bg}"/>`, statusBar(text)];

  switch (doc.archetype) {
    case "onboarding": {
      parts.push(`<circle cx="${SW / 2}" cy="240" r="72" fill="${primary}" opacity="0.14"/>
        <circle cx="${SW / 2}" cy="240" r="44" fill="${primary}"/>
        <text x="${SW / 2}" y="256" text-anchor="middle" font-family="${F}" font-size="40" font-weight="800" fill="#ffffff">${esc(doc.appName.slice(0, 1).toUpperCase())}</text>
        <text x="${SW / 2}" y="382" text-anchor="middle" font-family="${F}" font-size="30" font-weight="800" fill="${text}" letter-spacing="-0.5">${esc(doc.header.title)}</text>`);
      if (doc.header.subtitle) parts.push(`<text x="${SW / 2}" y="414" text-anchor="middle" font-family="${F}" font-size="15" font-weight="500" fill="${muted}">${esc(doc.header.subtitle)}</text>`);
      parts.push(listRows({ ...doc, items: clampItems(doc.items, 3) }, 470, 3, 64), ctaButton(doc, SH - 150));
      break;
    }
    case "home-feed":
      parts.push(headerBlock(doc, 96), statCards(doc, 132), listRows(doc, (doc.stats?.length ? 232 : 140), 6));
      break;
    case "dashboard": {
      parts.push(headerBlock(doc, 96), statCards(doc, 132));
      const chartY = doc.stats?.length ? 232 : 140;
      const bars = [0.35, 0.6, 0.45, 0.8, 0.55, 0.95, 0.7];
      parts.push(`<rect x="${PAD}" y="${chartY}" width="${CW}" height="170" rx="16" fill="${card}"/>` +
        bars.map((h, i) => {
          const bw = 26; const gap = (CW - 40 - bars.length * bw) / (bars.length - 1);
          const x = PAD + 20 + i * (bw + gap); const bh = 120 * h;
          return `<rect x="${x}" y="${chartY + 150 - bh}" width="${bw}" height="${bh}" rx="8" fill="${primary}" opacity="${0.35 + 0.65 * h}"/>`;
        }).join(""));
      parts.push(listRows(doc, chartY + 190, 3));
      break;
    }
    case "list":
      parts.push(headerBlock(doc, 96),
        `<rect x="${PAD}" y="126" width="${CW}" height="44" rx="22" fill="${card}"/><circle cx="${PAD + 22}" cy="148" r="7" fill="none" stroke="${muted}" stroke-width="2.5"/><line x1="${PAD + 27}" y1="153" x2="${PAD + 32}" y2="158" stroke="${muted}" stroke-width="2.5" stroke-linecap="round"/><text x="${PAD + 44}" y="153" font-family="${F}" font-size="13.5" fill="${muted}">Search</text>`,
        listRows(doc, 190, 7));
      break;
    case "detail": {
      parts.push(`<rect x="${PAD}" y="80" width="${CW}" height="220" rx="20" fill="${primary}"/>
        <text x="${PAD + 22}" y="252" font-family="${F}" font-size="26" font-weight="800" fill="#ffffff" letter-spacing="-0.4">${esc(doc.header.title)}</text>`);
      if (doc.header.subtitle) parts.push(`<text x="${PAD + 22}" y="278" font-family="${F}" font-size="13.5" font-weight="500" fill="#ffffff" opacity="0.85">${esc(doc.header.subtitle)}</text>`);
      parts.push(statCards(doc, 322), listRows(doc, doc.stats?.length ? 422 : 322, 4), ctaButton(doc, SH - 150));
      break;
    }
    case "profile": {
      parts.push(`<circle cx="${SW / 2}" cy="150" r="46" fill="${primary}"/>
        <text x="${SW / 2}" y="164" text-anchor="middle" font-family="${F}" font-size="36" font-weight="800" fill="#ffffff">${esc((doc.header.title || doc.appName).slice(0, 1).toUpperCase())}</text>
        <text x="${SW / 2}" y="232" text-anchor="middle" font-family="${F}" font-size="22" font-weight="800" fill="${text}">${esc(doc.header.title)}</text>`);
      if (doc.header.subtitle) parts.push(`<text x="${SW / 2}" y="258" text-anchor="middle" font-family="${F}" font-size="13.5" fill="${muted}">${esc(doc.header.subtitle)}</text>`);
      parts.push(statCards(doc, 292), listRows(doc, doc.stats?.length ? 392 : 292, 4, 64));
      break;
    }
    case "settings":
      parts.push(headerBlock(doc, 96), listRows(doc, 140, 7, 64), ctaButton(doc, SH - 150));
      break;
    case "chat": {
      parts.push(`<text x="${SW / 2}" y="100" text-anchor="middle" font-family="${F}" font-size="17" font-weight="800" fill="${text}">${esc(doc.header.title)}</text>`);
      let y = 150;
      for (const [i, it] of clampItems(doc.items, 6).entries()) {
        const mine = i % 2 === 1;
        const w = Math.min(CW * 0.72, 60 + it.title.length * 7.6);
        const x = mine ? SW - PAD - w : PAD;
        parts.push(`<rect x="${x}" y="${y}" width="${w}" height="46" rx="20" fill="${mine ? primary : card}"/>
          <text x="${x + 18}" y="${y + 29}" font-family="${F}" font-size="14" font-weight="500" fill="${mine ? "#ffffff" : text}">${esc(it.title)}</text>`);
        y += 60;
      }
      parts.push(`<rect x="${PAD}" y="${SH - 140}" width="${CW}" height="48" rx="24" fill="${card}"/>
        <text x="${PAD + 20}" y="${SH - 110}" font-family="${F}" font-size="13.5" fill="${muted}">Message…</text>
        <circle cx="${PAD + CW - 24}" cy="${SH - 116}" r="17" fill="${primary}"/>`);
      break;
    }
  }

  parts.push(tabBar(doc));
  return parts.join("");
}
