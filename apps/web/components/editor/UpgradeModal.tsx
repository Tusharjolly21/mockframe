"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Check, Globe, Infinity as InfinityIcon, LogIn, Sparkles, Stamp, Wand2, Zap } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AuthModal } from "@/components/AuthModal";
import { useViewStore } from "@/lib/store";
import { CheckoutCancelled, defaultCurrency, purchasePlan } from "@/lib/billing/client";
import { formatPrice, perMonthPrice, PLANS, yearlySavingsPct, type Currency, type PlanId } from "@/lib/billing/plans";
import { toast } from "./Toolbar";

const PLAN_ORDER: PlanId[] = ["monthly", "yearly", "lifetime"];
const PERIOD_SUFFIX: Record<PlanId, string> = { monthly: "/mo", yearly: "/yr", lifetime: " once" };

const BENEFITS = [
  { icon: Sparkles, text: "Watermark-free exports — single, copy, share & bulk" },
  { icon: Stamp, text: "Custom brand watermark — your logo on every export" },
  { icon: Wand2, text: "Realistic device-photo renders" },
  { icon: Zap, text: "HD · 4K · 6K exports" },
];

/** Pro upgrade — pick a plan, pay via Razorpay Checkout (UPI/cards for India,
    international cards in USD), entitlement lands in Firestore via verify. */
export function UpgradeModal({ onClose }: { onClose: () => void }) {
  const { account } = useAuth();
  const setRemoveWatermark = useViewStore((s) => s.setRemoveWatermark);
  const [plan, setPlan] = useState<PlanId>("yearly");
  const [currency, setCurrency] = useState<Currency>(() => defaultCurrency());
  const [busy, setBusy] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const savings = yearlySavingsPct(currency);

  const pay = async () => {
    setBusy(true);
    try {
      await purchasePlan(plan, currency);
      setRemoveWatermark(true);
      toast("You're Pro — welcome aboard ✨");
      onClose();
    } catch (err) {
      if (!(err instanceof CheckoutCancelled)) {
        toast(err instanceof Error ? err.message : "Payment failed");
      }
    } finally {
      setBusy(false);
    }
  };

  // portal to body — rendered inline, a transformed editor ancestor would trap
  // the fixed overlay in its stacking context and canvas chrome (the ⊕ add-media
  // button) paints on top of the modal
  const ui = (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="w-[min(440px,94vw)] overflow-hidden rounded-3xl bg-white shadow-[0_32px_90px_rgba(10,10,25,0.45)]">
        {/* hero header */}
        <div className="relative overflow-hidden bg-[#0f1017] px-5 pb-5 pt-6 text-white">
          <div
            className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full opacity-60 blur-3xl"
            style={{ background: "radial-gradient(circle, #7c3aed 0%, transparent 70%)" }}
          />
          <div
            className="pointer-events-none absolute -bottom-24 -left-10 h-48 w-48 rounded-full opacity-40 blur-3xl"
            style={{ background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)" }}
          />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-lg">
                  <Sparkles size={16} />
                </span>
                <span className="text-[17px] font-extrabold tracking-tight">MockFrame Pro</span>
              </span>
              {/* currency — INR gets UPI/netbanking, USD is international cards */}
              <div className="flex overflow-hidden rounded-lg border border-white/15 text-[11px] font-semibold">
                {(["INR", "USD"] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={`px-2.5 py-1 ${currency === c ? "bg-white text-[#17171c]" : "text-white/70 hover:text-white"}`}
                  >
                    {c === "INR" ? "₹" : "$"} {c}
                  </button>
                ))}
              </div>
            </div>
            <ul className="mt-4 space-y-1.5">
              {BENEFITS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2 text-[12px] text-white/85">
                  <Icon size={12} className="shrink-0 text-cyan-300" /> {text}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="p-4">
          {PLAN_ORDER.map((id) => {
            const def = PLANS[id];
            const on = plan === id;
            const perMo = perMonthPrice(id, currency);
            return (
              <button
                key={id}
                onClick={() => setPlan(id)}
                className={`fk-press relative mb-2 flex w-full items-center justify-between rounded-2xl border-2 px-4 py-3 text-left transition-shadow ${
                  on
                    ? "border-[#7c3aed] bg-gradient-to-r from-violet-50 to-cyan-50 shadow-[0_4px_20px_rgba(124,58,237,0.15)]"
                    : "border-[#ececf2] bg-white hover:border-[#c9c9d4]"
                }`}
              >
                <span>
                  <span className="flex items-center gap-1.5 text-[14px] font-bold text-[#17171c]">
                    {id === "lifetime" && <InfinityIcon size={13} className="text-[#7c3aed]" />}
                    {def.label}
                    {id === "yearly" && (
                      <span className="rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wide text-white shadow-sm">
                        −{savings}%
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] text-[#8a8a94]">{def.blurb}</span>
                </span>
                <span className="flex items-center gap-2.5">
                  <span className="text-right">
                    {perMo ? (
                      <>
                        <span className="block text-[15px] font-extrabold tabular-nums leading-tight text-[#17171c]">
                          {perMo}
                          <span className="text-[10.5px] font-medium text-[#9a9aa4]">/mo</span>
                        </span>
                        <span className="block text-[10px] tabular-nums text-[#9a9aa4]">
                          {formatPrice(id, currency)} billed yearly
                        </span>
                      </>
                    ) : (
                      <span className="text-[15px] font-extrabold tabular-nums text-[#17171c]">
                        {formatPrice(id, currency)}
                        <span className="text-[10.5px] font-medium text-[#9a9aa4]">{PERIOD_SUFFIX[id]}</span>
                      </span>
                    )}
                  </span>
                  <span
                    className={`grid h-5 w-5 place-items-center rounded-full border-2 ${
                      on ? "border-[#7c3aed] bg-[#7c3aed] text-white" : "border-[#d4d4de]"
                    }`}
                  >
                    {on && <Check size={11} strokeWidth={3.5} />}
                  </span>
                </span>
              </button>
            );
          })}

          {!account && (
            <p className="mt-1 rounded-xl bg-[#fdf7de] px-3 py-2 text-[10.5px] font-medium text-[#8a6d12]">
              Payments need an account — sign in so Pro follows you on any device.
            </p>
          )}

          {account ? (
            <button
              onClick={pay}
              disabled={busy}
              className="fk-press mt-2 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 py-3 text-[14px] font-bold text-white shadow-[0_8px_24px_rgba(124,58,237,0.35)] hover:opacity-95 disabled:opacity-50"
            >
              {busy
                ? "Opening secure checkout…"
                : `Go Pro — ${perMonthPrice(plan, currency) ? `${perMonthPrice(plan, currency)}/mo` : formatPrice(plan, currency) + PERIOD_SUFFIX[plan]}`}
            </button>
          ) : (
            <button
              onClick={() => setAuthOpen(true)}
              className="fk-press mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 py-3 text-[14px] font-bold text-white shadow-[0_8px_24px_rgba(124,58,237,0.35)] hover:opacity-95"
            >
              <LogIn size={14} /> Sign in to continue
            </button>
          )}

          <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-[10.5px] text-[#9a9aa4]">
            <Globe size={10} />
            {currency === "INR" ? "UPI · cards · netbanking — secured by Razorpay" : "International cards — secured by Razorpay"}
          </p>
        </div>
      </div>
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  );

  return typeof document !== "undefined" ? createPortal(ui, document.body) : null;
}
