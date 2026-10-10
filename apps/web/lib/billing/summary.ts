import type { BillingState } from "../server/billingState";

/**
 * What /account shows about a plan. The server sends the raw billing fields
 * (GET /api/billing/status); this turns them into words. Pure.
 */

export interface PlanFacts {
  active: boolean;
  plan: "monthly" | "yearly" | "lifetime" | null;
  kind: BillingState["kind"] | null;
  status: BillingState["status"] | null;
  /** unix seconds the paid period ends */
  paidThrough: number | null;
  cancelAtPeriodEnd: boolean;
}

export const NO_PLAN: PlanFacts = { active: false, plan: null, kind: null, status: null, paidThrough: null, cancelAtPeriodEnd: false };

export interface PlanSummary {
  pro: boolean;
  /** "Pro yearly", "Pro monthly", "Pro for life", or "Free" */
  title: string;
  /** one line under the title: when it renews, ends, or that it never does */
  detail: string;
  /** something to look at, if any: a payment problem or a cancellation */
  notice: string | null;
}

const date = (sec: number) =>
  new Date(sec * 1000).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

export function summarizePlan(f: PlanFacts): PlanSummary {
  if (!f.active) {
    const lapsed = f.status === "cancelled" || f.status === "expired" || f.status === "failed" || f.status === "on_hold" || f.status === "paused";
    return {
      pro: false,
      title: "Free",
      detail: "Every device frame and the full editor, with watermark-free exports.",
      notice: lapsed ? "Your Pro plan isn't active. Pick a plan to get Pro back." : null,
    };
  }
  if (f.kind === "one_time" || f.plan === "lifetime") {
    return { pro: true, title: "Pro for life", detail: "Never expires. Nothing to renew.", notice: null };
  }
  const title = f.plan === "yearly" ? "Pro yearly" : f.plan === "monthly" ? "Pro monthly" : "Pro";
  if (f.status === "past_due") {
    return {
      pro: true,
      title,
      detail: f.paidThrough ? `Renewal was due ${date(f.paidThrough)}.` : "Renewal is overdue.",
      notice: "Your last payment didn't go through. Pro stays on for a few days while it's retried.",
    };
  }
  if (f.cancelAtPeriodEnd || f.status === "cancelled") {
    return {
      pro: true,
      title,
      detail: f.paidThrough ? `Ends on ${date(f.paidThrough)}.` : "Ends at the end of this period.",
      notice: "Your plan is cancelled. You keep Pro until the date above.",
    };
  }
  return { pro: true, title, detail: f.paidThrough ? `Renews on ${date(f.paidThrough)}.` : "Renews automatically.", notice: null };
}

/** Narrow the status route's JSON to PlanFacts. */
export function parsePlanFacts(raw: unknown): PlanFacts {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const plan = r.plan === "monthly" || r.plan === "yearly" || r.plan === "lifetime" ? r.plan : null;
  const kind = r.kind === "subscription" || r.kind === "one_time" ? r.kind : null;
  return {
    active: r.active === true,
    plan,
    kind,
    status: typeof r.status === "string" ? (r.status as PlanFacts["status"]) : null,
    paidThrough: typeof r.paidThrough === "number" && Number.isFinite(r.paidThrough) ? r.paidThrough : null,
    cancelAtPeriodEnd: r.cancelAtPeriodEnd === true,
  };
}
