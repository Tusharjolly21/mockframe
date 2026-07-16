import { NextRequest, NextResponse } from "next/server";
import { triggerDownload, UnsplashError } from "@/lib/server/unsplash";
import { requestIsPro } from "@/lib/server/entitlement";
import { consumeDailyQuota, quotaSubject } from "@/lib/server/quota";
import { attachOwnerCookie, getRequestOwner } from "@/lib/server/requestOwner";

/**
 * POST /api/unsplash/download { location } — registers the download with
 * Unsplash (required by their API guidelines when a photo is USED) and returns
 * the real image URL. The client then fetches that URL to bake the photo into
 * the scene. Server-side so the access key stays confidential.
 *
 * Metered per caller/day (shared with search) — each call hits Unsplash and
 * counts against our rate limit. Pro is unmetered.
 */

export const runtime = "nodejs";

const FREE_UNSPLASH_CALLS_PER_DAY = 120;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const location = typeof body?.location === "string" ? body.location : "";
  if (!location) return NextResponse.json({ error: "Missing download location" }, { status: 400 });
  const owner = await getRequestOwner(req);
  if (!(await requestIsPro(req))) {
    const quota = await consumeDailyQuota(quotaSubject(req, owner), "unsplash", FREE_UNSPLASH_CALLS_PER_DAY);
    if (!quota.allowed) {
      return attachOwnerCookie(NextResponse.json({ error: "Too many downloads today — try again tomorrow" }, { status: 429 }), owner);
    }
  }
  try {
    const url = await triggerDownload(location);
    return attachOwnerCookie(NextResponse.json({ url }), owner);
  } catch (err) {
    const status = err instanceof UnsplashError ? err.status : 500;
    const message = err instanceof UnsplashError ? err.message : "Download failed";
    return NextResponse.json({ error: message }, { status });
  }
}
