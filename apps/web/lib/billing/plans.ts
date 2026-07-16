/**
 * Pro plan catalog — single source of truth for both the checkout API routes
 * and the upgrade UI. Amounts are in the currency's minor unit (paise/cents).
 *
 * One Razorpay integration covers national + international: Indian customers
 * pay in INR (UPI/cards/netbanking), international customers pay by card in
 * USD (enable "International Payments" in the Razorpay dashboard — instant in
 * test mode). Settlement is always INR.
 */

// Only recurring plans are sold. Lifetime was removed deliberately: at any
// sane price it either cannibalises MRR (cheap) or scares off buyers (fair),
// and the category's strongest players (Pika) refuse it outright. Legacy
// one-time purchases already made are still honoured server-side — see
// isBillingActive in lib/server/razorpay.ts.
export type PlanId = "monthly" | "yearly";
export type Currency = "INR" | "USD";

export interface PlanDef {
  label: string;
  /** Razorpay subscription period */
  period: "monthly" | "yearly";
  /** number of billing cycles Razorpay should run the mandate for */
  totalCount: number;
  /** minor units: paise for INR, cents for USD */
  price: Record<Currency, number>;
  blurb: string;
}

/**
 * Pricing rationale (so the next edit doesn't re-break it):
 *
 * · USD tracks the category, which sits at $13–15/mo (Pika $13, Mockuuups $15,
 *   PostSpark ~€10). $9.99 stays deliberately under that floor while no longer
 *   pricing us as the cheap option we aren't.
 * · INR is held at ₹499/₹2,999 on purpose. It's not a converted USD price —
 *   it's the India price, and Razorpay already splits the currencies.
 * · Annual stays exactly half the monthly run-rate, which is the framing the
 *   pricing page renders ("SAVE 50%"): $9.99×12=119.88 → 59.99 · ₹499×12=5,988
 *   → 2,999. Changing monthly without changing annual breaks that badge.
 *
 * Editing a price is safe: ensureRazorpayPlanId keys its cache on the amount,
 * so a change mints a NEW Razorpay plan and existing subscribers keep the plan
 * (and price) they signed up on. Checkout re-checks the client's displayed
 * price and 409s a stale tab rather than charging it the wrong amount.
 */
export const PLANS: Record<PlanId, PlanDef> = {
  monthly: {
    label: "Monthly",
    period: "monthly",
    totalCount: 120, // 10 years of cycles — effectively "until cancelled"
    price: { INR: 49900, USD: 999 },
    blurb: "Cancel anytime",
  },
  yearly: {
    label: "Annual",
    period: "yearly",
    totalCount: 20,
    // exactly half the monthly run-rate: ₹499×12=5,988 → 2,999 · $9.99×12=119.88 → 59.99
    price: { INR: 299900, USD: 5999 },
    blurb: "Half the monthly price",
  },
};

/** per-month equivalent for annual framing (PostSpark-style "₹250 / month") */
export function perMonthPrice(plan: PlanId, currency: Currency, plans: Record<PlanId, PlanDef> = PLANS): string | null {
  if (plans[plan].period !== "yearly") return null;
  const monthly = plans[plan].price[currency] / 12 / 100;
  return currency === "INR" ? `₹${Math.round(monthly)}` : `$${monthly.toFixed(2)}`;
}

/** discount vs paying monthly for the same period, e.g. 50 for -50% */
export function yearlySavingsPct(currency: Currency, plans: Record<PlanId, PlanDef> = PLANS): number {
  const monthlyRun = plans.monthly.price[currency] * 12;
  return Math.round((1 - plans.yearly.price[currency] / monthlyRun) * 100);
}

export function isPlanId(v: unknown): v is PlanId {
  return v === "monthly" || v === "yearly";
}

export function isCurrency(v: unknown): v is Currency {
  return v === "INR" || v === "USD";
}

export function formatPrice(plan: PlanId, currency: Currency, plans: Record<PlanId, PlanDef> = PLANS): string {
  const major = plans[plan].price[currency] / 100;
  const digits = Number.isInteger(major) ? 0 : 2; // $5.99 keeps its cents, ₹499 stays clean
  return currency === "INR"
    ? `₹${major.toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
    : `$${major.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}
