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
  if (def.kind !== "subscription" || !def.period) throw new Error(`${plan} is not a subscription plan`);

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
  updatedAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
}

export async function writeBilling(uid: string, record: BillingRecord): Promise<void> {
  // Firestore rejects undefined values — prune optional fields that are absent
  const clean = Object.fromEntries(Object.entries(record).filter(([, v]) => v !== undefined));
  await firestoreDb().collection("users").doc(uid).set({ billing: clean }, { merge: true });
}

export async function readBilling(uid: string): Promise<BillingRecord | null> {
  const snap = await firestoreDb().collection("users").doc(uid).get();
  return snap.exists ? ((snap.data()?.billing as BillingRecord | undefined) ?? null) : null;
}

export function isBillingActive(b: BillingRecord | null): boolean {
  if (!b) return false;
  if (b.plan === "lifetime") return true; // lifetime never lapses
  return b.status === "active";
}
