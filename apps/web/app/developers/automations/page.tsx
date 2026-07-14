import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Workflow } from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";

export const metadata: Metadata = {
  title: "Zapier and Make Automations",
  description: "Connect MockFrame's render endpoint to Zapier Webhooks, Make HTTP modules and other automation tools.",
  alternates: { canonical: "/developers/automations" },
};

const tools = [
  { name: "Zapier", step: "Add Webhooks by Zapier, choose POST, and send JSON to https://mockframe.app/api/v1/render." },
  { name: "Make", step: "Add an HTTP Make a request module, choose POST, and set the body type to application/json." },
  { name: "n8n", step: "Use an HTTP Request node with POST and return the response as text for SVG output." },
];

export default function AutomationsPage() {
  return (
    <main className="min-h-dvh bg-[#09090b] text-white"><MarketingNav />
      <section className="mx-auto max-w-5xl px-6 pb-16 pt-32"><p className="flex items-center gap-2 text-[13px] font-semibold text-cyan-300"><Workflow size={16} /> HTTP automations</p><h1 className="mt-4 max-w-3xl text-[42px] font-medium leading-[1.03] sm:text-[58px]">Put screenshot rendering inside the tools you already use.</h1><p className="mt-5 max-w-2xl text-[16px] leading-7 text-zinc-400">The alpha API works with generic HTTP and webhook steps today. A marketplace app is not required to test the workflow.</p></section>
      <section className="mx-auto grid max-w-5xl gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-3">{tools.map((tool, index) => <div key={tool.name} className="bg-[#101014] p-7"><span className="text-[11px] font-semibold text-zinc-600">0{index + 1}</span><h2 className="mt-6 text-[20px] font-semibold">{tool.name}</h2><p className="mt-3 text-[13px] leading-6 text-zinc-400">{tool.step}</p></div>)}</section>
      <section className="mx-auto max-w-5xl px-6 py-16"><p className="text-[13.5px] leading-6 text-zinc-400">Send the same body documented by the Render API. During alpha, use data URLs from a trusted storage step and keep the request below the documented input limit.</p><Link href="/developers/api" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-[13px] font-semibold text-zinc-900">View API contract <ArrowRight size={15} /></Link></section>
      <MarketingFooter />
    </main>
  );
}
