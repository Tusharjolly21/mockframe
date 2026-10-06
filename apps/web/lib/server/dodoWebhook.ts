import crypto from "node:crypto";
import { isPlanId, type PlanId } from "../billing/plans";
import type { BillingState, BillingStatus } from "./billingState";

/*
 * Pure Dodo Payments webhook logic: Standard Webhooks signature verification
 * and event → entitlement mapping. No Firestore or network here so it is
 * unit-testable (see __tests__/dodoWebhook.test.ts).
 */

/** Max clock skew / replay window for webhook-timestamp (Standard Webhooks default). */
export const WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

export interface WebhookSignatureInput {
  /** `whsec_<base64>` (the prefix is optional) */
  secret: string;
  /** `webhook-id` header */
  id: string | null;
  /** `webhook-timestamp` header (unix seconds) */
  timestamp: string | null;
  /** `webhook-signature` header: space-separated `v1,<base64>` entries */
  signature: string | null;
  /** the raw, unparsed request body */
  body: string;
  nowSec?: number;
  toleranceSec?: number;
}

export function webhookSigningKey(secret: string): Buffer {
  return Buffer.from(secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret, "base64");
}

export function signWebhook(secret: string, id: string, timestamp: string | number, body: string): string {
  return crypto.createHmac("sha256", webhookSigningKey(secret)).update(`${id}.${timestamp}.${body}`).digest("base64");
}

/** Standard Webhooks verification: HMAC-SHA256 over `${id}.${timestamp}.${body}`
 *  with the base64-decoded secret, constant-time compared against every `v1,`
 *  entry in the header; stale or future timestamps are rejected. */
export function verifyWebhookSignature(input: WebhookSignatureInput): boolean {
  const { secret, id, timestamp, signature, body } = input;
  if (!secret || !id || !timestamp || !signature) return false;
  if (!/^\d+$/.test(timestamp)) return false;
  const nowSec = input.nowSec ?? Math.floor(Date.now() / 1000);
  const tolerance = input.toleranceSec ?? WEBHOOK_TOLERANCE_SECONDS;
  if (Math.abs(nowSec - Number(timestamp)) > tolerance) return false;

  const expected = Buffer.from(signWebhook(secret, id, timestamp, body), "utf8");
  return signature.split(" ").some((entry) => {
    const [version, sig] = entry.split(",", 2);
    if (version !== "v1" || !sig) return false;
    const got = Buffer.from(sig, "utf8");
    return got.length === expected.length && crypto.timingSafeEqual(got, expected);
  });
}

/* ------------------------------ event mapping ------------------------------ */

export interface DodoWebhookEvent {
  business_id?: string;
  type?: string;
  /** ISO 8601 */
  timestamp?: string;
  data?: Record<string, unknown>;
}

/** Subset of Dodo's Subscription object we rely on. */
export interface DodoSubscription {
  subscription_id?: string;
  product_id?: string;
  status?: string;
  next_billing_date?: string | null;
  cancel_at_next_billing_date?: boolean | null;
  metadata?: Record<string, unknown> | null;
  customer?: { customer_id?: string } | null;
}

/** Subset of Dodo's Payment object we rely on. */
export interface DodoPayment {
  payment_id?: string;
  subscription_id?: string | null;
  metadata?: Record<string, unknown> | null;
  customer?: { customer_id?: string } | null;
}

export interface BillingUpdate {
  /** app user id from checkout metadata; absent if Dodo didn't carry it */
  uid?: string;
  subscriptionId?: string;
  state: BillingState;
}

export type PlanForProduct = (productId: string | undefined) => PlanId | null;

const SUBSCRIPTION_STATUSES: Record<string, BillingStatus> = {
  active: "active",
  past_due: "past_due",
  on_hold: "on_hold",
  paused: "paused",
  cancelled: "cancelled",
  expired: "expired",
  failed: "failed",
};

/** Used when the payload has no recognised `status`. */
const EVENT_STATUS: Record<string, BillingStatus> = {
  "subscription.active": "active",
  "subscription.renewed": "active",
  "subscription.unpaused": "active",
  "subscription.past_due": "past_due",
  "subscription.on_hold": "on_hold",
  "subscription.paused": "paused",
  "subscription.cancelled": "cancelled",
  "subscription.expired": "expired",
  "subscription.failed": "failed",
};

const PERIOD_SECONDS: Record<PlanId, number> = {
  monthly: 31 * 24 * 60 * 60,
  yearly: 366 * 24 * 60 * 60,
};

function str(v: unknown): string | undefined {
  return typeof v === "string" && v ? v : undefined;
}

function isoToSec(v: unknown): number | undefined {
  if (typeof v !== "string") return undefined;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms / 1000 : undefined;
}

function planFrom(metadata: Record<string, unknown> | null | undefined, productId: string | undefined, planForProduct: PlanForProduct): PlanId | null {
  const fromMeta = metadata?.plan;
  if (isPlanId(fromMeta)) return fromMeta;
  return planForProduct(productId);
}

/** Map a Dodo Subscription object (from a webhook or GET /subscriptions/:id)
 *  to the stored entitlement. Returns null when it carries nothing actionable
 *  (e.g. still `pending`, or the product isn't one of ours). */
export function billingUpdateFromSubscription(
  sub: DodoSubscription,
  opts: { eventAt: number; via: BillingState["via"]; planForProduct: PlanForProduct; eventType?: string }
): BillingUpdate | null {
  const status = SUBSCRIPTION_STATUSES[sub.status ?? ""] ?? (opts.eventType ? EVENT_STATUS[opts.eventType] : undefined);
  if (!status) return null;
  const plan = planFrom(sub.metadata, sub.product_id, opts.planForProduct);
  if (!plan) return null;
  const subscriptionId = str(sub.subscription_id);
  return {
    uid: str(sub.metadata?.uid),
    subscriptionId,
    state: {
      plan,
      status,
      kind: "subscription",
      provider: "dodo",
      subscriptionId,
      customerId: str(sub.customer?.customer_id),
      paidThrough: isoToSec(sub.next_billing_date),
      cancelAtPeriodEnd: sub.cancel_at_next_billing_date === true ? true : undefined,
      via: opts.via,
      eventAt: opts.eventAt,
    },
  };
}

/** Map a verified webhook event to an entitlement update, or null to ignore it. */
export function billingUpdateFromEvent(
  event: DodoWebhookEvent,
  opts: { planForProduct: PlanForProduct; nowSec?: number }
): BillingUpdate | null {
  const type = event.type ?? "";
  const data = event.data ?? {};
  const eventAt = isoToSec(event.timestamp) ?? opts.nowSec ?? Date.now() / 1000;

  if (type.startsWith("subscription.")) {
    return billingUpdateFromSubscription(data as DodoSubscription, {
      eventAt,
      via: "webhook",
      planForProduct: opts.planForProduct,
      eventType: type,
    });
  }

  if (type === "payment.succeeded") {
    // A subscription charge (first or renewal). Subscription events carry the
    // authoritative next_billing_date; this keeps Pro on for one period in case
    // they arrive late or not at all.
    const payment = data as DodoPayment;
    const subscriptionId = str(payment.subscription_id);
    if (!subscriptionId) return null; // we only sell subscriptions
    const plan = planFrom(payment.metadata, undefined, opts.planForProduct);
    if (!plan) return null;
    return {
      uid: str(payment.metadata?.uid),
      subscriptionId,
      state: {
        plan,
        status: "active",
        kind: "subscription",
        provider: "dodo",
        subscriptionId,
        paymentId: str(payment.payment_id),
        customerId: str(payment.customer?.customer_id),
        paidThrough: eventAt + PERIOD_SECONDS[plan],
        via: "webhook",
        eventAt,
      },
    };
  }

  return null;
}
