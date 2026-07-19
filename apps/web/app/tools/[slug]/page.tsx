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

  const toolUrl = `${SITE_URL}/tools/${tool.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: tool.name,
        url: toolUrl,
        applicationCategory: "DesignApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      },
      // HowTo — the numbered steps below are visible on the page, so this is a
      // legitimate rich-result claim (Google requires the steps be on-page).
      {
        "@type": "HowTo",
        name: `How to use the ${tool.name}`,
        description: tool.description,
        step: tool.steps.map(([title, body], i) => ({
          "@type": "HowToStep",
          position: i + 1,
          name: title,
          text: body,
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Tools", item: `${SITE_URL}/tools` },
          { "@type": "ListItem", position: 3, name: tool.name, item: toolUrl },
        ],
      },
      // FAQPage — every Q&A is rendered on the page below, which Google requires
      // for FAQ rich results.
      {
        "@type": "FAQPage",
        mainEntity: tool.faq.map(([q, a]) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: a },
        })),
      },
    ],
  };

  const related = tool.related.map(toolPage).filter((t): t is NonNullable<typeof t> => Boolean(t));

  return (
    <main className="min-h-dvh bg-[#09090b] text-white">
      <MarketingNav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="mx-auto grid min-h-[min(820px,92vh)] max-w-6xl items-center gap-14 px-6 pb-16 pt-28 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-2 text-[12.5px] text-zinc-500">
            <Link href="/tools" className="hover:text-white">Tools</Link>
            <span className="text-zinc-700">/</span>
            <span className="text-zinc-400">{tool.name}</span>
          </nav>
          <p className="text-[13px] font-semibold" style={{ color: tool.accent }}>{tool.eyebrow}</p>
          <h1 className="mt-4 max-w-xl text-[42px] font-medium leading-[1.02] sm:text-[58px]">{tool.name}</h1>
          <p className="mt-5 max-w-xl text-[16px] leading-7 text-zinc-400">{tool.description}</p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href={tool.editorHref} className={`${tool.mobileHref ? "hidden sm:inline-flex" : "inline-flex"} items-center gap-2 rounded-lg bg-white px-5 py-3 text-[14px] font-semibold text-zinc-900 hover:bg-zinc-200`}>
              {tool.cta} <ArrowRight size={17} />
            </Link>
            {tool.mobileHref && (
              <Link href={tool.mobileHref} className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-[14px] font-semibold text-zinc-900 hover:bg-zinc-200 sm:hidden">
                {tool.cta} — on your phone <ArrowRight size={17} />
              </Link>
            )}
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

      <section className="border-t border-white/[0.07] bg-white/[0.02] py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-[26px] font-medium">What you can do with it</h2>
          <p className="mt-6 text-[15.5px] leading-8 text-zinc-400">{tool.overview}</p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-20">
        <h2 className="text-[26px] font-medium">Frequently asked questions</h2>
        <dl className="mt-8 divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {tool.faq.map(([q, a]) => (
            <div key={q} className="py-6">
              <dt className="text-[16px] font-semibold text-white">{q}</dt>
              <dd className="mt-2.5 text-[14px] leading-7 text-zinc-400">{a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {related.length > 0 && (
        <section className="border-t border-white/[0.07] py-16">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-[22px] font-medium">Related tools</h2>
              <Link href="/tools" className="inline-flex items-center gap-1.5 text-[13px] text-zinc-400 hover:text-white">All tools <ArrowRight size={14} /></Link>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {related.map((r) => (
                <Link key={r.slug} href={`/tools/${r.slug}`} className="group rounded-lg border border-white/10 bg-white/[0.02] p-6 transition-colors hover:border-white/20 hover:bg-white/[0.04]">
                  <span className="inline-block h-1 w-8 rounded-full" style={{ background: r.accent }} />
                  <h3 className="mt-4 text-[15.5px] font-semibold text-white">{r.name}</h3>
                  <p className="mt-2 line-clamp-2 text-[13px] leading-6 text-zinc-500">{r.eyebrow}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-zinc-400 group-hover:text-white">Open <ArrowRight size={13} /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
      <MarketingFooter />
    </main>
  );
}
