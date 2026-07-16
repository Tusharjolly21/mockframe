# App Promo Video Maker — Phase 1 (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user open a "Promo video" flow in the editor, drop in a screenshot, edit two text lines, and see the *Rise & Reveal* template animate live via `@remotion/player` — proving the data → motion → preview loop end-to-end, entirely client-side.

**Architecture:** Content (`PromoProject`, a zod-validated data object) is separated from motion (a Remotion composition that reads `inputProps`). A pure-logic layer in `apps/web/lib/promo/` (schema, template registry, input-props builder) is unit-tested with vitest; the Remotion composition and the preview panel are React/Remotion and are verified by `npm run typecheck` plus a dev-server smoke test, matching how the rest of this UI codebase is verified.

**Tech Stack:** Next.js 15 (App Router, React 19), TypeScript, zod, Remotion 4.0.489 + `@remotion/player` (already installed), vitest (`vitest run`, node env), Tailwind.

## Global Constraints

- fps is fixed at **30** for all promo compositions (module constant `PROMO_FPS`, never a per-project field).
- Formats and exact dimensions: `9:16 → 1080×1920`, `1:1 → 1080×1080`, `16:9 → 1920×1080`. Default format is `9:16`.
- Phase 1 registers exactly **one** template, `rise-reveal`. The other five ship in the Phase 3 plan.
- Pure-logic files under `apps/web/lib/promo/` must NOT import React or Remotion (they run in vitest's node environment). React/Remotion lives only under `apps/web/remotion/promo/` and `apps/web/components/editor/promo/`.
- Screenshots are referenced by asset id and resolved to a URL at preview time via the existing `resolveAsset(assetId)?.url`. Never embed image bytes in `PromoProject`.
- Zod schemas follow the existing repo pattern (see `apps/web/lib/pack/schema.ts`): export the schema and an inferred type; provide a factory.
- Test files live at `apps/web/lib/promo/__tests__/*.test.ts` (matches `vitest.config.ts` `include: ["lib/**/__tests__/*.test.ts"]`).
- Run tests from `apps/web`: `npm test -- <path>` (script is `vitest run`). Run typecheck from repo root: `npm run typecheck`.
- Follow the custom-event UI pattern already in the codebase (`window.dispatchEvent(new CustomEvent("framekit:toast", …))`, `framekit:fit`) for cross-component signalling rather than adding new global store fields.

## File structure (Phase 1)

- Create `apps/web/lib/promo/types.ts` — `PromoFormat`, `PROMO_FORMATS`, `FORMAT_DIMENSIONS`, `PROMO_FPS`, `PromoProjectSchema`, `PromoProject`.
- Create `apps/web/lib/promo/registry.ts` — `PromoTemplateMeta`, `TextSlot`, `PROMO_TEMPLATES`, `PROMO_TEMPLATE_IDS`, `getPromoTemplate`, `createPromoProject`.
- Create `apps/web/lib/promo/inputProps.ts` — `PromoInputProps`, `buildPromoInputProps`.
- Create `apps/web/lib/promo/__tests__/types.test.ts`, `registry.test.ts`, `inputProps.test.ts`.
- Create `apps/web/remotion/promo/backgrounds.ts` — `PROMO_BACKGROUNDS` (id → CSS background string).
- Create `apps/web/remotion/promo/RiseAndReveal.tsx` — the composition component.
- Create `apps/web/remotion/promo/templates.tsx` — `PROMO_COMPONENTS: Record<string, React.FC<PromoInputProps>>` (typecheck-enforced to cover every registry id).
- Create `apps/web/remotion/promo/Root.tsx` — Remotion `RemotionRoot` registering promo `<Composition>`s (used by the Lambda site in Phase 2; created now so the composition is renderable/inspectable).
- Create `apps/web/components/editor/promo/PromoPanel.tsx` — the client preview panel (template list [1 item in P1], config fields, `@remotion/player`).
- Modify `apps/web/components/editor/Toolbar.tsx` — add a "Promo video" button that dispatches `framekit:promo-open`.
- Modify `apps/web/components/editor/EditorShell.tsx` — listen for `framekit:promo-open` and mount `PromoPanel`.

---

### Task 1: `PromoProject` schema, formats, dimensions

**Files:**
- Create: `apps/web/lib/promo/types.ts`
- Test: `apps/web/lib/promo/__tests__/types.test.ts`

**Interfaces:**
- Consumes: nothing (leaf module).
- Produces:
  - `PROMO_FPS: 30`
  - `PROMO_FORMATS: readonly ["9:16","1:1","16:9"]`, `type PromoFormat = "9:16"|"1:1"|"16:9"`
  - `FORMAT_DIMENSIONS: Record<PromoFormat, { width: number; height: number }>`
  - `PromoProjectSchema` (zod), `type PromoProject = z.infer<typeof PromoProjectSchema>`

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/lib/promo/__tests__/types.test.ts
import { describe, expect, it } from "vitest";
import { FORMAT_DIMENSIONS, PROMO_FORMATS, PROMO_FPS, PromoProjectSchema } from "../types";

const valid = {
  templateId: "rise-reveal",
  deviceId: "iphone-16-pro",
  screenshotAssetId: "asset_1",
  texts: ["Hello", "World"],
  accent: "#7c3aed",
  background: "aurora",
  format: "9:16",
  durationInFrames: 300,
  music: null,
};

describe("promo types", () => {
  it("fps is 30", () => {
    expect(PROMO_FPS).toBe(30);
  });

  it("every format has exact dimensions", () => {
    expect(FORMAT_DIMENSIONS["9:16"]).toEqual({ width: 1080, height: 1920 });
    expect(FORMAT_DIMENSIONS["1:1"]).toEqual({ width: 1080, height: 1080 });
    expect(FORMAT_DIMENSIONS["16:9"]).toEqual({ width: 1920, height: 1080 });
    expect(PROMO_FORMATS.every((f) => FORMAT_DIMENSIONS[f])).toBe(true);
  });

  it("accepts a valid project", () => {
    expect(PromoProjectSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a non-hex accent", () => {
    expect(PromoProjectSchema.safeParse({ ...valid, accent: "purple" }).success).toBe(false);
  });

  it("rejects an unknown format", () => {
    expect(PromoProjectSchema.safeParse({ ...valid, format: "4:5" }).success).toBe(false);
  });

  it("rejects a duration over 30s (900 frames)", () => {
    expect(PromoProjectSchema.safeParse({ ...valid, durationInFrames: 901 }).success).toBe(false);
  });

  it("rejects an empty screenshotAssetId", () => {
    expect(PromoProjectSchema.safeParse({ ...valid, screenshotAssetId: "" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npm test -- lib/promo/__tests__/types.test.ts`
Expected: FAIL — cannot resolve `../types`.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/web/lib/promo/types.ts
import { z } from "zod";

/** All promo compositions render at a fixed 30 fps. */
export const PROMO_FPS = 30 as const;

export const PROMO_FORMATS = ["9:16", "1:1", "16:9"] as const;
export type PromoFormat = (typeof PROMO_FORMATS)[number];

export const FORMAT_DIMENSIONS: Record<PromoFormat, { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
  "16:9": { width: 1920, height: 1080 },
};

/** Max 30 seconds at 30 fps. */
const MAX_FRAMES = 30 * PROMO_FPS;

export const PromoProjectSchema = z.object({
  templateId: z.string().min(1),
  deviceId: z.string().min(1),
  screenshotAssetId: z.string().min(1),
  texts: z.array(z.string()).max(6),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  background: z.string().min(1),
  format: z.enum(PROMO_FORMATS),
  durationInFrames: z.number().int().positive().max(MAX_FRAMES),
  music: z.string().nullable(),
});

export type PromoProject = z.infer<typeof PromoProjectSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && npm test -- lib/promo/__tests__/types.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/promo/types.ts apps/web/lib/promo/__tests__/types.test.ts
git commit -m "feat(promo): PromoProject schema, formats and dimensions"
```

---

### Task 2: Template registry + project factory

**Files:**
- Create: `apps/web/lib/promo/registry.ts`
- Test: `apps/web/lib/promo/__tests__/registry.test.ts`

**Interfaces:**
- Consumes: `PromoProject`, `PromoProjectSchema` from `./types`.
- Produces:
  - `interface TextSlot { key: string; label: string; placeholder: string; maxLen: number }`
  - `interface PromoTemplateMeta { id: string; name: string; description: string; textSlots: TextSlot[]; defaultDurationInFrames: number; defaultBackground: string; defaultAccent: string }`
  - `PROMO_TEMPLATES: PromoTemplateMeta[]` (exactly one entry: `rise-reveal`)
  - `PROMO_TEMPLATE_IDS: string[]`
  - `getPromoTemplate(id: string): PromoTemplateMeta | undefined`
  - `createPromoProject(templateId: string, screenshotAssetId: string): PromoProject`

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/lib/promo/__tests__/registry.test.ts
import { describe, expect, it } from "vitest";
import { PromoProjectSchema } from "../types";
import { createPromoProject, getPromoTemplate, PROMO_TEMPLATE_IDS, PROMO_TEMPLATES } from "../registry";

describe("promo registry", () => {
  it("ships exactly the rise-reveal template in phase 1", () => {
    expect(PROMO_TEMPLATE_IDS).toEqual(["rise-reveal"]);
  });

  it("every template's default duration is a whole number of frames", () => {
    for (const t of PROMO_TEMPLATES) {
      expect(Number.isInteger(t.defaultDurationInFrames)).toBe(true);
      expect(t.defaultDurationInFrames).toBeGreaterThan(0);
    }
  });

  it("getPromoTemplate returns undefined for unknown ids", () => {
    expect(getPromoTemplate("nope")).toBeUndefined();
  });

  it("createPromoProject builds a schema-valid project seeded from the template", () => {
    const p = createPromoProject("rise-reveal", "asset_9");
    expect(PromoProjectSchema.safeParse(p).success).toBe(true);
    expect(p.screenshotAssetId).toBe("asset_9");
    expect(p.format).toBe("9:16");
    // one text per declared slot, seeded with placeholders
    const t = getPromoTemplate("rise-reveal")!;
    expect(p.texts).toEqual(t.textSlots.map((s) => s.placeholder));
  });

  it("createPromoProject throws on an unknown template", () => {
    expect(() => createPromoProject("nope", "asset_1")).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npm test -- lib/promo/__tests__/registry.test.ts`
Expected: FAIL — cannot resolve `../registry`.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/web/lib/promo/registry.ts
import { PROMO_FPS, type PromoProject } from "./types";

export interface TextSlot {
  key: string;
  label: string;
  placeholder: string;
  maxLen: number;
}

export interface PromoTemplateMeta {
  id: string;
  name: string;
  description: string;
  textSlots: TextSlot[];
  defaultDurationInFrames: number;
  defaultBackground: string;
  defaultAccent: string;
}

export const PROMO_TEMPLATES: PromoTemplateMeta[] = [
  {
    id: "rise-reveal",
    name: "Rise & Reveal",
    description:
      "Title fades in, the phone rises from the bottom, settles and floats, a caption slides in, then an outro.",
    textSlots: [
      { key: "headline", label: "Headline", placeholder: "Meet your new workflow", maxLen: 40 },
      { key: "caption", label: "Caption", placeholder: "Ship beautiful screens in minutes", maxLen: 60 },
    ],
    defaultDurationInFrames: 10 * PROMO_FPS,
    defaultBackground: "aurora",
    defaultAccent: "#7c3aed",
  },
];

export const PROMO_TEMPLATE_IDS = PROMO_TEMPLATES.map((t) => t.id);

export function getPromoTemplate(id: string): PromoTemplateMeta | undefined {
  return PROMO_TEMPLATES.find((t) => t.id === id);
}

export function createPromoProject(templateId: string, screenshotAssetId: string): PromoProject {
  const t = getPromoTemplate(templateId);
  if (!t) throw new Error(`Unknown promo template: ${templateId}`);
  return {
    templateId: t.id,
    deviceId: "iphone-16-pro",
    screenshotAssetId,
    texts: t.textSlots.map((s) => s.placeholder),
    accent: t.defaultAccent,
    background: t.defaultBackground,
    format: "9:16",
    durationInFrames: t.defaultDurationInFrames,
    music: null,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && npm test -- lib/promo/__tests__/registry.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/promo/registry.ts apps/web/lib/promo/__tests__/registry.test.ts
git commit -m "feat(promo): template registry and project factory"
```

---

### Task 3: Input-props builder

**Files:**
- Create: `apps/web/lib/promo/inputProps.ts`
- Test: `apps/web/lib/promo/__tests__/inputProps.test.ts`

**Interfaces:**
- Consumes: `FORMAT_DIMENSIONS`, `PromoProject` from `./types`.
- Produces:
  - `interface PromoInputProps { screenshotUrl: string; texts: string[]; accent: string; background: string; watermark: boolean; width: number; height: number }`
  - `buildPromoInputProps(project: PromoProject, opts: { screenshotUrl: string; watermark: boolean }): PromoInputProps`

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/lib/promo/__tests__/inputProps.test.ts
import { describe, expect, it } from "vitest";
import { createPromoProject } from "../registry";
import { buildPromoInputProps } from "../inputProps";

describe("buildPromoInputProps", () => {
  it("maps the project + options into composition props with format dimensions", () => {
    const project = createPromoProject("rise-reveal", "asset_1");
    const props = buildPromoInputProps(project, { screenshotUrl: "blob:abc", watermark: true });
    expect(props).toEqual({
      screenshotUrl: "blob:abc",
      texts: project.texts,
      accent: project.accent,
      background: project.background,
      watermark: true,
      width: 1080,
      height: 1920,
    });
  });

  it("uses 16:9 dimensions when the project format is 16:9", () => {
    const project = { ...createPromoProject("rise-reveal", "asset_1"), format: "16:9" as const };
    const props = buildPromoInputProps(project, { screenshotUrl: "u", watermark: false });
    expect({ width: props.width, height: props.height }).toEqual({ width: 1920, height: 1080 });
    expect(props.watermark).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npm test -- lib/promo/__tests__/inputProps.test.ts`
Expected: FAIL — cannot resolve `../inputProps`.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/web/lib/promo/inputProps.ts
import { FORMAT_DIMENSIONS, type PromoProject } from "./types";

export interface PromoInputProps {
  screenshotUrl: string;
  texts: string[];
  accent: string;
  background: string;
  watermark: boolean;
  width: number;
  height: number;
}

export function buildPromoInputProps(
  project: PromoProject,
  opts: { screenshotUrl: string; watermark: boolean },
): PromoInputProps {
  const { width, height } = FORMAT_DIMENSIONS[project.format];
  return {
    screenshotUrl: opts.screenshotUrl,
    texts: project.texts,
    accent: project.accent,
    background: project.background,
    watermark: opts.watermark,
    width,
    height,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && npm test -- lib/promo/__tests__/inputProps.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/promo/inputProps.ts apps/web/lib/promo/__tests__/inputProps.test.ts
git commit -m "feat(promo): input-props builder"
```

---

### Task 4: `Rise & Reveal` Remotion composition + registration

**Files:**
- Create: `apps/web/remotion/promo/backgrounds.ts`
- Create: `apps/web/remotion/promo/RiseAndReveal.tsx`
- Create: `apps/web/remotion/promo/templates.tsx`
- Create: `apps/web/remotion/promo/Root.tsx`
- Test/gate: `npm run typecheck` + `npx remotion compositions` (no vitest — this is React/Remotion, verified by typecheck and the composition lister, consistent with the repo having no component tests).

**Interfaces:**
- Consumes: `PromoInputProps` from `@/lib/promo/inputProps`; `PROMO_TEMPLATES`, `PROMO_TEMPLATE_IDS` from `@/lib/promo/registry`; `PROMO_FPS`, `FORMAT_DIMENSIONS` from `@/lib/promo/types`.
- Produces:
  - `PROMO_BACKGROUNDS: Record<string, string>` (CSS `background` value per id; includes `"aurora"`).
  - `RiseAndReveal: React.FC<PromoInputProps>`
  - `PROMO_COMPONENTS: Record<string, React.FC<PromoInputProps>>` — one entry per `PROMO_TEMPLATE_IDS`, keyed by template id.
  - `RemotionRoot` in `Root.tsx` registering a `<Composition id="rise-reveal" …>`.

- [ ] **Step 1: Write the backgrounds map**

```ts
// apps/web/remotion/promo/backgrounds.ts
/** CSS `background` shorthand per background id. Kept tiny for phase 1. */
export const PROMO_BACKGROUNDS: Record<string, string> = {
  aurora: "radial-gradient(120% 120% at 50% 0%, #2a1a5e 0%, #0b0817 60%, #05040d 100%)",
  slate: "linear-gradient(160deg, #1e293b 0%, #0b1120 100%)",
  ink: "#05040d",
};

export function promoBackground(id: string): string {
  return PROMO_BACKGROUNDS[id] ?? PROMO_BACKGROUNDS.aurora;
}
```

- [ ] **Step 2: Write the composition**

```tsx
// apps/web/remotion/promo/RiseAndReveal.tsx
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { PromoInputProps } from "@/lib/promo/inputProps";
import { promoBackground } from "./backgrounds";

/**
 * Rise & Reveal — title in, phone rises from below (spring), settles and floats,
 * caption slides in, subtle outro. Reads PromoInputProps; responsive to the
 * composition's own width/height so it works at 9:16, 1:1 and 16:9.
 */
export const RiseAndReveal: React.FC<PromoInputProps> = ({ screenshotUrl, texts, accent, background, watermark }) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const [headline = "", caption = ""] = texts;

  // headline: fade + slight rise over the first 0.7s
  const headlineIn = interpolate(frame, [6, 27], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const headlineY = interpolate(headlineIn, [0, 1], [24, 0]);

  // phone: springs up from below starting ~0.5s
  const rise = spring({ frame: frame - 15, fps, config: { damping: 18, mass: 0.9 } });
  const phoneY = interpolate(rise, [0, 1], [height * 0.55, 0]);
  const float = Math.sin((frame / fps) * 1.6) * 8; // gentle idle float

  // caption: slides in ~1.6s
  const capIn = interpolate(frame, [48, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const capY = interpolate(capIn, [0, 1], [20, 0]);

  // outro: everything eases up + fades in the last 0.6s
  const outro = interpolate(frame, [durationInFrames - 18, durationInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const groupY = interpolate(outro, [0, 1], [0, -30]);
  const groupOpacity = interpolate(outro, [0, 1], [1, 0.35]);

  const phoneW = Math.min(width * 0.62, 520);

  return (
    <AbsoluteFill style={{ background: promoBackground(background), fontFamily: "Inter, system-ui, sans-serif" }}>
      <AbsoluteFill style={{ transform: `translateY(${groupY}px)`, opacity: groupOpacity, alignItems: "center", justifyContent: "flex-start", paddingTop: height * 0.09 }}>
        <div style={{ opacity: headlineIn, transform: `translateY(${headlineY}px)`, color: "#fff", fontSize: width * 0.058, fontWeight: 700, textAlign: "center", maxWidth: width * 0.82, lineHeight: 1.05 }}>
          {headline}
        </div>
        <div style={{ marginTop: height * 0.04, transform: `translateY(${phoneY + float}px)` }}>
          <div style={{ width: phoneW, aspectRatio: "1080 / 2340", borderRadius: phoneW * 0.12, padding: phoneW * 0.028, background: "#111", boxShadow: `0 40px 120px rgba(0,0,0,0.55), 0 0 0 2px ${accent}55` }}>
            <Img src={screenshotUrl} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: phoneW * 0.095, display: "block" }} />
          </div>
        </div>
        <div style={{ opacity: capIn, transform: `translateY(${capY}px)`, marginTop: height * 0.035, color: "#cbd5e1", fontSize: width * 0.032, fontWeight: 500, textAlign: "center", maxWidth: width * 0.78 }}>
          {caption}
        </div>
      </AbsoluteFill>
      {watermark && (
        <div style={{ position: "absolute", bottom: 24, right: 28, color: "rgba(255,255,255,0.5)", fontSize: width * 0.022, fontWeight: 600 }}>
          Made with MockFrame
        </div>
      )}
    </AbsoluteFill>
  );
};
```

- [ ] **Step 3: Write the component map (typecheck-enforced coverage)**

```tsx
// apps/web/remotion/promo/templates.tsx
import type { PromoInputProps } from "@/lib/promo/inputProps";
import { PROMO_TEMPLATE_IDS } from "@/lib/promo/registry";
import { RiseAndReveal } from "./RiseAndReveal";

/** One component per registry id. Keys are validated against the registry at
 *  module load so a missing/extra composition fails fast. */
export const PROMO_COMPONENTS: Record<string, React.FC<PromoInputProps>> = {
  "rise-reveal": RiseAndReveal,
};

// Fail fast if the component map and the registry ever drift apart.
for (const id of PROMO_TEMPLATE_IDS) {
  if (!PROMO_COMPONENTS[id]) throw new Error(`Missing promo composition for template "${id}"`);
}
```

- [ ] **Step 4: Write the Remotion Root**

```tsx
// apps/web/remotion/promo/Root.tsx
import { Composition } from "remotion";
import { FORMAT_DIMENSIONS, PROMO_FPS } from "@/lib/promo/types";
import { getPromoTemplate } from "@/lib/promo/registry";
import { RiseAndReveal } from "./RiseAndReveal";

const dims = FORMAT_DIMENSIONS["9:16"];
const riseReveal = getPromoTemplate("rise-reveal")!;

/** Registered for the Lambda render site (phase 2) and `npx remotion` tooling.
 *  The in-editor preview uses <Player> directly, not this Root. */
export function RemotionRoot() {
  return (
    <Composition
      id="rise-reveal"
      component={RiseAndReveal}
      fps={PROMO_FPS}
      width={dims.width}
      height={dims.height}
      durationInFrames={riseReveal.defaultDurationInFrames}
      defaultProps={{
        screenshotUrl:
          "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
        texts: riseReveal.textSlots.map((s) => s.placeholder),
        accent: riseReveal.defaultAccent,
        background: riseReveal.defaultBackground,
        watermark: false,
        width: dims.width,
        height: dims.height,
      }}
    />
  );
}
```

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: PASS (no errors). This confirms `PromoInputProps` flows correctly through the composition, the component map, and the Root.

- [ ] **Step 6: Verify the composition is renderable**

Run: `cd apps/web && npx remotion compositions remotion/promo/Root.tsx`
Expected: output lists a composition with id `rise-reveal` at `1080x1920`, `300` frames, `30` fps. (This proves Remotion can bundle and read the composition without a browser.)

- [ ] **Step 7: Commit**

```bash
git add apps/web/remotion/promo/
git commit -m "feat(promo): Rise & Reveal composition, component map and Remotion root"
```

---

### Task 5: Promo preview panel + editor entry point

**Files:**
- Create: `apps/web/components/editor/promo/PromoPanel.tsx`
- Modify: `apps/web/components/editor/Toolbar.tsx` (add a "Promo video" button that dispatches `framekit:promo-open`)
- Modify: `apps/web/components/editor/EditorShell.tsx` (listen for `framekit:promo-open`, mount `PromoPanel`)
- Test/gate: `npm run typecheck` + dev-server smoke test.

**Interfaces:**
- Consumes: `createPromoProject`, `getPromoTemplate`, `PROMO_TEMPLATES` from `@/lib/promo/registry`; `PromoProject`, `PROMO_FORMATS`, `PROMO_FPS`, `FORMAT_DIMENSIONS` from `@/lib/promo/types`; `buildPromoInputProps` from `@/lib/promo/inputProps`; `PROMO_COMPONENTS` from `@/remotion/promo/templates`; the existing `resolveAsset`, `ingestFile` from `@/lib/assets`; `useViewStore` from `@/lib/store` (for the `removeWatermark` Pro flag → preview watermark).
- Produces: `PromoPanel` (default export React component, `"use client"`), rendered when open.

- [ ] **Step 1: Write the panel**

```tsx
// apps/web/components/editor/promo/PromoPanel.tsx
"use client";

import { useMemo, useRef, useState } from "react";
import { Player } from "@remotion/player";
import { X } from "lucide-react";
import { ingestFile, resolveAsset } from "@/lib/assets";
import { useViewStore } from "@/lib/store";
import { PROMO_TEMPLATES, createPromoProject, getPromoTemplate } from "@/lib/promo/registry";
import { PROMO_FORMATS, PROMO_FPS, FORMAT_DIMENSIONS, type PromoProject } from "@/lib/promo/types";
import { buildPromoInputProps } from "@/lib/promo/inputProps";
import { PROMO_COMPONENTS } from "@/remotion/promo/templates";

export default function PromoPanel({ onClose }: { onClose: () => void }) {
  const isPro = useViewStore((s) => s.removeWatermark);
  const [project, setProject] = useState<PromoProject | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const template = project ? getPromoTemplate(project.templateId) : undefined;
  const screenshotUrl = assetId ? resolveAsset(assetId)?.url : undefined;

  const Composition = project ? PROMO_COMPONENTS[project.templateId] : undefined;
  const dims = project ? FORMAT_DIMENSIONS[project.format] : FORMAT_DIMENSIONS["9:16"];

  const inputProps = useMemo(() => {
    if (!project || !screenshotUrl) return null;
    return buildPromoInputProps(project, { screenshotUrl, watermark: !isPro });
  }, [project, screenshotUrl, isPro]);

  async function pickScreenshot(f: File) {
    const a = await ingestFile(f);
    setAssetId(a.id);
    setProject((p) => (p ? { ...p, screenshotAssetId: a.id } : createPromoProject("rise-reveal", a.id)));
  }

  return (
    <div className="fixed inset-0 z-[80] flex bg-[#09090b]/90 backdrop-blur-md">
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void pickScreenshot(f); e.target.value = ""; }} />

      {/* left: config */}
      <aside className="flex w-[360px] shrink-0 flex-col gap-5 overflow-y-auto border-r border-white/10 bg-[#0f1014] p-6 text-white">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-semibold">Promo video</h2>
          <button onClick={onClose} title="Close" className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 hover:bg-white/10"><X size={16} /></button>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Template</p>
          {PROMO_TEMPLATES.map((t) => (
            <button key={t.id} onClick={() => setProject(createPromoProject(t.id, assetId ?? ""))}
              className={`w-full rounded-lg border p-3 text-left ${project?.templateId === t.id ? "border-violet-400 bg-white/5" : "border-white/10 hover:bg-white/5"}`}>
              <span className="text-[13.5px] font-semibold">{t.name}</span>
              <span className="mt-1 block text-[11.5px] leading-5 text-zinc-500">{t.description}</span>
            </button>
          ))}
        </div>

        <button onClick={() => fileRef.current?.click()} className="rounded-lg bg-white px-4 py-2.5 text-[13px] font-semibold text-zinc-900 hover:bg-zinc-200">
          {assetId ? "Replace screenshot" : "Upload screenshot"}
        </button>

        {project && template && (
          <>
            <div className="space-y-3">
              {template.textSlots.map((slot, i) => (
                <label key={slot.key} className="block">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{slot.label}</span>
                  <input value={project.texts[i] ?? ""} maxLength={slot.maxLen} placeholder={slot.placeholder}
                    onChange={(e) => setProject((p) => p ? { ...p, texts: p.texts.map((t, j) => (j === i ? e.target.value : t)) } : p)}
                    className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white outline-none focus:border-violet-400" />
                </label>
              ))}
            </div>

            <label className="flex items-center gap-3">
              <span className="text-[12px] text-zinc-400">Accent</span>
              <input type="color" value={project.accent} onChange={(e) => setProject((p) => p ? { ...p, accent: e.target.value } : p)} className="h-8 w-12 rounded border border-white/10 bg-transparent" />
            </label>

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Format</p>
              <div className="flex gap-2">
                {PROMO_FORMATS.map((f) => (
                  <button key={f} onClick={() => setProject((p) => p ? { ...p, format: f } : p)}
                    className={`rounded-lg border px-3 py-1.5 text-[12px] font-semibold ${project.format === f ? "border-violet-400 bg-white/10 text-white" : "border-white/10 text-zinc-400 hover:text-white"}`}>{f}</button>
                ))}
              </div>
            </div>
          </>
        )}
      </aside>

      {/* right: live preview */}
      <div className="flex flex-1 items-center justify-center p-8">
        {project && Composition && inputProps ? (
          <div className="max-h-full max-w-full overflow-hidden rounded-xl shadow-2xl" style={{ aspectRatio: `${dims.width} / ${dims.height}`, width: dims.width >= dims.height ? "80%" : "auto", height: dims.height > dims.width ? "90%" : "auto" }}>
            <Player
              component={Composition}
              inputProps={inputProps}
              durationInFrames={project.durationInFrames}
              fps={PROMO_FPS}
              compositionWidth={dims.width}
              compositionHeight={dims.height}
              style={{ width: "100%", height: "100%" }}
              controls
              loop
            />
          </div>
        ) : (
          <p className="text-[14px] text-zinc-500">Pick a template and upload a screenshot to preview.</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add the entry button in the Toolbar**

In `apps/web/components/editor/Toolbar.tsx`, add `Clapperboard` to the existing `lucide-react` import, and add this button next to the "Realistic photo render (Pro)" button (after the `Sparkles` `IconButton`, around `Toolbar.tsx:138-140`):

```tsx
      <IconButton title="Promo video (Pro)" onClick={() => window.dispatchEvent(new CustomEvent("framekit:promo-open"))}>
        <Clapperboard size={16} />
      </IconButton>
```

- [ ] **Step 3: Mount the panel from EditorShell**

In `apps/web/components/editor/EditorShell.tsx`, add a lazy import at the top:

```tsx
import dynamic from "next/dynamic";
const PromoPanel = dynamic(() => import("./promo/PromoPanel"), { ssr: false });
```

Add state + an effect inside the `EditorShell` component body (near its other `useState`/`useEffect` hooks):

```tsx
  const [promoOpen, setPromoOpen] = useState(false);
  useEffect(() => {
    const open = () => setPromoOpen(true);
    window.addEventListener("framekit:promo-open", open);
    return () => window.removeEventListener("framekit:promo-open", open);
  }, []);
```

And render it near the other top-level panels (e.g. next to where `Toolbar`/render panels mount):

```tsx
  {promoOpen && <PromoPanel onClose={() => setPromoOpen(false)} />}
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS. (If `useState`/`useEffect` are not already imported in `EditorShell.tsx`, add them to the existing `react` import.)

- [ ] **Step 5: Dev-server smoke test**

Run: `cd framekit && npm run dev` (falls back to port 3001 if 3000 is taken). Then:
1. Open `/editor`.
2. Click the clapperboard "Promo video (Pro)" toolbar button → the panel opens full-screen.
3. Click "Upload screenshot", choose any image → the *Rise & Reveal* template appears in the right pane and plays (title fades in, phone rises, caption slides in, loops).
4. Edit the Headline field → the preview text updates.
5. Switch format 9:16 → 1:1 → 16:9 → the preview aspect ratio changes.
6. As a free user (Pro off), confirm the "Made with MockFrame" watermark shows in the preview.

Expected: all six behaviours work; no console errors from the Player.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/editor/promo/PromoPanel.tsx apps/web/components/editor/Toolbar.tsx apps/web/components/editor/EditorShell.tsx
git commit -m "feat(promo): live preview panel and editor entry point"
```

---

## Phase 1 done — what exists now

- A validated `PromoProject` data model, a one-template registry, and an input-props builder, all unit-tested.
- A polished *Rise & Reveal* Remotion composition, renderable via `@remotion/player` and registered for the Lambda site.
- An in-editor "Promo video" flow: upload a screenshot, edit text, pick a format, watch it animate live.
- Free-tier previews carry a watermark (the Pro/export gating and MP4 render land in the **Phase 2** plan).

## Self-review notes

- **Spec coverage (Phase 1 slice of §7.1):** data model ✓ (Task 1), template registry ✓ (Task 2), `inputProps` ✓ (Task 3), first composition ✓ (Task 4), `@remotion/player` preview wired to inputProps ✓ (Task 5). Render service, Pro-gated MP4, the other five templates, and the SEO page are intentionally deferred to the Phase 2–4 plans per the spec's phasing.
- **Type consistency:** `PromoInputProps` is defined once (Task 3) and consumed unchanged by the composition, component map, and panel. `createPromoProject(templateId, screenshotAssetId)` has the same signature everywhere it's called. `FORMAT_DIMENSIONS`, `PROMO_FPS`, `PROMO_FORMATS` come from `types.ts` throughout.
- **No placeholders:** every code step contains complete, runnable code; the two Modify tasks name the exact files, imports, and insertion points.
- **Watermark caveat:** Phase 1 watermarks the *preview* only and does not gate anything (no export yet), so nothing here can leak a paid feature — the real server-enforced Pro gate arrives with the render endpoint in Phase 2.
