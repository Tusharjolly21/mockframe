"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Box, Clapperboard, Download, ImagePlus, MonitorSmartphone, Play, Sparkles, Type } from "lucide-react";
import { PROMO_TEMPLATES, type PromoTemplateMeta } from "@/lib/promo/registry";
import { PROMO_FPS, PROMO_FORMATS, type PromoFormat } from "@/lib/promo/types";
import { Reveal, RevealGroup, RevealItem } from "@/components/marketing/Reveal";

// Remotion + three.js are client-only and heavy: load them after the page paints.
const PromoPreview = dynamic(() => import("./PromoPreview"), { ssr: false });

const NEW_IDS = new Set(["abstract-stack", "desktop-studio", "ui-showcase", "everywhere"]);
const THREE_D_IDS = new Set(["abstract-stack", "everywhere"]);
const MULTI_DEVICE_IDS = new Set(["abstract-stack", "desktop-studio", "everywhere"]);
const FEATURED = ["abstract-stack", "everywhere", "desktop-studio", "ui-showcase"];

const ACCENTS = ["#8b5cf6", "#22d3ee", "#f472b6", "#34d399", "#fb923c", "#f43f5e"];

type Filter = "all" | "new" | "multi" | "phone";
const FILTERS: [Filter, string][] = [
  ["all", "All"],
  ["new", "New"],
  ["multi", "Multi-device"],
  ["phone", "Phone"],
];

const editorHref = (id: string) => `/editor?promo=${id}`;
const seconds = (t: PromoTemplateMeta) => Math.round(t.defaultDurationInFrames / PROMO_FPS);

const ASPECT: Record<PromoFormat, string> = { "9:16": "aspect-[9/16]", "1:1": "aspect-square", "16:9": "aspect-video" };
const GRID: Record<PromoFormat, string> = {
  "9:16": "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
  "1:1": "grid-cols-2 lg:grid-cols-3",
  "16:9": "grid-cols-1 md:grid-cols-2",
};

function Badges({ id }: { id: string }) {
  return (
    <>
      {NEW_IDS.has(id) && <span className="rounded-full bg-white px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-zinc-950">New</span>}
      {THREE_D_IDS.has(id) && (
        <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/40 px-2 py-0.5 text-[10.5px] font-semibold text-white backdrop-blur">
          <Box size={11} /> 3D
        </span>
      )}
      {MULTI_DEVICE_IDS.has(id) && (
        <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/40 px-2 py-0.5 text-[10.5px] font-semibold text-white backdrop-blur">
          <MonitorSmartphone size={11} /> Multi-device
        </span>
      )}
    </>
  );
}

function TemplateCard({ t, format, accent, active, onActive }: { t: PromoTemplateMeta; format: PromoFormat; accent: string | null; active: boolean; onActive: (on: boolean) => void }) {
  // the pre-rendered poster matches the default look; any other look renders live
  const poster = format === "9:16" && !accent ? `/templates/video/${t.id}.webp` : null;
  return (
    <div className="group flex h-full flex-col">
      <div
        className={`relative ${ASPECT[format]} cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-[#0e0f14] shadow-[0_20px_50px_-20px_rgba(0,0,0,.8)] transition-[border-color,transform] duration-300 group-hover:-translate-y-1 group-hover:border-white/25`}
        onPointerEnter={(e) => e.pointerType === "mouse" && onActive(true)}
        onPointerLeave={(e) => e.pointerType === "mouse" && onActive(false)}
        onClick={() => onActive(!active)}
        role="button"
        tabIndex={0}
        aria-label={`${active ? "Pause" : "Play"} the ${t.name} preview`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onActive(!active);
          }
        }}
      >
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt={`${t.name} promo video template`} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <PromoPreview templateId={t.id} format={format} accent={accent} playing={false} className="absolute inset-0" />
        )}
        {active && <PromoPreview templateId={t.id} format={format} accent={accent} playing className="absolute inset-0" />}
        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5">
          <Badges id={t.id} />
        </div>
        {!active && (
          <span className="pointer-events-none absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-zinc-950 opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 max-md:opacity-100">
            <Play size={16} className="ml-0.5" fill="currentColor" />
          </span>
        )}
      </div>
      <div className="mt-3 flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-white">{t.name}</h3>
          <p className="mt-0.5 text-[12.5px] leading-5 text-zinc-500">
            {t.tagline} · {seconds(t)}s
          </p>
        </div>
        <Link
          href={editorHref(t.id)}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/15 px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:border-white/40 hover:bg-white/[0.06]"
        >
          Use <ArrowUpRight size={13} />
        </Link>
      </div>
    </div>
  );
}

export function VideoTemplatesView() {
  const [featured, setFeatured] = useState(FEATURED[0]);
  const [format, setFormat] = useState<PromoFormat>("9:16");
  const [accent, setAccent] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [active, setActive] = useState<string | null>(null);

  const featuredMeta = PROMO_TEMPLATES.find((t) => t.id === featured)!;
  const shown = PROMO_TEMPLATES.filter((t) =>
    filter === "all" ? true : filter === "new" ? NEW_IDS.has(t.id) : filter === "multi" ? MULTI_DEVICE_IDS.has(t.id) : !MULTI_DEVICE_IDS.has(t.id),
  )
    // newest first
    .sort((a, b) => Number(NEW_IDS.has(b.id)) - Number(NEW_IDS.has(a.id)));

  return (
    <>
      {/* ── hero */}
      <Reveal>
        <header className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0e0f14] px-6 py-10 sm:px-10 sm:py-12 lg:py-14">
          <div aria-hidden className="pointer-events-none absolute -left-24 -top-32 h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,.35),transparent_65%)]" />
          <div aria-hidden className="pointer-events-none absolute -bottom-40 right-1/4 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,.18),transparent_65%)]" />
          <div className="relative grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[12px] font-medium text-zinc-300">
                <Clapperboard size={13} className="text-violet-300" /> Promo video templates
                <span className="ml-1 rounded-full bg-white px-1.5 text-[10px] font-bold uppercase text-zinc-950">New</span>
              </p>
              <h1 className="mt-5 max-w-xl text-[40px] font-semibold leading-[1.03] tracking-[-0.035em] sm:text-[60px]">
                App ads that move,{" "}
                <span className="bg-gradient-to-r from-violet-200 via-fuchsia-200 to-cyan-200 bg-clip-text text-transparent">made from your screenshots.</span>
              </h1>
              <p className="mt-5 max-w-lg text-[15.5px] leading-relaxed text-zinc-400">
                Real 3D shapes, photoreal phones, laptops and tablets, and camera moves built for Reels, TikTok and YouTube. Drop in your screens, change the words and colours, export an MP4.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={editorHref(featured)} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-[14px] font-semibold text-zinc-950 transition-colors hover:bg-zinc-200">
                  Use {featuredMeta.name} <ArrowRight size={16} />
                </Link>
                <a href="#gallery" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:border-white/40">
                  Browse all {PROMO_TEMPLATES.length}
                </a>
              </div>
              <dl className="mt-9 grid max-w-md grid-cols-3 gap-4 border-t border-white/10 pt-6">
                {[
                  [String(PROMO_TEMPLATES.length), "templates"],
                  ["3", "formats: 9:16, 1:1, 16:9"],
                  ["MP4", "ready to post"],
                ].map(([v, k]) => (
                  <div key={k}>
                    <dt className="text-[22px] font-semibold tracking-tight text-white">{v}</dt>
                    <dd className="mt-0.5 text-[12px] leading-4 text-zinc-500">{k}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="flex flex-col items-center gap-4">
              <div className="relative aspect-[9/16] w-full max-w-[340px] overflow-hidden rounded-[26px] border border-white/15 bg-black shadow-[0_40px_90px_-30px_rgba(139,92,246,.55)]">
                {/* the poster paints instantly; the live player takes over once loaded */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/templates/video/${featured}.webp`} alt="" className="absolute inset-0 h-full w-full object-cover" />
                <PromoPreview key={featured} templateId={featured} format="9:16" accent={accent} playing className="absolute inset-0" />
              </div>
              <div className="flex flex-wrap justify-center gap-1.5" role="tablist" aria-label="Featured template">
                {FEATURED.map((id) => {
                  const t = PROMO_TEMPLATES.find((x) => x.id === id)!;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={featured === id}
                      onClick={() => setFeatured(id)}
                      className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${featured === id ? "bg-white text-zinc-950" : "bg-white/[0.06] text-zinc-400 hover:text-white"}`}
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </header>
      </Reveal>

      {/* ── controls */}
      <div id="gallery" className="mt-16 scroll-mt-24">
        <Reveal>
          <div className="flex flex-col gap-5 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-zinc-500">All video templates</p>
              <h2 className="mt-1 text-[28px] font-semibold tracking-[-0.03em] sm:text-[34px]">Hover to play. Click to make it yours.</h2>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <div className="flex gap-1.5" aria-label="Filter templates">
                {FILTERS.map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFilter(id)}
                    className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${filter === id ? "bg-white text-zinc-950" : "bg-white/[0.06] text-zinc-400 hover:text-white"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex rounded-full bg-white/[0.06] p-0.5" aria-label="Video format">
                {PROMO_FORMATS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormat(f)}
                    aria-pressed={format === f}
                    className={`rounded-full px-3 py-1 text-[12px] font-semibold tabular-nums transition-colors ${format === f ? "bg-white text-zinc-950" : "text-zinc-400 hover:text-white"}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5" aria-label="Accent colour">
                <button
                  type="button"
                  onClick={() => setAccent(null)}
                  aria-pressed={accent === null}
                  title="Each template's own colour"
                  className={`h-6 rounded-full px-2 text-[11px] font-semibold ${accent === null ? "bg-white text-zinc-950" : "bg-white/[0.06] text-zinc-400 hover:text-white"}`}
                >
                  Default
                </button>
                {ACCENTS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setAccent(c)}
                    aria-pressed={accent === c}
                    title={c}
                    aria-label={`Accent ${c}`}
                    className={`h-6 w-6 rounded-full ring-offset-2 ring-offset-[#09090b] transition-shadow ${accent === c ? "ring-2 ring-white" : "hover:ring-1 hover:ring-white/50"}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        {/* ── grid */}
        <RevealGroup key={`${format}-${filter}`} className={`mt-7 grid gap-x-5 gap-y-9 ${GRID[format]}`}>
          {shown.map((t) => (
            <RevealItem key={t.id}>
              <TemplateCard t={t} format={format} accent={accent} active={active === t.id} onActive={(on) => setActive((cur) => (on ? t.id : cur === t.id ? null : cur))} />
            </RevealItem>
          ))}
        </RevealGroup>
      </div>

      {/* ── how it works */}
      <Reveal>
        <section className="mt-24 grid gap-4 md:grid-cols-3">
          {[
            [ImagePlus, "Drop in your screens", "Up to four screenshots or screen recordings. Each device picks the screen that fits its shape."],
            [Type, "Make it say your thing", "Edit every headline, caption and call to action, then pick your brand colour and background."],
            [Download, "Export and post", "Download an MP4 in 9:16, 1:1 or 16:9, sized for Reels, Stories, TikTok, Shorts and YouTube."],
          ].map(([Icon, title, body], i) => {
            const I = Icon as typeof ImagePlus;
            return (
              <div key={i} className="rounded-2xl border border-white/10 bg-[#101116] p-6">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.06] text-zinc-200">
                  <I size={18} />
                </span>
                <p className="mt-5 text-[12px] font-semibold text-zinc-500">Step {i + 1}</p>
                <h3 className="mt-1 text-[17px] font-semibold text-white">{title as string}</h3>
                <p className="mt-2 text-[13.5px] leading-6 text-zinc-500">{body as string}</p>
              </div>
            );
          })}
        </section>
      </Reveal>

      {/* ── closing CTA */}
      <Reveal>
        <section className="relative mt-16 overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-violet-600/25 via-[#101116] to-cyan-500/15 px-6 py-12 text-center sm:px-10">
          <Sparkles size={22} className="mx-auto text-violet-200" />
          <h2 className="mx-auto mt-4 max-w-2xl text-[28px] font-semibold tracking-[-0.03em] sm:text-[38px]">Your next launch video is ten seconds away.</h2>
          <p className="mx-auto mt-3 max-w-lg text-[14.5px] text-zinc-400">Pick a template, swap in your app, and export. No timeline, no keyframes.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/editor?promo=1" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-[14px] font-semibold text-zinc-950 hover:bg-zinc-200">
              Open the video maker <ArrowRight size={16} />
            </Link>
            <Link href="/templates" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-[14px] font-semibold text-white hover:border-white/40">
              Image templates
            </Link>
          </div>
        </section>
      </Reveal>
    </>
  );
}
