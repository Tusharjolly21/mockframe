import { existsSync } from "node:fs";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { NextRequest, NextResponse } from "next/server";
import type { Page } from "puppeteer-core";
import { requestIsPro } from "@/lib/server/entitlement";

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

/** Fast hostname check, followed by DNS validation below to prevent rebinding. */
function isBlockedHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h === "0.0.0.0" || h === "::1" || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (/^127\.|^10\.|^192\.168\.|^169\.254\./.test(h)) return true;
  const m172 = h.match(/^172\.(\d+)\./);
  if (m172 && +m172[1] >= 16 && +m172[1] <= 31) return true;
  if (/^f[cd][0-9a-f]{2}:|^fe80:/.test(h)) return true; // IPv6 ULA + link-local
  return false;
}

function isBlockedAddress(address: string): boolean {
  const normalized = address.toLowerCase().split("%")[0];
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (mapped) return isBlockedAddress(mapped);
  if (isIP(normalized) === 4) {
    const parts = normalized.split(".").map(Number);
    const [a, b] = parts;
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  if (isIP(normalized) === 6) {
    return normalized === "::" || normalized === "::1" || /^f[cd]/.test(normalized) || /^fe[89ab]/.test(normalized) || /^ff/.test(normalized);
  }
  return true;
}

async function assertPublicTarget(target: URL): Promise<void> {
  if (target.protocol !== "https:" && target.protocol !== "http:") throw new Error("Only http(s) URLs are supported");
  if (isBlockedHost(target.hostname)) throw new Error("This host can't be captured");
  const addresses = await lookup(target.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isBlockedAddress(address))) {
    throw new Error("This host can't be captured");
  }
}

async function protectPageRequests(page: Page): Promise<void> {
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

const LOCAL_CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`,
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
].filter((p): p is string => !!p);

// chromium-min downloads this self-contained pack into /tmp on cold start —
// no lambda file-tracing of shared libs (which is what broke @sparticuz/chromium)
// v149 ships AL2023 libs — older packs (≤v131) only carried AL2 and died on
// Vercel's Node 24 runtime with "libnss3.so: cannot open shared object file"
const CHROMIUM_PACK =
  process.env.CHROMIUM_PACK_URL ??
  "https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.x64.tar";

async function launchBrowser() {
  const puppeteer = await import("puppeteer-core");
  if (process.env.VERCEL) {
    const chromium = (await import("@sparticuz/chromium-min")).default;
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(CHROMIUM_PACK),
      headless: true,
    });
  }
  const local = LOCAL_CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!local) throw new Error("No local Chrome found — set CHROME_PATH");
  return puppeteer.launch({ executablePath: local, headless: true });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { url, dark = false, fullPage = false, loadLazy = true, width = 1440, delay = 0 } = body ?? {};

  // standard captures stay free; FULL-PAGE runs ride the 120s function ceiling
  // and are Pro-only, enforced here (UI lock is courtesy)
  if (fullPage && !(await requestIsPro(req))) {
    return NextResponse.json({ error: "Full-page capture is a Pro feature — upgrade to use it" }, { status: 402 });
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
    await protectPageRequests(page);
    await page.setViewport({ width: viewportWidth, height: viewportWidth <= 480 ? 844 : 900, deviceScaleFactor: 2 });
    await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149 Safari/537.36 MockFrameCapture/1.0");
    await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: dark ? "dark" : "light" }]);
    // commit on DOM ready, then wait for network quiet on a best-effort basis —
    // heavy pages (ads, analytics, streams) never go idle and would 502 forever
    await page.goto(target.href, { waitUntil: "domcontentloaded", timeout: 20_000 });
    const finalUrl = new URL(page.url());
    await assertPublicTarget(finalUrl);
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 8_000 }).catch(() => {});
    if (settleDelay) await new Promise((r) => setTimeout(r, settleDelay));
    const height = await preparePageContent(page, Boolean(loadLazy) || Boolean(fullPage));

    let png: Uint8Array;
    if (fullPage) {
      png = await page.screenshot({ clip: { x: 0, y: 0, width: viewportWidth, height: Math.max(1, height) }, captureBeyondViewport: true, type: "png" });
    } else {
      png = await page.screenshot({ type: "png" });
    }

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
