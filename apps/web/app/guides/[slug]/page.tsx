import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Clock, ListOrdered } from "lucide-react";
import { GuideShot } from "@/components/marketing/GuideShot";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { getGuide, GUIDES } from "@/lib/guides";
import { metaDescription, SITE_NAME, SITE_URL, socialMeta } from "@/lib/site";
import { safeJsonLd } from "@/lib/jsonLd";

export function generateStaticParams() {
  return GUIDES.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const guide = getGuide((await params).slug);
  if (!guide) return {};
  return {
    title: guide.title,
    description: metaDescription(guide.description),
    alternates: { canonical: `/guides/${guide.slug}` },
    ...socialMeta({ path: `/guides/${guide.slug}`, title: `${guide.title} — ${SITE_NAME}`, description: metaDescription(guide.description), image: guide.og ?? guide.hero ?? null, type: "article" }),
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const guide = getGuide((await params).slug);
  if (!guide) notFound();

  const guideUrl = `${SITE_URL}/guides/${guide.slug}`;
  const related = GUIDES.filter((g) => g.slug !== guide.slug).slice(0, 3);
  const accent = guide.accent ?? "#a78bfa";
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "HowTo",
        name: guide.title,
        description: guide.description,
        ...(guide.hero ? { image: `${SITE_URL}${guide.hero}` } : {}),
        step: guide.steps.map((step, i) => ({
          "@type": "HowToStep",
          position: i + 1,
          name: step.title,
          text: step.body,
          ...(step.image ? { image: `${SITE_URL}${step.image}` } : {}),
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE_URL}/guides` },
          { "@type": "ListItem", position: 3, name: guide.title, item: guideUrl },
        ],
      },
    ],
  };

  return (
    <main className="min-h-dvh bg-[#09090b] text-white">
      <MarketingNav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />

      {/* hero */}
      <header className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[1100px] -translate-x-1/2" style={{ background: `radial-gradient(ellipse at 50% 0%, ${accent}2e, transparent 65%)` }} />
        <div className="relative mx-auto max-w-6xl px-6 pt-28">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[13px] text-zinc-500">
            <Link href="/guides" className="inline-flex items-center gap-1.5 hover:text-white"><ArrowLeft size={14} /> Guides</Link>
            <span aria-hidden>/</span>
            <span className="text-zinc-400">{guide.category}</span>
          </nav>
          <div className="mt-8 grid items-end gap-8 lg:grid-cols-[1fr_auto]">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ background: `${accent}22`, color: accent }}>{guide.category}</span>
              <h1 className="mt-4 text-[36px] font-semibold leading-[1.05] tracking-[-0.035em] sm:text-[52px]">{guide.title}</h1>
              <p className="mt-4 max-w-2xl text-[16.5px] leading-8 text-zinc-400">{guide.description}</p>
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-zinc-500">
                <span className="inline-flex items-center gap-2"><Clock size={15} /> {guide.readTime} read</span>
                <span className="inline-flex items-center gap-2"><ListOrdered size={15} /> {guide.steps.length} steps</span>
              </div>
            </div>
            <Link href={guide.editorHref} className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[13.5px] font-semibold text-zinc-950 transition-colors hover:bg-zinc-200">
              Try it now <ArrowRight size={15} />
            </Link>
          </div>
          {guide.hero && <GuideShot src={guide.hero} alt={guide.heroBare ? `${guide.title}: example screenshots` : `${guide.title}, inside the MockFrame editor`} accent={accent} bare={guide.heroBare} priority className="mt-12" />}
        </div>
      </header>

      {/* steps, with a sticky index on wide screens */}
      <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-4 pt-24 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-28">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">In this guide</p>
            <ol className="mt-4 space-y-1 border-l border-white/10">
              {guide.steps.map((step, index) => (
                <li key={step.title}>
                  <a href={`#step-${index + 1}`} className="-ml-px flex gap-3 border-l border-transparent py-1.5 pl-4 text-[13px] leading-5 text-zinc-400 transition-colors hover:border-white/40 hover:text-white">
                    <span className="tabular-nums text-zinc-600">{String(index + 1).padStart(2, "0")}</span>
                    {step.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </aside>
        <div className="space-y-20">
          {guide.steps.map((step, index) => (
            <article key={step.title} id={`step-${index + 1}`} className="scroll-mt-28">
              <div className="flex items-start gap-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-[14px] font-bold text-black" style={{ background: accent, boxShadow: `0 10px 30px ${accent}55` }}>
                  {index + 1}
                </span>
                <div className="max-w-2xl">
                  <h2 className="text-[24px] font-semibold tracking-[-0.02em] sm:text-[28px]">{step.title}</h2>
                  <p className="mt-3 text-[15.5px] leading-7 text-zinc-400">{step.body}</p>
                </div>
              </div>
              {step.image && step.image !== guide.hero && <GuideShot src={step.image} alt={step.imageAlt ?? step.title} accent={accent} className="mt-8" />}
            </article>
          ))}
        </div>
      </section>

      {/* tips + CTA */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border p-8" style={{ borderColor: `${accent}33`, background: `linear-gradient(160deg, ${accent}14, transparent 60%)` }}>
            <h2 className="text-[17px] font-semibold">Small details that help</h2>
            <ul className="mt-5 space-y-3.5">
              {guide.tips.map((tip) => (
                <li key={tip} className="flex gap-3 text-[14px] leading-6 text-zinc-300">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full" style={{ background: `${accent}26`, color: accent }}><Check size={12} strokeWidth={3} /></span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-[#0f1015] p-8">
            <div>
              <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.02em]">Ready to try it?</h2>
              <p className="mt-2 text-[14px] leading-6 text-zinc-400">Free, no sign-up, and it runs in your browser.</p>
            </div>
            <Link href={guide.editorHref} className="mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-white px-6 py-3 text-[14px] font-semibold text-zinc-900 transition-colors hover:bg-zinc-200">
              Start this workflow <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* related */}
      <section className="mx-auto max-w-6xl border-t border-white/10 px-6 py-16">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Keep reading</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-3">
          {related.map((g) => (
            <Link key={g.slug} href={`/guides/${g.slug}`} className="group overflow-hidden rounded-2xl border border-white/10 bg-[#0f1015] transition-colors hover:border-white/25">
              {g.hero && (
                <div className="relative aspect-[16/10] overflow-hidden border-b border-white/[0.06]" style={{ background: `radial-gradient(80% 90% at 50% 100%, ${g.accent ?? "#a78bfa"}40, #0c0c11 70%)` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.hero} alt="" loading="lazy" className="absolute left-[7%] top-[12%] w-[118%] max-w-none rounded-tl-xl border-l border-t border-white/15 transition-transform duration-500 group-hover:-translate-y-1" />
                </div>
              )}
              <div className="p-5">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em]" style={{ color: g.accent ?? "#c4b5fd" }}>{g.category}</p>
                <h3 className="mt-2 text-[15px] font-semibold leading-snug text-white">{g.title}</h3>
                <span className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-zinc-400 group-hover:text-white">Read <ArrowRight size={12} /></span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}
