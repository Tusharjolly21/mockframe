# App Promo Video Maker — Design

**Date:** 2026-07-17
**Status:** Approved (design); pending implementation plan
**Owner:** MockFrame / FrameKit

## 1. Problem & goal

B2B customers want a short (~8–12 second) **app-promo video** for Instagram Reels / Stories
and Facebook — a scripted motion sequence like: a title card animates in, the phone rises
up from the bottom, it revolves in 3D, a feature caption animates in, then an outro. Today
MockFrame can only animate **chat screens** (the message-replay engine); a plain app or
website mockup cannot be turned into a promo video at all.

The `Animate` panel (`apps/web/components/editor/AnimatePanel.tsx`) refuses to open unless the
scene contains a chat screen with 2+ messages. The dormant `TimelineSchema`
(`packages/scene/src/schema.ts:264-297`) is validated but unused, and Remotion is installed
(`package.json`, `apps/web/remotion/`) with a demo composition that nothing invokes.

**Goal:** ship a **template-driven promo-video maker** for portrait (9:16) phone-app mockups
that produces **MP4/H.264** files ready to upload to Instagram and Facebook, gated behind Pro.

### Success criteria

- A Pro user can pick a template, drop in a screenshot, pick a device, edit the text lines,
  choose a format, preview it live, and download a working **MP4** that uploads cleanly to
  Instagram and Facebook.
- Six visually distinct templates ship.
- Free users can preview (watermarked) but cannot download the MP4.
- Export of a 10 s 1080×1920 video completes in a reasonable time (target < ~60 s wall clock)
  and costs ~$0.01–0.05 per render.

### Non-goals (v1)

- No free-form/manual keyframe timeline editor. Motion is template-defined.
- No arbitrary text repositioning/rotation. Text lines are editable strings + one accent
  colour; positions and animation are baked into each template.
- No landscape-first or website-scroll-first templates beyond the one `Scroll Story` template
  (website/laptop subjects are a later release; v1 optimises for portrait phone).
- No user-uploaded custom music (licensing risk). Built-in cleared tracks only.
- No change to the existing chat-replay animator, its WebM/GIF export, or the dormant
  `TimelineSchema` (left as-is).

## 2. Architecture

**Content and motion are separated.** The user's inputs are plain data (`PromoProject`); each
template is a Remotion composition that reads that data as `inputProps` and choreographs it.
Same data + different template = different video.

```
PromoProject (data)                    Template (motion)
├─ templateId                          Remotion composition, e.g. <RiseAndReveal/>
├─ deviceId          (iphone-16-pro…)  reads inputProps, animates:
├─ screenshotAssetId                     • title card in
├─ texts: string[]   (per-template)      • phone rises from bottom (spring)
├─ accent            (hex)               • 3D revolve
├─ background        (preset id/color)   • caption in
├─ format            (9:16 | 1:1 | 16:9) • outro
├─ durationInFrames                    ────────────────────────────────
└─ music             (none | trackId)

  Preview:  @remotion/player   (live, in-editor, scrubbable, interaction unlocks audio)
  Export :  POST /api/v1/promo-render → Remotion Lambda → S3 MP4 (H.264) → client download
```

**Why Remotion + Lambda (decided):** Instagram/Facebook want MP4/H.264; the current client
exporter only produces WebM (often rejected/re-compressed). Remotion is purpose-built for
scripted promo motion (true CSS-3D, spring physics, text animation), is already a dependency,
and `@remotion/player` gives a high-fidelity in-editor preview for free. Remotion **Lambda**
renders server-side to real MP4, scales to zero, and costs ~$0.01–0.05 per 10 s clip. The
considered alternative — a Dockerized Node render worker on Fly/Railway — was rejected in
favour of Lambda's scale-to-zero economics. (The client-side-only and hybrid approaches were
rejected because neither yields a clean MP4 without bundling ffmpeg.wasm.)

The dormant `TimelineSchema` is **not** used: with Remotion the motion lives in composition
code, not in scene keyframe data.

### Units and boundaries

- **`PromoProject` type + validation** (`packages/scene` or `apps/web/lib/promo/`): the data
  contract shared by preview and render. One source of truth for `inputProps`.
- **Template registry** (`apps/web/remotion/promo/`): a map of `templateId → { component,
  metadata, defaultDurationInFrames, textSlots }`. Each template is an isolated composition
  file. Adding a template = add one file + one registry entry; no consumer changes.
- **Preview surface** (`apps/web/components/editor/promo/`): the gallery + config panel +
  `@remotion/player`. Depends only on the registry and `PromoProject`.
- **Render service** (`apps/web/app/api/v1/promo-render/` + a `lib/promo/lambda.ts` client):
  takes `{ templateId, inputProps, format }`, enforces Pro, invokes Lambda, returns a
  downloadable MP4 URL. Depends on the registry (composition id) and the Lambda deployment.
- **Lambda site** (Remotion bundle deployed to Lambda/S3): the same composition code bundled
  for server rendering. Kept in sync with the client registry by bundling from the same
  `apps/web/remotion/promo/Root.tsx`.

## 3. Data model

```ts
// apps/web/lib/promo/types.ts
export type PromoFormat = "9:16" | "1:1" | "16:9";

export interface PromoProject {
  templateId: string;          // key into the template registry
  deviceId: string;            // e.g. "iphone-16-pro"
  screenshotAssetId: string;   // resolves via the existing asset store
  texts: string[];             // length/labels defined by the template's textSlots
  accent: string;              // hex, e.g. "#7c3aed"
  background: string;          // background preset id or hex
  format: PromoFormat;         // default "9:16"
  durationInFrames: number;    // fps fixed at 30; default from template
  music: string | null;        // built-in trackId or null (silent)
}
```

- `fps` is fixed at **30** for v1 (kept out of the type; a module constant).
- Format → dimensions: `9:16 → 1080×1920`, `1:1 → 1080×1080`, `16:9 → 1920×1080`.
  Compositions must be responsive to `width/height` (read from Remotion's `useVideoConfig`).
- A `PromoProject` is persisted like a draft (reuse the existing drafts/IndexedDB mechanism;
  screenshots stay in the asset store and are referenced by id, never embedded).
- The template registry entry declares `textSlots: { key, label, placeholder, maxLen }[]` so
  the config UI knows how many text fields to show and what to call them.

## 4. Template library

Six portrait-first (9:16) templates, 30 fps, ~8–12 s. Each must also lay out acceptably at
1:1 and 16:9 (responsive to `useVideoConfig`).

| id | Name | Motion | Text slots |
|---|---|---|---|
| `rise-reveal` | Rise & Reveal | Title in → phone rises from bottom (spring) → settles & floats → caption slides in → outro logo. | headline, caption |
| `spin-showcase` | 3D Spin Showcase | Phone enters, slow Y-axis revolve; captions cross-fade across the turn. | headline, caption |
| `feature-pop` | Feature Pop | Phone holds centre; 3 feature captions pop in sequentially with subtle zoom to UI regions. | feature1, feature2, feature3 |
| `scroll-story` | Scroll Story | Phone rises, then the screenshot auto-scrolls top-to-bottom to reveal the whole app; caption pinned. | headline |
| `tilt-parallax` | Tilt Parallax | Phone floats with 3D tilt; background pattern parallax; bold headline. Brand hero. | headline, subhead |
| `quick-cut` | Quick Cut Promo | Punchy, music-synced: title → phone slam-in → 2 fast feature cuts → CTA card. | title, feature1, feature2, cta |

Each template ships with sensible defaults (duration, background, placeholder text) so a first
preview renders instantly with just a screenshot dropped in.

## 5. Editor UX

A dedicated **"Promo video (Pro)"** flow, separate from the chat-only `Animate` panel.

1. **Entry point:** a "Promo video" action in the editor (and later a
   `/tools/app-promo-video-maker` marketing landing page for SEO). Opens the promo flow.
2. **Template gallery:** tiles for the six templates, each auto-looping a small `@remotion/player`
   preview using placeholder content.
3. **Config panel:** replace/upload screenshot, pick device, edit the template's text lines,
   set accent colour, background, format (9:16 default / 1:1 / 16:9), duration, optional music.
4. **Live preview:** `@remotion/player` with play/scrub controls (user interaction satisfies the
   browser audio-gesture requirement, so music previews correctly — unlike the autoplay landing
   hero that previously hit AudioContext gating).
5. **Export MP4:** triggers the render service; shows progress; downloads the finished MP4.

Free users can preview (with a watermark burned into the preview) but the **Export MP4** button
opens the upgrade modal instead of rendering.

## 6. Render service, gating, and delivery

- **Endpoint:** `POST /api/v1/promo-render` with `{ templateId, inputProps, format }`.
- **Pro enforcement:** server-side via the existing `requestIsPro` check (never trust the
  client). Non-Pro → 402/403, client shows the upgrade modal. Mirrors current video/GIF gating
  in `apps/web/lib/billing/gate.ts`.
- **Render:** invoke Remotion Lambda (`@remotion/lambda/client` `renderMediaOnLambda`) targeting
  the deployed function + site, codec `h264`, the composition id = `templateId`, passing
  `inputProps`. Poll progress (`getRenderProgress`) and surface it to the client.
- **Delivery:** Lambda writes the MP4 to S3; return a time-limited download URL (or proxy the
  file through the API route). Client downloads `mockframe-promo-{format}.mp4`.
- **Watermark:** free-tier previews are watermarked in-composition; paid renders omit it. The
  server decides watermark on/off from the verified Pro status, not a client flag.
- **Abuse/quota:** reuse the existing quota mechanism (`lib/server/quota.ts`, keyed on trusted
  `x-real-ip`) to cap renders; Pro users get a higher cap. A render costs real money, so the
  cap is enforced server-side before invoking Lambda.

### Infrastructure (owner setup, one-time)

- AWS account + Remotion Lambda function deployed (`npx remotion lambda functions deploy`), the
  promo Remotion site deployed to S3 (`npx remotion lambda sites create`), an S3 bucket for
  output, and an IAM user with the Remotion Lambda policy.
- New env vars (Vercel): `REMOTION_AWS_ACCESS_KEY_ID`, `REMOTION_AWS_SECRET_ACCESS_KEY`,
  `REMOTION_LAMBDA_FUNCTION_NAME`, `REMOTION_LAMBDA_SITE_NAME`, `AWS_REGION`. Documented in
  `DEPLOY.md`.
- CI/deploy step (or a documented manual step) to redeploy the Lambda **site** whenever a
  composition changes, keeping server renders in sync with the client registry.

### Music & licensing

- v1 ships **silent by default** plus 2–3 **cleared/royalty-free** tracks bundled as assets.
- No user-uploaded or copyrighted audio (would get videos muted or blocked on IG/FB).

## 7. Build phases

1. **Foundation** — `PromoProject` type + validation; the `rise-reveal` composition; the
   template registry; `@remotion/player` preview wired to `inputProps` in a new promo panel.
   Proves the full data→motion→preview loop client-side.
2. **Render** — deploy Remotion Lambda + site; `/api/v1/promo-render`; Pro gating + quota;
   MP4 download; progress UI. Proves end-to-end MP4 export.
3. **Library** — build the remaining five compositions; the gallery picker; the full config UI
   (text/color/background/format/duration/music).
4. **Polish + SEO** — `/tools/app-promo-video-maker` landing page (with FAQ + HowTo structured
   data, matching the existing tool-page pattern); pricing/upgrade copy mentions promo video.

## 8. Risks & open questions

- **Lambda cold starts / render latency.** Mitigate with a reasonable concurrency + a progress
  UI; measure in phase 2.
- **Composition/site drift.** The client registry and the deployed Lambda site must render
  identically. Mitigate by bundling both from the same `Root.tsx` and redeploying the site on
  composition change (phase 2 sets up the deploy step).
- **Cost control.** Server-side quota before invoking Lambda; Pro-only export.
- **Font availability in Lambda.** Remotion must have the promo fonts bundled/embedded so
  server renders match preview (use `@remotion/fonts` / local font files, not CDN).
- **Screenshot delivery to Lambda.** The Lambda render needs the screenshot; pass it as a URL
  the Lambda can fetch (e.g. a signed asset URL) or inline as a data URI within input-size
  limits. Resolve in phase 2.
