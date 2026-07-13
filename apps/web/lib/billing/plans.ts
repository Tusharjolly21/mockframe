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
    price: { INR: 39900, USD: 600 },
    blurb: "Watermark-free exports, cancel anytime",
  },
  yearly: {
    label: "Yearly",
    kind: "subscription",
    period: "yearly",
    totalCount: 20,
    price: { INR: 299900, USD: 4900 },
    blurb: "2 months free vs monthly",
  },
  lifetime: {
    label: "Lifetime",
    kind: "one_time",
    price: { INR: 699900, USD: 11900 },
    blurb: "Pay once, Pro forever",
  },
};

export function isPlanId(v: unknown): v is PlanId {
  return v === "monthly" || v === "yearly" || v === "lifetime";
}

export function isCurrency(v: unknown): v is Currency {
  return v === "INR" || v === "USD";
}

export function formatPrice(plan: PlanId, currency: Currency): string {
  const minor = PLANS[plan].price[currency];
  const major = minor / 100;
  return currency === "INR"
    ? `₹${major.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
    : `$${major.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}
