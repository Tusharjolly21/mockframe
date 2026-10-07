import { firestoreDb } from "./firebaseAdmin";
import type { BillingState } from "./billingState";

export { isBillingActive, type BillingState, type BillingStatus } from "./billingState";

/**
 * Entitlement storage: users/{uid}.billing, written only by server routes via
 * the Admin SDK (firestore.rules deny all direct client access).
 *
 * Side collections:
 *  · billingWebhookEvents/{webhook-id} — processed Dodo deliveries (idempotency)
 *  · billingSubscriptions/{subscription_id} → { uid } — attribution fallback for
 *    events whose payload doesn't carry our checkout metadata
 */
export interface BillingRecord extends BillingState {
  updatedAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
}

function prune<T extends object>(record: T): Partial<T> {
  // Firestore rejects undefined values — drop optional fields that are absent
  return Object.fromEntries(Object.entries(record).filter(([, v]) => v !== undefined)) as Partial<T>;
}

export async function readBilling(uid: string): Promise<BillingRecord | null> {
  const snap = await firestoreDb().collection("users").doc(uid).get();
  return snap.exists ? ((snap.data()?.billing as BillingRecord | undefined) ?? null) : null;
}

export async function subscriptionOwner(subscriptionId: string): Promise<string | null> {
  const snap = await firestoreDb().collection("billingSubscriptions").doc(subscriptionId).get();
  const uid = snap.exists ? snap.data()?.uid : undefined;
  return typeof uid === "string" ? uid : null;
}

/**
 * Atomically apply a billing event: skip it if this webhook delivery was
 * already processed (`eventId`) or an equal-or-newer event is already recorded
 * (`eventAt`), else write. One transaction, so concurrent/retried Dodo
 * deliveries can't clobber each other (e.g. a late renewal re-activating a
 * cancelled sub).
 *
 * mergeFields replaces the whole `billing` map (not a deep-merge) so stale
 * fields from a prior record — e.g. an old subscriptionId after re-subscribing
 * on a different plan — don't linger, while other user fields stay untouched.
 */
export async function applyBillingEvent(
  uid: string,
  record: BillingRecord,
  opts: { eventId?: string; eventType?: string } = {}
): Promise<{ applied: boolean; duplicate?: boolean }> {
  const db = firestoreDb();
  const userRef = db.collection("users").doc(uid);
  const eventRef = opts.eventId ? db.collection("billingWebhookEvents").doc(opts.eventId) : null;
  const subRef = record.subscriptionId ? db.collection("billingSubscriptions").doc(record.subscriptionId) : null;

  return db.runTransaction(async (tx) => {
    // all reads before any writes (Firestore transaction rule)
    if (eventRef && (await tx.get(eventRef)).exists) return { applied: false, duplicate: true };
    const snap = await tx.get(userRef);

    if (eventRef) tx.set(eventRef, { uid, type: opts.eventType ?? null, receivedAt: record.updatedAt });
    if (subRef) tx.set(subRef, { uid }, { merge: true });

    const current = snap.exists ? (snap.data()?.billing as BillingRecord | undefined) : undefined;
    if (record.eventAt && current?.eventAt && record.eventAt <= current.eventAt) {
      return { applied: false };
    }
    tx.set(userRef, { billing: prune(record) }, { mergeFields: ["billing"] });
    return { applied: true };
  });
}
