import { NextRequest, NextResponse } from "next/server";

/**
 * Same-origin image proxy for post imports — the browser can't fetch
 * pbs.twimg.com etc. directly (CORS), the server can. Host-whitelisted so
 * this can't be abused as an open proxy.
 */

export const runtime = "nodejs";

const ALLOWED_HOSTS = new Set([
  "pbs.twimg.com",
  "ton.twimg.com",
  "video.twimg.com",
  "cdn.bsky.app",
  "avatars.githubusercontent.com",
]);

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url") ?? "";
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return NextResponse.json({ error: "Bad URL" }, { status: 400 });
  }
  if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname)) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 403 });
  }
  let r: Response;
  try {
    r = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  } catch {
    return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
  }
  if (!r.ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const type = r.headers.get("content-type") ?? "image/jpeg";
  if (!type.startsWith("image/")) return NextResponse.json({ error: "Not an image" }, { status: 415 });
  return new NextResponse(r.body, {
    headers: { "content-type": type, "cache-control": "public, max-age=3600" },
  });
}
