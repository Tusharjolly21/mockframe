import { existsSync } from "node:fs";

/**
 * Headless Chromium for server work (website captures, API renders):
 * @sparticuz/chromium-min on Vercel, a local Chrome or Playwright shell in dev.
 */

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

export async function launchBrowser() {
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
  // Chrome refuses to sandbox as root (Docker, dev containers)
  const args = process.getuid?.() === 0 ? ["--no-sandbox"] : [];
  return puppeteer.launch({ executablePath: local, headless: true, args });
}
