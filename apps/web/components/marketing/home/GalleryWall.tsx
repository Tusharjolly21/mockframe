"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const EASE = [0.22, 1, 0.36, 1] as const;

type Piece = {
  id: string;
  /** one image, or several shown edge to edge (an App Store set) */
  srcs: string[];
  /** natural size of each image file */
  w: number;
  h: number;
  /** template or mockup name, as the templates gallery shows it */
  name: string;
  /** what the export is for */
  use: string;
  /** export size in px */
  size: string;
  pro?: boolean;
  /** opens the same template in the editor */
  href: string;
  alt: string;
};

const made = (file: string) => `/home/made/${file}.webp`;

const PIECES: Record<string, Piece> = {
  keynote: {
    id: "keynote",
    srcs: [made("keynote-stage")],
    w: 1920,
    h: 1080,
    name: "Keynote Stage",
    use: "For a launch video",
    size: "1920 × 1080",
    pro: true,
    href: "/templates/keynote-stage",
    alt: "A spotlit black stage with the word Aurora in a violet to orange gradient above a tilted iPhone showing a soundscapes app",
  },
  reel: {
    id: "reel",
    srcs: [made("reel-cover")],
    w: 1080,
    h: 1920,
    name: "Reel Cover",
    use: "For Reels and TikTok",
    size: "1080 × 1920",
    pro: true,
    href: "/templates/reel-cover",
    alt: "Loud stacked type reading Stop scrolling. Start building. over a blue sunburst, with an oversized iPhone showing a running app",
  },
  penny: {
    id: "penny",
    srcs: [1, 2, 3, 4, 5].map((n) => made(`penny-${n}`)),
    w: 660,
    h: 1434,
    name: "App Store set",
    use: "Five of eight screenshots, one panorama",
    size: "1320 × 2868 each",
    href: "/templates/sets/penny?device=ios",
    alt: "Five App Store screenshots for a finance app on a green silk backdrop, with a payment card and a savings goal spanning the joins",
  },
  productHunt: {
    id: "productHunt",
    srcs: [made("product-hunt")],
    w: 1270,
    h: 760,
    name: "Product Hunt Gallery",
    use: "For launch day",
    size: "1270 × 760",
    pro: true,
    href: "/templates/product-hunt",
    alt: "A Product Hunt gallery image for an app called Notely: headline, upvote button, a laptop and a phone on warm cream",
  },
  clay: {
    id: "clay",
    srcs: [made("clay-studio")],
    w: 1080,
    h: 1350,
    name: "Clay Studio",
    use: "For a case study",
    size: "1080 × 1350",
    pro: true,
    href: "/templates/clay-studio",
    alt: "Two matte porcelain clay phones showing a habit tracker under the serif headline Made with care",
  },
  whatsNew: {
    id: "whatsNew",
    srcs: [made("whats-new")],
    w: 1080,
    h: 1350,
    name: "What's New",
    use: "For release notes",
    size: "1080 × 1350",
    pro: true,
    href: "/templates/whats-new",
    alt: "A version 2.0 release post on deep blue: a tilted phone with a sleep app and three feature chips",
  },
  inHand: {
    id: "inHand",
    srcs: [made("angled-hush")],
    w: 1800,
    h: 1200,
    name: "iPhone 17 Pro in hand",
    use: "Photo mockup",
    size: "4000 × 2666",
    href: "/templates/iphone-in-hand-angled",
    alt: "A real photo of a hand holding an iPhone 17 Pro at an angle, showing a sleep stages screen, with a plant in soft daylight behind",
  },
  launch: {
    id: "launch",
    srcs: [made("launch-hero")],
    w: 1600,
    h: 900,
    name: "Launch Hero",
    use: "For a website hero",
    size: "1600 × 900",
    href: "/templates/launch-hero",
    alt: "A website hero with the headline Your app, beautifully shipped, store buttons and one tilted phone on a soft peach and lilac mesh",
  },
};

/**
 * Justified rows: every piece in a row gets flex-grow equal to its aspect
 * ratio, so all of them end up the same height with nothing cropped.
 */
const ROWS: string[][] = [["keynote", "reel"], ["penny"], ["productHunt", "clay", "whatsNew"], ["inHand", "launch"]];

/** Lightbox order: the wall read left to right, top to bottom. */
const ORDER = ROWS.flat();

const ratio = (p: Piece) => (p.w * p.srcs.length) / p.h;

/**
 * "Made in MockFrame": real, untouched editor exports hung as a gallery wall.
 * Rows rise once as they scroll into view; clicking a piece opens it large.
 */
export function GalleryWall() {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState<string | null>(null);

  return (
    <section aria-labelledby="gallery-title" className="relative bg-[#f1f1f3] text-[#17171c]">
      <div className="mx-auto max-w-[1240px] px-5 py-24 sm:px-8 sm:py-32">
        <div className="flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <h2
              id="gallery-title"
              className="text-[36px] font-semibold leading-[1.02] tracking-[-0.045em] sm:text-[54px]"
            >
              Made in MockFrame
            </h2>
            <p className="mt-5 text-[16px] leading-relaxed text-[#5c5c66]">
              Every image on this wall is a straight export from the editor. Nothing was retouched afterwards. Open any
              of them to start from the same template.
            </p>
          </div>
          <Link
            href="/editor"
            className="inline-flex h-11 shrink-0 items-center self-start rounded-full bg-[#17171c] px-5 text-[14.5px] font-medium text-white transition-colors hover:bg-[#2a2a31] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17171c] sm:self-auto"
          >
            Open the editor
          </Link>
        </div>

        <div className="mt-14 flex flex-col gap-10 sm:gap-12">
          {ROWS.map((row, r) => (
            <motion.div
              key={row.join("-")}
              className="flex flex-col gap-10 md:flex-row md:gap-6"
              initial={reduce ? false : { opacity: 0, y: 36 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "0px 0px -10% 0px" }}
              transition={{ duration: 0.95, ease: EASE, delay: r === 0 ? 0.05 : 0 }}
            >
              {row.map((id) => {
                const p = PIECES[id];
                return (
                  <figure
                    key={id}
                    // Stacked on a phone, a 9:16 piece would fill more than a screen; cap its height.
                    className={`min-w-0 md:basis-0 ${ratio(p) < 0.7 ? "max-md:w-[min(100%,calc(62svh*var(--ratio)))]" : ""}`}
                    style={{ flexGrow: ratio(p), ["--ratio" as string]: ratio(p) }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpen(id)}
                      aria-label={`View ${p.name} larger`}
                      className="group block w-full cursor-zoom-in rounded-[12px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#17171c]"
                    >
                      <Frame piece={p} strip={p.srcs.length > 1} />
                    </button>
                    <Caption piece={p} />
                  </figure>
                );
              })}
            </motion.div>
          ))}
        </div>
      </div>

      <Lightbox openId={open} onChange={setOpen} reduce={!!reduce} />
    </section>
  );
}

function Frame({ piece: p, strip }: { piece: Piece; strip: boolean }) {
  const shade =
    "shadow-[0_1px_2px_rgba(23,23,28,0.08),0_24px_48px_-24px_rgba(23,23,28,0.5)] transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-1 group-hover:shadow-[0_1px_2px_rgba(23,23,28,0.08),0_34px_60px_-26px_rgba(23,23,28,0.55)] motion-reduce:transition-none motion-reduce:group-hover:translate-y-0";

  if (!strip) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={p.srcs[0]}
        width={p.w}
        height={p.h}
        alt={p.alt}
        loading="lazy"
        decoding="async"
        className={`block h-auto w-full rounded-[12px] bg-white ${shade}`}
      />
    );
  }

  // An App Store set reads as one continuous panorama on wide screens; on a
  // phone it becomes a swipeable row at a size where the captions stay legible.
  return (
    <div className={`overflow-x-auto rounded-[12px] [scrollbar-width:none] md:overflow-hidden ${shade}`}>
      <div role="img" aria-label={p.alt} className="flex w-[300%] sm:w-[180%] md:w-full">
        {p.srcs.map((src) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={src}
            width={p.w}
            height={p.h}
            alt=""
            loading="lazy"
            decoding="async"
            className="block h-auto min-w-0 flex-1"
          />
        ))}
      </div>
    </div>
  );
}

function Caption({ piece: p }: { piece: Piece }) {
  return (
    <figcaption className="mt-3.5 text-[13px] leading-snug">
      <span className="flex items-center gap-2 font-medium">
        {p.name}
        {p.pro && (
          <span className="rounded-[5px] bg-[#17171c]/[0.07] px-1.5 py-px text-[11px] font-medium text-[#55555f]">Pro</span>
        )}
      </span>
      <span className="mt-0.5 flex items-baseline justify-between gap-4 text-[#6e6e78]">
        <span className="min-w-0">{p.use}</span>
        <span className="shrink-0 tabular-nums text-[#8a8a94]">{p.size}</span>
      </span>
    </figcaption>
  );
}

function Lightbox({
  openId,
  onChange,
  reduce,
}: {
  openId: string | null;
  onChange: (id: string | null) => void;
  reduce: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const piece = openId ? PIECES[openId] : null;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (openId && !d.open) d.showModal();
    if (!openId && d.open) d.close();
  }, [openId]);

  const step = useCallback(
    (by: number) => {
      if (!openId) return;
      const i = ORDER.indexOf(openId);
      onChange(ORDER[(i + by + ORDER.length) % ORDER.length]);
    },
    [openId, onChange]
  );

  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId, step]);

  return (
    <dialog
      ref={ref}
      aria-label={piece ? piece.name : "Gallery"}
      onClose={() => onChange(null)}
      onClick={(e) => e.target === e.currentTarget && onChange(null)}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-0 backdrop:bg-[#0d0d10]/[0.86] backdrop:backdrop-blur-sm"
    >
      {piece && (
        <div
          className="flex h-full flex-col items-center justify-center gap-5 px-4 py-14 sm:px-16"
          onClick={(e) => e.target === e.currentTarget && onChange(null)}
        >
          <AnimatePresence mode="wait" initial={!reduce}>
            <motion.div
              key={piece.id}
              initial={reduce ? false : { opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, scale: 0.985 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="flex w-full justify-center"
            >
              <div
                className="flex overflow-hidden rounded-[10px] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8)]"
                style={{ width: `min(100%, calc((100dvh - 11rem) * ${ratio(piece)}))` }}
              >
                {piece.srcs.map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={src}
                    src={src}
                    width={piece.w}
                    height={piece.h}
                    alt={piece.srcs.length > 1 ? "" : piece.alt}
                    className="block h-auto min-w-0 flex-1"
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex w-full max-w-3xl flex-wrap items-center justify-between gap-x-6 gap-y-3 text-[13.5px] text-white">
            <p className="min-w-0 leading-snug">
              <span className="block font-medium">{piece.name}</span>
              <span className="block text-white/60">
                {piece.use}, <span className="tabular-nums">{piece.size}</span>
              </span>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous"
                className="grid size-10 place-items-center rounded-full text-white/80 ring-1 ring-white/20 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <Chevron dir="left" />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next"
                className="grid size-10 place-items-center rounded-full text-white/80 ring-1 ring-white/20 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <Chevron dir="right" />
              </button>
              <Link
                href={piece.href}
                className="ml-1 inline-flex h-10 items-center rounded-full bg-white px-4 font-medium text-[#17171c] transition-colors hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Use this template
              </Link>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Close"
            className="absolute right-4 top-4 grid size-10 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}
    </dialog>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d={dir === "left" ? "M10 3L5 8l5 5" : "M6 3l5 5-5 5"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
