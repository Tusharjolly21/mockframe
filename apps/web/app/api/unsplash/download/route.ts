import { NextRequest, NextResponse } from "next/server";
import { triggerDownload, UnsplashError } from "@/lib/server/unsplash";

/**
 * POST /api/unsplash/download { location } — registers the download with
 * Unsplash (required by their API guidelines when a photo is USED) and returns
 * the real image URL. The client then fetches that URL to bake the photo into
 * the scene. Server-side so the access key stays confidential.
 */

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const location = typeof body?.location === "string" ? body.location : "";
  if (!location) return NextResponse.json({ error: "Missing download location" }, { status: 400 });
  try {
    const url = await triggerDownload(location);
    return NextResponse.json({ url });
  } catch (err) {
    const status = err instanceof UnsplashError ? err.status : 500;
    const message = err instanceof UnsplashError ? err.message : "Download failed";
    return NextResponse.json({ error: message }, { status });
  }
}
