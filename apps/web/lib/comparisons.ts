/*
 * "<Competitor> alternative" pages at /compare/<slug>.
 *
 * Rules for editing these:
 * - Competitor claims come only from the competitor's own public pages, and
 *   each entry records when they were checked (`checked`). Re-verify before
 *   making a claim more specific; prices change and pages lie by omission.
 * - Say where the competitor is genuinely better. A comparison page that never
 *   concedes anything reads as an ad, converts worse and earns no links.
 * - MockFrame claims must match components/marketing/PlanComparison.tsx and
 *   lib/billing/plans.ts.
 */

export interface ComparisonRow {
  dim: string;
  mockframe: string;
  them: string;
}

export interface Comparison {
  slug: string;
  /** competitor's display name */
  name: string;
  /** competitor's site, shown in the disclaimer */
  site: string;
  /** month the competitor details were verified, e.g. "October 2026" */
  checked: string;
  title: string;
  description: string;
  keywords: string[];
  h1: string;
  intro: string;
  rows: ComparisonRow[];
  pickMockframe: string[];
  pickThem: string[];
  switching: string;
  faq: { q: string; a: string }[];
  /** primary call to action */
  cta: { href: string; label: string };
  related: [href: string, label: string][];
}

const MOCKFRAME_PRICE = "Free plan with no watermark; Pro is $9.99 a month or $59.99 a year.";

export const COMPARISONS: Comparison[] = [
  {
    slug: "appscreens",
    name: "AppScreens",
    site: "appscreens.com",
    checked: "July 2026",
    title: "AppScreens Alternative: Free Store Screenshots",
    description:
      "AppScreens vs MockFrame for App Store screenshots: pricing, AI captions, export workflow and what's free, compared side by side.",
    keywords: ["appscreens alternative", "appscreens app store screenshot generator", "app store screenshot generator", "free app store screenshot generator", "appscreens vs mockframe"],
    h1: "AppScreens alternative: MockFrame for App Store screenshots",
    intro:
      "AppScreens is one of the most established App Store screenshot generators, and if you sell into many storefronts it earns its subscription. MockFrame takes a different angle: get an indie developer or small team from raw simulator captures to a submission-ready zip — every required Apple and Google size, framed and captioned — in a few minutes, with your first full pack free to export and AI that writes the set for you from a one-sentence description.",
    rows: [
      {
        dim: "Getting a full set out",
        mockframe: "Upload 3–10 raw screenshots, pick a style, download one zip with every required Apple and Google size plus a README that says what uploads where.",
        them: "Template-based editor with responsive scaling across device sizes; exports per configured display.",
      },
      {
        dim: "Free tier",
        mockframe: "Design and preview everything free; your first full pack export is free with a free account.",
        them: "Free tier for trying the editor; full-resolution output is part of the paid plans.",
      },
      { dim: "Paid pricing", mockframe: MOCKFRAME_PRICE, them: "Subscription plans aimed at teams shipping regularly (see appscreens.com for current pricing)." },
      {
        dim: "AI assistance",
        mockframe: "Describe your app in one sentence and the AI generator plans the conversion narrative, writes every caption and lays out concept screens you swap your real shots into.",
        them: "AI-assisted captioning and restyling inside the template editor.",
      },
      {
        dim: "Localization",
        mockframe: "Pro translates every caption into any of 39 store languages with AI and exports one folder per language (or a fastlane layout).",
        them: "Bulk auto-localization across dozens of languages is a headline feature.",
      },
      { dim: "Stores covered", mockframe: "Apple App Store and Google Play, including the Play feature graphic.", them: "Apple and Google plus additional storefronts such as Microsoft and Amazon." },
      {
        dim: "Beyond store screenshots",
        mockframe: "Same editor makes device mockups, chat screenshots, code shots, X post images, screen recordings and app promo videos.",
        them: "Focused specifically on store screenshots.",
      },
    ],
    pickMockframe: [
      "You ship to Apple and Google and want one zip with every required size, captioned and framed.",
      "You want AI to draft the whole screenshot narrative before you touch an editor.",
      "You’d rather pay under $10 a month, and try a full pack free before paying.",
      "You also need device mockups, chat screenshots or an app promo video for launch.",
    ],
    pickThem: [
      "You publish to storefronts beyond Apple and Google, like Microsoft or Amazon.",
      "You maintain a large template library across a bigger team.",
      "Localization is your main job and you want the most mature tooling for it.",
    ],
    switching:
      "There’s nothing to migrate — store screenshots are rebuilt from your raw captures either way. Drop 3–10 plain screenshots into the pack studio, pick one of the marketing styles, caption each screen (or let the AI generator write them), and export the zip. Your first full pack is free, so you can compare finished output against your current set before changing anything.",
    faq: [
      {
        q: "Is MockFrame a free AppScreens alternative?",
        a: "You can try it free: designing and previewing is free, and your first full pack export — every required App Store and Google Play size in one zip — is free with a free account. That first pack is licensed for one real store release; further packs and other commercial use need the Pro license, which starts at under $10 a month.",
      },
      {
        q: "What does MockFrame do that AppScreens doesn't?",
        a: "The AI pack generator designs a full screenshot narrative from a one-sentence description of your app — captions, layout and concept screens — before you've opened an editor. And because MockFrame is a general mockup studio, the same subscription covers device mockups, chat screenshots, screen recordings and app promo videos, not only store screenshots.",
      },
      {
        q: "When is AppScreens the better choice?",
        a: "If you publish to storefronts beyond Apple and Google, such as Microsoft and Amazon, AppScreens covers them and MockFrame doesn't. Teams that live in a large shared template library may also prefer it.",
      },
      {
        q: "Can MockFrame localize my screenshots?",
        a: "Yes. Pro translates captions into any of 39 store languages with AI and exports a folder per language, or a fastlane deliver/supply layout. On the free plan you can type translated captions in yourself.",
      },
      {
        q: "Can I try MockFrame without an account?",
        a: "Yes. The pack studio is open — upload screenshots, pick a style and preview the whole set without signing in. An account is only needed when you export.",
      },
    ],
    cta: { href: "/app-store-screenshots", label: "Try the screenshot generator" },
    related: [
      ["/app-store-screenshots", "App Store screenshot generator"],
      ["/ai", "AI app screenshot generator"],
      ["/tools/app-promo-video-maker", "App promo video maker"],
      ["/mockups", "Device mockup generators"],
      ["/guides/design-app-store-screenshots", "Guide: design a screenshot set"],
      ["/pricing", "MockFrame pricing"],
    ],
  },
  {
    slug: "previewed",
    name: "Previewed",
    site: "previewed.app",
    checked: "October 2026",
    title: "Previewed Alternative: Mockups Without the 720p Cap",
    description:
      "Previewed vs MockFrame: free export resolution, licensing, 3D and video, App Store screenshot sets and pricing, compared honestly.",
    keywords: ["previewed alternative", "previewed app alternative", "previewed vs mockframe", "free mockup generator", "app mockup generator", "previewed.app"],
    h1: "Previewed alternative: MockFrame for app mockups and store screenshots",
    intro:
      "Previewed is a polished browser mockup tool whose standout is real 3D: rotate a device, light it, and animate it for a promo video. MockFrame is built around a different job — taking your screenshots to finished launch assets fast. The free plan exports full-resolution images with no watermark, the store pack generator outputs every required App Store and Google Play size in one zip, and Pro costs about half of Previewed's subscription.",
    rows: [
      {
        dim: "Free plan",
        mockframe: "Every device frame, the full editor and image export up to 3× resolution — no watermark. Personal-use license.",
        them: "Lite: unlimited 2D exports at 720p under a CC attribution license.",
      },
      {
        dim: "Paid pricing",
        mockframe: MOCKFRAME_PRICE,
        them: "Plus: $9.99 one-time for 10 exports at 1080p+. Pro: $19 a month, billed $228 a year.",
      },
      {
        dim: "Commercial use",
        mockframe: "Included with Pro.",
        them: "Included with Plus and Pro.",
      },
      {
        dim: "3D",
        mockframe: "Photoreal photographed-device scenes and perspective tilt; no free-camera 3D.",
        them: "Real 3D snapshots and 3D animation scenes with camera and environment controls — its signature feature.",
      },
      {
        dim: "Video",
        mockframe: "Pro: animated scenes and promo videos at 60 fps up to 4K, plus a screen recorder with automatic zoom.",
        them: "Video export at 30 fps on Plus and 60 fps on Pro.",
      },
      {
        dim: "App Store screenshots",
        mockframe: "Pack generator: one design exported to every required Apple and Google Play size, captions in 39 languages with AI on Pro, fastlane-ready zip.",
        them: "Panoramic App Store and Google Play screenshot templates in the same editor.",
      },
      {
        dim: "Other formats",
        mockframe: "Chat screenshots, code shots, X post images, website capture, a render API and an MCP server.",
        them: "Social posts, promo banners and web browser mockups.",
      },
      {
        dim: "Teams",
        mockframe: "Pro includes saved templates and a shared team library.",
        them: "Invite team members to shared mockup groups; templates backed up in the cloud.",
      },
    ],
    pickMockframe: [
      "You want full-resolution, unwatermarked exports on the free plan.",
      "You need a complete App Store and Google Play screenshot set in every required size.",
      "You'd rather pay $9.99 a month (or $59.99 a year) than $228 a year.",
      "You also make chat screenshots, screen recordings or want an API for automation.",
    ],
    pickThem: [
      "You want true 3D: free camera angles, lighting and animated 3D device scenes.",
      "You only need ten high-resolution exports and prefer a one-time $9.99 payment.",
      "Your main output is a 3D app promo video rather than store screenshots.",
    ],
    switching:
      "Nothing to migrate: mockups are rebuilt from your original screenshots. Open the editor, drop a screenshot onto any device, pick a background and export — no account needed to try it. For store listings, upload your screens to the pack studio and download every required size in one zip.",
    faq: [
      {
        q: "Is MockFrame a free Previewed alternative?",
        a: "Yes. MockFrame's free plan includes every device frame and the full editor, and exports images up to 3× resolution with no watermark. Previewed's free Lite plan exports at 720p under a Creative Commons attribution license.",
      },
      {
        q: "Does MockFrame do 3D mockups like Previewed?",
        a: "Not in the same way. MockFrame has photoreal scenes of photographed devices and perspective tilt, but no free-camera 3D or animated 3D scenes. If true 3D is what you need, Previewed is the better tool.",
      },
      {
        q: "How do the prices compare?",
        a: "MockFrame Pro is $9.99 a month or $59.99 a year. Previewed Pro is $19 a month billed $228 a year, and Previewed also sells a $9.99 one-time Plus plan with ten 1080p+ exports (as listed on previewed.app in October 2026).",
      },
      {
        q: "Can I use MockFrame mockups commercially?",
        a: "Yes, on Pro, which includes a commercial license. The free plan is for personal use, apart from your first store pack, which can ship in one real release.",
      },
    ],
    cta: { href: "/editor", label: "Open the mockup editor" },
    related: [
      ["/mockups", "Device mockup generators"],
      ["/app-store-screenshots", "App Store screenshot generator"],
      ["/tools/app-promo-video-maker", "App promo video maker"],
      ["/screen-recorder", "Screen recorder with auto zoom"],
      ["/pricing", "MockFrame pricing"],
      ["/compare", "More comparisons"],
    ],
  },
  {
    slug: "applaunchpad",
    name: "AppLaunchpad",
    site: "theapplaunchpad.com",
    checked: "October 2026",
    title: "AppLaunchpad Alternative for App Store Screenshots",
    description:
      "AppLaunchpad vs MockFrame for App Store and Google Play screenshots: free tier, AI captions, localization, export workflow and pricing.",
    keywords: ["applaunchpad alternative", "theapplaunchpad alternative", "applaunchpad vs mockframe", "app store screenshot generator", "google play screenshot generator"],
    h1: "AppLaunchpad alternative: MockFrame for store screenshots",
    intro:
      "AppLaunchpad is a dedicated App Store and Google Play screenshot builder with a very large template and graphics library. MockFrame aims at the fastest path from raw screenshots to an upload-ready set: describe your app and AI drafts the captions and layout, then one export gives you every required size in a zip with a README — and the same plan covers device mockups, videos and the rest of your launch assets.",
    rows: [
      {
        dim: "Free plan",
        mockframe: "Design and preview free; your first full store pack and two AI-generated packs are free, with no watermark.",
        them: "Free plan with 10 templates and a limited selection of devices, fonts and graphics; exports are limited.",
      },
      {
        dim: "Paid pricing",
        mockframe: MOCKFRAME_PRICE,
        them: "Pro subscription with monthly or annual billing (prices are shown in your local currency on theapplaunchpad.com).",
      },
      {
        dim: "Templates",
        mockframe: "Eight marketing styles for packs plus ready-made store listing sets.",
        them: "1,000+ templates, 10K+ graphics and 700+ fonts on Pro.",
      },
      {
        dim: "AI",
        mockframe: "Describe your app in a sentence; AI plans the narrative, writes every caption and lays out the screens.",
        them: "AI scaling of one design across iOS and Android device sizes.",
      },
      {
        dim: "Localization",
        mockframe: "Pro: AI translation into 39 store languages, one folder per language or a fastlane layout.",
        them: "Pro: localization with an AI translator.",
      },
      {
        dim: "Export",
        mockframe: "One zip with every Apple and Google size and a README saying which folder uploads to which slot; fastlane deliver/supply layout available.",
        them: "Exports scaled to all required iOS and Android device sizes.",
      },
      {
        dim: "Beyond store screenshots",
        mockframe: "Device mockups, photoreal scenes, chat screenshots, screen recordings, app promo videos, render API and MCP server.",
        them: "Mockup generator, app icon generator and device art tools.",
      },
    ],
    pickMockframe: [
      "You want AI to write the captions and story of your screenshot set, not just resize it.",
      "You ship with fastlane and want a zip that drops straight into deliver/supply.",
      "You want one plan that also covers mockups, videos and launch images.",
      "You prefer a flat USD price under $10 a month.",
    ],
    pickThem: [
      "You want to browse a library of 1,000+ ready-made screenshot templates.",
      "You need frames for the very latest devices, such as iPhone 18 and iPhone Duo, today.",
      "You rely on brand asset management across many app projects.",
    ],
    switching:
      "Screenshots are rebuilt from your raw captures, so there's nothing to export from AppLaunchpad. Upload 3–10 screenshots to the pack studio (or describe your app to the AI generator), choose a style and download the zip. Your first full pack is free, so you can compare the output before switching.",
    faq: [
      {
        q: "Is MockFrame a free AppLaunchpad alternative?",
        a: "You can try it free: designing and previewing is free, and your first full pack export with every required App Store and Google Play size is free with a free account, without a watermark. That first pack is licensed for one real store release; more packs and other commercial use need Pro ($9.99 a month).",
      },
      {
        q: "Which has more templates?",
        a: "AppLaunchpad, by a wide margin — it lists over a thousand templates on Pro. MockFrame offers eight pack styles and a set of ready-made store listing sets, and leans on AI to draft a set around your app instead.",
      },
      {
        q: "Does MockFrame support fastlane?",
        a: "Yes. Store packs can export in fastlane's deliver/supply folder layout, so the screenshots upload with your existing release lane.",
      },
      {
        q: "Does MockFrame translate screenshot captions?",
        a: "Yes, on Pro: AI translation into 39 store languages, exported as one folder per language.",
      },
    ],
    cta: { href: "/app-store-screenshots", label: "Try the screenshot generator" },
    related: [
      ["/app-store-screenshots", "App Store screenshot generator"],
      ["/ai", "AI app screenshot generator"],
      ["/guides/design-app-store-screenshots", "Guide: design a screenshot set"],
      ["/compare/appscreens", "MockFrame vs AppScreens"],
      ["/pricing", "MockFrame pricing"],
      ["/compare", "More comparisons"],
    ],
  },
  {
    slug: "shots-so",
    name: "Shots",
    site: "shots.so",
    checked: "October 2026",
    title: "Shots.so Alternative: Mockups and Store Screenshots",
    description:
      "Shots.so vs MockFrame: device mockups, backgrounds, video, App Store screenshot packs and what each tool does best, compared side by side.",
    keywords: ["shots.so alternative", "shots so alternative", "shots alternative mockup", "shots.so vs mockframe", "screenshot mockup generator", "free mockup generator"],
    h1: "Shots.so alternative: MockFrame for mockups and launch assets",
    intro:
      "Shots is a much-loved browser tool for turning a screenshot into a good-looking image or short animation for social media and websites, with a big library of background styles. MockFrame covers that same ground — frame a screenshot, style the scene, export — and adds the assets a launch needs on top: complete App Store and Google Play screenshot sets, photoreal device scenes, chat screenshots and screen recordings with automatic zoom.",
    rows: [
      {
        dim: "Core job",
        mockframe: "Drop a screenshot into a device frame, style the background and export an image or video.",
        them: "Turn screenshots into images, videos and animations for social media and websites.",
      },
      {
        dim: "Backgrounds and styling",
        mockframe: "Gradient, mesh and solid backgrounds plus premium collections on Pro, shadows and layouts.",
        them: "A large preset library (gradients, glass, cosmic, abstract, texture and more), borders, shadows and layout presets — a real strength.",
      },
      {
        dim: "Devices",
        mockframe: "Nearly 50 drawn device frames plus about 60 photographed scenes calibrated to each screen.",
        them: "Device and browser frames that adapt to your media.",
      },
      {
        dim: "App Store screenshots",
        mockframe: "Pack generator exports every required App Store and Google Play size in one zip, with AI captions and 39-language translation on Pro.",
        them: "Not a dedicated store-screenshot workflow.",
      },
      {
        dim: "Video",
        mockframe: "Pro: animated scenes at 60 fps up to 4K, app promo videos, and a screen recorder with automatic zoom.",
        them: "Animations and video output are a headline feature.",
      },
      {
        dim: "Pricing",
        mockframe: MOCKFRAME_PRICE,
        them: "Free to use, with paid features inside the app (see shots.so for current plans).",
      },
      {
        dim: "Automation",
        mockframe: "Render API, MCP server for Claude and Cursor, and a Figma plugin.",
        them: "Browser editor.",
      },
    ],
    pickMockframe: [
      "You're launching an app and need store screenshots in every required size, not just a hero image.",
      "You want photographed, photoreal device scenes alongside clean frames.",
      "You record product demos and want automatic zoom on clicks.",
      "You want to automate mockups through an API or from Claude or Cursor.",
    ],
    pickThem: [
      "You mainly post single, beautifully styled screenshots to social media.",
      "You want the widest range of ready-made background styles to click through.",
      "You're happy with a lightweight tool and don't need store listing sets.",
    ],
    switching:
      "There's nothing to move: open the MockFrame editor, drop in the same screenshot, pick a device and background, and export. No account is needed to try it, and the free plan has no watermark.",
    faq: [
      {
        q: "Is MockFrame a free Shots.so alternative?",
        a: "Yes. The free plan includes every device frame and the full editor and exports images up to 3× resolution with no watermark. Pro ($9.99 a month) adds video export, 6K images, premium backgrounds and unlimited store screenshot packs.",
      },
      {
        q: "What does MockFrame do that Shots doesn't?",
        a: "Complete App Store and Google Play screenshot sets in every required size, photoreal photographed-device scenes, chat screenshot generators, a screen recorder with automatic zoom, and a render API and MCP server for automation.",
      },
      {
        q: "When is Shots the better choice?",
        a: "If you mostly make single styled screenshots or short animations for social posts and love browsing background presets, Shots is quick and excellent at that.",
      },
    ],
    cta: { href: "/editor", label: "Open the mockup editor" },
    related: [
      ["/mockups", "Device mockup generators"],
      ["/tools/website-screenshot", "Website screenshot mockups"],
      ["/tools/tweet-screenshot", "X post images"],
      ["/screen-recorder", "Screen recorder with auto zoom"],
      ["/app-store-screenshots", "App Store screenshot generator"],
      ["/compare", "More comparisons"],
    ],
  },
];

export function getComparison(slug: string): Comparison | undefined {
  return COMPARISONS.find((c) => c.slug === slug);
}
