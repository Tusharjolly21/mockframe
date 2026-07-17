# AI Pack Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/ai` landing where a signed-in user types app name + description and gets a complete AI-generated 8–10 screen App Store pack (captions, style, palette, concept-UI screens) opened in the pack studio in a new tab — 2 free generations, then Pro.

**Architecture:** One Claude call (`client.messages.parse()` + `zodOutputFormat`, model `claude-opus-4-8`) returns a schema-validated plan; a pure `buildPackFromPlan` converts it to a `PackDocument` whose screen assets are `screen:`-encoded docs of a new `aiapp` ScreenDoc variant rendered by a deterministic SVG renderer. The studio, export, and persistence layers need zero changes.

**Tech Stack:** `@anthropic-ai/sdk` (new dep), Zod 3, Next.js 15 route handlers, existing `lib/screens` + `lib/pack` infrastructure, vitest.

**Spec:** `docs/superpowers/specs/2026-07-17-ai-pack-generator-design.md`

## Global Constraints

- Branch: `feat/ai-pack`. Monorepo boundary: `packages/*` NOT modified.
- `apps/web/lib/ai/plan.ts` and `apps/web/lib/ai/gate.ts` must NOT have `"use client"` (imported by the API route and vitest).
- `ANTHROPIC_API_KEY` is read server-side only; it must NEVER appear in client bundles, logs, or committed files. Model id: `process.env.MOCKFRAME_AI_MODEL ?? "claude-opus-4-8"` — exact default string `claude-opus-4-8`.
- Gating semantics: guests AND anonymous Firebase sessions (`owner.signInProvider === "anonymous"`) → 401 `{reason:"signin"}`; non-Pro with ≥2 prior generations → 402 `{reason:"pro"}`; Pro subject to a 20/day quota → 429 when exhausted. The generation counter lives at `mockframeOwners/{ownerId}/private/ai-generations` (NEVER under client-writable `kv/`) and increments transactionally ONLY after a valid plan is produced.
- Paywall reason string: `"AI-generated screenshot packs"`.
- Concept screens render at logical 402×874 (the `SW`/`SH` constants in `lib/screens/common.ts`).
- Another session shares this checkout: only `git add` specific named files; never `git add -A`; no broad `pkill`; servers on non-default ports, kill only recorded PIDs. `apps/web/package.json`/`package-lock.json` may carry that session's uncommitted edits — when Task 3 installs the SDK, commit ONLY the dependency lines relevant to `@anthropic-ai/sdk` if possible; if the files are dirty with foreign edits, `git stash push -- apps/web/package.json package-lock.json` is FORBIDDEN (it would stash their work) — instead note the situation in the report and commit the whole files only if `git diff` shows exclusively your dependency addition.
- Every commit message ends with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- `npm run test -w web` and `npm run typecheck` gate every code task. If pre-existing failures exist in `apps/web/lib/promo/**` (another session's in-flight work), scope verification: `npx vitest run lib/ai lib/pack lib/screens` from `apps/web` and `npx tsc -p apps/web --noEmit 2>&1 | grep -v promo` — report exactly what you ran.

---

### Task 1: `aiapp` concept-UI screen renderer

**Files:**
- Modify: `apps/web/lib/screens/types.ts` (add `AiAppDoc` + union member + `SCREEN_APP_LABELS` entry)
- Create: `apps/web/lib/screens/aiapp.ts`
- Modify: `apps/web/lib/screens/index.ts` (import + dispatch case)
- Test: `apps/web/lib/pack/__tests__/aiapp.test.ts` (lives under lib/pack/__tests__ to match the vitest include glob `lib/**/__tests__/*.test.ts` — it already matches lib/screens too; use `apps/web/lib/screens/__tests__/aiapp.test.ts`)

**Interfaces:**
- Produces: `interface AiAppDoc { app: "aiapp"; archetype: "onboarding"|"home-feed"|"dashboard"|"list"|"detail"|"profile"|"settings"|"chat"; appName: string; dark?: boolean; palette: { primary: string; bg: string; card: string; text: string; muted: string }; header: { title: string; subtitle?: string }; items: { title: string; subtitle?: string; value?: string; emoji?: string }[]; stats?: { label: string; value: string }[]; cta?: string; tabs?: string[] }` — exported from `types.ts`, part of `ScreenDoc`.
- Produces: `renderAiApp(doc: AiAppDoc): string` (inner SVG at 402×874) from `aiapp.ts`.
- `renderScreenSized` handles `case "aiapp"` via the standard `flat(renderAiApp(doc))`.

- [ ] **Step 1: Write the failing test**

`apps/web/lib/screens/__tests__/aiapp.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { renderAiApp } from "../aiapp";
import type { AiAppDoc } from "../types";

const ARCHETYPES: AiAppDoc["archetype"][] = [
  "onboarding", "home-feed", "dashboard", "list", "detail", "profile", "settings", "chat",
];

function doc(archetype: AiAppDoc["archetype"], overrides: Partial<AiAppDoc> = {}): AiAppDoc {
  return {
    app: "aiapp",
    archetype,
    appName: "Focusly",
    palette: { primary: "#6d28d9", bg: "#f6f5fb", card: "#ffffff", text: "#17171c", muted: "#6f6f7a" },
    header: { title: "Plan your day", subtitle: "Smart daily planning" },
    items: [
      { title: "Morning routine", subtitle: "6 tasks", value: "80%", emoji: "🌅" },
      { title: "Deep work", subtitle: "2h focus block", value: "45m" },
      { title: "Review", subtitle: "Weekly retro" },
    ],
    stats: [{ label: "Streak", value: "12d" }, { label: "Done", value: "94%" }],
    cta: "Get started",
    tabs: ["Home", "Plan", "Stats", "Me"],
    ...overrides,
  };
}

describe("renderAiApp", () => {
  it("renders every archetype without NaN/undefined and with the app content", () => {
    for (const a of ARCHETYPES) {
      const svg = renderAiApp(doc(a));
      expect(svg, a).not.toContain("NaN");
      expect(svg, a).not.toContain("undefined");
      expect(svg.length, a).toBeGreaterThan(500);
    }
  });

  it("escapes XML-hostile content", () => {
    const svg = renderAiApp(doc("list", { header: { title: 'A<b>&"quote"' }, items: [{ title: "<script>" }] }));
    expect(svg).not.toContain("<script>");
    expect(svg).not.toContain('A<b>');
  });

  it("tolerates empty optional fields", () => {
    const svg = renderAiApp(doc("dashboard", { items: [], stats: undefined, tabs: undefined, cta: undefined, header: { title: "T" } }));
    expect(svg).not.toContain("NaN");
    expect(svg).not.toContain("undefined");
  });

  it("dark mode uses the dark background", () => {
    const svg = renderAiApp(doc("home-feed", { dark: true, palette: { primary: "#8b5cf6", bg: "#0e0e12", card: "#1a1a21", text: "#f4f4f8", muted: "#9a9aa6" } }));
    expect(svg).toContain("#0e0e12");
  });
});
```

- [ ] **Step 2: Run to verify failure** — `cd apps/web && npx vitest run lib/screens` → FAIL (cannot resolve `../aiapp`).

- [ ] **Step 3: Implement**

a. `apps/web/lib/screens/types.ts` — add before the `ScreenDoc` union:

```ts
export interface AiAppItem {
  title: string;
  subtitle?: string;
  value?: string;
  emoji?: string;
}

/** AI-generated generic app screen: fully parameterized concept UI. The AI
 *  supplies content + palette; the renderer owns layout, so output quality is
 *  deterministic regardless of what the model writes. */
export interface AiAppDoc {
  app: "aiapp";
  archetype: "onboarding" | "home-feed" | "dashboard" | "list" | "detail" | "profile" | "settings" | "chat";
  appName: string;
  dark?: boolean;
  palette: { primary: string; bg: string; card: string; text: string; muted: string };
  header: { title: string; subtitle?: string };
  items: AiAppItem[];
  stats?: { label: string; value: string }[];
  cta?: string;
  tabs?: string[];
}
```

Add `| AiAppDoc` to the `ScreenDoc` union and `aiapp: "AI App"` to `SCREEN_APP_LABELS`.

b. `apps/web/lib/screens/aiapp.ts` — complete implementation:

```ts
"use client";

import { esc, IOS_FONT, SH, SW } from "./common";
import type { AiAppDoc, AiAppItem } from "./types";

/**
 * Generic concept-UI renderer for AI-generated packs. One deterministic
 * layout per archetype; every string passes through esc(); every numeric
 * position is computed from SW/SH so nothing depends on content length.
 */

const F = IOS_FONT;
const PAD = 24;
const CW = SW - PAD * 2; // content width

const clampItems = (items: AiAppItem[], n: number) => items.slice(0, n);

function statusBar(text: string): string {
  return `<text x="${PAD}" y="34" font-family="${F}" font-size="15" font-weight="700" fill="${text}">9:41</text>
    <g fill="${text}"><rect x="${SW - 64}" y="24" width="17" height="10" rx="2.5" opacity="0.9"/><rect x="${SW - 45}" y="26" width="3" height="6" rx="1" opacity="0.5"/><rect x="${SW - 88}" y="24" width="16" height="10" rx="2" opacity="0.35"/></g>`;
}

function tabBar(doc: AiAppDoc): string {
  const tabs = (doc.tabs ?? []).slice(0, 5);
  if (!tabs.length) return "";
  const { primary, card, muted, text } = doc.palette;
  const w = SW / tabs.length;
  const y = SH - 62;
  return `<rect x="0" y="${y - 14}" width="${SW}" height="${SH - y + 14}" fill="${card}"/>
    <rect x="0" y="${y - 14}" width="${SW}" height="1" fill="${text}" opacity="0.06"/>` +
    tabs.map((t, i) => {
      const cx = w * i + w / 2;
      const active = i === 0;
      return `<circle cx="${cx}" cy="${y + 6}" r="10" fill="${active ? primary : muted}" opacity="${active ? 1 : 0.35}"/>
        <text x="${cx}" y="${y + 34}" text-anchor="middle" font-family="${F}" font-size="10.5" font-weight="${active ? 700 : 500}" fill="${active ? primary : muted}">${esc(t)}</text>`;
    }).join("");
}

function headerBlock(doc: AiAppDoc, y: number): string {
  const { text, muted } = doc.palette;
  let out = `<text x="${PAD}" y="${y}" font-family="${F}" font-size="26" font-weight="800" fill="${text}" letter-spacing="-0.4">${esc(doc.header.title)}</text>`;
  if (doc.header.subtitle) {
    out += `<text x="${PAD}" y="${y + 24}" font-family="${F}" font-size="14" font-weight="500" fill="${muted}">${esc(doc.header.subtitle)}</text>`;
  }
  return out;
}

function statCards(doc: AiAppDoc, y: number): string {
  const stats = (doc.stats ?? []).slice(0, 4);
  if (!stats.length) return "";
  const { primary, card, text, muted } = doc.palette;
  const gap = 12;
  const w = (CW - gap * (stats.length - 1)) / stats.length;
  return stats.map((s, i) => {
    const x = PAD + i * (w + gap);
    return `<rect x="${x}" y="${y}" width="${w}" height="76" rx="16" fill="${card}"/>
      <text x="${x + 14}" y="${y + 32}" font-family="${F}" font-size="20" font-weight="800" fill="${i === 0 ? primary : text}">${esc(s.value)}</text>
      <text x="${x + 14}" y="${y + 54}" font-family="${F}" font-size="11" font-weight="600" fill="${muted}">${esc(s.label)}</text>`;
  }).join("");
}

function listRows(doc: AiAppDoc, y0: number, max: number, rowH = 76): string {
  const { primary, card, text, muted } = doc.palette;
  return clampItems(doc.items, max).map((it, i) => {
    const y = y0 + i * (rowH + 12);
    const icon = it.emoji
      ? `<text x="${PAD + 30}" y="${y + rowH / 2 + 8}" text-anchor="middle" font-size="22">${esc(it.emoji)}</text>`
      : `<circle cx="${PAD + 30}" cy="${y + rowH / 2}" r="17" fill="${primary}" opacity="0.16"/><circle cx="${PAD + 30}" cy="${y + rowH / 2}" r="7" fill="${primary}"/>`;
    return `<rect x="${PAD}" y="${y}" width="${CW}" height="${rowH}" rx="16" fill="${card}"/>${icon}
      <text x="${PAD + 58}" y="${y + (it.subtitle ? 33 : rowH / 2 + 5)}" font-family="${F}" font-size="15" font-weight="700" fill="${text}">${esc(it.title)}</text>
      ${it.subtitle ? `<text x="${PAD + 58}" y="${y + 53}" font-family="${F}" font-size="12" font-weight="500" fill="${muted}">${esc(it.subtitle)}</text>` : ""}
      ${it.value ? `<text x="${PAD + CW - 16}" y="${y + rowH / 2 + 5}" text-anchor="end" font-family="${F}" font-size="14" font-weight="700" fill="${primary}">${esc(it.value)}</text>` : ""}`;
  }).join("");
}

function ctaButton(doc: AiAppDoc, y: number): string {
  if (!doc.cta) return "";
  const { primary } = doc.palette;
  return `<rect x="${PAD}" y="${y}" width="${CW}" height="56" rx="28" fill="${primary}"/>
    <text x="${SW / 2}" y="${y + 35}" text-anchor="middle" font-family="${F}" font-size="16" font-weight="700" fill="#ffffff">${esc(doc.cta)}</text>`;
}

export function renderAiApp(doc: AiAppDoc): string {
  const { primary, bg, card, text, muted } = doc.palette;
  const parts: string[] = [`<rect width="${SW}" height="${SH}" fill="${bg}"/>`, statusBar(text)];

  switch (doc.archetype) {
    case "onboarding": {
      parts.push(`<circle cx="${SW / 2}" cy="240" r="72" fill="${primary}" opacity="0.14"/>
        <circle cx="${SW / 2}" cy="240" r="44" fill="${primary}"/>
        <text x="${SW / 2}" y="256" text-anchor="middle" font-family="${F}" font-size="40" font-weight="800" fill="#ffffff">${esc(doc.appName.slice(0, 1).toUpperCase())}</text>
        <text x="${SW / 2}" y="382" text-anchor="middle" font-family="${F}" font-size="30" font-weight="800" fill="${text}" letter-spacing="-0.5">${esc(doc.header.title)}</text>`);
      if (doc.header.subtitle) parts.push(`<text x="${SW / 2}" y="414" text-anchor="middle" font-family="${F}" font-size="15" font-weight="500" fill="${muted}">${esc(doc.header.subtitle)}</text>`);
      parts.push(listRows({ ...doc, items: clampItems(doc.items, 3) }, 470, 3, 64), ctaButton(doc, SH - 150));
      break;
    }
    case "home-feed":
      parts.push(headerBlock(doc, 96), statCards(doc, 132), listRows(doc, (doc.stats?.length ? 232 : 140), 6));
      break;
    case "dashboard": {
      parts.push(headerBlock(doc, 96), statCards(doc, 132));
      const chartY = doc.stats?.length ? 232 : 140;
      const bars = [0.35, 0.6, 0.45, 0.8, 0.55, 0.95, 0.7];
      parts.push(`<rect x="${PAD}" y="${chartY}" width="${CW}" height="170" rx="16" fill="${card}"/>` +
        bars.map((h, i) => {
          const bw = 26; const gap = (CW - 40 - bars.length * bw) / (bars.length - 1);
          const x = PAD + 20 + i * (bw + gap); const bh = 120 * h;
          return `<rect x="${x}" y="${chartY + 150 - bh}" width="${bw}" height="${bh}" rx="8" fill="${primary}" opacity="${0.35 + 0.65 * h}"/>`;
        }).join(""));
      parts.push(listRows(doc, chartY + 190, 3));
      break;
    }
    case "list":
      parts.push(headerBlock(doc, 96),
        `<rect x="${PAD}" y="126" width="${CW}" height="44" rx="22" fill="${card}"/><circle cx="${PAD + 22}" cy="148" r="7" fill="none" stroke="${muted}" stroke-width="2.5"/><line x1="${PAD + 27}" y1="153" x2="${PAD + 32}" y2="158" stroke="${muted}" stroke-width="2.5" stroke-linecap="round"/><text x="${PAD + 44}" y="153" font-family="${F}" font-size="13.5" fill="${muted}">Search</text>`,
        listRows(doc, 190, 7));
      break;
    case "detail": {
      parts.push(`<rect x="${PAD}" y="80" width="${CW}" height="220" rx="20" fill="${primary}"/>
        <text x="${PAD + 22}" y="252" font-family="${F}" font-size="26" font-weight="800" fill="#ffffff" letter-spacing="-0.4">${esc(doc.header.title)}</text>`);
      if (doc.header.subtitle) parts.push(`<text x="${PAD + 22}" y="278" font-family="${F}" font-size="13.5" font-weight="500" fill="#ffffff" opacity="0.85">${esc(doc.header.subtitle)}</text>`);
      parts.push(statCards(doc, 322), listRows(doc, doc.stats?.length ? 422 : 322, 4), ctaButton(doc, SH - 150));
      break;
    }
    case "profile": {
      parts.push(`<circle cx="${SW / 2}" cy="150" r="46" fill="${primary}"/>
        <text x="${SW / 2}" y="164" text-anchor="middle" font-family="${F}" font-size="36" font-weight="800" fill="#ffffff">${esc((doc.header.title || doc.appName).slice(0, 1).toUpperCase())}</text>
        <text x="${SW / 2}" y="232" text-anchor="middle" font-family="${F}" font-size="22" font-weight="800" fill="${text}">${esc(doc.header.title)}</text>`);
      if (doc.header.subtitle) parts.push(`<text x="${SW / 2}" y="258" text-anchor="middle" font-family="${F}" font-size="13.5" fill="${muted}">${esc(doc.header.subtitle)}</text>`);
      parts.push(statCards(doc, 292), listRows(doc, doc.stats?.length ? 392 : 292, 4, 64));
      break;
    }
    case "settings":
      parts.push(headerBlock(doc, 96), listRows(doc, 140, 7, 64), ctaButton(doc, SH - 150));
      break;
    case "chat": {
      parts.push(`<text x="${SW / 2}" y="100" text-anchor="middle" font-family="${F}" font-size="17" font-weight="800" fill="${text}">${esc(doc.header.title)}</text>`);
      let y = 150;
      for (const [i, it] of clampItems(doc.items, 6).entries()) {
        const mine = i % 2 === 1;
        const w = Math.min(CW * 0.72, 60 + it.title.length * 7.6);
        const x = mine ? SW - PAD - w : PAD;
        parts.push(`<rect x="${x}" y="${y}" width="${w}" height="46" rx="20" fill="${mine ? primary : card}"/>
          <text x="${x + 18}" y="${y + 29}" font-family="${F}" font-size="14" font-weight="500" fill="${mine ? "#ffffff" : text}">${esc(it.title)}</text>`);
        y += 60;
      }
      parts.push(`<rect x="${PAD}" y="${SH - 140}" width="${CW}" height="48" rx="24" fill="${card}"/>
        <text x="${PAD + 20}" y="${SH - 110}" font-family="${F}" font-size="13.5" fill="${muted}">Message…</text>
        <circle cx="${PAD + CW - 24}" cy="${SH - 116}" r="17" fill="${primary}"/>`);
      break;
    }
  }

  parts.push(tabBar(doc));
  return parts.join("");
}
```

c. `apps/web/lib/screens/index.ts` — add `import { renderAiApp } from "./aiapp";` and, in `renderScreenSized`'s switch, `case "aiapp": return flat(renderAiApp(doc));`. Verify `referencedAssetIds` needs no change (aiapp references no uploaded assets) and check where `SCREEN_APP_LABELS` feeds user-facing screen pickers — `aiapp` must NOT appear in the editor's screen-template pickers (grep for the picker's source list; if pickers enumerate an explicit array rather than `SCREEN_APP_LABELS`, nothing to do — report which it is). Also check `apps/web/lib/billing/screenGate.ts`: if it requires a total mapping per `ScreenApp`, add `aiapp` as free; if it's an allowlist of Pro screens, nothing to do.

- [ ] **Step 4: Run tests** — `cd apps/web && npx vitest run lib/screens` → PASS. Then `npm run typecheck` (scoped grep per Global Constraints if promo noise exists).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/screens/types.ts apps/web/lib/screens/aiapp.ts apps/web/lib/screens/index.ts apps/web/lib/screens/__tests__/aiapp.test.ts
git commit -m "feat(ai): aiapp concept-UI screen renderer (8 archetypes)"
```

---

### Task 2: AI plan schema, prompt, and pack builder

**Files:**
- Create: `apps/web/lib/ai/plan.ts`
- Test: `apps/web/lib/ai/__tests__/plan.test.ts`

**Interfaces:**
- Consumes: `createPack`, `createPackScreen`, `PACK_STYLE_IDS`, `PackDocumentSchema`, `type PackDocument` from `@/lib/pack/schema`; `decodeScreenAsset` from `@/lib/screens` (test only).
- Produces:
  - `AiPackPlanSchema` (Zod) and `type AiPackPlan`
  - `AI_SYSTEM_PROMPT: string`, `aiUserPrompt(appName: string, description: string, accent?: string): string`
  - `encodeAiScreenAsset(doc: object): string` — `"screen:" + encodeURIComponent(JSON.stringify(doc))` (mirrors `encodeScreenAsset`, duplicated because `lib/screens/index.ts` is a `"use client"` module and this file is imported by a server route; a round-trip test pins format compatibility)
  - `buildPackFromPlan(plan: AiPackPlan, appName: string): PackDocument`
  - `AI_FREE_GENERATIONS = 2`, `AI_DAILY_LIMIT = 20`

- [ ] **Step 1: Write the failing test**

`apps/web/lib/ai/__tests__/plan.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { PackDocumentSchema } from "../../pack/schema";
import { decodeScreenAsset } from "../../screens";
import { AiPackPlanSchema, buildPackFromPlan, encodeAiScreenAsset, type AiPackPlan } from "../plan";

function samplePlan(screens = 8): AiPackPlan {
  return AiPackPlanSchema.parse({
    styleId: "bold-gradient",
    accent: "#0ea5e9",
    captionPosition: "top",
    screens: Array.from({ length: screens }, (_, i) => ({
      archetype: (["onboarding", "home-feed", "dashboard", "list", "detail", "profile", "settings", "chat"] as const)[i % 8],
      caption: { title: `Feature ${i + 1}`, subtitle: i % 2 ? undefined : "Why it matters" },
      doc: {
        dark: false,
        palette: { primary: "#0ea5e9", bg: "#f4f8fb", card: "#ffffff", text: "#101418", muted: "#5c6670" },
        header: { title: `Screen ${i + 1}`, subtitle: "Sub" },
        items: [{ title: "Item A", value: "12" }, { title: "Item B" }],
        stats: [{ label: "Users", value: "10k" }],
        cta: "Try it",
        tabs: ["Home", "Stats"],
      },
    })),
  });
}

describe("AiPackPlanSchema", () => {
  it("accepts 8–10 screens and rejects 7 or 11", () => {
    expect(() => samplePlan(8)).not.toThrow();
    expect(() => samplePlan(10)).not.toThrow();
    expect(() => samplePlan(7)).toThrow();
    expect(() => samplePlan(11)).toThrow();
  });

  it("rejects unknown style ids", () => {
    const raw = JSON.parse(JSON.stringify(samplePlan()));
    raw.styleId = "vaporwave";
    expect(AiPackPlanSchema.safeParse(raw).success).toBe(false);
  });
});

describe("buildPackFromPlan", () => {
  it("produces a valid PackDocument with encoded aiapp screens", () => {
    const pack = buildPackFromPlan(samplePlan(9), "Focusly");
    expect(PackDocumentSchema.safeParse(pack).success).toBe(true);
    expect(pack.appName).toBe("Focusly");
    expect(pack.styleId).toBe("bold-gradient");
    expect(pack.style.accent).toBe("#0ea5e9");
    expect(pack.screens).toHaveLength(9);
    for (const s of pack.screens) {
      expect(s.assetId).toMatch(/^screen:/);
      expect(s.captions.en.title.length).toBeGreaterThan(0);
    }
  });

  it("encoded docs decode through the real screens decoder", () => {
    const pack = buildPackFromPlan(samplePlan(8), "Focusly");
    const doc = decodeScreenAsset(pack.screens[0].assetId!);
    expect(doc).toBeDefined();
    expect(doc && (doc as { app: string }).app).toBe("aiapp");
    expect(doc && (doc as { appName: string }).appName).toBe("Focusly");
  });

  it("encodeAiScreenAsset matches the screens module format", () => {
    const enc = encodeAiScreenAsset({ app: "aiapp", appName: "X" });
    expect(decodeScreenAsset(enc)).toEqual({ app: "aiapp", appName: "X" });
  });
});
```

- [ ] **Step 2: Run to verify failure** — `cd apps/web && npx vitest run lib/ai` → FAIL (cannot resolve `../plan`).

- [ ] **Step 3: Implement `apps/web/lib/ai/plan.ts`** (NO `"use client"`):

```ts
import { z } from "zod";
import { createPack, createPackScreen, PACK_STYLE_IDS, type PackDocument } from "../pack/schema";

/**
 * Everything the AI generation flow needs that is PURE: the plan schema Claude
 * must satisfy (enforced via structured outputs), the prompts, and the
 * plan → PackDocument builder. No SDK, no DOM, no Firebase — unit-testable.
 */

export const AI_FREE_GENERATIONS = 2;
export const AI_DAILY_LIMIT = 20;

const ARCHETYPES = ["onboarding", "home-feed", "dashboard", "list", "detail", "profile", "settings", "chat"] as const;

/* Structured-outputs caveat: no regex/min/max string constraints in the wire
   schema (the SDK strips unsupported keywords and validates client-side —
   which is exactly what parse() gives us). Enums are supported and load-bearing. */
const AiScreenDocSchema = z.object({
  dark: z.boolean(),
  palette: z.object({
    primary: z.string(),
    bg: z.string(),
    card: z.string(),
    text: z.string(),
    muted: z.string(),
  }),
  header: z.object({ title: z.string(), subtitle: z.string().optional() }),
  items: z.array(z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    value: z.string().optional(),
    emoji: z.string().optional(),
  })).max(8),
  stats: z.array(z.object({ label: z.string(), value: z.string() })).max(4).optional(),
  cta: z.string().optional(),
  tabs: z.array(z.string()).max(5).optional(),
});

export const AiPackPlanSchema = z.object({
  styleId: z.enum(PACK_STYLE_IDS),
  accent: z.string(),
  captionPosition: z.enum(["top", "bottom"]),
  screens: z.array(z.object({
    archetype: z.enum(ARCHETYPES),
    caption: z.object({ title: z.string(), subtitle: z.string().optional() }),
    doc: AiScreenDocSchema,
  })).min(8).max(10),
});

export type AiPackPlan = z.infer<typeof AiPackPlanSchema>;

export const AI_SYSTEM_PROMPT = `You are an expert App Store marketing designer for MockFrame. Given an app's name and description, design a complete App Store screenshot pack: 8-10 screens that tell a conversion story.

Narrative structure: screen 1 hooks with the core promise (onboarding or home-feed archetype), screens 2-6 show the strongest features (mix archetypes: dashboard, list, detail, chat), later screens build trust (profile/settings/stats), final screen closes with a call to action.

Caption rules: titles are benefit-led, at most 6 words, no ending period. Subtitles optional, at most 10 words, only when they add information.

Concept UI rules: content must be SPECIFIC to this app (real-sounding feature names, plausible numbers), never lorem ipsum or generic labels like "Item 1". items power lists/feeds/chat bubbles: 3-6 per screen (chat: alternating user/app messages). stats are short ("12k", "94%"). tabs: 3-5 one-word labels, consistent across screens. Emojis sparingly, only where the app's domain makes them natural.

Palette: pick ONE accent (the accent field) that fits the app's domain and use it as palette.primary on every screen. Light UI (bg near-white, card white) or dark UI (bg near-black, card #1a1a21-ish) - choose what fits the app, keep it consistent, text must contrast bg. Pick styleId to match the mood (dark-pro for dark UIs, bold-gradient/accent-split for vivid consumer apps, minimal-light for utilities).

All colors are 6-digit lowercase hex like #0ea5e9.`;

export function aiUserPrompt(appName: string, description: string, accent?: string): string {
  return `App name: ${appName}\nDescription: ${description}${accent ? `\nBrand accent color (must use): ${accent}` : ""}`;
}

/** Mirrors lib/screens encodeScreenAsset — duplicated because that module is
 *  "use client" and this file runs in a server route. Format pinned by test. */
export function encodeAiScreenAsset(doc: object): string {
  return "screen:" + encodeURIComponent(JSON.stringify(doc));
}

export function buildPackFromPlan(plan: AiPackPlan, appName: string): PackDocument {
  const pack = createPack();
  pack.appName = appName.slice(0, 60);
  pack.styleId = plan.styleId;
  pack.style = { ...pack.style, accent: plan.accent, captionPosition: plan.captionPosition };
  pack.screens = plan.screens.map((s) => {
    const screen = createPackScreen(
      encodeAiScreenAsset({ app: "aiapp", archetype: s.archetype, appName: pack.appName, ...s.doc })
    );
    screen.captions = {
      en: { title: s.caption.title, ...(s.caption.subtitle ? { subtitle: s.caption.subtitle } : {}) },
    };
    return screen;
  });
  return pack;
}
```

- [ ] **Step 4: Run tests** — `npx vitest run lib/ai lib/screens lib/pack` → PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/ai/plan.ts apps/web/lib/ai/__tests__/plan.test.ts
git commit -m "feat(ai): pack plan schema, prompts, plan→PackDocument builder"
```

---

### Task 3: Gate + `/api/ai-pack` route (Anthropic SDK)

**Files:**
- Modify: `apps/web/package.json` + `package-lock.json` (add `@anthropic-ai/sdk`; see Global Constraints re: dirty files)
- Create: `apps/web/lib/ai/gate.ts`
- Create: `apps/web/app/api/ai-pack/route.ts`
- Test: `apps/web/lib/ai/__tests__/gate.test.ts`

**Interfaces:**
- Consumes: `getRequestOwner`/`attachOwnerCookie`, `readBilling`/`isBillingActive`, `firestoreDb`/`FirebaseConfigError` (existing server libs); `checkQuota`-style helper from `apps/web/lib/server/quota.ts` — READ that file first and use its actual exported API for a per-day counter with key `"ai-pack"` and limit `AI_DAILY_LIMIT`; `AiPackPlanSchema`, `AI_SYSTEM_PROMPT`, `aiUserPrompt`, `buildPackFromPlan`, `AI_FREE_GENERATIONS`, `AI_DAILY_LIMIT` from `@/lib/ai/plan`.
- Produces:
  - `aiGenerationDecision(opts: { signedIn: boolean; isPro: boolean; priorGenerations: number }): { allowed: true } | { allowed: false; reason: "signin" | "pro" }` in `gate.ts` (signedIn means non-anonymous authenticated, per the pack-export convention)
  - `POST /api/ai-pack` body `{ appName: string, description: string, accent?: string }` → 200 `{ pack, remaining }` | 400 invalid body | 401 signin | 402 pro | 429 quota/busy | 501 unconfigured | 502 generation failed.

- [ ] **Step 1: Install the SDK** — `npm install -w web @anthropic-ai/sdk`

- [ ] **Step 2: Write the failing gate test**

`apps/web/lib/ai/__tests__/gate.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { aiGenerationDecision } from "../gate";

describe("aiGenerationDecision", () => {
  it("guests must sign in", () => {
    expect(aiGenerationDecision({ signedIn: false, isPro: false, priorGenerations: 0 })).toEqual({ allowed: false, reason: "signin" });
  });
  it("pro is allowed regardless of count (quota handled separately)", () => {
    expect(aiGenerationDecision({ signedIn: true, isPro: true, priorGenerations: 99 })).toEqual({ allowed: true });
  });
  it("free users get exactly 2", () => {
    expect(aiGenerationDecision({ signedIn: true, isPro: false, priorGenerations: 0 })).toEqual({ allowed: true });
    expect(aiGenerationDecision({ signedIn: true, isPro: false, priorGenerations: 1 })).toEqual({ allowed: true });
    expect(aiGenerationDecision({ signedIn: true, isPro: false, priorGenerations: 2 })).toEqual({ allowed: false, reason: "pro" });
  });
});
```

Run `npx vitest run lib/ai` → FAIL. Then implement `apps/web/lib/ai/gate.ts` (NO `"use client"`):

```ts
import { AI_FREE_GENERATIONS } from "./plan";

/** Pure entitlement matrix for AI generations: 2 free for real sign-ins, then
 *  Pro (Pro's daily quota is enforced separately in the route). */
export type AiGateVerdict = { allowed: true } | { allowed: false; reason: "signin" | "pro" };

export function aiGenerationDecision(opts: {
  signedIn: boolean;
  isPro: boolean;
  priorGenerations: number;
}): AiGateVerdict {
  if (!opts.signedIn) return { allowed: false, reason: "signin" };
  if (opts.isPro) return { allowed: true };
  if (opts.priorGenerations < AI_FREE_GENERATIONS) return { allowed: true };
  return { allowed: false, reason: "pro" };
}
```

Run → PASS.

- [ ] **Step 3: Implement the route** — `apps/web/app/api/ai-pack/route.ts`. First READ `apps/web/lib/server/quota.ts` for its real API and `apps/web/app/api/pack-export/route.ts` as the sibling pattern. Target implementation:

```ts
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { FirebaseConfigError, firestoreDb } from "@/lib/server/firebaseAdmin";
import { attachOwnerCookie, getRequestOwner } from "@/lib/server/requestOwner";
import { isBillingActive, readBilling } from "@/lib/server/razorpay";
import { aiGenerationDecision } from "@/lib/ai/gate";
import { AI_DAILY_LIMIT, AI_SYSTEM_PROMPT, AiPackPlanSchema, aiUserPrompt, buildPackFromPlan } from "@/lib/ai/plan";

export const runtime = "nodejs";
export const maxDuration = 120; // adaptive thinking can take a while

const BodySchema = z.object({
  appName: z.string().trim().min(1).max(60),
  description: z.string().trim().min(10).max(600),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI generation is not configured" }, { status: 501 });
  }
  const parsedBody = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsedBody.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { appName, description, accent } = parsedBody.data;

  try {
    const owner = await getRequestOwner(req);
    // anonymous Firebase sessions are guests, not sign-ins (billing-route pattern)
    const signedIn = !!owner.uid && owner.signInProvider !== "anonymous";
    if (!signedIn) return NextResponse.json({ allowed: false, reason: "signin" }, { status: 401 });
    const isPro = isBillingActive(await readBilling(owner.uid!));

    const db = firestoreDb();
    const counterRef = db.doc(`mockframeOwners/${owner.ownerId}/private/ai-generations`);
    const prior = Number(((await counterRef.get()).data()?.value as { count?: number } | undefined)?.count) || 0;
    const verdict = aiGenerationDecision({ signedIn, isPro, priorGenerations: prior });
    if (!verdict.allowed) return NextResponse.json(verdict, { status: 402 });

    if (isPro) {
      // day-quota abuse guard — use quota.ts's actual API (checked when implementing)
      const quota = await consumeDailyQuota(req, owner, "ai-pack", AI_DAILY_LIMIT);
      if (!quota.allowed) return NextResponse.json({ error: "Daily AI limit reached — try again tomorrow" }, { status: 429 });
    }

    const client = new Anthropic();
    const response = await client.messages.parse({
      model: process.env.MOCKFRAME_AI_MODEL ?? "claude-opus-4-8",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system: AI_SYSTEM_PROMPT,
      output_config: { format: zodOutputFormat(AiPackPlanSchema) },
      messages: [{ role: "user", content: aiUserPrompt(appName, description, accent) }],
    });
    const plan = response.parsed_output;
    if (!plan) return NextResponse.json({ error: "Generation failed — please retry" }, { status: 502 });

    const pack = buildPackFromPlan(AiPackPlanSchema.parse(plan), appName);

    // success only: consume a free slot (transactional so parallel requests can't double-spend)
    if (!isPro) {
      const ok = await db.runTransaction(async (txn) => {
        const now = Number(((await txn.get(counterRef)).data()?.value as { count?: number } | undefined)?.count) || 0;
        if (!aiGenerationDecision({ signedIn, isPro, priorGenerations: now }).allowed) return false;
        txn.set(counterRef, { value: { count: now + 1 }, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        return true;
      });
      if (!ok) return NextResponse.json({ allowed: false, reason: "pro" }, { status: 402 });
    }

    return attachOwnerCookie(NextResponse.json({ pack, remaining: isPro ? null : Math.max(0, 2 - prior - 1) }), owner);
  } catch (err) {
    if (err instanceof FirebaseConfigError) {
      return NextResponse.json({ error: "AI generation requires an account backend" }, { status: 501 });
    }
    if (err instanceof Anthropic.RateLimitError || (err instanceof Anthropic.APIError && err.status === 529)) {
      return NextResponse.json({ error: "AI is busy — retry in a minute" }, { status: 429 });
    }
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json({ error: "Generation failed — please retry" }, { status: 502 });
    }
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
```

`consumeDailyQuota` above is a placeholder NAME for whatever `lib/server/quota.ts` actually exports — read that file and call its real function (it already implements per-day counters keyed by `quotaSubject`); if its shape differs (e.g. `enforceQuota(req, owner, key, limit)`), adapt the call, not the semantics. Verify the exact `messages.parse` + `output_config.format` + `zodOutputFormat` usage compiles against the installed SDK; if `parse` rejects the `thinking` param combination, drop `thinking` (adaptive is not default on Opus 4.8) and note it — correctness of the schema enforcement is the priority.

- [ ] **Step 4: Verify** — `npx vitest run lib/ai` PASS; typecheck clean (scoped if promo noise). If `ANTHROPIC_API_KEY` is present in `.env.local`, optionally smoke the route on a dev server (non-default port) with a real call and confirm 200 + valid pack JSON; otherwise confirm 501 without the key. NEVER print the key.

- [ ] **Step 5: Commit** (respect the dirty-file rule from Global Constraints)

```bash
git add apps/web/lib/ai/gate.ts apps/web/lib/ai/__tests__/gate.test.ts apps/web/app/api/ai-pack/route.ts
# package.json/package-lock.json: only if git diff shows exclusively the @anthropic-ai/sdk addition
git commit -m "feat(ai): /api/ai-pack — gated Claude structured generation"
```

---

### Task 4: `/ai` landing + form

**Files:**
- Create: `apps/web/app/ai/page.tsx` (server component: metadata, marketing, FAQ JSON-LD)
- Create: `apps/web/components/ai/AiPackForm.tsx` (client)

**Interfaces:**
- Consumes: `firebaseFetch` (`@/lib/firebaseClient`) so the POST carries the auth token; `savePack` (`@/lib/pack/persist`); `AuthModal` (`@/components/AuthModal`, `{onClose}`); `UpgradeModal` (`@/components/editor/UpgradeModal`, `{reason?, onClose}`); `useEntitlementSync` (`@/lib/billing/client`); `SITE_URL` (`@/lib/site`).
- Produces: working generation flow ending in `savePack(pack)` + `window.open("/app-store-screenshots", "_blank")`.

Form behavior (write complete JSX, matching the dark visual language of `components/pack/*`):
- Fields: app name (max 60), description textarea (max 600, min 10 with helper text), optional accent color input; submit disabled while invalid/loading.
- Loading state: button spinner + rotating status copy ("Designing your narrative…", "Writing captions…", "Painting concept screens…") on a ~6 s interval; warn it can take up to a minute.
- Response handling: 200 → `await savePack(pack)` (import type `PackDocument` for the cast), success card ("Your pack is ready — opening the studio…") + `window.open("/app-store-screenshots", "_blank")` + a visible fallback link for blocked popups + "remaining free generations" note when `remaining !== null`; 401 → open AuthModal; 402 → open UpgradeModal with reason `"AI-generated screenshot packs"`; 429/501/502 → inline error copy from the response body with a retry button.
- Page: `metadata` (title `AI App Store Screenshot Generator — describe your app, get the pack`, description, canonical `${SITE_URL}/ai`, OG), hero + 3-step explainer (Describe → Generate → Swap in real screenshots), FAQ (3 items incl. "2 free generations, unlimited with Pro") + FAQPage JSON-LD, `<AiPackForm />` above the fold.

- [ ] **Step 1: Implement both files** per the behaviors above (complete code, no placeholders in the delivered files).
- [ ] **Step 2: Verify** — typecheck clean; dev server on a non-default port: `/ai` renders, validation blocks empty submits, signed-out submit → 401 path opens AuthModal (with Firebase configured). Kill only your own server PID.
- [ ] **Step 3: Commit** — `git add apps/web/app/ai apps/web/components/ai` + message `feat(ai): /ai landing with AI pack generation flow`.

---

### Task 5: SEO wiring

**Files:**
- Modify: `apps/web/app/sitemap.ts` — add `/ai` entry following the file's CURRENT idiom (the `UPDATED`-map pattern; add an `ai` key), priority 0.9, weekly.
- Modify: `apps/web/components/marketing/MarketingNav.tsx` — add `["/ai", "AI Generator"]` (match the existing `LINKS` tuple shape/position conventions).
- Modify: `apps/web/components/marketing/MarketingFooter.tsx` — add an "AI Generator" link to the Product column.

- [ ] **Step 1: Implement**, adapting to current file state (the other session may have touched these — read first).
- [ ] **Step 2: Verify** — typecheck clean.
- [ ] **Step 3: Commit** — `seo(ai): sitemap + nav + footer links for /ai`.

---

### Task 6: Full verification

- [ ] **Step 1:** `cd apps/web && npx vitest run` (or scoped `lib/ai lib/screens lib/pack` if promo noise) + typecheck + `npm run validate:frames` (arc-browser failure is pre-existing/unrelated — report, don't fix).
- [ ] **Step 2:** `npm run build` — `/ai` and `/api/ai-pack` in the route list.
- [ ] **Step 3:** Integration unit proof (no API key needed): a test or script that runs `buildPackFromPlan(samplePlan, "Focusly")` → `compilePackScene(pack, 0, "appstore-69")` (from `@/lib/pack/compile`) → schema-valid scene whose mockup layer's `media.assetId` starts with `screen:` — proving AI packs flow through the studio compiler unchanged. Add as `apps/web/lib/ai/__tests__/integration.test.ts` if not already covered.
- [ ] **Step 4:** E2E with the `verify` skill: drive `/ai` headless — form renders, validation works, submit signed-out hits the 401 path (AuthModal appears). If `ANTHROPIC_API_KEY` is available in the environment, run ONE real generation end-to-end: 200 → studio opens with 8–10 concept screens rendering (screenshot evidence); otherwise mark that leg skipped-no-key.
- [ ] **Step 5:** Commit any fixes (`fix(ai): …`), final report.

---

## Self-review checklist (ran while writing)

- **Spec coverage:** aiapp variant + renderer → T1; plan schema/prompt/builder + encode duplication rationale → T2; route with signin/anonymous gate, 2-free counter in `private/`, Pro day-quota, success-only increment, typed error mapping, 501-no-key → T3; landing/form/modals/new-tab handoff/popup fallback → T4; SEO → T5; testing incl. compiler integration proof + key-conditional E2E → T6.
- **Type consistency:** `AiAppDoc` shape identical in types.ts (T1) and `AiScreenDocSchema` (T2, minus `app`/`appName`/`archetype` which the builder injects); `aiGenerationDecision` produced T3-step2, consumed T3-step3; `AI_FREE_GENERATIONS/AI_DAILY_LIMIT` produced T2, consumed T3; `buildPackFromPlan` output validated against `PackDocumentSchema` in tests.
- **No placeholders:** the one named placeholder (`consumeDailyQuota`) is explicitly an instruction to bind to `quota.ts`'s real API with semantics fixed by this plan.
