import { NextRequest, NextResponse } from "next/server";
import { requestIsPro } from "@/lib/server/entitlement";
import { consumeDailyQuota, quotaSubject } from "@/lib/server/quota";
import { attachOwnerCookie, getRequestOwner } from "@/lib/server/requestOwner";
import { launchBrowser } from "@/lib/server/browser";
import { assertPublicTarget, capturePng, MAX_DELAY } from "@/lib/server/capturePage";

export const runtime = "nodejs";
// cold start downloads the ~66MB chromium pack before any page work — with a
// slow page on top, 60s wasn't enough (504s). Fluid compute allows 300s.
export const maxDuration = 120;

/**
 * Website URL → screenshot: POST { url, dark?, fullPage?, loadLazy?, width?,
 * delay? } → PNG. Runs headless Chromium — @sparticuz/chromium on
 * Vercel, the local Chrome / Playwright shell in dev.
 */

/** free website captures per caller per UTC day — generous enough that a real
 *  user never notices, low enough that a script can't run up the bill */
const FREE_CAPTURES_PER_DAY = 25;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { url, dark = false, fullPage = false, loadLazy = true, width = 1440, delay = 0 } = body ?? {};

  const isPro = await requestIsPro(req);

  // standard captures stay free; FULL-PAGE runs ride the 120s function ceiling
  // and are Pro-only, enforced here (UI lock is courtesy)
  if (fullPage && !isPro) {
    return NextResponse.json({ error: "Full-page capture is a Pro feature — upgrade to use it" }, { status: 402 });
  }

  // Every capture boots headless Chromium on our bill, so the free tier is
  // metered rather than paywalled — URL capture is a hook worth keeping open
  // (PostSpark gives it away), but not worth handing to a shell loop.
  // Pro is unmetered: they're paying for the compute.
  if (!isPro) {
    const owner = await getRequestOwner(req);
    const quota = await consumeDailyQuota(quotaSubject(req, owner), "capture", FREE_CAPTURES_PER_DAY);
    if (!quota.allowed) {
      return attachOwnerCookie(
        NextResponse.json(
          {
            error: `Free plan covers ${quota.limit} website captures a day. Upgrade for unlimited, or try again tomorrow.`,
          },
          { status: 429 }
        ),
        owner
      );
    }
  }

  let target: URL;
  try {
    target = new URL(typeof url === "string" && !/^https?:\/\//i.test(url) ? `https://${url}` : url);
  } catch {
    return NextResponse.json({ error: "Enter a valid URL" }, { status: 400 });
  }
  try {
    await assertPublicTarget(target);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "This host can't be captured" }, { status: 400 });
  }
  const viewportWidth = Math.min(2560, Math.max(320, Number(width) || 1440));
  const settleDelay = Math.min(MAX_DELAY, Math.max(0, Number(delay) || 0));

  let browser: Awaited<ReturnType<typeof launchBrowser>> | null = null;
  try {
    browser = await launchBrowser();
    const png = await capturePng(browser, { target, dark, fullPage, loadLazy: Boolean(loadLazy), viewportWidth, settleDelay });
    return new NextResponse(Buffer.from(png), {
      headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[capture]", target.href, err);
    const msg = err instanceof Error && /timeout/i.test(err.message) ? "The page took too long to load" : "Couldn't capture that page";
    return NextResponse.json({ error: msg }, { status: 502 });
  } finally {
    await browser?.close().catch(() => {});
  }
}
