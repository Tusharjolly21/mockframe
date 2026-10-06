import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  billingUpdateFromEvent,
  billingUpdateFromSubscription,
  signWebhook,
  verifyWebhookSignature,
  WEBHOOK_TOLERANCE_SECONDS,
  type PlanForProduct,
} from "../dodoWebhook";
import { isBillingActive, RENEWAL_GRACE_SECONDS } from "../billingState";

const KEY = crypto.randomBytes(24);
const SECRET = `whsec_${KEY.toString("base64")}`;
const NOW = 1_790_000_000;
const ID = "msg_2abc";
const BODY = JSON.stringify({ type: "subscription.active", data: { subscription_id: "sub_1" } });

function header(sig: string) {
  return `v1,${sig}`;
}

describe("verifyWebhookSignature (Standard Webhooks)", () => {
  const ts = String(NOW);
  const good = crypto.createHmac("sha256", KEY).update(`${ID}.${ts}.${BODY}`).digest("base64");

  it("signs id.timestamp.body with the base64-decoded secret", () => {
    expect(signWebhook(SECRET, ID, ts, BODY)).toBe(good);
    // the whsec_ prefix is optional
    expect(signWebhook(KEY.toString("base64"), ID, ts, BODY)).toBe(good);
  });

  it("accepts a valid signature", () => {
    expect(verifyWebhookSignature({ secret: SECRET, id: ID, timestamp: ts, signature: header(good), body: BODY, nowSec: NOW })).toBe(true);
  });

  it("accepts when any of several space-separated signatures matches (secret rotation)", () => {
    const sig = `v1,${Buffer.from("nope").toString("base64")} v1a,whatever ${header(good)}`;
    expect(verifyWebhookSignature({ secret: SECRET, id: ID, timestamp: ts, signature: sig, body: BODY, nowSec: NOW })).toBe(true);
  });

  it("rejects a tampered body, id or timestamp", () => {
    const base = { secret: SECRET, id: ID, timestamp: ts, signature: header(good), body: BODY, nowSec: NOW };
    expect(verifyWebhookSignature({ ...base, body: BODY + " " })).toBe(false);
    expect(verifyWebhookSignature({ ...base, id: "msg_other" })).toBe(false);
    expect(verifyWebhookSignature({ ...base, timestamp: String(NOW + 1) })).toBe(false);
  });

  it("rejects the wrong secret, wrong version and missing headers", () => {
    const base = { secret: SECRET, id: ID, timestamp: ts, signature: header(good), body: BODY, nowSec: NOW };
    expect(verifyWebhookSignature({ ...base, secret: `whsec_${crypto.randomBytes(24).toString("base64")}` })).toBe(false);
    expect(verifyWebhookSignature({ ...base, signature: `v2,${good}` })).toBe(false);
    expect(verifyWebhookSignature({ ...base, signature: good })).toBe(false);
    expect(verifyWebhookSignature({ ...base, signature: null })).toBe(false);
    expect(verifyWebhookSignature({ ...base, id: null })).toBe(false);
    expect(verifyWebhookSignature({ ...base, timestamp: null })).toBe(false);
    expect(verifyWebhookSignature({ ...base, timestamp: "abc" })).toBe(false);
  });

  it("rejects stale and future timestamps outside the tolerance", () => {
    const old = String(NOW - WEBHOOK_TOLERANCE_SECONDS - 1);
    const oldSig = signWebhook(SECRET, ID, old, BODY);
    expect(verifyWebhookSignature({ secret: SECRET, id: ID, timestamp: old, signature: header(oldSig), body: BODY, nowSec: NOW })).toBe(false);
    const future = String(NOW + WEBHOOK_TOLERANCE_SECONDS + 1);
    const futureSig = signWebhook(SECRET, ID, future, BODY);
    expect(verifyWebhookSignature({ secret: SECRET, id: ID, timestamp: future, signature: header(futureSig), body: BODY, nowSec: NOW })).toBe(false);
    const edge = String(NOW - WEBHOOK_TOLERANCE_SECONDS);
    const edgeSig = signWebhook(SECRET, ID, edge, BODY);
    expect(verifyWebhookSignature({ secret: SECRET, id: ID, timestamp: edge, signature: header(edgeSig), body: BODY, nowSec: NOW })).toBe(true);
  });
});

const planForProduct: PlanForProduct = (id) => (id === "pdt_month" ? "monthly" : id === "pdt_year" ? "yearly" : null);
const TS = "2026-10-06T12:00:00Z";
const TS_SEC = Date.parse(TS) / 1000;
const NEXT = "2026-11-06T12:00:00Z";
const NEXT_SEC = Date.parse(NEXT) / 1000;

function subEvent(type: string, data: Record<string, unknown>) {
  return {
    business_id: "bus_1",
    type,
    timestamp: TS,
    data: {
      payload_type: "Subscription",
      subscription_id: "sub_1",
      product_id: "pdt_month",
      next_billing_date: NEXT,
      metadata: { uid: "user_1", plan: "monthly" },
      customer: { customer_id: "cus_1" },
      ...data,
    },
  };
}

describe("billingUpdateFromEvent", () => {
  it("subscription.active grants Pro until next_billing_date", () => {
    const u = billingUpdateFromEvent(subEvent("subscription.active", { status: "active" }), { planForProduct });
    expect(u).toEqual({
      uid: "user_1",
      subscriptionId: "sub_1",
      state: {
        plan: "monthly",
        status: "active",
        kind: "subscription",
        provider: "dodo",
        subscriptionId: "sub_1",
        customerId: "cus_1",
        paidThrough: NEXT_SEC,
        cancelAtPeriodEnd: undefined,
        via: "webhook",
        eventAt: TS_SEC,
      },
    });
    expect(isBillingActive(u!.state, TS_SEC)).toBe(true);
  });

  it("subscription.renewed extends access", () => {
    const u = billingUpdateFromEvent(subEvent("subscription.renewed", { status: "active" }), { planForProduct });
    expect(u?.state.status).toBe("active");
    expect(u?.state.paidThrough).toBe(NEXT_SEC);
  });

  it("falls back to the event type when the payload has no status", () => {
    expect(billingUpdateFromEvent(subEvent("subscription.active", {}), { planForProduct })?.state.status).toBe("active");
    expect(billingUpdateFromEvent(subEvent("subscription.on_hold", {}), { planForProduct })?.state.status).toBe("on_hold");
  });

  it.each([
    ["subscription.on_hold", "on_hold"],
    ["subscription.failed", "failed"],
    ["subscription.expired", "expired"],
    ["subscription.paused", "paused"],
  ])("%s revokes Pro", (type, status) => {
    const u = billingUpdateFromEvent(subEvent(type, { status }), { planForProduct });
    expect(u?.state.status).toBe(status);
    expect(isBillingActive(u!.state, TS_SEC)).toBe(false);
  });

  it("subscription.cancelled keeps the already-paid period, then lapses", () => {
    const u = billingUpdateFromEvent(subEvent("subscription.cancelled", { status: "cancelled" }), { planForProduct });
    expect(u?.state.status).toBe("cancelled");
    expect(isBillingActive(u!.state, TS_SEC)).toBe(true);
    expect(isBillingActive(u!.state, NEXT_SEC + 1)).toBe(false);
    // cancelled with no future period → revoked immediately
    const now = billingUpdateFromEvent(subEvent("subscription.cancelled", { status: "cancelled", next_billing_date: null }), { planForProduct });
    expect(isBillingActive(now!.state, TS_SEC)).toBe(false);
  });

  it("subscription.past_due keeps access during dunning", () => {
    const u = billingUpdateFromEvent(subEvent("subscription.past_due", { status: "past_due" }), { planForProduct });
    expect(isBillingActive(u!.state, TS_SEC)).toBe(true);
  });

  it("subscription.updated records a scheduled cancellation without revoking", () => {
    const u = billingUpdateFromEvent(subEvent("subscription.updated", { status: "active", cancel_at_next_billing_date: true }), { planForProduct });
    expect(u?.state.cancelAtPeriodEnd).toBe(true);
    expect(isBillingActive(u!.state, TS_SEC)).toBe(true);
  });

  it("ignores pending subscriptions and unknown statuses on non-lifecycle events", () => {
    expect(billingUpdateFromEvent(subEvent("subscription.updated", { status: "pending" }), { planForProduct })).toBeNull();
    expect(billingUpdateFromEvent(subEvent("subscription.updated", { status: undefined }), { planForProduct })).toBeNull();
  });

  it("resolves the plan from product_id when metadata lacks it, and drops foreign products", () => {
    const yearly = billingUpdateFromEvent(subEvent("subscription.active", { status: "active", product_id: "pdt_year", metadata: { uid: "user_1" } }), { planForProduct });
    expect(yearly?.state.plan).toBe("yearly");
    const foreign = billingUpdateFromEvent(subEvent("subscription.active", { status: "active", product_id: "pdt_other", metadata: {} }), { planForProduct });
    expect(foreign).toBeNull();
  });

  it("leaves uid undefined when metadata is missing (route falls back to the subscription mapping)", () => {
    const u = billingUpdateFromEvent(subEvent("subscription.renewed", { status: "active", metadata: null }), { planForProduct });
    expect(u?.uid).toBeUndefined();
    expect(u?.subscriptionId).toBe("sub_1");
    expect(u?.state.plan).toBe("monthly");
  });

  it("payment.succeeded for a subscription grants one billing period", () => {
    const u = billingUpdateFromEvent(
      {
        type: "payment.succeeded",
        timestamp: TS,
        data: { payload_type: "Payment", payment_id: "pay_1", subscription_id: "sub_1", metadata: { uid: "user_1", plan: "yearly" } },
      },
      { planForProduct }
    );
    expect(u?.uid).toBe("user_1");
    expect(u?.state).toMatchObject({ plan: "yearly", status: "active", paymentId: "pay_1", subscriptionId: "sub_1", eventAt: TS_SEC });
    expect(u!.state.paidThrough).toBe(TS_SEC + 366 * 24 * 60 * 60);
  });

  it("ignores one-off payments, other payment events and unrelated events", () => {
    expect(billingUpdateFromEvent({ type: "payment.succeeded", timestamp: TS, data: { payment_id: "pay_1", metadata: { uid: "u", plan: "monthly" } } }, { planForProduct })).toBeNull();
    expect(billingUpdateFromEvent({ type: "payment.failed", timestamp: TS, data: { subscription_id: "sub_1", metadata: { uid: "u", plan: "monthly" } } }, { planForProduct })).toBeNull();
    expect(billingUpdateFromEvent({ type: "refund.succeeded", timestamp: TS, data: {} }, { planForProduct })).toBeNull();
    expect(billingUpdateFromEvent({}, { planForProduct })).toBeNull();
  });

  it("uses nowSec when the event timestamp is missing or invalid", () => {
    const e = subEvent("subscription.active", { status: "active" });
    const u = billingUpdateFromEvent({ ...e, timestamp: "not a date" }, { planForProduct, nowSec: 42 });
    expect(u?.state.eventAt).toBe(42);
  });
});

describe("billingUpdateFromSubscription (verify route)", () => {
  it("maps a fetched subscription with via=checkout", () => {
    const u = billingUpdateFromSubscription(
      { subscription_id: "sub_9", status: "active", product_id: "pdt_year", next_billing_date: NEXT, metadata: { uid: "user_9", plan: "yearly" } },
      { eventAt: 100, via: "checkout", planForProduct }
    );
    expect(u?.uid).toBe("user_9");
    expect(u?.state).toMatchObject({ plan: "yearly", status: "active", via: "checkout", eventAt: 100, paidThrough: NEXT_SEC });
  });
});

describe("isBillingActive", () => {
  const base = { plan: "monthly" as const, kind: "subscription" as const, via: "webhook" as const };

  it("is false without a record", () => {
    expect(isBillingActive(null)).toBe(false);
  });

  it("honours legacy one-time purchases and legacy active records without paidThrough", () => {
    expect(isBillingActive({ ...base, kind: "one_time", status: "cancelled" }, NOW)).toBe(true);
    expect(isBillingActive({ ...base, status: "active" }, NOW)).toBe(true);
    expect(isBillingActive({ ...base, status: "halted" }, NOW)).toBe(false);
  });

  it("allows a short grace after the billing date for a late renewal webhook", () => {
    const rec = { ...base, status: "active" as const, paidThrough: NOW };
    expect(isBillingActive(rec, NOW + RENEWAL_GRACE_SECONDS - 1)).toBe(true);
    expect(isBillingActive(rec, NOW + RENEWAL_GRACE_SECONDS + 1)).toBe(false);
  });
});
