import { NextRequest, NextResponse } from "next/server";
import { renderMockup, MockuuupsError } from "@/lib/server/mockuuups";
import { requestIsPro } from "@/lib/server/entitlement";

/**
 * POST /api/mockuuups/render  { mockup, imageUrl, size? }
 * Composites the caller's image (a public URL — the browser first uploads the
 * screenshot via /api/assets to get a signed Firebase URL) into a Mockuuups
 * device photo and returns the finished CDN image URL. Each render spends a
 * credit; size>1000 spends one more; 402 → out of credits.
 */

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // renders spend real API credits — Pro only, enforced here (UI gate is courtesy)
  if (!(await requestIsPro(req))) {
    return NextResponse.json({ error: "Realistic renders are a Pro feature — upgrade to use them" }, { status: 402 });
  }
  let body: { mockup?: unknown; imageUrl?: unknown; size?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const mockup = typeof body.mockup === "string" ? body.mockup : "";
  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl : "";
  const size = Math.min(4000, Math.max(200, Number(body.size) || 1000));
  if (!mockup) return NextResponse.json({ error: "mockup is required" }, { status: 400 });
  if (!/^https?:\/\//.test(imageUrl)) return NextResponse.json({ error: "imageUrl must be a public http(s) URL" }, { status: 400 });

  try {
    const { dataUrl, cost } = await renderMockup(mockup, imageUrl, size);
    return NextResponse.json({ url: dataUrl, cost });
  } catch (err) {
    if (err instanceof MockuuupsError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Render failed" }, { status: 500 });
  }
}
