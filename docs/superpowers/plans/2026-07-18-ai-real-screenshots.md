# AI Real-Screenshots Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Checkbox steps.

**Goal:** `/ai` accepts 2–10 real screenshots; Claude captions/orders them and returns a pack referencing the user's full-res local assets.

**Spec:** `docs/superpowers/specs/2026-07-18-ai-real-screenshots-design.md`

## Global Constraints

- Branch `feat/ai-real-screens` (off main). `packages/*` untouched. Another session shares the checkout: file-scoped `git add` only; non-default ports; no broad pkill. Commit trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- `lib/ai/*.ts` (non-test) stays server-safe (no `"use client"`) EXCEPT the new `clientImages.ts` which is client-only.
- Back-compat: existing concept-mode requests (no `mode` field) must behave exactly as today; existing tests must keep passing unmodified.
- Ref repair must be lossless (every provided refId appears exactly once in the final pack) and never throw after a successful Claude call.
- Image inputs: `^data:image\/(png|jpeg|webp);base64,` and ≤400KB each, 2–10 items, refId `^[A-Za-z0-9_-]{1,64}$`.
- Gates per task: `cd apps/web && npx vitest run lib/ai lib/screens lib/pack` + scoped typecheck (`npx tsc -p apps/web --noEmit 2>&1 | grep -v promo`, report raw exit).

---

### Task 1: plan module additions (schema, prompt, repair, builder)

**Files:** Modify `apps/web/lib/ai/plan.ts`; Test `apps/web/lib/ai/__tests__/realPlan.test.ts`

**Produces:**
- `RealPackPlanSchema` / `type RealPackPlan` — `{ styleId: enum(PACK_STYLE_IDS), accent: HEX_COLOR-regex string, captionPosition: enum, screens: array({ ref: z.string(), caption: { title: string, subtitle?: string } }).min(2).max(10) }`
- `AI_REAL_SYSTEM_PROMPT: string` (per spec: concept prompt's narrative/caption/palette rules, no concept-UI section, plus describe-what-you-see + brand-color rules; keep the 6-word title rule and lowercase-hex rule)
- `aiRealUserPrompt(appName: string, description: string | undefined, accent: string | undefined, refIds: string[]): string` — lists each screenshot as `Screenshot <i> (ref: <refId>)` and instructs referencing by ref
- `repairRealPlanScreens(screens: RealPackPlan["screens"], refIds: string[]): RealPackPlan["screens"]` — pure: filter invalid refs, dedupe first-wins, append missing refs (original order) as `{ ref, caption: { title: "" } }`
- `buildRealPackFromPlan(plan: RealPackPlan, appName: string, refIds: string[]): PackDocument` — runs repair, then screens with `assetId = ref`, captions clamped `.slice(0,120)`/`.slice(0,160)` (same as concept), style fields applied

- [ ] **Step 1 (RED):** write `realPlan.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { PackDocumentSchema } from "../../pack/schema";
import { buildRealPackFromPlan, RealPackPlanSchema, repairRealPlanScreens, type RealPackPlan } from "../plan";

const REFS = ["a1", "b2", "c3", "d4"];
const plan = (screens: RealPackPlan["screens"]): RealPackPlan =>
  RealPackPlanSchema.parse({ styleId: "minimal-light", accent: "#0ea5e9", captionPosition: "top", screens });

const s = (ref: string, title = `cap ${ref}`) => ({ ref, caption: { title } });

describe("repairRealPlanScreens", () => {
  it("keeps a valid permutation untouched", () => {
    const input = [s("b2"), s("a1"), s("d4"), s("c3")];
    expect(repairRealPlanScreens(input, REFS)).toEqual(input);
  });
  it("drops unknown refs, dedupes first-wins, appends missing in original order", () => {
    const out = repairRealPlanScreens([s("b2"), s("zz"), s("b2", "dupe"), s("a1")], REFS);
    expect(out.map((x) => x.ref)).toEqual(["b2", "a1", "c3", "d4"]);
    expect(out[0].caption.title).toBe("cap b2");
    expect(out[2].caption.title).toBe("");
  });
  it("handles a fully-invalid plan by returning all refs with empty captions", () => {
    const out = repairRealPlanScreens([s("x"), s("y")], REFS);
    expect(out.map((x) => x.ref)).toEqual(REFS);
  });
});

describe("buildRealPackFromPlan", () => {
  it("produces a valid PackDocument whose assetIds are the refIds", () => {
    const pack = buildRealPackFromPlan(plan([s("b2"), s("a1"), s("c3"), s("d4")]), "Focusly", REFS);
    expect(PackDocumentSchema.safeParse(pack).success).toBe(true);
    expect(pack.screens.map((x) => x.assetId)).toEqual(["b2", "a1", "c3", "d4"]);
    expect(pack.styleId).toBe("minimal-light");
  });
  it("clamps long captions to schema caps", () => {
    const pack = buildRealPackFromPlan(
      plan([{ ref: "a1", caption: { title: "x".repeat(300), subtitle: "y".repeat(300) } }, s("b2")]),
      "Focusly",
      ["a1", "b2"]
    );
    expect(pack.screens[0].captions.en.title).toHaveLength(120);
    expect(pack.screens[0].captions.en.subtitle).toHaveLength(160);
  });
  it("schema rejects <2 or >10 screens and bad accent", () => {
    expect(RealPackPlanSchema.safeParse({ styleId: "minimal-light", accent: "#0ea5e9", captionPosition: "top", screens: [s("a1")] }).success).toBe(false);
    expect(RealPackPlanSchema.safeParse({ styleId: "minimal-light", accent: "blue", captionPosition: "top", screens: [s("a1"), s("b2")] }).success).toBe(false);
  });
});
```

Run `npx vitest run lib/ai` → FAIL (missing exports).

- [ ] **Step 2 (GREEN):** implement in `plan.ts`. Note: a repaired screen list can exceed the pack cap only if refIds > 10 — inputs are route-capped at 10, assert nothing; `min(2)` on the schema is the wire contract, repair operates after parse. Builder mirrors `buildPackFromPlan`'s style application and caption conditional-spread exactly.
- [ ] **Step 3:** full scoped suite + typecheck → PASS. Commit: `feat(ai): real-screenshots plan schema, repair, builder`.

---

### Task 2: route real-mode branch

**Files:** Modify `apps/web/app/api/ai-pack/route.ts`; Test `apps/web/lib/ai/__tests__/realBody.test.ts` (pure body-schema module)
**Also create:** `apps/web/lib/ai/requestSchemas.ts` (server-safe) so the union is unit-testable:

```ts
import { z } from "zod/v4";

export const HEX = /^#[0-9a-fA-F]{6}$/;
const IMAGE_DATA_URL = /^data:image\/(png|jpeg|webp);base64,/;
const REF_ID = /^[A-Za-z0-9_-]{1,64}$/;
// ~400KB binary ≈ ~547K base64 chars + header slack
const MAX_IMAGE_CHARS = 560_000;

export const ConceptBodySchema = z.object({
  mode: z.literal("concept").optional(),
  appName: z.string().trim().min(1).max(60),
  description: z.string().trim().min(10).max(600),
  accent: z.string().regex(HEX).optional(),
});

export const RealBodySchema = z.object({
  mode: z.literal("real"),
  appName: z.string().trim().min(1).max(60),
  description: z.string().trim().max(600).optional(),
  accent: z.string().regex(HEX).optional(),
  screenshots: z.array(z.object({
    refId: z.string().regex(REF_ID),
    image: z.string().regex(IMAGE_DATA_URL).max(MAX_IMAGE_CHARS),
  })).min(2).max(10),
});

export const AiPackBodySchema = z.union([RealBodySchema, ConceptBodySchema]);
export type AiPackBody = z.infer<typeof AiPackBodySchema>;
```

Tests (RED first): concept body without `mode` parses as concept; real body with 1 screenshot fails; bad data-url prefix fails; oversized image fails; duplicate refIds ARE allowed by schema but route must reject — add `hasDuplicateRefs(screenshots): boolean` helper here + test.

Route changes: replace the old inline `BodySchema` with `AiPackBodySchema`; after gating, branch:
- concept → existing call, unchanged.
- real → reject duplicate refIds (400); build content array: for each screenshot `{type:"image", source:{type:"base64", media_type: <from data-url prefix>, data: <base64 payload after comma>}}` followed by a `{type:"text"}` block `Screenshot <i+1> (ref: <refId>)`; final text block = `aiRealUserPrompt(...)`; `system: AI_REAL_SYSTEM_PROMPT`; `output_config.format: zodOutputFormat(RealPackPlanSchema)`; on success `buildRealPackFromPlan(parsed, appName, refIds)`. Same counter/quota/error mapping as concept (shared code path — refactor the call+increment into one local function used by both branches rather than duplicating).

Gates: suites + typecheck. Commit: `feat(ai): /api/ai-pack real mode — vision captions over uploaded screenshots`.

---

### Task 3: form dropzone + client downscale

**Files:** Create `apps/web/lib/ai/clientImages.ts` (`"use client"`): `downscaleForAi(file: File): Promise<string>` — draw to canvas capped at 1300px on the long edge, `toDataURL("image/jpeg", 0.8)`; reject non-images. Modify `apps/web/components/ai/AiPackForm.tsx`: dropzone (reuse the visual pattern of the pack studio strip: dashed border card, multi-file input, thumbnails with remove buttons, 2–10 counter); on submit with images: `ingestFile` each original → GuestAsset, `downscaleForAi` each → POST `{mode:"real", appName, description?, accent?, screenshots:[{refId: asset.id, image}]}` via `firebaseFetch`; description becomes optional in the UI when images are present (helper text updates); success flow identical (savePack → new tab). Loading copy for real mode: "Reading your screenshots…" first.

Verification: typecheck; dev server (non-default port): dropzone renders, rejects an 11th image and non-images client-side, thumbnails removable; submit without key → 501 inline error unchanged; concept mode (no images) still works. Commit: `feat(ai): real-screenshots dropzone + client-side downscaling`.

---

### Task 4: verification + merge readiness

- Full scoped suites + typecheck + `npm run build` (routes present).
- E2E via `verify` skill: drive `/ai`, attach 2 fixture images, observe real-mode POST body shape (mock/501 boundary fine without a key). Live leg only if `ANTHROPIC_API_KEY` present.
- Fix real bugs found (`fix(ai): …`), report.
