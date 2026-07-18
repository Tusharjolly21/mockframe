# Launch Kit — Design

**Date:** 2026-07-18 · **Status:** Approved · **Phase 3 of the 5-phase AI expansion**

## Problem

"Promote it" means more than App Store shots. An indie owner needs a Product
Hunt gallery image, an OG/social-share image, an X/LinkedIn announcement
graphic, and an Instagram story — all on-brand. We already have the pack
(app name, style, palette, hero screenshot) and a one-scene compiler
(`compileFeatureGraphic`). Generalize it into a Launch Kit: one pack →
promo scenes at every launch surface, in the same export zip.

## Design

Launch Kit is a **pack-studio feature**, not an AI-route change — it benefits
manual AND AI-generated packs. (Phase 4 will have the AI pre-fill the
tagline; here the user types it.)

### 1. Surfaces (`lib/pack/schema.ts`)

`PACK_LAUNCH_SURFACES: Record<LaunchSurfaceId, LaunchSurface>` — 4 fixed
promo canvases (dims reuse the app's existing CANVAS_PRESETS):

| id | label | canvas | orient | folder file |
|---|---|---|---|---|
| `product-hunt` | Product Hunt | 1270×760 | landscape | `Launch Kit/product-hunt-1270x760.png` |
| `og-image` | Social / OG | 1200×630 | landscape | `Launch Kit/social-og-1200x630.png` |
| `x-post` | X / LinkedIn | 1600×900 | landscape | `Launch Kit/x-linkedin-1600x900.png` |
| `story` | Instagram Story | 1080×1920 | portrait | `Launch Kit/instagram-story-1080x1920.png` |

Each surface: `{ id, label, width, height, orientation: "landscape"|"portrait", deviceId, file }`. `deviceId` = a phone frame (reuse `PACK_TARGETS["play-feature"].deviceId`).

### 2. Pack data (back-compat critical)

Add to `PackDocumentSchema`:
```
launch: z.object({
  tagline: z.string().max(120),
  surfaces: z.object({ "product-hunt": bool, "og-image": bool, "x-post": bool, "story": bool }),
}).optional()
```
`.optional()` so already-persisted packs (no `launch`) still parse. `createPack()` sets a default `launch` (tagline "", all surfaces off). Accessor `packLaunch(pack)` returns `pack.launch ?? DEFAULT_LAUNCH` for consumers.

### 3. Compiler (`lib/pack/compile.ts`)

`compileLaunchScene(pack, surfaceId): SceneDocument` — pure, mirrors
`compileFeatureGraphic`:
- Background: style bg/accent (`packBackground`).
- Headline = `appName` (bold, large), subhead = `launch.tagline` (medium, muted) — omitted if empty.
- Hero device = `screens[0]` in the surface's device frame, angled.
- **Landscape** (PH/OG/X): text block left (~42% width), device right, rotated ~-8° (feature-graphic layout, scaled per canvas). **Portrait** (story): headline+tagline top third, device centered below, larger.
- Exact canvas dims from the surface; `SceneDocumentSchema.parse` at the end (guarantees validity).

Extend `compilePack`: after the feature graphic, for each enabled launch
surface append `{ path: surface.file, scene: compileLaunchScene(pack, id) }`.
Absent/all-off `launch` → no launch entries (existing behavior unchanged).

Extend `packReadme`: a "LAUNCH KIT" section listing each included surface +
where it's used (PH gallery, og:image meta tag, tweet/post, IG story).

### 4. Studio UI (`components/pack/*`)

- **PackInspector**: new "Launch Kit" `Section` — a tagline text input
  (bound to `launch.tagline` via `update`) + 4 surface checkboxes (bound to
  `launch.surfaces[id]`), each showing its dimensions. All `update()`-based,
  consistent with existing sections. Uses `packLaunch(pack)` so a legacy
  pack lacking `launch` gets defaults on first edit (the update writes a
  full `launch` object).
- **PackPreview**: launch surfaces appear as extra tabs (a "Launch Kit"
  group) after the store tabs, only when enabled. `activeTarget` widens
  from `PackTargetId` to `string`; when it starts with `launch:` the preview
  compiles `compileLaunchScene(pack, id)`. Fit-scaling already handles
  arbitrary canvas dims.
- Export already funnels through `compilePack` → zip, so enabled surfaces
  ship under `Launch Kit/` automatically; the export gate (first-free /
  Pro) is unchanged.

### 5. Testing

- Schema: default pack has `launch` with all surfaces off; a pack WITHOUT
  `launch` (legacy) parses; `packLaunch` returns defaults for it.
- Compiler: every surface → schema-valid scene at exact dims, with/without
  tagline, with/without hero asset; `compilePack` includes exactly the
  enabled launch surfaces with correct paths, and none when launch absent;
  readme lists them.
- Studio: inspector toggles/preview tabs verified in the phase-4 E2E; unit
  focus is the pure compiler + schema.

## Out of scope
AI-generated tagline/marketing copy (Phase 4); per-surface layout
customization; video (promo maker is a separate track); logo upload.
