# AI URL Import — Design

**Date:** 2026-07-18 · **Status:** Approved · **Phase 2 of the 5-phase AI expansion**

## Problem

Owners already have a website or store listing that explains their app. Let
them paste a URL instead of writing a description: we fetch the page
server-side, extract its copy, and pre-fill the generator.

## Design

**Form (`/ai`):** an "Import from URL" input + button above the fields. On
import: POST `/api/ai-import` `{ url }` → `{ appName, description }` →
pre-fill both fields (user can edit, then generates normally — concept or
real mode). Errors inline ("Couldn't read that page — paste details
manually"). Import itself costs no AI generation and is NOT gated by the
free counter — but IS quota-limited.

**Route `POST /api/ai-import`:**
- Body: `{ url: z.string().url().max(2048) }`; scheme must be http/https.
- Sign-in required (same anonymous-excluded check — prevents anonymous
  scrape-proxy abuse); per-day quota `"ai-import"` limit 30 (all users)
  via `consumeDailyQuota`; NO free-slot counter.
- SSRF: resolve + validate the host with the EXISTING `lib/server/ssrf.ts`
  guard (read its actual API; the capture route is the sibling pattern).
  Follow ≤3 redirects, re-validating each hop. Timeout 8s. Response caps:
  content-type must be text/html; read ≤1MB.
- Extraction (pure fn, `lib/ai/extract.ts`, server-safe, unit-tested):
  `extractSiteCopy(html: string, url: string): { appName: string, description: string }`
  — appName from `og:site_name` | `og:title` | `<title>` (strip separators
  like " — ", " | " tails; ≤60 chars); description assembled from
  `meta[name=description]` | `og:description` + first `<h1>` + first few
  `<p>` texts (tags stripped, entities decoded, whitespace collapsed,
  scripts/styles removed) capped at 600 chars. No external HTML-parser
  dependency — regex/string based, defensive.
- Response `{ appName, description }`; 400 invalid url; 401 signin; 422
  "page had no readable text" (extraction produced <10 chars of
  description); 429 quota; 502 fetch failed/timeout/non-HTML.

**No AI call in this phase** — extraction is deterministic; the user reviews
the pre-filled text and hits Generate (Phase 1/concept flows unchanged).

## Out of scope
Screenshotting the URL for a website-mockup screen; App Store listing
scraping (specialized markup) — the generic extractor handles those pages
acceptably via their meta tags.
