# Copy Assist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Checkbox steps.

**Goal:** The AI generation also returns launch copy (App Store subtitle/description/keywords, PH tagline, launch tweet), shown copyable on the success card + persisted on the pack + seeding the Launch Kit tagline.

**Spec:** `docs/superpowers/specs/2026-07-18-copy-assist-design.md`

## Global Constraints

- Branch `feat/copy-assist` (off main). `packages/*` untouched. Concurrent session shares checkout: file-scoped `git add`, non-default ports, no broad pkill. Trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- **Back-compat binding:** `pack.marketing` is `.optional()`; every pre-Phase-4 pack (no marketing) must still parse and behave identically. `createPack()` does NOT set marketing. Existing pack/ai tests pass UNMODIFIED.
- **Build-never-fails:** builders CLAMP over-long AI copy (`.slice()`), never reject — a hostile/verbose model response must still yield a valid pack (same principle as caption clamping; the schema caps are belt-and-suspenders since structured-outputs strips length keywords).
- Marketing field caps (exact): subtitle 30, description 600, keyword 25 each / ≤12 items, productHuntTagline 60, launchTweet 280. Launch tagline seed clamped to 120 (the launch schema's cap).
- Gates per task: `cd apps/web && npx vitest run lib/ai lib/screens lib/pack` (all green incl. existing) + scoped typecheck `npx tsc -p . --noEmit 2>&1 | grep -vE "lib/promo|remotion/promo"` (raw exit reported).

---

### Task 1: schema — optional pack.marketing

**Files:** Modify `apps/web/lib/pack/schema.ts`; Test `apps/web/lib/pack/__tests__/marketingSchema.test.ts`

**Produces:** `MarketingSchema` (the object above) exported; `PackDocumentSchema` gains `marketing: MarketingSchema.optional()`; `type PackMarketing = z.infer<typeof MarketingSchema>` exported. `createPack()` unchanged (no marketing).

- [ ] **Step 1 (RED):** `marketingSchema.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { createPack, MarketingSchema, PackDocumentSchema } from "../schema";

const validMarketing = {
  appStoreSubtitle: "Plan your day, effortlessly",
  appStoreDescription: "Focus on what matters.\n\nFocusly turns your to-dos into a calm daily plan.",
  keywords: ["planner", "focus", "productivity", "todo"],
  productHuntTagline: "The calmest way to plan your day",
  launchTweet: "I built Focusly to stop drowning in to-dos. It turns your list into a calm daily plan. 🧘",
};

describe("MarketingSchema", () => {
  it("accepts valid marketing", () => {
    expect(MarketingSchema.safeParse(validMarketing).success).toBe(true);
  });
  it("rejects a >30-char subtitle and >280-char tweet and >12 keywords", () => {
    expect(MarketingSchema.safeParse({ ...validMarketing, appStoreSubtitle: "x".repeat(31) }).success).toBe(false);
    expect(MarketingSchema.safeParse({ ...validMarketing, launchTweet: "x".repeat(281) }).success).toBe(false);
    expect(MarketingSchema.safeParse({ ...validMarketing, keywords: Array(13).fill("k") }).success).toBe(false);
  });
});

describe("pack.marketing back-compat", () => {
  it("createPack has no marketing and still validates", () => {
    const p = createPack();
    expect(p.marketing).toBeUndefined();
    expect(PackDocumentSchema.safeParse(p).success).toBe(true);
  });
  it("a pack WITH valid marketing validates", () => {
    const p = createPack();
    (p as { marketing?: unknown }).marketing = validMarketing;
    expect(PackDocumentSchema.safeParse(p).success).toBe(true);
  });
});
```
Run `npx vitest run lib/pack` → FAIL.
- [ ] **Step 2 (GREEN):** implement. `MarketingSchema` uses the same zod import the file already uses.
- [ ] **Step 3:** full scoped suite + typecheck. Commit: `feat(pack): optional pack.marketing field (launch copy)`.

---

### Task 2: AI plan — marketing in schemas, prompts, builders

**Files:** Modify `apps/web/lib/ai/plan.ts`; Test `apps/web/lib/ai/__tests__/marketing.test.ts`

**Produces:** both `AiPackPlanSchema` and `RealPackPlanSchema` gain a `marketing` object field (5 fields: `appStoreSubtitle`, `appStoreDescription`, `keywords: z.array(z.string())`, `productHuntTagline`, `launchTweet` — plain strings, no length keywords); both `AI_SYSTEM_PROMPT` and `AI_REAL_SYSTEM_PROMPT` gain a Marketing-copy instruction block (per spec §2); `buildPackFromPlan` and `buildRealPackFromPlan` map `plan.marketing` → `pack.marketing` with clamps and seed `pack.launch.tagline`.

Builder mapping helper (add once, use in both builders):
```ts
function clampMarketing(m: AiPackPlan["marketing"]): PackMarketing {
  return {
    appStoreSubtitle: m.appStoreSubtitle.slice(0, 30),
    appStoreDescription: m.appStoreDescription.slice(0, 600),
    keywords: m.keywords.slice(0, 12).map((k) => k.slice(0, 25)),
    productHuntTagline: m.productHuntTagline.slice(0, 60),
    launchTweet: m.launchTweet.slice(0, 280),
  };
}
```
In each builder, after building screens/style:
```ts
const marketing = clampMarketing(plan.marketing);
pack.marketing = marketing;
if (pack.launch) pack.launch.tagline = marketing.productHuntTagline.slice(0, 120);
```
(`pack.launch` exists because `createPack()` seeds it — but guard with `if` for safety.)

Import `PackMarketing` from `../pack/schema`.

- [ ] **Step 1 (RED):** `marketing.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { AI_REAL_SYSTEM_PROMPT, AI_SYSTEM_PROMPT, AiPackPlanSchema, buildPackFromPlan, buildRealPackFromPlan, RealPackPlanSchema } from "../plan";

const marketing = {
  appStoreSubtitle: "Plan your day",
  appStoreDescription: "Hook line.\n\nMore detail.",
  keywords: ["planner", "focus"],
  productHuntTagline: "The calmest way to plan",
  launchTweet: "I built this to plan calmly.",
};

function conceptPlan(over: Partial<{ marketing: typeof marketing }> = {}) {
  return AiPackPlanSchema.parse({
    styleId: "bold-gradient", accent: "#0ea5e9", captionPosition: "top",
    screens: Array.from({ length: 8 }, (_, i) => ({
      archetype: (["onboarding","home-feed","dashboard","list","detail","profile","settings","chat"] as const)[i],
      caption: { title: `F${i}` },
      doc: { dark: false, palette: { primary: "#0ea5e9", bg: "#f4f8fb", card: "#ffffff", text: "#101418", muted: "#5c6670" }, header: { title: "H" }, items: [{ title: "a" }] },
    })),
    marketing, ...over,
  });
}

describe("marketing in plans", () => {
  it("both schemas require marketing", () => {
    expect(() => conceptPlan()).not.toThrow();
    expect(AiPackPlanSchema.safeParse({ ...conceptPlan(), marketing: undefined }).success).toBe(false);
  });
  it("buildPackFromPlan clamps over-long fields and sets pack.marketing", () => {
    const plan = conceptPlan({ marketing: { ...marketing, appStoreSubtitle: "x".repeat(50), launchTweet: "y".repeat(400), keywords: Array(20).fill("kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk") } });
    const pack = buildPackFromPlan(plan, "Focusly");
    expect(pack.marketing!.appStoreSubtitle).toHaveLength(30);
    expect(pack.marketing!.launchTweet).toHaveLength(280);
    expect(pack.marketing!.keywords).toHaveLength(12);
    expect(pack.marketing!.keywords[0]).toHaveLength(25);
  });
  it("seeds pack.launch.tagline from the PH tagline (clamped 120)", () => {
    const pack = buildPackFromPlan(conceptPlan({ marketing: { ...marketing, productHuntTagline: "The calmest way to plan" } }), "Focusly");
    expect(pack.launch!.tagline).toBe("The calmest way to plan");
  });
  it("real builder also sets marketing", () => {
    const rp = RealPackPlanSchema.parse({
      styleId: "minimal-light", accent: "#0ea5e9", captionPosition: "top",
      screens: [{ ref: "a", caption: { title: "A" } }, { ref: "b", caption: { title: "B" } }],
      marketing,
    });
    const pack = buildRealPackFromPlan(rp, "Focusly", ["a", "b"]);
    expect(pack.marketing!.productHuntTagline).toBe("The calmest way to plan");
  });
  it("prompts instruct marketing copy", () => {
    for (const p of [AI_SYSTEM_PROMPT, AI_REAL_SYSTEM_PROMPT]) {
      expect(p.toLowerCase()).toContain("subtitle");
      expect(p.toLowerCase()).toContain("tweet");
    }
  });
});
```
Run `npx vitest run lib/ai` → FAIL.
- [ ] **Step 2 (GREEN):** implement schemas, prompts, `clampMarketing`, both builders. Keep existing plan tests passing (they don't set marketing → those tests will now FAIL parse since marketing is required; **update the existing concept/real plan test fixtures** in `lib/ai/__tests__/plan.test.ts` and `realPlan.test.ts` to include a `marketing` object — this is a legitimate fixture update, note it in the report). Prefer a shared test-fixture `marketing` const.
- [ ] **Step 3:** full scoped suite + typecheck. Commit: `feat(ai): AI generates launch copy (subtitle, description, keywords, tagline, tweet)`.

---

### Task 3: success-card panel + studio section

**Files:** Create `apps/web/components/ai/LaunchCopyPanel.tsx`; Modify `apps/web/components/ai/AiPackForm.tsx`, `apps/web/components/pack/PackInspector.tsx`

- **LaunchCopyPanel.tsx** (`"use client"`): `export function LaunchCopyPanel({ marketing }: { marketing: PackMarketing })` — renders labelled rows (Subtitle, Description in a max-h scroll box, Keywords as comma chips, Product Hunt tagline, Launch tweet) each with a copy button. A small `CopyButton` sub-component: `navigator.clipboard.writeText(value)` in a try/catch, transient "Copied" state (reset ~1.5s via setTimeout with cleanup). Import `type PackMarketing` from `@/lib/pack/schema`. Dark visual language matching the form.
- **AiPackForm.tsx:** widen `SuccessState` to `{ remaining: number | null; marketing?: PackMarketing }`; on 200, after parsing the pack, set `marketing: parsed.data.marketing`. In the success card render, if `success.marketing` show `<LaunchCopyPanel marketing={success.marketing} />` under the existing success content.
- **PackInspector.tsx:** if `pack.marketing`, render a read-only `<Section title="Launch copy">` reusing the same panel (import LaunchCopyPanel) — or a compact inline copy of the rows; simplest is to reuse `LaunchCopyPanel`. (LaunchCopyPanel is `"use client"` and PackInspector is already a client component — fine.)
- Verify: scoped typecheck; dev server (non-default port): after a mocked 200 with marketing, the panel shows all fields and copy buttons flip to "Copied"; a 200 WITHOUT marketing (defensive) hides the panel without crashing; the studio inspector shows the section only when the pack has marketing. Kill only your PID.
Commit (three files): `feat(ai): copyable launch-copy panel on success + in studio`.

---

### Task 4: verification + merge readiness

- Full scoped suites + typecheck + `npm run build`.
- E2E (`verify` skill): if a signed-in live generation is reachable (throwaway Firebase user + ANTHROPIC_API_KEY as in prior phases), run one concept generation and confirm the response pack carries `marketing` with all 5 fields and the success card renders the copyable panel + the studio tab opens with the Launch Kit tagline pre-filled. Else: deterministically prove via a node/tsx script that `buildPackFromPlan(planWithMarketing)` yields `pack.marketing` + seeded `pack.launch.tagline`, and drive the UI with a mocked 200. Report which.
- Legacy pack (no marketing) → studio opens, no Launch copy section, no crash (unit + UI).
- Fix real bugs only; report.
