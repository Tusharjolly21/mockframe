# Next.js technical SEO checklist — current state + gaps

Audited 2026-07-18 against the actual codebase. ✅ = shipped & verified,
🔶 = partial, ⬜ = todo. Re-audit quarterly.

## Metadata
- ✅ Root title template (`%s — MockFrame`) + default title/description (`app/layout.tsx`)
- ✅ Per-page `generateMetadata` with unique titles/descriptions on tools, mockups, guides, templates
- ✅ Canonicals via `alternates.canonical` on indexable pages
- ✅ `/editor` and app screens `noindex, follow` (kept crawlable so the directive is seen)
- ✅ `not-found` noindexed
- ⬜ `metadataBase` sanity check — verify OG URLs resolve absolute on prod
- ⬜ Add `dateModified`-bearing `Article` schema to guides (field exists nowhere yet)

## Structured data
- ✅ Organization + WebSite (root layout, no fake SearchAction)
- ✅ Tools: WebApplication + HowTo + FAQPage + BreadcrumbList (visible content backs every claim)
- ✅ Guides: HowTo + BreadcrumbList; ✅ /tools hub: CollectionPage
- ✅ Mockups: SoftwareApplication + BreadcrumbList
- ✅ Pricing: FAQPage (visible FAQ)
- 🔶 Device pages: no FAQPage yet (blocked on adding real per-device FAQs — see roadmap)
- ⬜ Template collections: CollectionPage schema
- ⬜ Validate all types in Rich Results Test after each new page type ships
- ❌ NEVER: fabricated aggregateRating/reviews; schema for content not on the page

## Sitemaps & robots
- ✅ `app/sitemap.ts` covers all indexable routes; honest per-content-group `lastModified` (no `new Date()` stamping)
- ✅ robots: editor/app routes excluded from indexing via metadata (not robots-blocked, so directives are crawlable)
- ⬜ Split sitemap by type when URL count > ~500 (device/tools/guides/compare indexes)
- ⬜ **Submit sitemap in Google Search Console + Bing Webmaster** (owner action — still pending!)
- ⬜ After each pSEO batch: monitor GSC Page Indexing; investigate if indexation < 80% of submitted

## Open Graph / social
- ✅ Dynamic branded OG image (`app/opengraph-image.tsx`)
- ✅ Per-page OG title/description/url on major types
- 🔶 Tool pages reuse shared hero images as OG — generate per-tool OG images with the tool name rendered (next/og) for better CTR on shares
- ⬜ Twitter card meta explicit (currently inherits OG; add `summary_large_image`)

## Performance / CWV (tiebreaker — hit "good", don't gold-plate)
- ✅ Homepage LCP img: `fetchPriority=high` + width/height (CLS)
- ✅ Font strategy left alone deliberately (editor export depends on it)
- ⬜ Run PageSpeed on: home, one device page, one tool page, /tools hub — record baseline in this file
- ⬜ `loading="lazy"` on below-fold marketing imgs (NOT the LCP image)
- ⬜ Check marketing pages don't ship editor-only JS (bundle-analyze; dynamic imports already used for promo panel)

## Images
- 🔶 Alt text present but generic in places — device pages should use "{Device} mockup with screenshot" pattern
- ⬜ Rename generic asset filenames (`hero-iphone.webp` → `iphone-16-pro-mockup.webp`) as pages get touched (don't mass-rename; redirect cost > benefit)
- ⬜ Guide screenshots: descriptive filenames + alt from day one

## Hygiene
- ✅ No `meta keywords` (dead), no doorway-pattern near-duplicates (tool pages have unique overviews/FAQs)
- ⬜ robots.txt: explicitly ALLOW AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended) — LLM referrals are a growing free channel; brandbird courts them, deviceframes forfeits them
- ✅ Trailing-slash and www→apex consistency handled by Next/Vercel defaults — verify once on prod
- ⬜ 404 monitoring: check GSC crawl errors monthly
- ⬜ When a page type is retired: 301 to nearest hub, never delete to 404

## Monitoring cadence (once GSC is live)
Weekly: Page Indexing count, new queries. Monthly: CTR of top 20 pages (rewrite
titles under 1.5% CTR at position ≤10), crawl errors, CWV report. Quarterly:
re-verify comparison/spec page facts + bump their honest `lastModified`.
