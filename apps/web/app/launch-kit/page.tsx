import type { Metadata } from "next";
import { Rocket } from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { LaunchKitWizard } from "@/components/launchkit/LaunchKitWizard";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "App Launch Kit Generator — Every Launch Asset in One Click",
  description:
    "Generate your entire app launch in minutes: Product Hunt gallery + thumbnail, OG card, X/LinkedIn banner, Instagram story, GitHub social preview, AI-written launch copy, and a hosted press page. First kit free.",
  alternates: { canonical: "/launch-kit" },
  openGraph: {
    title: `App Launch Kit Generator — ${SITE_NAME}`,
    description: "Every launch-day asset — designed, sized and written — from one form. First kit free.",
    url: "/launch-kit",
  },
};

const FAQ: [string, string][] = [
  [
    "What exactly is in the kit?",
    "Six image assets at exact platform sizes — Product Hunt gallery (1270×760) and thumbnail (240×240), social/OG card (1200×630), X/LinkedIn banner (1600×900), GitHub social preview (1280×640) and an Instagram story (1080×1920) — plus AI-written launch copy (tagline, App Store subtitle, launch tweet, Product Hunt maker comment, press boilerplate) and an optional hosted press page.",
  ],
  [
    "What is the hosted press page?",
    "A live public page at mockframe.app/press/your-app with your icon, screenshots, boilerplate and press contact — the link you give journalists and Product Hunt hunters. You can update or unpublish it any time.",
  ],
  [
    "Is it free?",
    "Building and previewing everything is free. Your first kit export and press page are free with an account; after that, launch kits are part of Pro.",
  ],
  [
    "Can it fill everything in from my website?",
    "Yes — paste your site or store URL and the importer reads your app's name and description, then the AI writes launch copy from what your product actually does.",
  ],
];

export default function LaunchKitPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "MockFrame Launch Kit Generator",
        url: `${SITE_URL}/launch-kit`,
        applicationCategory: "DesignApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Launch Kit", item: `${SITE_URL}/launch-kit` },
        ],
      },
    ],
  };

  return (
    <main className="min-h-dvh bg-[#09090b] text-white">
      <MarketingNav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-[480px] w-[1000px] -translate-x-1/2" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.18), transparent 70%)" }} />
        <div className="relative mx-auto max-w-4xl px-6 pb-12 pt-32 text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-4 py-1.5 text-[12px] font-semibold text-violet-200">
            <Rocket size={13} /> You built the app. This builds the launch.
          </p>
          <h1 className="mx-auto mt-6 max-w-3xl text-[40px] font-medium leading-[1.04] tracking-[-0.02em] sm:text-[56px]">
            Your entire launch day, generated in one click.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[16.5px] leading-8 text-zinc-400">
            Product Hunt gallery & thumbnail, social cards, GitHub preview, Instagram story — every asset at the exact right size, with AI-written copy and a hosted press page. First kit free.
          </p>
        </div>
      </header>

      <LaunchKitWizard />

      <section className="mx-auto max-w-3xl border-t border-white/10 px-6 py-16">
        <h2 className="text-[24px] font-medium">Frequently asked questions</h2>
        <dl className="mt-6 divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {FAQ.map(([q, a]) => (
            <div key={q} className="py-5">
              <dt className="text-[15px] font-semibold">{q}</dt>
              <dd className="mt-2 text-[13.5px] leading-6 text-zinc-400">{a}</dd>
            </div>
          ))}
        </dl>
      </section>
      <MarketingFooter />
    </main>
  );
}
