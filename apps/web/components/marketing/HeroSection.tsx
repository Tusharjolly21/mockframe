"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { FakeScreen } from "./FakeScreen";
import { SolarIcon } from "./SolarIcon";

const EASE = [0.22, 1, 0.36, 1] as const;

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
  const float = reduce ? {} : { y: [0, -12, 0] };

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
        <div className="flex items-end justify-center gap-5 sm:gap-10">
          {/* 01 — your raw screenshot */}
          <motion.div variants={stageItem} className="hidden flex-col items-center md:flex">
            <StepLabel n="01" text="Your screenshot" />
            <div className="mt-4 w-[150px] -rotate-3 overflow-hidden rounded-[18px] border border-dashed border-white/25 opacity-90 lg:w-[170px]">
              <FakeScreen app="whatsapp" className="block w-full" />
            </div>
          </motion.div>

          <motion.div variants={stageItem} className="mb-24 hidden md:block">
            <FlowArrow />
          </motion.div>

          {/* 02 — framed in a real device (gently floating focal point) */}
          <motion.div variants={stageItem} className="flex flex-col items-center">
            <StepLabel n="02" text="Dropped into a real device" />
            <div className="relative mt-4">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10 scale-125 rounded-full opacity-70 blur-2xl"
                style={{ background: "radial-gradient(circle at 50% 45%, rgba(124,58,237,0.35), transparent 65%)" }}
              />
              <motion.img
                src="/hero/hero-iphone.webp"
                alt="Photoreal iPhone 16 Pro mockup with a WhatsApp screenshot"
                className="w-[180px] drop-shadow-[0_36px_60px_rgba(0,0,0,0.6)] sm:w-[210px]"
                animate={float}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </motion.div>

          <motion.div variants={stageItem} className="mb-24 hidden sm:block">
            <FlowArrow />
          </motion.div>

          {/* 03 — styled & exported */}
          <motion.div variants={stageItem} className="hidden flex-col items-center sm:flex">
            <StepLabel n="03" text="Styled & exported" />
            <div
              className="mt-4 flex h-[300px] w-[220px] items-center justify-center overflow-hidden rounded-[20px] border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.5)] sm:h-[340px] sm:w-[260px]"
              style={{
                background:
                  "radial-gradient(120% 100% at 20% 0%, #6d28d9 0%, #4f46e5 34%, #0e7490 78%, #155e75 100%)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/hero/hero-iphone.webp"
                alt="Exported mockup — iPhone on a styled gradient background"
                className="h-[82%] w-auto drop-shadow-[0_24px_44px_rgba(0,0,0,0.45)]"
              />
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
