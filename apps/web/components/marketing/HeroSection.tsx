"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { patternStyle } from "@framekit/renderer";
import { FakeScreen } from "./FakeScreen";
import { SolarIcon } from "./SolarIcon";
import { TiltMockupCard } from "./TiltMockupCard";

const EASE = [0.22, 1, 0.36, 1] as const;

/** The editor's Confetti preset (FramePanel PATTERN_PRESETS), rendered by the
 *  same patternStyle() the canvas and exports use — quieter here (intensity,
 *  blur) so the pattern dresses the scene without fighting the device. */
const CONFETTI_PATTERN_STYLE = patternStyle({
  kind: "confetti",
  color: "#c4b5fd",
  intensity: 0.34,
  thickness: 0.5,
  blur: 1.5,
  blendMode: "screen",
  seed: 97,
  paletteSeed: 0,
});

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.08 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

const stage: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.14, delayChildren: 0.1 } },
};
const stageItem: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, ease: EASE } },
};

const TRUST = ["No sign-up to start", "Photoreal devices", "Instant export", "Pro-ready output"];

export function HeroSection({ devicesCount }: { devicesCount: number }) {
  const reduce = useReducedMotion();
  const float = reduce ? {} : { y: [0, -10, 0] };
  const floatSlow = reduce ? {} : { y: [0, -14, 0] };

  return (
    <section className="relative overflow-hidden">
      {/* breathing gradient glow behind the hero */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[820px] w-[1200px] -translate-x-1/2"
        style={{
          background:
            "radial-gradient(ellipse 50% 50% at 50% 20%, rgba(124,58,237,0.18), transparent 70%), radial-gradient(ellipse 40% 40% at 68% 28%, rgba(6,182,212,0.13), transparent 70%)",
        }}
        animate={reduce ? undefined : { opacity: [0.75, 1, 0.75], scale: [1, 1.05, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 pt-32 text-center"
      >
        <motion.span
          variants={item}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[12.5px] font-medium text-zinc-300 backdrop-blur"
        >
          <SolarIcon name="bolt-bold-duotone" size={14} className="text-violet-400" />
          {devicesCount} devices · start free
        </motion.span>

        <motion.h1
          variants={item}
          className="mt-6 text-[40px] font-medium leading-[1.04] tracking-[-0.035em] text-balance sm:text-[58px]"
        >
          Turn any screenshot into a{" "}
          <span className="relative bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">
            stunning mockup.
          </span>
        </motion.h1>

        <motion.p
          variants={item}
          className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-zinc-400 sm:text-[16.5px]"
        >
          Drop your screenshot into a photoreal device, style the scene, and export a production-ready image.
          Start free, online, with no sign-up wall.
        </motion.p>

        <motion.div variants={item} className="mt-8 flex items-center gap-5">
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="inline-block">
            <Link
              href="/editor"
              className="group inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-[14.5px] font-semibold text-zinc-900 shadow-[0_8px_30px_rgba(255,255,255,0.12)] transition-colors hover:bg-zinc-100"
            >
              Open the editor
              <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
          <Link
            href="/mockups"
            className="group inline-flex items-center gap-1.5 text-[14px] font-medium text-zinc-300 transition-colors hover:text-white"
          >
            Browse {devicesCount} devices
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </motion.div>
      </motion.div>

      {/* ---------- the workflow: screenshot → real device → export ---------- */}
      <motion.div
        variants={stage}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        className="relative z-10 mx-auto mt-16 max-w-6xl px-6 pb-10"
      >
        <div className="flex items-center justify-center gap-4 sm:gap-8">
          {/* 01 — the boring raw screenshot (flat, muted, dashed = "before") */}
          <motion.div variants={stageItem} className="hidden flex-col items-center md:flex">
            <StepLabel n="01" text="Your screenshot" />
            <div className="mt-5 w-[150px] -rotate-2 overflow-hidden rounded-[20px] border border-dashed border-white/20 opacity-80 grayscale-[0.35]">
              <FakeScreen app="whatsapp" className="block w-full" />
            </div>
          </motion.div>

          <motion.div variants={stageItem} className="hidden md:block">
            <FlowArrow />
          </motion.div>

          {/* 02 — dropped into a real device (clean, floating). Hidden on the
              smallest screens so mobile shows just the premium 03 payoff card
              instead of two devices crammed side by side. */}
          <motion.div variants={stageItem} className="hidden flex-col items-center sm:flex">
            <StepLabel n="02" text="Dropped into a real device" />
            <div className="relative mt-5">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10 scale-110 rounded-full opacity-60 blur-2xl"
                style={{ background: "radial-gradient(circle at 50% 45%, rgba(124,58,237,0.3), transparent 65%)" }}
              />
              <motion.img
                src="/hero/hero-iphone.webp"
                alt="Photoreal iPhone 16 Pro mockup with a WhatsApp screenshot"
                className="w-[168px] drop-shadow-[0_30px_55px_rgba(0,0,0,0.55)]"
                width={560}
                height={1332}
                animate={float}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </motion.div>

          <motion.div variants={stageItem} className="hidden sm:block">
            <FlowArrow />
          </motion.div>

          {/* 03 — STYLED & EXPORTED: the premium payoff. Same phone, now a
              production-grade scene — the "look how good your export can be". */}
          <motion.div variants={stageItem} className="flex flex-col items-center">
            <StepLabel n="03" text="Styled & exported" />
            <div className="mt-5">
              <TiltMockupCard
                width="310px"
                height="486px"
                background="radial-gradient(120% 90% at 22% 12%, rgba(217,70,239,0.38), transparent 55%), radial-gradient(120% 90% at 82% 88%, rgba(34,211,238,0.3), transparent 55%), radial-gradient(140% 120% at 60% 42%, rgba(124,58,237,0.42), transparent 60%), linear-gradient(150deg, #0b0817 0%, #17102b 52%, #0a1420 100%)"
              >
                {/* the editor's own Confetti backdrop pattern — rendered by the
                    exact patternStyle() our exports use, so the card IS a
                    MockFrame scene, not an imitation of one */}
                <div style={CONFETTI_PATTERN_STYLE} />
                {/* dramatic top spotlight raking down the scene */}
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-1/2"
                  style={{ background: "radial-gradient(80% 100% at 50% 0%, rgba(255,255,255,0.14), transparent 70%)" }}
                />

                {/* depth: soft glow orbs */}
                <div className="pointer-events-none absolute -left-6 top-[14%] h-40 w-40 rounded-full bg-fuchsia-500/30 blur-[46px]" />
                <div className="pointer-events-none absolute -right-4 bottom-[10%] h-36 w-36 rounded-full bg-cyan-400/25 blur-[42px]" />
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/25 blur-[60px]" />

                {/* premium film grain */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.14] mix-blend-overlay"
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                  }}
                />
                {/* vignette to focus the device */}
                <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(70% 60% at 50% 45%, transparent 55%, rgba(0,0,0,0.42) 100%)" }} />

                {/* studio spotlight behind the device — the "product shot" key light */}
                <div
                  className="pointer-events-none absolute left-1/2 top-[30%] h-64 w-64 -translate-x-1/2 -translate-y-1/2"
                  style={{ background: "radial-gradient(circle, rgba(255,255,255,0.16), transparent 62%)" }}
                />

                {/* the device — floating, with a soft ground glow + a sweeping sheen */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* ground contact shadow */}
                  <div className="pointer-events-none absolute bottom-[12%] h-9 w-[58%] rounded-[50%] bg-black/50 blur-xl" />
                  <motion.div
                    className="relative"
                    animate={floatSlow}
                    transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    {/* colored rim glow hugging the device */}
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -inset-2 -z-10 rounded-[36px] opacity-70 blur-lg"
                      style={{ background: "linear-gradient(140deg, rgba(217,70,239,0.5), rgba(124,58,237,0.35), rgba(34,211,238,0.45))" }}
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/hero/hero-iphone.webp"
                      alt="A WhatsApp screenshot styled into a premium exported mockup"
                      className="h-[356px] w-auto select-none drop-shadow-[0_40px_60px_rgba(0,0,0,0.66)]"
                      width={560}
                      height={1332}
                      fetchPriority="high"
                      draggable={false}
                    />
                    {/* specular sheen sweep (loops, no user gesture needed) */}
                    <motion.div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 overflow-hidden"
                      style={{ maskImage: "url(/hero/hero-iphone.webp)", WebkitMaskImage: "url(/hero/hero-iphone.webp)", WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat" }}
                    >
                      <motion.div
                        className="absolute inset-y-0 w-1/2 -skew-x-12"
                        style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)" }}
                        animate={reduce ? {} : { x: ["-160%", "260%"] }}
                        transition={{ duration: 3.2, repeat: Infinity, repeatDelay: 2.4, ease: "easeInOut" }}
                      />
                    </motion.div>
                  </motion.div>
                </div>

                {/* marketing text — like a real composed export */}
                <div className="absolute left-5 top-4 z-20">
                  <p className="text-[17px] font-semibold leading-[1.08] tracking-[-0.02em] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                    Ship it
                    <br />
                    <span className="bg-gradient-to-r from-fuchsia-300 to-cyan-200 bg-clip-text text-transparent">beautifully.</span>
                  </p>
                </div>

                {/* frosted-glass feature chip — the "blurriness", floating over the scene */}
                <div className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2">
                  <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md">
                    <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-gradient-to-br from-violet-400 to-cyan-300 text-[7px] text-white">✓</span>
                    <span className="text-[10px] font-semibold text-white">Exported in 4K</span>
                  </div>
                </div>

                {/* frame-breaking floating UI — reads as a live product shot */}
                {/* dark iOS-style glass notification popping off the device's top-right */}
                <motion.div
                  className="absolute -right-2 top-[7%] z-30 w-[150px] rotate-[4deg]"
                  animate={reduce ? {} : { y: [0, -7, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className="flex items-center gap-2 rounded-2xl border border-white/12 bg-black/45 p-2 shadow-[0_20px_48px_rgba(0,0,0,0.6)] backdrop-blur-xl">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400 text-[9px] font-bold text-white">SC</span>
                    <span className="min-w-0">
                      <span className="block truncate text-[9.5px] font-semibold text-white">New reaction</span>
                      <span className="block truncate text-[8.5px] text-white/70">Sam loved your message ❤️</span>
                    </span>
                  </div>
                </motion.div>

                {/* floating reaction bubble popping off the left, with a soft glow */}
                <motion.div
                  className="absolute left-[13%] top-[42%] z-30"
                  animate={reduce ? {} : { y: [0, 8, 0] }}
                  transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                >
                  <div className="absolute inset-0 -z-10 rounded-full bg-fuchsia-500/40 blur-md" />
                  <div className="grid h-10 w-10 place-items-center rounded-full border border-white/25 bg-white/20 text-base shadow-[0_14px_30px_rgba(0,0,0,0.45)] backdrop-blur-md">❤️</div>
                </motion.div>

                {/* top-edge highlight for a glassy premium rim */}
                <div className="pointer-events-none absolute inset-0 rounded-[24px]" style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), inset 0 0 0 1px rgba(255,255,255,0.05)" }} />
              </TiltMockupCard>
            </div>
          </motion.div>
        </div>

        {/* trust row */}
        <motion.div
          variants={item}
          className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[12.5px] font-medium text-zinc-500"
        >
          {TRUST.map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {t}
            </span>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}

function StepLabel({ n, text }: { n: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11.5px] font-semibold uppercase tracking-wide text-zinc-400 backdrop-blur">
      <span className="text-violet-400">{n}</span>
      {text}
    </span>
  );
}

function FlowArrow() {
  return (
    <svg viewBox="0 0 48 24" className="h-6 w-12 shrink-0 text-zinc-600" aria-hidden>
      <path d="M2 12h40m0 0-8-8m8 8-8 8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
