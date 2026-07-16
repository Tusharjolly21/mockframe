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
    openGraph: { title: `${guide.title} — ${SITE_NAME}`, description: guide.description, url: `/guides/${guide.slug}`, type: "article" },
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const guide = getGuide((await params).slug);
  if (!guide) notFound();

  const guideUrl = `${SITE_URL}/guides/${guide.slug}`;
  const related = GUIDES.filter((g) => g.slug !== guide.slug).slice(0, 3);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      // HowTo — the numbered steps are rendered on the page below, which Google
      // requires for a legitimate HowTo rich result.
      {
        "@type": "HowTo",
        name: guide.title,
        description: guide.description,
        step: guide.steps.map((step, i) => ({
          "@type": "HowToStep",
          position: i + 1,
          name: step.title,
          text: step.body,
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

        <section className="mt-20 border-t border-white/10 pt-10">
          <h2 className="text-[15px] font-semibold text-zinc-300">Keep reading</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {related.map((g) => (
              <Link key={g.slug} href={`/guides/${g.slug}`} className="group rounded-lg border border-white/10 bg-white/[0.02] p-5 transition-colors hover:border-white/20 hover:bg-white/[0.04]">
                <p className="text-[10.5px] font-semibold uppercase tracking-wide text-zinc-500">{g.category}</p>
                <h3 className="mt-2 text-[14px] font-semibold leading-snug text-white">{g.title}</h3>
                <span className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-zinc-400 group-hover:text-white">Read <ArrowRight size={12} /></span>
              </Link>
            ))}
          </div>
        </section>
      </article>
      <MarketingFooter />
    </main>
  );
}
