"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, Infinity as InfinityIcon } from "lucide-react";
import { SolarIcon } from "./SolarIcon";
import { formatPrice, perMonthPrice, yearlySavingsPct, type Currency } from "@/lib/billing/plans";

const FREE_FEATURES = [
  "Every device frame + the full editor",
  "Website capture & generated app screens",
  "Templates: tweet, code & post cards",
  "Themes, icons, glare & annotations",
  "Drafts, bulk export & 1–3× output",
];

const PRO_FEATURES = [
  "Watermark-free exports",
  "Custom-brand watermark",
  "Photoreal device renders",
  "Video & GIF export",
  "4K & 6K output",
  "Full-page website capture",
  "Saved templates in your account",
  "Cloud-synced custom devices",
];

type Billing = "monthly" | "yearly";

export function PricingPlans() {
  const [billing, setBilling] = useState<Billing>("yearly");
  const [currency, setCurrency] = useState<Currency>("INR");
  const isYearly = billing === "yearly";
  const savings = yearlySavingsPct(currency);
  // annual is framed as its per-month equivalent; monthly is the raw price
  const perMonth = isYearly ? perMonthPrice("yearly", currency)! : formatPrice("monthly", currency);
  const subline = isYearly
    ? `${formatPrice("yearly", currency)} billed yearly`
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
          {currency === "INR" ? "₹0" : "$0"}
        </p>
        <p className="mt-2 text-[13px] text-zinc-500">No account required to begin</p>
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
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-violet-600">
                <SolarIcon name="crown-star-bold-duotone" size={21} />
              </span>
              <div>
                <p className="text-[12px] text-violet-300">For polished, production work</p>
                <h2 className="text-[21px] font-semibold">MockFrame Pro</h2>
              </div>
            </div>
            {/* currency */}
            <div className="flex rounded-lg border border-white/10 bg-white/[0.04] p-0.5 text-[11px] font-semibold">
              {(["INR", "USD"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`rounded-md px-2 py-1 transition-colors ${currency === c ? "bg-white text-zinc-900" : "text-zinc-500 hover:text-white"}`}
                >
                  {c === "INR" ? "₹" : "$"}
                </button>
              ))}
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
                key={billing + currency}
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

          {/* Lifetime accent — the option no competitor offers */}
          <Link
            href="/editor?upgrade=1&plan=lifetime"
            className="fk-press group mt-3 flex items-center justify-between gap-3 rounded-xl border border-violet-400/30 bg-violet-400/[0.06] px-4 py-3 hover:border-violet-400/60"
          >
            <span className="flex items-center gap-2.5 text-[12.5px] font-semibold text-violet-200">
              <InfinityIcon size={16} className="text-violet-300" /> Prefer to pay once? Lifetime Pro
            </span>
            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-white">
              {formatPrice("lifetime", currency)}
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>

          <p className="mt-3 text-center text-[11px] text-zinc-600">
            {currency === "INR" ? "UPI, cards & netbanking" : "International cards"} · secured by Razorpay
          </p>
        </div>
      </div>
    </div>
  );
}
