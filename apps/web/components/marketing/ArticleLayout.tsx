import Link from "next/link";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { formatArticleDate, type Article } from "@/lib/articles";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { safeJsonLd } from "@/lib/jsonLd";

export interface ArticleSection {
  id: string;
  title: string;
}

/** Shared shell for long-form reference articles (see lib/articles.ts). */
export function ArticleLayout({
  article,
  sections,
  faq,
  intro,
  children,
}: {
  article: Article;
  sections: ArticleSection[];
  faq: { q: string; a: string }[];
  intro: React.ReactNode;
  children: React.ReactNode;
}) {
  const url = `${SITE_URL}/guides/${article.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: article.title,
        description: article.description,
        dateModified: article.updated,
        mainEntityOfPage: url,
        author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE_URL}/guides` },
          { "@type": "ListItem", position: 3, name: article.title, item: url },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
    ],
  };

  return (
    <main className="min-h-dvh bg-[#09090b] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <MarketingNav />
      <article className="mx-auto max-w-3xl px-6 pb-20 pt-28 text-white/75">
        <nav className="flex items-center gap-1.5 text-[13px] text-zinc-500" aria-label="Breadcrumb">
          <Link href="/guides" className="hover:text-zinc-300">
            Guides
          </Link>
          <span>/</span>
          <span className="text-zinc-400">Reference</span>
        </nav>
        <h1 className="mt-4 text-[32px] font-bold leading-tight text-white sm:text-[40px]">{article.title}</h1>
        <p className="mt-4 text-[13px] text-zinc-500">
          By the {SITE_NAME} team · Updated <time dateTime={article.updated}>{formatArticleDate(article.updated)}</time> ·{" "}
          {article.readTime} read
        </p>
        <div className="mt-6 space-y-4 text-[15.5px] leading-7 text-white/70">{intro}</div>

        <nav className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-5" aria-label="Contents">
          <p className="text-[13px] font-semibold text-white">Contents</p>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[14px]">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-violet-300 underline-offset-2 hover:underline">
                  {s.title}
                </a>
              </li>
            ))}
            <li>
              <a href="#faq" className="text-violet-300 underline-offset-2 hover:underline">
                Frequently asked questions
              </a>
            </li>
          </ol>
        </nav>

        <div className="article-body">{children}</div>

        <h2 id="faq" className="mt-16 scroll-mt-24 text-[24px] font-bold text-white">
          Frequently asked questions
        </h2>
        <dl className="mt-6 space-y-6">
          {faq.map((f) => (
            <div key={f.q}>
              <dt className="font-semibold text-white">{f.q}</dt>
              <dd className="mt-1 leading-7 text-white/65">{f.a}</dd>
            </div>
          ))}
        </dl>
      </article>
      <MarketingFooter />
    </main>
  );
}

/* small building blocks so article pages read like prose, not class soup */

export function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mt-16 scroll-mt-24 text-[24px] font-bold text-white">
      {children}
    </h2>
  );
}

export function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-8 text-[17px] font-semibold text-white">{children}</h3>;
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 text-[15.5px] leading-7 text-white/70">{children}</p>;
}

export function Table({ head, rows, caption }: { head: string[]; rows: React.ReactNode[][]; caption?: string }) {
  return (
    <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full min-w-[520px] text-left text-[13.5px]">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="bg-white/[0.03] text-white/50">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.06]">
          {rows.map((row, i) => (
            <tr key={i} className="align-top text-white/70">
              {row.map((cell, j) => (
                <td key={j} className={j === 0 ? "px-4 py-3 font-medium text-white" : "px-4 py-3"}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function UL({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-7 text-white/70">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export const linkClass = "text-violet-300 underline-offset-2 hover:underline";
