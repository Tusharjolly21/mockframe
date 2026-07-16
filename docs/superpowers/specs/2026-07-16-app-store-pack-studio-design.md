# App Store Screenshot Pack Studio — Design

**Date:** 2026-07-16
**Status:** Approved
**Route:** `/app-store-screenshots`

## Problem

Every app release requires submission-ready screenshot sets: Apple App Store
6.9″ and 6.5″ portrait PNGs, Google Play phone screenshots, and a Play feature
graphic. Producing these by hand (or one-at-a-time in a generic mockup editor)
is slow and recurring. Paid competitors (AppMockUp, Previewed) prove
willingness to pay; Shots.so/Pika-class tools don't own this lane. MockFrame's
scene-document architecture (one renderer, exact-pixel canvases, device
registry, offscreen bulk export) is built for exactly this job.

## Decisions (from brainstorming)

- **Lane:** App Store screenshot packs (over video export, chat generators, API).
- **Shape:** dedicated pack studio, not an editor retrofit.
- **v1 coverage:** iPhone (App Store 6.9″ + 6.5″) + Android phone (Play Store
  phone + feature graphic). iPad is a fast-follow once an iPad frame exists.
- **Monetization:** first pack export free and unwatermarked for signed-in
  users; subsequent exports require Pro. Guests must sign in to export.
- **Localization:** deferred to v2, but captions are stored as per-locale maps
  from day one so v2 needs no migration.
- **Architecture:** `PackDocument` → pure compiler → existing `SceneRenderer`
  + existing `bulkExport` zip pipeline. No new rendering or export code paths.

## Architecture

```
PackDocument (new)            compilePackScene()            existing pipeline
  appName, styleId,     ──►     pure fn: screen × target ──►  SceneRenderer
  style overrides,               → SceneDocument               bulkExport → zip
  screens[], targets            compileFeatureGraphic()
```

Boundary rule preserved: `packages/*` stay untouched; everything new lives in
`apps/web/lib/pack/` (logic) and `apps/web/app/app-store-screenshots/` +
`apps/web/components/pack/` (UI).

### 1. Data model — `apps/web/lib/pack/schema.ts`

Zod schema, versioned like scene docs:

```ts
PackDocument {
  id: string
  version: 1
  kind: "pack"                       // drafts API discriminator
  appName: string
  styleId: PackStyleId
  style: {
    background?: BackgroundOverride  // style default unless overridden
    accent: string                   // hex
    fontFamily: string
    captionPosition: "top" | "bottom"
    deviceIos: "iphone-16-pro"       // App Store renders
    deviceAndroid: "pixel-9-pro"     // Play Store renders
  }
  screens: PackScreen[]              // 1..10
  targets: {
    appstore: { s69: boolean, s65: boolean }
    playstore: { phone: boolean, featureGraphic: boolean }
  }
}

PackScreen {
  id: string
  assetId: string | null             // screenshot asset (existing assets lib)
  captions: { [locale: string]: { title: string, subtitle?: string } }
                                     // v1 uses only "en"; v2 localization
                                     // slots in without migration
  overrides: { hideDevice?: boolean, flipTilt?: boolean }
}
```

Target size table (constant):

| Target | Canvas | Device frame |
|---|---|---|
| App Store 6.9″ | 1320 × 2868 | iPhone 16 Pro |
| App Store 6.5″ | 1284 × 2778 | iPhone 16 Pro |
| Play Store phone | 1080 × 1920 | Pixel 9 Pro |
| Play feature graphic | 1024 × 500 | Pixel 9 Pro (hero screen) |

Persistence: existing `GET/POST /api/drafts` with `kind: "pack"`; IndexedDB
fallback for guests, matching editor behavior.

### 2. Compiler — `apps/web/lib/pack/compile.ts`

- `compilePackScene(pack, screenIndex, target): SceneDocument` — pure. Maps a
  screen × target to a schema-valid scene using `@framekit/scene` factories:
  exact canvas dims, style-defined background, device mockup layer with the
  screenshot asset, caption/subcaption text layers, style-defined transform
  (per-screen variation, e.g. alternating tilt).
- Panorama styles set `panoramaIdx`/`panoramaTotal` (already supported by
  `SceneRenderer` and `bulkExport`) so one background flows across screens.
- `compileFeatureGraphic(pack): SceneDocument` — 1024×500 banner: app name,
  accent background, hero (first) screen in device frame.
- `compilePack(pack): CompiledEntry[]` — every screen × enabled target plus
  feature graphic, each entry carrying its zip path.

### 3. Style templates — `apps/web/lib/pack/styles.ts`

Data-only definitions (no per-style code). Each style declares: background,
caption typography/placement, device transform pattern (may vary by screen
index), and panorama flag. Launch set of 8:

1. **Minimal Light** — white/soft gray, black captions, straight device
2. **Bold Gradient** — vivid accent gradient, large white captions
3. **Panorama Flow** — one mesh background spanning all screens
4. **Tilted Rhythm** — alternating ±8° device tilt screen to screen
5. **Dark Pro** — near-black, accent glow, light captions
6. **Glass** — frosted panels behind captions
7. **Accent Split** — solid accent block holding the caption, device below
8. **Screenshot-First** — oversized device bleeding off-canvas, small caption

Every style must produce valid output for all four targets (the wide feature
graphic uses a horizontal arrangement variant).

### 4. Studio UI — `apps/web/app/app-store-screenshots/`

Three-pane layout (components under `apps/web/components/pack/`):

- **Left — screen strip:** thumbnails of screens 1–10; multi-file drop/paste
  creates screens in order; drag to reorder; add/remove.
- **Center — live preview:** active screen rendered by `SceneRenderer` at fit
  scale; store-size switcher tabs (6.9″ / 6.5″ / Play / feature graphic).
- **Right — inspector:** style gallery (live mini-previews), caption fields
  for the active screen, shared style controls (background, accent, font,
  caption position), per-screen toggles.
- **Top bar:** app name input, target checkboxes, Export Pack button, saved
  state indicator.

State: dedicated zustand store (`apps/web/lib/pack/store.ts`) with autosave to
drafts, mirroring editor conventions. Guest mode fully functional up to export.

The page doubles as the SEO landing for "app store screenshot generator":
metadata, structured data, and a short marketing section below the studio,
added to the sitemap.

### 5. Export & gating — `apps/web/lib/pack/export.ts`

- Compile all entries → render offscreen via the existing `bulkExport`
  machinery → single zip:

```
<AppName>-screenshots.zip
├── App Store/6.9-inch-1320x2868/01.png … NN.png
├── App Store/6.5-inch-1284x2778/…
├── Play Store/phone-1080x1920/…
├── Play Store/feature-graphic-1024x500.png
└── README.txt        // which folder uploads to which store slot
```

- **Gating:** server-side `packExportCount` on the user's store doc
  (existing `/api/store` route family), incremented atomically on export
  authorization. Count 0 → free, unwatermarked export. Count ≥ 1 and not Pro →
  upgrade modal. Pro → unlimited. Guests → sign-in prompt at export (the free
  pack is the signup incentive). The count check + increment happens in a
  server route so it can't be bypassed client-side.
- Progress UI during batch render (N of M), per-file failures skip and are
  reported in a toast + README note rather than aborting the zip.

### 6. Error handling

- **Aspect mismatch:** warn on drop when a screenshot's ratio differs from
  the device screen ratio beyond tolerance; image is cover-fitted, never
  silently distorted. Portrait-only guard for phone targets.
- **Missing screenshots:** screens without an asset render the style's
  placeholder; export blocks until every screen has an asset (or the user
  removes the empty screen).
- **Canvas limits:** all targets are ≤ 3.8 MP, far under the existing 33 MP
  guard; no new limit logic needed.
- **Asset upload failures:** existing assets-lib retry/error surface reused.

### 7. Testing

- **Unit (vitest):** compiler — every style × every target yields a
  schema-valid `SceneDocument` with exact canvas dims; caption mapping;
  panorama index wiring; zip path naming; gating decision function
  (count/plan matrix).
- **Schema:** PackDocument validation + round-trip through drafts payloads.
- **E2E (project `verify` skill):** build → open studio headless → drop
  fixtures → switch styles/targets → export → assert zip contents and PNG
  dimensions.

## Out of scope (v1)

- iPad 13″ target (needs new frame; fast-follow)
- Caption localization UI + per-locale zips (v2; data model already ready)
- Server-side rendering / public pack API (needs render worker)
- Landscape screenshots, watch targets
