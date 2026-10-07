# Routes

Next.js 15 App Router (file-based) in `apps/web/app`. Root layout: `apps/web/app/layout.tsx` (fonts + body only). Marketing pages render `MarketingNav` + `MarketingFooter` themselves; the editor routes render `EditorShell` full-screen.

| URL | File | Kind |
|---|---|---|
| `/ai` | `apps/web/app/ai/page.tsx` | page |
| `/api/ai-import` | `apps/web/app/api/ai-import/route.ts` | route |
| `/api/ai-pack` | `apps/web/app/api/ai-pack/route.ts` | route |
| `/api/assets/[id]` | `apps/web/app/api/assets/[id]/route.ts` | route |
| `/api/assets` | `apps/web/app/api/assets/route.ts` | route |
| `/api/billing/checkout` | `apps/web/app/api/billing/checkout/route.ts` | route |
| `/api/billing/plans` | `apps/web/app/api/billing/plans/route.ts` | route |
| `/api/billing/status` | `apps/web/app/api/billing/status/route.ts` | route |
| `/api/billing/verify` | `apps/web/app/api/billing/verify/route.ts` | route |
| `/api/billing/webhook` | `apps/web/app/api/billing/webhook/route.ts` | route |
| `/api/capture` | `apps/web/app/api/capture/route.ts` | route |
| `/api/custom-devices/[id]` | `apps/web/app/api/custom-devices/[id]/route.ts` | route |
| `/api/custom-devices` | `apps/web/app/api/custom-devices/route.ts` | route |
| `/api/drafts/[id]` | `apps/web/app/api/drafts/[id]/route.ts` | route |
| `/api/drafts` | `apps/web/app/api/drafts/route.ts` | route |
| `/api/feedback` | `apps/web/app/api/feedback/route.ts` | route |
| `/api/launch-kit/consume` | `apps/web/app/api/launch-kit/consume/route.ts` | route |
| `/api/launch-kit/copy` | `apps/web/app/api/launch-kit/copy/route.ts` | route |
| `/api/mockuuups/account` | `apps/web/app/api/mockuuups/account/route.ts` | route |
| `/api/mockuuups/devices` | `apps/web/app/api/mockuuups/devices/route.ts` | route |
| `/api/mockuuups/mockups` | `apps/web/app/api/mockuuups/mockups/route.ts` | route |
| `/api/mockuuups/render` | `apps/web/app/api/mockuuups/render/route.ts` | route |
| `/api/pack-export` | `apps/web/app/api/pack-export/route.ts` | route |
| `/api/post` | `apps/web/app/api/post/route.ts` | route |
| `/api/press/[slug]` | `apps/web/app/api/press/[slug]/route.ts` | route |
| `/api/press` | `apps/web/app/api/press/route.ts` | route |
| `/api/proxy-image` | `apps/web/app/api/proxy-image/route.ts` | route |
| `/api/scene-share/[id]` | `apps/web/app/api/scene-share/[id]/route.ts` | route |
| `/api/scene-share` | `apps/web/app/api/scene-share/route.ts` | route |
| `/api/share` | `apps/web/app/api/share/route.ts` | route |
| `/api/store/[key]` | `apps/web/app/api/store/[key]/route.ts` | route |
| `/api/themes/share/[id]` | `apps/web/app/api/themes/share/[id]/route.ts` | route |
| `/api/themes/share` | `apps/web/app/api/themes/share/route.ts` | route |
| `/api/unsplash/download` | `apps/web/app/api/unsplash/download/route.ts` | route |
| `/api/unsplash` | `apps/web/app/api/unsplash/route.ts` | route |
| `/api/user-templates/[id]` | `apps/web/app/api/user-templates/[id]/route.ts` | route |
| `/api/user-templates` | `apps/web/app/api/user-templates/route.ts` | route |
| `/api/v1/promo-render` | `apps/web/app/api/v1/promo-render/route.ts` | route |
| `/api/v1/promo-render/status` | `apps/web/app/api/v1/promo-render/status/route.ts` | route |
| `/api/v1/render` | `apps/web/app/api/v1/render/route.ts` | route |
| `/api/xpost` | `apps/web/app/api/xpost/route.ts` | route |
| `/app-store-screenshots` | `apps/web/app/app-store-screenshots/page.tsx` | page |
| `/calibrate/dev` | `apps/web/app/calibrate/dev/page.tsx` | page |
| `/calibrate` | `apps/web/app/calibrate/page.tsx` | page |
| `/changelog` | `apps/web/app/changelog/page.tsx` | page |
| `/chat` | `apps/web/app/chat/page.tsx` | page |
| `/compare/appscreens` | `apps/web/app/compare/appscreens/page.tsx` | page |
| `/dashboard` | `apps/web/app/dashboard/layout.tsx` | layout |
| `/dashboard` | `apps/web/app/dashboard/page.tsx` | page |
| `/developers/api` | `apps/web/app/developers/api/page.tsx` | page |
| `/developers/automations` | `apps/web/app/developers/automations/page.tsx` | page |
| `/developers/embed` | `apps/web/app/developers/embed/page.tsx` | page |
| `/editor` | `apps/web/app/editor/page.tsx` | page |
| `/embed/editor` | `apps/web/app/embed/editor/page.tsx` | page |
| `/extensions` | `apps/web/app/extensions/page.tsx` | page |
| `/guides/[slug]` | `apps/web/app/guides/[slug]/page.tsx` | page |
| `/guides` | `apps/web/app/guides/page.tsx` | page |
| `/launch-kit` | `apps/web/app/launch-kit/page.tsx` | page |
| `/` | `apps/web/app/layout.tsx` | layout |
| `/mockups/[deviceId]` | `apps/web/app/mockups/[deviceId]/page.tsx` | page |
| `/mockups` | `apps/web/app/mockups/page.tsx` | page |
| `/` | `apps/web/app/page.tsx` | page |
| `/press/[slug]` | `apps/web/app/press/[slug]/page.tsx` | page |
| `/pricing` | `apps/web/app/pricing/page.tsx` | page |
| `/privacy` | `apps/web/app/privacy/page.tsx` | page |
| `/s/[id]` | `apps/web/app/s/[id]/page.tsx` | page |
| `/templates/[slug]` | `apps/web/app/templates/[slug]/layout.tsx` | layout |
| `/templates/[slug]` | `apps/web/app/templates/[slug]/page.tsx` | page |
| `/templates/collection/[group]` | `apps/web/app/templates/collection/[group]/layout.tsx` | layout |
| `/templates/collection/[group]` | `apps/web/app/templates/collection/[group]/page.tsx` | page |
| `/templates` | `apps/web/app/templates/layout.tsx` | layout |
| `/templates` | `apps/web/app/templates/page.tsx` | page |
| `/templates/sets/[set]` | `apps/web/app/templates/sets/[set]/layout.tsx` | layout |
| `/templates/sets/[set]` | `apps/web/app/templates/sets/[set]/page.tsx` | page |
| `/tools/[slug]` | `apps/web/app/tools/[slug]/page.tsx` | page |
| `/tools` | `apps/web/app/tools/page.tsx` | page |

## Key pages
- `/` — marketing home: hero with live mockups, app-icon marquee, chat stories, gallery, pricing teaser (dark, #09090b).
- `/editor` — the product: floating-panel editor (light #f4f4f8 canvas). Left panel = 3-step flow Content → Style → Export; top toolbar; right panel = Export + Layouts; bottom bar + Animate; canvas renders a SceneDocument.
- `/templates` — template library: hero, store listing sets (8-shot rows), post-URL importer, phone app-screen templates, content cards, device scenes.
- `/templates/[slug]`, `/templates/sets/[set]` — open the editor preloaded with a template / an 8-shot set (filmstrip under canvas).
- `/app-store-screenshots` — Pack Studio (dark): screen strip, live preview per store size, style/captions inspector, then SEO copy.
- `/guides`, `/guides/[slug]` — guides index (featured + grid) and article (sticky step index, framed screenshots).
- `/pricing`, `/mockups`, `/mockups/[deviceId]`, `/tools/[slug]`, `/ai` — marketing / pSEO pages.
