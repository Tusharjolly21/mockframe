# AI Refinements Implementation Plan (Phase 5, final)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Checkbox steps.

**Goal:** Tone/audience controls, live style mini-previews, regenerate-captions (no free-slot cost), and a hardening batch that clears the prior-phase polish queue.

**Spec:** `docs/superpowers/specs/2026-07-19-ai-refinements-design.md`

## Global Constraints

- Branch `feat/ai-refinements` (off main). `packages/*` untouched. Concurrent session shares checkout: file-scoped `git add`, non-default ports, no broad pkill. Trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- **Back-compat binding:** `pack.source` is `.optional()`; legacy packs parse unchanged; `createPack()` does NOT set it. Existing tests pass UNMODIFIED (except deliberate fixture updates, noted).
- **Recaption gating binding:** recaption is sign-in + anonymous-excluded + daily-quota (`"ai-pack"`) only — it MUST NOT read or increment the free-slot counter (`private/ai-generations`). A recaption for a free non-Pro user with 2 prior generations still succeeds (quota permitting).
- **Pure & never-throws:** `repairRecaption`/`applyCaptions` never throw; recaption applies exactly N captions for N screens.
- Tone enum: `["playful","professional","technical","bold","minimal"]`. Audience ≤60.
- Gates per task: `cd apps/web && npx vitest run lib/ai lib/screens lib/pack` (green incl. existing) + scoped typecheck `npx tsc -p . --noEmit 2>&1 | grep -vE "lib/promo|remotion/promo"` (raw exit).

---

### Task 1: schema + pure ops (source, recaption, apply)

**Files:** Modify `apps/web/lib/pack/schema.ts`, `apps/web/lib/ai/plan.ts`, `apps/web/lib/pack/ops.ts`; Tests `apps/web/lib/pack/__tests__/sourceSchema.test.ts`, `apps/web/lib/ai/__tests__/recaption.test.ts`

**Produces:**
- `schema.ts`: `TONE_IDS = ["playful","professional","technical","bold","minimal"] as const`, `type ToneId`; `PackSourceSchema = z.object({ description: z.string().max(600).optional(), tone: z.enum(TONE_IDS).optional(), audience: z.string().max(60).optional() })`; `pack.source: PackSourceSchema.optional()` on `PackDocumentSchema`; `type PackSource`.
- `plan.ts`: `RecaptionPlanSchema = z.object({ captions: z.array(z.object({ title: z.string(), subtitle: z.string().optional() })).min(1).max(10) })`; `type RecaptionPlan`; `AI_RECAPTION_SYSTEM_PROMPT` (caption rules only — benefit-led ≤6 words no period, subtitle optional ≤10 words; rewrite for the given app + tone/audience); `aiRecaptionUserPrompt(appName, description|undefined, tone|undefined, audience|undefined, screens: {archetype?:string; currentTitle?:string}[]): string`; `repairRecaption(captions: RecaptionPlan["captions"], n: number): {title:string; subtitle?:string}[]` — truncate to n, pad with `{title:""}` to reach n.
- `ops.ts`: `applyCaptions(pack: PackDocument, captions: {title:string; subtitle?:string}[]): PackDocument` — pure; sets `screens[i].captions.en = { title: captions[i].title.slice(0,120), ...(subtitle trimmed ? {subtitle: subtitle.slice(0,160)} : {}) }` for each screen up to min(len), leaves extra screens unchanged; returns a new pack (spread, don't mutate).

- [ ] **Step 1 (RED):** write both test files. `sourceSchema.test.ts`: source optional (legacy parses), createPack has no source, over-cap audience/description rejected, bad tone rejected. `recaption.test.ts`: `RecaptionPlanSchema` parses/rejects (0 and 11 captions); `repairRecaption` pads/truncates to n exactly (3→5 pads two blanks, 7→5 truncates); `applyCaptions` sets en captions clamped, drops blank subtitle, returns new object (input unmutated), handles fewer captions than screens; `aiRecaptionUserPrompt` includes tone/audience lines only when provided; prompt smoke (contains "caption"). Include concrete assertions.
- [ ] **Step 2 (RED-run):** `npx vitest run lib/ai lib/pack` → FAIL.
- [ ] **Step 3 (GREEN):** implement all three files.
- [ ] **Step 4:** full scoped suite + typecheck. Commit (5 files): `feat(ai): recaption + pack.source schema and pure ops`.

---

### Task 2: route — recaption mode + tone/audience + source attach

**Files:** Modify `apps/web/lib/ai/requestSchemas.ts`, `apps/web/app/api/ai-pack/route.ts`; Test `apps/web/lib/ai/__tests__/recaptionBody.test.ts`

- `requestSchemas.ts`: add `tone: z.enum(TONE_IDS).optional()` + `audience: z.string().max(60).optional()` to BOTH `ConceptBodySchema` and `RealBodySchema`; add `RecaptionBodySchema = z.object({ mode: z.literal("recaption"), appName: z.string().trim().min(1).max(60), description: z.string().max(600).optional(), tone: z.enum(TONE_IDS).optional(), audience: z.string().max(60).optional(), screens: z.array(z.object({ archetype: z.string().max(40).optional(), currentTitle: z.string().max(120).optional() })).min(1).max(10) })`; add it to `AiPackBodySchema` union (recaption first, then real, then concept).
- `route.ts`:
  - Concept/real user prompts: append tone/audience lines when present (extend `aiUserPrompt`/`aiRealUserPrompt` signatures with optional tone/audience OR build the lines in the route — pick one, keep tests green). Thread the body's tone/audience through.
  - After a successful concept/real `build()`, attach `pack.source = { description, tone, audience }` (only defined keys) BEFORE returning — so the studio can recaption later. (generateAndAccount returns the pack in the response; attach there or right after — ensure the returned + any client-persisted pack carries source.)
  - **Recaption branch** (before the concept/real branches, gated on `body.mode === "recaption"`): after the shared signin/anonymous check, run `consumeDailyQuota(quotaSubject(req, owner), "ai-pack", AI_DAILY_LIMIT)` → 429 if exhausted; **do NOT read/increment the free counter**; Claude `messages.parse` with `RecaptionPlanSchema` + `AI_RECAPTION_SYSTEM_PROMPT` + `aiRecaptionUserPrompt(...)`; `parsed_output` null → 502; `repairRecaption(parsed.captions, body.screens.length)`; return `attachOwnerCookie(NextResponse.json({ captions }), owner)`. Same error mapping (501/429/502) as the rest.
- `recaptionBody.test.ts`: recaption body parses; missing screens fails; >10 screens fails; concept body with tone/audience parses; bad tone fails.
- [ ] Gates + commit (3 files): `feat(ai): /api/ai-pack recaption mode + tone/audience + pack.source`.

Reviewer emphasis: recaption must not touch the free-slot counter; tone/audience optional & bounded; union order doesn't misparse recaption as concept.

---

### Task 3: form — tone + audience inputs

**Files:** Modify `apps/web/components/ai/AiPackForm.tsx`
- Add a **Tone** `<select>` (options: Auto/none + the 5 tones) and an **Audience** `<input maxLength=60>` ("Who's it for? e.g. indie developers") in a compact row near the description. State `tone: ToneId | ""`, `audience: string`. Thread into BOTH concept and real POST bodies as `tone: tone || undefined, audience: audience.trim() || undefined`. Preserve all existing behavior. Import `TONE_IDS`, `type ToneId`.
- Verify: scoped typecheck; dev server headless — selecting a tone + typing audience and generating includes them in the POST body (capture); empty → keys omitted. Commit: `feat(ai): tone + audience controls on the /ai form`.

---

### Task 4: studio — live style previews + regenerate captions

**Files:** Create `apps/web/components/pack/StyleThumb.tsx`; Modify `apps/web/components/pack/PackInspector.tsx`
- **StyleThumb.tsx** (`"use client"`): `StyleThumb({ pack, styleId, active, onClick })` — `useMemo` compiles `compilePackScene({ ...pack, styleId }, 0, "appstore-69")` keyed on `[styleId, pack.style.accent, pack.screens[0]?.assetId, pack.style.captionPosition, pack.style.fontFamily]`; render `SceneRenderer` (with `resolveAsset`) in a fixed box (`aspect-[9/19]`, ~w-full) via a scaled wrapper (measure not needed — use a fixed inner width = target width and `transform: scale(boxW/target)`; or a simpler `overflow-hidden` + `scale`). If `pack.screens[0]?.assetId` is falsy, render the OLD bg-swatch fallback instead (avoid an empty frame). Button with active ring.
- **PackInspector.tsx**: replace the Style gallery's swatch buttons with `<StyleThumb ...>` (keep the grid + selection via `update((p)=>({...p, styleId}))`). ADD a "Regenerate captions" button in the Caption section, shown only when `pack.source` exists: on click POST `firebaseFetch("/api/ai-pack", { mode:"recaption", appName: pack.appName, description: pack.source.description, tone: pack.source.tone, audience: pack.source.audience, screens: pack.screens.map(s=>({ archetype: /* the aiapp archetype if the screen is a screen: asset, else undefined */ undefined, currentTitle: s.captions.en?.title })) })`; on 200 `update((p)=>applyCaptions(p, json.captions))`; busy + error inline (401/429/other). Import `applyCaptions`, `firebaseFetch`.
  - Note on archetype: decoding the aiapp archetype from a `screen:` assetId is optional context; passing `currentTitle` alone is sufficient — keep it simple, pass `currentTitle` and omit archetype unless trivially available.
- Verify headless (non-default port): style gallery shows rendered hero thumbnails that switch style on click (and swatch fallback when no screenshot); a pack WITH source shows "Regenerate captions" and a mocked 200 updates captions; a pack without source hides the button. Legacy pack: no crash. Commit (2 files): `feat(pack): live style previews + regenerate-captions in studio`.

---

### Task 5: polish batch (clears prior-phase queue)

**Files:** Modify `apps/web/components/ai/AiPackForm.tsx`, `apps/web/app/api/ai-import/route.ts`, `apps/web/lib/ai/plan.ts`, `apps/web/components/pack/PackPreview.tsx`
- **AiPackForm image size pre-check:** in the real-mode two-pass prep, after `downscaleForAi`, if a data URL length > 540_000, call a lower-quality re-encode once (add `downscaleForAi(file, quality)` param or a `reencodeSmaller` — keep it simple: a second `downscaleForAi` at 0.6). If still >540_000, throw the distinct "One of your images is too detailed to send — crop it or use a smaller one." caught by the existing image-prep try/catch. (Closes P1.)
- **ai-import redirect body cancel:** in `fetchWithGuardedRedirects`, before `continue` on a 3xx hop, `response.body?.cancel().catch(()=>{})`. (Closes P2.)
- **real prompt wording:** in `AI_REAL_SYSTEM_PROMPT` and `aiRealUserPrompt`, change "Select and caption 2-10 of these" → "Caption every screenshot provided, in conversion-story order (do not omit any)." (Closes P1 caption-completeness.) Update the one real-plan test if it asserts the old wording (it asserts "subtitle"/"tweet" now — unaffected).
- **launch preview-dwell guard:** in `PackPreview`'s fallback effect, if `activeTarget` is a `launch:` id whose surface is disabled AND no store target is enabled, set `activeTarget` to the first ENABLED launch surface if any, else leave as-is (don't render a disabled surface). Keep it minimal and loop-safe.
- Gates + commit (4 files): `fix(ai): image-size pre-check, redirect body cancel, caption-all wording, launch preview guard`.

---

### Task 6: verification + merge readiness + memory

- Full scoped suites + typecheck + `npm run build` (ESLint gate — fix any no-explicit-any in touched files).
- E2E (`verify` skill): if live reachable (throwaway Firebase user + key), (a) generate with a tone+audience and confirm the pack renders + `pack.source` present; (b) click Regenerate captions and confirm captions change WITHOUT the free-generation count incrementing (check the counter before/after, or assert the response path); (c) style thumbnails render. Else deterministic: tsx proof that recaption path doesn't touch the counter + applyCaptions works, plus mocked-UI drive. Report method.
- Legacy pack (no source/marketing): studio opens, no Regenerate button, style previews fall back to swatches, no crash.
- Fix real bugs only; report.
- After merge: update memory (`pack-studio-followups.md`) — mark the 5-phase AI expansion complete on main; note recaption is daily-quota-only; list any remaining deferred items.
