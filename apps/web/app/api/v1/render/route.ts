import { NextRequest, NextResponse } from "next/server";
import { authorizeApiRequest, keyFromRequest } from "@/lib/server/apiKeys";
import { consumeDailyQuota, quotaSubject } from "@/lib/server/quota";
import { getRequestOwner } from "@/lib/server/requestOwner";

export const runtime = "nodejs";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const IMAGE_DATA_RE = /^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/;
const HEX_RE = /^#[0-9a-f]{6}$/i;

function number(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function color(value: unknown, fallback: string): string {
  return typeof value === "string" && HEX_RE.test(value) ? value : fallback;
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

/** without a key: enough to try it, not enough to build on */
const KEYLESS_PER_DAY = 50;

/**
 * Deterministic screenshot-card generation without a browser (the original
 * alpha endpoint). With a Pro API key it counts against the account's daily
 * API limit; without one, a small per-caller daily allowance.
 * The screenshot stays embedded in the returned SVG, making the result usable
 * from CI, scripts and no-code HTTP steps while the raster worker is built.
 */
export async function POST(req: NextRequest) {
  if (keyFromRequest(req)) {
    const auth = await authorizeApiRequest(req);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status, headers: cors });
  } else {
    const quota = await consumeDailyQuota(quotaSubject(req, await getRequestOwner(req)), "render-keyless", KEYLESS_PER_DAY);
    if (!quota.allowed) {
      return NextResponse.json({ error: `That's ${KEYLESS_PER_DAY} renders without a key today. Add a Pro API key for more: https://mockframe.app/developers/api` }, { status: 429, headers: cors });
    }
  }
  const raw = await req.text();
  if (raw.length > 3_500_000) return NextResponse.json({ error: "Request exceeds the 3.5 MB alpha limit." }, { status: 413, headers: cors });

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Send a JSON request body." }, { status: 400, headers: cors });
  }

  if (body.template !== "beautify-screenshot") {
    return NextResponse.json({ error: "Alpha supports template: beautify-screenshot." }, { status: 400, headers: cors });
  }
  const screenshot = typeof body.screenshot === "string" ? body.screenshot : "";
  if (!IMAGE_DATA_RE.test(screenshot)) {
    return NextResponse.json({ error: "screenshot must be a PNG, JPEG or WebP base64 data URL." }, { status: 400, headers: cors });
  }

  const width = Math.round(number(body.width, 1200, 320, 4096));
  const height = Math.round(number(body.height, 900, 320, 4096));
  const padding = Math.round(number(body.padding, 80, 0, Math.min(width, height) * 0.4));
  const radius = Math.round(number(body.radius, 24, 0, 240));
  const shadow = number(body.shadow, 0.32, 0, 0.8);
  const from = color(body.backgroundFrom, "#6d28d9");
  const to = color(body.backgroundTo, "#0e7490");
  const responseFormat = body.responseFormat === "json" ? "json" : "svg";
  const innerWidth = Math.max(1, width - padding * 2);
  const innerHeight = Math.max(1, height - padding * 2);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>` +
    `<clipPath id="clip"><rect x="${padding}" y="${padding}" width="${innerWidth}" height="${innerHeight}" rx="${radius}"/></clipPath>` +
    `<filter id="shadow" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="${Math.max(8, Math.round(padding * 0.16))}" stdDeviation="${Math.max(8, Math.round(padding * 0.16))}" flood-color="#050510" flood-opacity="${shadow}"/></filter></defs>` +
    `<rect width="${width}" height="${height}" fill="url(#bg)"/>` +
    `<rect x="${padding}" y="${padding}" width="${innerWidth}" height="${innerHeight}" rx="${radius}" fill="#fff" filter="url(#shadow)"/>` +
    `<image href="${screenshot}" x="${padding}" y="${padding}" width="${innerWidth}" height="${innerHeight}" preserveAspectRatio="xMidYMid meet" clip-path="url(#clip)"/>` +
    `</svg>`;

  if (responseFormat === "json") {
    return NextResponse.json({ mimeType: "image/svg+xml", width, height, data: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}` }, { headers: cors });
  }
  return new NextResponse(svg, { headers: { ...cors, "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "no-store" } });
}
