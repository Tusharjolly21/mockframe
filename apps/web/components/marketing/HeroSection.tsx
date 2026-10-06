"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { DemoVideo } from "./DemoVideo";

const EASE = [0.22, 1, 0.36, 1] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 18, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: EASE } },
};

const STEPS = ["Add your screen", "Style the scene", "Export in seconds"];

export function HeroSection({ devicesCount }: { devicesCount: number }) {
  const reduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden">
      {/* faint grid, faded out toward the edges */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 70% 55% at 50% 0%, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 55% at 50% 0%, black 30%, transparent 75%)",
        }}
      />
      {/* top light */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-240px] h-[720px] w-[1100px] -translate-x-1/2"
        style={{
          background:
            "radial-gradient(ellipse 45% 45% at 50% 40%, rgba(124,58,237,0.22), transparent 70%), radial-gradient(ellipse 30% 30% at 64% 52%, rgba(56,189,248,0.10), transparent 70%)",
        }}
        animate={reduce ? undefined : { opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 pt-36 text-center sm:pt-40"
      >
        <motion.div variants={item}>
          <Link
            href="/mockups"
            className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] py-1 pl-1 pr-3 text-[12.5px] text-zinc-300 backdrop-blur transition-colors hover:border-white/20"
          >
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white">New</span>
            {devicesCount} photoreal devices, free to start
            <ArrowRight size={13} className="text-zinc-500 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.div>

        <motion.h1
          variants={item}
          className="mt-7 text-balance text-[44px] font-semibold leading-[1.02] tracking-[-0.045em] text-white sm:text-[68px]"
        >
          Screenshots in.
          <br />
          <span className="bg-gradient-to-b from-white to-white/45 bg-clip-text text-transparent">Stunning mockups out.</span>
        </motion.h1>

        <motion.p variants={item} className="mt-6 max-w-[540px] text-[16px] leading-relaxed text-zinc-400 sm:text-[17px]">
          Drop a screenshot into a real device, style the scene, and export a production-ready image or video. No
          design tools, no sign-up wall.
        </motion.p>

        <motion.div variants={item} className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/editor"
            className="group inline-flex h-11 items-center gap-2 rounded-full bg-white px-6 text-[14.5px] font-semibold text-zinc-950 shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_10px_40px_-10px_rgba(255,255,255,0.45)] transition-all hover:bg-zinc-100 active:scale-[0.98]"
          >
            Start creating, it&apos;s free
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#demo"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-5 text-[14.5px] font-medium text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/[0.06]"
          >
            <span className="grid h-5 w-5 place-items-center rounded-full bg-white/10">
              <svg width="8" height="9" viewBox="0 0 8 9" aria-hidden>
                <path d="M0 0.8v7.4a.5.5 0 0 0 .76.43l6.2-3.7a.5.5 0 0 0 0-.86L.76.37A.5.5 0 0 0 0 .8Z" fill="currentColor" />
              </svg>
            </span>
            Watch the demo
          </a>
        </motion.div>

        <motion.ol variants={item} className="mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[13px] text-zinc-500">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-3">
              <span className="flex items-center gap-2">
                <span className="grid h-5 w-5 place-items-center rounded-full border border-white/10 text-[10.5px] font-semibold text-zinc-300">
                  {i + 1}
                </span>
                {s}
              </span>
              {i < STEPS.length - 1 && <span aria-hidden className="h-px w-6 bg-white/10" />}
            </li>
          ))}
        </motion.ol>
      </motion.div>

      <motion.div
        id="demo"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.35, ease: EASE }}
        className="relative z-10 mx-auto mt-16 max-w-6xl scroll-mt-24 px-4 pb-24 sm:px-6"
      >
        <DemoVideo src="/demo/mockframe-demo.mp4" poster="/demo/mockframe-demo-poster.jpg" />
      </motion.div>
    </section>
  );
}
