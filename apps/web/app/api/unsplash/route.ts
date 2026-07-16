import { NextRequest, NextResponse } from "next/server";
import { hasUnsplashKey, searchPhotos, UnsplashError } from "@/lib/server/unsplash";
import { requestIsPro } from "@/lib/server/entitlement";
import { consumeDailyQuota, quotaSubject } from "@/lib/server/quota";
import { attachOwnerCookie, getRequestOwner } from "@/lib/server/requestOwner";

/**
 * GET /api/unsplash?q=<query>&page=<n> — proxied Unsplash photo search / feed.
 * Keeps the access key server-side. When no key is configured it returns
 * { configured: false } so the client falls back to its curated set instead of
 * erroring.
 *
 * Metered per caller/day: our whole app shares one Unsplash rate limit (demo
 * 50/hr), so an unmetered proxy is a cheap third-party DoS. Pro is unmetered.
 */

export const runtime = "nodejs";

const FREE_UNSPLASH_CALLS_PER_DAY = 120;

export async function GET(req: NextRequest) {
  if (!hasUnsplashKey()) {
    return NextResponse.json({ configured: false, photos: [], totalPages: 0 });
  }
  const owner = await getRequestOwner(req);
  if (!(await requestIsPro(req))) {
    const quota = await consumeDailyQuota(quotaSubject(req, owner), "unsplash", FREE_UNSPLASH_CALLS_PER_DAY);
    if (!quota.allowed) {
      return attachOwnerCookie(
        NextResponse.json({ configured: true, error: "Too many photo searches today — try again tomorrow", photos: [], totalPages: 0 }, { status: 429 }),
        owner
      );
    }
  }
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const page = Math.max(1, Math.min(50, Number(req.nextUrl.searchParams.get("page")) || 1));
  try {
    const { photos, totalPages } = await searchPhotos(q, page);
    return attachOwnerCookie(NextResponse.json({ configured: true, photos, totalPages }), owner);
  } catch (err) {
    const status = err instanceof UnsplashError ? err.status : 500;
    const message = err instanceof UnsplashError ? err.message : "Unsplash search failed";
    return NextResponse.json({ configured: true, error: message, photos: [], totalPages: 0 }, { status });
  }
}
