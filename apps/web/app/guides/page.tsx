import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { Reveal } from "@/components/marketing/Reveal";
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
        <Reveal className="max-w-2xl">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-cyan-300"><BookOpen size={16} /> Practical guides</p>
          <h1 className="mt-4 text-[42px] font-medium leading-[1.03] tracking-[-0.03em] sm:text-[58px]">Make the output look intentional.</h1>
          <p className="mt-5 text-[16px] leading-7 text-zinc-400">Short workflows for the jobs people actually open MockFrame to finish.</p>
        </Reveal>
      </section>
      <Reveal className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2">
        {GUIDES.map((guide) => (
          <Link key={guide.slug} href={`/guides/${guide.slug}`} className="group overflow-hidden rounded-2xl border border-white/10 bg-[#101014] transition-all hover:-translate-y-0.5 hover:border-white/25 hover:shadow-[0_24px_60px_rgba(0,0,0,0.4)]">
            {guide.hero && (
              <div className="aspect-[16/9] overflow-hidden border-b border-white/[0.06] bg-[#0c0c10]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={guide.hero} alt="" loading="lazy" className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]" />
              </div>
            )}
            <div className="p-7">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase text-zinc-500"><span className="text-violet-300">{guide.category}</span><span>{guide.readTime}</span></div>
              <h2 className="mt-3 max-w-md text-[21px] font-semibold leading-tight">{guide.title}</h2>
              <p className="mt-2.5 max-w-md text-[13.5px] leading-6 text-zinc-400">{guide.description}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-[13px] font-semibold text-white">Read guide <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" /></span>
            </div>
          </Link>
        ))}
      </Reveal>
      <div className="h-24" />
      <MarketingFooter />
    </main>
  );
}
