import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Braces, Check, TerminalSquare } from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";

export const metadata: Metadata = {
  title: "Screenshot Render API Alpha",
  description: "Generate styled screenshot cards from scripts, CI and automation using MockFrame's public SVG render API alpha.",
  alternates: { canonical: "/developers/api" },
};

const example = `const response = await fetch("https://mockframe.app/api/v1/render", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    template: "beautify-screenshot",
    screenshot: "data:image/png;base64,...",
    width: 1200,
    height: 900,
    padding: 80,
    radius: 24,
    backgroundFrom: "#6d28d9",
    backgroundTo: "#0e7490"
  })
});

const svg = await response.text();`;

export default function ApiPage() {
  return (
    <main className="min-h-dvh bg-[#09090b] text-white">
      <MarketingNav />
      <section className="mx-auto grid min-h-[720px] max-w-6xl items-center gap-12 px-6 pb-20 pt-28 lg:grid-cols-2">
        <div>
          <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-cyan-300"><Braces size={16} /> Public alpha</span>
          <h1 className="mt-4 text-[44px] font-medium leading-[1.02] sm:text-[58px]">Generate screenshot cards from code.</h1>
          <p className="mt-5 max-w-xl text-[16px] leading-7 text-zinc-400">Send a base64 screenshot and receive a deterministic, self-contained SVG. Use it in CI, content pipelines, server jobs or any HTTP automation step.</p>
          <div className="mt-7 space-y-2.5">
            {["No API key during alpha", "No uploaded image storage", "CORS enabled", "PNG, JPEG and WebP input"].map((item) => <p key={item} className="flex items-center gap-2 text-[13px] text-zinc-300"><Check size={14} className="text-emerald-400" />{item}</p>)}
          </div>
          <Link href="/tools/website-screenshot" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-[13.5px] font-semibold text-zinc-900 hover:bg-zinc-200">Try the visual workflow <ArrowRight size={16} /></Link>
        </div>
        <div className="overflow-hidden rounded-lg border border-white/10 bg-[#101116] shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-[12px] text-zinc-500"><TerminalSquare size={14} /> JavaScript</div>
          <pre className="overflow-x-auto p-5 text-[12px] leading-6 text-zinc-300"><code>{example}</code></pre>
        </div>
      </section>
      <section className="border-y border-white/10 bg-white/[0.02] py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-[25px] font-semibold">Alpha contract</h2>
          <p className="mt-3 max-w-3xl text-[13.5px] leading-6 text-zinc-400">The current endpoint intentionally covers one reliable template and SVG output. API keys, URL inputs, raster output, saved templates and usage plans will be versioned additions; the existing request shape will remain compatible within v1.</p>
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}
