import { NextRequest, NextResponse } from "next/server";
import { hasUnsplashKey, searchPhotos, UnsplashError } from "@/lib/server/unsplash";

/**
 * GET /api/unsplash?q=<query>&page=<n> — proxied Unsplash photo search / feed.
 * Keeps the access key server-side. When no key is configured it returns
 * { configured: false } so the client falls back to its curated set instead of
 * erroring.
 */

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!hasUnsplashKey()) {
    return NextResponse.json({ configured: false, photos: [], totalPages: 0 });
  }
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const page = Math.max(1, Math.min(50, Number(req.nextUrl.searchParams.get("page")) || 1));
  try {
    const { photos, totalPages } = await searchPhotos(q, page);
    return NextResponse.json({ configured: true, photos, totalPages });
  } catch (err) {
    const status = err instanceof UnsplashError ? err.status : 500;
    const message = err instanceof UnsplashError ? err.message : "Unsplash search failed";
    return NextResponse.json({ configured: true, error: message, photos: [], totalPages: 0 }, { status });
  }
}
