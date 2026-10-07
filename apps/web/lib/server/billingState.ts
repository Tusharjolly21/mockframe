import type { PlanId } from "../billing/plans";

/**
 * Pure entitlement model (no Firestore / network) so it can be unit-tested.
 * Stored at users/{uid}.billing by lib/server/billing.ts.
 */

/** Dodo subscription statuses we persist, plus "halted" from legacy records. */
export type BillingStatus =
  | "active"
  | "past_due"
  | "on_hold"
  | "paused"
  | "cancelled"
  | "expired"
  | "failed"
  | "halted";

export interface BillingState {
  plan: PlanId;
  status: BillingStatus;
  kind: "subscription" | "one_time";
  /** absent on records written before the Dodo Payments migration */
  provider?: "dodo";
  subscriptionId?: string;
  paymentId?: string;
  customerId?: string;
  /** unix seconds the paid period ends (Dodo `next_billing_date`) */
  paidThrough?: number;
  /** the customer cancelled; access continues until paidThrough */
  cancelAtPeriodEnd?: boolean;
  via: "checkout" | "webhook";
  /** event time (unix seconds, may be fractional) — lets the webhook drop
   *  stale / out-of-order deliveries so a cancelled sub can't be re-activated */
  eventAt?: number;
}

/** Renewal webhooks can land a little after the billing date; don't yank Pro
 *  from a paying customer during that window. */
export const RENEWAL_GRACE_SECONDS = 3 * 24 * 60 * 60;

export function isBillingActive(b: BillingState | null | undefined, nowSec: number = Date.now() / 1000): boolean {
  if (!b) return false;
  // Legacy lifetime purchases (no longer sold) were recorded as one-time and
  // never lapse — keyed on `kind` so we honour them without referencing the
  // removed "lifetime" plan id.
  if (b.kind === "one_time") return true;
  switch (b.status) {
    case "active":
    case "past_due": // Dodo's dunning grace period: the customer keeps access
      // legacy records carry no paidThrough — they were active until a lapse event
      return b.paidThrough == null || nowSec < b.paidThrough + RENEWAL_GRACE_SECONDS;
    case "cancelled":
      // already paid for the current period — honour it until it ends
      return b.paidThrough != null && nowSec < b.paidThrough;
    default:
      return false;
  }
}
