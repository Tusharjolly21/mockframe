"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Check, LogIn, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AuthModal } from "@/components/AuthModal";
import { useViewStore } from "@/lib/store";
import { CheckoutCancelled, defaultCurrency, purchasePlan } from "@/lib/billing/client";
import { formatPrice, PLANS, type Currency, type PlanId } from "@/lib/billing/plans";
import { toast } from "./Toolbar";

const PLAN_ORDER: PlanId[] = ["monthly", "yearly", "lifetime"];
const PERIOD_SUFFIX: Record<PlanId, string> = { monthly: "/mo", yearly: "/yr", lifetime: "" };

/** Pro upgrade — pick a plan, pay via Razorpay Checkout (UPI/cards for India,
    international cards in USD), entitlement lands in Firestore via verify. */
export function UpgradeModal({ onClose }: { onClose: () => void }) {
  const { account } = useAuth();
  const setRemoveWatermark = useViewStore((s) => s.setRemoveWatermark);
  const [plan, setPlan] = useState<PlanId>("yearly");
  const [currency, setCurrency] = useState<Currency>(() => defaultCurrency());
  const [busy, setBusy] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const pay = async () => {
    setBusy(true);
    try {
      await purchasePlan(plan, currency);
      setRemoveWatermark(true);
      toast("You're Pro — exports are now watermark-free ✨");
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
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="w-[min(400px,94vw)] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-[#ececf2] px-4 py-3">
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-[#17171c]">
            <Sparkles size={14} className="text-[#7c3aed]" /> Upgrade to Pro
          </h3>
          <p className="mt-0.5 text-[11px] text-[#9a9aa4]">
            Watermark-free exports on every path — single, copy, and bulk.
          </p>
        </div>

        <div className="p-3">
          {/* currency — INR gets UPI/netbanking, USD is for international cards */}
          <div className="mb-2 flex justify-end">
            <div className="flex overflow-hidden rounded-lg border border-[#e4e4ec] text-[11px] font-semibold">
              {(["INR", "USD"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-2.5 py-1 ${currency === c ? "bg-[#17171c] text-white" : "bg-white text-[#5a5a66]"}`}
                >
                  {c === "INR" ? "₹ INR" : "$ USD"}
                </button>
              ))}
            </div>
          </div>

          {PLAN_ORDER.map((id) => {
            const def = PLANS[id];
            const on = plan === id;
            return (
              <button
                key={id}
                onClick={() => setPlan(id)}
                className={`fk-press mb-1.5 flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left ${
                  on ? "border-[#17171c] bg-[#f4f4f8]" : "border-[#e8e8ef] bg-white hover:border-[#c9c9d4]"
                }`}
              >
                <span>
                  <span className="flex items-center gap-1.5 text-[13px] font-bold text-[#17171c]">
                    {def.label}
                    {id === "yearly" && (
                      <span className="rounded-full bg-[#7c3aed] px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                        Popular
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] text-[#9a9aa4]">{def.blurb}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-[13px] font-bold tabular-nums text-[#17171c]">
                    {formatPrice(id, currency)}
                    <span className="text-[10.5px] font-medium text-[#9a9aa4]">{PERIOD_SUFFIX[id]}</span>
                  </span>
                  <span
                    className={`grid h-4 w-4 place-items-center rounded-full border ${
                      on ? "border-[#17171c] bg-[#17171c] text-white" : "border-[#d4d4de]"
                    }`}
                  >
                    {on && <Check size={10} strokeWidth={3} />}
                  </span>
                </span>
              </button>
            );
          })}

          {!account && (
            <p className="mt-1 rounded-lg bg-[#fdf7de] px-2.5 py-1.5 text-[10.5px] font-medium text-[#8a6d12]">
              Payments need an account — sign in so your Pro purchase is recoverable on any device.
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-[#ececf2] px-4 py-3">
          <span className="text-[10.5px] text-[#9a9aa4]">
            {currency === "INR" ? "UPI · cards · netbanking" : "International cards"}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={busy}
              className="fk-press rounded-xl border border-[#e4e4ec] bg-white px-3.5 py-2 text-[12.5px] font-semibold text-[#17171c] disabled:opacity-50"
            >
              Not now
            </button>
            {account ? (
              <button
                onClick={pay}
                disabled={busy}
                className="fk-press rounded-xl bg-[#17171c] px-3.5 py-2 text-[12.5px] font-semibold text-white hover:bg-black disabled:opacity-50"
              >
                {busy ? "Opening checkout…" : `Continue — ${formatPrice(plan, currency)}${PERIOD_SUFFIX[plan]}`}
              </button>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="fk-press flex items-center gap-1.5 rounded-xl bg-[#17171c] px-3.5 py-2 text-[12.5px] font-semibold text-white hover:bg-black"
              >
                <LogIn size={13} /> Sign in to continue
              </button>
            )}
          </div>
        </div>
      </div>
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  );

  return typeof document !== "undefined" ? createPortal(ui, document.body) : null;
}
