"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { Frame, ArrowLeft } from "lucide-react";
import { scenesInGroup, sceneGroupById, templatePreviewUrl } from "@/lib/screenTemplates";

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
    <main className="min-h-dvh bg-[#e9e9f0] text-[#17171c]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/templates" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 text-white">
            <Frame size={16} strokeWidth={2.4} />
          </span>
          <span className="text-[16px] font-bold tracking-tight">MockFrame</span>
        </Link>
        <nav className="flex items-center gap-1 text-[13px] font-semibold">
          <Link href="/templates" className="rounded-lg px-3 py-1.5 text-[#6b6b76] hover:bg-white/70 hover:text-[#17171c]">
            Templates
          </Link>
          <Link href="/editor" className="rounded-lg px-3 py-1.5 text-[#6b6b76] hover:bg-white/70 hover:text-[#17171c]">
            Editor
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-6">
        <Link href="/templates" className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#6b6b76] hover:text-[#17171c]">
          <ArrowLeft size={15} /> All devices
        </Link>
        <h1 className="text-[30px] font-extrabold tracking-tight sm:text-[38px]">{group.label} mockups</h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-[#5b5b66]">{group.blurb}</p>

        {scenes.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-dashed border-black/10 bg-white/50 px-6 py-16 text-center text-[14px] text-[#8a8a94]">
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
                  className="group flex flex-col overflow-hidden rounded-3xl border border-black/5 bg-white shadow-[0_2px_12px_rgba(20,20,45,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(20,20,45,0.12)]"
                >
                  <div
                    className="flex h-72 items-center justify-center overflow-hidden p-8"
                    style={{ background: `linear-gradient(135deg, ${t.accent}33, ${t.accent}0d)` }}
                  >
                    {previewUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewUrl}
                        alt={t.label}
                        className="drop-shadow-[0_16px_36px_rgba(20,20,45,0.22)]"
                        style={{ maxHeight: "100%", maxWidth: "74%", width: "auto", objectFit: "contain" }}
                      />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1 border-t border-black/5 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[15px] font-bold">{t.label}</span>
                      <span className="rounded-full bg-[#17171c] px-2.5 py-1 text-[11px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                        Open →
                      </span>
                    </div>
                    <span className="text-[12.5px] leading-relaxed text-[#6b6b76]">{t.blurb}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
