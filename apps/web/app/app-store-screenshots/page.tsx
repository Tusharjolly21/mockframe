import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { PackStudio } from "@/components/pack/PackStudio";
import { socialMeta } from "@/lib/site";
import { safeJsonLd } from "@/lib/jsonLd";

const DESCRIPTION =
  "Upload your screenshots once and export every App Store size Apple asks for in 2026 — 6.3″, 6.9″, 6.5″ and iPad — plus Google Play and the feature graphic, framed and captioned.";

export const metadata: Metadata = {
  title: "Free App Store Screenshot Generator (2026 Sizes)",
  description: DESCRIPTION,
  keywords: ["app store screenshot generator", "app screenshot generator", "app screenshot maker", "ios app screenshot generator", "app store screenshot creator", "generate app screenshots", "google play screenshot generator", "app store screenshot sizes"],
  alternates: { canonical: "/app-store-screenshots" },
  ...socialMeta({ path: "/app-store-screenshots", title: "Free App Store Screenshot Generator (2026 Sizes) — MockFrame", description: DESCRIPTION }),
};

/** When SIZES was last checked against Apple's and Google's published specs. */
const SIZES_CHECKED = "October 9, 2026";

/** Required store sizes, kept in one place so copy and schema stay in sync. */
const SIZES = [
  { store: "Apple App Store", device: "iPhone 6.3-inch", size: "1206 × 2622", note: "Required — the iPhone slot Apple's spec lists as required (iPhone 17 and 17 Pro class)" },
  { store: "Apple App Store", device: "iPhone 6.9-inch", size: "1320 × 2868", note: "Largest iPhones (iPhone 17 Pro Max class)" },
  { store: "Apple App Store", device: "iPhone 6.5-inch", size: "1284 × 2778", note: "Only required if you don't provide 6.9-inch" },
  { store: "Apple App Store", device: "iPad 13-inch", size: "2064 × 2752", note: "Required if your app runs on iPad" },
  { store: "Google Play", device: "Phone", size: "1080 × 1920", note: "2–8 screenshots; 4+ at 1080 px or larger to be eligible for promotion" },
  { store: "Google Play", device: "Feature graphic", size: "1024 × 500", note: "Shown at the top of your listing" },
] as const;

const STEPS = [
  {
    n: "1",
    t: "Upload your raw screenshots",
    d: "Drop in 3–10 plain captures from the simulator or a real device. No cropping or resizing first — the generator handles every store size for you.",
  },
  {
    n: "2",
    t: "Pick a style and caption each screen",
    d: "Choose one of 8 marketing styles, set an accent color, and type a short caption per screen. The same design is applied consistently across the whole set.",
  },
  {
    n: "3",
    t: "Export a submission-ready zip",
    d: "Download one zip containing every required App Store and Google Play size, organized into folders with a README that says exactly what uploads where.",
  },
] as const;

const FAQ = [
  {
    q: "What is the app store screenshot generator?",
    a: "It is a free app screenshot maker that turns 3–10 raw app screenshots into framed, captioned marketing shots and exports every size Apple and Google require. You upload plain screenshots once and generate app screenshots for both stores from a single design — no Photoshop or design skills needed.",
  },
  {
    q: "What sizes does the pack include?",
    a: "Apple App Store 6.3-inch (1206×2622), 6.9-inch (1320×2868) and 6.5-inch (1284×2778) portrait PNGs, optional iPad 13-inch (2064×2752), Google Play phone screenshots (1080×1920) and the 1024×500 feature graphic. Every size is generated from the same design so the set stays consistent.",
  },
  {
    q: "Can I use it as an iOS app screenshot generator only?",
    a: "Yes. If you only ship to the Apple App Store, generate just the iPhone sizes (and iPad if you have an iPad build) and skip the Google Play sizes. The app store screenshot creator lets you pick exactly which stores and sizes go in the zip.",
  },
  {
    q: "Which iPhone screenshot size does Apple require in 2026?",
    a: "Apple's screenshot specification lists the 6.3-inch display (iPhone with Dynamic Island, medium) as the required iPhone size, accepting 1206×2622 or 1179×2556. 6.9-inch images can't be uploaded into that slot, so the pack renders 6.3-inch separately from the same design. 6.9-inch and 6.5-inch sets are included for the larger-display slots.",
  },
  {
    q: "Is it free?",
    a: "Building and previewing is free, and your first full pack export is free with a free account. That first pack is licensed for one real store release; more packs and other commercial use need Pro, which also includes unlimited packs.",
  },
  {
    q: "Do I need design skills?",
    a: "No — pick one of 8 styles, type a caption per screen, and every store size is generated from the same design.",
  },
  {
    q: "Can AI write the screenshots for me?",
    a: "Yes. The AI App Store screenshot generator designs a full conversion narrative, writes every caption and lays out concept screens from a one-sentence description of your app — then you swap in your real screenshots.",
  },
] as const;

export default function AppStoreScreenshotsPage() {
  return (
    <main className="bg-[#0b0b0f]">
      <PackStudio />
      <section className="mx-auto max-w-3xl px-6 py-16 text-white/80">
        <h1 className="text-2xl font-bold text-white">App Store &amp; Play Store screenshot generator</h1>
        <p className="mt-3 text-white/60">
          Every app release needs the same tedious set of store screenshots. This free app screenshot maker turns
          3–10 raw screenshots into framed, captioned marketing shots in every required size — exported as one zip
          with a README that says exactly which folder uploads where. Use it as a full cross-store tool or a focused{" "}
          iOS app screenshot generator, and{" "}
          <Link href="/ai" className="text-violet-300 underline-offset-2 hover:underline">
            let AI generate app screenshots
          </Link>{" "}
          for you when you want a head start.
        </p>

        {/* required sizes reference */}
        <h2 className="mt-14 text-xl font-bold text-white">Required App Store &amp; Google Play screenshot sizes</h2>
        <p className="mt-3 text-white/60">
          These are the sizes the app store screenshot creator outputs, checked against Apple&apos;s and Google&apos;s
          published specifications on {SIZES_CHECKED}. Every size is rendered at full resolution so text stays crisp on
          the store listing. For every accepted size, orientation and upload rule, see the{" "}
          <Link href="/guides/app-store-screenshot-sizes" className="text-violet-300 underline-offset-2 hover:underline">
            App Store screenshot sizes guide
          </Link>
          .
        </p>
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-left text-[13.5px]">
            <thead className="bg-white/[0.03] text-white/50">
              <tr>
                <th className="px-4 py-3 font-medium">Store</th>
                <th className="px-4 py-3 font-medium">Screen</th>
                <th className="px-4 py-3 font-medium">Pixels</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {SIZES.map((s) => (
                <tr key={s.store + s.device} className="text-white/70">
                  <td className="px-4 py-3">{s.store}</td>
                  <td className="px-4 py-3">{s.device}</td>
                  <td className="px-4 py-3 font-mono text-white/90">{s.size}</td>
                  <td className="hidden px-4 py-3 text-white/50 sm:table-cell">{s.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* how it works */}
        <h2 className="mt-14 text-xl font-bold text-white">How to generate app screenshots</h2>
        <ol className="mt-6 space-y-5">
          {STEPS.map((step) => (
            <li key={step.n} className="flex gap-4">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-violet-500/15 text-[13px] font-semibold text-violet-300">
                {step.n}
              </span>
              <div>
                <h3 className="text-[15px] font-semibold text-white">{step.t}</h3>
                <p className="mt-1 text-white/60">{step.d}</p>
              </div>
            </li>
          ))}
        </ol>

        {/* FAQ */}
        <h2 className="mt-14 text-xl font-bold text-white">Frequently asked questions</h2>
        <dl className="mt-6 space-y-6">
          {FAQ.map((f) => (
            <div key={f.q}>
              <dt className="font-semibold text-white">{f.q}</dt>
              <dd className="mt-1 text-white/60">{f.a}</dd>
            </div>
          ))}
        </dl>

        {/* internal links */}
        <h2 className="mt-14 text-xl font-bold text-white">Related generators</h2>
        <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
          {[
            ["/ai", "AI app screenshot generator"],
            ["/mockups/galaxy-s24-ultra", "Galaxy S24 Ultra mockup"],
            ["/mockups/galaxy-s25-ultra", "Galaxy S25 Ultra mockup"],
            ["/mockups/iphone-16-pro", "iPhone 16 Pro mockup"],
            ["/mockups", "All device mockups"],
            ["/tools/app-promo-video-maker", "App promo video maker"],
            ["/guides/app-store-screenshot-sizes", "App Store screenshot sizes (2026)"],
            ["/guides/best-app-store-screenshot-generators", "Best App Store screenshot generators"],
            ["/guides/design-app-store-screenshots", "Guide: design a screenshot set"],
            ["/compare/appscreens", "MockFrame vs AppScreens"],
            ["/compare/applaunchpad", "MockFrame vs AppLaunchpad"],
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
          __html: safeJsonLd({
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
