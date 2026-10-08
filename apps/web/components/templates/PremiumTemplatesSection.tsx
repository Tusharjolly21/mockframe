"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowUpRight, Crown } from "lucide-react";
import type { SceneDocument } from "@framekit/scene";
import { Reveal, RevealGroup, RevealItem } from "@/components/marketing/Reveal";
import { LiveScene } from "@/components/templates/LiveScene";
import { previewWithShots } from "@/lib/myShots";
import { PREMIUM_TEMPLATES, premiumPreviewUrl } from "@/lib/premiumTemplates";
import { matchesTemplate, PREMIUM_USES, type TemplateFilter } from "@/lib/templateSearch";
import type { MyShot } from "@/lib/templateShots";

export const premiumMatches = (filter: TemplateFilter) =>
  PREMIUM_TEMPLATES.filter((t) => matchesTemplate(filter, { text: [t.name, t.use, t.blurb, "premium layout"], uses: PREMIUM_USES[t.slug] ?? [] }));

/** Premium layouts: complete compositions, two free and the rest Pro. */
export function PremiumTemplatesSection({ filter, shots }: { filter: TemplateFilter; shots: MyShot[] }) {
  const shown = premiumMatches(filter);
  // each layout rebuilt with your screenshots in its phones / laptops
  const mine = useMemo(() => {
    const out: Record<string, SceneDocument> = {};
    if (!shots.length) return out;
    for (const t of PREMIUM_TEMPLATES) {
      const filled = previewWithShots([t.build()], shots);
      if (filled) out[t.slug] = filled[0];
    }
    return out;
  }, [shots]);
  if (!shown.length) return null;
  return (
    <>
      <Reveal>
        <div id="premium" className="mt-16 flex scroll-mt-24 flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Premium layouts</p>
            <h2 className="mt-1 text-[28px] font-semibold tracking-[-0.03em] sm:text-[34px]">Finished compositions, sized to post</h2>
          </div>
          <p className="max-w-sm text-[13.5px] leading-relaxed text-zinc-500">
            Launch heroes, keynote reveals, Product Hunt galleries and reel covers. Swap in your screens and your words — everything stays editable.
          </p>
        </div>
      </Reveal>
      <RevealGroup className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {shown.map((t) => (
          <RevealItem key={t.slug}>
            <Link
              href={mine[t.slug] ? `/templates/${t.slug}?mine=1` : `/templates/${t.slug}`}
              className="group block h-full overflow-hidden rounded-2xl border border-white/10 bg-[#101116] transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-white/25"
            >
              <div className="relative flex h-56 items-center justify-center overflow-hidden p-5" style={{ background: t.cardBg }}>
                {mine[t.slug] ? (
                  <LiveScene
                    scene={mine[t.slug]}
                    label={`${t.name} template with your screenshot`}
                    className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03]"
                    frameClassName="rounded-md shadow-[0_18px_40px_rgba(0,0,0,.35)] ring-1 ring-black/10"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={premiumPreviewUrl(t.slug)}
                    alt={`${t.name} template — ${t.use}`}
                    loading="lazy"
                    width={t.width}
                    height={t.height}
                    className="max-h-full max-w-full rounded-md object-contain shadow-[0_18px_40px_rgba(0,0,0,.35)] ring-1 ring-black/10 transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                )}
                <span
                  className={`absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide shadow ${
                    t.pro ? "bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white" : "bg-emerald-400 text-emerald-950"
                  }`}
                >
                  {t.pro && <Crown size={11} />} {t.pro ? "Pro" : "Free"}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3 border-t border-white/[0.08] p-4">
                <div className="min-w-0">
                  <h3 className="text-[15px] font-semibold">{t.name}</h3>
                  <p className="mt-0.5 text-[11.5px] font-medium text-zinc-400">
                    {t.use} · {t.width} × {t.height}
                  </p>
                  <p className="mt-1.5 text-[12.5px] leading-5 text-zinc-500">{t.blurb}</p>
                </div>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 text-zinc-500 transition-colors group-hover:border-white/30 group-hover:text-white">
                  <ArrowUpRight size={15} />
                </span>
              </div>
            </Link>
          </RevealItem>
        ))}
      </RevealGroup>
    </>
  );
}
