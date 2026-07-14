import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";

export const metadata: Metadata = { title: "Changelog", description: "New workflows, fixes and platform updates in MockFrame.", alternates: { canonical: "/changelog" } };

const RELEASES = [
  { date: "July 14, 2026", title: "Workflows beyond the editor", items: ["Public screenshot Render API alpha", "Embeddable editor alpha", "Chrome capture and VS Code selection handoffs", "Practical guides and public pricing"] },
  { date: "July 13, 2026", title: "A faster, clearer first session", items: ["Reduced the editor's initial JavaScript footprint", "Added guided Screen, Device, Style and Export steps", "Improved keyboard navigation in selection popovers", "Added first-use and export analytics events"] },
  { date: "July 12, 2026", title: "Themes and production capture", items: ["Theme JSON import and export", "Personal reusable scene templates", "Full-page URL capture with lazy-load preparation", "Code diff rendering and resizable social post layouts"] },
];

export default function ChangelogPage() {
  return (
    <main className="min-h-dvh bg-[#09090b] text-white"><MarketingNav />
      <section className="mx-auto max-w-4xl px-6 pb-16 pt-32"><p className="text-[13px] font-semibold text-violet-300">Product updates</p><h1 className="mt-4 text-[44px] font-medium sm:text-[58px]">Changelog</h1><p className="mt-4 max-w-xl text-[16px] leading-7 text-zinc-400">A plain record of what changed and what is ready to use.</p></section>
      <section className="mx-auto max-w-4xl px-6 pb-24">{RELEASES.map((release) => <article key={release.date} className="grid gap-6 border-t border-white/10 py-10 sm:grid-cols-[150px_1fr]"><time className="text-[12px] font-medium text-zinc-500">{release.date}</time><div><h2 className="text-[24px] font-semibold">{release.title}</h2><ul className="mt-5 space-y-3">{release.items.map((item) => <li key={item} className="flex items-start gap-2.5 text-[13.5px] leading-6 text-zinc-400"><CheckCircle2 size={15} className="mt-1 shrink-0 text-cyan-300" />{item}</li>)}</ul></div></article>)}<div className="border-t border-white/10 pt-10"><Link href="/editor" className="inline-flex items-center gap-2 text-[13.5px] font-semibold hover:text-cyan-300">Open the latest build <ArrowRight size={15} /></Link></div></section>
      <MarketingFooter />
    </main>
  );
}
