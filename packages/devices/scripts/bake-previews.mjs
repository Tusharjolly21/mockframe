/**
 * Bakes the device-picker thumbnails: photoreal body + a procedural wallpaper on
 * the screen + the vector overlay (island, notch...), saved as
 * apps/web/public/devices/<id>/<variant>-preview.webp. build-registry.mjs links
 * them as `previewSrc`.
 *
 *   node bake-previews.mjs <wallpaperDir> [--only id1,id2]
 *
 * <wallpaperDir> holds <name>-p.jpg (portrait) and <name>-l.jpg (landscape) from
 * scenes-src/wallpapers/make_wallpapers.py. Needs `playwright-core` (+ a Chromium)
 * and python3 with Pillow for the webp encode; neither is a repo dependency.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const PKG = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const REG = path.join(PKG, "registry");
const PUB = path.join(PKG, "..", "..", "apps", "web", "public", "devices");
const wpDir = path.resolve(process.argv[2] ?? "");
const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1].split(",") : null;
const require = createRequire(process.env.PW_NODE_MODULES ? path.join(process.env.PW_NODE_MODULES, "x.js") : import.meta.url);
const { chromium } = require("playwright-core");

const PORTRAIT = ["bloom", "dune", "orchid", "ocean", "sunset", "aurora", "meadow", "satin"];
const LANDSCAPE = ["satin", "ocean", "orchid", "dune", "bloom", "sunset"];
const WATCH = ["aurora", "bloom", "sunset", "ocean", "orchid"];
const LONG = 760;

const dataUri = (file, mime) => `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;

const ids = fs.readdirSync(REG).sort().filter((id) => (!only || only.includes(id)) && fs.existsSync(path.join(REG, id, "device.json")));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await browser.newPage({ deviceScaleFactor: 1 });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bake-"));
const jobs = [];
let n = 0;

for (const id of ids) {
  const meta = JSON.parse(fs.readFileSync(path.join(REG, id, "device.json"), "utf8"));
  if (meta.category === "browser" || meta.plate) continue;
  meta.variants.forEach((v, vi) => {
    const bodyFile = path.join(PUB, id, `${v.id}.webp`);
    if (!fs.existsSync(bodyFile)) return; // only baked for rendered bodies
    n++;
    const { width: W, height: H, screenRect: r, maskPath } = meta.frame;
    const landscape = r.width > r.height * 1.08;
    const pool = meta.category === "watch" ? WATCH : landscape ? LANDSCAPE : PORTRAIT;
    const name = pool[(n + vi) % pool.length];
    const wp = path.join(wpDir, `${name}-${landscape ? "l" : "p"}.jpg`);
    let svg = fs.readFileSync(path.join(REG, id, v.svg), "utf8");
    svg = svg.replace(/href="\/devices\/[^"]+\.webp"/, `href="${dataUri(bodyFile, "image/webp")}"`);
    const cp = `bake_${id}_${v.id}`;
    const screen = `<clipPath id="${cp}"><path d="${maskPath}"/></clipPath>
<image href="${dataUri(wp, "image/jpeg")}" x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${cp})"/>
<linearGradient id="${cp}_g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.16"/><stop offset="0.38" stop-color="#fff" stop-opacity="0.03"/><stop offset="0.52" stop-color="#fff" stop-opacity="0"/></linearGradient>
<path d="${maskPath}" fill="url(#${cp}_g)"/>`;
    svg = svg.replace(/<!--SCREEN-->[\s\S]*?<!--\/SCREEN-->/, `<!--SCREEN-->${screen}<!--/SCREEN-->`);
    const s = LONG / Math.max(W, H);
    const pw = Math.max(1, Math.round(W * s)), ph = Math.max(1, Math.round(H * s));
    svg = svg.replace("<svg ", `<svg width="${pw}" height="${ph}" `);
    jobs.push({ id, v: v.id, svg, pw, ph });
  });
}

for (const j of jobs) {
  await page.setViewportSize({ width: j.pw, height: j.ph });
  await page.setContent(`<!doctype html><body style="margin:0;background:transparent">${j.svg}</body>`);
  await page.waitForTimeout(60);
  const png = path.join(tmp, `${j.id}__${j.v}.png`);
  await page.screenshot({ path: png, omitBackground: true });
}
await browser.close();

fs.writeFileSync(
  path.join(tmp, "enc.py"),
  `import os,sys
from PIL import Image
src,dst=sys.argv[1],sys.argv[2]
for f in sorted(os.listdir(src)):
    if not f.endswith(".png"): continue
    dev,var=f[:-4].split("__")
    os.makedirs(os.path.join(dst,dev),exist_ok=True)
    Image.open(os.path.join(src,f)).save(os.path.join(dst,dev,var+"-preview.webp"),"WEBP",quality=86,method=6)
`
);
execFileSync("python3", [path.join(tmp, "enc.py"), tmp, PUB], { stdio: "inherit" });
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`baked ${jobs.length} previews`);
