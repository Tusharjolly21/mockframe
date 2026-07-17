# AI Pack Generator — Design

**Date:** 2026-07-17
**Status:** Approved
**Route:** `/ai` (landing) + `POST /api/ai-pack` (generation)
**Depends on:** App Store Pack Studio (feat/pack-studio, spec 2026-07-16)

## Problem

The pack studio requires users to supply screenshots and write captions before
they see value. An AI entry point inverts this: describe your app (name + what
it's about) → a complete, beautiful 8–10 screenshot pack appears in the studio
— captions written, style and palette chosen, and plausible **concept UI**
filling every device so the first impression is a finished pack, not
placeholders. Users then swap in real screenshots at their own pace. This is
the wow/viral moment competitors don't have, and it feeds the existing
first-pack-free export funnel.

## Decisions (from brainstorming)

- **Scope:** AI generates captions + style + palette + screen order AND
  concept-UI screen content (user chose "Concept UI screens too").
- **Gating:** 2 free generations for signed-in users (server-tracked), then
  Pro; Pro capped by a daily quota (abuse guard). Guests see a demo + sign-in
  prompt. Anonymous Firebase sessions count as guests (billing-route pattern).
- **URL:** path on the main domain — `/ai` — not a subdomain. Generation opens
  the pre-filled pack in `/app-store-screenshots` in a NEW TAB.
- **Model:** `claude-opus-4-8` via `@anthropic-ai/sdk`, `client.messages.parse()`
  with `zodOutputFormat` (schema-enforced JSON). `ANTHROPIC_API_KEY` server-side
  only. Env override `MOCKFRAME_AI_MODEL` permitted; default stays opus.
- **Counter increments only on successful generation** (valid plan returned).

## Architecture

```
/ai (landing, form)                POST /api/ai-pack                studio
  name + description  ───────────►  auth + gate + quota   ┌──────► /app-store-screenshots
                                    Claude parse() call   │         (new tab, hydrates
                                    plan → PackDocument ──┘          via loadLatestPack)
                                    with screen: assetIds
                                    (concept docs)
```

### 1. Concept-UI screens — `app: "aiapp"` ScreenDoc variant

New variant in the existing `ScreenDoc` discriminated union
(`apps/web/lib/screens/types.ts`) + renderer `apps/web/lib/screens/aiapp.ts`
registered in `lib/screens/index.ts` (same pattern as the 30+ existing fake
screens). The doc is fully parameterized data — the AI supplies content, the
deterministic SVG renderer guarantees layout quality:

```ts
AiAppDoc {
  app: "aiapp"
  archetype: "onboarding" | "home-feed" | "dashboard" | "list" | "detail"
           | "profile" | "settings" | "chat"
  appName: string
  dark: boolean
  palette: { primary: string; bg: string; card: string; text: string; muted: string }
  header: { title: string; subtitle?: string }
  items: Array<{ title: string; subtitle?: string; value?: string; emoji?: string }>  // 0–8
  stats?: Array<{ label: string; value: string }>                                     // 0–4
  cta?: string
  tabs?: string[]                                                                     // 0–5 bottom nav labels
}
```

Each archetype maps the same fields to a different layout (onboarding = hero +
CTA; dashboard = stat cards + chart placeholder; chat = message bubbles from
`items`; etc.). Rendered size: 1320×2868 logical (portrait phone), scaled by
the existing screen-asset pipeline. Encoded with `encodeScreenAsset(doc)` —
the resulting `screen:` asset id needs no storage and round-trips through
drafts/IndexedDB for free (this is how existing chat screens persist).

### 2. AI plan schema + prompt — `apps/web/lib/ai/plan.ts` (server-safe)

Zod schema for what Claude returns (`AiPackPlanSchema`): `styleId` (one of the
8 pack styles), `accent` (hex), `captionPosition`, `screens` 8–10 of
`{ archetype, caption: {title, subtitle?}, doc: <AiAppDoc fields minus app/appName> }`.
Structured-outputs constraints respected (no regex/length keywords; enums for
archetypes/styles; `additionalProperties: false` handled by `zodOutputFormat`).
Prompt (same file): system prompt teaching pack narrative structure (hook →
core features → social proof → CTA), caption copywriting rules (≤6 words
title, benefit-led), palette guidance; user turn carries app name +
description. `buildPackFromPlan(plan, appName): PackDocument` — pure function
converting a validated plan into a PackDocument with encoded screen assets
(unit-testable without any API call).

### 3. Route — `apps/web/app/api/ai-pack/route.ts`

POST `{ appName, description }` (name ≤60 chars, description ≤600 chars):
1. `getRequestOwner`; reject guests AND anonymous providers → 401 `{reason:"signin"}`.
2. Gate: Pro (via `readBilling`/`isBillingActive`) → allowed, subject to daily
   quota (`checkQuota` from `lib/server/quota.ts`, limit ~20/day) → 429 when
   exhausted. Non-Pro → transactional read of
   `mockframeOwners/{ownerId}/private/ai-generations`; count ≥ 2 → 402
   `{reason:"pro"}`.
3. `client.messages.parse({ model, thinking: {type:"adaptive"}, max_tokens: 16000,
   output_config: { format: zodOutputFormat(AiPackPlanSchema) }, ... })`.
4. Validate `parsed_output` (null → 502 friendly error, counter untouched).
5. `buildPackFromPlan` → increment counter transactionally → return
   `{ pack, remaining }`.
- Missing `ANTHROPIC_API_KEY` → 501 `{error:"AI is not configured"}`.
- Claude API errors: typed-exception chain; 429/overloaded → 503 "busy, retry";
  others → 502. Counter never incremented on any failure path.

### 4. Landing — `apps/web/app/ai/page.tsx` + `components/ai/AiPackForm.tsx`

Server component page: SEO metadata (title "AI App Store Screenshot Generator"),
FAQ JSON-LD, marketing copy, static example screenshot strip. Client form:
app name + description + optional accent color; submit → loading state with
progress copy (~15–40 s: adaptive thinking) → on success `savePack(pack)` then
`window.open("/app-store-screenshots", "_blank")` + inline success card
(fallback link if popup blocked). 401 → AuthModal; 402 → UpgradeModal
(reason: `"AI-generated screenshot packs"`); 429/5xx → friendly retry copy.
Sitemap entry (priority 0.9) + marketing nav/footer links.

### 5. Testing

- Unit: AiAppDoc/plan schemas; `buildPackFromPlan` (valid PackDocument, screen
  count, encoded asset ids decode back to the same doc, style/accent applied);
  aiapp renderer returns valid SVG for every archetype (smoke: parseable, no
  `NaN`/`undefined` in output); gate decision function.
- Route logic factored into pure helpers where practical; live-API path tested
  manually/E2E only if `ANTHROPIC_API_KEY` is present (skipped otherwise).
- E2E (verify skill): mock-free UI flow up to the API boundary; with key
  present, one real generation → studio hydration check.

## Out of scope (v1)

- Regenerate-single-screen / iterate-with-AI inside the studio
- AI from a URL or App Store listing (scrape) — future
- Localized caption generation (pairs with pack-studio v2 localization)
- Streaming progress UI from the model (single response is fine at this size)
