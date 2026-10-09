"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Crown } from "lucide-react";
import type { SceneDocument } from "@framekit/scene";
import { LiveScene } from "@/components/templates/LiveScene";
import { previewWithShots } from "@/lib/myShots";
import { buildStoreSet, STORE_PLATFORMS, STORE_SETS, type StorePlatform } from "@/lib/storeSets";
import { matchesTemplate, STORE_SET_USES, type TemplateFilter } from "@/lib/templateSearch";
import type { MyShot } from "@/lib/templateShots";

export const storeSetMatches = (filter: TemplateFilter) =>
  STORE_SETS.filter((set) =>
    matchesTemplate(filter, {
      text: [set.name, set.kind, set.blurb, "store listing set screenshots app store google play iphone android", ...set.shots.map((s) => s.name)],
      uses: STORE_SET_USES,
    })
  );

/**
 * Templates gallery: the store listing sets. A chip per set picks which one
 * the panel shows as the row of eight screenshots a store page would show;
 * clicking a screenshot opens the set in the editor on that shot.
 */
export function StoreSetsSection({ filter, shots }: { filter: TemplateFilter; shots: MyShot[] }) {
  const [platform, setPlatform] = useState<StorePlatform>("ios");
  const [active, setActive] = useState<string>(STORE_SETS[0].slug);
  const spec = STORE_PLATFORMS[platform];
  const thumbW = platform === "ios" ? 168 : 196;
  const thumbH = Math.round((thumbW * spec.height) / spec.width);
  const shown = storeSetMatches(filter);
  // every set's eight shots rebuilt with your screenshots
  const mine = useMemo(() => {
    const out: Record<string, SceneDocument[]> = {};
    if (!shots.length) return out;
    for (const set of STORE_SETS) {
      const filled = previewWithShots(buildStoreSet(set, platform).map((s) => s.scene), shots);
      if (filled) out[set.slug] = filled;
    }
    return out;
  }, [shots, platform]);
  if (!shown.length) return null;

  const current = shown.find((set) => set.slug === active) ?? shown[0];
  const scenes = mine[current.slug];
  const href = `/templates/sets/${current.slug}?device=${platform}${scenes ? "&mine=1" : ""}`;

  return (
    <section id="store-sets" className="mt-16 scroll-mt-24" aria-labelledby="store-sets-title">
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div className="max-w-2xl">
          <h2 id="store-sets-title" className="flex flex-wrap items-center gap-3 text-[28px] font-semibold leading-tight tracking-[-0.03em] sm:text-[34px]">
            Eight shots, ready for the store
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-2.5 py-1 text-[12px] font-semibold tracking-normal text-white">
              <Crown size={12} /> Pro
            </span>
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-zinc-400">
            {STORE_SETS.length} complete listings, each designed as one story with one palette and one type system, at
            the sizes the App Store and Google Play ask for. Open a set, swap in your own screens and export all eight.
          </p>
        </div>
        <div role="radiogroup" aria-label="Store" className="flex shrink-0 rounded-full border border-white/10 bg-white/[0.04] p-1">
          {(Object.keys(STORE_PLATFORMS) as StorePlatform[]).map((p) => {
            const on = p === platform;
            return (
              <button
                key={p}
                role="radio"
                aria-checked={on}
                onClick={() => setPlatform(p)}
                className={`rounded-full px-4 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                  on ? "bg-white text-zinc-950" : "text-zinc-400 hover:text-white"
                }`}
              >
                <span className="block text-[13px] font-semibold leading-tight">{STORE_PLATFORMS[p].store}</span>
                <span className="block text-[11px] tabular-nums leading-tight text-zinc-500">
                  {STORE_PLATFORMS[p].width} × {STORE_PLATFORMS[p].height}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* one chip per set: its palette and what kind of app it's for */}
      <div role="tablist" aria-label="Store listing sets" className="-mx-1 mt-8 flex gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none]">
        {shown.map((set) => {
          const on = set.slug === current.slug;
          return (
            <button
              key={set.slug}
              role="tab"
              type="button"
              aria-selected={on}
              aria-controls="store-set-panel"
              onClick={() => setActive(set.slug)}
              className={`flex shrink-0 items-center gap-2.5 rounded-full border py-1.5 pl-1.5 pr-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                on ? "border-white/40 bg-white/[0.1]" : "border-white/10 hover:border-white/25 hover:bg-white/[0.04]"
              }`}
            >
              <span aria-hidden className="h-8 w-8 shrink-0 rounded-full ring-1 ring-white/15" style={{ background: set.cardBg }} />
              <span>
                <span className={`block text-[13.5px] font-semibold leading-tight ${on ? "text-white" : "text-zinc-300"}`}>{set.name}</span>
                <span className="block text-[11.5px] leading-tight text-zinc-500">{set.kind}</span>
              </span>
            </button>
          );
        })}
      </div>

      <article
        id="store-set-panel"
        role="tabpanel"
        aria-label={`${current.name} store listing set`}
        className="relative mt-4 overflow-hidden rounded-[28px] border border-white/10 bg-[#0d0e12]"
      >
        {/* the set's own colours, as light behind the shots */}
        <div aria-hidden className="pointer-events-none absolute -inset-x-20 -bottom-40 top-1/3 opacity-40 blur-[90px] transition-[background] duration-500" style={{ background: current.cardBg }} />
        <div className="relative grid lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="flex flex-col justify-between gap-6 p-6 sm:p-8">
            <div>
              <span aria-hidden className="block h-14 w-14 rounded-[16px] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] ring-1 ring-white/15" style={{ background: current.cardBg }} />
              <h3 className="mt-5 text-[26px] font-semibold leading-tight tracking-[-0.03em]">{current.name}</h3>
              <p className="mt-0.5 text-[13.5px] text-zinc-500">A sample {current.kind.toLowerCase()} app</p>
              <p className="mt-4 text-[14px] leading-relaxed text-zinc-300">{current.blurb}</p>
            </div>
            <div>
              <Link
                href={href}
                className="inline-flex h-11 items-center rounded-full bg-white px-6 text-[14px] font-semibold text-zinc-950 transition-colors hover:bg-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Use this set
              </Link>
              <p className="mt-3 text-[12px] tabular-nums text-zinc-500">
                8 shots for {spec.store}, {spec.width} × {spec.height}
              </p>
            </div>
          </div>
          <ol
            className="flex snap-x gap-3 overflow-x-auto px-6 pb-6 [scrollbar-width:thin] sm:px-8 lg:py-8 lg:pl-0"
            aria-label={`${current.name} screenshots`}
          >
            {current.shots.map((shot, i) => (
              <li key={`${current.slug}-${platform}-${shot.name}`} className="shrink-0 snap-start">
                <Link
                  href={`${href}&shot=${i + 1}`}
                  className="group block overflow-hidden rounded-[14px] shadow-[0_24px_50px_-24px_rgba(0,0,0,0.9)] ring-1 ring-white/10 transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:ring-white/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  style={{ width: thumbW, height: thumbH, background: current.cardBg }}
                >
                  {scenes?.[i] ? (
                    <LiveScene scene={scenes[i]} label={`${current.name} screenshot ${i + 1} with your screenshot: ${shot.name}`} className="h-full w-full" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/store-sets/previews/${current.slug}-${platform}-${i + 1}.webp`}
                      alt={`${current.name} screenshot ${i + 1}: ${shot.name}`}
                      width={thumbW}
                      height={thumbH}
                      loading={i < 4 ? "eager" : "lazy"}
                      className="h-full w-full object-cover"
                    />
                  )}
                </Link>
                <p className="mt-2 max-w-full truncate text-[12px] text-zinc-500" style={{ width: thumbW }}>
                  {shot.name}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </article>
    </section>
  );
}
