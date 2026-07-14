import type { Metadata } from "next";
import { Check } from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { PricingPlans } from "@/components/marketing/PricingPlans";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Start MockFrame free. Upgrade for watermark-free exports, custom branding, realistic renders, video, GIF, 4K and 6K output.",
  alternates: { canonical: "/pricing" },
};

const REASSURANCE = [
  "Free plan is the full editor — not a trial",
  "Annual works out to about ₹250 / month",
  "Cancel anytime · lifetime never renews",
];

export default function PricingPage() {
  return (
    <main className="min-h-dvh bg-[#09090b] text-white">
      <MarketingNav />
      <section className="mx-auto max-w-6xl px-6 pb-14 pt-32 text-center">
        <p className="text-[13px] font-semibold text-violet-400">Simple, generous pricing</p>
        <h1 className="mx-auto mt-4 max-w-3xl text-[42px] font-medium leading-[1.02] sm:text-[58px]">Create free. Upgrade when the output earns it.</h1>
        <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-7 text-zinc-400">Build and test your complete scene before paying. Pro unlocks clean branded output, higher resolutions and production rendering — at less than half what comparable tools charge.</p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-10">
        <PricingPlans />
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {REASSURANCE.map((r) => (
            <span key={r} className="flex items-center gap-2 text-[12.5px] text-zinc-500">
              <Check size={14} className="text-emerald-400" /> {r}
            </span>
          ))}
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}
