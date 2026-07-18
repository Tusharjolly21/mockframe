# Programmatic SEO plan — data models, uniqueness bars, rollout gates

Constraint (Google scaled-content policy, verified in research): the Helpful
Content system judges **the whole domain** — a batch of thin pages suppresses
everything. So: pSEO here means *pages generated from structured data that each
answer a real query better than a hand-made page could*, shipped in gated batches.
fakedetail's 500 country-doorway pages are the anti-pattern; appscreens' 324
template pages × hubs + spec guides is the model.

## Engine 1 — Device pages (exists; deepen, don't multiply)

- Data source: `packages/devices` registry (screen px, corner radius, frame dims,
  variants, category, brand).
- Page: `/mockups/[deviceId]` (~63). Add per-device: spec table (registry-driven),
  3 FAQ (export size / orientation / store-size match — computed, not hand-written
  where derivable), "best uses" per category, related-device grid (same brand,
  same category, same screen class).
- Uniqueness source = the registry data itself + computed store-fit ("iPhone 16
  Pro Max screenshots satisfy Apple's 6.9″ 1320×2868 requirement" — joins Engine 3
  data). ≥400 unique words equivalent.
- NEW: 6 category hubs `/mockups/c/[category]` (iphone, android-phone, tablet,
  laptop, watch, browser) — hand-written intros (300+ words), device grid,
  category FAQ. Proven by mockuphone `/type/*` + appscreens dual-axis hubs.

## Engine 2 — Chat/tool grid (exists; extend by platform × content-type)

- Data source: `lib/toolPages.ts` (hand-written entries — stays hand-written; the
  "programmatic" part is the shared template + schema machinery).
- Proven grid (fakedetail/zeoob): platform × content-type. We have 6 platforms ×
  1 type (chat). Verified-demand extensions, in order:
  1. **Discord chat** (screens already in editor — page missing; demand verified)
  2. **Fake text VIDEO page** (`/tools/fake-text-video`) — fastest-rising cluster,
     our replay+MP4 already does it
  3. TikTok DM (rising), Slack chat (screens exist)
  4. Later content-types only WITH real features: group chat, call screen.
- Rule: a tool page ships only when the tool genuinely works. No promise-pages.

## Engine 3 — Spec pages (NEW; the authority wedge)

- Data source: NEW `lib/specs.ts` — hand-maintained structured facts:
  `{ platform, assetType, sizes[], formats, limits, sourceUrl, verifiedAt }`,
  sourced from Apple/Google developer docs, re-verified quarterly (calendar it).
- Pages: `/specs/[topic]` (~10 at launch — see architecture doc list).
- Rendered: answer table FIRST (snippet-shaped), then per-size detail, then CTA
  into the tool/template preset that produces exactly that size.
- The same `specs.ts` powers device-page store-fit lines and pack-studio presets —
  one dataset, three surfaces (that's the moat: competitors hand-write blog posts
  that go stale; ours is data the product itself depends on).

## Engine 4 — Comparison/alternatives (NEW; hand-written from a fact table)

- Data source: NEW `lib/competitors.ts` — `{ name, url, pricing, watermarkPolicy,
  freeTier, exports, platforms, lastVerified }`. Facts table maintained by hand;
  prose hand-written per page (these pages sell trust, not scale).
- `/alternatives/[x]` (~8) + `/compare/[a]-vs-[b]` (~10 pairs max).
- Priority order (event-driven first): smartmockups (SHUT DOWN — live "alternative"
  traffic now), screely (dead domain), launchmatic (dead), placeit, shots.so,
  pika.style, mockuuups, carbon/ray.so (code cluster).
- Honesty rule: competitor wins get stated. Update `lastVerified` quarterly;
  stale comparison pages are worse than none.

## Engine 5 — Template collections (exists; add the second axis)

- appscreens lesson: hub on BOTH device axis and app-category axis.
- Extend `/templates/collection/[group]` with app-category collections:
  finance-app, fitness-app, saas-dashboard, e-commerce, dating-app, education
  (~7 new). Each: 100+ word intro, 6+ real templates, links to matching device
  pages + pack studio. Only ship a collection when ≥6 genuinely distinct
  templates exist for it.

## Rollout gates (apply to every engine)

1. **Batch ≤15 pages**, then wait for GSC before the next batch.
2. Gate: ≥80% of the batch indexed within 3 weeks AND no site-wide impression
   drop → next batch. Under 80%: stop, deepen the weakest pages, don't add more.
3. Every page passes pre-ship: unique-value check (what does THIS page have that
   its sibling doesn't? must name the data), ≥2 internal links in, hub entry,
   sitemap entry, schema validates.
4. Quarterly prune review: pages with 0 impressions after 6 months get merged
   into their hub (301) — shrinking beats diluting.
5. Never: auto-generated prose padding, country/persona multiplication without
   data (fakedetail-style doorways), pages for features that don't exist.
