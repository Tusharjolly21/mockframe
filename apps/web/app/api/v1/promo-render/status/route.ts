import { NextRequest, NextResponse } from "next/server";
import { requestIsPro } from "@/lib/server/entitlement";
import { getPromoRenderProgress, lambdaConfigured } from "@/lib/promo/render.server";

/** GET /api/v1/promo-render/status?renderId=..&bucket=.. — poll a cloud render. */
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await requestIsPro(req))) {
    return NextResponse.json({ error: "Pro required" }, { status: 402 });
  }
  if (!lambdaConfigured()) {
    return NextResponse.json({ error: "Cloud rendering is not configured" }, { status: 501 });
  }
  const renderId = req.nextUrl.searchParams.get("renderId") ?? "";
  const bucket = req.nextUrl.searchParams.get("bucket") ?? "";
  if (!/^[a-zA-Z0-9-]{6,64}$/.test(renderId) || !bucket.startsWith("remotionlambda-")) {
    return NextResponse.json({ error: "Invalid render reference" }, { status: 400 });
  }
  try {
    const progress = await getPromoRenderProgress(renderId, bucket);
    return NextResponse.json(progress);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Status failed" }, { status: 500 });
  }
}
