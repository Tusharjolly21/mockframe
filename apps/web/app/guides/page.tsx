import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { GUIDES } from "@/lib/guides";

export const metadata: Metadata = {
  title: "Guides",
  description: "Practical MockFrame guides for device mockups, website capture, bulk exports and reusable themes.",
  alternates: { canonical: "/guides" },
};

export default function GuidesPage() {
  return (
    <main className="min-h-dvh bg-[#09090b] text-white">
      <MarketingNav />
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-32">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-cyan-300"><BookOpen size={16} /> Practical guides</p>
          <h1 className="mt-4 text-[42px] font-medium leading-[1.03] sm:text-[58px]">Make the output look intentional.</h1>
          <p className="mt-5 text-[16px] leading-7 text-zinc-400">Short workflows for the jobs people actually open MockFrame to finish.</p>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-2">
        {GUIDES.map((guide) => (
          <Link key={guide.slug} href={`/guides/${guide.slug}`} className="group min-h-64 bg-[#101014] p-7 transition-colors hover:bg-[#15151b] sm:p-9">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase text-zinc-500"><span>{guide.category}</span><span>{guide.readTime}</span></div>
            <h2 className="mt-8 max-w-md text-[24px] font-semibold leading-tight">{guide.title}</h2>
            <p className="mt-3 max-w-md text-[13.5px] leading-6 text-zinc-400">{guide.description}</p>
            <span className="mt-8 inline-flex items-center gap-2 text-[13px] font-semibold text-white">Read guide <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" /></span>
          </Link>
        ))}
      </section>
      <div className="h-24" />
      <MarketingFooter />
    </main>
  );
}
