import { NextRequest, NextResponse } from "next/server";
import { importPost, PostImportError } from "@/lib/server/postImport";

export const runtime = "nodejs";

/** GET /api/post?url=… — a public post from X, Bluesky, Threads, LinkedIn or Mastodon, ready for the post card. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url")?.slice(0, 2_000) ?? "";
  if (!url.trim()) return NextResponse.json({ error: "Paste a public post link first" }, { status: 400 });
  try {
    const post = await importPost(url);
    return NextResponse.json(post, { headers: { "cache-control": "private, max-age=60" } });
  } catch (error) {
    if (error instanceof PostImportError) return NextResponse.json({ error: error.message }, { status: 422 });
    console.error("[post import]", error);
    return NextResponse.json({ error: "That post couldn't be imported — check the link and try again" }, { status: 502 });
  }
}
