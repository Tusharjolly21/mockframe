"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { scenesInGroup, sceneGroupById, templatePreviewUrl } from "@/lib/screenTemplates";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";

/**
 * /templates/collection/<group> — every premium mockup in one device category
 * (iPhone, iPad, …). Each card opens the editor at /templates/<slug>.
 */
export default function CollectionPage() {
  const params = useParams<{ group: string }>();
  const group = sceneGroupById(params.group);
  const scenes = scenesInGroup(params.group);
  if (!group) return notFound();

  return (
    <main className="min-h-dvh bg-[#09090b] text-white">
      <MarketingNav />

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-32">
        <Link href="/templates" className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-zinc-400 hover:text-white">
          <ArrowLeft size={15} /> All devices
        </Link>
        <h1 className="text-[30px] font-medium leading-[1.05] tracking-[-0.03em] sm:text-[40px]">{group.label} mockups</h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-zinc-400">{group.blurb}</p>

        {scenes.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center text-[14px] text-zinc-500">
            No {group.label} mockups yet — more coming soon.
          </p>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {scenes.map((t) => {
              const previewUrl = templatePreviewUrl(t);
              return (
                <Link
                  key={t.slug}
                  href={`/templates/${t.slug}`}
                  className="group flex flex-col overflow-hidden rounded-[24px] border border-white/[0.08] bg-white/[0.02] transition-colors hover:border-white/20"
                >
                  <div
                    className="flex h-72 items-center justify-center overflow-hidden p-8"
                    style={{ background: `radial-gradient(120% 90% at 50% 0%, ${t.accent}2e, transparent 70%)` }}
                  >
                    {previewUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewUrl}
                        alt={t.label}
                        className="drop-shadow-[0_16px_36px_rgba(0,0,0,0.55)]"
                        style={{ maxHeight: "100%", maxWidth: "74%", width: "auto", objectFit: "contain" }}
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
              );
            })}
          </div>
        )}
      </section>

      <MarketingFooter />
    </main>
  );
}
