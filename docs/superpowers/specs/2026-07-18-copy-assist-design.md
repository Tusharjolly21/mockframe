# Copy Assist — Design

**Date:** 2026-07-18 · **Status:** Approved · **Phase 4 of the 5-phase AI expansion**

## Problem

An owner who can't design also can't write launch copy. The AI generation
already understands the app — have the same call also return the text nobody
wants to write: App Store subtitle + description + keywords, a Product Hunt
tagline, and a launch tweet. Show it copyable on the success card, persist it
on the pack, and pre-fill the Launch Kit tagline from it.

## Design

Zero new API calls, zero new gating — marketing copy rides on the existing
`/api/ai-pack` generation (concept AND real mode).

### 1. Pack data (`lib/pack/schema.ts`) — optional, back-compat

`MarketingSchema` + optional `pack.marketing`:
```
marketing: z.object({
  appStoreSubtitle: z.string().max(30),
  appStoreDescription: z.string().max(600),
  keywords: z.array(z.string().max(25)).max(12),
  productHuntTagline: z.string().max(60),
  launchTweet: z.string().max(280),
}).optional()
```
`.optional()` — manual packs and all pre-Phase-4 packs never have it and stay
valid. `createPack()` does NOT set it (marketing only comes from AI). Accessor
not needed (consumers null-check `pack.marketing`).

### 2. AI plan (`lib/ai/plan.ts`)

Both `AiPackPlanSchema` and `RealPackPlanSchema` gain a `marketing` object
(same 5 fields, plain `z.string()`/`z.array(z.string())` — structured-outputs
strips length keywords and the builder clamps, matching the caption pattern).
Both system prompts gain a "Marketing copy" instruction block:
- appStoreSubtitle ≤30 chars, benefit-led, complements the app name (App Store shows it under the name)
- appStoreDescription: 2-4 short paragraphs, first line is the hook
- keywords: 6-12 single words/short phrases, no spaces-wasting duplicates of the app name
- productHuntTagline ≤60 chars, punchy, "what it does in one line"
- launchTweet ≤280 chars, first-person founder voice, 1 emoji max, no hashtag spam

`buildPackFromPlan` / `buildRealPackFromPlan`:
- Map `plan.marketing` → `pack.marketing` with per-field `.slice()` clamps
  (subtitle 30, description 600, each keyword 25 + array capped 12, tagline 60, tweet 280).
- **Integration:** pre-fill `pack.launch.tagline` from `marketing.productHuntTagline`
  (clamped to 120) so the Launch Kit graphics get a headline for free. (Surfaces
  stay off — the user opts in; the tagline is just seeded.)

### 3. Form success card (`components/ai/AiPackForm.tsx`)

Route response already returns `{ pack, remaining }`; the client parses the
pack (already does `PackDocumentSchema.safeParse`), so `pack.marketing` arrives
for free — store it in `SuccessState`. The success card gains a **"Launch
copy"** panel: each field in a compact row (label + value, description in a
scrollable box, keywords as chips joined by commas) with a copy-to-clipboard
button per field (uses `navigator.clipboard.writeText`, shows a transient
"Copied" state). Absent marketing (shouldn't happen post-Phase-4, but a
defensive guard) → panel hidden.

### 4. Studio (`components/pack/PackInspector.tsx`) — read-only display

Since marketing persists on the pack, add a read-only **"Launch copy"**
`Section` (only rendered when `pack.marketing` exists) mirroring the success
card's copyable rows, so a user returning to the studio still has their copy.

### 5. Testing

- Schema: optional marketing parses; a pack without it (legacy) parses;
  over-cap fields rejected by the schema.
- Plan: both plan schemas accept marketing; both builders clamp every field
  and set `pack.marketing`; `pack.launch.tagline` seeded from PH tagline
  (clamped 120); over-long AI copy clamped not rejected (build never fails).
- Prompts contain the marketing instruction block (smoke assertion).
- UI: copyable panel + studio section verified in phase E2E.

## Out of scope
Localized copy (v2); regenerating just the copy (Phase 5 could add it);
ASO keyword-density optimization; editing copy in-studio (read-only here).
