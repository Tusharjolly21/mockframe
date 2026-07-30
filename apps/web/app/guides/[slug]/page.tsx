import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { getGuide, GUIDES } from "@/lib/guides";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export function generateStaticParams() {
  return GUIDES.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const guide = getGuide((await params).slug);
  if (!guide) return {};
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `/guides/${guide.slug}` },
    openGraph: {
      title: `${guide.title} — ${SITE_NAME}`,
      description: guide.description,
      url: `/guides/${guide.slug}`,
      type: "article",
      ...(guide.hero ? { images: [guide.hero] } : {}),
    },
  };
}

/** Screenshot in a “window” card: chrome dots + border + glow. */
function Shot({ src, alt }: { src: string; alt: string }) {
  return (
    <figure className="group relative overflow-hidden rounded-xl border border-white/10 bg-[#101014] shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
      <div className="flex items-center gap-1.5 border-b border-white/[0.06] bg-white/[0.03] px-3.5 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" className="w-full transition-transform duration-500 group-hover:scale-[1.015]" />
    </figure>
  );
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const guide = getGuide((await params).slug);
  if (!guide) notFound();

  const guideUrl = `${SITE_URL}/guides/${guide.slug}`;
  const related = GUIDES.filter((g) => g.slug !== guide.slug).slice(0, 3);
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* hero */}
      <header className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[900px] -translate-x-1/2" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.16), transparent 70%)" }} />
        <div className="mx-auto max-w-5xl px-6 pt-28">
          <Link href="/guides" className="inline-flex items-center gap-2 text-[13px] text-zinc-500 hover:text-white"><ArrowLeft size={15} /> All guides</Link>
          <div className="mt-8 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-violet-300">{guide.category}</span>
            <span>{guide.readTime} read</span>
          </div>
          <h1 className="mt-4 max-w-3xl text-[38px] font-medium leading-[1.06] tracking-[-0.02em] sm:text-[50px]">{guide.title}</h1>
          <p className="mt-4 max-w-2xl text-[16.5px] leading-8 text-zinc-400">{guide.description}</p>
          {guide.hero && (
            <div className="mt-10">
              <Shot src={guide.hero} alt={`${guide.title} — inside the MockFrame editor`} />
            </div>
          )}
        </div>
      </header>

      {/* steps — alternating text/screenshot */}
      <section className="mx-auto max-w-5xl px-6 pb-4 pt-16">
        <div className="space-y-16">
          {guide.steps.map((step, index) => (
            <article key={step.title} className={`grid items-center gap-8 ${step.image ? "lg:grid-cols-2" : ""}`}>
              <div className={step.image && index % 2 === 1 ? "lg:order-2" : ""}>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-[13px] font-bold text-white shadow-[0_8px_24px_rgba(124,58,237,0.4)]">
                  {index + 1}
                </span>
                <h2 className="mt-4 text-[24px] font-semibold tracking-[-0.01em]">{step.title}</h2>
                <p className="mt-3 max-w-xl text-[15px] leading-7 text-zinc-400">{step.body}</p>
              </div>
              {step.image && (
                <div className={index % 2 === 1 ? "lg:order-1" : ""}>
                  <Shot src={step.image} alt={step.imageAlt ?? step.title} />
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* tips */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="rounded-2xl border border-violet-400/20 bg-violet-500/[0.06] p-7">
          <h2 className="text-[15px] font-semibold text-violet-200">Small details that help</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {guide.tips.map((tip) => (
              <li key={tip} className="flex gap-2.5 text-[13.5px] leading-6 text-zinc-300">
                <Check size={15} className="mt-1 shrink-0 text-violet-300" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link href={guide.editorHref} className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-[14px] font-semibold text-zinc-900 hover:bg-zinc-200">
            Start this workflow <ArrowRight size={16} />
          </Link>
          <span className="text-[12.5px] text-zinc-500">Free · no sign-up · runs in your browser</span>
        </div>
      </section>

      {/* related */}
      <section className="mx-auto max-w-5xl border-t border-white/10 px-6 py-14">
        <h2 className="text-[15px] font-semibold text-zinc-300">Keep reading</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {related.map((g) => (
            <Link key={g.slug} href={`/guides/${g.slug}`} className="group overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] transition-colors hover:border-white/25 hover:bg-white/[0.04]">
              {g.hero && (
                <div className="aspect-[16/9] overflow-hidden border-b border-white/[0.06]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.hero} alt="" loading="lazy" className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105" />
                </div>
              )}
              <div className="p-5">
                <p className="text-[10.5px] font-semibold uppercase tracking-wide text-zinc-500">{g.category}</p>
                <h3 className="mt-2 text-[14px] font-semibold leading-snug text-white">{g.title}</h3>
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
