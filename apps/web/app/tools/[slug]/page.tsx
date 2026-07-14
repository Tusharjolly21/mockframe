import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, MousePointer2 } from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { TOOL_PAGES, toolPage } from "@/lib/toolPages";

export function generateStaticParams() {
  return TOOL_PAGES.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const tool = toolPage((await params).slug);
  if (!tool) return { title: "Tool not found" };
  return {
    title: tool.name,
    description: tool.description,
    alternates: { canonical: `/tools/${tool.slug}` },
    openGraph: { title: `${tool.name} — ${SITE_NAME}`, description: tool.description, url: `/tools/${tool.slug}`, images: [tool.image] },
  };
}

export default async function ToolPageRoute({ params }: { params: Promise<{ slug: string }> }) {
  const tool = toolPage((await params).slug);
  if (!tool) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: tool.name,
    url: `${SITE_URL}/tools/${tool.slug}`,
    applicationCategory: "DesignApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  return (
    <main className="min-h-dvh bg-[#09090b] text-white">
      <MarketingNav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="mx-auto grid min-h-[min(820px,92vh)] max-w-6xl items-center gap-14 px-6 pb-16 pt-28 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-[13px] font-semibold" style={{ color: tool.accent }}>{tool.eyebrow}</p>
          <h1 className="mt-4 max-w-xl text-[42px] font-medium leading-[1.02] sm:text-[58px]">{tool.name}</h1>
          <p className="mt-5 max-w-xl text-[16px] leading-7 text-zinc-400">{tool.description}</p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href={tool.editorHref} className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-[14px] font-semibold text-zinc-900 hover:bg-zinc-200">
              {tool.cta} <ArrowRight size={17} />
            </Link>
            <span className="inline-flex items-center gap-1.5 text-[13px] text-zinc-500"><Check size={14} /> No sign-up to start</span>
          </div>
        </div>

        <Link href={tool.editorHref} aria-label={`Open ${tool.name}`} className="group relative block overflow-hidden rounded-lg border border-white/10 bg-[#111217] p-8 shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
          <div className="absolute inset-x-0 top-0 h-1" style={{ background: tool.accent }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={tool.image} alt={tool.imageAlt} className="mx-auto h-[440px] max-w-full object-contain transition-transform duration-500 group-hover:-translate-y-1 group-hover:scale-[1.02]" />
          <span className="absolute bottom-5 right-5 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-[12px] font-semibold text-zinc-900 shadow-lg"><MousePointer2 size={14} /> Open workflow</span>
        </Link>
      </section>

      <section className="border-y border-white/[0.07] bg-white/[0.02] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-[30px] font-medium">From source to finished image</h2>
          <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.08] md:grid-cols-3">
            {tool.steps.map(([title, body], index) => (
              <div key={title} className="bg-[#0d0d10] p-7">
                <span className="text-[12px] font-semibold" style={{ color: tool.accent }}>0{index + 1}</span>
                <h3 className="mt-4 text-[17px] font-semibold">{title}</h3>
                <p className="mt-2 text-[13.5px] leading-6 text-zinc-500">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-10 md:grid-cols-3">
          {tool.benefits.map(([title, body]) => (
            <div key={title} className="border-t border-white/10 pt-5">
              <h2 className="text-[16px] font-semibold">{title}</h2>
              <p className="mt-2 text-[13.5px] leading-6 text-zinc-500">{body}</p>
            </div>
          ))}
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}
