import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";

export const metadata: Metadata = {
  title: "Commercial License",
  description:
    "Everything you export from MockFrame is yours to use commercially on every plan — App Store and Google Play listings, ads, websites and client work. No attribution, no royalties.",
  alternates: { canonical: "/license" },
};

/* Plain-English usage terms for exports. Keep every claim TRUE to how the
   product works (same rule as /privacy): if plans or bundled assets change,
   update this page in the same PR. */

const HIGHLIGHTS = [
  { title: "Every plan", body: "Free and Pro exports carry the same commercial rights." },
  { title: "No attribution", body: "No credit line, link or watermark required." },
  { title: "No royalties", body: "Use an export as often as you like, anywhere." },
  { title: "Never expires", body: "What you exported stays licensed if you cancel Pro." },
];

const SECTIONS: { title: string; body: (string | { list: string[] })[] }[] = [
  {
    title: "The short version",
    body: [
      "Images, videos and GIFs you export from MockFrame are yours to use for personal and commercial purposes, on every plan, worldwide, with no attribution and no royalties. Cancelling a subscription never takes back rights to anything you already exported.",
    ],
  },
  {
    title: "What you can do with your exports",
    body: [
      {
        list: [
          "App Store, Google Play, Mac App Store, Microsoft Store and Chrome Web Store listings — screenshots, previews and feature graphics.",
          "Websites, landing pages, product pages, documentation and emails.",
          "Paid advertising: social, search, display, video and out-of-home.",
          "Social posts, reels, stories, launch threads and Product Hunt pages.",
          "Pitch decks, investor updates, press kits, print and merchandise.",
          "Client and agency work: create exports for a client and hand them over — your client may use them in all the same ways.",
        ],
      },
    ],
  },
  {
    title: "What isn't covered",
    body: [
      "The license covers finished exports that feature your own content. It doesn't cover:",
      {
        list: [
          "Reselling or giving away MockFrame's device frames, backgrounds, templates or sample screens as standalone assets — for example as a mockup kit, a template pack, or a stock listing. Exports that combine them with your own app or content are fine.",
          "Using MockFrame's assets to build a competing mockup tool, or to train machine-learning models.",
          "Deceptive use. Chat, social and notification screens are fictional recreations: don't present them as real conversations or posts by real people or brands, or use them to impersonate, defraud or mislead. You can add a “Fictional” disclosure label to any export.",
        ],
      },
    ],
  },
  {
    title: "Your content stays yours",
    body: [
      "We claim no rights over the screenshots, text, logos and fonts you bring into MockFrame. You're responsible for having the rights to use them — including the license for any font file you upload.",
    ],
  },
  {
    title: "Bundled fonts, photos and icons",
    body: [
      {
        list: [
          "Fonts in the font menu come from Google Fonts. They're open-source (SIL Open Font License or Apache 2.0) and free for commercial use in images and video.",
          "Photo backgrounds from Unsplash are covered by the Unsplash License: free for commercial use, but not to be sold unaltered or compiled into a competing photo service.",
          "Brand icons come from the Simple Icons project. The icon artwork is free to use; the brands it shows are trademarks of their owners (see below).",
        ],
      },
    ],
  },
  {
    title: "Devices, apps and trademarks",
    body: [
      "Device names and shapes (iPhone, iPad, MacBook, Pixel, Galaxy and others), and the names and logos of apps shown in screen templates, are trademarks of their respective owners. MockFrame isn't affiliated with or endorsed by them.",
      "Showing your own app on a device in its marketing is common practice, but follow the platform owner's guidelines — for example Apple's marketing and App Review guidelines — and don't suggest that a brand endorses your product.",
    ],
  },
  {
    title: "Realistic renders",
    body: [
      "Photoreal renders (Pro) are composited by our rendering partner, Mockuuups. You can use them in the same ways as any other export, subject also to Mockuuups' terms for rendered images.",
    ],
  },
  {
    title: "Questions",
    body: [
      "Not sure whether a use is covered? Email tushar.gts7650@gmail.com before you publish and we'll give you a straight answer.",
    ],
  },
];

export default function LicensePage() {
  return (
    <div className="min-h-dvh bg-[#09090b] text-zinc-300">
      <MarketingNav />
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-36">
        <p className="text-[13px] font-medium uppercase tracking-widest text-zinc-500">Legal</p>
        <h1 className="mt-2 text-4xl font-medium tracking-[-0.03em] text-white">Commercial License</h1>
        <p className="mt-3 text-[15px] text-zinc-400">Last updated: October 7, 2026</p>

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {HIGHLIGHTS.map((h) => (
            <div key={h.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-[15px] font-semibold text-white">{h.title}</p>
              <p className="mt-1 text-[13.5px] leading-6 text-zinc-400">{h.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 space-y-10">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="text-xl font-medium tracking-[-0.02em] text-white">{s.title}</h2>
              <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-zinc-400">
                {s.body.map((b, i) =>
                  typeof b === "string" ? (
                    <p key={i}>{b}</p>
                  ) : (
                    <ul key={i} className="list-disc space-y-2 pl-5">
                      {b.list.map((li) => (
                        <li key={li}>{li}</li>
                      ))}
                    </ul>
                  )
                )}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-14 text-[13.5px] text-zinc-500">
          See also the <Link href="/privacy" className="text-zinc-300 underline underline-offset-4 hover:text-white">Privacy Policy</Link> and{" "}
          <Link href="/pricing" className="text-zinc-300 underline underline-offset-4 hover:text-white">plans</Link>.
        </p>
      </main>
      <MarketingFooter />
    </div>
  );
}
