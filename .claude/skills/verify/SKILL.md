---
name: verify
description: Build/launch/drive recipe for verifying FrameKit editor changes end-to-end in a headless browser.
---

# Verifying FrameKit

## Launch
- `cd framekit && npm run dev` — Next dev (turbopack). Port 3000 is often taken; it falls back to 3001. Editor at `/editor`.
- Production check: `npm run build` (webpack — turbopack build fails in this monorepo), `npm run typecheck`.
- After touching `packages/devices/scripts/generate-frames.mjs`: `npm run gen:devices && npm run validate:frames`.

## Drive headlessly
No Playwright in the repo. Install `playwright-core` in the scratchpad and launch the cached headless shell:

```js
import { chromium } from "playwright-core";
const EXE = "~/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell";
const browser = await chromium.launch({ executablePath: EXE, headless: true });
```

Downloads (exports) work via `page.waitForEvent("download")`. `Meta+s` etc. reach the app's key handlers.

## Selectors that work
- Toolbar icon buttons have `title` attrs: `[title="Drafts (⌘S saves)"]`, `[title="Layers"]`, `[title="Export settings"]`.
- Left panel tabs: `button:has-text("Mockup")` / `button:has-text("Frame")`.
- Device picker trigger: `button:has-text("<current device name>")`; category pills by text ("Tablet").
- Background swatches: `[title="<swatch id>"]` (e.g. `rf-iris`); categories by label text ("Refract").
- Canvas size popover: trigger shows active preset label; presets inside have `title="W × H"`.
- Toast pill appears bottom-center (`framekit:toast` custom event).

## Gotchas
- Popovers close on outside `mousedown` — click empty canvas (`page.mouse.click(800, 500)`) to dismiss.
- Wait ~1.5s after `goto` for fonts/hydration before screenshots.
- Drafts persist in IndexedDB (`framekit` db, `drafts` store) — reload keeps them; a fresh browser context starts empty.
