import { after, NextRequest, NextResponse } from "next/server";
import { FirebaseConfigError } from "@/lib/server/firebaseAdmin";
import { checkHook, runRefresh } from "@/lib/server/packRefresh";
import { looksLikeHookToken } from "@/lib/pack/deployRefresh";

export const runtime = "nodejs";
// the captures run after the response (see `after` below) and share this budget:
// a cold Chromium start plus up to 10 pages
export const maxDuration = 300;

/**
 * Deploy webhook for a screenshot pack: call it from CI after a production
 * deploy (`curl -X POST <link>`), or paste it as a "deploy succeeded"
 * notification URL. It answers 202 right away and re-captures the pack's
 * source-URL screens in the background; the studio applies the new
 * screenshots the next time the pack is opened. The link is the credential —
 * rotate it in the studio if it leaks.
 */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  if (!looksLikeHookToken(token)) return NextResponse.json({ error: "Unknown or revoked refresh link" }, { status: 404 });
  try {
    const job = await checkHook(token);
    if (!job.ok) return NextResponse.json({ error: job.error }, { status: job.status });
    after(async () => {
      try {
        await runRefresh(token, job);
      } catch (err) {
        console.error("[pack-refresh] run failed", err);
      }
    });
    return NextResponse.json(
      { accepted: true, screens: job.screens.length, message: "Refreshing in the background — open the pack in MockFrame to see the new screenshots." },
      { status: 202 }
    );
  } catch (err) {
    if (err instanceof FirebaseConfigError) return NextResponse.json({ error: "Not configured" }, { status: 501 });
    console.error("[pack-refresh]", err);
    return NextResponse.json({ error: "Refresh failed to start" }, { status: 500 });
  }
}

/** A browser visit or a GET-only notifier gets told what to do instead of a 405. */
export function GET() {
  return NextResponse.json({ error: "Use POST — e.g. curl -X POST <this link>" }, { status: 405 });
}
