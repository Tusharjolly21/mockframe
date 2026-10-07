# Components

No third-party component library: UI is hand-built with Tailwind v4 utility classes, lucide-react icons, and motion (framer-motion) for animation. Editor primitives live in `components/editor/ui.tsx` (light theme, #17171c ink, #ececf2 hairlines, `fk-card` / `fk-press` classes from globals.css). Marketing pages are dark (#09090b bg, #101116 cards, white/10 borders, zinc text scale).

### `apps/web/components/editor/ui.tsx`

```tsx
"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { motion } from "motion/react";

export function Section({ title, children, action, collapsible = false, defaultOpen = true }: { title: string; children: ReactNode; action?: ReactNode; collapsible?: boolean; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="px-4 pt-4 pb-1">
      <div className="mb-2.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[#8a8a94]">
        {collapsible ? (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="fk-press flex min-w-0 flex-1 items-center justify-between text-left"
            aria-expanded={open}
          >
            {title}
            <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        ) : title}
        {action}
      </div>
      {(!collapsible || open) && children}
    </section>
  );
}

export function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  format = (v: number) => `${Math.round(v)}`,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="mb-3 block">
      <span className="mb-1.5 flex justify-between text-xs text-[#6b6b76]">
        {label}
        <em className="not-italic tabular-nums font-medium text-[#17171c]">{format(value)}</em>
      </span>
      <input
        type="range"
        className="w-full"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

/** Segmented control with an animated sliding thumb (shots.so feel). */
export function Seg<T extends string>({
  options,
  value,
  onChange,
  id,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  id: string;
}) {
  return (
    <div className="mb-3 grid auto-cols-fr grid-flow-col gap-0.5 rounded-xl bg-[#ececf2] p-1">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            aria-pressed={active}
            className={`fk-press relative rounded-lg px-2 py-1.5 text-xs font-medium ${
              active ? "text-[#17171c]" : "text-[#8a8a94] hover:text-[#4a4a55]"
            }`}
            onClick={() => onChange(o.value)}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-lg bg-white shadow-[0_1px_4px_rgba(20,20,40,0.12)]"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative z-10">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="mb-3 flex items-center justify-between text-xs text-[#6b6b76]">
      {label}
      <span className="flex items-center gap-2">
        <span className="tabular-nums text-[#a0a0aa]">{value}</span>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      </span>
    </label>
  );
}

export function IconButton({
  title,
  onClick,
  disabled,
  children,
  active,
}: {
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`fk-press grid h-9 w-9 place-items-center rounded-xl disabled:cursor-not-allowed disabled:opacity-30 ${
        active ? "bg-[#17171c] text-white" : "text-[#5a5a66] hover:bg-[#17171c]/6"
      }`}
    >
      {children}
    </button>
  );
}

const POPOVER_FOCUSABLE = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function popoverItems(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(POPOVER_FOCUSABLE)).filter((item) => {
    if (item.closest<HTMLElement>("[data-fk-popover]") !== root) return false;
    const rect = item.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && item.getAttribute("aria-hidden") !== "true";
  });
}

function nextSpatialItem(items: HTMLElement[], current: HTMLElement, key: string): HTMLElement | undefined {
  const from = current.getBoundingClientRect();
  const fx = from.left + from.width / 2;
  const fy = from.top + from.height / 2;
  const candidates = items.flatMap((item) => {
    if (item === current) return [];
    const rect = item.getBoundingClientRect();
    const dx = rect.left + rect.width / 2 - fx;
    const dy = rect.top + rect.height / 2 - fy;
    const primary = key === "ArrowRight" ? dx : key === "ArrowLeft" ? -dx : key === "ArrowDown" ? dy : -dy;
    if (primary <= 2) return [];
    const cross = key === "ArrowRight" || key === "ArrowLeft" ? Math.abs(dy) : Math.abs(dx);
    return [{ item, score: primary * 4 + cross }];
  });
  return candidates.sort((a, b) => a.score - b.score)[0]?.item;
}

/** Animated popover shell. Mount inside a relatively-positioned parent. */
export function Popover({
  children,
  className,
  style,
  onEscape,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onEscape?: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  // user-movable (user request): grab any non-interactive area to reposition,
  // so the popover never has to occlude the thing being edited. Offset uses
  // the CSS `translate` property — independent of `transform`, which motion
  // owns and callers use for centering. Resets on close (remount).
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragFrom = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  const onDragPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const t = e.target as HTMLElement;
    if (t.closest("button, a, input, select, textarea, label, img, canvas, [contenteditable], [role='slider']")) return;
    dragFrom.current = { px: e.clientX, py: e.clientY, ox: dragOffset.x, oy: dragOffset.y };
    const onMove = (ev: PointerEvent) => {
      const d = dragFrom.current;
      if (!d) return;
      setDragOffset({ x: d.ox + ev.clientX - d.px, y: d.oy + ev.clientY - d.py });
    };
    const onUp = () => {
      dragFrom.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const root = rootRef.current;
      if (!root) return;
      const preferred = root.querySelector<HTMLElement>("[data-popover-autofocus='true'], [aria-pressed='true'], [aria-selected='true'], [aria-current='true']");
      const target = preferred && preferred.closest("[data-fk-popover]") === root ? preferred : popoverItems(root)[0];
      target?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && onEscape) {
      event.preventDefault();
      event.stopPropagation();
      onEscape();
      return;
    }
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const target = event.target as HTMLElement;
    if (target.matches("input, textarea, select, [contenteditable='true']")) return;
    const root = rootRef.current;
    if (!root) return;
    const items = popoverItems(root);
    if (!items.length) return;
    const current = items.includes(target) ? target : items[0];
    const next = event.key === "Home"
      ? items[0]
      : event.key === "End"
        ? items.at(-1)
        : nextSpatialItem(items, current, event.key);
    if (!next) return;
    event.preventDefault();
    event.stopPropagation();
    next.focus();
    next.scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  return (
    <motion.div
      ref={rootRef}
      data-fk-popover
      role="dialog"
      onKeyDownCapture={onKeyDown}
      onPointerDown={onDragPointerDown}
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 480, damping: 34 }}
      className={`fk-card fk-popover-focus absolute z-50 ${className ?? ""}`}
      style={{ transformOrigin: "top left", borderRadius: 24, translate: `${dragOffset.x}px ${dragOffset.y}px`, ...style }}
    >
      {children}
    </motion.div>
  );
}
```

### `apps/web/components/marketing/Reveal.tsx`

```tsx
"use client";

import { motion, type Variants } from "motion/react";
import type { ReactNode } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Fade-and-rise a block into view once, as it scrolls in. Zero layout impact. */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

const groupVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};
const childVariants: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

/** A grid/row wrapper that staggers its RevealItem children into view. */
export function RevealGroup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={groupVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-70px" }}
    >
      {children}
    </motion.div>
  );
}

/** One staggered cell inside a RevealGroup. `h-full` keeps grid rows even.
 *  Lifts gently on hover (disable with `lift={false}` for non-card content). */
export function RevealItem({
  children,
  className,
  lift = true,
}: {
  children: ReactNode;
  className?: string;
  lift?: boolean;
}) {
  return (
    <motion.div
      variants={childVariants}
      className={className}
      whileHover={lift ? { y: -4 } : undefined}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
    >
      {children}
    </motion.div>
  );
}
```

### `apps/web/components/marketing/GuideShot.tsx`

```tsx
/**
 * A product screenshot presented in a browser window over a soft glow in the
 * guide's accent, so editor captures read as a polished product shot.
 */
export function GuideShot({
  src,
  alt,
  accent = "#a78bfa",
  url = "mockframe.app/editor",
  priority = false,
  bare = false,
  className = "",
}: {
  src: string;
  alt: string;
  accent?: string;
  url?: string;
  priority?: boolean;
  /** no browser chrome: for artwork rather than editor captures */
  bare?: boolean;
  className?: string;
}) {
  return (
    <figure className={`relative ${className}`}>
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-6 -inset-y-8 opacity-70 blur-3xl"
        style={{ background: `radial-gradient(60% 60% at 50% 40%, ${accent}55, transparent 70%)` }}
      />
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.12] bg-[#121218] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.75)] ring-1 ring-black/40">
        {!bare && <div className="flex items-center gap-3 border-b border-white/[0.07] bg-gradient-to-b from-white/[0.06] to-white/[0.02] px-4 py-2.5">
          <span className="flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </span>
          <span className="mx-auto hidden max-w-xs flex-1 truncate rounded-md bg-white/[0.06] px-3 py-1 text-center text-[11px] text-zinc-400 sm:block">{url}</span>
          <span className="w-[46px]" aria-hidden />
        </div>}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} loading={priority ? "eager" : "lazy"} className="block w-full" />
      </div>
    </figure>
  );
}
```

### `apps/web/components/marketing/TiltMockupCard.tsx`

```tsx
"use client";

import React, { useRef, useState } from "react";
import { motion, useSpring, useTransform } from "motion/react";

interface Props {
  background?: string;
  width?: string;
  height?: string;
  children: React.ReactNode;
}

export function TiltMockupCard({ background, width = "260px", height = "340px", children }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);

  // Motion spring values for smooth tilt updates
  const rotateX = useSpring(0, { damping: 20, stiffness: 150 });
  const rotateY = useSpring(0, { damping: 20, stiffness: 150 });

  // Specular sheen position maps
  const sheenX = useSpring(50, { damping: 25, stiffness: 120 });
  const sheenY = useSpring(50, { damping: 25, stiffness: 120 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const widthNum = rect.width;
    const heightNum = rect.height;

    // Calculate cursor relative position (-0.5 to 0.5)
    const posX = (e.clientX - rect.left) / widthNum - 0.5;
    const posY = (e.clientY - rect.top) / heightNum - 0.5;

    // Map position to max rotation angle (e.g. 18 degrees)
    rotateX.set(-posY * 18);
    rotateY.set(posX * 18);

    // Map sheen gradient center (0% to 100%)
    sheenX.set((posX + 0.5) * 100);
    sheenY.set((posY + 0.5) * 100);
  };

  const handleMouseEnter = () => {
    setHovering(true);
  };

  const handleMouseLeave = () => {
    setHovering(false);
    rotateX.set(0);
    rotateY.set(0);
    sheenX.set(50);
    sheenY.set(50);
  };

  // Convert Spring values to dynamic background radial gradient styles
  const sheenBg = useTransform(
    [sheenX, sheenY],
    ([x, y]) => `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 65%)`
  );

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative flex items-center justify-center overflow-hidden rounded-[24px] border border-white/10 transition-all duration-300 select-none"
      style={{
        background: background || "radial-gradient(circle at 30% 30%, rgba(124, 58, 237, 0.22), transparent 70%), linear-gradient(135deg, #09080f 0%, #13111c 100%)",
        perspective: "1200px",
        transformStyle: "preserve-3d",
        width,
        height,
        boxShadow: hovering
          ? "0 40px 90px rgba(0, 0, 0, 0.8), 0 0 50px rgba(139, 92, 246, 0.2)"
          : "0 30px 60px rgba(0,0,0,0.55)",
      }}
    >
      {/* 3D Tilting Body Wrapper */}
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
          width: "100%",
          height: "100%",
          position: "relative",
        }}
      >
        {/* Render children inside the 3D rotation frame */}
        {children}

        {/* Specular sheen overlay */}
        <motion.div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: sheenBg,
            pointerEvents: "none",
            mixBlendMode: "overlay",
            zIndex: 50,
          }}
        />
      </motion.div>
    </div>
  );
}
```

### `apps/web/components/marketing/PricingPlans.tsx`

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check } from "lucide-react";
import { SolarIcon } from "./SolarIcon";
import { formatPrice, perMonthPrice, yearlySavingsPct } from "@/lib/billing/plans";

// Clean exports lead the free list on purpose — it's the first objection a
// visitor has about any tool in this category, and answering it up front is
// worth more than hiding it as a Pro bullet.
const FREE_FEATURES = [
  "Watermark-free exports — always",
  "Every device frame + the full editor",
  "WhatsApp & iMessage chat screens",
  "Website capture & app screen templates",
  "Themes, icons, glare & annotations",
  "Custom devices, drafts & cloud sync",
];

// Only list what a paying user can actually DO today. (Custom-device cloud sync
// isn't gated in /api/custom-devices, so it isn't Pro — it sits in the free
// list where the code actually puts it.)
const PRO_FEATURES = [
  "12 more chat & DM screens",
  "Animated app promo videos (MP4)",
  "Photoreal device renders",
  "Premium background collections",
  "Video & GIF export",
  "4K & 6K output",
  "Full-page website capture",
  "Custom-brand watermark",
  "Saved templates in your account",
];

type Billing = "monthly" | "yearly";

export function PricingPlans() {
  const [billing, setBilling] = useState<Billing>("yearly");
  const isYearly = billing === "yearly";
  const savings = yearlySavingsPct();
  // annual is framed as its per-month equivalent; monthly is the raw price
  const perMonth = isYearly ? perMonthPrice("yearly")! : formatPrice("monthly");
  const subline = isYearly
    ? `${formatPrice("yearly")} billed yearly`
    : "billed monthly · cancel anytime";

  return (
    <div className="grid overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] lg:grid-cols-[0.82fr_1.18fr]">
      {/* Free */}
      <div className="flex flex-col bg-[#0d0d10] p-8 lg:p-10">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-cyan-300">
            <SolarIcon name="widget-2-bold-duotone" size={21} />
          </span>
          <div>
            <p className="text-[12px] text-zinc-500">For trying & creating</p>
            <h2 className="text-[21px] font-semibold">Free</h2>
          </div>
        </div>
        <p className="mt-7 text-[40px] font-semibold leading-none">
          $0
        </p>
        <p className="mt-2 text-[13px] text-zinc-500">No watermark · no account required</p>
        <ul className="mt-8 space-y-3">
          {FREE_FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-[13.5px] text-zinc-300">
              <Check size={15} className="mt-0.5 shrink-0 text-emerald-400" /> {f}
            </li>
          ))}
        </ul>
        <Link
          href="/editor"
          className="fk-press mt-auto inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-[13.5px] font-semibold hover:bg-white/[0.06]"
        >
          Open the editor <ArrowRight size={15} />
        </Link>
      </div>

      {/* Pro */}
      <div className="relative overflow-hidden bg-[#111217] p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-violet-600">
              <SolarIcon name="crown-star-bold-duotone" size={21} />
            </span>
            <div>
              <p className="text-[12px] text-violet-300">For polished, production work</p>
              <h2 className="text-[21px] font-semibold">MockFrame Pro</h2>
            </div>
          </div>

          {/* Monthly / Annual toggle with a sliding pill */}
          <div className="mt-7 flex items-center gap-3">
            <div className="relative inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1">
              {(["monthly", "yearly"] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setBilling(b)}
                  className={`relative z-10 rounded-full px-4 py-1.5 text-[12.5px] font-semibold transition-colors ${billing === b ? "text-zinc-900" : "text-zinc-400 hover:text-white"}`}
                >
                  {billing === b && (
                    <motion.span
                      layoutId="bill-pill"
                      className="absolute inset-0 -z-10 rounded-full bg-white"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  {b === "monthly" ? "Monthly" : "Annual"}
                </button>
              ))}
            </div>
            <AnimatePresence>
              {isYearly && (
                <motion.span
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 26 }}
                  className="rounded-full bg-[#e9ddff] px-2.5 py-1 text-[10.5px] font-bold text-[#6d28d9]"
                >
                  SAVE {savings}%
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* animated price */}
          <div className="mt-6 flex h-[58px] items-end overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={billing}
                initial={{ y: 22, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -22, opacity: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className="flex items-end gap-1.5"
              >
                <span className="text-[46px] font-semibold leading-none tracking-[-0.03em]">{perMonth}</span>
                <span className="pb-1.5 text-[15px] font-medium text-zinc-500">/ month</span>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="mt-2 h-5">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={subline}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="text-[12.5px] text-zinc-500"
              >
                {subline}
              </motion.p>
            </AnimatePresence>
          </div>

          <ul className="mt-7 grid gap-3 sm:grid-cols-2">
            <li className="flex items-start gap-2.5 text-[13.5px] font-medium text-white sm:col-span-2">
              <Check size={15} className="mt-0.5 shrink-0 text-cyan-300" /> Everything in Free, plus
            </li>
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-[13.5px] text-zinc-300">
                <Check size={15} className="mt-0.5 shrink-0 text-cyan-300" /> {f}
              </li>
            ))}
          </ul>

          <Link
            href={`/editor?upgrade=1&plan=${billing}`}
            className="fk-press mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-[13.5px] font-semibold text-zinc-900 hover:bg-zinc-200"
          >
            Get Pro {isYearly ? "Annual" : "Monthly"} <ArrowRight size={15} />
          </Link>

          <p className="mt-4 text-center text-[11px] text-zinc-600">
            Prices in USD · local taxes calculated at checkout · secured by Dodo Payments
          </p>
        </div>
      </div>
    </div>
  );
}
```

### `apps/web/components/templates/StoreSetsSection.tsx`

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { STORE_PLATFORMS, STORE_SETS, type StorePlatform } from "@/lib/storeSets";

/**
 * Templates gallery: the store listing sets, each shown as the row of eight
 * screenshots a store page would show. Clicking a screenshot opens the set in
 * the editor on that shot.
 */
export function StoreSetsSection() {
  const [platform, setPlatform] = useState<StorePlatform>("ios");
  const spec = STORE_PLATFORMS[platform];
  const thumbW = platform === "ios" ? 112 : 136;
  const thumbH = Math.round((thumbW * spec.height) / spec.width);

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
        {STORE_SETS.map((set) => {
          const href = `/templates/sets/${set.slug}?device=${platform}`;
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
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/store-sets/previews/${set.slug}-${platform}-${i + 1}.webp`}
                          alt={`${set.name} screenshot ${i + 1}: ${shot.name}`}
                          width={thumbW}
                          height={thumbH}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
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
```

### `apps/web/components/AccountButton.tsx`

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AuthModal } from "./AuthModal";

/**
 * Header account control: "Sign in" for guests, avatar + menu (email, sign out)
 * for a real account. Hidden entirely when Firebase auth isn't configured.
 */
export function AccountButton() {
  const { configured, loading, account, signOut } = useAuth();
  const [modal, setModal] = useState(false);
  const [menu, setMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenu(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [menu]);

  if (!configured || loading) return null;

  if (!account) {
    return (
      <>
        <button
          onClick={() => setModal(true)}
          className="fk-press ml-0.5 rounded-lg bg-[#17171c] px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-black"
        >
          Sign in
        </button>
        {modal && <AuthModal onClose={() => setModal(false)} />}
      </>
    );
  }

  const label = account.name || account.email || "Account";
  const initial = (account.name || account.email || "?").trim().charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative ml-0.5">
      <button
        onClick={() => setMenu((v) => !v)}
        title={label}
        className="fk-press grid h-7 w-7 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 text-[12px] font-bold text-white"
      >
        {account.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={account.photo} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          initial
        )}
      </button>
      {menu && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-[70] w-56 overflow-hidden rounded-xl border border-[#ececf2] bg-white py-1 shadow-xl">
          <div className="flex items-center gap-2.5 px-3 py-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f0f0f5] text-[#8a8a94]">
              <UserIcon size={15} />
            </span>
            <div className="min-w-0">
              {account.name && <p className="truncate text-[12.5px] font-semibold text-[#17171c]">{account.name}</p>}
              <p className="truncate text-[11.5px] text-[#8a8a94]">{account.email}</p>
            </div>
          </div>
          <div className="my-1 h-px bg-[#f0f0f3]" />
          <button
            onClick={async () => {
              setMenu(false);
              await signOut();
            }}
            className="fk-press flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] font-medium text-[#4a4a55] hover:bg-black/[0.04]"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
```
