"use client";

import { ALL_SIZE_PRESETS } from "@/lib/canvasSizes";

// One scene exported at three presets. Grid tracks use the real pixel widths
// so the three files appear at true relative scale.
const FORMATS = [
  { src: "/home/format-story.webp", w: 720, h: 1280, name: "Instagram story", size: "1080 × 1920", px: 1080 },
  { src: "/home/format-post.webp", w: 900, h: 900, name: "Instagram post", size: "1080 × 1080", px: 1080 },
  { src: "/home/format-tweet.webp", w: 1280, h: 720, name: "X post", size: "1600 × 900", px: 1600 },
] as const;

export function FormatsRow() {
  return (
    <section aria-labelledby="formats-title" className="border-t border-white/[0.06] py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-16">
          <h2
            id="formats-title"
            className="text-balance text-[32px] font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-[44px] lg:col-span-6"
          >
            Sized for wherever it&apos;s going
          </h2>
          <p className="max-w-md text-[16px] leading-relaxed text-zinc-400 lg:col-span-6">
            {ALL_SIZE_PRESETS.length} presets for Instagram, X, YouTube, Pinterest, Dribbble and the App Store, or any
            custom size. Download PNG, JPG or WebP in HD for free; 4K and 6K come with Pro.
          </p>
        </div>

        <div
          className="mt-14 grid items-end gap-3 sm:gap-6"
          style={{ gridTemplateColumns: FORMATS.map((f) => `${f.px}fr`).join(" ") }}
        >
          {FORMATS.map((f) => (
            <figure key={f.src} className="min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={f.src}
                width={f.w}
                height={f.h}
                alt={`The same fitness app mockup exported as an ${f.name}, ${f.size} pixels`}
                loading="lazy"
                decoding="async"
                className="block h-auto w-full rounded-[10px] shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_30px_60px_-30px_rgba(0,0,0,0.8)] sm:rounded-[14px]"
              />
              <figcaption className="mt-3 text-[12px] leading-snug sm:text-[13px]">
                <span className="block font-medium text-zinc-200">{f.name}</span>
                <span className="block tabular-nums text-zinc-500">{f.size}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
