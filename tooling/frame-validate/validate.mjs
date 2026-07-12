/**
 * frame-validate — CI gate for the device registry (§5.4 of the architecture).
 *
 * Checks every registry entry: JSON shape, SVG markers, geometry consistency,
 * and aspect-ratio agreement between screen and screenRect (≤0.5%).
 * A device that passes cannot render structurally broken.
 * (Golden-image Playwright diffs attach here once the render worker exists.)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(
  path.dirname(fileURLToPath(import.meta.url)), "..", "..",
  "packages", "devices", "registry"
);

const REQUIRED = ["id", "name", "brand", "category", "released", "screen", "frame", "variants", "aliases"];
const CATEGORIES = ["phone", "tablet", "laptop", "desktop", "watch", "browser"];

let failures = 0;
const fail = (id, msg) => {
  failures++;
  console.error(`  ✗ ${id}: ${msg}`);
};

const ids = fs.readdirSync(ROOT).filter((f) => fs.statSync(path.join(ROOT, f)).isDirectory()).sort();
console.log(`Validating ${ids.length} device entries…`);

for (const id of ids) {
  const dir = path.join(ROOT, id);
  let meta;
  try {
    meta = JSON.parse(fs.readFileSync(path.join(dir, "device.json"), "utf8"));
  } catch (e) {
    fail(id, `device.json unreadable: ${e.message}`);
    continue;
  }

  for (const key of REQUIRED) if (!(key in meta)) fail(id, `missing field "${key}"`);
  if (meta.id !== id) fail(id, `id "${meta.id}" does not match directory name`);
  if (!CATEGORIES.includes(meta.category)) fail(id, `invalid category "${meta.category}"`);

  const { frame, screen } = meta;
  if (frame && screen) {
    const r = frame.screenRect;
    if (r.x < 0 || r.y < 0 || r.x + r.width > frame.width || r.y + r.height > frame.height) {
      fail(id, "screenRect does not fit inside frame bounds");
    }
    const arScreen = screen.width / screen.height;
    const arRect = r.width / r.height;
    const drift = Math.abs(arScreen - arRect) / arScreen;
    if (drift > 0.005) fail(id, `screen vs screenRect aspect drift ${(drift * 100).toFixed(2)}% (>0.5%)`);
    if (!/^M[\d.\s-]/.test(frame.maskPath)) fail(id, "maskPath is not a valid path (must start with M)");
  }

  for (const v of meta.variants ?? []) {
    const svgPath = path.join(dir, v.svg);
    if (!fs.existsSync(svgPath)) {
      fail(id, `variant "${v.id}" svg file missing: ${v.svg}`);
      continue;
    }
    const svg = fs.readFileSync(svgPath, "utf8");
    for (const marker of ["BODY", "OVERLAY", "SCREEN"]) {
      if (!svg.includes(`<!--${marker}-->`)) fail(id, `variant "${v.id}" missing <!--${marker}--> marker`);
    }
    if (!svg.includes(`viewBox="0 0 ${frame.width} ${frame.height}"`)) {
      fail(id, `variant "${v.id}" viewBox does not match frame ${frame.width}×${frame.height}`);
    }
    // every url(#ref) must resolve to an id in the same file
    const defined = new Set([...svg.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
    for (const [, ref] of svg.matchAll(/url\(#([^)]+)\)/g)) {
      if (!defined.has(ref)) fail(id, `variant "${v.id}" references missing id #${ref}`);
    }
  }

  if (failures === 0) console.log(`  ✓ ${id}`);
}

if (failures > 0) {
  console.error(`\n${failures} failure(s).`);
  process.exit(1);
}
console.log("All device entries valid.");
