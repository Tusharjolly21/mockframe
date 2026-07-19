import type { Metadata } from "next";
import Link from "next/link";
import { AiPackForm } from "@/components/ai/AiPackForm";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "AI App Store Screenshot Generator — describe your app, get the pack",
  description:
    "AI app screenshot generator: describe your app in a sentence and get a complete App Store & Google Play screenshot pack — narrative, captions and concept screens in every required size. 2 free generations, unlimited with Pro.",
  keywords: [
    "ai app screenshot generator",
    "ai app store screenshot generator",
    "generate app screenshots",
    "app screenshot maker",
    "app store screenshot creator",
  ],
  alternates: { canonical: `${SITE_URL}/ai` },
  openGraph: {
    title: "AI App Store Screenshot Generator | MockFrame",
    description: "Describe your app, get a complete store screenshot pack in under a minute — no design skills needed.",
    url: `${SITE_URL}/ai`,
  },
};

const STEPS = [
  {
    n: "1",
    title: "Describe",
    text: "Name your app and describe what it does in a sentence or two — who it's for, what problem it solves.",
  },
  {
    n: "2",
    title: "Generate",
    text: "Claude designs an 8–10 screen conversion narrative, writes every caption, and picks a style and accent color.",
  },
  {
    n: "3",
    title: "Swap in real screenshots",
    text: "Your pack opens in the studio with concept screens already framed and captioned — drop in your real screenshots to finish.",
  },
] as const;

const FAQ = [
  {
    q: "How many free generations do I get?",
    a: "Every account gets 2 free AI pack generations. After that, generating new packs is unlimited with MockFrame Pro; editing and exporting the packs you've already generated stays free.",
  },
  {
    q: "Do I need real screenshots to start?",
    a: "No — the AI writes a full narrative and captions and gives every screen a concept placeholder. Drop your real screenshots into the studio afterward and everything else (style, captions, sizing) stays in place.",
  },
  {
    q: "What do I get out of the generator?",
    a: "A complete pack: 8–10 screens with a conversion narrative, a caption per screen, a matching style and accent color — ready to export as App Store 6.9″ & 6.5″, Google Play phone screenshots and the feature graphic.",
  },
  {
    q: "Can I generate app screenshots without AI?",
    a: "Yes. If you already know what each screen should say, use the standard app store screenshot generator: upload your screenshots, pick a style and caption each one manually. The AI just gives you a designed starting point instead of a blank canvas.",
  },
] as const;

export default function AiPage() {
  return (
    <main className="bg-[#0b0b0f] text-white">
      <section className="mx-auto max-w-3xl px-6 pb-10 pt-16 text-center md:pt-24">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-400">MockFrame AI</p>
        <h1 className="mt-3 text-[32px] font-medium leading-[1.1] tracking-[-0.03em] text-white md:text-[42px]">
          Describe your app. Get a complete App Store screenshot pack.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-6 text-white/60">
          Skip the blank canvas — tell us what your app does and Claude designs the narrative, writes the captions
          and lays out every screen. Swap in your real screenshots and export in every required size.
        </p>
      </section>

      <section className="px-6 pb-20">
        <AiPackForm />
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-20">
        <div className="grid gap-6 md:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.n} className="rounded-2xl border border-white/[0.08] bg-[#101014] p-6">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-violet-500/15 text-[13px] font-semibold text-violet-300">
                {step.n}
              </span>
              <h2 className="mt-4 text-[15px] font-semibold text-white">{step.title}</h2>
              <p className="mt-1.5 text-[13px] leading-5 text-white/50">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-24 text-white/80">
        <h2 className="text-2xl font-bold text-white">Frequently asked questions</h2>
        <dl className="mt-8 space-y-6">
          {FAQ.map((f) => (
            <div key={f.q}>
              <dt className="font-semibold text-white">{f.q}</dt>
              <dd className="mt-1 text-white/60">{f.a}</dd>
            </div>
          ))}
        </dl>

        <h2 className="mt-14 text-2xl font-bold text-white">Related generators</h2>
        <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
          {[
            ["/app-store-screenshots", "App Store screenshot generator"],
            ["/tools/app-store-screenshot", "App Store image maker"],
            ["/mockups", "Device mockup generators"],
            ["/tools/app-promo-video-maker", "App promo video maker"],
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
    </main>
  );
}
