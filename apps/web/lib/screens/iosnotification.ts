"use client";

import { esc, textBlock, wrapText, systemFont } from "./common";
import type { IosNotificationDoc } from "./types";

/* An iOS notification. Standalone it is one frosted banner with the edges of
   two more notifications peeking out underneath (the lock-screen stack);
   inside a phone it is a lock screen with three stacked notifications. */

const W = 402;
const CARD_X = 14;
const CARD_W = W - CARD_X * 2;
const PAD = 15;
const AV = 42;
const TEXT_X = PAD + AV + 12;
const BODY_SIZE = 14.5;
const BODY_LH = 19;
/** how far the stacked cards behind peek out below the banner */
const STACK = 16;

interface Item {
  title: string;
  subtitle?: string;
  body: string;
  time: string;
  appName: string;
}

function bodyLines(item: Item): string[] {
  const lines = wrapText(item.body, BODY_SIZE, CARD_W - TEXT_X - PAD);
  return lines.length > 4 ? [...lines.slice(0, 3), `${lines[3].replace(/\s+\S*$/, "")}…`] : lines;
}

function cardHeight(item: Item): number {
  return PAD + 18 + (item.subtitle ? 19 : 0) + bodyLines(item).length * BODY_LH + PAD - 2;
}

export function iosNotificationSize(doc: IosNotificationDoc): { width: number; height: number } {
  return { width: W, height: Math.round(cardHeight(doc) + 14 * 2 + STACK) };
}

export function renderIosNotification(doc: IosNotificationDoc, avatarUrl?: string, appIconUrl?: string): string {
  const dark = !!doc.dark;
  const font = systemFont("ios");
  const ink = dark ? "#ffffff" : "#0b0b0d";
  const sub = dark ? "rgba(235,235,245,0.6)" : "rgba(60,60,67,0.6)";
  const bodyInk = dark ? "rgba(255,255,255,0.86)" : "rgba(0,0,0,0.82)";

  const card = (x: number, y: number, item: Item, key: string, withStack: boolean, photo?: string) => {
    const h = cardHeight(item);
    const lines = bodyLines(item);
    const ax = x + PAD;
    const ay = y + PAD;
    const initial = esc([...item.title.trim()][0]?.toUpperCase() ?? "•");
    const fillTop = dark ? "rgba(58,58,64,0.9)" : "rgba(255,255,255,0.94)";
    const fillBottom = dark ? "rgba(36,36,40,0.88)" : "rgba(246,246,250,0.86)";
    const stack = withStack
      ? `<rect x="${x + 22}" y="${y + h - 22 + STACK}" width="${CARD_W - 44}" height="22" rx="16" fill="${dark ? "rgba(44,44,48,0.55)" : "rgba(255,255,255,0.42)"}" stroke="${dark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.5)"}" stroke-width="0.6"/>` +
        `<rect x="${x + 10}" y="${y + h - 22 + STACK / 2}" width="${CARD_W - 20}" height="22" rx="19" fill="${dark ? "rgba(48,48,52,0.72)" : "rgba(255,255,255,0.62)"}" stroke="${dark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.6)"}" stroke-width="0.6"/>`
      : "";
    const avatar = photo
      ? `<image href="${photo}" x="${ax}" y="${ay}" width="${AV}" height="${AV}" preserveAspectRatio="xMidYMid slice" clip-path="url(#nav-${key})"/>`
      : `<circle cx="${ax + AV / 2}" cy="${ay + AV / 2}" r="${AV / 2}" fill="url(#ngr-${key})"/>` +
        `<text x="${ax + AV / 2}" y="${ay + AV / 2 + 6}" font-family="${font}" font-size="17" font-weight="600" fill="#ffffff" text-anchor="middle">${initial}</text>`;
    // app badge: the uploaded app icon, or a Messages-style green bubble
    const bx = ax + AV - 13;
    const by = ay + AV - 13;
    const badge = appIconUrl
      ? `<rect x="${bx - 1.5}" y="${by - 1.5}" width="20" height="20" rx="6" fill="${dark ? "#2c2c30" : "#ffffff"}"/>` +
        `<image href="${appIconUrl}" x="${bx}" y="${by}" width="17" height="17" preserveAspectRatio="xMidYMid slice" clip-path="url(#nbd-${key})"/>`
      : `<rect x="${bx - 1.5}" y="${by - 1.5}" width="20" height="20" rx="6" fill="${dark ? "#2c2c30" : "#ffffff"}"/>` +
        `<rect x="${bx}" y="${by}" width="17" height="17" rx="4.6" fill="url(#ngb-${key})"/>` +
        `<path d="M${bx + 8.5} ${by + 4.2}c-2.9 0-5.1 1.8-5.1 4.1 0 1.2.6 2.3 1.6 3.1l-.5 1.9 2.2-1.1c.6.2 1.2.3 1.8.3 2.9 0 5.1-1.8 5.1-4.2s-2.2-4.1-5.1-4.1Z" fill="#ffffff"/>`;
    return `
<defs>
  <linearGradient id="nfill-${key}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${fillTop}"/><stop offset="1" stop-color="${fillBottom}"/></linearGradient>
  <linearGradient id="ngr-${key}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a5b4fc"/><stop offset="1" stop-color="#6366f1"/></linearGradient>
  <linearGradient id="ngb-${key}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5cf777"/><stop offset="1" stop-color="#0ebd38"/></linearGradient>
  <filter id="nsh-${key}" x="-15%" y="-30%" width="130%" height="180%"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#0a0a1e" flood-opacity="${dark ? 0.45 : 0.16}"/></filter>
  <clipPath id="nav-${key}"><circle cx="${ax + AV / 2}" cy="${ay + AV / 2}" r="${AV / 2}"/></clipPath>
  <clipPath id="nbd-${key}"><rect x="${bx}" y="${by}" width="17" height="17" rx="4.6"/></clipPath>
</defs>
${stack}
<rect x="${x}" y="${y}" width="${CARD_W}" height="${h}" rx="24" fill="url(#nfill-${key})" filter="url(#nsh-${key})"/>
<rect x="${x + 0.5}" y="${y + 0.5}" width="${CARD_W - 1}" height="${h - 1}" rx="23.5" fill="none" stroke="${dark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.9)"}" stroke-width="1"/>
${avatar}
${badge}
<text x="${x + TEXT_X}" y="${y + PAD + 14}" font-family="${font}" font-size="15" font-weight="650" fill="${ink}" letter-spacing="-0.2">${esc(item.title)}</text>
<text x="${x + CARD_W - PAD}" y="${y + PAD + 14}" font-family="${font}" font-size="13" fill="${sub}" text-anchor="end">${esc(item.time)}</text>
${item.subtitle ? `<text x="${x + TEXT_X}" y="${y + PAD + 33}" font-family="${font}" font-size="${BODY_SIZE}" font-weight="600" fill="${ink}" letter-spacing="-0.15">${esc(item.subtitle)}</text>` : ""}
${textBlock(lines, { font, x: x + TEXT_X, y: y + PAD + 33 + (item.subtitle ? 19 : 0), size: BODY_SIZE, lineHeight: BODY_LH, color: bodyInk })}`;
  };

  if (doc.standalone) return card(CARD_X, 14, doc, "s", true, avatarUrl);

  // lock screen: wallpaper, date + clock, a stack of three notifications
  const H = 874;
  const others: Item[] = [
    { title: "Ashley Rico", subtitle: "To you & Dawn Ramirez", body: "Want to come over for dinner tonight? We're grilling and the kids are baking cookies.", time: "2m ago", appName: "Messages" },
    { title: "Meri Alvarez", subtitle: "Family reunion", body: "So excited to see everyone at the reunion next week!", time: "8m ago", appName: "Messages" },
  ];
  const first: Item = { ...doc, title: doc.title || "Armando Cajide", body: doc.body || "Anyone up for powerlifting this weekend?", time: doc.time || "now" };
  let y = 268;
  let cards = "";
  [first, ...others].forEach((item, i) => {
    cards += card(CARD_X, y, item, `l${i}`, false, i === 0 ? avatarUrl : undefined);
    y += cardHeight(item) + 10;
  });
  const glass = dark ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.32)";
  const wall = dark ? ["#1b2140", "#0d0f1f", "#05060c"] : ["#9fb8ff", "#c9b8f5", "#f6d4e4"];
  return `
<defs>
  <linearGradient id="lock-bg" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="${wall[0]}"/><stop offset="0.55" stop-color="${wall[1]}"/><stop offset="1" stop-color="${wall[2]}"/></linearGradient>
  <radialGradient id="lock-glow" cx="0.8" cy="0.15" r="0.7"><stop offset="0" stop-color="${dark ? "#4f46e5" : "#ffffff"}" stop-opacity="0.45"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#lock-bg)"/>
<rect width="${W}" height="${H}" fill="url(#lock-glow)"/>
<text x="${W / 2}" y="128" font-family="${font}" font-size="20" font-weight="600" fill="${dark ? "#ffffff" : "#1b1b2f"}" fill-opacity="0.85" text-anchor="middle">Tuesday, April 1</text>
<text x="${W / 2}" y="218" font-family="${font}" font-size="92" font-weight="600" fill="${dark ? "#ffffff" : "#1b1b2f"}" fill-opacity="0.9" text-anchor="middle" letter-spacing="-3">9:41</text>
${cards}
<circle cx="52" cy="800" r="25" fill="${glass}"/>
<path d="M47 789h10l-1.6 6.5v11.5h-6.8v-11.5Z" fill="none" stroke="${dark ? "#ffffff" : "#1b1b2f"}" stroke-width="1.7" stroke-linejoin="round"/>
<circle cx="${W - 52}" cy="800" r="25" fill="${glass}"/>
<rect x="${W - 63}" y="792" width="22" height="16" rx="4" fill="none" stroke="${dark ? "#ffffff" : "#1b1b2f"}" stroke-width="1.7"/>
<circle cx="${W - 52}" cy="800" r="4.2" fill="none" stroke="${dark ? "#ffffff" : "#1b1b2f"}" stroke-width="1.7"/>
<rect x="${W / 2 - 67}" y="857" width="134" height="5" rx="2.5" fill="${dark ? "#ffffff" : "#1b1b2f"}" opacity="0.5"/>`;
}
