"use client";

import { useState } from "react";
import { BG_CATEGORIES, backgroundCounts, isProBgCategory } from "@/lib/backgrounds";

// The same export (three phones, Showcase layout, 1920 × 1440) with only the
// background changed. Collection names match the editor's Backgrounds tabs.
const LOOKS = [
  { id: "mystic", collection: "Mystic", src: "/home/style-mystic.webp", swatch: "/home/swatch-mystic.webp" },
  { id: "desktop", collection: "Desktop", src: "/home/style-desktop.webp", swatch: "/home/swatch-desktop.webp" },
  { id: "glass", collection: "Glass", src: "/home/style-glass.webp", swatch: "/home/swatch-glass.webp" },
  { id: "earth", collection: "Earth", src: "/home/style-earth.webp", swatch: "/home/swatch-earth.webp" },
] as const;

const { total: TOTAL, free: FREE } = backgroundCounts();

export function StyleSwitcher() {
  const [active, setActive] = useState<(typeof LOOKS)[number]["id"]>(LOOKS[0].id);

  return (
    <section aria-labelledby="styles-title" className="border-t border-white/[0.06] py-24 sm:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <h2
            id="styles-title"
            className="text-balance text-[32px] font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-[44px]"
          >
            Change the mood in one click
          </h2>
          <p className="mt-5 max-w-md text-[16px] leading-relaxed text-zinc-400">
            {TOTAL} backgrounds in {BG_CATEGORIES.length} collections, {FREE} of them free. The phones, layout and
            shadows stay exactly where you put them.
          </p>

          <div role="radiogroup" aria-label="Background collection" className="mt-9 grid max-w-[22rem] grid-cols-2 gap-2.5">
            {LOOKS.map((l) => {
              const on = l.id === active;
              const pro = isProBgCategory(l.id);
              return (
                <button
                  key={l.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setActive(l.id)}
                  className={`flex h-11 items-center gap-2.5 rounded-full border py-1 pl-1 pr-4 text-left text-[14px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 ${
                    on
                      ? "border-white/30 bg-white/[0.08] text-white"
                      : "border-white/[0.08] text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={l.swatch} alt="" width={36} height={36} className="h-9 w-9 rounded-full object-cover" />
                  {l.collection}
                  {pro && <span className="ml-auto text-[11.5px] font-medium text-zinc-500">Pro</span>}
                </button>
              );
            })}
          </div>
          <p className="mt-5 text-[13px] text-zinc-500">Showcase layout, 1920 × 1440, exported from the editor.</p>
        </div>

        <div className="lg:col-span-7">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[18px] bg-zinc-900 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_40px_80px_-30px_rgba(0,0,0,0.8)]">
            {LOOKS.map((l) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={l.id}
                src={l.src}
                width={1600}
                height={1200}
                alt={
                  l.id === active
                    ? `Three iPhones with a fitness app in the Showcase layout, on a ${l.collection} background`
                    : ""
                }
                aria-hidden={l.id !== active}
                loading="lazy"
                decoding="async"
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ease-out motion-reduce:transition-none ${
                  l.id === active ? "opacity-100" : "opacity-0"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
