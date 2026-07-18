# 12-month SEO roadmap — prioritized by impact × difficulty

Effort key: S (<1 day) · M (1–3 days) · L (1–2 weeks). Every code batch obeys the
rollout gates in `03-programmatic-seo.md`. Re-plan quarterly from GSC data.

## Month 0 — Foundations (mostly done ✅ + 2 owner actions)
- ✅ Tool pages w/ unique FAQs+schema, /tools hub, honest sitemap, breadcrumbs,
  guides HowTo, CWV basics (shipped earlier)
- ⬜ **Owner: Google Search Console + Bing Webmaster verify, submit sitemap** (S)
  — everything downstream measures through this; still pending!
- ⬜ Owner: claim AlternativeTo + Product Hunt product pages (S)

## Months 1–2 — Strike the time-sensitive targets
1. `/alternatives/smartmockups` + `/alternatives/screely` + `/alternatives/placeit`
   — smartmockups SHUT DOWN in 2026, screely's domain is a betting site: live
   "alternative" traffic with weak answers. First-mover window. (M — needs
   `lib/competitors.ts` + hub + 3 pages)
2. `/specs/app-store-screenshot-sizes` + `/specs/play-store-screenshot-sizes` +
   `/specs/play-store-feature-graphic` (`lib/specs.ts` engine + 3 pages, table-first,
   year in title) (M)
3. `/tools/fake-discord-chat-generator` — screens already exist in the editor;
   demand verified, page missing (S)
4. `/tools/fake-text-video` — the fastest-rising cluster ("fake text message video
   maker", "texting story maker"); our chat replay + MP4 export already is the
   product (M — landing + wiring the existing exporter)
5. Directory batch + embed-attribution snippet (backlinks doc Tier 1/2) (S)

## Months 3–4 — Category hubs + device deepening (batch-gated)
6. `/mockups/c/[category]` × 6 hubs — claims "iphone mockup", "android mockup",
   "macbook mockup" head terms (M)
7. Device-page deepening batch 1 (15 phones): spec tables, computed store-fit
   lines (joins specs.ts), 3 FAQs + FAQPage schema, category best-uses (M)
8. Device batch 2 (remaining devices) after gate passes (M)
9. Product Hunt launch #1 (main product) + Show HN (owner + prep S)

## Months 5–6 — Comparison engine + spec completion
10. `/compare` hub + 5 pairs: shots-vs-pika, placeit-vs-smartmockups (high
    residual volume), mockframe-vs-shots, carbon-vs-ray-so, rotato-vs-mockrocket (L)
11. Remaining `/specs/*` (~5: instagram-story-size, product-hunt-gallery,
    app-preview-video, og-image, iphone-screen-sizes) (M)
12. New tool pages batch: screenshot-beautifier, instagram-story-mockup,
    feature-graphic-generator (each = real working preset flows) (M–L)
13. Guides cadence starts: 2/month, mapped to Cluster P how-tos, each embedding
    its tool (ongoing M)

## Months 7–9 — Second axes + video cluster
14. Template collections, app-category axis (~7 collections, appscreens model) (M)
15. Promo-video cluster build-out: `/specs/app-preview-video-specs` CTA loop,
    "app promo video for reels/tiktok ads" landing variants ONLY if the promo
    tool grows matching presets (M)
16. Bluesky + LinkedIn/Reddit post-screenshot tool pages (lowest-competition
    social cluster) (M)
17. PH launch #2 (Fake Chat Studio or Promo Video Maker) + technical article #2

## Months 10–12 — Authority + consolidation
18. Free-asset pages (frame PNGs) + open-source frames repo — the passive
    link magnets (L, owner decision on giveaway scope)
19. Remaining alternatives pages (~4) + refresh all comparison facts (M)
20. Quarterly prune: merge 0-impression pages; re-tier keyword DB from GSC (S)
21. Year-boundary spec refresh: retitle "2026"→"2027" ONLY with re-verified data
    (S, calendared)

## Success metrics (GSC, checked monthly)
- M2: indexed baseline 100%, first alternative-page impressions
- M4: 500+ daily impressions, device pages ranking for "{device} mockup" tails
- M6: 3 spec pages with featured-snippet captures; 30+ linking domains
- M9: 2k daily impressions; comparison pages converting (track /pricing referrals)
- M12: 5k+ daily impressions, 100 linking domains, ≥3 head-term page-1 rankings

## Standing rules
- Nothing ships that doesn't work today (no promise-pages).
- Every batch waits for its indexation gate.
- Titles carry 2 of: free / no watermark / no sign-up / in-your-browser.
- Facts pages carry honest verified dates; stale = worse than absent.
