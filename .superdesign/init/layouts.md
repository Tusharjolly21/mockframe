# Layouts

- `app/layout.tsx` — root html/body, Inter + display fonts, global CSS. No shared chrome.
- `MarketingNav` — fixed dark top nav (logo, Product menu, Guides, Pricing, Open editor, Start free); used by every marketing page.
- `MarketingFooter` — 5-column dark footer (Product, Popular devices, Chat mockups, Tools).
- `BrandMark` — the gradient logo tile.
- `EditorShell` — the editor app shell: full-bleed canvas with floating panels (top-left brand/nav pill, top-centre toolbar, left 3-step panel, right export/layouts panel, bottom bar + filmstrip), toasts and modals.
- `Toolbar` — top-centre floating toolbar (undo/redo, text, shapes, layers, fit, 3D, more menu).
- `StepFlow` — Content → Style → Export step nav, footer and the Export step.

### `apps/web/app/layout.tsx`

```tsx
import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const GOOGLE_ANALYTICS_ID = "G-CN1PEZYM0L";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    // keyword-led default (used for any page without its own title), brand last
    // per Google's title guidance; page-level titles override via the template.
    default: "MockFrame — Device Mockup & Screenshot Generator",
    template: `%s — ${SITE_NAME}`,
  },
  description:
    "Free device mockup generator. Drop any screenshot into a photoreal iPhone, MacBook or browser frame, add chat and app screens, style the scene, and export a share-ready image in seconds — no design tools, right in your browser.",
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  robots: { index: true, follow: true },
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    url: SITE_URL,
    locale: "en_US",
  },
  twitter: { card: "summary_large_image" },
};

/** Global Organization + WebSite JSON-LD — establishes the brand as an entity
 *  (knowledge panel eligibility). No competitor in this niche emits either.
 *  NOTE: no SearchAction/sitelinks-searchbox — that requires a real site-search
 *  endpoint returning results, which we don't have; claiming it would be false. */
const ORG_AND_SITE_JSONLD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/icon.svg`,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GOOGLE_ANALYTICS_ID}');
          `}
        </Script>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* crossOrigin makes cssRules readable so the client exporter can inline @font-face */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&family=Lora:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&family=Merriweather:wght@400;700&family=Outfit:wght@400;500;600;700&family=Playfair+Display:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Sora:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;700&display=swap"
          rel="stylesheet"
          crossOrigin="anonymous"
        />
      </head>
      {/* suppressHydrationWarning: browser extensions (ColorZilla's
          cz-shortcut-listen, Grammarly, etc.) mutate <body> before React
          hydrates — this silences that attribute-only noise, nothing else. */}
      <body className="bg-zinc-950 text-zinc-200 antialiased" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_AND_SITE_JSONLD) }}
        />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

### `apps/web/components/marketing/MarketingNav.tsx`

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Menu, X } from "lucide-react";
import { BrandMark } from "./BrandMark";
import { SITE_NAME } from "@/lib/site";

/** Product surfaces live in one dropdown so the bar stays uncluttered as
 *  features ship; only cross-cutting pages stay flat. */
const PRODUCT_LINKS: [href: string, label: string, blurb: string][] = [
  ["/mockups", "Mockups", "Device & browser screenshot mockups"],
  ["/app-store-screenshots", "App Store Screenshots", "Submission-ready packs for both stores"],
  ["/ai", "AI Generator", "Describe your app, get the whole pack"],
  ["/launch-kit", "Launch Kit", "Every launch-day asset in one click"],
  ["/templates", "Templates", "Ready-made scenes to start from"],
  ["/tools", "Tools", "Chat, capture & social mockup tools"],
];

const FLAT_LINKS: [href: string, label: string][] = [
  ["/guides", "Guides"],
  ["/pricing", "Pricing"],
];

/** Fixed, blurred dark nav for the marketing pages — with a mobile menu. */
export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const productRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const productActive = PRODUCT_LINKS.some(([href]) => isActive(href));

  // close the dropdown on outside click / Escape
  useEffect(() => {
    if (!productOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!productRef.current?.contains(e.target as Node)) setProductOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProductOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [productOpen]);

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#09090b]/80 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <BrandMark size={28} />
          <span className="text-[15px] font-semibold tracking-[-0.01em] text-white">{SITE_NAME}</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <div ref={productRef} className="relative">
            <button
              type="button"
              aria-expanded={productOpen}
              aria-haspopup="menu"
              onClick={() => setProductOpen((v) => !v)}
              className={`flex items-center gap-1 text-[13.5px] transition-colors ${
                productActive || productOpen ? "font-medium text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              Product
              <ChevronDown size={13} className={`transition-transform ${productOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {productOpen && (
                <motion.div
                  role="menu"
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute left-1/2 top-full mt-3 w-72 -translate-x-1/2 rounded-2xl border border-white/10 bg-[#101014]/95 p-2 shadow-2xl backdrop-blur-md"
                >
                  {PRODUCT_LINKS.map(([href, label, blurb]) => (
                    <Link
                      key={href}
                      href={href}
                      role="menuitem"
                      onClick={() => setProductOpen(false)}
                      aria-current={isActive(href) ? "page" : undefined}
                      className={`block rounded-xl px-3 py-2.5 transition-colors hover:bg-white/5 ${
                        isActive(href) ? "bg-white/5" : ""
                      }`}
                    >
                      <span className={`block text-[13.5px] font-medium ${isActive(href) ? "text-white" : "text-zinc-200"}`}>
                        {label}
                      </span>
                      <span className="block text-[12px] text-zinc-500">{blurb}</span>
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {FLAT_LINKS.map(([href, label]) => (
            <Link
              key={label}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={`text-[13.5px] transition-colors ${isActive(href) ? "font-medium text-white" : "text-zinc-400 hover:text-white"}`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/editor" className="hidden text-[13.5px] text-zinc-400 transition-colors hover:text-white sm:block">
            Open editor
          </Link>
          <Link
            href="/editor"
            className="rounded-lg bg-white px-3.5 py-1.5 text-[13.5px] font-semibold text-zinc-900 transition-colors hover:bg-zinc-200"
          >
            Start free
          </Link>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-zinc-300 md:hidden"
          >
            {open ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </div>

      {/* mobile menu */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.nav
            key="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-white/10 bg-[#09090b]/95 backdrop-blur-md md:hidden"
          >
            <div className="px-6 py-3">
              <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Product</p>
              {PRODUCT_LINKS.map(([href, label]) => (
                <Link
                  key={label}
                  href={href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(href) ? "page" : undefined}
                  className={`block rounded-lg px-2 py-2.5 text-[15px] font-medium hover:bg-white/5 hover:text-white ${isActive(href) ? "bg-white/5 text-white" : "text-zinc-300"}`}
                >
                  {label}
                </Link>
              ))}
              <p className="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">More</p>
              {FLAT_LINKS.map(([href, label]) => (
                <Link
                  key={label}
                  href={href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(href) ? "page" : undefined}
                  className={`block rounded-lg px-2 py-2.5 text-[15px] font-medium hover:bg-white/5 hover:text-white ${isActive(href) ? "bg-white/5 text-white" : "text-zinc-300"}`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
```

### `apps/web/components/marketing/MarketingFooter.tsx`

```tsx
import Link from "next/link";
import { SITE_NAME } from "@/lib/site";
import { BrandMark } from "./BrandMark";
import { FeedbackButton } from "./FeedbackButton";

const COLS: { title: string; links: [string, string][] }[] = [
  {
    title: "Product",
    links: [
      ["/editor", "Editor"],
      ["/mockups", "Device mockups"],
      ["/app-store-screenshots", "App Store Screenshots"],
      ["/ai", "AI Generator"],
      ["/templates", "Templates"],
      ["/pricing", "Pricing"],
      ["/developers/api", "Render API alpha"],
      ["/developers/embed", "Embed editor alpha"],
      ["/extensions", "Extensions alpha"],
    ],
  },
  {
    title: "Popular devices",
    links: [
      ["/mockups/iphone-17-pro", "iPhone 17 Pro"],
      ["/mockups/iphone-16-pro", "iPhone 16 Pro"],
      ["/mockups/galaxy-s25-ultra", "Galaxy S25 Ultra"],
      ["/mockups/galaxy-s24-ultra", "Galaxy S24 Ultra"],
      ["/mockups/pixel-9-pro", "Pixel 9 Pro"],
      ["/mockups/macbook-pro-16", "MacBook Pro 16"],
      ["/mockups/ipad-pro-13", "iPad Pro 13"],
      ["/mockups/apple-watch-ultra-psd-midnight-1", "Apple Watch Ultra"],
    ],
  },
  {
    title: "Chat mockups",
    links: [
      ["/tools/fake-whatsapp-chat-generator", "WhatsApp chat"],
      ["/tools/fake-imessage-generator", "iMessage / texts"],
      ["/tools/fake-instagram-dm-generator", "Instagram DM"],
      ["/tools/fake-telegram-chat-generator", "Telegram chat"],
      ["/tools/fake-snapchat-generator", "Snapchat"],
      ["/tools/fake-messenger-chat-generator", "Messenger"],
      ["/tools/fake-discord-chat-generator", "Discord chat"],
      ["/tools/fake-slack-conversation-generator", "Slack conversation"],
      ["/tools/fake-text-video", "Text message video"],
      ["/chat", "Chat maker (mobile)"],
    ],
  },
  {
    title: "Tools",
    links: [
      ["/tools", "All tools"],
      ["/launch-kit", "Launch kit generator"],
      ["/tools/app-promo-video-maker", "App promo video maker"],
      ["/tools/website-screenshot", "Website screenshots"],
      ["/tools/code-screenshot", "Code screenshots"],
      ["/tools/tweet-screenshot", "X post images"],
      ["/app-store-screenshots", "App Store screenshots"],
      ["/guides", "Guides"],
      ["/changelog", "Changelog"],
      ["/developers/automations", "Automations"],
      ["/privacy", "Privacy policy"],
    ],
  },
];

/** Dark multi-column marketing footer (Linear-style). */
export function MarketingFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#09090b] px-6 py-16">
      {/* brand block spans 2 cols; with 4 link columns that's 6 total (was 5,
          which wrapped "Tools" onto a second row when "Chat mockups" was added) */}
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-10 md:grid-cols-6">
        <div className="col-span-2 md:col-span-2">
          <Link href="/" className="flex items-center gap-2">
            <BrandMark size={28} />
            <span className="text-[15px] font-semibold tracking-[-0.01em] text-white">{SITE_NAME}</span>
          </Link>
          <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-zinc-500">
            The free screenshot mockup studio. Pixel-accurate device frames, gorgeous scenes, one-click export.
          </p>
        </div>
        {COLS.map((col) => (
          <div key={col.title}>
            <div className="text-[13px] font-semibold text-white">{col.title}</div>
            <ul className="mt-4 space-y-2.5">
              {col.links.map(([href, label]) => (
                <li key={href + label}>
                  <Link href={href} className="text-[13px] text-zinc-500 transition-colors hover:text-white">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-14 flex max-w-6xl items-center justify-between border-t border-white/10 pt-6 text-[12.5px] text-zinc-600">
        <span>© {SITE_NAME}</span>
        <div className="flex items-center gap-5"><FeedbackButton /><span>Start free · online · Pro exports available</span></div>
      </div>
    </footer>
  );
}
```

### `apps/web/components/marketing/BrandMark.tsx`

```tsx
import { SITE_NAME } from "@/lib/site";

/**
 * MockFrame brand mark — a viewfinder framing a screen (mockups + frames),
 * on the violet→cyan brand gradient. Used in the nav, footer, editor and the
 * export badge so the identity is consistent everywhere.
 */
export function BrandMark({ size = 28, className = "", rounded = 9 }: { size?: number; className?: string; rounded?: number }) {
  const s = size * 0.6;
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 ${className}`}
      style={{ width: size, height: size, borderRadius: rounded }}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="#fff" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 8.4V6.3A2.3 2.3 0 0 1 6.3 4H8.4" />
        <path d="M15.6 4h2.1A2.3 2.3 0 0 1 20 6.3v2.1" />
        <path d="M20 15.6v2.1a2.3 2.3 0 0 1-2.3 2.3h-2.1" />
        <path d="M8.4 20H6.3A2.3 2.3 0 0 1 4 17.7v-2.1" />
      </svg>
      <span className="absolute rounded-[2.5px] bg-white" style={{ width: size * 0.2, height: size * 0.2 }} />
    </span>
  );
}

/** Mark + wordmark lockup. */
export function BrandLogo({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <BrandMark size={size} />
      <span className="text-[15px] font-semibold tracking-[-0.01em] text-white">{SITE_NAME}</span>
    </span>
  );
}
```

### `apps/web/components/editor/EditorShell.tsx`

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { track, trackOnce } from "@/lib/analytics";
import { confirmCheckoutReturn } from "@/lib/billing/client";
import { ingestFile } from "@/lib/assets";
import { loadCustomDevices, syncCustomDevicesFromServer } from "@/lib/customDevices";
import { buildDeviceScene, buildScreenScene, isScreenApp } from "@/lib/deviceScene";
import { saveCurrentDraft } from "@/lib/drafts";
import { ShotStrip } from "./ShotStrip";
import { useShotBatchStore } from "@/lib/shotBatch";
import { duplicateLayer, groupLayers, placeAsset, removeLayer, reorderLayer, ungroupLayers } from "@/lib/sceneOps";
import { copyLayers, hasCopiedLayers, pasteLayers, runArrange, type ArrangeAction } from "@/lib/arrange";
import { sceneTemporal, useSceneStore, useViewStore } from "@/lib/store";
import { AnimatePanel } from "./AnimatePanel";
import { BottomBar } from "./BottomBar";
import { CanvasStage } from "./CanvasStage";
import { LeftPanel } from "./LeftPanel";
import { RightPanel } from "./RightPanel";
import { ExportNextSteps } from "./ExportNextSteps";
import { MobileGate } from "./MobileGate";
import { StarterModal } from "./StarterModal";
import { ShortcutsSheet } from "./ShortcutsSheet";
import { LogoChip, Toolbar } from "./Toolbar";

// Heavy (@remotion/player) + client-only — load it only when the promo flow opens.
const PromoPanel = dynamic(() => import("./promo/PromoPanel"), { ssr: false });

export function EditorShell({
  initialDeviceId,
  initialScreenApp,
  openCalibrate = false,
  openUpgradeOnLoad = false,
  upgradePlan,
  checkoutReturn,
  openCaptureOnLoad = false,
  openPromoOnLoad = false,
  openReplayOnLoad = false,
  remixId,
  fromTemplate = false,
  embedded = false,
}: {
  initialDeviceId?: string;
  initialScreenApp?: string;
  openCalibrate?: boolean;
  openUpgradeOnLoad?: boolean;
  upgradePlan?: string;
  /** set when Dodo's hosted checkout redirected back here */
  checkoutReturn?: { subscriptionId?: string; status?: string };
  openCaptureOnLoad?: boolean;
  openPromoOnLoad?: boolean;
  openReplayOnLoad?: boolean;
  remixId?: string;
  /** a template page already loaded a scene, so skip the first-run picker */
  fromTemplate?: boolean;
  embedded?: boolean;
}) {
  const setScene = useSceneStore((s) => s.setScene);
  const updateLayer = useSceneStore((s) => s.updateLayer);
  const [toast, setToast] = useState<string | null>(null);
  const [promoOpen, setPromoOpen] = useState(false);
  const extensionCaptures = useRef(new Set<string>());

  // Promo video flow opens from the toolbar button (framekit:promo-open) or the
  // /editor?promo=1 deep link used by the landing page.
  useEffect(() => {
    const open = () => setPromoOpen(true);
    window.addEventListener("framekit:promo-open", open);
    return () => window.removeEventListener("framekit:promo-open", open);
  }, []);
  useEffect(() => {
    if (openPromoOnLoad) setPromoOpen(true);
  }, [openPromoOnLoad]);
  useEffect(() => {
    if (!remixId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/scene-share/${remixId}`);
        if (!res.ok) throw new Error("Share link not found");
        const j = await res.json();
        if (cancelled) return;
        const { restoreAssets } = await import("@/lib/assets");
        restoreAssets(j.assets ?? []);
        useViewStore.getState().bumpAssets();
        setScene(() => j.scene);
        window.dispatchEvent(new CustomEvent("framekit:toast", { detail: "Remixed — make it yours ✨" }));
      } catch {
        window.dispatchEvent(new CustomEvent("framekit:toast", { detail: "That share link could not be opened" }));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remixId]);

  useEffect(() => {
    if (!openReplayOnLoad) return;
    // wait for the screen scene injected by initialScreenApp to settle first
    const t = setTimeout(() => window.dispatchEvent(new CustomEvent("framekit:animate-open")), 700);
    return () => clearTimeout(t);
  }, [openReplayOnLoad]);

  useEffect(() => {
    track("editor_opened", { entry: initialDeviceId ? "device_page" : openCalibrate ? "calibrate" : "direct" });
    trackOnce("editor_first_open");
  }, [initialDeviceId, openCalibrate]);

  useEffect(() => {
    if (!embedded || window.parent === window) return;
    window.parent.postMessage({ source: "mockframe", type: "ready" }, "*");
  }, [embedded]);

  // user-created custom mockup devices: register the instant localStorage
  // copies first, then merge the account's cloud set (devices made on other
  // browsers appear; local-only ones get uploaded)
  useEffect(() => {
    loadCustomDevices();
    void syncCustomDevicesFromServer();
  }, []);

  // Deep-link: /editor?device=<id> (from the /mockups pSEO pages) opens a fresh
  // scene with that device selected. One-shot on mount — clears undo history so
  // the injected scene is the baseline, and drops the param so a later refresh
  // doesn't clobber the user's edits.
  useEffect(() => {
    if (!initialDeviceId) return;
    const scene = buildDeviceScene(initialDeviceId);
    if (!scene) return;
    useSceneStore.setState({ scene });
    useSceneStore.temporal.getState().clear();
    window.history.replaceState({}, "", "/editor");
  }, [initialDeviceId]);

  // Deep-link: /editor?screen=<app> (from the /tools chat-screen generator
  // pages) opens an iPhone pre-loaded with that app's default chat screen.
  useEffect(() => {
    if (!initialScreenApp || !isScreenApp(initialScreenApp)) return;
    const scene = buildScreenScene(initialScreenApp);
    if (!scene) return;
    useSceneStore.setState({ scene });
    useSceneStore.temporal.getState().clear();
    window.history.replaceState({}, "", "/editor");
  }, [initialScreenApp]);

  // /calibrate entry: open the custom-mockup calibration modal once the panels
  // have mounted, then drop the param so refresh doesn't reopen it
  useEffect(() => {
    if (!openCalibrate) return;
    const t = setTimeout(() => {
      window.dispatchEvent(new CustomEvent("framekit:open-custom-mockup"));
      window.history.replaceState({}, "", "/editor");
    }, 400);
    return () => clearTimeout(t);
  }, [openCalibrate]);

  useEffect(() => {
    if (!openUpgradeOnLoad && !openCaptureOnLoad) return;
    const timer = setTimeout(() => {
      if (openUpgradeOnLoad) window.dispatchEvent(new CustomEvent("framekit:upgrade", { detail: { plan: upgradePlan } }));
      if (openCaptureOnLoad) window.dispatchEvent(new CustomEvent("framekit:start-capture"));
      window.history.replaceState({}, "", "/editor");
    }, 450);
    return () => clearTimeout(timer);
  }, [openCaptureOnLoad, openUpgradeOnLoad, upgradePlan]);

  // Back from Dodo Payments' hosted checkout: confirm the subscription (verify
  // by id, then poll status while the webhook lands) and unlock Pro.
  const checkoutSubId = checkoutReturn?.subscriptionId;
  const checkoutStatus = checkoutReturn?.status;
  const isCheckoutReturn = !!checkoutReturn;
  useEffect(() => {
    if (!isCheckoutReturn) return;
    window.history.replaceState({}, "", "/editor");
    const say = (detail: string) => window.dispatchEvent(new CustomEvent("framekit:toast", { detail }));
    if (checkoutStatus === "failed" || checkoutStatus === "cancelled") {
      const t = setTimeout(() => say("Payment was not completed — you have not been charged"), 0);
      return () => clearTimeout(t);
    }
    let cancelled = false;
    // deferred so the toast listener (registered further down) is mounted
    const t = setTimeout(() => {
      say("Confirming your payment…");
      confirmCheckoutReturn(checkoutSubId ?? null).then((active) => {
        if (cancelled) return;
        if (active) {
          useViewStore.getState().setRemoveWatermark(true);
          say("You're Pro - welcome aboard");
        } else {
          say("Payment received — Pro unlocks as soon as it's confirmed. Refresh in a minute if it hasn't.");
        }
      });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [isCheckoutReturn, checkoutSubId, checkoutStatus]);

  // The batch is a list of independent scene documents. Keep the active shot
  // current without making the editor shell re-render for every control tweak.
  useEffect(() => {
    const batch = useShotBatchStore.getState();
    batch.ensure(useSceneStore.getState().scene);
    return useSceneStore.subscribe((state) => useShotBatchStore.getState().syncActive(state.scene));
  }, []);

  /* window-level paste + keyboard shortcuts */
  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith("image/"));
      const file = item?.getAsFile();
      if (!file) {
        // no image on the clipboard: paste layers copied with ⌘C, if any
        const t = e.target as HTMLElement | null;
        if (t?.matches?.("input, textarea, select, [contenteditable]") || !hasCopiedLayers()) return;
        e.preventDefault();
        const r = pasteLayers(useSceneStore.getState().scene);
        setScene(() => r.scene);
        useViewStore.setState({ selectedIds: r.ids });
        return;
      }
      const asset = await ingestFile(file);
      useViewStore.getState().bumpAssets();
      const r = placeAsset(useSceneStore.getState().scene, asset, {
        selectedId: useViewStore.getState().selectedIds.at(-1) ?? null,
      });
      setScene(() => r.scene);
      useViewStore.getState().select(r.layerId);
      useViewStore.getState().triggerEntrance(r.layerId);
      track("media_added", { source: "paste" });
      trackOnce("first_media_added", { source: "paste" });
    };

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const mod = e.metaKey || e.ctrlKey;

      // ⌘S saves even while typing in a field — otherwise the browser's
      // "save page" dialog hijacks the muscle memory
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        const notify = (msg: string) =>
          window.dispatchEvent(new CustomEvent("framekit:toast", { detail: msg }));
        saveCurrentDraft(useSceneStore.getState().scene).then(
          (r) => notify(`Saved “${r.name}” to Drafts`),
          () => notify("Couldn't save draft — local storage unavailable")
        );
        return;
      }
      if (target.matches("input, textarea, select")) return;
      const { selectedIds, select } = useViewStore.getState();
      const primary = selectedIds.at(-1) ?? null;

      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) sceneTemporal.getState().redo();
        else sceneTemporal.getState().undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault();
        useViewStore.setState({ selectedIds: useSceneStore.getState().scene.layers.map((l) => l.id) });
        return;
      }
      if (mod && (e.key.toLowerCase() === "c" || e.key.toLowerCase() === "x") && selectedIds.length) {
        // a text selection on the page keeps the browser's own copy
        if (window.getSelection()?.toString()) return;
        e.preventDefault();
        const n = copyLayers(useSceneStore.getState().scene, selectedIds);
        // replace whatever image sits on the system clipboard so ⌘V pastes these layers
        navigator.clipboard?.writeText("").catch(() => {});
        if (e.key.toLowerCase() === "x") {
          const removable = selectedIds.filter((id) => useSceneStore.getState().scene.layers.find((l) => l.id === id)?.type !== "mockup");
          setScene((s) => ({ ...s, layers: s.layers.filter((l) => !removable.includes(l.id)) }));
          useViewStore.setState({ selectedIds: selectedIds.filter((id) => !removable.includes(id)) });
        }
        window.dispatchEvent(new CustomEvent("framekit:toast", { detail: `${e.key.toLowerCase() === "x" ? "Cut" : "Copied"} ${n} element${n === 1 ? "" : "s"} · ⌘V to paste` }));
        return;
      }
      // ⌘] / ⌘[ step forward/back; with ⌥ jump to front/back
      if (mod && (e.key === "]" || e.key === "[" || e.code === "BracketRight" || e.code === "BracketLeft") && selectedIds.length) {
        e.preventDefault();
        const fwd = e.code === "BracketRight" || e.key === "]";
        if (e.altKey) runArrange(fwd ? "front" : "back");
        else setScene((s) => selectedIds.reduce((acc, id) => reorderLayer(acc, id, fwd ? 1 : -1), s));
        return;
      }
      // ⌥A/D/W/S align left/right/top/bottom, ⌥H/V center (Figma's keys)
      if (e.altKey && !mod && selectedIds.length) {
        const a = ({ KeyA: "left", KeyD: "right", KeyW: "top", KeyS: "bottom", KeyH: "center", KeyV: "middle" } as Record<string, ArrangeAction>)[e.code];
        if (a) {
          e.preventDefault();
          runArrange(e.shiftKey && (a === "center" || a === "middle") ? (a === "center" ? "dist-h" : "dist-v") : a);
          return;
        }
      }
      if (!mod && e.key === "?") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("framekit:shortcuts"));
        return;
      }
      if (mod && e.key.toLowerCase() === "d" && primary) {
        e.preventDefault();
        setScene((s) => duplicateLayer(s, primary));
        return;
      }
      // ⌘G groups the multi-selection; ⇧⌘G dissolves any group in it
      if (mod && e.key.toLowerCase() === "g") {
        e.preventDefault();
        const notify = (msg: string) =>
          window.dispatchEvent(new CustomEvent("framekit:toast", { detail: msg }));
        if (e.shiftKey) {
          setScene((s) => ungroupLayers(s, selectedIds));
          notify("Ungrouped");
        } else if (selectedIds.length >= 2) {
          setScene((s) => groupLayers(s, selectedIds));
          notify(`Grouped ${selectedIds.length} elements — they now select & move together (⇧⌘G to ungroup)`);
        } else {
          notify("Shift-click 2+ elements first, then ⌘G to group them");
        }
        return;
      }
      // panel shortcuts — deliberately modifier-free so they behave identically
      // on Mac and Windows (user report: panel shortcuts misconfigured on Mac)
      if (!mod && !e.altKey) {
        const panel = { e: "emoji", t: "themes", a: "annotate" }[e.key.toLowerCase()];
        if (panel) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("framekit:open-panel", { detail: panel }));
          return;
        }
      }
      if (selectedIds.length === 0) return;
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        // mockups are never deleted from the canvas — only their screenshot is
        // cleared (removing a device lives in the Layers panel)
        const scene = useSceneStore.getState().scene;
        const kept: string[] = [];
        for (const id of selectedIds) {
          const layer = scene.layers.find((l) => l.id === id);
          if (!layer) continue;
          if (layer.type === "mockup") {
            if (layer.media) updateLayer(id, (l) => ({ ...l, media: null }));
            kept.push(id);
          } else {
            setScene((s) => removeLayer(s, id));
          }
        }
        useViewStore.setState({ selectedIds: kept });
        return;
      }
      if (e.key === "Escape") {
        select(null);
        return;
      }
      const nudge = e.shiftKey ? 10 : 1;
      const dirs: Record<string, [number, number]> = {
        ArrowLeft: [-nudge, 0],
        ArrowRight: [nudge, 0],
        ArrowUp: [0, -nudge],
        ArrowDown: [0, nudge],
      };
      const d = dirs[e.key];
      if (d) {
        e.preventDefault();
        setScene((s) => ({
          ...s,
          layers: s.layers.map((l) =>
            selectedIds.includes(l.id)
              ? { ...l, transform: { ...l.transform, x: l.transform.x + d[0], y: l.transform.y + d[1] } }
              : l
          ),
        }));
      }
    };

    window.addEventListener("paste", onPaste);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("keydown", onKey);
    };
  }, [setScene, updateLayer]);

  // Chrome extension handoff. The content script can only post on our own
  // origin; payloads are bounded and must be image data URLs before ingestion.
  useEffect(() => {
    const receiveCapture = async (event: MessageEvent) => {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const payload = event.data as { source?: string; type?: string; id?: string; dataUrl?: string; name?: string };
      if (payload?.source !== "mockframe-extension" || payload.type !== "capture") return;
      if (!payload.id || extensionCaptures.current.has(payload.id)) return;
      if (typeof payload.dataUrl !== "string" || !payload.dataUrl.startsWith("data:image/") || payload.dataUrl.length > 25_000_000) return;
      extensionCaptures.current.add(payload.id);
      try {
        const blob = await fetch(payload.dataUrl).then((response) => response.blob());
        const file = new File([blob], payload.name?.slice(0, 120) || "browser-capture.png", { type: blob.type || "image/png" });
        const asset = await ingestFile(file);
        useViewStore.getState().bumpAssets();
        const result = placeAsset(useSceneStore.getState().scene, asset, { selectedId: useViewStore.getState().selectedIds.at(-1) ?? null });
        setScene(() => result.scene);
        useViewStore.getState().select(result.layerId);
        useViewStore.getState().triggerEntrance(result.layerId);
        track("media_added", { source: "chrome_extension" });
        trackOnce("first_media_added", { source: "chrome_extension" });
        window.postMessage({ source: "mockframe-page", type: "capture-accepted", id: payload.id }, window.location.origin);
        window.history.replaceState({}, "", "/editor");
        window.dispatchEvent(new CustomEvent("framekit:toast", { detail: "Tab captured - ready to style" }));
      } catch {
        extensionCaptures.current.delete(payload.id);
        window.dispatchEvent(new CustomEvent("framekit:toast", { detail: "The extension capture could not be opened" }));
      }
    };
    window.addEventListener("message", receiveCapture);
    return () => window.removeEventListener("message", receiveCapture);
  }, [setScene]);

  /* toasts raised elsewhere (toolbar, ⌘S) surface through the same pill */
  useEffect(() => {
    const onToast = (e: Event) => {
      const msg = (e as CustomEvent<string>).detail;
      if (msg) {
        setToast(msg);
        setTimeout(() => setToast(null), 3200);
      }
    };
    window.addEventListener("framekit:toast", onToast);
    return () => window.removeEventListener("framekit:toast", onToast);
  }, []);

  return (
    <div className="relative h-dvh overflow-hidden">
      {/* the canvas fills everything; panels float above it */}
      <CanvasStage />

      <div className="pointer-events-none absolute inset-3 z-20">
        {/* top row */}
        {!embedded && <div className="absolute left-0 top-0"><LogoChip /></div>}
        <div className="absolute left-1/2 top-0 -translate-x-1/2">
          <Toolbar />
        </div>

        {/* side panels */}
        <div className="absolute bottom-0 left-0 top-16 flex items-start">
          <LeftPanel />
        </div>
        <div className="absolute bottom-0 right-0 top-16 flex items-start">
          <RightPanel />
        </div>

        {/* bottom toolbar (reset / position / 3D / emoji) + animate */}
        <div className="pointer-events-auto absolute bottom-1 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
          <ShotStrip />
          <div className="flex items-end gap-2">
            <BottomBar />
            <AnimatePanel />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            // top centre, under the toolbar: the bottom belongs to the filmstrip,
            // the bottom bar and the post-export nudge, which would cover it
            className="fk-card pointer-events-none absolute left-1/2 top-[76px] z-[70] max-w-[min(560px,92vw)] -translate-x-1/2 rounded-full px-5 py-2.5 text-center text-[13px] font-medium text-[#17171c]"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {promoOpen && <PromoPanel onClose={() => setPromoOpen(false)} />}
      <MobileGate embedded={embedded} />
      <ExportNextSteps />
      <ShortcutsSheet />
      <StarterModal
        embedded={embedded}
        deepLinked={Boolean(initialDeviceId || initialScreenApp || openCalibrate || openUpgradeOnLoad || openCaptureOnLoad || openPromoOnLoad || openReplayOnLoad || remixId || fromTemplate)}
      />
    </div>
  );
}
```

### `apps/web/components/editor/Toolbar.tsx`

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence } from "motion/react";
import {
  ArrowDown,
  ArrowUp,
  Box,
  Clapperboard,
  Palette,
  Copy,
  Ellipsis,
  Keyboard,
  FolderOpen,
  Image as ImageIcon,
  Layers,
  Maximize,
  PanelsTopLeft,
  Redo2,
  RotateCcw,
  Sparkles,
  Squircle,
  Trash2,
  Type,
  Undo2,
} from "lucide-react";
import { AccountButton } from "@/components/AccountButton";
import { BrandMark } from "@/components/marketing/BrandMark";
import { BrandKitPanel } from "./BrandKitPanel";
import { ingestFile, resolveAsset } from "@/lib/assets";
import { useDraftsUi } from "@/lib/drafts";
import { addAppIcon, addText, duplicateLayer, removeLayer, reorderLayer } from "@/lib/sceneOps";
import { sceneTemporal, useSceneStore, useViewStore } from "@/lib/store";
import { DraftsPanel } from "./DraftsPanel";
import { ShotBatchPanel } from "./ShotBatchPanel";
import { RealisticRenderPanel } from "./RealisticRenderPanel";
import { IconButton, Popover } from "./ui";

/** Surface a message via EditorShell's toast (same event pattern as framekit:fit). */
export function toast(msg: string) {
  window.dispatchEvent(new CustomEvent("framekit:toast", { detail: msg }));
}

type MorePanel = null | "menu" | "drafts" | "brand" | "batch";

export function Toolbar() {
  const scene = useSceneStore((s) => s.scene);
  const setScene = useSceneStore((s) => s.setScene);
  const resetScene = useSceneStore((s) => s.resetScene);
  const select = useViewStore((s) => s.select);
  const setActiveLayout = useViewStore((s) => s.setActiveLayout);
  const setStep = useViewStore((s) => s.setStep);
  const bumpAssets = useViewStore((s) => s.bumpAssets);
  const threeD = useViewStore((s) => s.threeD);
  const setThreeD = useViewStore((s) => s.setThreeD);

  const [hist, setHist] = useState({ canUndo: false, canRedo: false });
  const [layersOpen, setLayersOpen] = useState(false);
  const [renderOpen, setRenderOpen] = useState(false);
  // secondary tools live behind one "More" button so the bar stays calm
  const [more, setMore] = useState<MorePanel>(null);
  const layersRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const read = () => {
      const t = sceneTemporal.getState();
      setHist({ canUndo: t.pastStates.length > 0, canRedo: t.futureStates.length > 0 });
    };
    read();
    return sceneTemporal.subscribe(read);
  }, []);

  // the filmstrip under the canvas opens the batch panel to export every shot
  useEffect(() => {
    const open = () => setMore("batch");
    window.addEventListener("framekit:open-batch", open);
    return () => window.removeEventListener("framekit:open-batch", open);
  }, []);

  useEffect(() => {
    if (!layersOpen && !more) return;
    const onDown = (e: MouseEvent) => {
      if (layersOpen && !layersRef.current?.contains(e.target as Node)) setLayersOpen(false);
      if (more && !moreRef.current?.contains(e.target as Node)) setMore(null);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [layersOpen, more]);

  const startOver = () => {
    resetScene();
    select(null);
    setActiveLayout(null);
    setStep("content");
    useDraftsUi.getState().setCurrent(null); // fresh canvas, no longer "is" a draft
  };

  const MENU: { icon: React.ReactNode; label: string; hint: string; pro?: boolean; run: () => void }[] = [
    { icon: <FolderOpen size={15} />, label: "Drafts", hint: "Open saved scenes (⌘S saves)", run: () => setMore("drafts") },
    { icon: <PanelsTopLeft size={15} />, label: "Shot batch", hint: "Style many images, export one ZIP", run: () => setMore("batch") },
    { icon: <Palette size={15} />, label: "Brand kit", hint: "Your colours and logo everywhere", run: () => setMore("brand") },
    { icon: <Sparkles size={15} />, label: "Realistic render", hint: "Photo-real device shots", pro: true, run: () => { setMore(null); setRenderOpen(true); } },
    { icon: <Clapperboard size={15} />, label: "Promo video", hint: "Animated app ad", pro: true, run: () => { setMore(null); window.dispatchEvent(new CustomEvent("framekit:promo-open")); } },
    { icon: <Clapperboard size={15} />, label: "Motion presets", hint: "Float, orbit, reveal → MP4 / GIF", run: () => { setMore(null); window.dispatchEvent(new CustomEvent("framekit:animate-open")); } },
    { icon: <Keyboard size={15} />, label: "Shortcuts", hint: "Align, distribute, copy/paste (?)", run: () => { setMore(null); window.dispatchEvent(new CustomEvent("framekit:shortcuts")); } },
    { icon: <RotateCcw size={15} />, label: "Start over", hint: "Clear the canvas", run: () => { setMore(null); startOver(); } },
  ];

  return (
    <>
    <div className="fk-card pointer-events-auto flex items-center gap-1 rounded-2xl px-2 py-1.5">
      <IconButton title="Undo (⌘Z)" onClick={() => sceneTemporal.getState().undo()} disabled={!hist.canUndo}>
        <Undo2 size={16} />
      </IconButton>
      <IconButton title="Redo (⇧⌘Z)" onClick={() => sceneTemporal.getState().redo()} disabled={!hist.canRedo}>
        <Redo2 size={16} />
      </IconButton>

      <div className="mx-1 h-5 w-px bg-[#e4e4ec]" />

      <IconButton
        title="Add text"
        onClick={() => {
          const r = addText(scene);
          setScene(() => r.scene);
          select(r.layerId);
        }}
      >
        <Type size={16} />
      </IconButton>

      <IconButton title="Add app icon (App Store / Play Store)" onClick={() => iconRef.current?.click()}>
        <Squircle size={16} />
      </IconButton>
      <input
        ref={iconRef}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const a = await ingestFile(f);
          bumpAssets();
          const r = addAppIcon(useSceneStore.getState().scene, a.id);
          setScene(() => r.scene);
          select(r.layerId);
          e.target.value = "";
        }}
      />

      <div className="relative" ref={layersRef}>
        <IconButton title="Layers" onClick={() => setLayersOpen((v) => !v)} active={layersOpen}>
          <Layers size={16} />
        </IconButton>
        <AnimatePresence>
          {layersOpen && (
            <Popover className="right-0 top-[calc(100%+10px)] w-64 p-2 -mr-14">
              <LayerRows onClose={() => setLayersOpen(false)} />
            </Popover>
          )}
        </AnimatePresence>
      </div>

      <IconButton title="Fit to view" onClick={() => window.dispatchEvent(new CustomEvent("framekit:fit"))}>
        <Maximize size={15} />
      </IconButton>

      <div className="mx-1 h-5 w-px bg-[#e4e4ec]" />

      <button
        onClick={() => setThreeD(!threeD)}
        title="3D rotate — drag a device on the canvas to tilt it in space"
        className={`fk-press flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold ${
          threeD ? "bg-[#17171c] text-white" : "text-[#17171c] hover:bg-[#17171c]/6"
        }`}
      >
        <Box size={14} />
        3D
      </button>

      <div className="relative" ref={moreRef}>
        <IconButton title="More tools" onClick={() => setMore((m) => (m ? null : "menu"))} active={!!more}>
          <Ellipsis size={16} />
        </IconButton>
        <AnimatePresence>
          {more === "menu" && (
            <Popover className="right-0 top-[calc(100%+10px)] w-64 p-1.5">
              {MENU.map((m) => (
                <button
                  key={m.label}
                  onClick={m.run}
                  className="fk-press flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left hover:bg-[#17171c]/5"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f2f2f6] text-[#3f3f48]">{m.icon}</span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#17171c]">
                      {m.label}
                      {m.pro && <span className="rounded-full bg-[#ede9fe] px-1.5 py-px text-[9px] font-bold text-[#6d28d9]">Pro</span>}
                    </span>
                    <span className="block truncate text-[11px] text-[#8a8a94]">{m.hint}</span>
                  </span>
                </button>
              ))}
            </Popover>
          )}
          {more === "drafts" && (
            <Popover className="right-0 top-[calc(100%+10px)] p-2">
              <DraftsPanel onClose={() => setMore(null)} onToast={toast} />
            </Popover>
          )}
          {more === "batch" && (
            <Popover className="right-0 top-[calc(100%+10px)] p-0">
              <ShotBatchPanel onToast={toast} />
            </Popover>
          )}
          {more === "brand" && (
            <Popover className="right-0 top-[calc(100%+10px)] p-0">
              <BrandKitPanel onToast={toast} />
            </Popover>
          )}
        </AnimatePresence>
      </div>
    </div>
    {renderOpen && <RealisticRenderPanel onClose={() => setRenderOpen(false)} onToast={toast} />}
    </>
  );
}

export function LogoChip() {
  return (
    <div className="fk-card pointer-events-auto flex items-center gap-1 rounded-2xl px-2.5 py-1.5">
      <Link href="/" target="_blank" rel="noopener" aria-label="MockFrame home (new tab)" className="flex items-center gap-2 pr-1">
        <BrandMark size={28} />
        <span className="text-[14px] font-bold tracking-tight text-[#17171c]">MockFrame</span>
      </Link>
      <button
        onClick={() => window.dispatchEvent(new CustomEvent("framekit:starter-open"))}
        className="fk-press ml-0.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-[#6b6b76] hover:bg-black/[0.06] hover:text-[#17171c]"
      >
        Create
      </button>
      <Link
        href="/templates"
        target="_blank"
        rel="noopener"
        className="fk-press ml-0.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-[#6b6b76] hover:bg-black/[0.06] hover:text-[#17171c]"
      >
        Templates
      </Link>
      <Link
        href="/dashboard"
        target="_blank"
        rel="noopener"
        className="fk-press rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-[#6b6b76] hover:bg-black/[0.06] hover:text-[#17171c]"
      >
        My scenes
      </Link>
      <AccountButton />
    </div>
  );
}

function LayerRows({ onClose }: { onClose: () => void }) {
  const scene = useSceneStore((s) => s.scene);
  const setScene = useSceneStore((s) => s.setScene);
  const selectedIds = useViewStore((s) => s.selectedIds);
  const select = useViewStore((s) => s.select);
  const ordered = [...scene.layers].reverse();

  if (ordered.length === 0)
    return <p className="px-3 py-4 text-center text-xs text-[#9a9aa4]">No layers yet.</p>;

  return (
    <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
      {ordered.map((l) => {
        const label =
          l.type === "text"
            ? l.content.slice(0, 20) || "Text"
            : l.type === "mockup"
              ? (l.deviceId ?? "Screenshot")
              : "Sticker";
        const thumb = l.type === "mockup" && l.media ? resolveAsset(l.media.assetId)?.url : undefined;
        return (
          <div
            key={l.id}
            onClick={() => {
              select(l.id);
              onClose();
            }}
            className={`fk-press flex cursor-pointer items-center gap-2 rounded-xl border px-2 py-1.5 ${
              selectedIds.includes(l.id) ? "border-[#17171c] bg-[#f4f4f8]" : "border-transparent hover:bg-[#f4f4f8]"
            }`}
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-md bg-[#ececf2] text-[#8a8a94]">
              {thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb} alt="" className="h-full w-full object-cover" />
              ) : l.type === "text" ? (
                <Type size={12} />
              ) : (
                <ImageIcon size={12} />
              )}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-[#17171c]">{label}</span>
            <span className="flex shrink-0 text-[#9a9aa4]">
              {(
                [
                  ["Forward", ArrowUp, () => setScene((s) => reorderLayer(s, l.id, 1))],
                  ["Backward", ArrowDown, () => setScene((s) => reorderLayer(s, l.id, -1))],
                  ["Duplicate", Copy, () => setScene((s) => duplicateLayer(s, l.id))],
                  [
                    "Delete",
                    Trash2,
                    () => {
                      setScene((s) => removeLayer(s, l.id));
                      if (selectedIds.includes(l.id)) select(null);
                    },
                  ],
                ] as const
              ).map(([title, Icon, fn]) => (
                <button
                  key={title}
                  title={title}
                  className="fk-press rounded-md p-1 hover:bg-black/6 hover:text-[#17171c]"
                  onClick={(e) => {
                    e.stopPropagation();
                    fn();
                  }}
                >
                  <Icon size={12} />
                </button>
              ))}
            </span>
          </div>
        );
      })}
    </div>
  );
}
```

### `apps/web/components/editor/StepFlow.tsx`

```tsx
"use client";

import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Clapperboard, Copy, Download, FolderDown, Link2, SlidersHorizontal, Wand2 } from "lucide-react";
import { saveCurrentDraft } from "@/lib/drafts";
import { type EditorStep, useSceneStore, useViewStore } from "@/lib/store";

export const STEPS: { id: EditorStep; label: string; hint: string }[] = [
  { id: "content", label: "Content", hint: "Add your screen" },
  { id: "style", label: "Style", hint: "Background & look" },
  { id: "export", label: "Export", hint: "Download or share" },
];

/** True once the scene has something of the user's own in it. */
function useHasContent(): boolean {
  return useSceneStore((s) =>
    s.scene.layers.some((l) => (l.type === "mockup" && !!l.media) || l.type === "text" || l.type === "sticker")
  );
}

/** The guided-flow header that replaces the old Mockup/Frame tabs. */
export function StepNav() {
  const step = useViewStore((s) => s.step);
  const setStep = useViewStore((s) => s.setStep);
  const hasContent = useHasContent();
  const current = STEPS.findIndex((s) => s.id === step);

  return (
    <nav aria-label="Editor steps" className="mb-3">
      <ol className="relative grid grid-cols-3 gap-1 rounded-2xl bg-[#ececf2] p-1">
        {STEPS.map((s, i) => {
          const active = s.id === step;
          const done = !active && (i < current || (s.id === "content" && hasContent));
          return (
            <li key={s.id} className="relative">
              <button
                type="button"
                aria-current={active ? "step" : undefined}
                onClick={() => setStep(s.id)}
                className={`fk-press relative flex w-full items-center justify-center gap-1.5 rounded-xl px-1.5 py-2 text-[12px] font-semibold ${
                  active ? "text-[#17171c]" : "text-[#7d7d88] hover:text-[#3f3f48]"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="step-pill"
                    className="absolute inset-0 z-0 rounded-xl bg-white shadow-[0_1px_4px_rgba(20,20,40,0.12)]"
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  />
                )}
                <span
                  className={`relative z-10 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                    done ? "bg-emerald-500 text-white" : active ? "bg-[#17171c] text-white" : "bg-[#d9d9e2] text-[#6b6b76]"
                  }`}
                >
                  {done ? <Check size={11} strokeWidth={3} /> : i + 1}
                </span>
                <span className="relative z-10">{s.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 px-1 text-[11px] text-[#8a8a94]">
        Step {current + 1} of 3 · {STEPS[current].hint}
      </p>
    </nav>
  );
}

/** Back / Next pinned to the bottom of the step panel. */
export function StepFooter() {
  const step = useViewStore((s) => s.step);
  const setStep = useViewStore((s) => s.setStep);
  const hasContent = useHasContent();
  const i = STEPS.findIndex((s) => s.id === step);
  const prev = STEPS[i - 1];
  const next = STEPS[i + 1];
  if (!next && !prev) return null;
  // nudge the user onward once their first screen has landed
  const nudge = step === "content" && hasContent;

  return (
    <div className="sticky bottom-0 z-10 mt-auto flex items-center gap-2 border-t border-[#ececf2] bg-[var(--card)] px-3 pb-1 pt-3">
      {prev && (
        <button
          type="button"
          onClick={() => setStep(prev.id)}
          className="fk-press flex h-9 items-center gap-1 rounded-xl px-3 text-[12.5px] font-semibold text-[#5a5a66] hover:bg-[#17171c]/5"
        >
          <ArrowLeft size={14} /> Back
        </button>
      )}
      {next && (
        <button
          type="button"
          onClick={() => setStep(next.id)}
          className={`fk-press ml-auto flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#17171c] px-3 text-[12.5px] font-semibold text-white hover:bg-black ${
            nudge ? "fk-nudge" : ""
          }`}
        >
          Next: {next.label} <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}

/* The export step reuses the right panel's export pipeline (watermark, Pro
   gates, format/scale settings) instead of duplicating it: these buttons
   trigger the same controls by id/title. */
function clickControl(selector: string) {
  (document.querySelector(selector) as HTMLButtonElement | null)?.click();
}

export function ExportStep() {
  const scene = useSceneStore((s) => s.scene);
  const notify = (msg: string) => window.dispatchEvent(new CustomEvent("framekit:toast", { detail: msg }));

  return (
    <div className="px-3">
      <div className="rounded-2xl border border-[#e6e6ee] bg-gradient-to-b from-white to-[#f6f6fa] p-3.5">
        <p className="text-[14px] font-semibold tracking-[-0.01em] text-[#17171c]">Your mockup is ready</p>
        <p className="mt-0.5 text-[11.5px] leading-snug text-[#85858f]">
          {scene.canvas.width} × {scene.canvas.height} canvas. Pick a format and size in settings, then download.
        </p>
        <button
          type="button"
          onClick={() => clickControl("#editor-export")}
          className="fk-press mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#17171c] text-[13.5px] font-semibold text-white shadow-[0_6px_20px_rgba(23,23,28,0.25)] hover:bg-black"
        >
          <Download size={15} /> Download image
        </button>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => clickControl('[title="Copy to clipboard"]')}
            className="fk-press flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#e4e4ec] bg-white text-[12px] font-semibold text-[#31313a] hover:border-[#c9c9d4]"
          >
            <Copy size={13} /> Copy
          </button>
          <button
            type="button"
            onClick={() => clickControl('[title="Export settings"]')}
            className="fk-press flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#e4e4ec] bg-white text-[12px] font-semibold text-[#31313a] hover:border-[#c9c9d4]"
          >
            <SlidersHorizontal size={13} /> Settings
          </button>
        </div>
      </div>

      <h3 className="mb-2 mt-5 px-1 text-[11px] font-semibold uppercase tracking-wider text-[#8a8a94]">More ways to use it</h3>
      <div className="flex flex-col gap-1.5">
        <ExportRow
          icon={<Clapperboard size={15} />}
          title="Animate as video"
          body="Turn this scene into an MP4 or GIF."
          onClick={() => window.dispatchEvent(new CustomEvent("framekit:animate-open"))}
        />
        <ExportRow
          icon={<Link2 size={15} />}
          title="Share a remix link"
          body="Anyone with the link can open and edit a copy."
          onClick={() => clickControl('[title^="Copy a remix link"]')}
        />
        <ExportRow
          icon={<FolderDown size={15} />}
          title="Save to drafts"
          body="Keep working on it later (⌘S)."
          onClick={() =>
            saveCurrentDraft(useSceneStore.getState().scene).then(
              (r) => notify(`Saved “${r.name}” to Drafts`),
              () => notify("Couldn't save draft — local storage unavailable")
            )
          }
        />
        <ExportRow
          icon={<Wand2 size={15} />}
          title="App promo video"
          badge="Pro"
          body="An animated ad built from your screenshots."
          onClick={() => window.dispatchEvent(new CustomEvent("framekit:promo-open"))}
        />
      </div>
    </div>
  );
}

function ExportRow({
  icon,
  title,
  body,
  badge,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fk-tile flex items-center gap-3 rounded-xl border border-[#ececf2] bg-white p-2.5 text-left hover:border-[#d6d6e0]"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f2f2f6] text-[#3f3f48]">{icon}</span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#17171c]">
          {title}
          {badge && <span className="rounded-full bg-[#ede9fe] px-1.5 py-px text-[9px] font-bold text-[#6d28d9]">{badge}</span>}
        </span>
        <span className="block truncate text-[11px] text-[#8a8a94]">{body}</span>
      </span>
    </button>
  );
}
```
