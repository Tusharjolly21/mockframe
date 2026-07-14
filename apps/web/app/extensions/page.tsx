import type { Metadata } from "next";
import { Chrome, Code2, ShieldCheck } from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";

export const metadata: Metadata = { title: "Extensions", description: "Capture a browser tab or send selected code into MockFrame with the Chrome and VS Code extension alphas.", alternates: { canonical: "/extensions" } };

const items = [
  { name: "Chrome capture", icon: Chrome, body: "Capture the visible tab and open it as a new MockFrame shot. The image is removed from extension storage after the editor confirms receipt.", status: "Unpacked alpha" },
  { name: "VS Code selection", icon: Code2, body: "Send selected source code, language and filename directly into the code screenshot workflow.", status: "Development alpha" },
];

export default function ExtensionsPage() {
  return (
    <main className="min-h-dvh bg-[#09090b] text-white"><MarketingNav />
      <section className="mx-auto max-w-5xl px-6 pb-16 pt-32"><p className="flex items-center gap-2 text-[13px] font-semibold text-violet-300"><ShieldCheck size={16} /> Local-first handoffs</p><h1 className="mt-4 text-[42px] font-medium leading-[1.03] sm:text-[58px]">Start closer to the source.</h1><p className="mt-5 max-w-2xl text-[16px] leading-7 text-zinc-400">Two small extension alphas remove the download, rename and re-upload loop.</p></section>
      <section className="mx-auto grid max-w-5xl gap-4 px-6 pb-24 sm:grid-cols-2">{items.map(({ name, icon: Icon, body, status }) => <article key={name} className="rounded-lg border border-white/10 bg-[#101014] p-8"><span className="grid h-11 w-11 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-cyan-300"><Icon size={21} /></span><p className="mt-8 text-[11px] font-semibold uppercase text-zinc-500">{status}</p><h2 className="mt-2 text-[24px] font-semibold">{name}</h2><p className="mt-3 text-[13.5px] leading-6 text-zinc-400">{body}</p><p className="mt-7 text-[12px] leading-5 text-zinc-600">Marketplace publication is pending store review and signed release packaging.</p></article>)}</section>
      <MarketingFooter />
    </main>
  );
}
