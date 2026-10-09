#!/usr/bin/env node
// Tell IndexNow search engines (Bing, Yandex, Seznam, Naver…) which pages changed.
// Bing's index also feeds DuckDuckGo, Yahoo and ChatGPT search, which together
// send MockFrame more visitors than Google, so pages reach them days sooner.
//
// Reads the live sitemap and submits the URLs whose <lastmod> is recent. The
// sitemap's lastmod dates are honest per-content-group dates (app/sitemap.ts),
// so "recent lastmod" means "that page actually changed".
//
//   node scripts/indexnow.mjs            # URLs modified in the last 3 days
//   node scripts/indexnow.mjs --days 14  # wider window
//   node scripts/indexnow.mjs --all      # every URL in the sitemap (first run)
//   node scripts/indexnow.mjs --dry-run  # print, don't submit
//
// The key is public by design: IndexNow verifies ownership by fetching
// https://mockframe.app/<key>.txt, which lives in apps/web/public.

const SITE = "https://mockframe.app";
const KEY = "9288d74421622d04c83eef1e1ee79477";

const args = process.argv.slice(2);
const all = args.includes("--all");
const dryRun = args.includes("--dry-run");
const daysArg = args.indexOf("--days");
const days = daysArg >= 0 ? Number(args[daysArg + 1]) : 3;

const res = await fetch(`${SITE}/sitemap.xml`);
if (!res.ok) throw new Error(`sitemap fetch failed: ${res.status}`);
const xml = await res.text();

const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
const urls = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)]
  .map(([, block]) => ({
    loc: block.match(/<loc>(.*?)<\/loc>/)?.[1]?.trim(),
    lastmod: block.match(/<lastmod>(.*?)<\/lastmod>/)?.[1]?.trim(),
  }))
  .filter((u) => u.loc && (all || (u.lastmod && Date.parse(u.lastmod) >= cutoff)))
  .map((u) => u.loc);

if (urls.length === 0) {
  console.log(`No sitemap URLs modified in the last ${days} days; nothing to submit.`);
  process.exit(0);
}

console.log(`${urls.length} URL(s) to submit${dryRun ? " (dry run)" : ""}:`);
for (const u of urls) console.log(`  ${u}`);
if (dryRun) process.exit(0);

const submit = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: urls.slice(0, 10000) }),
});
// 200 = accepted, 202 = accepted while the key is being verified
console.log(`IndexNow responded ${submit.status} ${submit.statusText}`);
if (submit.status !== 200 && submit.status !== 202) {
  console.error(await submit.text());
  process.exit(1);
}
