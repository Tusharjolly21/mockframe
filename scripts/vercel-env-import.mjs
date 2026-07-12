#!/usr/bin/env node
// Import every key from apps/web/.env.local into the linked Vercel project,
// for all three environments. Handles multi-line quoted values (the Firebase
// private-key PEM). Never prints secret values.
//
//   Prereq (you, one time):  cd framekit && vercel login && vercel link
//   Dry run (safe, default):  node scripts/vercel-env-import.mjs
//   Apply:                    node scripts/vercel-env-import.mjs --apply
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENV_PATH = join(ROOT, "apps/web/.env.local");
const APPLY = process.argv.includes("--apply");
const ENVIRONMENTS = ["production", "preview", "development"];

/** Parse a .env file, correctly handling multi-line double-quoted values. */
function parseEnv(src) {
  const re = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:"((?:[^"\\]|\\[\s\S])*)"|'((?:[^'\\]|\\[\s\S])*)'|([^\r\n]*))/gm;
  const out = {};
  let m;
  while ((m = re.exec(src))) {
    let val;
    if (m[2] !== undefined) {
      // double-quoted: unescape \n \r \t \" \\ (a PEM with real newlines passes through)
      val = m[2].replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    } else if (m[3] !== undefined) {
      val = m[3];
    } else {
      val = (m[4] ?? "").trim();
    }
    out[m[1]] = val;
  }
  return out;
}

const env = parseEnv(readFileSync(ENV_PATH, "utf8"));
const keys = Object.keys(env);
console.log(`Parsed ${keys.length} keys from apps/web/.env.local:`);
for (const k of keys) console.log(`  ${k.padEnd(38)} ${String(env[k].length).padStart(5)} chars${env[k].includes("\n") ? " (multi-line)" : ""}`);

if (!APPLY) {
  console.log("\nDry run — nothing sent. Re-run with --apply after `vercel login` + `vercel link`.");
  process.exit(0);
}

// verify the project is linked before touching anything
const who = spawnSync("vercel", ["whoami"], { encoding: "utf8" });
if (who.status !== 0) {
  console.error("Not logged in. Run `vercel login` first.");
  process.exit(1);
}
console.log(`\nApplying to Vercel (user: ${who.stdout.trim()}) …`);
let ok = 0, fail = 0;
for (const key of keys) {
  for (const target of ENVIRONMENTS) {
    spawnSync("vercel", ["env", "rm", key, target, "-y"], { stdio: "ignore" }); // idempotent
    const r = spawnSync("vercel", ["env", "add", key, target], { input: env[key], encoding: "utf8" });
    if (r.status === 0) ok++;
    else { fail++; console.error(`  ✗ ${key} [${target}] ${(r.stderr || "").trim().split("\n").pop()}`); }
  }
  console.log(`  ✓ ${key} (all envs)`);
}
console.log(`\nDone: ${ok} set, ${fail} failed. Redeploy to pick them up: vercel --prod`);
