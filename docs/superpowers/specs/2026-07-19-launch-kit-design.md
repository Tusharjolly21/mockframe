# Launch Kit Generator — Design

**Date:** 2026-07-19 · **Status:** pending user approval
**Decisions locked:** own page `/launch-kit` · hosted press page in v1 · first kit free then Pro.

## 1. Problem & goal

A founder finishes their app and faces launch day needing ~8 assets in exact
sizes (PH gallery/thumbnail, OG card, X/LinkedIn banner, IG story, GitHub
hero/social-preview) plus launch copy plus a press page — none of which they
can design. MockFrame owns most of the pieces (pack launch surfaces, AI copy,
URL import); this wraps them in one "give me launch day" flow and adds the
missing surfaces + a hosted press page.

**Success:** from a store/site URL or manual inputs, a signed-in user gets a
ZIP of every launch asset + copy + a live `mockframe.app/press/[slug]` page in
under 3 minutes. First kit free, then Pro (server-enforced).

## 2. User flow (wizard, 4 steps)

`/launch-kit` — SEO landing (hero + examples + FAQ, standard tool-page schema)
with the wizard below the fold or behind "Start".

1. **Inputs** — app name, one-line tagline, icon upload, accent (defaults from
   brand kit), 3–5 screenshots, links (website / App Store / Play). OR "Import
   from URL" (reuses `/api/ai-import`) to prefill name/description/screens.
2. **Generate** — one AI call (existing marketing-copy engine) → PH tagline,
   launch tweet, subtitle, boilerplate paragraph; assets composed from the
   pack-style engine with the chosen accent + icon.
3. **Review** — asset grid with live previews (client renders, same pipeline
   as pack studio previews); copy fields editable inline; press-page preview.
4. **Export & publish** — "Download ZIP" (server-rendered, existing
   pack-export pipeline + 2 new surfaces) and "Publish press page".

## 3. Assets produced

Existing surfaces (reused): PH gallery 1270×760, OG 1200×630, X/LinkedIn
1600×900, IG story 1080×1920.
New surfaces (added to the surface registry): **PH thumbnail 240×240**
(icon-centric card), **GitHub social preview 1280×640** (doubles as README
hero). Copy pack: tagline ≤60, tweet ≤280, subtitle ≤30, boilerplate ≤400,
PH first-comment ≤600 (one new field).

⚠️ Dependency: surface definitions live in `lib/pack/schema.ts`
(`PACK_LAUNCH_SURFACES`) — shared with the pack studio. Verify the concurrent
session is no longer mid-edit before touching; changes are additive entries
only.

## 4. Press page

- Route `/press/[slug]` — public, **indexable** (each page links back to the
  product = backlink engine), OG card = the kit's OG asset.
- Content: icon + name + tagline, boilerplate, screenshot gallery (hosted
  asset URLs), fact row (platforms, links), downloadable logo/icon block,
  press contact email, "Made with MockFrame" footer.
- Storage: Firestore `pressPages/{slug}`: { appName, tagline, boilerplate,
  accent, icon, screenshots[], links{site,appstore,play}, contact, ownerId,
  publishedAt }. Slug = sanitized app name, collision → `-2` suffix; owner can
  re-publish (update) their slug; sign-in required; daily quota 10.
- Unpublish: owner delete → 410 page.

## 5. Gating & abuse

- Wizard + previews: free, no sign-in (consistent with product philosophy).
- ZIP export + press publish: sign-in required; **first kit free** (Firestore
  counter `launchKits`, transactional consume like AI packs), then Pro.
  Server-enforced at `/api/launch-kit/export` + `/api/press` routes.
- All uploads via existing `/api/assets` (sniffed, capped).

## 6. Architecture

- `lib/launchkit/types.ts` — LaunchKitDoc (zod), builders from AI plan.
- `lib/launchkit/` reuses: `lib/ai` (copy), pack render pipeline (surfaces),
  brand kit (accent default), `/api/ai-import` (URL prefill).
- Routes: `app/launch-kit/page.tsx` (landing+wizard), `app/press/[slug]/page.tsx`,
  `app/api/launch-kit/export/route.ts` (zip), `app/api/press/route.ts` (publish)
  + `[slug]` GET/DELETE.
- SEO: tool-page entry (`launch-kit` in TOOL_PAGES → hub/footer/sitemap),
  targets "app launch kit", "product hunt gallery generator", "press kit
  generator" (all in keyword DB clusters N/P).

## 7. Non-goals (v1)

No localization, no team roles on press pages, no PH API auto-submit, no
video assets (user-scoped), no custom press-page domains.

## 8. Risks

- Pack schema file contention (see §3 note) — mitigate: additive-only, check
  git state first.
- Press-page content abuse (spam/impersonation) → sign-in + quota + report
  mailto in footer; revisit moderation if abused.
- Icon quality in (blurry uploads) → warn under 512px.
