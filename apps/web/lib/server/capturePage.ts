import type { Browser, Page } from "puppeteer-core";
import { assertPublicUrl, isBlockedAddress } from "./ssrf";

/**
 * Website → PNG capture, shared by /api/capture (interactive) and the pack
 * deploy-refresh hook (server-side, no user present). Every SSRF guard lives
 * here so both paths get the same protection.
 */

export const MAX_DELAY = 10_000;
const MAX_PAGE_HEIGHT = 8_000; // cap full-page captures — some pages are endless

/** Scheme, hostname and DNS checks shared with the other server-side fetchers (lib/server/ssrf.ts). */
export async function assertPublicTarget(target: URL): Promise<void> {
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

export interface CaptureOptions {
  target: URL;
  dark?: boolean;
  fullPage?: boolean;
  loadLazy?: boolean;
  /** CSS px viewport width; ≤480 uses a phone-height viewport */
  viewportWidth: number;
  /** extra settle time after load, ms (already clamped by the caller) */
  settleDelay?: number;
}

/** Load `target` in a fresh page of `browser` and screenshot it. Throws on blocked or failed loads. */
export async function capturePng(browser: Browser, opts: CaptureOptions): Promise<Uint8Array> {
  const { target, dark = false, fullPage = false, loadLazy = true, viewportWidth, settleDelay = 0 } = opts;
  const page = await browser.newPage();
  try {
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
    return png;
  } finally {
    // one browser can serve several captures (deploy refresh) — free each page
    await page.close().catch(() => {});
  }
}
