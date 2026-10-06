import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { FirebaseConfigError, firebaseSetupHint } from "@/lib/server/firebaseAdmin";
import { getRequestOwner } from "@/lib/server/requestOwner";
import { DodoApiError, DodoConfigError, getSubscription, isDodoConfigured, planForProduct } from "@/lib/server/dodo";
import { billingUpdateFromSubscription, type DodoSubscription } from "@/lib/server/dodoWebhook";
import { applyBillingEvent, isBillingActive, readBilling } from "@/lib/server/billing";

export const runtime = "nodejs";

/**
 * POST { subscriptionId } — called by the editor after Dodo's hosted checkout
 * redirects back, so Pro unlocks immediately even if the webhook is still in
 * flight. Never trusts the client: the subscription is re-fetched from Dodo
 * with the secret key, and its metadata.uid (set server-side at checkout) must
 * equal the signed-in user — a leaked subscription id can only ever
 * re-activate its own buyer. The webhook remains the durable source of truth.
 */
export async function POST(req: NextRequest) {
  try {
    if (!isDodoConfigured()) throw new DodoConfigError();

    const owner = await getRequestOwner(req);
    if (!owner.uid || owner.signInProvider === "anonymous") {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const subscriptionId = body?.subscriptionId;
    if (typeof subscriptionId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(subscriptionId)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    let sub: DodoSubscription;
    try {
      sub = await getSubscription(subscriptionId);
    } catch (e) {
      if (e instanceof DodoApiError && e.status === 404) {
        return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
      }
      console.error("[billing/verify] fetch failed", e);
      return NextResponse.json({ error: "Could not confirm the payment" }, { status: 502 });
    }
    if (sub.metadata?.uid !== owner.uid) {
      return NextResponse.json({ error: "This payment isn't linked to your account" }, { status: 403 });
    }

    const update = billingUpdateFromSubscription(sub, {
      eventAt: Date.now() / 1000,
      via: "checkout",
      planForProduct,
    });
    if (update) {
      await applyBillingEvent(owner.uid, { ...update.state, updatedAt: FieldValue.serverTimestamp() });
    }
    const billing = await readBilling(owner.uid);
    return NextResponse.json({ active: isBillingActive(billing), plan: billing?.plan ?? null, status: sub.status ?? null });
  } catch (err) {
    if (err instanceof DodoConfigError) {
      return NextResponse.json({ error: err.message }, { status: 501 });
    }
    if (err instanceof FirebaseConfigError) {
      return NextResponse.json({ error: "Firebase is not configured", hint: firebaseSetupHint() }, { status: 501 });
    }
    console.error("[billing/verify]", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
