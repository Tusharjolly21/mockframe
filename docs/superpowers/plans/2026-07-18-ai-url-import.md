# AI URL Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Checkbox steps.

**Goal:** Paste a URL on `/ai` → server fetches + extracts the page copy (SSRF-guarded) → form pre-filled.

**Spec:** `docs/superpowers/specs/2026-07-18-ai-url-import-design.md`

## Global Constraints

- Branch `feat/ai-url-import` (off main). `packages/*` untouched. Concurrent session: file-scoped `git add`, non-default ports, no broad pkill. Trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- `lib/ai/extract.ts` server-safe, pure, no new dependencies.
- SSRF guard: MUST use the existing `apps/web/lib/server/ssrf.ts` API (read it + the capture route sibling first); every redirect hop re-validated; http/https only; 8s timeout; ≤1MB read; text/html only.
- Import is sign-in-gated (anonymous excluded) + day-quota `"ai-import"` 30/day; it must NOT touch the ai-generations free counter.
- Status contract: 400 invalid url · 401 signin · 422 no readable text · 429 quota · 502 fetch/timeout/non-HTML.
- Gates: `cd apps/web && npx vitest run lib/ai lib/screens lib/pack` + scoped typecheck (`npx tsc -p apps/web --noEmit 2>&1 | grep -v promo`, raw exit reported).

---

### Task 1: extractor (pure) — TDD

**Files:** Create `apps/web/lib/ai/extract.ts`; Test `apps/web/lib/ai/__tests__/extract.test.ts`

`extractSiteCopy(html: string, url: string): { appName: string; description: string }`

Behavior (test each, RED first):
- appName priority: `og:site_name` → `og:title` → `<title>`; strip trailing ` — X` / ` | X` / ` - X` separators; entity-decode (`&amp;` etc.); trim; `.slice(0, 60)`; fallback to the URL hostname (no `www.`) when all absent.
- description: start with `meta[name="description"]` content or `og:description` (longer wins); append first `<h1>` text and up to first three `<p>` texts (each >40 chars after stripping) not already substrings of the accumulated text; join with `" "`; strip `<script>`/`<style>` blocks BEFORE any text extraction; strip all tags; decode common entities (`&amp; &lt; &gt; &quot; &#39; &nbsp;`); collapse whitespace; `.slice(0, 600)`.
- Robustness: attribute order variance (`content` before/after `property`/`name`), single/double quotes, uppercase tags, malformed html (unclosed tags) — never throws; empty html → `{ appName: <hostname>, description: "" }`.

Tests include one realistic landing-page fixture string (~40 lines with og tags, nav noise, script/style blocks, h1, three paragraphs) asserting exact expected output, plus the edge cases above. Commit: `feat(ai): pure site-copy extractor`.

---

### Task 2: `/api/ai-import` route

**Files:** Create `apps/web/app/api/ai-import/route.ts`; Test `apps/web/lib/ai/__tests__/importGate.test.ts` only if you extract a pure decision helper (optional — the gating here is simple enough to review by inspection).

- READ FIRST: `apps/web/lib/server/ssrf.ts` (actual exported API) and the capture route that uses it (grep for the importer) — mirror its usage exactly, including redirect handling if it provides it; otherwise implement manual redirect loop (≤3 hops, re-validate each `Location` with the guard, `redirect: "manual"` fetch).
- Structure mirrors `/api/ai-pack`: `getRequestOwner` → signedIn check (anonymous excluded) → 401; `consumeDailyQuota(quotaSubject(req, owner), "ai-import", 30)` → 429; fetch with `AbortSignal.timeout(8000)`, `headers: { accept: "text/html" }`; verify final content-type includes `text/html` else 502; stream-read capped at 1MB (reader loop, abort past cap) else truncate at cap; `extractSiteCopy(html, finalUrl)`; description <10 chars → 422; else 200 `{ appName, description }`. `FirebaseConfigError` → 501. Fetch/abort errors → 502 `{error:"Couldn't read that page"}`.
- `export const runtime = "nodejs"; export const maxDuration = 30;`
Commit: `feat(ai): /api/ai-import — SSRF-guarded page copy extraction`.

---

### Task 3: form import UI

**Files:** Modify `apps/web/components/ai/AiPackForm.tsx`

- Add above the app-name field: single-line URL input + "Import" button (busy spinner while fetching). POST via `firebaseFetch` to `/api/ai-import`. Success: fill `appName` and `description` state (overwrite, but only after user confirmation if either field is non-empty — a small inline confirm: "Replace what you've typed?" yes/no buttons). Errors inline under the input: 401 → open AuthModal; 422/502 → "Couldn't read that page — paste your details manually."; 429 → body error. Import never touches images/mode.
- Verify headless on a non-default port: import a live URL (e.g. https://example.com) while signed out → AuthModal; layout doesn't break mobile (single column). Scoped typecheck.
Commit: `feat(ai): URL import on the /ai form`.

---

### Task 4: verification

- Scoped suites + typecheck + `npm run build` (route present).
- E2E (`verify` skill): with the dev Firebase test-user pattern from the previous phase's task-4 report (mint throwaway user via Identity Toolkit REST if the env supports it): live import of `https://example.com` → 200 with extracted copy; quota + signin negative paths. Delete test users after.
- Fix real bugs only; report.
