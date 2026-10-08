"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
 * Templates gallery: the store listing sets, each shown as the row of eight
 * screenshots a store page would show. Clicking a screenshot opens the set in
 * the editor on that shot.
 */
export function StoreSetsSection({ filter, shots }: { filter: TemplateFilter; shots: MyShot[] }) {
  const [platform, setPlatform] = useState<StorePlatform>("ios");
  const spec = STORE_PLATFORMS[platform];
  const thumbW = platform === "ios" ? 112 : 136;
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

  return (
    <section id="store-sets" className="mt-16 scroll-mt-24" aria-labelledby="store-sets-title">
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div className="max-w-2xl">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Store listing sets · New</p>
          <h2 id="store-sets-title" className="mt-1 text-[28px] font-semibold leading-tight tracking-[-0.03em] sm:text-[34px]">
            Eight shots, ready for the store
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-zinc-400">
            Eight screenshots designed as one listing, at the sizes the App Store and Google Play ask for. Open a set,
            swap in your own screens and export all eight.
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

      <div className="mt-8 space-y-4">
        {shown.map((set) => {
          const scenes = mine[set.slug];
          const href = `/templates/sets/${set.slug}?device=${platform}${scenes ? "&mine=1" : ""}`;
          return (
            <article key={set.slug} className="overflow-hidden rounded-2xl border border-white/10 bg-[#101116]">
              <div className="grid lg:grid-cols-[250px_minmax(0,1fr)]">
                <div className="flex flex-col justify-between gap-5 p-5 sm:p-6">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span aria-hidden className="h-7 w-7 rounded-[9px] ring-1 ring-white/15" style={{ background: set.cardBg }} />
                      <h3 className="text-[19px] font-semibold tracking-[-0.02em]">{set.name}</h3>
                    </div>
                    <p className="mt-1 text-[12.5px] text-zinc-500">A sample {set.kind.toLowerCase()} app</p>
                    <p className="mt-3 text-[13.5px] leading-relaxed text-zinc-400">{set.blurb}</p>
                  </div>
                  <Link
                    href={href}
                    className="inline-flex h-10 w-fit items-center rounded-full bg-white px-5 text-[13.5px] font-semibold text-zinc-950 transition-colors hover:bg-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    Use this set
                  </Link>
                </div>
                <ol
                  className="flex gap-2.5 overflow-x-auto px-5 pb-5 [scrollbar-width:thin] sm:px-6 lg:py-6 lg:pl-0"
                  aria-label={`${set.name} screenshots`}
                >
                  {set.shots.map((shot, i) => (
                    <li key={shot.name} className="shrink-0">
                      <Link
                        href={`${href}&shot=${i + 1}`}
                        className="group block overflow-hidden rounded-[10px] ring-1 ring-white/10 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:ring-white/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                        style={{ width: thumbW, height: thumbH, background: set.cardBg }}
                      >
                        {scenes?.[i] ? (
                          <LiveScene scene={scenes[i]} label={`${set.name} screenshot ${i + 1} with your screenshot: ${shot.name}`} className="h-full w-full" />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`/store-sets/previews/${set.slug}-${platform}-${i + 1}.webp`}
                            alt={`${set.name} screenshot ${i + 1}: ${shot.name}`}
                            width={thumbW}
                            height={thumbH}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        )}
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
