"use client";

import { renderToStaticMarkup } from "react-dom/server";
import { SiApple, SiGoogleplay } from "@icons-pack/react-simple-icons";

/**
 * App-store download badges (user request): "Download on the App Store",
 * "GET IT ON Google Play", "Get it from Microsoft Store" — generated as
 * crisp SVG data-URL stickers in dark & light variants. Brand glyphs come
 * from simple-icons at runtime (Microsoft's was removed from that set, so
 * its classic four-pane window is drawn inline — four rects).
 */

const MS_WINDOW_PATH = "M3 3h8.6v8.6H3zM12.4 3H21v8.6h-8.6zM3 12.4h8.6V21H3zM12.4 12.4H21V21h-8.6z";

function glyphOf(el: React.ReactElement): string {
  return renderToStaticMarkup(el).match(/ d="([^"]+)"/)?.[1] ?? "";
}

export interface StoreBadge {
  id: string;
  label: string;
  top: string;
  bottom: string;
  glyph: () => string;
}

export const STORE_BADGES: StoreBadge[] = [
  { id: "appstore", label: "App Store badge", top: "Download on the", bottom: "App Store", glyph: () => glyphOf(<SiApple />) },
  { id: "playstore", label: "Google Play badge", top: "GET IT ON", bottom: "Google Play", glyph: () => glyphOf(<SiGoogleplay />) },
  { id: "msstore", label: "Microsoft Store badge", top: "Get it from", bottom: "Microsoft Store", glyph: () => MS_WINDOW_PATH },
];

export const BADGE_W = 960;
export const BADGE_H = 284;

/** 960×284 badge as an SVG data URL (2× for crispness at typical sizes). */
export function badgeDataUrl(id: string, variant: "dark" | "light"): string | null {
  const b = STORE_BADGES.find((x) => x.id === id);
  if (!b) return null;
  const fg = variant === "dark" ? "#ffffff" : "#101014";
  const bg = variant === "dark" ? "#000000" : "#ffffff";
  const stroke = variant === "dark" ? "#a6a6a6" : "#1a1a1e";
  const font = "-apple-system, 'Helvetica Neue', Inter, Arial, sans-serif";
  // longer store names get slightly smaller title type so everything fits
  const bottomFs = b.bottom.length > 12 ? 74 : 86;
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${BADGE_W}' height='${BADGE_H}' viewBox='0 0 ${BADGE_W} ${BADGE_H}'>` +
    `<rect x='4' y='4' width='${BADGE_W - 8}' height='${BADGE_H - 8}' rx='44' fill='${bg}' stroke='${stroke}' stroke-width='4'/>` +
    `<g transform='translate(74,${BADGE_H / 2 - 66}) scale(5.5)'><path d='${b.glyph()}' fill='${fg}'/></g>` +
    `<text x='236' y='112' font-family="${font}" font-size='42' font-weight='500' fill='${fg}'>${b.top}</text>` +
    `<text x='232' y='208' font-family="${font}" font-size='${bottomFs}' font-weight='650' letter-spacing='-1' fill='${fg}'>${b.bottom}</text>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
