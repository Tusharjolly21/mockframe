# MockFrame SEO system

Production-grade SEO operating system, built 2026-07-18 from live SERP research
(~27 keyword searches, 10+ competitor architecture audits) + Google policy docs +
the codebase's real data. Not tips — a system: every page ships from a template,
every batch passes a gate, every claim maps to a real feature.

## The files

| Doc | What it is |
|---|---|
| [01-keyword-database.md](01-keyword-database.md) | ~580 keywords in 17 groups (A–Q), tiered, each mapped to a page type |
| [02-site-architecture.md](02-site-architecture.md) | Full page-type map (~95 → ~220 pages), hub-spoke rules, URL conventions |
| [03-programmatic-seo.md](03-programmatic-seo.md) | 5 pSEO engines w/ data models, uniqueness bars, batch gates |
| [04-page-templates.md](04-page-templates.md) | Title/meta/H1/schema/internal-link formulas per page type |
| [05-technical-checklist.md](05-technical-checklist.md) | Next.js technical audit — ✅ done / ⬜ todo, monitoring cadence |
| [06-backlinks-distribution.md](06-backlinks-distribution.md) | 4-tier link strategy for design/dev communities |
| [07-roadmap.md](07-roadmap.md) | 12-month build order by impact × difficulty, with success metrics |
| [08-competitor-audit.md](08-competitor-audit.md) | 13-site recon: league table, corrections, new opportunities, pruning lessons |

## The five strategic bets (from the research)

1. **Spec pages are the authority wedge** — every winning competitor ranks via
   "sizes 2026" tables; ours will be product-backed data, not blog posts.
2. **Dead competitors = free demand** — smartmockups (shut down 2026), screely
   (domain squatted), launchmatic (offline): their "alternative" queries are live
   and weakly answered. Months 1–2 priority.
3. **`/vs/` comparison pages are unclaimed by all 13 audited competitors** —
   highest conversion intent. (Alternatives pages: only mockuuups runs them —
   we out-execute on depth + freshness, not first-mover.)
4. **"Fake text message VIDEO" is the fastest-rising cluster** — our chat replay
   + MP4 export already is that product; it needs a landing page.
5. **Four modifiers win titles**: free · no watermark · no sign-up · in-your-browser.
   MockFrame genuinely qualifies for all four — most competitors don't.

## Operating rules (non-negotiable)

- Helpful-content risk is domain-wide: batches ≤15 pages, 80% indexation gate,
  quarterly prune. Quality bar over page count.
- No promise-pages: a tool page ships only when the tool works.
- No fabricated schema (ratings/reviews), no doorway multiplication.
- Honest dates everywhere: sitemap lastModified, spec verifiedAt, comparison
  lastVerified.

## Immediate owner actions (blocking measurement)
1. Verify domain in Google Search Console + Bing, submit `/sitemap.xml`.
2. Claim AlternativeTo + Product Hunt listings.
