# Site architecture — every page type, URL pattern, and how they interlink

Principle (from Google's doorway/scaled-content policy): every programmatic page
lives in a **browseable hierarchy** (hub → children), carries **data-driven unique
value**, and is reachable in ≤3 clicks from home. No orphans, no near-duplicates.

## The map (target state; ✅ = exists today)

```
Home ✅
├── /mockups ✅ ................................. hub: all device frames
│   ├── /mockups/[deviceId] ✅ (~63) ........... pSEO: per-device generator
│   └── /mockups/c/[category] ⬜ (6) ........... NEW hubs: iphone, android-phone,
│         tablet, laptop, watch, browser        (proven: mockuphone /type/*,
│                                                brandbird category hubs)
├── /tools ✅ ................................... hub: all generators
│   ├── /tools/[slug] ✅ (12 → ~25) ............ hand-crafted tool landings
│   │     existing: website/code/tweet/bluesky/app-store/promo-video + 6 chat
│   │     add: instagram-story-mockup, og-image-preview, play-store-feature-
│   │     graphic, screenshot-beautifier, 3d-mockup, twitter-header, more chat
│   │     apps (Slack, Discord already in editor = pages waiting to exist)
├── /templates ✅ ............................... hub: scene gallery
│   └── /templates/collection/[group] ✅ (5→12)  thicken intros, add groups
├── /guides ✅ .................................. hub: how-tos
│   └── /guides/[slug] ✅ (8 → 30) ............. editorial; 2/mo cadence
├── /compare ⬜ ................................. NEW hub (open gap — NO
│   └── /compare/[a]-vs-[b] ⬜ (~10) ........... competitor in niche does this)
│         shots-vs-pika, mockuuups-vs-smartmockups, mockframe-vs-shots, ...
├── /alternatives ⬜ ............................ NEW hub
│   └── /alternatives/[competitor] ⬜ (~8) ..... shots-so, pika-style, screely
│         (screely is DEAD — its orphaned queries+links are free to claim),
│         smartmockups, placeit, mockuuups-studio, previewed, deviceframes
├── /specs ⬜ ................................... NEW hub: citable answer pages
│   └── /specs/[topic] ⬜ (~10) ................ app-store-screenshot-sizes,
│         play-store-screenshot-sizes, play-store-feature-graphic,
│         iphone-screen-sizes, ipad-screen-sizes, android-screen-sizes,
│         social-image-sizes, app-preview-video-specs, og-image-size,
│         apple-watch-screen-sizes
├── /app-store-screenshots ✅ (pack studio landing)
├── /ai ✅ (AI pack generator landing)
├── /pricing ✅ · /changelog ✅ · /privacy ✅
└── /developers/* ✅ (api, embed, automations) — embed page doubles as backlink asset
```

Indexable page count: today ~95 → target ~160 by month 6, ~220 by month 12.
(Deliberately NOT thousands — quality bar over surface area; the Helpful Content
system judges the whole domain.)

## Why each new type earns its existence

| Type | Search intent served | Proof of demand | Unique value source |
|---|---|---|---|
| `/mockups/c/[category]` | "iphone mockup generator", "android mockup" (category-level, higher volume than device-level) | mockuphone `/type/*`, brandbird category hubs | curated device grid + category buying-guide copy + category FAQ |
| `/compare/[a]-vs-[b]` | "[x] vs [y]" | zero competitors do it; comparison queries visible in autocomplete | hand-verified feature/pricing tables, honest verdicts |
| `/alternatives/[x]` | "[x] alternative(s)", "[x] free" | AlternativeTo ranks for these; dead screely = orphaned demand | real roundup incl. competitors |
| `/specs/[topic]` | "app store screenshot sizes 2026" etc. | high-volume spec lookups; roundup blogs maintain stale tables | maintained tables + direct CTA into correctly-sized templates |
| more `/tools/*` | one intent per tool ("instagram story mockup") | brandbird's ~70 tool pages are its engine | each = real working tool, unique overview+FAQ (existing bar) |

## Hub-and-spoke linking rules

1. Every child links UP to its hub; every hub lists ALL children (grouped, keyword anchors).
2. Siblings link ACROSS (3–6, same-category first) — device pages already do this.
3. Cross-type bridges (the money paths):
   - device page → app-store tool + create-mockup guide
   - spec page → the tool/template that produces that exact size
   - comparison page → the MockFrame tool matching the use case
   - guide → the tool it teaches → back to guide ("learn more")
4. Footer: hubs + ~12 top pages ONLY. Nav: hubs only (already true).
5. New page ships in the same PR as: hub entry + sitemap entry + ≥2 inbound links
   from existing pages. **No orphan pages, ever.**

## URL conventions

- Lowercase kebab-case, no trailing slash, no dates in slugs (evergreen + honest
  `lastModified` instead), keyword-first slugs (`/compare/shots-vs-pika` not
  `/compare/1`). Never rename a shipped slug without a 301.
