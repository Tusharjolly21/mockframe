"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { useAuth } from "@/lib/auth";
import { AuthModal } from "@/components/AuthModal";
import { useViewStore } from "@/lib/store";
import { CheckoutCancelled, defaultCurrency, purchasePlan } from "@/lib/billing/client";
import { formatPrice, perMonthPrice, PLANS, yearlySavingsPct, type Currency, type PlanDef, type PlanId } from "@/lib/billing/plans";
import { iconBody, ICON_VIEWBOX } from "@/lib/iconStickers";
import { toast } from "./Toolbar";

// Two rules here:
//  1. Never sell "remove the watermark" — exports are clean on every tier.
//  2. Never list a benefit that doesn't work yet. This modal is the last thing
//     someone reads before paying, so every line must be redeemable the moment
//     the payment clears. Photoreal rendering is deliberately absent until
//     RealisticRenderPanel has a UI entry point (Toolbar.tsx currently opens a
//     "coming soon" dialog instead).
const BENEFITS = [
  { icon: "chat-round-dots", title: "Every chat & DM screen", text: "Telegram, Instagram, Slack, Discord and 8 more, beyond the free WhatsApp & iMessage." },
  { icon: "videocamera-record", title: "Video & GIF export", text: "Turn chat replays and animations into shareable videos." },
  { icon: "bolt", title: "4K & 6K + full-page capture", text: "Ultra-crisp exports and entire scrolling websites in one shot." },
  { icon: "magic-stick-3", title: "Your brand, your templates", text: "Stamp your own watermark and save whole compositions to your account." },
] as const;

function IconifyIcon({ name, size = 20, color = "#17171c", className = "" }: { name: string; size?: number; color?: string; className?: string }) {
  return (
    <svg viewBox={ICON_VIEWBOX} width={size} height={size} className={className} aria-hidden style={{ color }}>
      <g dangerouslySetInnerHTML={{ __html: iconBody(name, [color]) ?? "" }} />
    </svg>
  );
}

/** Pro upgrade — clean, spacious pricing surface backed by the existing Razorpay flow. */
export function UpgradeModal({
  initialPlan = "yearly",
  reason,
  onClose,
}: {
  /** what the user was reaching for, e.g. "Telegram screens" — named back to
   *  them so the modal answers "why am I seeing this?" at the exact moment
   *  they've already done the work and want the file */
  reason?: string;
  initialPlan?: PlanId;
  onClose: () => void;
}) {
  const { account } = useAuth();
  const setRemoveWatermark = useViewStore((s) => s.setRemoveWatermark);
  const [plan, setPlan] = useState<PlanId>(initialPlan);
  const [currency, setCurrency] = useState<Currency>(() => defaultCurrency());
  const [busy, setBusy] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [plans, setPlans] = useState<Record<PlanId, PlanDef>>(PLANS);

  useEffect(() => {
    fetch("/api/billing/plans")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j?.plans && setPlans(j.plans))
      .catch(() => {});
  }, []);

  const savings = yearlySavingsPct(currency, plans);
  const pay = async () => {
    setBusy(true);
    try {
      await purchasePlan(plan, currency, plans[plan].price[currency]);
      setRemoveWatermark(true);
      toast("You're Pro - welcome aboard");
      onClose();
    } catch (err) {
      if (!(err instanceof CheckoutCancelled)) toast(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  };

  const ui = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#09090b]/80 p-4 backdrop-blur-md"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="relative max-h-[min(760px,calc(100vh-32px))] w-[min(860px,96vw)] overflow-y-auto rounded-[24px] border border-white/[0.08] bg-[#0f1014] shadow-[0_32px_100px_rgba(0,0,0,0.6)]"
      >
        <button onClick={onClose} title="Close" className="fk-press absolute right-5 top-5 z-10 grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-white hover:bg-white/10">
          <IconifyIcon name="close-circle" size={20} color="#ffffff" />
        </button>

        <div className="grid md:grid-cols-[0.9fr_1.1fr]">
          <section className="relative overflow-hidden bg-[#11131b] px-7 pb-8 pt-8 text-white md:px-9 md:pt-10">
            <div className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-[#5b21b6]/25 blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#ffffff] text-[#11131b]">
                  <IconifyIcon name="crown" size={23} color="#7c3aed" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a5b4fc]">MockFrame</p>
              <h2 className="text-[22px] font-medium tracking-[-0.03em]">Go Pro</h2>
                </div>
              </div>
              <h1 className="mt-12 max-w-[320px] text-[34px] font-medium leading-[1.05] tracking-[-0.04em]">
                {reason ? `${reason} are part of Pro.` : "Make every mockup look ready to ship."}
              </h1>
              <p className="mt-4 max-w-[320px] text-[14px] leading-6 text-zinc-400">
                {reason
                  ? "Your scene is saved exactly as you left it — upgrade and the export picks up right where you were."
                  : "A calmer workflow for teams that need beautiful, consistent screenshots at speed."}
              </p>
              <div className="mt-9 space-y-4">
                {BENEFITS.map((benefit) => (
                  <div key={benefit.title} className="flex gap-3">
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/10">
                      <IconifyIcon name={benefit.icon} size={17} color="#c4b5fd" />
                    </span>
                    <div>
                      <p className="text-[13px] font-semibold text-white">{benefit.title}</p>
                      <p className="mt-0.5 text-[11px] leading-5 text-white/50">{benefit.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-[#0f1014] px-5 py-7 text-white md:px-8 md:py-9">
            <div className="flex items-start justify-between gap-4 pr-10">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-violet-400">Choose your access</p>
                <h3 className="mt-1 text-[23px] font-medium tracking-[-0.035em] text-white">Upgrade your workspace</h3>
              </div>
              <div className="flex rounded-lg border border-white/10 bg-white/[0.04] p-1 text-[11px] font-semibold">
                {(["INR", "USD"] as const).map((c) => (
                  <button key={c} onClick={() => setCurrency(c)} className={`rounded-md px-2.5 py-1.5 ${currency === c ? "bg-white text-zinc-900" : "text-zinc-500 hover:text-white"}`}>
                    {c === "INR" ? "₹" : "$"} {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Monthly / Annual toggle with a sliding pill — matches the pricing page */}
            <div className="mt-7 flex items-center gap-3">
              <div className="relative inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1">
                {(["monthly", "yearly"] as const).map((b) => (
                  <button
                    key={b}
                    onClick={() => setPlan(b)}
                    className={`relative z-10 rounded-full px-4 py-1.5 text-[12px] font-semibold transition-colors ${plan === b ? "text-zinc-900" : "text-zinc-400 hover:text-white"}`}
                  >
                    {plan === b && (
                      <motion.span layoutId="up-bill-pill" className="absolute inset-0 -z-10 rounded-full bg-white" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
                    )}
                    {b === "monthly" ? "Monthly" : "Annual"}
                  </button>
                ))}
              </div>
              <AnimatePresence>
                {plan === "yearly" && (
                  <motion.span
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 26 }}
                    className="rounded-full bg-[#e9ddff] px-2.5 py-1 text-[10px] font-bold text-[#6d28d9]"
                  >
                    SAVE {savings}%
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* animated price */}
            <div className="mt-5 flex h-[50px] items-end overflow-hidden">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={plan + currency}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  className="flex items-end gap-1.5"
                >
                  <span className="text-[40px] font-semibold leading-none tracking-[-0.03em] text-white">
                    {plan === "yearly"
                      ? perMonthPrice("yearly", currency, plans)
                      : formatPrice("monthly", currency, plans)}
                  </span>
                  <span className="pb-1 text-[13px] font-medium text-zinc-500">/ month</span>
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="mt-1.5 h-4">
              <AnimatePresence mode="wait" initial={false}>
                <motion.p key={plan} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="text-[11px] text-zinc-500">
                  {plan === "yearly"
                    ? `${formatPrice("yearly", currency, plans)} billed yearly`
                    : "billed monthly · cancel anytime"}
                </motion.p>
              </AnimatePresence>
            </div>

            {!account && <p className="mt-6 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] px-3 py-2.5 text-[11px] leading-5 text-amber-200/80">Sign in first so your Pro access follows you across devices.</p>}
            {account ? (
              <button onClick={pay} disabled={busy} className="fk-press mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-white py-3.5 text-[13px] font-semibold text-zinc-900 shadow-[0_8px_20px_rgba(0,0,0,0.18)] hover:bg-zinc-200 disabled:opacity-50">
                <IconifyIcon name="lock-keyhole" size={16} color="#ffffff" />
                {busy ? "Opening secure checkout..." : `Continue with ${plan === "yearly" ? "Annual" : plans[plan].label}`}
              </button>
            ) : (
              <button onClick={() => setAuthOpen(true)} className="fk-press mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-white py-3.5 text-[13px] font-semibold text-zinc-900 shadow-[0_8px_20px_rgba(0,0,0,0.18)] hover:bg-zinc-200">
                <IconifyIcon name="login-2" size={16} color="#ffffff" /> Sign in to continue
              </button>
            )}
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[10px] text-[#9a9aa4]">
              <IconifyIcon name="card" size={13} color="#71717a" /> {currency === "INR" ? "UPI, cards and netbanking via Razorpay" : "International cards via Razorpay"}
            </p>
          </section>
        </div>
      </motion.div>
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </motion.div>
  );

  return typeof document !== "undefined" ? createPortal(ui, document.body) : null;
}
