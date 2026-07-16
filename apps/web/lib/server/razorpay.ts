import Razorpay from "razorpay";
import crypto from "node:crypto";
import { firestoreDb } from "./firebaseAdmin";
import { PLANS, type Currency, type PlanId } from "../billing/plans";

export class RazorpayConfigError extends Error {
  constructor(message = "Razorpay is not configured — set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.local (test keys from dashboard.razorpay.com → Settings → API Keys)") {
    super(message);
    this.name = "RazorpayConfigError";
  }
}

export function isRazorpayConfigured(): boolean {
  return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function razorpayKeyId(): string {
  const id = process.env.RAZORPAY_KEY_ID;
  if (!id) throw new RazorpayConfigError();
  return id;
}

let client: Razorpay | null = null;
export function razorpay(): Razorpay {
  if (!isRazorpayConfigured()) throw new RazorpayConfigError();
  if (!client) {
    client = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
  }
  return client;
}

/**
 * Razorpay subscriptions bill against a Plan object that lives in the Razorpay
 * account. Rather than requiring dashboard setup, we create plans lazily via
 * the API (one per plan × currency) and cache the ids in Firestore — so local
 * testing works with nothing but test keys in .env.local.
 */
export async function ensureRazorpayPlanId(plan: PlanId, currency: Currency): Promise<string> {
  const def = PLANS[plan];
  const cacheKey = `${plan}_${currency}_${def.price[currency]}`; // price in key → price edits mint a new plan
  const ref = firestoreDb().collection("billing").doc("razorpayPlans");
  const snap = await ref.get();
  const cached = snap.exists ? (snap.data()?.[cacheKey] as string | undefined) : undefined;
  if (cached) return cached;

  const created = await razorpay().plans.create({
    period: def.period,
    interval: 1,
    item: {
      name: `MockFrame Pro — ${def.label} (${currency})`,
      amount: def.price[currency],
      currency,
    },
  });
  await ref.set({ [cacheKey]: created.id }, { merge: true });
  return created.id;
}

/** Constant-time HMAC-SHA256 check used by both checkout verify and webhooks. */
export function verifyRazorpaySignature(payload: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export interface BillingRecord {
  plan: PlanId;
  status: "active" | "cancelled" | "halted";
  kind: "subscription" | "one_time";
  paymentId?: string;
  orderId?: string;
  subscriptionId?: string;
  currency?: Currency;
  via: "checkout" | "webhook";
  /** Razorpay event `created_at` (unix seconds) — lets the webhook drop stale /
   *  out-of-order deliveries so a cancelled sub can't be re-activated. */
  eventAt?: number;
  updatedAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
}

export async function writeBilling(uid: string, record: BillingRecord): Promise<void> {
  // Firestore rejects undefined values — prune optional fields that are absent
  const clean = Object.fromEntries(Object.entries(record).filter(([, v]) => v !== undefined));
  // mergeFields replaces the whole `billing` map (not a deep-merge) so stale
  // fields from a prior record — e.g. an old subscriptionId after re-subscribing
  // on a different plan — don't linger, while other user fields stay untouched.
  await firestoreDb().collection("users").doc(uid).set({ billing: clean }, { mergeFields: ["billing"] });
}

export async function readBilling(uid: string): Promise<BillingRecord | null> {
  const snap = await firestoreDb().collection("users").doc(uid).get();
  return snap.exists ? ((snap.data()?.billing as BillingRecord | undefined) ?? null) : null;
}

/**
 * Atomically apply a webhook billing event: read the current record, drop it if
 * an equal-or-newer event was already recorded (`eventAt`), else write. Done in
 * one transaction so concurrent/retried Razorpay deliveries can't clobber each
 * other (e.g. a late `subscription.charged` re-activating a `cancelled` sub).
 * Returns whether the write was applied.
 */
export async function applyBillingEvent(uid: string, record: BillingRecord): Promise<{ applied: boolean }> {
  const db = firestoreDb();
  const ref = db.collection("users").doc(uid);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists ? (snap.data()?.billing as BillingRecord | undefined) : undefined;
    if (record.eventAt && current?.eventAt && record.eventAt <= current.eventAt) {
      return { applied: false };
    }
    const clean = Object.fromEntries(Object.entries(record).filter(([, v]) => v !== undefined));
    tx.set(ref, { billing: clean }, { mergeFields: ["billing"] });
    return { applied: true };
  });
}

export function isBillingActive(b: BillingRecord | null): boolean {
  if (!b) return false;
  // Legacy lifetime purchases (no longer sold) were recorded as one-time and
  // never lapse — keyed on `kind` so we honour them without referencing the
  // removed "lifetime" plan id. Everyone else is active only while subscribed.
  if (b.kind === "one_time") return true;
  return b.status === "active";
}
