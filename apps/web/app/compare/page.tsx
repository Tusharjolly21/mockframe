import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { socialMeta } from "@/lib/site";
import { COMPARISONS } from "@/lib/comparisons";

const DESCRIPTION =
  "How MockFrame compares with AppScreens, AppLaunchpad, Previewed and Shots.so for device mockups and App Store screenshots — including where they're better.";

export const metadata: Metadata = {
  title: "MockFrame Alternatives and Comparisons",
  description: DESCRIPTION,
  alternates: { canonical: "/compare" },
  ...socialMeta({ path: "/compare", title: "MockFrame Alternatives and Comparisons — MockFrame", description: DESCRIPTION }),
};

export default function CompareIndexPage() {
  return (
    <main className="min-h-dvh bg-[#09090b] text-white">
      <MarketingNav />
      <section className="mx-auto max-w-3xl px-6 pb-20 pt-28">
        <p className="text-[13px] font-semibold text-violet-300">Compare</p>
        <h1 className="mt-3 text-[34px] font-bold leading-tight sm:text-[42px]">MockFrame vs the alternatives</h1>
        <p className="mt-5 text-white/60">
          Honest, side-by-side comparisons with the tools people usually weigh MockFrame against. Each one says where
          the other tool is the better pick, and when its details were last checked.
        </p>
        <ul className="mt-10 grid gap-3">
          {COMPARISONS.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/compare/${c.slug}`}
                className="group flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-colors hover:border-white/25"
              >
                <span>
                  <span className="block font-semibold text-white">MockFrame vs {c.name}</span>
                  <span className="mt-1 block text-[14px] text-white/55">{c.description}</span>
                </span>
                <ArrowUpRight size={16} className="mt-1 shrink-0 text-zinc-600 transition-colors group-hover:text-white" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <MarketingFooter />
    </main>
  );
}
