import { NextRequest, NextResponse } from "next/server";

/**
 * X (Twitter) post import — server-side proxy over the public fxtwitter API
 * (X's own API is auth-only, so the browser can't do this client-side).
 * GET /api/xpost?url=https://x.com/user/status/123 → normalized post JSON.
 */

export const runtime = "nodejs";

function compact(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "0";
  if (n < 10_000) return n.toLocaleString("en-US");
  if (n < 1_000_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url") ?? "";
  const m = url.match(/(?:twitter|x)\.com\/([^/]+)\/status\/(\d+)/i);
  if (!m) return NextResponse.json({ error: "Paste an x.com/…/status/… link" }, { status: 400 });

  let r: Response;
  try {
    r = await fetch(`https://api.fxtwitter.com/status/${m[2]}`, {
      headers: { "user-agent": "MockFrame/1.0 (+https://mockframe.app)" },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return NextResponse.json({ error: "Upstream fetch failed — try again" }, { status: 502 });
  }
  if (!r.ok) return NextResponse.json({ error: "Post not found — is it public?" }, { status: 404 });

  const j = (await r.json()) as {
    tweet?: {
      text?: string;
      created_timestamp?: number;
      replies?: number;
      retweets?: number;
      likes?: number;
      views?: number | null;
      author?: { name?: string; screen_name?: string; avatar_url?: string };
      media?: { photos?: { url: string }[] };
    };
  };
  const t = j.tweet;
  if (!t) return NextResponse.json({ error: "Post not found — is it public?" }, { status: 404 });

  const d = t.created_timestamp ? new Date(t.created_timestamp * 1000) : null;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return NextResponse.json({
    name: t.author?.name ?? "X",
    handle: t.author?.screen_name ?? "x",
    text: t.text ?? "",
    date: d ? `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}` : "",
    views: compact(t.views ?? 0),
    replies: t.replies ?? 0,
    reposts: t.retweets ?? 0,
    likes: t.likes ?? 0,
    avatar: t.author?.avatar_url ?? null,
    photos: (t.media?.photos ?? []).map((p) => p.url).slice(0, 4),
  });
}
