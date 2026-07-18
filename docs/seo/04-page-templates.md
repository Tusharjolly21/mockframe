# Page templates — title, meta, H1, schema, internal links

The per-page-type formulas. Every new page copies its type's template; never freelance
a title format. `{Device}` = registry `name`, `{App}` = chat app, `{N}` = live count
(compute, never hardcode).

Global rules (all types):
- Title ≤ 60 chars, primary keyword left-anchored, brand suffix via the root
  template (`%s — MockFrame`). Don't repeat "MockFrame" inside `%s`.
- Meta description 140–160 chars: what it does + differentiator ("free", "no
  watermark", "no sign-up") + soft CTA. Unique per page — never templated verbatim.
- Exactly one H1 per page, matching title intent (not necessarily identical).
- Canonical: every indexable page sets `alternates.canonical` (relative path).
- JSON-LD: every indexable page emits BreadcrumbList + its type-specific schema
  via a `@graph`. Never fabricate `aggregateRating` — only add ratings when a real
  review system exists.
- Every page links: 1 hub (up), 3–6 siblings (across), 1–3 cross-type (e.g. device
  page → guide). Anchor text = the target's primary keyword, varied naturally.

---

## 1 · Device mockup page — `/mockups/[deviceId]`

| Slot | Template |
|---|---|
| Title | `{Device} Mockup — Free Online {Category} Frame` |
| Meta | `Put your screenshot in a pixel-accurate {Device} frame online. Free, no watermark, exports up to 4K PNG. {Resolution}px screen, {extra device fact}.` |
| H1 | `{Device} mockup generator` |
| H2s | `Drop in your screenshot` · `{Device} screen specs` · `Best uses for {Device} mockups` · `FAQ` · `More {category} mockups` |
| Schema | `SoftwareApplication` (existing) + `BreadcrumbList` (Home → Mockups → {Device}) + `FAQPage` (once real FAQs added) |
| Links out | `/mockups` hub · 4 sibling devices (same category) · 1 guide (`create-device-mockup`) · `/tools/app-store-screenshot` when phone/tablet |

Uniqueness bar: spec table from registry data (screen px, corner radius, frame
dimensions) + 2–3 device-specific FAQ answers (export resolution, orientation,
matching store-listing sizes) + category-specific "best uses" paragraph. ≥400
unique words. Never ship a device page that is only swapped nouns.

## 2 · Tool landing page — `/tools/[slug]`

| Slot | Template |
|---|---|
| Title | `{Tool Name}` (already keyword-shaped, e.g. `Fake WhatsApp Chat Generator`) |
| Meta | Existing pattern: what + for-whom + `free / no sign-up` |
| H1 | `{Tool Name}` |
| Schema | `WebApplication` + `HowTo` (3 visible steps) + `FAQPage` (3–4 visible Q&As) + `BreadcrumbList` (Home → Tools → {Tool}) — all existing |
| Links out | `/tools` hub · 3 related tools · relevant guide · relevant device page |

Uniqueness bar: overview paragraph (~120 words, tool-specific details) + distinct
FAQ set. Already implemented — new tools must match it.

## 3 · Comparison page — `/compare/[a]-vs-[b]` (NEW type)

| Slot | Template |
|---|---|
| Title | `{A} vs {B}: Which Mockup Tool in {Year}?` |
| Meta | `Honest {A} vs {B} comparison: pricing, watermarks, export limits, device frames, and when each tool wins. Updated {Month Year}.` |
| H1 | `{A} vs {B}` |
| H2s | `TL;DR` · `Pricing compared` · `Feature table` · `When {A} wins` · `When {B} wins` · `How MockFrame compares` · `FAQ` |
| Schema | `Article` + `BreadcrumbList` + `FAQPage` |
| Links out | `/compare` hub · 2 sibling comparisons · the MockFrame tool that matches the use case |

Rules: be genuinely honest (credibility is the ranking asset — say when the
competitor wins), keep a real feature table from checked facts, stamp a reviewed
date and re-verify quarterly. MockFrame gets a section, not the verdict rigged.

## 4 · Alternative page — `/alternatives/[competitor]` (NEW type)

| Slot | Template |
|---|---|
| Title | `{Competitor} Alternatives: {N} Free Options ({Year})` |
| Meta | `Looking for a {competitor} alternative? {N} options compared on price, watermarks and features — including free ones. See which fits your workflow.` |
| H1 | `Best {Competitor} alternatives` |
| Schema | `ItemList` (the alternatives) + `Article` + `BreadcrumbList` + `FAQPage` |

Rules: list 5–7 real alternatives including competitors (not a MockFrame ad — one
earns the "honest roundup" backlinks). MockFrame first only where it truly fits.

## 5 · Guide — `/guides/[slug]`

| Slot | Template |
|---|---|
| Title | Task phrasing: `How to {task}` or the existing benefit phrasing |
| Meta | Outcome + method + time (`in 3 steps`, `4 min`) |
| H1 | Guide title |
| Schema | `HowTo` (existing) + `BreadcrumbList` + `Article` w/ `dateModified` (add) |
| Links out | `/guides` hub · 3 related guides (existing) · the tool/device page the guide operates |

Uniqueness bar: guides are hand-written, 600+ words, with real screenshots of the
editor (image SEO: descriptive filenames + alt).

## 6 · Spec/answer page — `/specs/[topic]` (NEW type, e.g. app-store-screenshot-sizes)

| Slot | Template |
|---|---|
| Title | `{Topic} ({Year}): Every Size + Free Templates` |
| Meta | Direct answer promise + freshness: `All {topic} in one table — {key numbers}. Updated for {Year}, with free templates sized correctly.` |
| H1 | `{Topic}, {Year}` |
| Body | THE ANSWER in the first 100 words (featured-snippet shaped: table first), then detail, then CTA into the matching tool |
| Schema | `Article` + `FAQPage` + `BreadcrumbList`; table as real `<table>` |

These are the featured-snippet hunters (sizes, dimensions, requirements). Must be
updated when platforms change — stamp `dateModified` honestly.

## 7 · Template gallery — `/templates/collection/[group]`

Existing. Title: `{Group} Templates — Free {Category} Scenes`. Add `CollectionPage`
schema + 80–120 words of intro copy per collection (currently thin).

## 8 · Hub pages — `/mockups`, `/tools`, `/guides`, `/templates`, (`/compare`, `/alternatives` when built)

`CollectionPage` schema listing children (as done on `/tools`), intro copy
(100+ words), grouped child links with keyword anchors, breadcrumb to home.
Every child links back up. No orphans — a page ships only with its hub entry.

---

## Internal-link matrix (who links to whom)

| From ↓ To → | Device | Tool | Guide | Compare | Spec | Hub |
|---|---|---|---|---|---|---|
| Device page | 4 siblings | 1–2 | 1 | — | 1 if relevant | parent |
| Tool page | 1–2 | 3 related | 1 | — | 1 | parent |
| Guide | 1–2 | the tool it teaches | 3 | — | — | parent |
| Compare | — | winner-fit tool | — | 2 | — | parent |
| Spec | 1–2 | matching tool | 1 | — | 2 | parent |
| Homepage | top 4 | top 4 | 2 | — | 1 | all |

Footer carries: hubs + top ~12 money pages only (not every page — keep crawl
signal concentrated).
