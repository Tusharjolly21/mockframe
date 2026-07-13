"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/lib/auth";
import { AuthModal } from "@/components/AuthModal";
import { useViewStore } from "@/lib/store";
import { CheckoutCancelled, defaultCurrency, purchasePlan } from "@/lib/billing/client";
import { formatPrice, perMonthPrice, PLANS, yearlySavingsPct, type Currency, type PlanDef, type PlanId } from "@/lib/billing/plans";
import { iconBody, ICON_VIEWBOX } from "@/lib/iconStickers";
import { toast } from "./Toolbar";

const PLAN_ORDER: PlanId[] = ["monthly", "yearly", "lifetime"];
const PERIOD_SUFFIX: Record<PlanId, string> = { monthly: "/mo", yearly: "/yr", lifetime: " once" };

const BENEFITS = [
  { icon: "export", title: "Clean exports", text: "Remove the MockFrame watermark from every PNG and bulk export." },
  { icon: "shield-check", title: "Your brand, your style", text: "Add a custom watermark and keep every deliverable consistent." },
  { icon: "magic-stick-3", title: "Photo-real mockups", text: "Unlock realistic device-photo rendering for polished presentations." },
  { icon: "bolt", title: "Higher resolution", text: "Export crisp HD, 4K and 6K assets whenever you need them." },
] as const;

function IconifyIcon({ name, size = 20, color = "#17171c", className = "" }: { name: string; size?: number; color?: string; className?: string }) {
  return (
    <svg viewBox={ICON_VIEWBOX} width={size} height={size} className={className} aria-hidden style={{ color }}>
      <g dangerouslySetInnerHTML={{ __html: iconBody(name, [color]) ?? "" }} />
    </svg>
  );
}

/** Pro upgrade — clean, spacious pricing surface backed by the existing Razorpay flow. */
export function UpgradeModal({ onClose }: { onClose: () => void }) {
  const { account } = useAuth();
  const setRemoveWatermark = useViewStore((s) => s.setRemoveWatermark);
  const [plan, setPlan] = useState<PlanId>("yearly");
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
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0c0d12]/70 p-4 backdrop-blur-md"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="relative max-h-[min(760px,calc(100vh-32px))] w-[min(860px,96vw)] overflow-y-auto rounded-[24px] border border-white/70 bg-[#f8f8fb] shadow-[0_32px_100px_rgba(0,0,0,0.38)]">
        <button onClick={onClose} title="Close" className="fk-press absolute right-5 top-5 z-10 grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/20">
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
                  <h2 className="text-[22px] font-bold tracking-[-0.03em]">Go Pro</h2>
                </div>
              </div>
              <h1 className="mt-12 max-w-[320px] text-[34px] font-bold leading-[1.05] tracking-[-0.05em]">Make every mockup look ready to ship.</h1>
              <p className="mt-4 max-w-[320px] text-[14px] leading-6 text-white/60">A calmer workflow for teams that need beautiful, consistent screenshots at speed.</p>
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

          <section className="px-5 py-7 md:px-8 md:py-9">
            <div className="flex items-start justify-between gap-4 pr-10">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7c3aed]">Choose your access</p>
                <h3 className="mt-1 text-[23px] font-bold tracking-[-0.04em] text-[#17171c]">Upgrade your workspace</h3>
              </div>
              <div className="flex rounded-xl border border-[#dedee8] bg-white p-1 text-[11px] font-bold">
                {(["INR", "USD"] as const).map((c) => (
                  <button key={c} onClick={() => setCurrency(c)} className={`rounded-lg px-2.5 py-1.5 ${currency === c ? "bg-[#17171c] text-white" : "text-[#858592] hover:text-[#17171c]"}`}>
                    {c === "INR" ? "₹" : "$"} {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-7 space-y-2.5">
              {PLAN_ORDER.map((id) => {
                const def = plans[id];
                const selected = plan === id;
                const perMo = perMonthPrice(id, currency, plans);
                return (
                  <button key={id} onClick={() => setPlan(id)} className={`fk-press relative flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left transition ${selected ? "border-[#7c3aed] bg-[#f4f0ff] shadow-[0_8px_24px_rgba(124,58,237,0.12)]" : "border-[#e6e6ed] bg-white hover:border-[#bdbdca]"}`}>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-[14px] font-bold text-[#17171c]">
                        {id === "lifetime" && <IconifyIcon name="infinity" size={15} color="#7c3aed" />}
                        {def.label}
                        {id === "yearly" && <span className="rounded-full bg-[#e9ddff] px-2 py-0.5 text-[9px] font-bold text-[#6d28d9]">SAVE {savings}%</span>}
                      </span>
                      <span className="mt-1 block text-[11px] text-[#898995]">{def.blurb}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="text-right">
                        {perMo ? <><strong className="block text-[16px] text-[#17171c]">{perMo}<small className="font-medium text-[#9999a4]">/mo</small></strong><small className="block text-[10px] text-[#9999a4]">{formatPrice(id, currency, plans)} billed yearly</small></> : <strong className="text-[16px] text-[#17171c]">{formatPrice(id, currency, plans)}<small className="font-medium text-[#9999a4]">{PERIOD_SUFFIX[id]}</small></strong>}
                      </span>
                      <span className={`grid h-5 w-5 place-items-center rounded-full border-2 ${selected ? "border-[#7c3aed] bg-[#7c3aed]" : "border-[#d5d5df]"}`}>
                        {selected && <IconifyIcon name="check-circle" size={17} color="#ffffff" />}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {!account && <p className="mt-4 rounded-xl border border-[#f0dfad] bg-[#fff9e8] px-3 py-2.5 text-[11px] leading-5 text-[#866c1c]">Sign in first so your Pro access follows you across devices.</p>}
            {account ? (
              <button onClick={pay} disabled={busy} className="fk-press mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#17171c] py-3.5 text-[13px] font-bold text-white shadow-[0_8px_20px_rgba(23,23,28,0.18)] hover:bg-[#2d2d36] disabled:opacity-50">
                <IconifyIcon name="lock-keyhole" size={16} color="#ffffff" />
                {busy ? "Opening secure checkout..." : `Continue with ${plan === "yearly" ? "Annual" : plans[plan].label}`}
              </button>
            ) : (
              <button onClick={() => setAuthOpen(true)} className="fk-press mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#17171c] py-3.5 text-[13px] font-bold text-white shadow-[0_8px_20px_rgba(23,23,28,0.18)] hover:bg-[#2d2d36]">
                <IconifyIcon name="login-2" size={16} color="#ffffff" /> Sign in to continue
              </button>
            )}
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[10px] text-[#9a9aa4]">
              <IconifyIcon name="card" size={13} color="#9a9aa4" /> {currency === "INR" ? "UPI, cards and netbanking via Razorpay" : "International cards via Razorpay"}
            </p>
          </section>
        </div>
      </div>
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  );

  return typeof document !== "undefined" ? createPortal(ui, document.body) : null;
}
