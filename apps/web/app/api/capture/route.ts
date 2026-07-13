import { existsSync } from "node:fs";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60; // headless capture of slow pages needs headroom

/**
 * Website URL → screenshot (PostSpark parity): POST { url, dark?, fullPage?,
 * width?, delay? } → PNG. Runs headless Chromium — @sparticuz/chromium on
 * Vercel, the local Chrome / Playwright shell in dev.
 */

const MAX_DELAY = 10_000;
const MAX_PAGE_HEIGHT = 8_000; // cap full-page captures — some pages are endless

/** SSRF guard: only public http(s) hosts; no localhost/private/link-local. */
function isBlockedHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h === "0.0.0.0" || h === "::1" || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (/^127\.|^10\.|^192\.168\.|^169\.254\./.test(h)) return true;
  const m172 = h.match(/^172\.(\d+)\./);
  if (m172 && +m172[1] >= 16 && +m172[1] <= 31) return true;
  if (/^f[cd][0-9a-f]{2}:|^fe80:/.test(h)) return true; // IPv6 ULA + link-local
  return false;
}

const LOCAL_CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`,
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
].filter((p): p is string => !!p);

async function launchBrowser() {
  const puppeteer = await import("puppeteer-core");
  if (process.env.VERCEL) {
    const chromium = (await import("@sparticuz/chromium")).default;
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }
  const local = LOCAL_CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!local) throw new Error("No local Chrome found — set CHROME_PATH");
  return puppeteer.launch({ executablePath: local, headless: true });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { url, dark = false, fullPage = false, width = 1440, delay = 0 } = body ?? {};

  let target: URL;
  try {
    target = new URL(typeof url === "string" && !/^https?:\/\//i.test(url) ? `https://${url}` : url);
  } catch {
    return NextResponse.json({ error: "Enter a valid URL" }, { status: 400 });
  }
  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return NextResponse.json({ error: "Only http(s) URLs are supported" }, { status: 400 });
  }
  if (isBlockedHost(target.hostname)) {
    return NextResponse.json({ error: "This host can't be captured" }, { status: 400 });
  }
  const viewportWidth = Math.min(2560, Math.max(320, Number(width) || 1440));
  const settleDelay = Math.min(MAX_DELAY, Math.max(0, Number(delay) || 0));

  let browser: Awaited<ReturnType<typeof launchBrowser>> | null = null;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: viewportWidth, height: 900, deviceScaleFactor: 2 });
    await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: dark ? "dark" : "light" }]);
    await page.goto(target.href, { waitUntil: "networkidle2", timeout: 30_000 });
    if (settleDelay) await new Promise((r) => setTimeout(r, settleDelay));

    let png: Uint8Array;
    if (fullPage) {
      // pre-scroll so lazy-loaded content actually renders, then cap the height
      const height = await page.evaluate(async (cap) => {
        await new Promise<void>((done) => {
          let y = 0;
          const step = () => {
            y += 600;
            window.scrollTo(0, y);
            if (y < Math.min(document.body.scrollHeight, cap)) setTimeout(step, 80);
            else { window.scrollTo(0, 0); setTimeout(() => done(), 200); }
          };
          step();
        });
        return Math.min(document.body.scrollHeight, cap);
      }, MAX_PAGE_HEIGHT);
      png = await page.screenshot({ clip: { x: 0, y: 0, width: viewportWidth, height }, type: "png" });
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
