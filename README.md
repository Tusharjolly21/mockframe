# FrameKit

Screenshot mockup studio (Shots.so class) built to the architecture in
[`../framekit-architecture.md`](../framekit-architecture.md). Everything is a
**Scene Document** (versioned JSON, `@framekit/scene`) rendered by **one
renderer** (`@framekit/renderer`) that will run identically in the browser
editor and the headless export worker.

## Run

```bash
npm install
npm run dev            # editor at http://localhost:3000/editor
```

Other scripts:

```bash
npm run gen:devices    # regenerate SVG frames + compile the registry
npm run validate:frames  # CI gate: schema + geometry + SVG reference checks
npm run build          # production build (webpack; turbopack build has a monorepo bug)
```

## Status vs the build order (§13)

| Phase | Status |
|---|---|
| Week 1–2 · renderer, scene schema, 5+ devices, validation | ✅ done |
| Week 3–4 · editor (canvas, drag/tilt, inspector, undo, client export, guest mode) | ✅ core done |
| Week 5 · persistence (Firebase Auth/Firestore/Storage) | ✅ cloud drafts + assets |
| Week 6 · render worker + export packs | ⬜ |
| Week 7 · billing + pSEO | ⬜ |
| Week 8+ · public API, URL capture, templates | ⬜ |

### Shipped so far

- **`packages/scene`** — Zod schema v3 (backgrounds incl. seeded mesh, mockup/text/sticker
  layers, lighting-model shadows, effects, animation-ready `timeline`), factories,
  migrate-on-read mechanism.
- **`packages/devices`** — registry with 6 devices × 2 variants (iPhone 16 Pro,
  Pixel 9 Pro, Galaxy S25 Ultra, MacBook Pro 14″, Chrome, Safari), generated from
  `scripts/generate-frames.mjs` (parametric SVG), compiled by `scripts/build-registry.mjs`,
  gated by `tooling/frame-validate`. Includes `suggestDevice(w, h)` — exact-resolution
  device detection on drop.
- **`packages/renderer`** — the §5.2 sandwich (frame SVG → clipped screenshot → overlay),
  CSS 3D tilt, derived-offset shadows, text layers, mesh/linear/radial/solid/image/transparent
  backgrounds, `collectAssets()`.
- **`apps/web` editor** — guest mode, zoom/pan stage, device browser with live SVG
  previews, drag/scale/rotate handles with center snapping, contextual inspector
  (device/variant/media/transform/shadow/text/canvas/background), zundo undo/redo
  (drags = one step), drop + paste + picker uploads, client-side PNG/JPG/WebP export
  at 1–3× with web-font inlining.

### Feature queue (parity items, all renderer/editor work)

Borders · effects stack (noise/grain/vhs/glitch/vignette UI) · sticker registry ·
layout presets (slot-based) · auto-palette from screenshot · frameless style family
(liquid-glass/inset) · scene decorations · canvas-level light angle · watch/tablet
devices · more phones.

## Firebase backend

The first backend slice uses Firebase Admin in Next route handlers:

- `GET/PUT /api/store/[key]` stores small JSON values such as saved themes in Firestore.
- `GET/POST /api/drafts` and `GET/PATCH/DELETE /api/drafts/[id]` store scene documents in Firestore.
- `GET/POST /api/assets` and `GET/DELETE /api/assets/[id]` upload image assets to Firebase Storage and return signed read URLs.

Routes accept `Authorization: Bearer <Firebase ID token>` when Firebase Auth is wired on the client. Without a token, they issue an `mf_guest_id` cookie so guest-mode data is still isolated.

The editor uses Firebase Auth anonymously when the `NEXT_PUBLIC_FIREBASE_*` web-app values are present. Drafts and referenced image assets sync to Firestore/Storage, while IndexedDB remains an offline fallback. Enable **Authentication -> Sign-in method -> Anonymous** in Firebase and paste the web-app config into `.env.local`.

Required server env:

```bash
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=

NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

On Google-hosted infrastructure you can use Application Default Credentials instead of service-account key envs; set `FIREBASE_USE_ADC=1` plus `FIREBASE_PROJECT_ID` and `FIREBASE_STORAGE_BUCKET`.

## Monorepo

```
apps/web           Next.js 15 — editor (marketing + pSEO later)
packages/scene     Zod schemas, types, migrations
packages/devices   device registry (JSON + SVG) + codegen
packages/renderer  isomorphic React scene renderer
tooling/frame-validate  registry CI gate
```

Boundary rule: `renderer` depends only on `scene` + `devices` + React. No fetches,
no app imports — assets arrive as URLs resolved by the host.
