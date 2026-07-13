/**
 * Pro plan catalog — single source of truth for both the checkout API routes
 * and the upgrade UI. Amounts are in the currency's minor unit (paise/cents).
 *
 * One Razorpay integration covers national + international: Indian customers
 * pay in INR (UPI/cards/netbanking), international customers pay by card in
 * USD (enable "International Payments" in the Razorpay dashboard — instant in
 * test mode). Settlement is always INR.
 */

export type PlanId = "monthly" | "yearly" | "lifetime";
export type Currency = "INR" | "USD";

export interface PlanDef {
  label: string;
  kind: "subscription" | "one_time";
  /** Razorpay subscription period (subscription plans only) */
  period?: "monthly" | "yearly";
  /** number of billing cycles Razorpay should run the mandate for */
  totalCount?: number;
  /** minor units: paise for INR, cents for USD */
  price: Record<Currency, number>;
  blurb: string;
}

export const PLANS: Record<PlanId, PlanDef> = {
  monthly: {
    label: "Monthly",
    kind: "subscription",
    period: "monthly",
    totalCount: 120, // 10 years of cycles — effectively "until cancelled"
    price: { INR: 49900, USD: 599 },
    blurb: "Cancel anytime",
  },
  yearly: {
    label: "Annual",
    kind: "subscription",
    period: "yearly",
    totalCount: 20,
    // exactly half the monthly run-rate: ₹499×12=5,988 → 2,999 · $5.99×12=71.88 → 35.99
    price: { INR: 299900, USD: 3599 },
    blurb: "Half the monthly price",
  },
  lifetime: {
    label: "Lifetime",
    kind: "one_time",
    price: { INR: 499900, USD: 5999 },
    blurb: "Pay once, Pro forever",
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
  return v === "monthly" || v === "yearly" || v === "lifetime";
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
