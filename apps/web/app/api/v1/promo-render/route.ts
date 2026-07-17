import { NextRequest, NextResponse } from "next/server";
import { requestIsPro } from "@/lib/server/entitlement";
import { consumeDailyQuota, quotaSubject } from "@/lib/server/quota";
import { getRequestOwner } from "@/lib/server/requestOwner";
import { FORMAT_DIMENSIONS } from "@/lib/promo/types";
import { getPromoTemplate } from "@/lib/promo/registry";
import type { PromoInputProps } from "@/lib/promo/inputProps";
import { PromoRenderRequestSchema } from "@/lib/promo/renderRequest";
import { renderPromo } from "@/lib/promo/render.server";

/**
 * POST /api/v1/promo-render — render a promo video to MP4 (H.264).
 *
 * Pro-only and enforced here (the editor gate is a courtesy). Renders cost real
 * compute — Lambda in production, a local headless render in dev — so a daily
 * per-caller quota guards the bill. Returns either the MP4 bytes (local render)
 * or `{ url }` to an S3 object (Lambda).
 */

export const runtime = "nodejs";
// Lambda renders finish in ~30-90s; the route awaits completion. Local dev
// renders can take a bit longer but aren't bound by this ceiling.
export const maxDuration = 300;

const PROMO_RENDERS_PER_DAY = 40;

export async function POST(req: NextRequest) {
  if (!(await requestIsPro(req))) {
    return NextResponse.json({ error: "Promo video export is a Pro feature — upgrade to download MP4s" }, { status: 402 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = PromoRenderRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }
  const { templateId, deviceId, screenshots, texts, accent, background, format } = parsed.data;

  const template = getPromoTemplate(templateId);
  if (!template) {
    return NextResponse.json({ error: `Unknown template: ${templateId}` }, { status: 400 });
  }

  // cost guard
  const owner = await getRequestOwner(req);
  const quota = await consumeDailyQuota(quotaSubject(req, owner), "promo-render", PROMO_RENDERS_PER_DAY);
  if (!quota.allowed) {
    return NextResponse.json({ error: `Daily render limit reached (${quota.limit}). Try again tomorrow.` }, { status: 429 });
  }

  const dims = FORMAT_DIMENSIONS[format];
  const inputProps: PromoInputProps = {
    deviceId,
    screenshots: screenshots.map((s) => ({ url: s.dataUrl, width: s.width, height: s.height })),
    texts,
    accent,
    background,
    watermark: false, // paid render
    musicUrl: null,
    width: dims.width,
    height: dims.height,
  };

  try {
    const result = await renderPromo({ templateId, inputProps });
    if (result.kind === "url") {
      return NextResponse.json({ url: result.url });
    }
    const filename = `mockframe-promo-${format.replace(":", "x")}.mp4`;
    return new Response(new Uint8Array(result.data), {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Render failed";
    return NextResponse.json({ error: `Render failed: ${message}` }, { status: 500 });
  }
}
