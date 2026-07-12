"use client";

import Link from "next/link";
import { Frame } from "lucide-react";
import {
  TEMPLATES,
  templatePreviewUrl,
  activeSceneGroups,
  groupPreviewUrl,
  scenesInGroup,
} from "@/lib/screenTemplates";

/**
 * /templates — premium device mockups grouped into category cards (iPhone,
 * iPad, …), each opening /templates/collection/<group>, plus the standalone
 * content cards (Code / Bluesky / X post) which open the editor directly.
 */
export default function TemplatesPage() {
  const groups = activeSceneGroups();
  return (
    <main className="min-h-dvh bg-[#e9e9f0] text-[#17171c]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/editor" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 text-white">
            <Frame size={16} strokeWidth={2.4} />
          </span>
          <span className="text-[16px] font-bold tracking-tight">MockFrame</span>
        </Link>
        <nav className="flex items-center gap-1 text-[13px] font-semibold">
          <span className="rounded-lg bg-white px-3 py-1.5 shadow-sm">Templates</span>
          <Link href="/editor" className="rounded-lg px-3 py-1.5 text-[#6b6b76] hover:bg-white/70 hover:text-[#17171c]">
            Editor
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-6">
        <h1 className="text-[30px] font-extrabold tracking-tight sm:text-[38px]">Device mockups</h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-[#5b5b66]">
          Premium photoreal mockholders — pick a device, drop in your screenshot, then style the scene
          with any background. Fully editable, export-ready.
        </p>

        {/* category cards → /templates/collection/<group> */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => {
            const previewUrl = groupPreviewUrl(g.id);
            const count = scenesInGroup(g.id).length;
            return (
              <Link
                key={g.id}
                href={`/templates/collection/${g.id}`}
                className="group flex flex-col overflow-hidden rounded-3xl border border-black/5 bg-white shadow-[0_2px_12px_rgba(20,20,45,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(20,20,45,0.12)]"
              >
                <div
                  className="flex h-64 items-center justify-center overflow-hidden p-8"
                  style={{ background: `linear-gradient(135deg, ${g.accent}33, ${g.accent}0d)` }}
                >
                  {previewUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt={g.label}
                      className="drop-shadow-[0_16px_36px_rgba(20,20,45,0.22)]"
                      style={{ maxHeight: "100%", maxWidth: "72%", width: "auto", objectFit: "contain" }}
                    />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1 border-t border-black/5 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[16px] font-bold">{g.label}</span>
                    <span className="rounded-full bg-[#f0f0f5] px-2.5 py-1 text-[11px] font-semibold text-[#6b6b76]">
                      {count} mockup{count === 1 ? "" : "s"}
                    </span>
                  </div>
                  <span className="text-[12.5px] leading-relaxed text-[#6b6b76]">{g.blurb}</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* content cards → editor directly */}
        <h2 className="mt-16 text-[22px] font-extrabold tracking-tight sm:text-[26px]">Content cards</h2>
        <p className="mt-1.5 max-w-xl text-[14px] leading-relaxed text-[#5b5b66]">
          Standalone cards — wrap in a window frame (macOS, Safari, Windows, Arc…), then style the scene.
        </p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((t) => {
            const previewUrl = templatePreviewUrl(t);
            return (
              <Link
                key={t.slug}
                href={`/templates/${t.slug}`}
                className="group flex flex-col overflow-hidden rounded-3xl border border-black/5 bg-white shadow-[0_2px_12px_rgba(20,20,45,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(20,20,45,0.12)]"
              >
                <div
                  className="flex h-72 items-center justify-center overflow-hidden p-6"
                  style={{ background: `linear-gradient(135deg, ${t.accent}22, ${t.accent}0a)` }}
                >
                  {previewUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt={t.label}
                      className="rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.22)]"
                      style={{ maxHeight: "100%", maxWidth: "82%", width: "auto", objectFit: "contain" }}
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
      </section>
    </main>
  );
}
