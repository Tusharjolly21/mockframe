# App Store Screenshot Pack Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A dedicated studio at `/app-store-screenshots` where a user drops 1–10 app screenshots, picks a style, writes captions, and downloads a submission-ready zip of every required App Store / Play Store size — first pack free for signed-in users, Pro afterwards.

**Architecture:** A new `PackDocument` (Zod, server-safe) describes the pack. A pure compiler (`compilePackScene`) turns each screen × store-target into an ordinary `SceneDocument`, rendered by the existing `SceneRenderer` and exported through the existing offscreen `renderSceneToPng` → `buildZip` pipeline. Gating is a Firestore-transaction route (`/api/pack-export`). Persistence extends the existing drafts API with `kind: "pack"` plus a dedicated IndexedDB fallback.

**Tech Stack:** Next.js 15 (App Router), React 19, zustand, Zod 3, Tailwind 4, Firebase Admin (Firestore), vitest (new), workspace packages `@framekit/scene` and `@framekit/devices`.

**Spec:** `docs/superpowers/specs/2026-07-16-app-store-pack-studio-design.md`

## Global Constraints

- Monorepo boundary rule: `packages/*` are NOT modified by this plan. All new code lives in `apps/web`.
- `apps/web/lib/pack/schema.ts`, `styles.ts`, `compile.ts`, `gate.ts` must NOT have a `"use client"` directive — they are imported by server routes and tests.
- Store target sizes are exact and non-negotiable: App Store 6.9″ = 1320×2868, App Store 6.5″ = 1284×2778, iPad 13″ = 2064×2752, Play phone = 1080×1920, Play feature graphic = 1024×500.
- Device frames come from the existing registry: `iphone-16-pro-max` (screen 1320×2868 — exact 6.9″ match), `iphone-16-plus` (1290×2796), `ipad-pro-13` (2064×2752 — exact 13″ match), `pixel-9-pro` (1280×2856).
- Copy rule: the paywall reason string passed to `openUpgrade()`/`UpgradeModal` is the plural noun phrase `"App Store screenshot packs"`.
- Run all commands from repo root `/Users/tusharjolly/projects/Mockup/framekit` unless stated otherwise.
- Every commit message ends with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Typecheck gate: `npm run typecheck` must pass at the end of every task that touches TS.

**Note (supersedes one spec line):** the spec said "no iPad frame exists"; the registry actually ships `ipad-pro-13` at exactly 2064×2752. The iPad 13″ target is therefore included as an **optional, default-off** target — near-zero extra cost.

---

### Task 1: Vitest infrastructure

**Files:**
- Modify: `apps/web/package.json` (add `vitest` devDependency + `test` script)
- Create: `apps/web/vitest.config.ts`
- Test: `apps/web/lib/pack/__tests__/smoke.test.ts`

**Interfaces:**
- Produces: `npm run test -w web` runs vitest over `apps/web/lib/**/__tests__/*.test.ts`.

- [ ] **Step 1: Install vitest**

```bash
npm install -D vitest -w web
```

- [ ] **Step 2: Create the config**

`apps/web/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/__tests__/*.test.ts"],
  },
});
```

- [ ] **Step 3: Add the script**

In `apps/web/package.json` `"scripts"`, add:

```json
"test": "vitest run"
```

- [ ] **Step 4: Write a smoke test proving workspace-package resolution**

`apps/web/lib/pack/__tests__/smoke.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createScene, SceneDocumentSchema } from "@framekit/scene";
import { getDevice } from "@framekit/devices";

describe("test infra", () => {
  it("resolves @framekit/scene and validates a factory scene", () => {
    const scene = createScene();
    expect(SceneDocumentSchema.safeParse(scene).success).toBe(true);
  });

  it("resolves the device registry", () => {
    expect(getDevice("iphone-16-pro-max")?.screen).toEqual({ width: 1320, height: 2868, cornerRadius: 168 });
  });
});
```

- [ ] **Step 5: Run it**

Run: `npm run test -w web`
Expected: 2 passed. (If `@framekit/devices` fails to resolve because its `main` points elsewhere, add to `vitest.config.ts`: `resolve: { alias: { "@framekit/scene": new URL("../../packages/scene/src/index.ts", import.meta.url).pathname, "@framekit/devices": new URL("../../packages/devices/src/index.ts", import.meta.url).pathname } }` and re-run.)

- [ ] **Step 6: Commit**

```bash
git add apps/web/package.json apps/web/vitest.config.ts apps/web/lib/pack/__tests__/smoke.test.ts package-lock.json
git commit -m "test: add vitest infra for apps/web pure-logic tests"
```

---

### Task 2: Pack schema, targets, factories

**Files:**
- Create: `apps/web/lib/pack/schema.ts`
- Test: `apps/web/lib/pack/__tests__/schema.test.ts`

**Interfaces:**
- Consumes: `BackgroundSchema`, `createId` from `@framekit/scene`.
- Produces (used by Tasks 3–9):
  - `PACK_VERSION = 1`
  - `PACK_TARGET_IDS: readonly ["appstore-69","appstore-65","appstore-ipad13","play-phone","play-feature"]`, `type PackTargetId`
  - `interface PackTarget { id; store: "appstore"|"playstore"; label: string; width: number; height: number; deviceId: string; folder: string }`
  - `PACK_TARGETS: Record<PackTargetId, PackTarget>`
  - `PACK_STYLE_IDS` / `type PackStyleId` (8 ids)
  - `PackScreenSchema`, `PackDocumentSchema`, `type PackScreen`, `type PackDocument`
  - `createPack(): PackDocument`, `createPackScreen(assetId?: string): PackScreen`

- [ ] **Step 1: Write the failing test**

`apps/web/lib/pack/__tests__/schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  createPack,
  createPackScreen,
  PACK_TARGET_IDS,
  PACK_TARGETS,
  PackDocumentSchema,
} from "../schema";

describe("PackDocument schema", () => {
  it("factory output validates", () => {
    expect(PackDocumentSchema.safeParse(createPack()).success).toBe(true);
  });

  it("targets carry exact store dimensions", () => {
    expect(PACK_TARGETS["appstore-69"]).toMatchObject({ width: 1320, height: 2868, deviceId: "iphone-16-pro-max" });
    expect(PACK_TARGETS["appstore-65"]).toMatchObject({ width: 1284, height: 2778, deviceId: "iphone-16-plus" });
    expect(PACK_TARGETS["appstore-ipad13"]).toMatchObject({ width: 2064, height: 2752, deviceId: "ipad-pro-13" });
    expect(PACK_TARGETS["play-phone"]).toMatchObject({ width: 1080, height: 1920, deviceId: "pixel-9-pro" });
    expect(PACK_TARGETS["play-feature"]).toMatchObject({ width: 1024, height: 500 });
  });

  it("rejects more than 10 screens", () => {
    const pack = createPack();
    pack.screens = Array.from({ length: 11 }, () => createPackScreen());
    expect(PackDocumentSchema.safeParse(pack).success).toBe(false);
  });

  it("rejects zero screens", () => {
    const pack = createPack();
    pack.screens = [];
    expect(PackDocumentSchema.safeParse(pack).success).toBe(false);
  });

  it("default targets: both iPhone sizes + Play on, iPad off", () => {
    const pack = createPack();
    expect(pack.targets).toEqual({
      "appstore-69": true,
      "appstore-65": true,
      "appstore-ipad13": false,
      "play-phone": true,
      "play-feature": true,
    });
  });

  it("captions are per-locale maps", () => {
    const screen = createPackScreen("asset-1");
    expect(screen.captions.en).toEqual({ title: "" });
    expect(screen.assetId).toBe("asset-1");
  });

  it("target ids enumerate exactly the five targets", () => {
    expect([...PACK_TARGET_IDS].sort()).toEqual(
      ["appstore-65", "appstore-69", "appstore-ipad13", "play-feature", "play-phone"].sort()
    );
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -w web`
Expected: FAIL — cannot resolve `../schema`.

- [ ] **Step 3: Implement the schema**

`apps/web/lib/pack/schema.ts` (NO `"use client"`):

```ts
import { z } from "zod";
import { BackgroundSchema, createId } from "@framekit/scene";

/**
 * Pack documents describe an App Store / Play Store screenshot SET: shared
 * style + per-screen caption/screenshot. They compile down to ordinary
 * SceneDocuments (see compile.ts) — nothing below ever reaches the renderer
 * directly. Server-safe: imported by API routes and vitest.
 */

export const PACK_VERSION = 1 as const;

export const PACK_TARGET_IDS = [
  "appstore-69",
  "appstore-65",
  "appstore-ipad13",
  "play-phone",
  "play-feature",
] as const;

export type PackTargetId = (typeof PACK_TARGET_IDS)[number];

export interface PackTarget {
  id: PackTargetId;
  store: "appstore" | "playstore";
  label: string;
  width: number;
  height: number;
  /** registry device rendered inside this target's canvases */
  deviceId: string;
  /** zip folder; the README maps folders to store-console upload slots */
  folder: string;
}

export const PACK_TARGETS: Record<PackTargetId, PackTarget> = {
  "appstore-69": {
    id: "appstore-69",
    store: "appstore",
    label: "App Store 6.9″",
    width: 1320,
    height: 2868,
    deviceId: "iphone-16-pro-max",
    folder: "App Store/6.9-inch-1320x2868",
  },
  "appstore-65": {
    id: "appstore-65",
    store: "appstore",
    label: "App Store 6.5″",
    width: 1284,
    height: 2778,
    deviceId: "iphone-16-plus",
    folder: "App Store/6.5-inch-1284x2778",
  },
  "appstore-ipad13": {
    id: "appstore-ipad13",
    store: "appstore",
    label: "App Store iPad 13″",
    width: 2064,
    height: 2752,
    deviceId: "ipad-pro-13",
    folder: "App Store/iPad-13-inch-2064x2752",
  },
  "play-phone": {
    id: "play-phone",
    store: "playstore",
    label: "Play Store phone",
    width: 1080,
    height: 1920,
    deviceId: "pixel-9-pro",
    folder: "Play Store/phone-1080x1920",
  },
  "play-feature": {
    id: "play-feature",
    store: "playstore",
    label: "Play feature graphic",
    width: 1024,
    height: 500,
    deviceId: "pixel-9-pro",
    folder: "Play Store",
  },
};

export const PACK_STYLE_IDS = [
  "minimal-light",
  "bold-gradient",
  "panorama-flow",
  "tilted-rhythm",
  "dark-pro",
  "glass",
  "accent-split",
  "screenshot-first",
] as const;

export type PackStyleId = (typeof PACK_STYLE_IDS)[number];

export const CaptionSchema = z.object({
  title: z.string().max(120),
  subtitle: z.string().max(160).optional(),
});

export const PackScreenSchema = z.object({
  id: z.string(),
  /** uploaded screenshot; null until the user drops one */
  assetId: z.string().nullable(),
  /** keyed by BCP-47 locale; v1 writes only "en" (v2 localization slots in here) */
  captions: z.record(z.string(), CaptionSchema),
  overrides: z.object({
    hideDevice: z.boolean().optional(),
    flipTilt: z.boolean().optional(),
  }),
});

export const PackDocumentSchema = z.object({
  version: z.literal(PACK_VERSION),
  kind: z.literal("pack"),
  id: z.string(),
  appName: z.string().max(60),
  styleId: z.enum(PACK_STYLE_IDS),
  style: z.object({
    accent: z.string(),
    fontFamily: z.string(),
    captionPosition: z.enum(["top", "bottom"]),
    /** overrides the style's default background when set */
    background: BackgroundSchema.optional(),
  }),
  screens: z.array(PackScreenSchema).min(1).max(10),
  targets: z.object({
    "appstore-69": z.boolean(),
    "appstore-65": z.boolean(),
    "appstore-ipad13": z.boolean(),
    "play-phone": z.boolean(),
    "play-feature": z.boolean(),
  }),
});

export type PackScreen = z.infer<typeof PackScreenSchema>;
export type PackDocument = z.infer<typeof PackDocumentSchema>;

export function createPackScreen(assetId?: string): PackScreen {
  return {
    id: createId(),
    assetId: assetId ?? null,
    captions: { en: { title: "" } },
    overrides: {},
  };
}

export function createPack(): PackDocument {
  return {
    version: PACK_VERSION,
    kind: "pack",
    id: createId(),
    appName: "",
    styleId: "bold-gradient",
    style: {
      accent: "#6d28d9",
      fontFamily: "Inter",
      captionPosition: "top",
    },
    screens: [createPackScreen()],
    targets: {
      "appstore-69": true,
      "appstore-65": true,
      "appstore-ipad13": false,
      "play-phone": true,
      "play-feature": true,
    },
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npm run test -w web`
Expected: all schema tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/pack/schema.ts apps/web/lib/pack/__tests__/schema.test.ts
git commit -m "feat(pack): PackDocument schema, store targets, factories"
```

---

### Task 3: Style templates

**Files:**
- Create: `apps/web/lib/pack/styles.ts`
- Test: `apps/web/lib/pack/__tests__/styles.test.ts`

**Interfaces:**
- Consumes: `Background`, `BackgroundSchema` from `@framekit/scene`; `PACK_STYLE_IDS`, `type PackStyleId` from `./schema`.
- Produces (used by Task 4 and the style gallery in Task 9):
  - `interface PackDeviceLayout { xFrac: number; yFrac: number; heightFrac: number; rotate: number }`
  - `interface PackStyle { id: PackStyleId; label: string; panorama?: boolean; captionColor: string; subtitleColor: string; captionHighlight?: string; titleScale?: number; background(accent: string): Background; device(index: number, total: number): PackDeviceLayout }`
  - `PACK_STYLES: Record<PackStyleId, PackStyle>`
  - `mixHex(a: string, b: string, t: number): string`

- [ ] **Step 1: Write the failing test**

`apps/web/lib/pack/__tests__/styles.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { BackgroundSchema } from "@framekit/scene";
import { PACK_STYLE_IDS } from "../schema";
import { mixHex, PACK_STYLES } from "../styles";

describe("mixHex", () => {
  it("t=0 returns a, t=1 returns b", () => {
    expect(mixHex("#ff0000", "#0000ff", 0)).toBe("#ff0000");
    expect(mixHex("#ff0000", "#0000ff", 1)).toBe("#0000ff");
  });
  it("midpoint blends channels", () => {
    expect(mixHex("#000000", "#ffffff", 0.5)).toBe("#808080");
  });
});

describe("PACK_STYLES", () => {
  it("defines every declared style id", () => {
    for (const id of PACK_STYLE_IDS) {
      expect(PACK_STYLES[id], id).toBeDefined();
      expect(PACK_STYLES[id].id).toBe(id);
    }
  });

  it("every style background validates against the scene BackgroundSchema", () => {
    for (const id of PACK_STYLE_IDS) {
      const bg = PACK_STYLES[id].background("#6d28d9");
      expect(BackgroundSchema.safeParse(bg).success, id).toBe(true);
    }
  });

  it("device layouts stay renderable (positive height, sane rotation)", () => {
    for (const id of PACK_STYLE_IDS) {
      for (let i = 0; i < 5; i++) {
        const d = PACK_STYLES[id].device(i, 5);
        expect(d.heightFrac, id).toBeGreaterThan(0.3);
        expect(d.heightFrac, id).toBeLessThanOrEqual(1.0);
        expect(Math.abs(d.rotate), id).toBeLessThanOrEqual(15);
      }
    }
  });

  it("tilted-rhythm alternates rotation sign per screen", () => {
    const a = PACK_STYLES["tilted-rhythm"].device(0, 4).rotate;
    const b = PACK_STYLES["tilted-rhythm"].device(1, 4).rotate;
    expect(Math.sign(a)).not.toBe(Math.sign(b));
  });

  it("only panorama-flow declares panorama", () => {
    expect(PACK_STYLES["panorama-flow"].panorama).toBe(true);
    expect(PACK_STYLE_IDS.filter((id) => PACK_STYLES[id].panorama)).toEqual(["panorama-flow"]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -w web`
Expected: FAIL — cannot resolve `../styles`.

- [ ] **Step 3: Implement styles**

`apps/web/lib/pack/styles.ts` (NO `"use client"`):

```ts
import type { Background } from "@framekit/scene";
import type { PackStyleId } from "./schema";

/** Blend two #rrggbb colors; t=0 → a, t=1 → b. */
export function mixHex(a: string, b: string, t: number): string {
  const pa = a.replace("#", "");
  const pb = b.replace("#", "");
  const ch = (i: number) => {
    const va = parseInt(pa.slice(i, i + 2), 16);
    const vb = parseInt(pb.slice(i, i + 2), 16);
    return Math.round(va + (vb - va) * t)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${ch(0)}${ch(2)}${ch(4)}`;
}

export interface PackDeviceLayout {
  /** device center offset as a fraction of canvas width (x) / height (y).
   *  yFrac is measured toward the side OPPOSITE the caption block. */
  xFrac: number;
  yFrac: number;
  /** device frame height as a fraction of canvas height */
  heightFrac: number;
  rotate: number;
}

export interface PackStyle {
  id: PackStyleId;
  label: string;
  /** one background image flows across all screens of a target */
  panorama?: boolean;
  captionColor: string;
  subtitleColor: string;
  /** highlight pill behind the title (glass style) */
  captionHighlight?: string;
  /** multiplies the default title font size */
  titleScale?: number;
  background: (accent: string) => Background;
  device: (index: number, total: number) => PackDeviceLayout;
}

const straight = (heightFrac: number, yFrac = 0.13): PackStyle["device"] => () => ({
  xFrac: 0,
  yFrac,
  heightFrac,
  rotate: 0,
});

export const PACK_STYLES: Record<PackStyleId, PackStyle> = {
  "minimal-light": {
    id: "minimal-light",
    label: "Minimal Light",
    captionColor: "#111114",
    subtitleColor: "#63636e",
    background: () => ({ type: "solid", color: "#f4f4f5" }),
    device: straight(0.64),
  },
  "bold-gradient": {
    id: "bold-gradient",
    label: "Bold Gradient",
    captionColor: "#ffffff",
    subtitleColor: "rgba(255,255,255,0.72)",
    background: (accent) => ({
      type: "linear-gradient",
      angle: 160,
      stops: [
        { at: 0, color: mixHex(accent, "#ffffff", 0.15) },
        { at: 1, color: mixHex(accent, "#000000", 0.45) },
      ],
    }),
    device: straight(0.64),
  },
  "panorama-flow": {
    id: "panorama-flow",
    label: "Panorama Flow",
    panorama: true,
    captionColor: "#ffffff",
    subtitleColor: "rgba(255,255,255,0.72)",
    background: (accent) => ({
      type: "mesh-gradient",
      seed: 11,
      colors: [accent, mixHex(accent, "#ffffff", 0.35), "#1e1b4b", mixHex(accent, "#000000", 0.55)],
    }),
    device: straight(0.62),
  },
  "tilted-rhythm": {
    id: "tilted-rhythm",
    label: "Tilted Rhythm",
    captionColor: "#ffffff",
    subtitleColor: "rgba(255,255,255,0.68)",
    background: (accent) => ({ type: "solid", color: mixHex(accent, "#000000", 0.82) }),
    device: (index) => ({
      xFrac: index % 2 === 0 ? -0.02 : 0.02,
      yFrac: 0.14,
      heightFrac: 0.66,
      rotate: index % 2 === 0 ? -7 : 7,
    }),
  },
  "dark-pro": {
    id: "dark-pro",
    label: "Dark Pro",
    captionColor: "#f5f5f7",
    subtitleColor: "rgba(245,245,247,0.6)",
    background: (accent) => ({
      type: "radial-gradient",
      cx: 0.5,
      cy: 0.22,
      stops: [
        { at: 0, color: mixHex(accent, "#000000", 0.55) },
        { at: 1, color: "#0b0b0f" },
      ],
    }),
    device: straight(0.62),
  },
  glass: {
    id: "glass",
    label: "Glass",
    captionColor: "#16161a",
    subtitleColor: "rgba(22,22,26,0.62)",
    captionHighlight: "rgba(255,255,255,0.55)",
    background: (accent) => ({
      type: "linear-gradient",
      angle: 135,
      stops: [
        { at: 0, color: mixHex(accent, "#ffffff", 0.62) },
        { at: 1, color: mixHex(accent, "#ffffff", 0.18) },
      ],
    }),
    device: straight(0.62),
  },
  "accent-split": {
    id: "accent-split",
    label: "Accent Split",
    captionColor: "#ffffff",
    subtitleColor: "rgba(255,255,255,0.75)",
    background: (accent) => ({ type: "solid", color: accent }),
    device: straight(0.58, 0.16),
  },
  "screenshot-first": {
    id: "screenshot-first",
    label: "Screenshot First",
    captionColor: "#16161a",
    subtitleColor: "rgba(22,22,26,0.6)",
    titleScale: 0.8,
    background: (accent) => ({ type: "solid", color: mixHex(accent, "#ffffff", 0.88) }),
    device: straight(0.95, 0.25),
  },
};
```

- [ ] **Step 4: Run tests**

Run: `npm run test -w web`
Expected: all styles tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/pack/styles.ts apps/web/lib/pack/__tests__/styles.test.ts
git commit -m "feat(pack): 8 launch pack styles + mixHex"
```

---

### Task 4: Compiler

**Files:**
- Create: `apps/web/lib/pack/compile.ts`
- Test: `apps/web/lib/pack/__tests__/compile.test.ts`

**Interfaces:**
- Consumes: `PACK_TARGETS`, `PACK_TARGET_IDS`, `type PackDocument`, `type PackTargetId` from `./schema`; `PACK_STYLES` from `./styles`; `getDevice` from `@framekit/devices`; `createId`, `createMockupLayer`, `createTextLayer`, `SceneDocumentSchema` from `@framekit/scene`.
- Produces (used by Tasks 8–9):
  - `interface CompiledEntry { path: string; scene: SceneDocument; panoramaIdx?: number; panoramaTotal?: number }`
  - `compilePackScene(pack: PackDocument, screenIndex: number, targetId: PackTargetId): SceneDocument`
  - `compileFeatureGraphic(pack: PackDocument): SceneDocument`
  - `compilePack(pack: PackDocument): CompiledEntry[]`
  - `packReadme(pack: PackDocument, failed?: string[]): string`

- [ ] **Step 1: Write the failing test**

`apps/web/lib/pack/__tests__/compile.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { SceneDocumentSchema, type TextLayer } from "@framekit/scene";
import { compileFeatureGraphic, compilePack, compilePackScene, packReadme } from "../compile";
import { createPack, createPackScreen, PACK_STYLE_IDS, PACK_TARGET_IDS, PACK_TARGETS } from "../schema";

function samplePack() {
  const pack = createPack();
  pack.appName = "Focusly";
  pack.screens = [createPackScreen("asset-a"), createPackScreen("asset-b"), createPackScreen("asset-c")];
  pack.screens[0].captions.en = { title: "Plan your day", subtitle: "In seconds" };
  pack.screens[1].captions.en = { title: "Track habits" };
  pack.screens[2].captions.en = { title: "" };
  return pack;
}

describe("compilePackScene", () => {
  it("every style × portrait target yields a schema-valid scene with exact dims", () => {
    const pack = samplePack();
    for (const styleId of PACK_STYLE_IDS) {
      pack.styleId = styleId;
      for (const targetId of PACK_TARGET_IDS.filter((t) => t !== "play-feature")) {
        const scene = compilePackScene(pack, 0, targetId);
        expect(SceneDocumentSchema.safeParse(scene).success, `${styleId}/${targetId}`).toBe(true);
        expect(scene.canvas.width).toBe(PACK_TARGETS[targetId].width);
        expect(scene.canvas.height).toBe(PACK_TARGETS[targetId].height);
      }
    }
  });

  it("uses the target's device and the screen's asset", () => {
    const scene = compilePackScene(samplePack(), 1, "play-phone");
    const mockup = scene.layers.find((l) => l.type === "mockup");
    expect(mockup && mockup.type === "mockup" && mockup.deviceId).toBe("pixel-9-pro");
    expect(mockup && mockup.type === "mockup" && mockup.media?.assetId).toBe("asset-b");
  });

  it("emits title and subtitle text layers with the pack font", () => {
    const scene = compilePackScene(samplePack(), 0, "appstore-69");
    const texts = scene.layers.filter((l): l is TextLayer => l.type === "text");
    expect(texts.map((t) => t.content)).toEqual(["Plan your day", "In seconds"]);
    expect(texts[0].font.family).toBe("Inter");
  });

  it("omits empty captions and hidden devices", () => {
    const pack = samplePack();
    pack.screens[2].overrides.hideDevice = true;
    const scene = compilePackScene(pack, 2, "appstore-69");
    expect(scene.layers).toHaveLength(0);
  });

  it("flipTilt negates the style rotation", () => {
    const pack = samplePack();
    pack.styleId = "tilted-rhythm";
    const plain = compilePackScene(pack, 0, "appstore-69");
    pack.screens[0].overrides.flipTilt = true;
    const flipped = compilePackScene(pack, 0, "appstore-69");
    const rot = (s: typeof plain) => s.layers.find((l) => l.type === "mockup")!.transform.rotate;
    expect(rot(flipped)).toBe(-rot(plain));
  });

  it("panorama style marks the canvas", () => {
    const pack = samplePack();
    pack.styleId = "panorama-flow";
    expect(compilePackScene(pack, 0, "appstore-69").canvas.panoramaBackground).toBe(true);
    pack.styleId = "minimal-light";
    expect(compilePackScene(pack, 0, "appstore-69").canvas.panoramaBackground).toBeUndefined();
  });

  it("style.background override wins over the style default", () => {
    const pack = samplePack();
    pack.style.background = { type: "solid", color: "#123456" };
    expect(compilePackScene(pack, 0, "appstore-69").canvas.background).toEqual({ type: "solid", color: "#123456" });
  });
});

describe("compileFeatureGraphic", () => {
  it("is 1024×500, schema-valid, and shows the app name", () => {
    const scene = compileFeatureGraphic(samplePack());
    expect(SceneDocumentSchema.safeParse(scene).success).toBe(true);
    expect([scene.canvas.width, scene.canvas.height]).toEqual([1024, 500]);
    const text = scene.layers.find((l) => l.type === "text");
    expect(text && text.type === "text" && text.content).toBe("Focusly");
  });
});

describe("compilePack", () => {
  it("orders entries per target with zero-padded names + feature graphic", () => {
    const pack = samplePack();
    pack.targets = { "appstore-69": true, "appstore-65": false, "appstore-ipad13": false, "play-phone": true, "play-feature": true };
    const entries = compilePack(pack);
    expect(entries.map((e) => e.path)).toEqual([
      "App Store/6.9-inch-1320x2868/01.png",
      "App Store/6.9-inch-1320x2868/02.png",
      "App Store/6.9-inch-1320x2868/03.png",
      "Play Store/phone-1080x1920/01.png",
      "Play Store/phone-1080x1920/02.png",
      "Play Store/phone-1080x1920/03.png",
      "Play Store/feature-graphic-1024x500.png",
    ]);
  });

  it("panorama indices span each target group independently", () => {
    const pack = samplePack();
    pack.styleId = "panorama-flow";
    pack.targets = { "appstore-69": true, "appstore-65": true, "appstore-ipad13": false, "play-phone": false, "play-feature": false };
    const entries = compilePack(pack);
    expect(entries.slice(0, 3).map((e) => e.panoramaIdx)).toEqual([0, 1, 2]);
    expect(entries.slice(3, 6).map((e) => e.panoramaIdx)).toEqual([0, 1, 2]);
    expect(entries.every((e) => e.panoramaTotal === 3)).toBe(true);
  });

  it("non-panorama styles emit no panorama indices", () => {
    const entries = compilePack(samplePack());
    expect(entries.every((e) => e.panoramaIdx === undefined)).toBe(true);
  });
});

describe("packReadme", () => {
  it("mentions every enabled folder and failed files", () => {
    const text = packReadme(samplePack(), ["Play Store/phone-1080x1920/02.png"]);
    expect(text).toContain("6.9-inch-1320x2868");
    expect(text).toContain("feature-graphic");
    expect(text).toContain("FAILED");
    expect(text).toContain("Play Store/phone-1080x1920/02.png");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -w web`
Expected: FAIL — cannot resolve `../compile`.

- [ ] **Step 3: Implement the compiler**

`apps/web/lib/pack/compile.ts` (NO `"use client"`):

```ts
import { getDevice } from "@framekit/devices";
import {
  createId,
  createMockupLayer,
  createTextLayer,
  SceneDocumentSchema,
  type Background,
  type SceneDocument,
} from "@framekit/scene";
import { PACK_TARGET_IDS, PACK_TARGETS, type PackDocument, type PackTargetId } from "./schema";
import { PACK_STYLES, type PackStyle } from "./styles";

/**
 * Pure pack → scene compiler. Every screen × store-target becomes an ordinary
 * SceneDocument rendered by the ONE renderer; nothing here touches the DOM.
 * Text/device placement uses fractions of the target canvas so one style
 * works across every store size.
 */

const LOCALE = "en";

export interface CompiledEntry {
  /** zip path, e.g. "App Store/6.9-inch-1320x2868/01.png" */
  path: string;
  scene: SceneDocument;
  panoramaIdx?: number;
  panoramaTotal?: number;
}

function packBackground(pack: PackDocument, style: PackStyle): Background {
  return pack.style.background ?? style.background(pack.style.accent);
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

export function compilePackScene(pack: PackDocument, screenIndex: number, targetId: PackTargetId): SceneDocument {
  const target = PACK_TARGETS[targetId];
  const style = PACK_STYLES[pack.styleId];
  const screen = pack.screens[screenIndex];
  if (!screen) throw new Error(`pack has no screen ${screenIndex}`);
  const W = target.width;
  const H = target.height;
  const top = pack.style.captionPosition === "top";

  const scene: SceneDocument = {
    schemaVersion: 3,
    id: createId(),
    canvas: {
      width: W,
      height: H,
      background: packBackground(pack, style),
      ...(style.panorama ? { panoramaBackground: true } : {}),
    },
    layers: [],
  };

  const cap = screen.captions[LOCALE] ?? { title: "" };
  const titleSize = Math.round(W * 0.055 * (style.titleScale ?? 1));
  if (cap.title.trim()) {
    const title = createTextLayer(cap.title.trim());
    title.font = { family: pack.style.fontFamily, weight: 800, size: titleSize, lineHeight: 1.12, letterSpacing: -0.02 };
    title.color = style.captionColor;
    title.maxWidth = Math.round(W * 0.86);
    title.transform = { ...title.transform, y: Math.round((top ? -0.385 : 0.315) * H) };
    if (style.captionHighlight) {
      title.highlight = { color: style.captionHighlight, radius: Math.round(titleSize * 0.35), padX: Math.round(titleSize * 0.4), padY: Math.round(titleSize * 0.22) };
    }
    scene.layers.push(title);
  }
  if (cap.subtitle?.trim()) {
    const sub = createTextLayer(cap.subtitle.trim());
    sub.font = { family: pack.style.fontFamily, weight: 500, size: Math.round(W * 0.032), lineHeight: 1.3, letterSpacing: 0 };
    sub.color = style.subtitleColor;
    sub.maxWidth = Math.round(W * 0.8);
    sub.transform = { ...sub.transform, y: Math.round((top ? -0.315 : 0.385) * H) };
    scene.layers.push(sub);
  }

  if (!screen.overrides.hideDevice) {
    const device = getDevice(target.deviceId);
    if (!device) throw new Error(`unknown device ${target.deviceId}`);
    const layout = style.device(screenIndex, pack.screens.length);
    const layer = createMockupLayer({
      deviceId: device.id,
      media: screen.assetId
        ? { assetId: screen.assetId, kind: "image", fit: "cover", offsetX: 0, offsetY: 0, scale: 1 }
        : null,
    });
    layer.transform = {
      ...layer.transform,
      scale: round3((H * layout.heightFrac) / device.frame.height),
      x: Math.round(layout.xFrac * W),
      y: Math.round((top ? layout.yFrac : -layout.yFrac) * H),
      rotate: screen.overrides.flipTilt ? -layout.rotate : layout.rotate,
    };
    scene.layers.push(layer);
  }

  return SceneDocumentSchema.parse(scene);
}

/** 1024×500 Play Store banner: app name on the left, hero screen on the right. */
export function compileFeatureGraphic(pack: PackDocument): SceneDocument {
  const target = PACK_TARGETS["play-feature"];
  const style = PACK_STYLES[pack.styleId];
  const hero = pack.screens[0];
  const W = target.width;
  const H = target.height;

  const scene: SceneDocument = {
    schemaVersion: 3,
    id: createId(),
    canvas: { width: W, height: H, background: packBackground(pack, style) },
    layers: [],
  };

  const name = createTextLayer(pack.appName.trim() || "Your app");
  name.font = { family: pack.style.fontFamily, weight: 800, size: 58, lineHeight: 1.1, letterSpacing: -0.02 };
  name.color = style.captionColor;
  name.maxWidth = Math.round(W * 0.42);
  name.transform = { ...name.transform, x: Math.round(-0.24 * W) };
  scene.layers.push(name);

  const device = getDevice(target.deviceId);
  if (device && hero) {
    const layer = createMockupLayer({
      deviceId: device.id,
      media: hero.assetId
        ? { assetId: hero.assetId, kind: "image", fit: "cover", offsetX: 0, offsetY: 0, scale: 1 }
        : null,
    });
    layer.transform = {
      ...layer.transform,
      scale: round3((H * 1.6) / device.frame.height),
      x: Math.round(0.26 * W),
      y: Math.round(0.42 * H),
      rotate: -8,
    };
    scene.layers.push(layer);
  }

  return SceneDocumentSchema.parse(scene);
}

/** Every screen × enabled portrait target (screens numbered 01..NN), then the feature graphic. */
export function compilePack(pack: PackDocument): CompiledEntry[] {
  const style = PACK_STYLES[pack.styleId];
  const entries: CompiledEntry[] = [];
  for (const targetId of PACK_TARGET_IDS) {
    if (targetId === "play-feature" || !pack.targets[targetId]) continue;
    const folder = PACK_TARGETS[targetId].folder;
    pack.screens.forEach((_, i) => {
      entries.push({
        path: `${folder}/${String(i + 1).padStart(2, "0")}.png`,
        scene: compilePackScene(pack, i, targetId),
        ...(style.panorama ? { panoramaIdx: i, panoramaTotal: pack.screens.length } : {}),
      });
    });
  }
  if (pack.targets["play-feature"]) {
    entries.push({ path: "Play Store/feature-graphic-1024x500.png", scene: compileFeatureGraphic(pack) });
  }
  return entries;
}

export function packReadme(pack: PackDocument, failed: string[] = []): string {
  const lines: string[] = [
    `${pack.appName.trim() || "Your app"} — store screenshot pack`,
    "Generated with MockFrame · https://mockframe.app/app-store-screenshots",
    "",
    "WHERE TO UPLOAD",
    "----------------",
  ];
  if (pack.targets["appstore-69"])
    lines.push('App Store/6.9-inch-1320x2868/  → App Store Connect → your app → Screenshots → "iPhone 6.9″ Display".');
  if (pack.targets["appstore-65"])
    lines.push('App Store/6.5-inch-1284x2778/  → App Store Connect → Screenshots → "iPhone 6.5″ Display".');
  if (pack.targets["appstore-ipad13"])
    lines.push('App Store/iPad-13-inch-2064x2752/  → App Store Connect → Screenshots → "iPad 13″ Display".');
  if (pack.targets["play-phone"])
    lines.push("Play Store/phone-1080x1920/  → Play Console → Store presence → Main store listing → Phone screenshots.");
  if (pack.targets["play-feature"])
    lines.push("Play Store/feature-graphic-1024x500.png  → Play Console → Main store listing → Feature graphic.");
  lines.push("", "Files are numbered in the order they appear in the store gallery.");
  if (failed.length) {
    lines.push("", "FAILED TO RENDER", "----------------");
    for (const f of failed) lines.push(f);
    lines.push("Re-run the export from MockFrame to retry these files.");
  }
  return lines.join("\n");
}
```

- [ ] **Step 4: Run tests**

Run: `npm run test -w web`
Expected: all compile tests PASS. If the `omits empty captions and hidden devices` test fails because `createTextLayer` defaults content, confirm the compiler skips empty `cap.title.trim()` before creating layers.

- [ ] **Step 5: Typecheck and commit**

```bash
npm run typecheck
git add apps/web/lib/pack/compile.ts apps/web/lib/pack/__tests__/compile.test.ts
git commit -m "feat(pack): pure pack→scene compiler, feature graphic, zip manifest"
```

---

### Task 5: Export gating — decision function + `/api/pack-export`

**Files:**
- Create: `apps/web/lib/pack/gate.ts`
- Create: `apps/web/app/api/pack-export/route.ts`
- Test: `apps/web/lib/pack/__tests__/gate.test.ts`

**Interfaces:**
- Consumes (route): `getRequestOwner`, `attachOwnerCookie` from `@/lib/server/requestOwner`; `readBilling`, `isBillingActive` from `@/lib/server/razorpay`; `firestoreDb`, `FirebaseConfigError` from `@/lib/server/firebaseAdmin`.
- Produces:
  - `type PackExportVerdict = { allowed: true; clean: boolean } | { allowed: false; reason: "signin" | "pro" }`
  - `packExportDecision(opts: { signedIn: boolean; isPro: boolean; priorExports: number }): PackExportVerdict`
  - `POST /api/pack-export` → 200 `{allowed:true, clean:true}`, 401 `{allowed:false, reason:"signin"}`, 402 `{allowed:false, reason:"pro"}`, or 200 `{allowed:true, clean:false}` when Firebase is unconfigured (dev fallback, watermarked).

- [ ] **Step 1: Write the failing test**

`apps/web/lib/pack/__tests__/gate.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { packExportDecision } from "../gate";

describe("packExportDecision", () => {
  it("guests must sign in", () => {
    expect(packExportDecision({ signedIn: false, isPro: false, priorExports: 0 })).toEqual({ allowed: false, reason: "signin" });
  });
  it("pro exports unlimited and clean", () => {
    expect(packExportDecision({ signedIn: true, isPro: true, priorExports: 99 })).toEqual({ allowed: true, clean: true });
  });
  it("first free export is clean", () => {
    expect(packExportDecision({ signedIn: true, isPro: false, priorExports: 0 })).toEqual({ allowed: true, clean: true });
  });
  it("second export requires pro", () => {
    expect(packExportDecision({ signedIn: true, isPro: false, priorExports: 1 })).toEqual({ allowed: false, reason: "pro" });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -w web`
Expected: FAIL — cannot resolve `../gate`.

- [ ] **Step 3: Implement the decision function**

`apps/web/lib/pack/gate.ts` (NO `"use client"`):

```ts
/**
 * Pack-export entitlement: signed-in users get ONE free, unwatermarked pack;
 * after that it's Pro. Pure so the count/plan matrix is unit-testable — the
 * route supplies the inputs and enforces this server-side (client gates are
 * a courtesy, per lib/billing/gate.ts).
 */

export type PackExportVerdict =
  | { allowed: true; clean: boolean }
  | { allowed: false; reason: "signin" | "pro" };

export function packExportDecision(opts: {
  signedIn: boolean;
  isPro: boolean;
  priorExports: number;
}): PackExportVerdict {
  if (!opts.signedIn) return { allowed: false, reason: "signin" };
  if (opts.isPro) return { allowed: true, clean: true };
  if (opts.priorExports === 0) return { allowed: true, clean: true };
  return { allowed: false, reason: "pro" };
}
```

- [ ] **Step 4: Run tests**

Run: `npm run test -w web`
Expected: gate tests PASS.

- [ ] **Step 5: Implement the route**

`apps/web/app/api/pack-export/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { FirebaseConfigError, firestoreDb } from "@/lib/server/firebaseAdmin";
import { attachOwnerCookie, getRequestOwner } from "@/lib/server/requestOwner";
import { isBillingActive, readBilling } from "@/lib/server/razorpay";
import { packExportDecision, type PackExportVerdict } from "@/lib/pack/gate";

export const runtime = "nodejs";

/**
 * Authorize one pack export. The first free pack is tracked in the caller's
 * kv space and incremented INSIDE a transaction so parallel requests can't
 * both claim the free slot. Enforced here, not in the client.
 */
export async function POST(req: NextRequest) {
  try {
    const owner = await getRequestOwner(req);
    if (!owner.uid) {
      return NextResponse.json({ allowed: false, reason: "signin" } satisfies PackExportVerdict, { status: 401 });
    }
    const isPro = isBillingActive(await readBilling(owner.uid));
    const ref = firestoreDb().doc(`mockframeOwners/${owner.ownerId}/kv/pack-exports`);
    const verdict = await firestoreDb().runTransaction(async (txn): Promise<PackExportVerdict> => {
      const snap = await txn.get(ref);
      const priorExports = snap.exists ? Number((snap.data()?.value as { count?: number } | undefined)?.count) || 0 : 0;
      const decision = packExportDecision({ signedIn: true, isPro, priorExports });
      if (decision.allowed) {
        txn.set(ref, { value: { count: priorExports + 1 }, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      }
      return decision;
    });
    return attachOwnerCookie(NextResponse.json(verdict, { status: verdict.allowed ? 200 : 402 }), owner);
  } catch (err) {
    if (err instanceof FirebaseConfigError) {
      // Local dev without Firebase: allow the export but watermark it.
      return NextResponse.json({ allowed: true, clean: false } satisfies PackExportVerdict);
    }
    return NextResponse.json({ error: "Export authorization failed" }, { status: 500 });
  }
}
```

- [ ] **Step 6: Typecheck and commit**

Run: `npm run typecheck`
Expected: clean.

```bash
git add apps/web/lib/pack/gate.ts apps/web/lib/pack/__tests__/gate.test.ts apps/web/app/api/pack-export/route.ts
git commit -m "feat(pack): first-pack-free export gating (pure decision + transactional route)"
```

---

### Task 6: Persistence — drafts API `kind: "pack"` + client persist module

**Files:**
- Modify: `apps/web/app/api/drafts/route.ts` (POST scene-validation block ~lines 62–67; GET record mapping ~lines 29–39)
- Modify: `apps/web/lib/drafts.ts` (`DraftRecord` interface ~line 15; `normalizeDraftRecord` ~line 66)
- Modify: `apps/web/components/editor/DraftsPanel.tsx` (exclude packs from the editor's drafts list)
- Create: `apps/web/lib/pack/persist.ts`
- Test: `apps/web/lib/pack/__tests__/persistShape.test.ts`

**Interfaces:**
- Consumes: `PackDocumentSchema`, `type PackDocument` from `@/lib/pack/schema`; `collectAssets`, `persistAsset`, `restoreAssets`, `type GuestAsset` from `../assets`; `firebaseFetch` from `../firebaseClient`.
- Produces:
  - Drafts API accepts/returns records with `kind: "pack"` and a `pack` field (no `scene`).
  - `packAssetIds(pack: PackDocument): string[]` (exported for tests)
  - `savePack(pack: PackDocument): Promise<void>` — IndexedDB (`framekit-packs` DB, `packs` store) always; cloud POST best-effort.
  - `loadLatestPack(): Promise<PackDocument | null>` — cloud first, local fallback; calls `restoreAssets` before returning.

- [ ] **Step 1: Write the failing test (pure asset-collection logic)**

`apps/web/lib/pack/__tests__/persistShape.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { packAssetIds } from "../persistShape";
import { createPack, createPackScreen } from "../schema";

describe("packAssetIds", () => {
  it("collects screen assets and image-background override, skipping nulls", () => {
    const pack = createPack();
    pack.screens = [createPackScreen("a1"), createPackScreen(), createPackScreen("a2")];
    pack.style.background = { type: "image", assetId: "bg1", fit: "cover", blur: 0, opacity: 1 };
    expect(packAssetIds(pack)).toEqual(["a1", "a2", "bg1"]);
  });

  it("non-image backgrounds contribute nothing", () => {
    const pack = createPack();
    pack.screens = [createPackScreen("a1")];
    expect(packAssetIds(pack)).toEqual(["a1"]);
  });
});
```

Note: `packAssetIds` lives in its own server-safe module `persistShape.ts` so the vitest run never imports `"use client"`/IndexedDB code from `persist.ts`.

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -w web`
Expected: FAIL — cannot resolve `../persistShape`.

- [ ] **Step 3: Implement `persistShape.ts` and `persist.ts`**

`apps/web/lib/pack/persistShape.ts` (NO `"use client"`):

```ts
import type { PackDocument } from "./schema";

/** Uploaded asset ids a pack references — the snapshot saved beside it. */
export function packAssetIds(pack: PackDocument): string[] {
  const ids = pack.screens.flatMap((s) => (s.assetId ? [s.assetId] : []));
  if (pack.style.background?.type === "image") ids.push(pack.style.background.assetId);
  return ids;
}
```

`apps/web/lib/pack/persist.ts`:

```ts
"use client";

import { collectAssets, persistAsset, restoreAssets, type GuestAsset } from "../assets";
import { firebaseFetch } from "../firebaseClient";
import { packAssetIds } from "./persistShape";
import { PackDocumentSchema, type PackDocument } from "./schema";

/**
 * Pack persistence mirrors drafts.ts: IndexedDB is the always-on local layer
 * (its own DB so the drafts store's schema/version is untouched), the drafts
 * API (kind: "pack") is the cloud layer, best-effort.
 */

export interface PackRecord {
  id: string;
  name: string;
  kind: "pack";
  updatedAt: number;
  pack: PackDocument;
  assets: GuestAsset[];
}

const DB_NAME = "framekit-packs";
const STORE = "packs";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB unavailable"));
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = run(tx.objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed"));
    });
  } finally {
    db.close();
  }
}

export async function savePack(pack: PackDocument): Promise<void> {
  const record: PackRecord = {
    id: pack.id,
    name: pack.appName.trim() || "App screenshots",
    kind: "pack",
    updatedAt: Date.now(),
    pack,
    assets: collectAssets(packAssetIds(pack)),
  };
  await withStore("readwrite", (s) => s.put(record));
  try {
    const assets = await Promise.all(record.assets.map((a) => persistAsset(a)));
    await firebaseFetch("/api/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...record, assets }),
    });
  } catch {
    // IndexedDB remains the offline fallback, same contract as drafts.ts
  }
}

export async function loadLatestPack(): Promise<PackDocument | null> {
  try {
    const res = await firebaseFetch("/api/drafts");
    if (res.ok) {
      const list = (await res.json()) as Array<{ kind?: string; updatedAt?: number; pack?: unknown; assets?: GuestAsset[] }>;
      const packs = list
        .filter((r) => r.kind === "pack")
        .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
      for (const r of packs) {
        const parsed = PackDocumentSchema.safeParse(r.pack);
        if (parsed.success) {
          restoreAssets(r.assets ?? []);
          return parsed.data;
        }
      }
    }
  } catch {
    // fall through to local
  }
  const local = await withStore("readonly", (s) => s.getAll() as IDBRequest<PackRecord[]>);
  const latest = [...local].sort((a, b) => b.updatedAt - a.updatedAt)[0];
  if (!latest) return null;
  const parsed = PackDocumentSchema.safeParse(latest.pack);
  if (!parsed.success) return null;
  restoreAssets(latest.assets ?? []);
  return parsed.data;
}
```

- [ ] **Step 4: Run tests**

Run: `npm run test -w web`
Expected: persistShape tests PASS.

- [ ] **Step 5: Extend the drafts API route**

In `apps/web/app/api/drafts/route.ts`:

a. Add import at the top:

```ts
import { PackDocumentSchema } from "@/lib/pack/schema";
```

b. In **POST**, replace the scene-validation block:

```ts
  let scene: unknown;
  try {
    scene = migrateScene(body.scene);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid scene" }, { status: 400 });
  }
```

with:

```ts
  let scene: unknown;
  let pack: unknown;
  if (body.kind === "pack") {
    const parsed = PackDocumentSchema.safeParse(body.pack);
    if (!parsed.success) return NextResponse.json({ error: "Invalid pack" }, { status: 400 });
    pack = parsed.data;
  } else {
    try {
      scene = migrateScene(body.scene);
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid scene" }, { status: 400 });
    }
  }
```

c. In the POST `record` object, replace the `kind` and `scene` lines:

```ts
      kind: body.kind === "template" ? "template" : "scene",
      updatedAtMs: updatedAt,
      scene,
```

with:

```ts
      kind: body.kind === "template" ? "template" : body.kind === "pack" ? "pack" : "scene",
      updatedAtMs: updatedAt,
      ...(pack !== undefined ? { pack } : { scene }),
```

(Firestore rejects `undefined` values, so exactly one of `scene`/`pack` may be spread in. If the record is also echoed in the response, apply the same conditional there.)

d. In **GET**'s record mapping, replace:

```ts
        kind: data.kind === "template" ? "template" : "scene",
```

with:

```ts
        kind: data.kind === "template" ? "template" : data.kind === "pack" ? "pack" : "scene",
        ...(data.pack ? { pack: data.pack } : {}),
```

- [ ] **Step 6: Keep pack records out of scene-draft UIs**

a. `apps/web/lib/drafts.ts` — widen the type so runtime "pack" values are honest:

```ts
  kind: "scene" | "template" | "pack";
```

and in `normalizeDraftRecord` replace:

```ts
  return { ...record, kind: record.kind === "template" ? "template" : "scene" };
```

with:

```ts
  return { ...record, kind: record.kind === "template" || record.kind === "pack" ? record.kind : "scene" };
```

b. `apps/web/app/dashboard/page.tsx` already filters `record.kind === section` where section is `"scene" | "template"` — packs drop out automatically. Verify no other code path opens a pack as a scene (search: `grep -n "\.kind" apps/web/app/dashboard/page.tsx`).

c. `apps/web/components/editor/DraftsPanel.tsx` — where `listDrafts().then(setDrafts, ...)` runs (~line 31), filter packs:

```ts
    listDrafts().then((all) => setDrafts(all.filter((d) => d.kind !== "pack")), () => setDrafts([]));
```

(Adapt to the exact callback in the file; the requirement is that the editor drafts panel never lists `kind === "pack"` records.)

- [ ] **Step 7: Typecheck + full test run**

Run: `npm run typecheck && npm run test -w web`
Expected: both clean.

- [ ] **Step 8: Commit**

```bash
git add apps/web/lib/pack/persist.ts apps/web/lib/pack/persistShape.ts apps/web/lib/pack/__tests__/persistShape.test.ts apps/web/app/api/drafts/route.ts apps/web/lib/drafts.ts apps/web/components/editor/DraftsPanel.tsx
git commit -m "feat(pack): pack persistence — drafts API kind=pack + IndexedDB fallback"
```

---

### Task 7: Pack studio state store

**Files:**
- Create: `apps/web/lib/pack/store.ts`
- Test: `apps/web/lib/pack/__tests__/storeOps.test.ts` (pure ops module)
- Create: `apps/web/lib/pack/ops.ts`

**Interfaces:**
- Consumes: schema factories; `ingestFile`, `resolveAsset` from `../assets`; `savePack`, `loadLatestPack` from `./persist`.
- Produces:
  - `ops.ts` (server-safe, pure — unit-tested): `addScreens(pack, assets: {id: string; width: number; height: number; name: string}[]): { pack: PackDocument; warnings: string[]; addedIds: string[] }`, `removeScreen(pack, id): PackDocument`, `moveScreen(pack, id, delta: -1|1): PackDocument`, `setCaption(pack, screenId, title, subtitle): PackDocument`
  - `store.ts` (client): `usePackStore` zustand hook with state `{ pack, activeScreenId, activeTarget, hydrated, exporting, progress }` and actions `hydrate()`, `update(mut)`, `addFiles(files)`, `removeScreenById(id)`, `moveScreenById(id, delta)`, `setActiveScreen(id)`, `setActiveTarget(t)`, `setExporting(exporting, progress?)`. Every pack mutation autosaves (debounced 800 ms) via `savePack`.

- [ ] **Step 1: Write the failing test**

`apps/web/lib/pack/__tests__/storeOps.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { addScreens, moveScreen, removeScreen, setCaption } from "../ops";
import { createPack, createPackScreen } from "../schema";

const asset = (id: string, w = 1320, h = 2868) => ({ id, width: w, height: h, name: `${id}.png` });

describe("addScreens", () => {
  it("fills the single empty placeholder screen first, then appends", () => {
    const start = createPack(); // one screen, assetId null
    const { pack, addedIds } = addScreens(start, [asset("a"), asset("b")]);
    expect(pack.screens).toHaveLength(2);
    expect(pack.screens[0].assetId).toBe("a");
    expect(pack.screens[1].assetId).toBe("b");
    expect(addedIds).toHaveLength(2);
  });

  it("warns on landscape screenshots but still adds them", () => {
    const { pack, warnings } = addScreens(createPack(), [asset("wide", 2868, 1320)]);
    expect(pack.screens[0].assetId).toBe("wide");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("wide.png");
  });

  it("caps at 10 screens with a warning", () => {
    let pack = createPack();
    ({ pack } = addScreens(pack, Array.from({ length: 10 }, (_, i) => asset(`s${i}`))));
    const result = addScreens(pack, [asset("overflow")]);
    expect(result.pack.screens).toHaveLength(10);
    expect(result.warnings.some((w) => w.includes("10"))).toBe(true);
  });
});

describe("removeScreen / moveScreen / setCaption", () => {
  it("removeScreen keeps at least one (empty) screen", () => {
    const pack = createPack();
    const only = pack.screens[0].id;
    const next = removeScreen(pack, only);
    expect(next.screens).toHaveLength(1);
    expect(next.screens[0].assetId).toBeNull();
  });

  it("moveScreen swaps neighbors and clamps at edges", () => {
    let pack = createPack();
    ({ pack } = addScreens(pack, [asset("a"), asset("b"), asset("c")]));
    const [s1, s2] = pack.screens;
    const moved = moveScreen(pack, s2.id, -1);
    expect(moved.screens[0].id).toBe(s2.id);
    expect(moved.screens[1].id).toBe(s1.id);
    expect(moveScreen(moved, s2.id, -1).screens[0].id).toBe(s2.id); // clamped
  });

  it("setCaption writes the en locale", () => {
    const pack = createPack();
    const next = setCaption(pack, pack.screens[0].id, "Hello", "World");
    expect(next.screens[0].captions.en).toEqual({ title: "Hello", subtitle: "World" });
  });

  it("setCaption with empty subtitle drops it", () => {
    const pack = createPack();
    const next = setCaption(pack, pack.screens[0].id, "Hello", "");
    expect(next.screens[0].captions.en).toEqual({ title: "Hello" });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -w web`
Expected: FAIL — cannot resolve `../ops`.

- [ ] **Step 3: Implement the pure ops**

`apps/web/lib/pack/ops.ts` (NO `"use client"`):

```ts
import { createPackScreen, type PackDocument } from "./schema";

/** Pure pack mutations — the zustand store wraps these; tests hit them directly. */

export interface IncomingAsset {
  id: string;
  width: number;
  height: number;
  name: string;
}

const MAX_SCREENS = 10;

export function addScreens(
  pack: PackDocument,
  assets: IncomingAsset[]
): { pack: PackDocument; warnings: string[]; addedIds: string[] } {
  const warnings: string[] = [];
  const addedIds: string[] = [];
  let screens = [...pack.screens];
  for (const asset of assets) {
    if (asset.width >= asset.height) {
      warnings.push(`${asset.name} looks landscape — store phone screenshots are portrait; it will be cover-cropped.`);
    }
    // fill the single empty placeholder before appending
    const empty = screens.length === 1 && screens[0].assetId === null ? 0 : -1;
    if (empty >= 0) {
      screens = [{ ...screens[empty], assetId: asset.id }];
      addedIds.push(screens[0].id);
      continue;
    }
    if (screens.length >= MAX_SCREENS) {
      warnings.push(`Packs are capped at ${MAX_SCREENS} screenshots (both stores' limit) — ${asset.name} was skipped.`);
      continue;
    }
    const screen = createPackScreen(asset.id);
    screens.push(screen);
    addedIds.push(screen.id);
  }
  return { pack: { ...pack, screens }, warnings, addedIds };
}

export function removeScreen(pack: PackDocument, id: string): PackDocument {
  const screens = pack.screens.filter((s) => s.id !== id);
  return { ...pack, screens: screens.length ? screens : [createPackScreen()] };
}

export function moveScreen(pack: PackDocument, id: string, delta: -1 | 1): PackDocument {
  const i = pack.screens.findIndex((s) => s.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= pack.screens.length) return pack;
  const screens = [...pack.screens];
  [screens[i], screens[j]] = [screens[j], screens[i]];
  return { ...pack, screens };
}

export function setCaption(pack: PackDocument, screenId: string, title: string, subtitle: string): PackDocument {
  return {
    ...pack,
    screens: pack.screens.map((s) =>
      s.id === screenId
        ? { ...s, captions: { ...s.captions, en: { title, ...(subtitle.trim() ? { subtitle } : {}) } } }
        : s
    ),
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npm run test -w web`
Expected: ops tests PASS.

- [ ] **Step 5: Implement the zustand store**

`apps/web/lib/pack/store.ts`:

```ts
"use client";

import { create } from "zustand";
import { ingestFile } from "../assets";
import { addScreens, moveScreen, removeScreen } from "./ops";
import { loadLatestPack, savePack } from "./persist";
import { createPack, type PackDocument, type PackTargetId } from "./schema";

interface PackState {
  pack: PackDocument;
  activeScreenId: string;
  activeTarget: PackTargetId;
  hydrated: boolean;
  exporting: boolean;
  progress: { done: number; total: number } | null;
  warnings: string[];
  hydrate: () => Promise<void>;
  /** all pack mutations flow through here — schedules the debounced autosave */
  update: (mut: (pack: PackDocument) => PackDocument) => void;
  addFiles: (files: File[]) => Promise<void>;
  removeScreenById: (id: string) => void;
  moveScreenById: (id: string, delta: -1 | 1) => void;
  setActiveScreen: (id: string) => void;
  setActiveTarget: (t: PackTargetId) => void;
  setExporting: (exporting: boolean, progress?: { done: number; total: number } | null) => void;
  dismissWarnings: () => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSave(pack: PackDocument) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void savePack(pack).catch(() => {}), 800);
}

const initial = createPack();

export const usePackStore = create<PackState>()((set, get) => ({
  pack: initial,
  activeScreenId: initial.screens[0].id,
  activeTarget: "appstore-69",
  hydrated: false,
  exporting: false,
  progress: null,
  warnings: [],

  hydrate: async () => {
    if (get().hydrated) return;
    const saved = await loadLatestPack().catch(() => null);
    if (saved && saved.screens.length) {
      set({ pack: saved, activeScreenId: saved.screens[0].id, hydrated: true });
    } else {
      set({ hydrated: true });
    }
  },

  update: (mut) => {
    const pack = mut(get().pack);
    set({ pack });
    // keep the active screen valid after removals
    if (!pack.screens.some((s) => s.id === get().activeScreenId)) {
      set({ activeScreenId: pack.screens[0].id });
    }
    scheduleSave(pack);
  },

  addFiles: async (files) => {
    const assets = await Promise.all(files.filter((f) => f.type.startsWith("image/")).map((f) => ingestFile(f)));
    if (!assets.length) return;
    const { pack, warnings, addedIds } = addScreens(get().pack, assets);
    set({ pack, warnings: [...get().warnings, ...warnings] });
    if (addedIds.length) set({ activeScreenId: addedIds[addedIds.length - 1] });
    scheduleSave(pack);
  },

  removeScreenById: (id) => get().update((p) => removeScreen(p, id)),
  moveScreenById: (id, delta) => get().update((p) => moveScreen(p, id, delta)),
  setActiveScreen: (id) => set({ activeScreenId: id }),
  setActiveTarget: (activeTarget) => set({ activeTarget }),
  setExporting: (exporting, progress = null) => set({ exporting, progress }),
  dismissWarnings: () => set({ warnings: [] }),
}));
```

- [ ] **Step 6: Typecheck and commit**

Run: `npm run typecheck && npm run test -w web`
Expected: clean.

```bash
git add apps/web/lib/pack/ops.ts apps/web/lib/pack/store.ts apps/web/lib/pack/__tests__/storeOps.test.ts
git commit -m "feat(pack): studio state store with pure tested ops + autosave"
```

---

### Task 8: Export pipeline

**Files:**
- Modify: `apps/web/lib/bulkExport.tsx` (export `renderSceneToPng`)
- Create: `apps/web/lib/pack/export.ts`

**Interfaces:**
- Consumes: `renderSceneToPng(scene, scale, watermark, panoramaIdx?, panoramaTotal?)` (newly exported; `watermark=true` means CLEAN/no watermark — matches `bulkExportZip`'s existing convention of passing the pro flag); `buildZip`, `ZipEntry` from `../zip`; `firebaseFetch` from `../firebaseClient`; `compilePack`, `packReadme` from `./compile`.
- Produces (used by Task 9):
  - `requestPackExport(): Promise<PackExportVerdict>` (client wrapper for `/api/pack-export`)
  - `exportPackZip(pack, opts: { clean: boolean; onProgress?: (done, total) => void }): Promise<{ failed: string[] }>`

- [ ] **Step 1: Export the offscreen renderer**

In `apps/web/lib/bulkExport.tsx` change:

```ts
async function renderSceneToPng(
```

to:

```ts
export async function renderSceneToPng(
```

- [ ] **Step 2: Implement the pack export module**

`apps/web/lib/pack/export.ts`:

```ts
"use client";

import { renderSceneToPng } from "../bulkExport";
import { firebaseFetch } from "../firebaseClient";
import { buildZip, type ZipEntry } from "../zip";
import { compilePack, packReadme } from "./compile";
import type { PackExportVerdict } from "./gate";
import type { PackDocument } from "./schema";

/** Ask the server whether this export may proceed (and whether it's watermark-free). */
export async function requestPackExport(): Promise<PackExportVerdict> {
  let res: Response;
  try {
    res = await firebaseFetch("/api/pack-export", { method: "POST" });
  } catch {
    throw new Error("Couldn't reach the export service — check your connection and retry.");
  }
  if (res.status === 401) return { allowed: false, reason: "signin" };
  if (res.status === 402) return { allowed: false, reason: "pro" };
  if (!res.ok) throw new Error("Export authorization failed — please retry.");
  const json = (await res.json()) as { allowed?: boolean; clean?: boolean };
  return json.allowed ? { allowed: true, clean: !!json.clean } : { allowed: false, reason: "pro" };
}

/** Render every enabled screen × target offscreen and download one zip.
 *  Per-file failures are skipped and reported, never abort the pack. */
export async function exportPackZip(
  pack: PackDocument,
  opts: { clean: boolean; onProgress?: (done: number, total: number) => void }
): Promise<{ failed: string[] }> {
  const compiled = compilePack(pack);
  const entries: ZipEntry[] = [];
  const failed: string[] = [];
  for (let i = 0; i < compiled.length; i++) {
    const entry = compiled[i];
    try {
      const png = await renderSceneToPng(entry.scene, 1, opts.clean, entry.panoramaIdx, entry.panoramaTotal);
      entries.push({ name: entry.path, data: png });
    } catch {
      failed.push(entry.path);
    }
    opts.onProgress?.(i + 1, compiled.length);
  }
  if (!entries.length) throw new Error("Every screenshot failed to render — please retry.");
  entries.push({ name: "README.txt", data: new TextEncoder().encode(packReadme(pack, failed)) });

  const zip = buildZip(entries);
  const slug = (pack.appName || "app").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "app";
  const a = document.createElement("a");
  a.href = URL.createObjectURL(zip);
  a.download = `${slug}-screenshots.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return { failed };
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: clean. (`renderSceneToPng`'s panorama params are already `number | undefined` — passing `entry.panoramaIdx` compiles.)

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/bulkExport.tsx apps/web/lib/pack/export.ts
git commit -m "feat(pack): pack zip export over the existing offscreen render pipeline"
```

---

### Task 9: Studio UI

**Files:**
- Create: `apps/web/components/pack/PackStudio.tsx`
- Create: `apps/web/components/pack/ScreenStrip.tsx`
- Create: `apps/web/components/pack/PackPreview.tsx`
- Create: `apps/web/components/pack/PackInspector.tsx`
- Create: `apps/web/app/app-store-screenshots/page.tsx`

**Interfaces:**
- Consumes: `usePackStore`; `compilePackScene`, `compileFeatureGraphic`; `PACK_TARGETS`, `PACK_TARGET_IDS`; `PACK_STYLES`; `requestPackExport`, `exportPackZip`; `SceneRenderer` + `resolveAsset` (`@framekit/renderer`, `@/lib/assets`); `useEntitlementSync` (`@/lib/billing/client`); `UpgradeModal` (`@/components/editor/UpgradeModal`, props `{ reason?, initialPlan?, onClose }`); `AuthModal` (`@/components/AuthModal`, props `{ onClose }`); `useAuth` from wherever `AuthModal`'s module exports it (check `apps/web/lib/auth.tsx`).
- Produces: `/app-store-screenshots` — a working three-pane studio with export.

Notes for the implementer:
- Tailwind 4 utility classes; match the visual language of `components/editor/*` (dark chrome, rounded-xl panels). Look at `EditorShell.tsx` for palette/class conventions before writing markup.
- The preview pane must render `SceneRenderer` inside a wrapper scaled with CSS `transform: scale(fit)` where `fit = min(paneW / scene.canvas.width, paneH / scene.canvas.height)`; measure the pane with a `ResizeObserver`.
- Reordering: HTML5 drag & drop on strip items (`draggable`, `onDragStart` stores the index, `onDrop` calls `moveScreenById` repeatedly or a direct reorder via `update`); ALSO keep up/down buttons for keyboard accessibility.

- [ ] **Step 1: Build `ScreenStrip.tsx`**

```tsx
"use client";

import { useRef, useState } from "react";
import { resolveAsset } from "@/lib/assets";
import { usePackStore } from "@/lib/pack/store";

/** Left rail: one thumbnail per screen, multi-file add, drag (or buttons) to reorder. */
export function ScreenStrip() {
  const { pack, activeScreenId, setActiveScreen, addFiles, removeScreenById, moveScreenById } = usePackStore();
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const step = from < to ? 1 : -1;
    let id = pack.screens[from].id;
    for (let i = from; i !== to; i += step) moveScreenById(id, step as 1 | -1);
  };

  return (
    <aside className="flex w-40 shrink-0 flex-col gap-2 overflow-y-auto border-r border-white/10 bg-[#101014] p-3">
      {pack.screens.map((screen, i) => {
        const asset = screen.assetId ? resolveAsset(screen.assetId) : undefined;
        return (
          <div
            key={screen.id}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => dragIndex !== null && (reorder(dragIndex, i), setDragIndex(null))}
            onClick={() => setActiveScreen(screen.id)}
            className={`group relative cursor-pointer rounded-lg border p-1 transition ${
              screen.id === activeScreenId ? "border-violet-500 bg-violet-500/10" : "border-white/10 hover:border-white/25"
            }`}
          >
            <div className="flex aspect-[9/19] items-center justify-center overflow-hidden rounded-md bg-black/40">
              {asset ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={asset.url} alt={`Screen ${i + 1}`} className="h-full w-full object-cover" />
              ) : (
                <span className="px-2 text-center text-[11px] text-white/40">Drop a screenshot</span>
              )}
            </div>
            <div className="mt-1 flex items-center justify-between px-0.5 text-[11px] text-white/50">
              <span>{String(i + 1).padStart(2, "0")}</span>
              <span className="hidden gap-1 group-hover:flex">
                <button aria-label="Move up" onClick={(e) => { e.stopPropagation(); moveScreenById(screen.id, -1); }}>↑</button>
                <button aria-label="Move down" onClick={(e) => { e.stopPropagation(); moveScreenById(screen.id, 1); }}>↓</button>
                <button aria-label="Remove" onClick={(e) => { e.stopPropagation(); removeScreenById(screen.id); }}>×</button>
              </span>
            </div>
          </div>
        );
      })}
      <button
        onClick={() => fileInput.current?.click()}
        className="rounded-lg border border-dashed border-white/20 py-3 text-sm text-white/60 transition hover:border-violet-400 hover:text-white"
      >
        + Add screenshots
      </button>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void addFiles(Array.from(e.target.files));
          e.target.value = "";
        }}
      />
    </aside>
  );
}
```

- [ ] **Step 2: Build `PackPreview.tsx`**

```tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SceneRenderer } from "@framekit/renderer";
import { resolveAsset } from "@/lib/assets";
import { compileFeatureGraphic, compilePackScene } from "@/lib/pack/compile";
import { PACK_TARGET_IDS, PACK_TARGETS } from "@/lib/pack/schema";
import { usePackStore } from "@/lib/pack/store";

/** Center pane: live render of the active screen at the active store size. */
export function PackPreview() {
  const { pack, activeScreenId, activeTarget, setActiveTarget } = usePackStore();
  const paneRef = useRef<HTMLDivElement>(null);
  const [pane, setPane] = useState({ w: 800, h: 600 });

  useEffect(() => {
    const el = paneRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setPane({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const screenIndex = Math.max(0, pack.screens.findIndex((s) => s.id === activeScreenId));
  const scene = useMemo(
    () =>
      activeTarget === "play-feature"
        ? compileFeatureGraphic(pack)
        : compilePackScene(pack, screenIndex, activeTarget),
    [pack, screenIndex, activeTarget]
  );
  const fit = Math.min(pane.w / scene.canvas.width, pane.h / scene.canvas.height, 1) * 0.92;

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex gap-1 border-b border-white/10 bg-[#101014] px-4 py-2">
        {PACK_TARGET_IDS.map((id) =>
          pack.targets[id] ? (
            <button
              key={id}
              onClick={() => setActiveTarget(id)}
              className={`rounded-full px-3 py-1 text-xs transition ${
                activeTarget === id ? "bg-violet-600 text-white" : "text-white/60 hover:bg-white/10"
              }`}
            >
              {PACK_TARGETS[id].label}
            </button>
          ) : null
        )}
      </div>
      <div ref={paneRef} className="flex flex-1 items-center justify-center overflow-hidden bg-[#17171c] p-6">
        <div
          style={{
            width: scene.canvas.width * fit,
            height: scene.canvas.height * fit,
          }}
        >
          <div style={{ transform: `scale(${fit})`, transformOrigin: "top left" }}>
            <SceneRenderer
              scene={scene}
              resolveAsset={resolveAsset}
              panoramaIdx={screenIndex}
              panoramaTotal={pack.screens.length}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Build `PackInspector.tsx`**

```tsx
"use client";

import { PACK_STYLE_IDS, PACK_TARGET_IDS, PACK_TARGETS } from "@/lib/pack/schema";
import { PACK_STYLES, mixHex } from "@/lib/pack/styles";
import { setCaption } from "@/lib/pack/ops";
import { usePackStore } from "@/lib/pack/store";

const FONTS = ["Inter", "Georgia", "system-ui"] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-white/10 px-4 py-4">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">{title}</h3>
      {children}
    </section>
  );
}

/** Right rail: style gallery, captions for the active screen, brand + targets. */
export function PackInspector() {
  const { pack, activeScreenId, update } = usePackStore();
  const screen = pack.screens.find((s) => s.id === activeScreenId) ?? pack.screens[0];
  const cap = screen.captions.en ?? { title: "" };

  return (
    <aside className="w-72 shrink-0 overflow-y-auto border-l border-white/10 bg-[#101014] text-sm text-white/85">
      <Section title="Style">
        <div className="grid grid-cols-2 gap-2">
          {PACK_STYLE_IDS.map((id) => {
            const style = PACK_STYLES[id];
            const bg = style.background(pack.style.accent);
            const swatch =
              bg.type === "solid"
                ? bg.color
                : bg.type === "linear-gradient"
                  ? `linear-gradient(${bg.angle}deg, ${bg.stops.map((s) => `${s.color} ${s.at * 100}%`).join(", ")})`
                  : bg.type === "radial-gradient"
                    ? `radial-gradient(circle at ${bg.cx * 100}% ${bg.cy * 100}%, ${bg.stops.map((s) => `${s.color} ${s.at * 100}%`).join(", ")})`
                    : `linear-gradient(135deg, ${mixHex(pack.style.accent, "#ffffff", 0.3)}, ${mixHex(pack.style.accent, "#000000", 0.5)})`;
            return (
              <button
                key={id}
                onClick={() => update((p) => ({ ...p, styleId: id }))}
                className={`rounded-lg border p-1.5 text-left transition ${
                  pack.styleId === id ? "border-violet-500" : "border-white/10 hover:border-white/25"
                }`}
              >
                <div className="mb-1 h-10 rounded-md" style={{ background: swatch }} />
                <span className="text-[11px] text-white/70">{style.label}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title={`Caption · screen ${String(pack.screens.indexOf(screen) + 1).padStart(2, "0")}`}>
        <input
          value={cap.title}
          onChange={(e) => update((p) => setCaption(p, screen.id, e.target.value, cap.subtitle ?? ""))}
          placeholder="Headline, e.g. Plan your day"
          className="mb-2 w-full rounded-md border border-white/10 bg-black/30 px-2.5 py-1.5 outline-none focus:border-violet-500"
        />
        <input
          value={cap.subtitle ?? ""}
          onChange={(e) => update((p) => setCaption(p, screen.id, cap.title, e.target.value))}
          placeholder="Optional subtitle"
          className="w-full rounded-md border border-white/10 bg-black/30 px-2.5 py-1.5 outline-none focus:border-violet-500"
        />
        <div className="mt-3 flex gap-4 text-[12px] text-white/60">
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={!!screen.overrides.hideDevice}
              onChange={(e) =>
                update((p) => ({
                  ...p,
                  screens: p.screens.map((s) =>
                    s.id === screen.id ? { ...s, overrides: { ...s.overrides, hideDevice: e.target.checked } } : s
                  ),
                }))
              }
            />
            Hide device
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={!!screen.overrides.flipTilt}
              onChange={(e) =>
                update((p) => ({
                  ...p,
                  screens: p.screens.map((s) =>
                    s.id === screen.id ? { ...s, overrides: { ...s.overrides, flipTilt: e.target.checked } } : s
                  ),
                }))
              }
            />
            Flip tilt
          </label>
        </div>
      </Section>

      <Section title="Brand">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-[12px] text-white/60">
            Accent
            <input
              type="color"
              value={pack.style.accent}
              onChange={(e) => update((p) => ({ ...p, style: { ...p.style, accent: e.target.value } }))}
              className="h-7 w-9 cursor-pointer rounded border border-white/10 bg-transparent"
            />
          </label>
          <select
            value={pack.style.fontFamily}
            onChange={(e) => update((p) => ({ ...p, style: { ...p.style, fontFamily: e.target.value } }))}
            className="flex-1 rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-[12px]"
          >
            {FONTS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex gap-1 rounded-lg bg-black/30 p-1 text-[12px]">
          {(["top", "bottom"] as const).map((pos) => (
            <button
              key={pos}
              onClick={() => update((p) => ({ ...p, style: { ...p.style, captionPosition: pos } }))}
              className={`flex-1 rounded-md py-1 capitalize transition ${
                pack.style.captionPosition === pos ? "bg-violet-600 text-white" : "text-white/60"
              }`}
            >
              Caption {pos}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Export sizes">
        {PACK_TARGET_IDS.map((id) => (
          <label key={id} className="mb-1.5 flex items-center gap-2 text-[12px] text-white/70">
            <input
              type="checkbox"
              checked={pack.targets[id]}
              onChange={(e) => update((p) => ({ ...p, targets: { ...p.targets, [id]: e.target.checked } }))}
            />
            {PACK_TARGETS[id].label}
            <span className="text-white/35">{PACK_TARGETS[id].width}×{PACK_TARGETS[id].height}</span>
          </label>
        ))}
      </Section>
    </aside>
  );
}
```

- [ ] **Step 4: Build `PackStudio.tsx` (shell + export flow + modals + drop zone)**

```tsx
"use client";

import { useEffect, useState } from "react";
import { AuthModal } from "@/components/AuthModal";
import { UpgradeModal } from "@/components/editor/UpgradeModal";
import { useEntitlementSync } from "@/lib/billing/client";
import { exportPackZip, requestPackExport } from "@/lib/pack/export";
import { usePackStore } from "@/lib/pack/store";
import { PackInspector } from "./PackInspector";
import { PackPreview } from "./PackPreview";
import { ScreenStrip } from "./ScreenStrip";

const UPGRADE_REASON = "App Store screenshot packs";

export function PackStudio() {
  useEntitlementSync();
  const { pack, hydrate, hydrated, update, addFiles, exporting, progress, setExporting, warnings, dismissWarnings } =
    usePackStore();
  const [authOpen, setAuthOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const missing = pack.screens.filter((s) => !s.assetId).length;
  const anyTarget = Object.values(pack.targets).some(Boolean);

  async function onExport() {
    setError(null);
    setDone(null);
    if (missing) {
      setError(`Add a screenshot to every screen (or remove empty screens) — ${missing} still empty.`);
      return;
    }
    if (!anyTarget) {
      setError("Enable at least one export size.");
      return;
    }
    try {
      const verdict = await requestPackExport();
      if (!verdict.allowed) {
        if (verdict.reason === "signin") setAuthOpen(true);
        else setUpgradeOpen(true);
        return;
      }
      setExporting(true, { done: 0, total: 1 });
      const { failed } = await exportPackZip(pack, {
        clean: verdict.clean,
        onProgress: (d, t) => setExporting(true, { done: d, total: t }),
      });
      setDone(
        failed.length
          ? `Pack exported — ${failed.length} file(s) failed and are listed in README.txt.`
          : "Pack exported. See README.txt inside the zip for where each folder uploads."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed — please retry.");
    } finally {
      setExporting(false);
    }
  }

  if (!hydrated) {
    return <div className="flex h-[80vh] items-center justify-center text-white/50">Loading your pack…</div>;
  }

  return (
    <div
      className="flex h-[calc(100vh-0px)] min-h-[560px] flex-col bg-[#0b0b0f] text-white"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files?.length) void addFiles(Array.from(e.dataTransfer.files));
      }}
    >
      <header className="flex items-center gap-3 border-b border-white/10 bg-[#101014] px-4 py-2.5">
        <input
          value={pack.appName}
          onChange={(e) => update((p) => ({ ...p, appName: e.target.value.slice(0, 60) }))}
          placeholder="Your app name"
          className="w-56 rounded-md border border-white/10 bg-black/30 px-2.5 py-1.5 text-sm outline-none focus:border-violet-500"
        />
        <span className="text-xs text-white/40">{pack.screens.length}/10 screens · autosaved</span>
        <div className="ml-auto flex items-center gap-3">
          {exporting && progress && (
            <span className="text-xs text-white/60">Rendering {progress.done}/{progress.total}…</span>
          )}
          <button
            onClick={() => void onExport()}
            disabled={exporting}
            className="rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-semibold transition hover:bg-violet-500 disabled:opacity-50"
          >
            {exporting ? "Exporting…" : "Export pack"}
          </button>
        </div>
      </header>

      {(error || done || warnings.length > 0) && (
        <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-[#15151a] px-4 py-2 text-[13px]">
          <div className="space-y-0.5">
            {error && <p className="text-red-400">{error}</p>}
            {done && <p className="text-emerald-400">{done}</p>}
            {warnings.map((w, i) => (
              <p key={i} className="text-amber-300/90">{w}</p>
            ))}
          </div>
          <button
            className="text-white/40 hover:text-white"
            onClick={() => {
              setError(null);
              setDone(null);
              dismissWarnings();
            }}
          >
            ×
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <ScreenStrip />
        <PackPreview />
        <PackInspector />
      </div>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
      {upgradeOpen && <UpgradeModal reason={UPGRADE_REASON} onClose={() => setUpgradeOpen(false)} />}
    </div>
  );
}
```

Adjust `AuthModal`/`UpgradeModal` imports if their actual export paths differ (`AuthModal` is `apps/web/components/AuthModal.tsx` with `{ onClose }`; `UpgradeModal` is `apps/web/components/editor/UpgradeModal.tsx` with `{ reason?, initialPlan?, onClose }` — both confirmed).

- [ ] **Step 5: Build the page**

`apps/web/app/app-store-screenshots/page.tsx`:

```tsx
import type { Metadata } from "next";
import { PackStudio } from "@/components/pack/PackStudio";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "App Store Screenshot Generator — every required size in one zip",
  description:
    "Upload your app screenshots once and export App Store 6.9″ & 6.5″, Google Play phone screenshots and the feature graphic — framed, captioned, submission-ready. First pack free.",
  alternates: { canonical: `${SITE_URL}/app-store-screenshots` },
  openGraph: {
    title: "App Store Screenshot Generator | MockFrame",
    description: "Drop 3–10 screenshots, pick a style, download a submission-ready zip for both stores.",
    url: `${SITE_URL}/app-store-screenshots`,
  },
};

const FAQ = [
  {
    q: "What sizes does the pack include?",
    a: "Apple App Store 6.9-inch (1320×2868) and 6.5-inch (1284×2778) portrait PNGs, optional iPad 13-inch (2064×2752), Google Play phone screenshots (1080×1920) and the 1024×500 feature graphic.",
  },
  {
    q: "Is it free?",
    a: "Building and previewing is free. Your first full pack export is free with a free account; unlimited packs are part of Pro.",
  },
  {
    q: "Do I need design skills?",
    a: "No — pick one of 8 styles, type a caption per screen, and every store size is generated from the same design.",
  },
] as const;

export default function AppStoreScreenshotsPage() {
  return (
    <main className="bg-[#0b0b0f]">
      <PackStudio />
      <section className="mx-auto max-w-3xl px-6 py-16 text-white/80">
        <h1 className="text-2xl font-bold text-white">App Store &amp; Play Store screenshot generator</h1>
        <p className="mt-3 text-white/60">
          Every app release needs the same tedious set of store screenshots. MockFrame turns 3–10 raw screenshots
          into framed, captioned marketing shots in every required size — exported as one zip with a README that
          says exactly which folder uploads where.
        </p>
        <dl className="mt-10 space-y-6">
          {FAQ.map((f) => (
            <div key={f.q}>
              <dt className="font-semibold text-white">{f.q}</dt>
              <dd className="mt-1 text-white/60">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />
    </main>
  );
}
```

- [ ] **Step 6: Typecheck + dev-server smoke test**

Run: `npm run typecheck`
Expected: clean.

Run: `npm run dev`, open `http://localhost:3000/app-store-screenshots`.
Expected: studio renders; dropping 2 portrait PNGs creates 2 screens; style switch updates preview; captions render live; target tabs switch canvas size; Export with an empty screen shows the inline error; Export while signed out (Firebase configured) opens the auth modal.

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/pack apps/web/app/app-store-screenshots
git commit -m "feat(pack): App Store pack studio UI at /app-store-screenshots"
```

---

### Task 10: SEO wiring — sitemap + nav link

**Files:**
- Modify: `apps/web/app/sitemap.ts` (staticPages array)
- Modify: `apps/web/components/marketing/MarketingNav.tsx` (add nav/menu link)

- [ ] **Step 1: Add the sitemap entry**

In `apps/web/app/sitemap.ts`, inside `staticPages` after the `/mockups` line, add:

```ts
    { url: `${SITE_URL}/app-store-screenshots`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
```

- [ ] **Step 2: Add a nav link**

Open `apps/web/components/marketing/MarketingNav.tsx`, find where existing product links (e.g. `/mockups`, `/templates`, `/pricing`) are declared, and add a link in the same shape/style with label `App Store Screenshots` and href `/app-store-screenshots`. Match the file's existing link structure exactly (array entry or JSX sibling — whichever the file uses).

- [ ] **Step 3: Verify + commit**

Run: `npm run typecheck`
Expected: clean.

```bash
git add apps/web/app/sitemap.ts apps/web/components/marketing/MarketingNav.tsx
git commit -m "seo(pack): sitemap entry + nav link for the pack studio"
```

---

### Task 11: Full verification

**Files:** none new.

- [ ] **Step 1: Unit tests + typecheck + frames gate**

Run: `npm run test -w web && npm run typecheck && npm run validate:frames`
Expected: all pass.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: build succeeds; `/app-store-screenshots` appears in the route list.

- [ ] **Step 3: End-to-end pass with the project verify skill**

Use the project's `verify` skill (build/launch/drive recipe) to drive the studio headless:
1. Open `/app-store-screenshots`.
2. Drop two portrait PNG fixtures (generate 1320×2868 PNGs into the scratchpad with an ImageMagick/Python one-liner).
3. Set app name "Focusly", captions on both screens, style "Bold Gradient".
4. Trigger Export. In a dev environment without Firebase the gate returns the 501-fallback `{allowed:true, clean:false}` — the zip should download.
5. Unzip and assert: expected file list (App Store 6.9/6.5 + Play phone + feature graphic + README.txt) and exact PNG pixel dimensions per folder (`python3 -c "from PIL import Image; ..."` or `sips -g pixelWidth -g pixelHeight`).

Expected: zip contents and dimensions match the target table exactly; watermark visible (dev fallback is watermarked).

- [ ] **Step 4: Reload persistence check**

In the same driven session: reload the page.
Expected: pack (screens, captions, style) restores from IndexedDB.

- [ ] **Step 5: Commit any fixes, then final commit**

```bash
git add -A
git commit -m "feat(pack): App Store screenshot pack studio — e2e verified"
```

---

## Self-review checklist (ran while writing)

- **Spec coverage:** data model → T2; compiler + panorama + feature graphic → T4; styles → T3; studio UI (strip/preview/inspector/top bar) → T9; export + zip layout + README + skip-and-report → T8/T4; gating (first free, transactional, fail-closed) → T5; persistence (drafts API kind=pack + IndexedDB + guest) → T6/T7; aspect-mismatch warning + max-10 cap + export-blocked-on-empty → T7 ops + T9; SEO landing/metadata/sitemap → T9/T10; testing → every task + T11. iPad target included as default-off (frame exists — spec note superseded, flagged in Global Constraints).
- **Type consistency:** `PackExportVerdict` produced in T5, consumed in T8/T9; `CompiledEntry.path` = zip name in T8; `renderSceneToPng(scene, scale, watermark, panoramaIdx?, panoramaTotal?)` matches `bulkExport.tsx`'s existing private signature; `addScreens/removeScreen/moveScreen/setCaption` names identical in T7 ops, store, and T9 inspector.
- **No placeholders:** every code step ships complete code; the two "adapt to the file" steps (DraftsPanel filter, MarketingNav link) state the exact required end-state.
