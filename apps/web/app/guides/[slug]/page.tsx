import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { getGuide, GUIDES } from "@/lib/guides";

export function generateStaticParams() {
  return GUIDES.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const guide = getGuide((await params).slug);
  if (!guide) return {};
  return { title: guide.title, description: guide.description, alternates: { canonical: `/guides/${guide.slug}` } };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const guide = getGuide((await params).slug);
  if (!guide) notFound();
  return (
    <main className="min-h-dvh bg-[#09090b] text-white">
      <MarketingNav />
      <article className="mx-auto max-w-3xl px-6 pb-24 pt-28">
        <Link href="/guides" className="inline-flex items-center gap-2 text-[13px] text-zinc-500 hover:text-white"><ArrowLeft size={15} /> All guides</Link>
        <div className="mt-12 flex items-center gap-3 text-[11px] font-semibold uppercase text-zinc-500"><span>{guide.category}</span><span className="h-1 w-1 rounded-full bg-zinc-700" /><span>{guide.readTime}</span></div>
        <h1 className="mt-4 text-[40px] font-medium leading-[1.05] sm:text-[54px]">{guide.title}</h1>
        <p className="mt-5 text-[17px] leading-8 text-zinc-400">{guide.description}</p>
        <div className="mt-14 space-y-px overflow-hidden rounded-lg border border-white/10 bg-white/10">
          {guide.steps.map((step, index) => (
            <section key={step.title} className="grid gap-4 bg-[#101014] p-7 sm:grid-cols-[48px_1fr] sm:p-9">
              <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-[12px] font-semibold text-cyan-300">{index + 1}</span>
              <div><h2 className="text-[20px] font-semibold">{step.title}</h2><p className="mt-2 text-[14px] leading-6 text-zinc-400">{step.body}</p></div>
            </section>
          ))}
        </div>
        <section className="mt-10 border-l-2 border-violet-400 bg-white/[0.025] p-6">
          <h2 className="text-[15px] font-semibold">Small details that help</h2>
          <ul className="mt-4 space-y-3">{guide.tips.map((tip) => <li key={tip} className="flex gap-2.5 text-[13.5px] leading-6 text-zinc-400"><Check size={15} className="mt-1 shrink-0 text-violet-300" />{tip}</li>)}</ul>
        </section>
        <Link href={guide.editorHref} className="mt-10 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-[13.5px] font-semibold text-zinc-900 hover:bg-zinc-200">Start this workflow <ArrowRight size={16} /></Link>
      </article>
      <MarketingFooter />
    </main>
  );
}
