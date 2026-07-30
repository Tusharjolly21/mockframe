import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "AppScreens Alternative — Free App Store Screenshot Generator",
  description:
    "Comparing AppScreens and MockFrame for App Store screenshots? See how the two generators differ on pricing, AI caption writing, export workflow and what's included free — and which fits your release.",
  keywords: [
    "appscreens alternative",
    "appscreens app store screenshot generator",
    "app store screenshot generator",
    "free app store screenshot generator",
    "appscreens vs mockframe",
  ],
  alternates: { canonical: `${SITE_URL}/compare/appscreens` },
  openGraph: {
    title: "AppScreens vs MockFrame — App Store screenshot generators compared",
    description: "Pricing, AI captions, export workflow and free tiers compared side by side.",
    url: `${SITE_URL}/compare/appscreens`,
  },
};

/**
 * Competitor rows are deliberately hedged and dated — AppScreens' site is a
 * client-rendered app, so claims come from their public marketing pages and
 * third-party listings as of July 2026. Re-verify before editing them into
 * anything more specific.
 */
const COMPARISON = [
  {
    dim: "Getting a full set out",
    mockframe: "Upload 3–10 raw screenshots, pick a style, download one zip with every required Apple and Google size plus a README that says what uploads where.",
    appscreens: "Template-based editor with responsive scaling across device sizes; exports per configured display.",
  },
  {
    dim: "Free tier",
    mockframe: "Design and preview everything free; your first full pack export is free with a free account.",
    appscreens: "Free tier for trying the editor; full-resolution output is part of the paid plans.",
  },
  {
    dim: "Paid pricing",
    mockframe: "Pro starts at under $10 a month.",
    appscreens: "Subscription plans aimed at teams shipping regularly (see appscreens.com for current pricing).",
  },
  {
    dim: "AI assistance",
    mockframe: "Describe your app in one sentence and the AI generator plans the conversion narrative, writes every caption and lays out concept screens you swap your real shots into.",
    appscreens: "AI-assisted captioning and restyling inside the template editor.",
  },
  {
    dim: "Localization",
    mockframe: "Manual — duplicate a pack and translate captions yourself.",
    appscreens: "Strong: bulk auto-localization across dozens of languages is a headline feature.",
  },
  {
    dim: "Stores covered",
    mockframe: "Apple App Store and Google Play, including the Play feature graphic.",
    appscreens: "Apple and Google plus additional storefronts such as Microsoft and Amazon.",
  },
  {
    dim: "Beyond store screenshots",
    mockframe: "Same editor makes device mockups, chat screenshots, code shots, X post images and app promo videos.",
    appscreens: "Focused specifically on store screenshots.",
  },
] as const;

const FAQ = [
  {
    q: "Is MockFrame a free AppScreens alternative?",
    a: "Yes for your first release: designing and previewing is free, and your first full pack export — every required App Store and Google Play size in one zip — is free with a free account. Unlimited packs are part of Pro, which starts at under $10 a month.",
  },
  {
    q: "What does MockFrame do that AppScreens doesn't?",
    a: "The AI pack generator designs a full screenshot narrative from a one-sentence description of your app — captions, layout and concept screens — before you've opened an editor. And because MockFrame is a general mockup studio, the same subscription covers device mockups, chat screenshots and app promo videos, not only store screenshots.",
  },
  {
    q: "When is AppScreens the better choice?",
    a: "If you localize your store listing into many languages, AppScreens' bulk auto-localization is genuinely strong and MockFrame has no equivalent yet. It also covers storefronts beyond Apple and Google, such as Microsoft and Amazon.",
  },
  {
    q: "Does MockFrame export every required size?",
    a: "Yes — Apple 6.9-inch (1320×2868) and 6.5-inch (1284×2778) portrait PNGs, optional iPad 13-inch, Google Play phone screenshots and the 1024×500 feature graphic, generated from one design and organized into folders per store.",
  },
  {
    q: "Can I try MockFrame without an account?",
    a: "Yes. The pack studio is open — upload screenshots, pick a style and preview the whole set without signing in. An account is only needed when you export.",
  },
] as const;

export default function AppScreensComparePage() {
  return (
    <main className="min-h-dvh bg-[#09090b] text-white">
      <MarketingNav />
      <section className="mx-auto max-w-3xl px-6 pb-16 pt-28 text-white/80">
        <p className="text-[13px] font-semibold text-violet-300">Comparison</p>
        <h1 className="mt-3 text-[34px] font-bold leading-tight text-white sm:text-[42px]">
          AppScreens alternative: MockFrame for App Store screenshots
        </h1>
        <p className="mt-5 text-white/60">
          AppScreens is one of the most established App Store screenshot generators, and if you localize a listing
          into thirty languages it earns its subscription. MockFrame takes a different angle: get an indie developer
          or small team from raw simulator captures to a submission-ready zip — every required Apple and Google size,
          framed and captioned — in a few minutes, with the first full pack free and{" "}
          <Link href="/ai" className="text-violet-300 underline-offset-2 hover:underline">
            AI that writes the set for you
          </Link>{" "}
          from a one-sentence description.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/app-store-screenshots"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-[14px] font-semibold text-zinc-900 hover:bg-zinc-200"
          >
            Try the screenshot generator <ArrowRight size={16} />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-5 py-3 text-[14px] font-semibold text-white hover:border-white/30"
          >
            See pricing
          </Link>
        </div>

        <h2 className="mt-14 text-xl font-bold text-white">MockFrame vs AppScreens at a glance</h2>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[560px] text-left text-[13.5px]">
            <thead className="bg-white/[0.03] text-white/50">
              <tr>
                <th className="px-4 py-3 font-medium">&nbsp;</th>
                <th className="px-4 py-3 font-medium text-white/80">MockFrame</th>
                <th className="px-4 py-3 font-medium">AppScreens</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {COMPARISON.map((row) => (
                <tr key={row.dim} className="align-top text-white/70">
                  <td className="px-4 py-3 font-semibold text-white">{row.dim}</td>
                  <td className="px-4 py-3">{row.mockframe}</td>
                  <td className="px-4 py-3 text-white/50">{row.appscreens}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[12.5px] text-white/40">
          AppScreens details are drawn from their public marketing pages and third-party listings as of July 2026 and
          may change — check appscreens.com for current plans. AppScreens is a trademark of its owner; MockFrame is
          not affiliated with it.
        </p>

        <h2 className="mt-14 text-xl font-bold text-white">Where each tool wins</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <h3 className="font-semibold text-white">Pick MockFrame if…</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-[14px] text-white/60">
              <li>You ship to Apple and Google and want one zip with every required size, captioned and framed.</li>
              <li>You want AI to draft the whole screenshot narrative before you touch an editor.</li>
              <li>You'd rather pay under $10 a month — or nothing for your first release.</li>
              <li>You also need device mockups, chat screenshots or an app promo video for launch.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <h3 className="font-semibold text-white">Pick AppScreens if…</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-[14px] text-white/60">
              <li>You localize your listing into many languages and need bulk auto-translation.</li>
              <li>You publish to storefronts beyond Apple and Google, like Microsoft or Amazon.</li>
              <li>You maintain a large template library across a bigger team.</li>
            </ul>
          </div>
        </div>

        <h2 className="mt-14 text-xl font-bold text-white">Switching takes one upload</h2>
        <p className="mt-3 text-white/60">
          There's nothing to migrate — store screenshots are rebuilt from your raw captures either way. Drop 3–10
          plain screenshots into the{" "}
          <Link href="/app-store-screenshots" className="text-violet-300 underline-offset-2 hover:underline">
            pack studio
          </Link>
          , pick one of the marketing styles, caption each screen (or let{" "}
          <Link href="/ai" className="text-violet-300 underline-offset-2 hover:underline">
            the AI generator
          </Link>{" "}
          write them), and export the zip. Your first full pack is free, so you can compare finished output against
          your current set before changing anything.
        </p>

        <h2 className="mt-14 text-xl font-bold text-white">Frequently asked questions</h2>
        <dl className="mt-6 space-y-6">
          {FAQ.map((f) => (
            <div key={f.q}>
              <dt className="font-semibold text-white">{f.q}</dt>
              <dd className="mt-1 text-white/60">{f.a}</dd>
            </div>
          ))}
        </dl>

        <h2 className="mt-14 text-xl font-bold text-white">Related generators</h2>
        <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
          {[
            ["/app-store-screenshots", "App Store screenshot generator"],
            ["/ai", "AI app screenshot generator"],
            ["/tools/app-promo-video-maker", "App promo video maker"],
            ["/mockups", "Device mockup generators"],
            ["/guides/design-app-store-screenshots", "Guide: design a screenshot set"],
            ["/pricing", "MockFrame pricing"],
          ].map(([href, label]) => (
            <li key={href}>
              <Link
                href={href}
                className="block rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-[14px] text-white/80 transition-colors hover:border-white/25 hover:text-white"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />
      <MarketingFooter />
    </main>
  );
}
