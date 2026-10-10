<div align="center">

# MockFrame

**Screenshots in. Stunning mockups out.**

Drop a screenshot into a real device, style the scene, and export a production-ready
image or video. No design tools, no sign-up wall.

[**mockframe.app**](https://mockframe.app) · [Open the editor](https://mockframe.app/editor) · [Templates](https://mockframe.app/templates) · [Pricing](https://mockframe.app/pricing) · [Developer API](https://mockframe.app/developers/api)

![MockFrame homepage](docs/screenshots/home.webp)

</div>

---

## What it does

MockFrame turns raw app and website screenshots into launch-ready marketing assets:
device mockups, App Store screenshot sets, social posts and animated promo videos.
Everything runs from one editor, works without an account, and syncs to the cloud
when you sign in.

<table>
<tr>
<td width="62%"><img src="docs/screenshots/editor.webp" alt="MockFrame editor with an iPhone mockup" /></td>
<td width="38%"><img src="docs/screenshots/mockup-example.webp" alt="Example export: a tilted phone on a warm gradient" /></td>
</tr>
<tr>
<td align="center"><sub>The editor: content, style and export in three steps</sub></td>
<td align="center"><sub>An export made with MockFrame</sub></td>
</tr>
</table>

### Features

| | |
|---|---|
| 📱 **104 device frames** | iPhone, Pixel, Galaxy, iPad, MacBook, Apple Watch and browser windows, as photoreal scenes or clean frames, with exact-resolution device detection on drop. |
| 🎨 **Scene styling** | Mesh, gradient, image and premium background collections; lighting-model shadows, 3D tilt, glare, borders, stickers, text and annotations. |
| 🧩 **Template library** | Premium launch layouts, App Store listing sets, realistic app screens, content cards and device scenes, all fully editable. |
| 🎬 **Promo videos** | Animated app ads with 3D shapes and camera moves, exported as MP4 in 9:16, 1:1 and 16:9. Rendered in the browser or on Remotion Lambda. |
| 🛍️ **App Store screenshots** | Store-ready packs built by hand or with AI, translated into 39 languages. |
| 💬 **Chat & social screens** | Pixel-accurate WhatsApp, iMessage, Discord and more, plus text-message videos. |
| 🌐 **Website capture** | Paste a URL and capture the page straight into a browser frame. |
| 📦 **Export** | PNG, JPG, WebP up to 6K, GIF and MP4 up to 4K at 60 fps, batch ZIP and hosted share links. |
| 👥 **Teams & brand kits** | Shared template libraries, custom fonts, custom devices and brand watermarks. |
| 🔌 **Developer platform** | REST render API, an MCP server for Claude and Cursor, an embeddable editor, a Figma plugin, and Chrome and VS Code extensions. |

<table>
<tr>
<td><img src="docs/screenshots/video.webp" alt="Promo video templates" /></td>
<td><img src="docs/screenshots/templates.webp" alt="Template library" /></td>
</tr>
<tr>
<td align="center"><sub>Promo video templates</sub></td>
<td align="center"><sub>Template library</sub></td>
</tr>
<tr>
<td><img src="docs/screenshots/mockups.webp" alt="Device library" /></td>
<td><img src="docs/screenshots/pricing.webp" alt="Pricing" /></td>
</tr>
<tr>
<td align="center"><sub>Device library</sub></td>
<td align="center"><sub>Free and Pro plans</sub></td>
</tr>
</table>

---

## Architecture

Every design is a **Scene Document**: versioned JSON validated by `@framekit/scene`.
One isomorphic renderer, `@framekit/renderer`, draws that document identically in the
browser editor and in headless export workers, so what you see is exactly what you export.

```
┌──────────────────────────┐      ┌──────────────────────────┐
│  Editor (Next.js, React) │      │  Render API / MCP / Embed │
└────────────┬─────────────┘      └────────────┬─────────────┘
             │        Scene Document (JSON)     │
             └───────────────┬──────────────────┘
                             ▼
                 @framekit/renderer  ◄──  @framekit/devices (frames + registry)
                             │
          ┌──────────────────┼───────────────────┐
          ▼                  ▼                   ▼
   Client export       Puppeteer capture     Remotion (browser
   (PNG/JPG/WebP)      (server images)        or AWS Lambda) → MP4
```

### Tech stack

| Layer | Technology |
|---|---|
| App | Next.js 15 (App Router), React 19, TypeScript, Zustand + zundo |
| Rendering | `@framekit/renderer`, html-to-image, Three.js / React Three Fiber |
| Video | Remotion 4 (in-browser export via Mediabunny, cloud renders on Remotion Lambda) |
| Backend | Next.js route handlers, Firebase Auth, Firestore and Cloud Storage |
| Billing | Dodo Payments hosted checkout and signed webhooks |
| AI | Anthropic Claude for store copy, translation and screenshot packs |
| Hosting | Vercel (web), AWS Lambda (video rendering), Cloudflare DNS |

### Repository layout

```
apps/web                 Next.js app: marketing site, editor, API routes, Remotion compositions
packages/scene           Zod schemas, types, factories and migrate-on-read
packages/devices         Device registry (JSON + SVG), frame generator and codegen
packages/renderer        Isomorphic React scene renderer
tooling/frame-validate   CI gate for the device registry (schema, geometry, SVG refs)
extensions/chrome        "Capture visible tab" Chrome extension
extensions/vscode        Code-screenshot VS Code extension
docs/                    SEO plan, design notes and screenshots
```

Boundary rule: `renderer` depends only on `scene`, `devices` and React. No fetches and
no app imports; assets arrive as URLs resolved by the host.

---

## Getting started

### Prerequisites

- Node.js 22+ and npm 10+
- A Firebase project (optional for local guest mode, required for cloud sync)

### Run locally

```bash
git clone https://github.com/Tusharjolly21/mockframe.git
cd mockframe
npm install
npm run dev            # http://localhost:3000, editor at /editor
```

The editor works fully in guest mode without any environment variables. Drafts are
kept in IndexedDB until Firebase is configured.

### Environment

Create `apps/web/.env.local` with the values you need:

```bash
# Firebase web app (client)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (server)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=
```

On Google-hosted infrastructure, set `FIREBASE_USE_ADC=1` with `FIREBASE_PROJECT_ID`
and `FIREBASE_STORAGE_BUCKET` to use Application Default Credentials instead of a key.
Billing, AI and Remotion Lambda variables are listed in [DEPLOY.md](DEPLOY.md).

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the Next.js dev server (Turbopack) |
| `npm run build` | Production build (webpack) |
| `npm run typecheck` | Type-check every package and the app |
| `npm test -w web` | Run the Vitest unit suite |
| `npm run gen:devices` | Regenerate SVG frames and compile the device registry |
| `npm run validate:frames` | Validate the device registry (CI gate) |
| `npm run gen:icons` | Rebuild the icon sticker catalog |

---

## Deployment

Production runs at **[mockframe.app](https://mockframe.app)**:

- **Web**: Vercel, root directory `apps/web`. Node runtime is required because API
  routes use `firebase-admin`.
- **Video**: Remotion Lambda on AWS for cloud promo renders.
- **Data**: Firebase Auth, Firestore and Storage, secured by `firestore.rules` and `storage.rules`.
- **Billing**: Dodo Payments subscriptions ($9.99 / month or $59.99 / year).
- **SEO**: IndexNow pings on every production deploy via GitHub Actions.

The full step-by-step guide, including DNS, Firebase auth domains, Lambda setup and
billing webhooks, is in [DEPLOY.md](DEPLOY.md).

---

## API

Pro accounts can render mockups programmatically:

- `POST /api/v1/render` renders a scene to an image
- `POST /api/v1/screenshots` turns screenshot URLs into device mockups or a store listing set
- `POST /api/v1/promo-render` starts a promo video render (poll `/api/v1/promo-render/status`)
- `POST /api/mcp` exposes the same tools to MCP clients such as Claude and Cursor

See [mockframe.app/developers/api](https://mockframe.app/developers/api) for
authentication and request formats.

---

<div align="center">
<sub>Built by <a href="https://github.com/Tusharjolly21">@Tusharjolly21</a> · <a href="https://mockframe.app">mockframe.app</a></sub>
</div>
