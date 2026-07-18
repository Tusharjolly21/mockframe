# Launch Kit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Checkbox steps.

**Goal:** One pack → promo scenes (Product Hunt, OG, X/LinkedIn, Instagram story) in the export zip under `Launch Kit/`, toggled + captioned in the studio.

**Spec:** `docs/superpowers/specs/2026-07-18-launch-kit-design.md`

## Global Constraints

- Branch `feat/launch-kit` (off main). `packages/*` untouched. Concurrent session shares checkout: file-scoped `git add`, non-default ports, no broad pkill. Trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- **Back-compat is binding:** `pack.launch` is `.optional()`. Every already-persisted pack (no `launch`) must still `PackDocumentSchema.parse` and render/export exactly as before. Existing pack/compile tests must pass UNMODIFIED. `compilePack` on a pack without `launch` (or all surfaces off) must emit ZERO launch entries — byte-identical store-screenshot output to today.
- Launch scenes render at each surface's exact canvas dims (1270×760, 1200×630, 1600×900, 1080×1920) and must `SceneDocumentSchema.parse`.
- Gates per task: `cd apps/web && npx vitest run lib/ai lib/screens lib/pack` (all green, incl. existing) + scoped typecheck `npx tsc -p . --noEmit 2>&1 | grep -vE "lib/promo|remotion/promo"` (report raw exit).

---

### Task 1: schema — surfaces, launch field, accessor

**Files:** Modify `apps/web/lib/pack/schema.ts`; Test `apps/web/lib/pack/__tests__/launchSchema.test.ts`

**Produces:**
- `PACK_LAUNCH_SURFACE_IDS = ["product-hunt","og-image","x-post","story"] as const`; `type LaunchSurfaceId`
- `interface LaunchSurface { id: LaunchSurfaceId; label: string; width: number; height: number; orientation: "landscape"|"portrait"; deviceId: string; file: string }`
- `PACK_LAUNCH_SURFACES: Record<LaunchSurfaceId, LaunchSurface>` — per the spec table; `deviceId` = `PACK_TARGETS["play-feature"].deviceId` for all four; `file` per the spec's folder-file column
- `PackDocumentSchema` gains `launch: z.object({ tagline: z.string().max(120), surfaces: z.object({ "product-hunt": z.boolean(), "og-image": z.boolean(), "x-post": z.boolean(), "story": z.boolean() }) }).optional()`
- `DEFAULT_LAUNCH` const (tagline "", all surfaces false); `createPack()` sets `launch: structuredClone-safe copy of DEFAULT_LAUNCH` (build a fresh object, don't share the reference)
- `packLaunch(pack: PackDocument): NonNullable<PackDocument["launch"]>` returns `pack.launch ?? {fresh default}`

- [ ] **Step 1 (RED):** `launchSchema.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { createPack, packLaunch, PackDocumentSchema, PACK_LAUNCH_SURFACES, PACK_LAUNCH_SURFACE_IDS } from "../schema";

describe("launch surfaces", () => {
  it("defines all four surfaces with exact dims", () => {
    expect(PACK_LAUNCH_SURFACES["product-hunt"]).toMatchObject({ width: 1270, height: 760, orientation: "landscape" });
    expect(PACK_LAUNCH_SURFACES["og-image"]).toMatchObject({ width: 1200, height: 630 });
    expect(PACK_LAUNCH_SURFACES["x-post"]).toMatchObject({ width: 1600, height: 900 });
    expect(PACK_LAUNCH_SURFACES["story"]).toMatchObject({ width: 1080, height: 1920, orientation: "portrait" });
    expect([...PACK_LAUNCH_SURFACE_IDS].sort()).toEqual(["og-image","product-hunt","story","x-post"]);
  });
  it("every surface file path lives under Launch Kit/", () => {
    for (const id of PACK_LAUNCH_SURFACE_IDS) expect(PACK_LAUNCH_SURFACES[id].file.startsWith("Launch Kit/")).toBe(true);
  });
});

describe("launch pack field", () => {
  it("createPack has launch with all surfaces off and empty tagline", () => {
    const p = createPack();
    expect(p.launch).toEqual({ tagline: "", surfaces: { "product-hunt": false, "og-image": false, "x-post": false, "story": false } });
    expect(PackDocumentSchema.safeParse(p).success).toBe(true);
  });
  it("a legacy pack WITHOUT launch still parses (back-compat)", () => {
    const p = createPack();
    delete (p as { launch?: unknown }).launch;
    expect(PackDocumentSchema.safeParse(p).success).toBe(true);
  });
  it("packLaunch returns defaults for a launch-less pack and the value otherwise", () => {
    const legacy = createPack(); delete (legacy as { launch?: unknown }).launch;
    expect(packLaunch(legacy).surfaces["x-post"]).toBe(false);
    const p = createPack(); p.launch!.tagline = "Ship faster";
    expect(packLaunch(p).tagline).toBe("Ship faster");
  });
  it("rejects tagline over 120 chars", () => {
    const p = createPack(); p.launch!.tagline = "x".repeat(121);
    expect(PackDocumentSchema.safeParse(p).success).toBe(false);
  });
});
```
Run `npx vitest run lib/pack` → FAIL.
- [ ] **Step 2 (GREEN):** implement. Verify `createPack`'s launch object is freshly built each call (no shared mutable ref — a test mutating one pack's tagline must not affect another).
- [ ] **Step 3:** full scoped suite + typecheck. Commit: `feat(pack): launch-kit surfaces + optional pack.launch field`.

---

### Task 2: compiler — compileLaunchScene, compilePack, readme

**Files:** Modify `apps/web/lib/pack/compile.ts`; Test `apps/web/lib/pack/__tests__/launchCompile.test.ts`

**Produces:** `compileLaunchScene(pack: PackDocument, surfaceId: LaunchSurfaceId): SceneDocument` (exported); `compilePack` appends launch entries; `packReadme` gains a Launch Kit section.

Implementation notes:
- Mirror `compileFeatureGraphic` structure (read it). Landscape surfaces: headline+subhead as left-anchored text layers (`x ≈ -0.24*W`), device mockup right (`x ≈ 0.26*W`, rotate -8, scale ~`(H*1.6)/frameHeight` tuned so it fits — clamp for the taller 1080×1920 story). Portrait (story): headline centered near top (`y ≈ -0.32*H`), tagline just below, device centered lower (`y ≈ 0.18*H`, larger scale ~`(H*0.62)/frameHeight`).
- Headline font size scales with canvas (`~min(W,H)*0.06` landscape, `~W*0.07` portrait); tagline `~0.55×` headline; skip the tagline layer when `packLaunch(pack).tagline.trim()` is empty.
- Use `packBackground(pack, PACK_STYLES[pack.styleId])`, `style.captionColor` / `style.subtitleColor`, `pack.style.fontFamily`, `getDevice(surface.deviceId)`, hero = `pack.screens[0]` (its assetId may be null → device with null media, same as feature graphic).
- `compilePack`: after the `play-feature` block, add:
```ts
const launch = pack.launch;
if (launch) {
  for (const id of PACK_LAUNCH_SURFACE_IDS) {
    if (!launch.surfaces[id]) continue;
    entries.push({ path: PACK_LAUNCH_SURFACES[id].file, scene: compileLaunchScene(pack, id) });
  }
}
```
- `packReadme`: if any launch surface enabled, append a section:
```
LAUNCH KIT
----------------
Launch Kit/product-hunt-1270x760.png  → Product Hunt gallery image.
Launch Kit/social-og-1200x630.png  → og:image / Twitter card meta tag.
Launch Kit/x-linkedin-1600x900.png  → X / LinkedIn launch post.
Launch Kit/instagram-story-1080x1920.png  → Instagram / TikTok story.
```
(only the enabled ones)

- [ ] **Step 1 (RED):** `launchCompile.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { SceneDocumentSchema } from "@framekit/scene";
import { compileLaunchScene, compilePack, packReadme } from "../compile";
import { createPack, PACK_LAUNCH_SURFACES, PACK_LAUNCH_SURFACE_IDS } from "../schema";

function packWith(surfaces: Partial<Record<string, boolean>>, tagline = "Plan your day, effortlessly") {
  const p = createPack();
  p.appName = "Focusly";
  p.screens[0].assetId = "screen:demo";
  p.launch = { tagline, surfaces: { "product-hunt": false, "og-image": false, "x-post": false, "story": false, ...surfaces } as any };
  return p;
}

describe("compileLaunchScene", () => {
  it("every surface → schema-valid scene at exact dims", () => {
    const p = packWith({});
    for (const id of PACK_LAUNCH_SURFACE_IDS) {
      const scene = compileLaunchScene(p, id);
      expect(SceneDocumentSchema.safeParse(scene).success, id).toBe(true);
      expect(scene.canvas.width, id).toBe(PACK_LAUNCH_SURFACES[id].width);
      expect(scene.canvas.height, id).toBe(PACK_LAUNCH_SURFACES[id].height);
    }
  });
  it("omits the tagline layer when tagline is blank but keeps the headline", () => {
    const p = packWith({}, "");
    const scene = compileLaunchScene(p, "og-image");
    const texts = scene.layers.filter((l) => l.type === "text");
    expect(texts.some((t: any) => t.content === "Focusly")).toBe(true);
    expect(texts.length).toBe(1);
  });
  it("renders without a hero asset (null media)", () => {
    const p = packWith({}); p.screens[0].assetId = null;
    expect(SceneDocumentSchema.safeParse(compileLaunchScene(p, "story")).success).toBe(true);
  });
});

describe("compilePack launch entries", () => {
  it("appends exactly the enabled surfaces under Launch Kit/", () => {
    const p = packWith({ "product-hunt": true, "story": true });
    p.targets = { "appstore-69": false, "appstore-65": false, "appstore-ipad13": false, "play-phone": false, "play-feature": false };
    const paths = compilePack(p).map((e) => e.path);
    expect(paths).toEqual(["Launch Kit/product-hunt-1270x760.png", "Launch Kit/instagram-story-1080x1920.png"]);
  });
  it("emits NO launch entries when launch is absent (back-compat)", () => {
    const p = createPack(); delete (p as any).launch;
    p.appName = "X"; p.screens[0].assetId = "screen:x";
    const paths = compilePack(p).map((e) => e.path);
    expect(paths.every((x) => !x.startsWith("Launch Kit/"))).toBe(true);
  });
  it("emits no launch entries when all surfaces off", () => {
    const p = packWith({});
    expect(compilePack(p).every((e) => !e.path.startsWith("Launch Kit/"))).toBe(true);
  });
});

describe("packReadme", () => {
  it("lists enabled launch surfaces", () => {
    const p = packWith({ "x-post": true });
    const txt = packReadme(p);
    expect(txt).toContain("LAUNCH KIT");
    expect(txt).toContain("x-linkedin-1600x900.png");
    expect(txt).not.toContain("product-hunt-1270x760.png");
  });
});
```
Run `npx vitest run lib/pack` → FAIL.
- [ ] **Step 2 (GREEN):** implement. Ordering matters in the compilePack test — the launch loop runs in PACK_LAUNCH_SURFACE_IDS order (`product-hunt` before `story`), matching the expected array.
- [ ] **Step 3:** full scoped suite + typecheck. Commit: `feat(pack): compileLaunchScene + launch entries in the export zip`.

---

### Task 3: studio UI — inspector section, preview tabs

**Files:** Modify `apps/web/components/pack/PackInspector.tsx`, `apps/web/components/pack/PackPreview.tsx`, `apps/web/lib/pack/store.ts`

- **store.ts:** widen `activeTarget` type from `PackTargetId` to `string` (it's only used for the preview tab selection). No other change.
- **PackInspector.tsx:** add a `<Section title="Launch Kit">` after "Export sizes": a text input bound to `packLaunch(pack).tagline` (onChange → `update((p) => ({ ...p, launch: { ...packLaunch(p), tagline: e.target.value.slice(0,120) } }))`) placeholder "One-line pitch for your launch graphics"; then the 4 surface checkboxes (`PACK_LAUNCH_SURFACE_IDS.map`), each `checked={packLaunch(pack).surfaces[id]}` onChange → `update((p) => ({ ...p, launch: { ...packLaunch(p), surfaces: { ...packLaunch(p).surfaces, [id]: e.target.checked } } }))`, label = `PACK_LAUNCH_SURFACES[id].label` + dims. Import `packLaunch, PACK_LAUNCH_SURFACES, PACK_LAUNCH_SURFACE_IDS`.
- **PackPreview.tsx:** import `compileLaunchScene`, `PACK_LAUNCH_SURFACES`, `PACK_LAUNCH_SURFACE_IDS`, `packLaunch`. After the store-target tab buttons, render a launch-tab button for each enabled surface with id `` `launch:${id}` `` (label = surface label). In the scene `useMemo`: if `activeTarget.startsWith("launch:")` → `compileLaunchScene(pack, activeTarget.slice(7) as LaunchSurfaceId)`; else the existing feature-graphic/pack-scene branch. Extend the fallback effect: if `activeTarget` is a `launch:` id whose surface is no longer enabled, fall back to the first enabled store target (existing logic) — guard so a launch tab selection doesn't get force-reset while it's still enabled. Keep the panorama props only for store scenes.
- Verify headless (non-default port): enable a surface + type a tagline → its tab appears and the preview renders at the right aspect; disabling it removes the tab and the preview falls back; a legacy pack (no launch, from an older draft) opens without crashing and the Launch Kit section shows all-off. Scoped typecheck.
Commit (three files): `feat(pack): Launch Kit studio controls + preview`.

---

### Task 4: verification + merge readiness

- Full scoped suites + typecheck + `npm run build`.
- E2E (`verify` skill): open `/app-store-screenshots`, add a screenshot, enable Product Hunt + Story, type a tagline, confirm both preview tabs render at correct aspect ratios; trigger export (dev 501-fallback or signed-in) and assert the zip contains `Launch Kit/product-hunt-1270x760.png` + `Launch Kit/instagram-story-1080x1920.png` at exact pixel dims. Also open a pre-Phase-3 pack draft (simulate by removing `launch` from a saved pack) → no crash.
- Fix real bugs only; report.
