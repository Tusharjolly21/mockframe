import type { Metadata } from "next";
import { PackStudio } from "@/components/pack/PackStudio";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "App Store Screenshot Generator — every required size in one zip",
  description:
    "Upload your app screenshots once and export App Store 6.9″ & 6.5″, Google Play phone screenshots and the feature graphic — framed, captioned, submission-ready. First pack free.",
  alternates: { canonical: `${SITE_URL}/app-store-screenshots` },
  openGraph: {
    title: "App Store Screenshot Generator | MockFrame",
    description: "Drop 3–10 screenshots, pick a style, download a submission-ready zip for both stores.",
    url: `${SITE_URL}/app-store-screenshots`,
  },
};

const FAQ = [
  {
    q: "What sizes does the pack include?",
    a: "Apple App Store 6.9-inch (1320×2868) and 6.5-inch (1284×2778) portrait PNGs, optional iPad 13-inch (2064×2752), Google Play phone screenshots (1080×1920) and the 1024×500 feature graphic.",
  },
  {
    q: "Is it free?",
    a: "Building and previewing is free. Your first full pack export is free with a free account; unlimited packs are part of Pro.",
  },
  {
    q: "Do I need design skills?",
    a: "No — pick one of 8 styles, type a caption per screen, and every store size is generated from the same design.",
  },
] as const;

export default function AppStoreScreenshotsPage() {
  return (
    <main className="bg-[#0b0b0f]">
      <PackStudio />
      <section className="mx-auto max-w-3xl px-6 py-16 text-white/80">
        <h1 className="text-2xl font-bold text-white">App Store &amp; Play Store screenshot generator</h1>
        <p className="mt-3 text-white/60">
          Every app release needs the same tedious set of store screenshots. MockFrame turns 3–10 raw screenshots
          into framed, captioned marketing shots in every required size — exported as one zip with a README that
          says exactly which folder uploads where.
        </p>
        <dl className="mt-10 space-y-6">
          {FAQ.map((f) => (
            <div key={f.q}>
              <dt className="font-semibold text-white">{f.q}</dt>
              <dd className="mt-1 text-white/60">{f.a}</dd>
            </div>
          ))}
        </dl>
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
    </main>
  );
}
