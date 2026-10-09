"use client";

import { useEffect, useRef, useState } from "react";
import { ALL_SIZE_PRESETS } from "@/lib/canvasSizes";

// One look for a sample running app, composed separately for each size, so
// every file reads as made for its place (not one scene shrunk to fit).
const FORMATS = [
  { src: "/home/formats/story.webp", w: 1080, h: 1920, where: "Instagram", name: "Story" },
  { src: "/home/formats/portrait.webp", w: 1080, h: 1350, where: "Instagram", name: "Portrait post" },
  { src: "/home/formats/tweet.webp", w: 1600, h: 900, where: "X", name: "Post" },
  { src: "/home/formats/cover.webp", w: 1500, h: 500, where: "X", name: "Header" },
  { src: "/home/formats/appstore.webp", w: 1320, h: 2868, where: "App Store", name: "iPhone 6.9″" },
  { src: "/home/formats/thumb.webp", w: 1280, h: 720, where: "YouTube", name: "Thumbnail" },
  { src: "/home/formats/dribbble.webp", w: 1600, h: 1200, where: "Dribbble", name: "Shot" },
] as const;

const CYCLE_MS = 3600;

/** The frame's size inside the stage: the format's shape, as large as fits. */
function fit(stage: { w: number; h: number }, f: { w: number; h: number }) {
  const s = Math.min(stage.w / f.w, stage.h / f.h);
  return { width: Math.round(f.w * s), height: Math.round(f.h * s) };
}

export function FormatsRow() {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const [stage, setStage] = useState({ w: 720, h: 540 });
  const stageRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setStage({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // only cycle while the section is on screen, and never for reduced motion
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!auto || !visible || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setActive((i) => (i + 1) % FORMATS.length), CYCLE_MS);
    return () => clearInterval(t);
  }, [auto, visible]);

  const pick = (i: number) => {
    setAuto(false);
    setActive(i);
  };
  const f = FORMATS[active];
  const size = fit(stage, f);

  return (
    <section ref={sectionRef} aria-labelledby="formats-title" className="border-t border-white/[0.06] py-24 sm:py-32">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div className="flex min-w-0 flex-col">
          <h2
            id="formats-title"
            className="text-balance text-[32px] font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-[44px]"
          >
            Sized for wherever it&apos;s going
          </h2>
          <p className="mt-5 max-w-md text-[16px] leading-relaxed text-zinc-400">
            From a 9:16 story to a 3:1 X header, every size is one click. {ALL_SIZE_PRESETS.length} presets or any
            custom size, exported as PNG, JPG or WebP. HD is free; 4K and 6K come with Pro.
          </p>

          <div role="tablist" aria-label="Export sizes" className="-mx-6 mt-10 flex gap-2 overflow-x-auto px-6 pb-1 lg:mx-0 lg:px-0 lg:flex-col lg:gap-0 lg:overflow-visible">
            {FORMATS.map((item, i) => {
              const on = i === active;
              const glyph = fit({ w: 22, h: 22 }, item);
              return (
                <button
                  key={item.src}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  aria-controls="formats-stage"
                  onClick={() => pick(i)}
                  className={`group relative flex shrink-0 items-center gap-4 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:rounded-none lg:border-t lg:border-white/[0.07] lg:px-0 lg:py-3.5 ${
                    on ? "bg-white/[0.08] lg:bg-transparent" : "hover:bg-white/[0.04] lg:hover:bg-transparent"
                  }`}
                >
                  {/* the format's true shape */}
                  <span className="grid h-[22px] w-[22px] shrink-0 place-items-center" aria-hidden>
                    <span
                      className={`block rounded-[3px] border transition-colors ${on ? "border-[#ff7a5c] bg-[#ff7a5c]/25" : "border-zinc-600 group-hover:border-zinc-400"}`}
                      style={{ width: glyph.width, height: glyph.height }}
                    />
                  </span>
                  <span className="min-w-0 flex-1 whitespace-nowrap lg:flex lg:items-baseline lg:justify-between lg:gap-4">
                    <span className={`block text-[14px] font-medium transition-colors lg:text-[15px] ${on ? "text-white" : "text-zinc-400 group-hover:text-zinc-200"}`}>
                      {item.where} {item.name.toLowerCase().startsWith("iphone") ? item.name : item.name.toLowerCase()}
                    </span>
                    <span className="block text-[12px] tabular-nums text-zinc-500 lg:text-[13px]">
                      {item.w} × {item.h}
                    </span>
                  </span>
                  {/* progress of the auto tour on the active row */}
                  {on && auto && visible && (
                    <span
                      key={active}
                      aria-hidden
                      className="absolute -top-px left-0 hidden h-px bg-[#ff7a5c] motion-safe:lg:block"
                      style={{ animation: `fk-formats-progress ${CYCLE_MS}ms linear forwards` }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div
          id="formats-stage"
          role="tabpanel"
          aria-label={`${f.where} ${f.name}, ${f.w} by ${f.h} pixels`}
          className="relative flex h-[440px] min-w-0 items-center justify-center rounded-[28px] bg-[radial-gradient(70%_60%_at_50%_45%,rgba(255,122,92,0.12),transparent_70%)] sm:h-[560px] lg:h-[640px]"
        >
          <div ref={stageRef} className="absolute inset-6 sm:inset-10" />
          <div
            className="relative overflow-hidden rounded-[14px] shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_40px_80px_-30px_rgba(0,0,0,0.9)] transition-[width,height] duration-700 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none"
            style={size}
          >
            {FORMATS.map((item, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={item.src}
                src={item.src}
                width={item.w}
                height={item.h}
                alt={i === active ? `A running app's mockup composed as an ${item.where} ${item.name}, ${item.w} × ${item.h} pixels` : ""}
                aria-hidden={i !== active}
                loading="lazy"
                decoding="async"
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 motion-reduce:transition-none ${i === active ? "opacity-100" : "opacity-0"}`}
              />
            ))}
          </div>
          <p className="absolute bottom-0 left-0 right-0 translate-y-full pt-4 text-center text-[13px] tabular-nums text-zinc-500 lg:hidden">
            {f.where} {f.name.toLowerCase().startsWith("iphone") ? f.name : f.name.toLowerCase()}, {f.w} × {f.h}
          </p>
        </div>
      </div>
      <style>{`@keyframes fk-formats-progress { from { width: 0 } to { width: 100% } }`}</style>
    </section>
  );
}
