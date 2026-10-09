import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { SITE_NAME, SITE_URL, socialMeta } from "@/lib/site";
import { safeJsonLd } from "@/lib/jsonLd";
import { COMPARISONS, getComparison } from "@/lib/comparisons";

export const dynamicParams = false;

export function generateStaticParams() {
  return COMPARISONS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = getComparison(slug);
  if (!c) return { title: "Comparison not found", robots: { index: false } };
  const path = `/compare/${c.slug}`;
  return {
    title: c.title,
    description: c.description,
    keywords: c.keywords,
    alternates: { canonical: path },
    ...socialMeta({ path, title: `${c.title} — ${SITE_NAME}`, description: c.description }),
  };
}

const linkClass = "text-violet-300 underline-offset-2 hover:underline";

export default async function ComparePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = getComparison(slug);
  if (!c) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Compare", item: `${SITE_URL}/compare` },
          { "@type": "ListItem", position: 3, name: `${c.name} alternative`, item: `${SITE_URL}/compare/${c.slug}` },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: c.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
    ],
  };

  return (
    <main className="min-h-dvh bg-[#09090b] text-white">
      <MarketingNav />
      <section className="mx-auto max-w-3xl px-6 pb-16 pt-28 text-white/80">
        <p className="text-[13px] font-semibold text-violet-300">
          <Link href="/compare" className="hover:underline">
            Comparison
          </Link>
        </p>
        <h1 className="mt-3 text-[34px] font-bold leading-tight text-white sm:text-[42px]">{c.h1}</h1>
        <p className="mt-5 text-white/60">{c.intro}</p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href={c.cta.href}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-[14px] font-semibold text-zinc-900 hover:bg-zinc-200"
          >
            {c.cta.label} <ArrowRight size={16} />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-5 py-3 text-[14px] font-semibold text-white hover:border-white/30"
          >
            See pricing
          </Link>
        </div>

        <h2 className="mt-14 text-xl font-bold text-white">MockFrame vs {c.name} at a glance</h2>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[560px] text-left text-[13.5px]">
            <thead className="bg-white/[0.03] text-white/50">
              <tr>
                <th className="px-4 py-3 font-medium">&nbsp;</th>
                <th className="px-4 py-3 font-medium text-white/80">MockFrame</th>
                <th className="px-4 py-3 font-medium">{c.name}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {c.rows.map((row) => (
                <tr key={row.dim} className="align-top text-white/70">
                  <td className="px-4 py-3 font-semibold text-white">{row.dim}</td>
                  <td className="px-4 py-3">{row.mockframe}</td>
                  <td className="px-4 py-3 text-white/50">{row.them}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[12.5px] text-white/40">
          {c.name} details are taken from {c.site} as of {c.checked} and may change — check their site for current plans.{" "}
          {c.name} is a trademark of its owner; MockFrame is not affiliated with it.
        </p>

        <h2 className="mt-14 text-xl font-bold text-white">Where each tool wins</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <h3 className="font-semibold text-white">Pick MockFrame if…</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-[14px] text-white/60">
              {c.pickMockframe.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <h3 className="font-semibold text-white">Pick {c.name} if…</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-[14px] text-white/60">
              {c.pickThem.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        </div>

        <h2 className="mt-14 text-xl font-bold text-white">Switching from {c.name}</h2>
        <p className="mt-3 text-white/60">{c.switching}</p>
        <p className="mt-3 text-white/60">
          Start in the{" "}
          <Link href={c.cta.href} className={linkClass}>
            {c.cta.label.replace(/^(Try|Open) the /, "")}
          </Link>{" "}
          or compare plans on the{" "}
          <Link href="/pricing" className={linkClass}>
            pricing page
          </Link>
          .
        </p>

        <h2 className="mt-14 text-xl font-bold text-white">Frequently asked questions</h2>
        <dl className="mt-6 space-y-6">
          {c.faq.map((f) => (
            <div key={f.q}>
              <dt className="font-semibold text-white">{f.q}</dt>
              <dd className="mt-1 text-white/60">{f.a}</dd>
            </div>
          ))}
        </dl>

        <h2 className="mt-14 text-xl font-bold text-white">Related</h2>
        <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
          {c.related.map(([href, label]) => (
            <li key={href}>
              <Link
                href={href}
                className="block rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-[14px] text-white/80 transition-colors hover:border-white/25 hover:text-white"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <MarketingFooter />
    </main>
  );
}
