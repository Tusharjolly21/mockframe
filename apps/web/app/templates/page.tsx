"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight, Link2 } from "lucide-react";
import {
  TEMPLATES,
  templatePreviewUrl,
  activeSceneGroups,
  groupPreviewUrl,
  scenesInGroup,
} from "@/lib/screenTemplates";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { Reveal, RevealGroup, RevealItem } from "@/components/marketing/Reveal";

const TOOL_BACKGROUNDS: Record<string, CSSProperties> = {
  code: {
    backgroundColor: "#141a23",
    backgroundImage: "linear-gradient(rgba(148,163,184,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,.08) 1px,transparent 1px)",
    backgroundSize: "24px 24px",
  },
  "github-contributions": {
    backgroundColor: "#e9f7ef",
    backgroundImage: "radial-gradient(rgba(34,139,76,.16) 1.5px,transparent 1.5px)",
    backgroundSize: "18px 18px",
  },
  "stripe-revenue": {
    backgroundColor: "#eeecff",
    backgroundImage: "repeating-linear-gradient(135deg,rgba(99,91,255,.09) 0 10px,transparent 10px 36px)",
  },
};

export default function TemplatesPage() {
  const router = useRouter();
  const [postUrl, setPostUrl] = useState("");
  const groups = activeSceneGroups();
  const postTemplate = TEMPLATES.find((template) => template.slug === "post")!;
  const postPreview = templatePreviewUrl(postTemplate);
  const tools = TEMPLATES.filter((template) => template.slug !== "post");

  const openPost = () => {
    const url = postUrl.trim();
    router.push(url ? `/templates/post?url=${encodeURIComponent(url)}` : "/templates/post");
  };

  return (
    <main className="min-h-dvh bg-[#09090b] text-white">
      <MarketingNav />

      <section className="mx-auto max-w-7xl px-5 pb-24 pt-28 sm:px-8">
        <Reveal>
          <div className="flex flex-col justify-between gap-5 border-b border-white/10 pb-7 sm:flex-row sm:items-end">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-cyan-300">Template library</p>
              <h1 className="mt-2 text-[34px] font-medium leading-tight sm:text-[46px]">Templates</h1>
            </div>
            <p className="max-w-md text-[14px] leading-6 text-zinc-400">
              Import a public post, build a data card, or choose a real device scene. Everything opens fully editable.
            </p>
          </div>
        </Reveal>

        <Reveal>
          <section className="mt-8 overflow-hidden rounded-lg border border-white/10 bg-[#101116]">
            <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
              <div className="flex flex-col justify-center p-6 sm:p-9 lg:p-12">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-cyan-300">
                  <Link2 size={18} />
                </div>
                <h2 className="mt-5 text-[26px] font-semibold leading-tight sm:text-[34px]">Turn any post URL into a polished graphic.</h2>
                <p className="mt-3 max-w-lg text-[14px] leading-6 text-zinc-400">
                  One workflow for X, Bluesky, Threads, LinkedIn and Mastodon. Paste once, then edit the copy, author, metrics, card size and background.
                </p>
                <form
                  className="mt-7 flex max-w-xl gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    openPost();
                  }}
                >
                  <input
                    value={postUrl}
                    onChange={(event) => setPostUrl(event.target.value)}
                    placeholder="Paste a public post URL"
                    aria-label="Public post URL"
                    className="min-w-0 flex-1 rounded-lg border border-white/12 bg-white/[0.06] px-4 py-3 text-[14px] text-white outline-none placeholder:text-zinc-600 focus:border-cyan-300/60"
                  />
                  <button type="submit" aria-label="Create post graphic" className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-white text-zinc-950 transition-colors hover:bg-cyan-100">
                    <ArrowRight size={19} />
                  </button>
                </form>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-medium text-zinc-500">
                  <span>X</span><span>Bluesky</span><span>Threads</span><span>LinkedIn</span><span>Mastodon</span>
                </div>
              </div>

              <button
                type="button"
                onClick={openPost}
                className="group relative min-h-[420px] overflow-hidden border-t border-white/10 text-left lg:border-l lg:border-t-0"
                style={{
                  backgroundColor: "#82b5e8",
                  backgroundImage: "repeating-linear-gradient(45deg,rgba(220,238,255,.25) 0 26px,transparent 26px 92px)",
                }}
              >
                {postPreview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={postPreview} alt="Editable post card preview" className="absolute left-1/2 top-1/2 w-[78%] max-w-[620px] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_24px_30px_rgba(19,47,75,.28)] transition-transform duration-300 group-hover:-translate-y-[52%]" />
                )}
                <span className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-lg bg-[#101116] px-3 py-2 text-[12px] font-semibold text-white shadow-lg">
                  Open post editor <ArrowUpRight size={14} />
                </span>
              </button>
            </div>
          </section>
        </Reveal>

        <Reveal>
          <div className="mt-14 flex items-end justify-between border-b border-white/10 pb-4">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Content tools</p>
              <h2 className="mt-1 text-[24px] font-semibold">Editable data and code cards</h2>
            </div>
            <span className="hidden text-[12px] text-zinc-500 sm:block">No device required</span>
          </div>
        </Reveal>
        <RevealGroup className="mt-5 grid gap-4 md:grid-cols-3">
          {tools.map((template) => {
            const previewUrl = templatePreviewUrl(template);
            return (
              <RevealItem key={template.slug}>
                <Link href={`/templates/${template.slug}`} className="group block h-full overflow-hidden rounded-lg border border-white/10 bg-[#101116] transition-colors hover:border-white/25">
                  <div className="relative flex h-56 items-center justify-center overflow-hidden p-6" style={TOOL_BACKGROUNDS[template.slug]}>
                    {previewUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previewUrl} alt={template.label} className="max-h-[82%] max-w-[86%] object-contain drop-shadow-[0_16px_24px_rgba(0,0,0,.3)] transition-transform duration-300 group-hover:scale-[1.025]" />
                    )}
                  </div>
                  <div className="border-t border-white/[0.08] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-[15px] font-semibold">{template.label}</h3>
                      <ArrowUpRight size={15} className="text-zinc-600 transition-colors group-hover:text-white" />
                    </div>
                    <p className="mt-1.5 text-[12.5px] leading-5 text-zinc-500">{template.blurb}</p>
                  </div>
                </Link>
              </RevealItem>
            );
          })}
        </RevealGroup>

        <Reveal>
          <div className="mt-14 flex items-end justify-between border-b border-white/10 pb-4">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Device scenes</p>
              <h2 className="mt-1 text-[24px] font-semibold">Photoreal mockups by device</h2>
            </div>
            <Link href="/mockups" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-zinc-400 hover:text-white">Browse all mockups <ArrowRight size={14} /></Link>
          </div>
        </Reveal>
        <RevealGroup className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => {
            const previewUrl = groupPreviewUrl(group.id);
            const count = scenesInGroup(group.id).length;
            return (
              <RevealItem key={group.id}>
                <Link href={`/templates/collection/${group.id}`} className="group block overflow-hidden rounded-lg border border-white/10 bg-[#101116] transition-colors hover:border-white/25">
                  <div className="flex h-60 items-center justify-center overflow-hidden p-7" style={{ background: `radial-gradient(circle at 50% 22%, ${group.accent}38, #111218 72%)` }}>
                    {previewUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previewUrl} alt={group.label} className="max-h-full max-w-[82%] object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,.5)] transition-transform duration-300 group-hover:scale-[1.025]" />
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-4 border-t border-white/[0.08] p-4">
                    <div>
                      <h3 className="text-[15px] font-semibold">{group.label}</h3>
                      <p className="mt-1 text-[12.5px] leading-5 text-zinc-500">{group.blurb}</p>
                    </div>
                    <span className="shrink-0 text-[11px] font-medium text-zinc-500">{count} {count === 1 ? "scene" : "scenes"}</span>
                  </div>
                </Link>
              </RevealItem>
            );
          })}
        </RevealGroup>
      </section>

      <MarketingFooter />
    </main>
  );
}
