import type { Metadata } from "next";
import { socialMeta } from "@/lib/site";
import Link from "next/link";
import { ArrowRight, BookOpen, Clock, ListOrdered } from "lucide-react";
import { GuideShot } from "@/components/marketing/GuideShot";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { Reveal, RevealGroup, RevealItem } from "@/components/marketing/Reveal";
import { GUIDES } from "@/lib/guides";
import { ARTICLES, formatArticleDate } from "@/lib/articles";

export const metadata: Metadata = {
  title: "Guides",
  description: "Step-by-step MockFrame guides: store listing sets, device mockups, content cards, full-page website capture, replay videos and team themes.",
  alternates: { canonical: "/guides" },
  ...socialMeta({ path: "/guides", title: "Guides — MockFrame", description: "Step-by-step MockFrame guides: store listing sets, device mockups, content cards, full-page website capture, replay videos and team themes." }),
};

const minutes = (readTime: string) => Number.parseInt(readTime, 10) || 0;

export default function GuidesPage() {
  const [featured, ...rest] = GUIDES;
  const total = GUIDES.reduce((sum, guide) => sum + minutes(guide.readTime), 0);

  return (
    <main className="min-h-dvh bg-[#09090b] text-white">
      <MarketingNav />

      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[1100px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_50%_0%,rgba(99,102,241,0.22),transparent_65%)]" />
        <div className="relative mx-auto max-w-6xl px-6 pb-14 pt-32">
          <Reveal className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[12px] font-medium text-zinc-300">
              <BookOpen size={14} className="text-cyan-300" /> Guides
            </p>
            <h1 className="mt-5 text-[42px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[64px]">
              Learn MockFrame{" "}
              <span className="bg-gradient-to-r from-cyan-200 via-indigo-200 to-fuchsia-200 bg-clip-text text-transparent">in minutes.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[16px] leading-7 text-zinc-400">
              Short, screenshot-led walkthroughs for the jobs people open MockFrame to finish, from a full App Store listing to a single shareable card.
            </p>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-zinc-500">
              <span className="inline-flex items-center gap-2"><ListOrdered size={15} /> {GUIDES.length} guides</span>
              <span className="inline-flex items-center gap-2"><Clock size={15} /> {total} minutes to read them all</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* featured */}
      <section className="mx-auto max-w-6xl px-6">
        <Reveal>
          <Link
            href={`/guides/${featured.slug}`}
            className="group grid items-center gap-10 overflow-hidden rounded-[28px] border border-white/10 bg-[#0f1015] p-6 transition-colors hover:border-white/25 sm:p-10 lg:grid-cols-[0.85fr_1.15fr]"
          >
            <div>
              <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.12em]">
                <span className="rounded-full px-2.5 py-1" style={{ background: `${featured.accent}22`, color: featured.accent }}>New · {featured.category}</span>
                <span className="text-zinc-500">{featured.readTime} read</span>
              </div>
              <h2 className="mt-5 text-[28px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[36px]">{featured.title}</h2>
              <p className="mt-4 text-[15px] leading-7 text-zinc-400">{featured.description}</p>
              <ol className="mt-6 space-y-2.5">
                {featured.steps.map((step, i) => (
                  <li key={step.title} className="flex items-center gap-3 text-[14px] text-zinc-300">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold text-black" style={{ background: featured.accent }}>{i + 1}</span>
                    {step.title}
                  </li>
                ))}
              </ol>
              <span className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[13.5px] font-semibold text-zinc-950 transition-colors group-hover:bg-zinc-200">
                Read the guide <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
            {featured.hero && <GuideShot src={featured.hero} alt={`${featured.title}: example screenshots`} accent={featured.accent} bare={featured.heroBare} priority className="transition-transform duration-500 group-hover:-translate-y-1" />}
          </Link>
        </Reveal>
      </section>

      {/* everything else */}
      <section className="mx-auto max-w-6xl px-6 pb-28 pt-16">
        <Reveal>
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-zinc-500">All guides</h2>
        </Reveal>
        <RevealGroup className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((guide, i) => {
            // with a remainder of one, the first and last cards go wide so no card sits alone
            const wide = rest.length % 3 === 1 && (i === 0 || i === rest.length - 1);
            return (
            <RevealItem key={guide.slug} className={wide ? "lg:col-span-2" : ""}>
              <Link
                href={`/guides/${guide.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f1015] transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-white/25"
              >
                <div className={`relative aspect-[16/10] overflow-hidden border-b border-white/[0.06] ${wide ? "lg:aspect-[16/6.6]" : ""}`} style={{ background: `radial-gradient(80% 90% at 50% 100%, ${guide.accent ?? "#a78bfa"}40, #0c0c11 70%)` }}>
                  {guide.hero && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={guide.hero}
                      alt=""
                      loading="lazy"
                      className={`absolute left-[7%] top-[12%] max-w-none rounded-tl-xl border-l border-t border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.6)] transition-transform duration-500 group-hover:-translate-x-1 group-hover:-translate-y-1 ${wide ? "w-[118%] lg:w-[70%] lg:left-[15%]" : "w-[118%]"}`}
                      
                    />
                  )}
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.1em]">
                    <span style={{ color: guide.accent ?? "#c4b5fd" }}>{guide.category}</span>
                    <span className="text-zinc-500">{guide.readTime}</span>
                  </div>
                  <h3 className="mt-3 text-[18px] font-semibold leading-snug tracking-[-0.01em]">{guide.title}</h3>
                  <p className="mt-2 flex-1 text-[13.5px] leading-6 text-zinc-400">{guide.description}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-[13px] font-semibold text-white">
                    {guide.steps.length} steps <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </RevealItem>
            );
          })}
        </RevealGroup>
      </section>

      {/* long-form reference articles (lib/articles.ts) */}
      <section className="mx-auto max-w-6xl px-6 pb-28">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Reference</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {ARTICLES.map((article) => (
            <Link
              key={article.slug}
              href={`/guides/${article.slug}`}
              className="group flex flex-col rounded-2xl border border-white/10 bg-[#0f1015] p-6 transition-colors hover:border-white/25"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                Updated {formatArticleDate(article.updated)} · {article.readTime}
              </span>
              <h3 className="mt-3 text-[18px] font-semibold leading-snug tracking-[-0.01em]">{article.title}</h3>
              <p className="mt-2 flex-1 text-[13.5px] leading-6 text-zinc-400">{article.description}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-[13px] font-semibold text-white">
                Read <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}
