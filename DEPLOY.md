# Deploying MockFrame to **mockframe.app**

## Split of work
- **Already done in code:** production build passes (`npm run build` ✓), branded-auth rewrites live in `apps/web/next.config.ts`, `authDomain` is env-driven — so branding is a config flip, not a code change.
- **You do (needs your accounts):** create the Vercel project, set env vars, point Cloudflare DNS, add the domain in Firebase. I can't log into those.

> **Host = Vercel (or another Node host), NOT Cloudflare Pages.** The app has Node-runtime API routes (`firebase-admin`), which break on Cloudflare's edge runtime.

---

## 1 · Deploy to Vercel
The repo isn't git yet. Pick one:

**A — Vercel CLI (fastest, no git):**
```bash
cd framekit
npm i -g vercel && vercel login
vercel link          # create/link the project; set Root Directory = apps/web
vercel --prod
```

**B — GitHub + Vercel (better for CI):**
```bash
cd framekit
git init && git add -A && git commit -m "MockFrame"
git remote add origin git@github.com:<you>/mockframe.git && git push -u origin main
```
Then Vercel → **New Project** → import the repo → **Root Directory = `apps/web`** (Next.js auto-detected; Vercel installs the npm workspace from the repo root).

### Environment variables (Vercel → Settings → Environment Variables, Production + Preview)
Copy these from `apps/web/.env.local`:

| Public (client) | Server (Firebase Admin) | Other |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `FIREBASE_PROJECT_ID` | `MOCKUUUPS_API_KEY` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `FIREBASE_CLIENT_EMAIL` | |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `FIREBASE_PRIVATE_KEY` ⚠️ | |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `FIREBASE_STORAGE_BUCKET` | |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | | |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | | |

⚠️ **`FIREBASE_PRIVATE_KEY`**: paste the whole key incl. `-----BEGIN/END-----`. Keeping the `\n` escapes is fine — the code un-escapes them (`.replace(/\\n/g,"\n")`).

---

## 2 · Point mockframe.app (Cloudflare DNS) → Vercel
Vercel → Settings → **Domains** → add `mockframe.app` **and** `www.mockframe.app`. Then in **Cloudflare → DNS**:

| Type | Name | Value | Proxy |
|---|---|---|---|
| A | `mockframe.app` (@) | `76.76.21.21` | **DNS only (grey)** |
| CNAME | `www` | `cname.vercel-dns.com` | **DNS only (grey)** |

Keep proxy **OFF (grey cloud)** — Vercel issues its own SSL and proxying muddies the `/__/auth` handler. Wait for Vercel to verify + issue the cert.

---

## 3 · Firebase — allow the domain
Firebase Console → **Authentication → Settings → Authorized domains** → add `mockframe.app` (and `www.mockframe.app`).

▶ **Site is now LIVE on mockframe.app and Google sign-in works.** The consent popup still flashes `…firebaseapp.com` (cosmetic). Step 4 rebrands it.

---

## 4 · (Optional) Brand the consent screen → "continue to **mockframe.app**"
The rewrites are already in `next.config.ts`. To turn it on:
1. Vercel env: set `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = mockframe.app` → redeploy.
2. Google Cloud Console → **APIs & Services → Credentials** → the Firebase-created **OAuth 2.0 Web client**:
   - **Authorized redirect URIs** → add `https://mockframe.app/__/auth/handler`
   - **Authorized JavaScript origins** → add `https://mockframe.app`
3. Redeploy. Now Google reads **"continue to mockframe.app"**.

---

## 5 · Promo video rendering (Remotion Lambda)

The **App Promo Video Maker** (`/tools/app-promo-video-maker`, toolbar clapperboard,
`/editor?promo=1`) exports real **MP4/H.264** videos. Rendering runs through a
small render service with two paths — you only need to set up the first for
production:

- **Production → Remotion Lambda.** Vercel's serverless runtime can't run headless
  Chromium, so cloud renders go to AWS Lambda. One-time setup (from `apps/web`):
  ```bash
  # 1. AWS creds with the Remotion Lambda policy (see remotion.dev/docs/lambda/setup)
  export REMOTION_AWS_ACCESS_KEY_ID=...            # an IAM user, Remotion Lambda policy
  export REMOTION_AWS_SECRET_ACCESS_KEY=...
  # 2. Deploy the render function + the promo site bundle
  npx remotion lambda functions deploy
  npx remotion lambda sites create remotion/promo/index.ts --site-name=mockframe-promo
  ```
  Then set these env vars in Vercel (Production + Preview) — **live values as
  deployed 2026-07-18**:

  | Var | Value |
  |---|---|
  | `REMOTION_AWS_ACCESS_KEY_ID` | IAM access key (from `apps/web/.env.local`) |
  | `REMOTION_AWS_SECRET_ACCESS_KEY` | IAM secret (from `apps/web/.env.local`) |
  | `REMOTION_AWS_REGION` | `eu-north-1` |
  | `REMOTION_LAMBDA_FUNCTION_NAME` | `remotion-render-4-0-489-mem2048mb-disk2048mb-600sec` |
  | `REMOTION_LAMBDA_SITE_NAME` | `mockframe-promo` |
  | `REMOTION_FRAMES_PER_LAMBDA` | `15` |

  > ℹ️ **Region matters: Lambda concurrency quotas are PER-REGION.** This account
  > has the full default **1,000 in eu-north-1** (verified: 16-λ render, 169s,
  > $0.043, no throttling) but was stuck at 10 in us-east-1 (that deployment has
  > been deleted). Production runs in **eu-north-1**. If you ever redeploy in
  > another region, check its applied "Concurrent executions" quota in Service
  > Quotas first. Site redeploys (after composition changes):
  > `REMOTION_AWS_REGION=eu-north-1 npx remotion lambda sites create remotion/promo/index.ts --site-name=mockframe-promo`

  **Re-run `npx remotion lambda sites create … --site-name=mockframe-promo` whenever a
  composition changes** — it re-uploads the bundle so cloud renders match the editor
  preview. Cost is ~$0.01–0.05 per 10s video; the route enforces a 40/day per-caller
  cap and Pro-only access on top.

- **Local / self-hosted Node → local renderer.** If the `REMOTION_LAMBDA_*` vars are
  **not** set, `/api/v1/promo-render` falls back to `@remotion/renderer` and renders
  on the box itself (downloads a headless-shell once, then reuses it). This is how the
  feature works in `npm run dev` with **zero AWS setup** — great for testing, but it
  won't run on Vercel serverless, so production needs the Lambda path above.

> **Fonts:** the compositions use Inter via a system stack. For pixel-identical
> cloud renders, embed Inter as a font file in the promo bundle (see
> remotion.dev/docs/fonts) rather than relying on the host's installed fonts.

> **Music:** promo videos ship **silent** by default. To offer background tracks,
> drop **cleared/royalty-free** audio into `public/promo-music/` and pass its URL as
> `musicUrl` — never bundle copyrighted audio (IG/FB will mute or block the upload).

## Before you go public
- **Firestore + Storage security rules — DEPLOY THESE.** `firestore.rules` and `storage.rules` (repo root, wired via `firebase.json`) deny ALL direct client access, because every read/write goes through server API routes on the Admin SDK (which bypasses rules). This is what stops a signed-in user from writing their own `users/{uid}.billing` entitlement via the Web SDK to self-grant Pro. Deploy with:
  ```sh
  # storage rules deploy with `--only storage` (NOT storage:rules — that's read
  # as a named storage target). firestore does use the :rules sub-target.
  firebase deploy --only firestore:rules,storage
  ```
  Verify in the Firebase console that the deployed rules match the repo (they are the security boundary — the server code trusts whatever is in the DB).
- Free-tier watermark + guest export flow already work.
