import { NextRequest, NextResponse } from "next/server";
import type { Page } from "puppeteer-core";
import { requestIsPro } from "@/lib/server/entitlement";
import { consumeDailyQuota, quotaSubject } from "@/lib/server/quota";
import { attachOwnerCookie, getRequestOwner } from "@/lib/server/requestOwner";
import { launchBrowser } from "@/lib/server/browser";
import { assertPublicUrl, isBlockedAddress } from "@/lib/server/ssrf";

export const runtime = "nodejs";
// cold start downloads the ~66MB chromium pack before any page work — with a
// slow page on top, 60s wasn't enough (504s). Fluid compute allows 300s.
export const maxDuration = 120;

/**
 * Website URL → screenshot: POST { url, dark?, fullPage?, loadLazy?, width?,
 * delay? } → PNG. Runs headless Chromium — @sparticuz/chromium on
 * Vercel, the local Chrome / Playwright shell in dev.
 */

const MAX_DELAY = 10_000;
const MAX_PAGE_HEIGHT = 8_000; // cap full-page captures — some pages are endless
/** free website captures per caller per UTC day — generous enough that a real
 *  user never notices, low enough that a script can't run up the bill */
const FREE_CAPTURES_PER_DAY = 25;

/** Scheme, hostname and DNS checks shared with the other server-side fetchers (lib/server/ssrf.ts). */
async function assertPublicTarget(target: URL): Promise<void> {
  if (target.protocol !== "https:" && target.protocol !== "http:") throw new Error("Only http(s) URLs are supported");
  try {
    await assertPublicUrl(target);
  } catch {
    throw new Error("This host can't be captured");
  }
}

/** Everything a page may load besides http(s): inline data and blobs, never file:, ftp:, ws: and friends. */
const INLINE_SCHEMES = new Set(["data:", "blob:", "about:"]);

async function protectPageRequests(page: Page): Promise<{ reachedInternal: () => boolean }> {
  let internalHit = false;
  // the DNS check above and Chromium's own lookup are two lookups, so a rebinding
  // name can pass the first and land on an internal address in the second.
  // Judge the address each response actually came from.
  page.on("response", (response) => {
    const ip = response.remoteAddress().ip;
    if (ip && isBlockedAddress(ip)) internalHit = true;
  });
  const decisions = new Map<string, Promise<boolean>>();
  const hostIsPublic = (hostname: string) => {
    const key = hostname.toLowerCase();
    let decision = decisions.get(key);
    if (!decision) {
      decision = assertPublicTarget(new URL(`https://${hostname}`)).then(() => true, () => false);
      decisions.set(key, decision);
    }
    return decision;
  };

  await page.setRequestInterception(true);
  page.on("request", (request) => {
    void (async () => {
      try {
        const requestUrl = new URL(request.url());
        if (requestUrl.protocol !== "http:" && requestUrl.protocol !== "https:" && !INLINE_SCHEMES.has(requestUrl.protocol)) {
          await request.abort("blockedbyclient");
          return;
        }
        if ((requestUrl.protocol === "http:" || requestUrl.protocol === "https:") && !(await hostIsPublic(requestUrl.hostname))) {
          await request.abort("blockedbyclient");
          return;
        }
        await request.continue();
      } catch {
        await request.abort("blockedbyclient").catch(() => {});
      }
    })();
  });
  return { reachedInternal: () => internalHit };
}

async function preparePageContent(page: Page, loadLazy: boolean): Promise<number> {
  return page.evaluate(async ({ cap, shouldScroll }) => {
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach((image) => { image.loading = "eager"; });

    if (shouldScroll) {
      let y = 0;
      let previousHeight = 0;
      let stablePasses = 0;
      for (let pass = 0; pass < 80; pass++) {
        const root = document.scrollingElement ?? document.documentElement;
        const height = Math.min(Math.max(root.scrollHeight, document.body?.scrollHeight ?? 0), cap);
        if (height === previousHeight) stablePasses += 1;
        else stablePasses = 0;
        previousHeight = height;
        if (y >= height - window.innerHeight && stablePasses >= 2) break;
        y = Math.min(height, y + Math.max(420, Math.round(window.innerHeight * 0.75)));
        window.scrollTo({ top: y, behavior: "instant" });
        await sleep(120);
      }
    }

    await Promise.race([
      Promise.allSettled(Array.from(document.images).map(async (image) => {
        if (image.complete) return image.decode?.().catch(() => {});
        await new Promise<void>((resolve) => {
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
          setTimeout(resolve, 4000);
        });
      })),
      sleep(7000),
    ]);
    await document.fonts?.ready.catch(() => {});
    window.scrollTo({ top: 0, behavior: "instant" });
    await sleep(250);
    const root = document.scrollingElement ?? document.documentElement;
    return Math.min(Math.max(root.scrollHeight, document.body?.scrollHeight ?? 0), cap);
  }, { cap: MAX_PAGE_HEIGHT, shouldScroll: loadLazy });
}

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
    const page = await browser.newPage();
    const guard = await protectPageRequests(page);
    await page.setViewport({ width: viewportWidth, height: viewportWidth <= 480 ? 844 : 900, deviceScaleFactor: 2 });
    await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149 Safari/537.36 MockFrameCapture/1.0");
    await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: dark ? "dark" : "light" }]);
    // commit on DOM ready, then wait for network quiet on a best-effort basis —
    // heavy pages (ads, analytics, streams) never go idle and would 502 forever
    await page.goto(target.href, { waitUntil: "domcontentloaded", timeout: 20_000 });
    const finalUrl = new URL(page.url());
    await assertPublicTarget(finalUrl);
    if (guard.reachedInternal()) throw new Error("blocked: page resolved to an internal address");
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 8_000 }).catch(() => {});
    if (settleDelay) await new Promise((r) => setTimeout(r, settleDelay));
    const height = await preparePageContent(page, Boolean(loadLazy) || Boolean(fullPage));

    if (guard.reachedInternal()) throw new Error("blocked: page resolved to an internal address");
    let png: Uint8Array;
    if (fullPage) {
      png = await page.screenshot({ clip: { x: 0, y: 0, width: viewportWidth, height: Math.max(1, height) }, captureBeyondViewport: true, type: "png" });
    } else {
      png = await page.screenshot({ type: "png" });
    }
    // responses that landed while the screenshot was taken
    if (guard.reachedInternal()) throw new Error("blocked: page resolved to an internal address");

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
