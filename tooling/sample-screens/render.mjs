/**
 * Renders the store-set sample screens to apps/web/public/store-sets/<app>/.
 *
 *   node tooling/sample-screens/render.mjs [app] [nn]
 *
 * Needs `playwright-core` (npm i -D playwright-core, or install it next to
 * this script) and a Chromium; set CHROMIUM_PATH if it isn't on the default
 * Playwright path. Each page is captured at the iOS viewport (402 × 874 @3x →
 * 1206 × 2622) and the Android one (412 × 920 @3.1 → 1277 × 2852), then
 * written as WebP. `storeSets.ts` crops floating cards in iOS px.
 */
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, "../../apps/web/public/store-sets");
const [onlyApp, onlyShot] = process.argv.slice(2);

const PLATFORMS = [
  { id: "ios", width: 402, height: 874, scale: 3 },
  { id: "android", width: 412, height: 920, scale: 3.1 },
];

const apps = fs.readdirSync(here).filter((d) => d !== "lib" && fs.statSync(path.join(here, d)).isDirectory());
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
for (const app of apps) {
  if (onlyApp && app !== onlyApp) continue;
  const pages = fs.readdirSync(path.join(here, app)).filter((f) => /^\d\d\.html$/.test(f));
  fs.mkdirSync(path.join(out, app), { recursive: true });
  for (const file of pages) {
    const nn = file.slice(0, 2);
    if (onlyShot && nn !== onlyShot) continue;
    for (const p of PLATFORMS) {
      const ctx = await browser.newContext({ viewport: { width: p.width, height: p.height }, deviceScaleFactor: p.scale });
      const page = await ctx.newPage();
      await page.goto(`${pathToFileURL(path.join(here, app, file)).href}?p=${p.id}`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(150);
      const dest = path.join(out, app, `${p.id}-${nn}.webp`);
      const buf = await page.screenshot({ type: "png" });
      fs.writeFileSync(dest.replace(/\.webp$/, ".png"), buf);
      await ctx.close();
      console.log("rendered", path.relative(out, dest));
    }
  }
}
await browser.close();
console.log("PNG written; convert to WebP with: python3 tooling/sample-screens/towebp.py");
