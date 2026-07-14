"use client";

import Link from "next/link";
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

/**
 * /templates — premium device mockups grouped into category cards (iPhone,
 * iPad, …), each opening /templates/collection/<group>, plus the standalone
 * content cards (Code / Bluesky / X post) which open the editor directly.
 */
export default function TemplatesPage() {
  const groups = activeSceneGroups();
  return (
    <main className="min-h-dvh bg-[#09090b] text-white">
      <MarketingNav />

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-32">
        <Reveal>
          <p className="flex items-center gap-2 text-[13px] font-semibold text-cyan-300">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" /> Templates
          </p>
          <h1 className="mt-4 text-[32px] font-medium leading-[1.05] tracking-[-0.03em] sm:text-[46px]">Device mockups</h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-zinc-400">
            Premium photoreal mockups — pick a device, drop in your screenshot, then style the scene with any background.
            Fully editable, export-ready.
          </p>
        </Reveal>

        {/* category cards → /templates/collection/<group> */}
        <RevealGroup className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => {
            const previewUrl = groupPreviewUrl(g.id);
            const count = scenesInGroup(g.id).length;
            return (
              <RevealItem key={g.id}>
                <Link
                  href={`/templates/collection/${g.id}`}
                  className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-white/[0.08] bg-white/[0.02] transition-colors hover:border-white/20"
                >
                  <div
                    className="flex h-64 items-center justify-center overflow-hidden p-8"
                    style={{ background: `radial-gradient(120% 90% at 50% 0%, ${g.accent}2e, transparent 70%)` }}
                  >
                    {previewUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewUrl}
                        alt={g.label}
                        className="drop-shadow-[0_16px_36px_rgba(0,0,0,0.55)]"
                        style={{ maxHeight: "100%", maxWidth: "72%", width: "auto", objectFit: "contain" }}
                      />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1 border-t border-white/[0.06] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[16px] font-semibold text-white">{g.label}</span>
                      <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-zinc-400">
                        {count} mockup{count === 1 ? "" : "s"}
                      </span>
                    </div>
                    <span className="text-[12.5px] leading-relaxed text-zinc-500">{g.blurb}</span>
                  </div>
                </Link>
              </RevealItem>
            );
          })}
        </RevealGroup>

        {/* content cards → editor directly */}
        <Reveal>
          <h2 className="mt-16 text-[22px] font-medium tracking-[-0.02em] sm:text-[26px]">Content cards</h2>
          <p className="mt-1.5 max-w-xl text-[14px] leading-relaxed text-zinc-400">
            Standalone cards — wrap in a window frame (macOS, Safari, Windows, Arc…), then style the scene.
          </p>
        </Reveal>
        <RevealGroup className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((t) => {
            const previewUrl = templatePreviewUrl(t);
            return (
              <RevealItem key={t.slug}>
                <Link
                  href={`/templates/${t.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-white/[0.08] bg-white/[0.02] transition-colors hover:border-white/20"
                >
                  <div
                    className="flex h-72 items-center justify-center overflow-hidden p-6"
                    style={{ background: `radial-gradient(120% 90% at 50% 0%, ${t.accent}26, transparent 70%)` }}
                  >
                    {previewUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewUrl}
                        alt={t.label}
                        className="rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
                        style={{ maxHeight: "100%", maxWidth: "82%", width: "auto", objectFit: "contain" }}
                      />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1 border-t border-white/[0.06] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[15px] font-semibold text-white">{t.label}</span>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-900 opacity-0 transition group-hover:opacity-100">
                        Open →
                      </span>
                    </div>
                    <span className="text-[12.5px] leading-relaxed text-zinc-500">{t.blurb}</span>
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
