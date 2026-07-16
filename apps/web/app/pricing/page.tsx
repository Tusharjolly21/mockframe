import type { Metadata } from "next";
import { Check } from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { PricingPlans } from "@/components/marketing/PricingPlans";
import { Reveal } from "@/components/marketing/Reveal";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Start MockFrame free. Upgrade for watermark-free exports, custom branding, realistic renders, video, GIF, 4K and 6K output.",
  alternates: { canonical: "/pricing" },
};

const REASSURANCE = [
  "Free plan is the full editor — not a trial",
  "Annual works out to about ₹250 / month",
  "Cancel anytime · no lock-in",
];

/** Visible FAQ — also emitted as FAQPage JSON-LD below. Google requires the Q&A
 *  to be present on the page for the rich result, so these render on-page too.
 *  Answers are kept factual and price-soft (the plan cards above are the source
 *  of truth) to avoid drift. */
const FAQ: { q: string; a: string }[] = [
  {
    q: "Is MockFrame free?",
    a: "Yes. The free plan is the full editor — every device frame, backgrounds, WhatsApp and iMessage chat screens, website capture and HD export — and your exports are watermark-free. It's not a time-limited trial.",
  },
  {
    q: "Do I need to sign up to start?",
    a: "No. You can open the editor and export a mockup without an account. You only sign in if you want to save scenes to your account, sync across devices, or upgrade to Pro.",
  },
  {
    q: "What does Pro add?",
    a: "Pro unlocks the full chat and DM screen set (Telegram, Instagram, Slack, Discord and more), premium background collections, video and GIF export, 4K and 6K output, full-page website capture, your own custom-brand watermark, and saved templates. It starts at under $10 a month.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Both the monthly and annual plans are cancellable anytime with no lock-in — you keep Pro until the end of the period you've paid for.",
  },
  {
    q: "What payment methods do you accept?",
    a: "Payments are handled securely by Razorpay. In India you can pay by UPI, cards or netbanking; elsewhere you can pay by international card. Prices are shown in ₹ for India and $ otherwise.",
  },
  {
    q: "Can I use the mockups commercially?",
    a: "Yes. Your finished mockups are yours to use anywhere — marketing sites, App Store listings, social posts and client work included.",
  },
];

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

export default function PricingPage() {
  return (
    <main className="min-h-dvh bg-[#09090b] text-white">
      <MarketingNav />
      <Reveal className="mx-auto max-w-6xl px-6 pb-14 pt-32 text-center">
        <p className="text-[13px] font-semibold text-violet-400">Simple, generous pricing</p>
        <h1 className="mx-auto mt-4 max-w-3xl text-[42px] font-medium leading-[1.02] sm:text-[58px]">Create free. Upgrade when the output earns it.</h1>
        <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-7 text-zinc-400">Build and test your complete scene before paying. Pro unlocks clean branded output, higher resolutions and production rendering — at less than half what comparable tools charge.</p>
      </Reveal>

      <Reveal className="mx-auto max-w-6xl px-6 pb-10" y={32}>
        <PricingPlans />
      </Reveal>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <Reveal className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {REASSURANCE.map((r) => (
            <span key={r} className="flex items-center gap-2 text-[12.5px] text-zinc-500">
              <Check size={14} className="text-emerald-400" /> {r}
            </span>
          ))}
        </Reveal>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-24">
        <Reveal>
          <h2 className="text-center text-[28px] font-medium sm:text-[34px]">Frequently asked questions</h2>
          <dl className="mt-10 divide-y divide-white/10 border-t border-white/10">
            {FAQ.map(({ q, a }) => (
              <div key={q} className="py-6">
                <dt className="text-[16px] font-semibold text-white">{q}</dt>
                <dd className="mt-2 text-[14.5px] leading-7 text-zinc-400">{a}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }} />
      <MarketingFooter />
    </main>
  );
}
