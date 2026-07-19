# AI Refinements (Cheap Wins + Polish) — Design

**Date:** 2026-07-19 · **Status:** Approved · **Phase 5 (final) of the AI expansion**

## Problem

Three cheap, high-leverage wins remain, plus a queue of hardening items
accumulated (and deliberately deferred) across Phases 1–4:

- **Tone & audience controls** — two prompt params sharpen output fit.
- **Live style mini-previews** — the studio style gallery shows bg swatches;
  show the actual hero screen rendered in each style (pure client, zero AI
  cost, one click to switch). Closes a long-standing ledgered follow-up.
- **Regenerate captions** — rewrite just the captions without burning a
  full free generation (daily-quota only). Softens the 2-free limit and the
  "I only hate screen 3" frustration.
- **Polish batch** — client-side image-size pre-check, redirect-hop body
  cancel, "caption all screenshots" prompt wording, launch preview-dwell
  guard.

## Design

### 1. Tone & audience (form → prompt)

`/ai` form gains an optional **tone** select (`playful | professional |
technical | bold | minimal`, default none) and an **audience** text input
(≤60 chars, e.g. "indie developers", "busy parents"). Threaded into BOTH
concept and real request bodies as optional `tone?`/`audience?`; the user
prompts append "Tone: X" / "Audience: Y" lines when present. Body schemas
(`requestSchemas.ts` + the concept schema in the route) gain the optional
fields; validation: tone is an enum, audience `.max(60)`.

### 2. `pack.source` — persist generation inputs (optional, back-compat)

New optional `pack.source: { description?: string(≤600), tone?: enum, audience?: string(≤60) }`.
Set by the AI builders from the generation inputs so the studio can
regenerate captions later. Manual/legacy packs: absent (like marketing).
Requires threading the inputs into `buildPackFromPlan`/`buildRealPackFromPlan`
(new optional param) — or, simplest, the route attaches `pack.source` after
`build()` before returning. **Chosen: route attaches source** (keeps builders
pure/unchanged, avoids a signature churn; the route already has the inputs).

### 3. Regenerate captions (`mode:"recaption"`)

New body variant: `{ mode:"recaption", appName, description?, tone?, audience?, screens: [{ archetype?: string, currentTitle?: string }] (1..10) }`.
Route: sign-in + anonymous-excluded (as always); **daily-quota only
(`"ai-pack"` bucket, shared) — does NOT read or increment the free-slot
counter** (recaption isn't a full generation). Claude call with
`RecaptionPlanSchema` = `{ captions: [{ title, subtitle? }] (matches screen
count) }`; a pure `repairRecaption(captions, n)` pads/truncates to exactly n
(never throws). Returns `{ captions }`.

Studio: a "Regenerate captions" button (in PackInspector, shown only when
`pack.source` exists) POSTs the current screens' archetypes + the pack's
`source`; on 200 applies each returned caption to the corresponding screen
via a new pure op `applyCaptions(pack, captions)`. Errors inline (401→ signin
prompt, 429→ "daily limit", else retry copy). No new gating counter.

### 4. Live style mini-previews (studio, pure client)

`StyleThumb({ pack, styleId })` compiles `compilePackScene({...pack, styleId},
0, "appstore-69")` (hero screen) and renders it via `SceneRenderer` inside a
fixed ~small box with `transform: scale(fit)`, memoized on
`(styleId, accent, heroAssetId, captionPosition)`. Replaces the bg-swatch in
the style gallery grid. Falls back to the existing swatch when the pack has
no hero asset (screens[0].assetId null) to avoid an empty device frame.

### 5. Polish batch (clears prior-phase queue)

- **P1 image size pre-check** (`AiPackForm`): after `downscaleForAi`, if any
  data URL exceeds ~540K chars, re-encode that image at lower quality once;
  if still over, show a clear inline error naming the file instead of a bare
  400. (Closes the "bare Invalid request on a heavy photo" Minor.)
- **P2 redirect-hop body cancel** (`ai-import/route.ts`): `response.body?.cancel()`
  on each 3xx hop before following. (Socket hygiene.)
- **P1 prompt wording** (`AI_REAL_SYSTEM_PROMPT`): change "Select and caption
  2–10" → "Caption every screenshot provided, in conversion-story order" so
  repair never leaves uncaptioned screens. (Real-mode caption completeness.)
- **P3 launch preview-dwell guard** (`PackPreview`): when the active
  `launch:` surface is disabled and NO store target is enabled either, clear
  the active tab to a neutral state rather than dwelling on a disabled
  surface. (Narrow UX edge.)

## Testing

- Schema: `pack.source` optional (legacy parses); `RecaptionPlanSchema`;
  `applyCaptions`/`repairRecaption` pure-fn edge cases (n mismatch, blank).
- Route: recaption body variant parses; recaption does NOT touch the free
  counter (assert via the decision path); tone/audience thread into prompts.
- UI + polish verified in the phase E2E; the pure ops + schema are the unit
  focus.

## Out of scope
Localized recaption; regenerating a single screen's caption (batch only);
tone/audience presets library; editing marketing copy in-studio.
