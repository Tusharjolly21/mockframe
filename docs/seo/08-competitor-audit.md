# Competitor SEO audit — 13 sites (2026-07-18)

Standing reference from live recon (sitemaps, robots, `site:` fallbacks). Re-audit
twice a year; competitor architectures ARE the demand map.

## League table

| Site | Scale | Model | Verdict |
|---|---|---|---|
| mockuuups.studio | 1,000+ URLs | `/create/[device]` (~400) + **device×perspective** (~350) + category hub tree w/ counts + `/collection/[scene-slug]` + `/use-cases` (~45) + `/learn` + integration landers (`/figma`,`/sketch`,`/adobe-xd`) + **8 `/[x]-alternative/` pages** + i18n (es/pt-br/fr) | **The pSEO benchmark.** Only player doing alternatives + integrations + locales |
| brandbird.app | ~1,000 URLs | `/tools/[x]` (60–80 free tools) + category hubs + `/create/` & `/templates/` platform×format matrices + blog + **explicitly allows AI crawlers** | The free-tools matrix; the AI-visibility stance to copy |
| appscreens.com | ~408 URLs | ~324 template detail pages + 21 hubs on TWO axes (device + app-category) + spec-guide landers + ASO blog | The app-store-screenshot benchmark |
| fakedetail.com | ~600 URLs | `fake-[platform]-[content-type]-generator` matrix (~45) + 500 country doorways | Copy the platform matrix; NEVER the doorways |
| pika.style | ~60 URLs | keyword-slug `/templates/[kw]` + **16 per-endpoint API landers** + 5 free tools + how-to blog | Best small-site execution; API-lander idea is theirs alone |
| mockuphone.com | ~70 URLs | `/model/[device]` + `/type/[category]` hubs | Simple per-device play, no content layer |
| deviceframes.com | ? (blocks AI crawlers) | `/devices/[x]` + `/templates/[x]` — TWO pages per device | Dual-pattern idea; anti-AI robots stance |
| zeoob.com | ~15+ | `/generate-[platform]-[content]/` + alias slugs | Fake-content grid, aggressive rating schema |
| postspark.app | 41 URLs | root feature slugs + **UUID template slugs** | Cautionary: UUID slugs burn all long-tail |
| previewed.app | ~25 crawlable | good brand/device taxonomy **hidden behind SPA** (no sitemap/robots, JS-only grids) | Cautionary: taxonomy Google can't see |
| shots.so | 2 pages | none — brand only | Their long-tail is uncontested |
| screenshots.pro | ~8 | near-zero SEO | Non-factor |
| smartmockups / screely / launchmatic | dead | 301→Canva / betting squatter / DNS dead | **Vacated demand** |

## Corrections & confirmations to the strategy

1. ~~"Nobody does alternatives"~~ → **mockuuups runs 8 alternative pages.** The
   truly unclaimed pattern is **`/vs/[a]-vs-[b]` comparisons — zero across all
   13 sites.** Our `/compare` engine stays priority; `/alternatives` now needs to
   out-execute mockuuups (deeper tables, honest verdicts, fresher dates).
2. smartmockups didn't just die — it **301s into canva.com/mockups**. Target
   phrasing both ways: "smartmockups alternative" + "canva mockups free".

## New opportunities surfaced (not yet in the architecture doc)

- **Glossary** — zero glossaries in the entire niche ("what is a device mockup",
  "clay mockup", "ASO screenshot"). Cheap `/glossary/[term]` cluster, month 7+.
- **Cross-category bridges** — MockFrame uniquely spans mockups + beautifier +
  fake chat + store screenshots + promo video; no competitor SEO-covers even two.
  Bridge pages ("chat screenshot → app store set", "promo video per platform")
  are unclaimed.
- **Device × perspective permutations** — mockuuups-only moat (~350 pages). Our
  scene devices (tilted/floating/hand-held) could become `/mockups/[device]/[angle]`
  later — ONLY with the batch gates; this is the highest doorway-risk idea.
- **Integration landers** — `/figma`, `/sketch` "…mockup plugin" queries; relevant
  once extensions ship.
- **API endpoint landers** — pika's 16 pages; ours when `/developers/api` exits alpha.
- **AI-crawler stance** — side with brandbird: robots.txt should ALLOW GPTBot/
  ClaudeBot/PerplexityBot (LLM referrals are a growing free channel); deviceframes
  blocks them and forfeits it.

## Pruning lessons (what killed pages elsewhere)

- Keyword slugs or nothing — postspark's UUID templates rank for zero queries.
- 301 old programmatic generations immediately (mockuuups' split-equity migration).
- Never hide taxonomy behind an SPA without SSR/sitemap (previewed).
- A content layer that goes stale precedes death (launchmatic's 2020 blog).
