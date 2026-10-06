/**
 * Pro plan catalog — single source of truth for both the checkout API routes
 * and the upgrade UI. Amounts are in US cents.
 *
 * Billing runs on Dodo Payments as merchant of record: every plan is a USD
 * subscription product in the Dodo dashboard (ids in DODO_PRODUCT_PRO_MONTHLY /
 * DODO_PRODUCT_PRO_YEARLY). Dodo's hosted checkout handles local currency
 * display, payment methods and sales tax/VAT, so there is no per-region price
 * logic here. The amounts below are what the UI DISPLAYS; the amount actually
 * charged is whatever the Dodo product is set to, so keep the two in sync.
 */

// Only recurring plans are sold. Lifetime was removed deliberately: at any
// sane price it either cannibalises MRR (cheap) or scares off buyers (fair),
// and the category's strongest players (Pika) refuse it outright. Legacy
// one-time purchases already made are still honoured server-side — see
// isBillingActive in lib/server/billing.ts.
export type PlanId = "monthly" | "yearly";

export interface PlanDef {
  label: string;
  /** billing interval of the matching Dodo subscription product */
  period: "monthly" | "yearly";
  /** price in US cents */
  price: number;
  blurb: string;
}

/**
 * Pricing rationale (so the next edit doesn't re-break it):
 *
 * · USD tracks the category, which sits at $13–15/mo (Pika $13, Mockuuups $15,
 *   PostSpark ~€10). $9.99 stays deliberately under that floor while no longer
 *   pricing us as the cheap option we aren't.
 * · Annual stays exactly half the monthly run-rate, which is the framing the
 *   pricing page renders ("SAVE 50%"): $9.99×12=119.88 → 59.99. Changing
 *   monthly without changing annual breaks that badge.
 *
 * Editing a price: change the Dodo product's price (or create a new product
 * and point the env var at it) AND this table. Checkout re-checks the client's
 * displayed price and 409s a stale tab rather than charging it the wrong
 * amount.
 */
export const PLANS: Record<PlanId, PlanDef> = {
  monthly: {
    label: "Monthly",
    period: "monthly",
    price: 999,
    blurb: "Cancel anytime",
  },
  yearly: {
    label: "Annual",
    period: "yearly",
    // exactly half the monthly run-rate: $9.99×12=119.88 → 59.99
    price: 5999,
    blurb: "Half the monthly price",
  },
};

function usd(cents: number): string {
  const major = cents / 100;
  const digits = Number.isInteger(major) ? 0 : 2; // $5.99 keeps its cents, $5 stays clean
  return `$${major.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

/** per-month equivalent for annual framing (PostSpark-style "$5.00 / month") */
export function perMonthPrice(plan: PlanId, plans: Record<PlanId, PlanDef> = PLANS): string | null {
  if (plans[plan].period !== "yearly") return null;
  return `$${(plans[plan].price / 12 / 100).toFixed(2)}`;
}

/** discount vs paying monthly for the same period, e.g. 50 for -50% */
export function yearlySavingsPct(plans: Record<PlanId, PlanDef> = PLANS): number {
  const monthlyRun = plans.monthly.price * 12;
  return Math.round((1 - plans.yearly.price / monthlyRun) * 100);
}

export function isPlanId(v: unknown): v is PlanId {
  return v === "monthly" || v === "yearly";
}

export function formatPrice(plan: PlanId, plans: Record<PlanId, PlanDef> = PLANS): string {
  return usd(plans[plan].price);
}
