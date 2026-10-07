"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

const EASE = [0.22, 1, 0.36, 1] as const;

type Piece = {
  src: string;
  w: number;
  h: number;
  /** what the editor calls the layout (or the device, for single-device shots) */
  layout: string;
  /** the background collection, as named in the editor's Backgrounds tabs */
  collection: string;
  pro?: boolean;
  size: string;
  alt: string;
};

// Ordered for a three-column wall (three pieces per column, heights balanced);
// on one column it reads top to bottom in this same order.
const PIECES: Piece[] = [
  {
    src: "/home/made-run-hero.webp",
    w: 900,
    h: 1125,
    layout: "Hero crop",
    collection: "Radiant",
    size: "1080 × 1350",
    alt: "A running app's live run screen, cropped large and tilted on a rose gradient",
  },
  {
    src: "/home/made-pair.webp",
    w: 1200,
    h: 900,
    layout: "Leaning pair",
    collection: "Earth",
    size: "1600 × 1200",
    alt: "Two iPhones leaning together on warm sand, showing a fitness summary and a sleep score",
  },
  {
    src: "/home/made-macbook.webp",
    w: 1280,
    h: 720,
    layout: "MacBook Pro 16″",
    collection: "Spectral",
    size: "1920 × 1080",
    alt: "A MacBook Pro showing the MockFrame homepage on a blue and pink gradient",
  },
  {
    src: "/home/made-showcase.webp",
    w: 1200,
    h: 900,
    layout: "Showcase",
    collection: "Desktop",
    pro: true,
    size: "1920 × 1440",
    alt: "Three iPhones showing a finance app's home, spending and card screens on a blue wallpaper",
  },
  {
    src: "/home/made-leaning-card.webp",
    w: 900,
    h: 1125,
    layout: "Leaning",
    collection: "Aurora",
    pro: true,
    size: "1080 × 1350",
    alt: "One iPhone leaning back on a dark violet aurora, showing a virtual card screen",
  },
  {
    src: "/home/made-fan.webp",
    w: 1280,
    h: 720,
    layout: "Fan",
    collection: "Desktop",
    pro: true,
    size: "1920 × 1080",
    alt: "Three iPhones fanned out on a warm wallpaper, showing a finance app's spending screen in front",
  },
  {
    src: "/home/made-cascade.webp",
    w: 1200,
    h: 900,
    layout: "Cascade",
    collection: "Earth",
    size: "1600 × 1200",
    alt: "Three iPhones stepping down from left to right on a soft moss green gradient",
  },
  {
    src: "/home/made-floating.webp",
    w: 900,
    h: 1125,
    layout: "Floating",
    collection: "Mystic",
    size: "1080 × 1350",
    alt: "One iPhone floating at an angle on a peach haze, showing activity rings and a weekly step chart",
  },
];

const INPUTS = ["/home/input-run.webp", "/home/input-finance.webp", "/home/input-sleep.webp"];

/**
 * "Made in MockFrame": real, untouched exports hung on a light studio wall.
 * The one orchestrated motion moment below the hero: each column rises in
 * a short wave as it scrolls into view.
 */
export function GalleryWall() {
  const reduce = useReducedMotion();

  return (
    <section aria-labelledby="gallery-title" className="relative bg-[linear-gradient(180deg,#efeff2_0%,#dcdce2_100%)] text-[#17171c]">
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <div className="flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <h2
              id="gallery-title"
              className="text-[36px] font-semibold leading-[1.02] tracking-[-0.045em] sm:text-[54px]"
            >
              Made in MockFrame
            </h2>
            <p className="mt-5 text-[16px] leading-relaxed text-[#5c5c66]">
              Every image on this wall is a straight export from the editor, built from the plain screenshots in the
              last frame. Nothing was retouched afterwards.
            </p>
          </div>
          <Link
            href="/editor"
            className="inline-flex h-11 shrink-0 items-center self-start rounded-full bg-[#17171c] px-5 text-[14.5px] font-medium text-white transition-colors hover:bg-[#2a2a31] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17171c] sm:self-auto"
          >
            Open the editor
          </Link>
        </div>

        <div className="mt-14 columns-1 gap-6 sm:columns-2 lg:columns-3">
          {PIECES.map((p, i) => (
            <motion.figure
              key={p.src}
              className="mb-8 break-inside-avoid"
              initial={reduce ? false : { opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "0px 0px -8% 0px" }}
              transition={{ duration: 0.9, ease: EASE, delay: Math.floor(i / 3) * 0.09 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.src}
                width={p.w}
                height={p.h}
                alt={p.alt}
                loading="lazy"
                decoding="async"
                className="block h-auto w-full rounded-[14px] shadow-[0_1px_2px_rgba(23,23,28,0.08),0_22px_44px_-22px_rgba(23,23,28,0.45)]"
              />
              <figcaption className="mt-3 flex items-baseline justify-between gap-3 text-[13px]">
                <span className="min-w-0">
                  <span className="font-medium">{p.layout}</span>
                  <span className="text-[#6e6e78]"> on {p.collection}</span>
                  {p.pro && (
                    <span className="ml-2 rounded-[5px] bg-[#17171c]/[0.07] px-1.5 py-px text-[11px] font-medium text-[#55555f]">
                      Pro
                    </span>
                  )}
                </span>
                <span className="shrink-0 tabular-nums text-[#8a8a94]">{p.size}</span>
              </figcaption>
            </motion.figure>
          ))}

          <motion.figure
            className="mb-8 break-inside-avoid"
            initial={reduce ? false : { opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px -8% 0px" }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.18 }}
          >
            <div className="rounded-[14px] bg-white/60 p-5 ring-1 ring-[#17171c]/[0.06]">
              <div className="grid grid-cols-3 gap-3">
                {INPUTS.map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={src}
                    src={src}
                    width={300}
                    height={652}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="block h-auto w-full rounded-[6px] ring-1 ring-[#17171c]/10"
                  />
                ))}
              </div>
            </div>
            <figcaption className="mt-3 flex items-baseline justify-between gap-3 text-[13px]">
              <span>
                <span className="font-medium">What went in</span>
                <span className="text-[#6e6e78]">: plain screenshots</span>
              </span>
              <span className="shrink-0 tabular-nums text-[#8a8a94]">1206 × 2622</span>
            </figcaption>
          </motion.figure>
        </div>
      </div>
    </section>
  );
}
