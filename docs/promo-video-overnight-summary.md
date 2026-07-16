# App Promo Video Maker — build summary (2026-07-17)

Built the full **App Promo Video Maker** feature end-to-end overnight, per the
approved spec (`docs/superpowers/specs/2026-07-17-app-promo-video-maker-design.md`).
Turns an app screenshot into a short, animated **MP4 ad** for Instagram Reels /
Stories and Facebook. **Nothing was pushed** — all commits are local on
`feat/pack-studio`.

## What shipped (all phases)

**Data + templates**
- `lib/promo/{types,registry,inputProps,renderRequest}.ts` — zod `PromoProject`
  model, 6-template registry, input-props + render-request contracts. Unit-tested
  (15 tests, all green).
- A premium Remotion kit (`remotion/promo/kit/`): drifting mesh backgrounds + film
  grain, a high-fidelity CSS iPhone frame (Dynamic Island, titanium rim, gloss),
  animated text (word-stagger headline, eyebrow, chips, caption), light sweep, audio.
- **Six compositions** (`remotion/promo/compositions/`): Rise & Reveal, 3D Spin
  Showcase, Feature Pop, Scroll Story, Tilt Parallax, Quick Cut. All render at
  9:16 / 1:1 / 16:9.

**Editor UX**
- `components/editor/promo/PromoPanel.tsx` — full-screen flow: gallery with **live
  per-template thumbnails**, screenshot upload, per-slot text fields, accent colour,
  background swatches, aspect-ratio toggle, and a live `@remotion/player` preview.
- Entry points: a clapperboard **Promo video** button in the editor toolbar, and the
  `/editor?promo=1` deep link.

**Render service**
- `app/api/v1/promo-render/route.ts` + `lib/promo/render.server.ts` — Pro-gated
  (server-enforced), daily per-caller quota, renders to **MP4/H.264**. Dual path:
  **Remotion Lambda** in production, **local `@remotion/renderer`** fallback so it
  works in `npm run dev` with zero AWS. `lib/promo/export.ts` handles the client
  download + upgrade-modal gating.

**SEO + monetisation**
- `/tools/app-promo-video-maker` landing page (reuses the tool-page FAQ + JSON-LD +
  related-links system) — auto-added to the sitemap; a new **Video & motion** group
  on `/tools`; footer link; Pro benefit copy in the upgrade modal + pricing page.

## Verified

- ✅ `npm test` — 15/15 promo unit tests pass.
- ✅ `npx tsc -p apps/web --noEmit` — clean.
- ✅ `npx remotion compositions` — all 6 bundle and enumerate.
- ✅ **Rendered a real 1080×1920 H.264 MP4 locally** (Rise & Reveal) + two stills —
  they look premium (see the commit; stills were in scratch).
- ✅ Dev smoke: `/tools/app-promo-video-maker` 200 + FAQPage schema; `/tools` shows the
  Video group; promo panel mounts with live previews and **no console errors**;
  `/api/v1/promo-render` returns 402 for non-Pro.

## What needs YOU (can't be done without your accounts)

1. **Deploy Remotion Lambda for cloud rendering** — see the new
   **"5 · Promo video rendering"** section in `DEPLOY.md` (AWS creds, `functions
   deploy`, `sites create`, 5 env vars). Until then, cloud export won't work *on
   Vercel*, but **local `npm run dev` export already works** for testing.
2. **Live Pro export smoke test** — the render route is Pro-gated, so a real MP4
   download needs a Pro account (or temporarily relax `requestIsPro` in dev). The
   underlying renderer is already proven (the local MP4 above).
3. **(Optional) Music** — ships silent. Drop cleared/royalty-free tracks into
   `public/promo-music/` if you want background audio (never copyrighted — IG/FB
   will mute/block it).

## Not pushed

Everything is committed locally only. Say the word and I'll push `feat/pack-studio`
(or open a PR).
