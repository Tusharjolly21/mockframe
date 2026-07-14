import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, PanelsTopLeft } from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";

export const metadata: Metadata = {
  title: "Embed the MockFrame Editor",
  description: "Add MockFrame's screenshot mockup editor to your product with one script and one web component.",
  alternates: { canonical: "/developers/embed" },
};

const snippet = `<script src="https://mockframe.app/embed.js" defer></script>

<mockframe-editor height="720px"></mockframe-editor>`;

export default function EmbedPage() {
  return (
    <main className="min-h-dvh bg-[#09090b] text-white">
      <MarketingNav />
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-32">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-violet-300"><PanelsTopLeft size={16} /> Embed alpha</p>
        <div className="mt-4 grid items-end gap-8 lg:grid-cols-[1fr_0.8fr]">
          <h1 className="max-w-3xl text-[44px] font-medium leading-[1.02] sm:text-[58px]">Put the complete mockup workflow inside your product.</h1>
          <div><p className="text-[15px] leading-7 text-zinc-400">One hosted script registers a responsive web component. The editor stays isolated inside an iframe and emits a ready event for host applications.</p><Link href="/embed/editor" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-[13px] font-semibold text-zinc-900">Open embedded editor <ArrowRight size={15} /></Link></div>
        </div>
      </section>
      <section className="border-y border-white/10 bg-white/[0.02] py-16">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-lg border border-white/10 bg-[#101116]"><div className="border-b border-white/10 px-4 py-3 text-[11px] text-zinc-500">HTML</div><pre className="overflow-x-auto p-5 text-[13px] leading-7 text-zinc-300"><code>{snippet}</code></pre></div>
          <div><h2 className="text-[25px] font-semibold">Designed for a stable integration</h2><div className="mt-6 space-y-4">{["No framework dependency", "Responsive host-controlled height", "Clipboard permission support", "mockframe-ready DOM event"].map((item) => <p key={item} className="flex items-center gap-2.5 text-[13.5px] text-zinc-300"><Check size={15} className="text-emerald-400" />{item}</p>)}</div><p className="mt-7 text-[12.5px] leading-6 text-zinc-500">The alpha exposes the full editor. Scene input, export callbacks, signed embed tokens and domain restrictions are the next versioned additions before general availability.</p></div>
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}
