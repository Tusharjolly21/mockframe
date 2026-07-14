import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { FirebaseConfigError, firebaseSetupHint } from "@/lib/server/firebaseAdmin";
import { getRequestOwner } from "@/lib/server/requestOwner";
import { razorpay, verifyRazorpaySignature, writeBilling } from "@/lib/server/razorpay";
import { isPlanId, PLANS } from "@/lib/billing/plans";

export const runtime = "nodejs";

/**
 * POST — Razorpay Checkout success handler payload. Recomputes the signature
 * server-side with the key secret (never trust the client's word that it paid):
 *   order:        HMAC_SHA256(order_id  + "|" + payment_id)
 *   subscription: HMAC_SHA256(payment_id + "|" + subscription_id)
 *
 * The signature only proves the tuple came from Razorpay — NOT that it belongs
 * to the caller. So we then fetch the order/subscription and require its
 * `notes.uid` (set at checkout, tamper-proof) to equal the signed-in user.
 * Without this, one leaked/sold payment tuple could activate any number of
 * accounts. The plan we record is taken from the same server-side notes, not
 * from the client body. On success the entitlement is written to users/{uid}.
 */
export async function POST(req: NextRequest) {
  try {
    const owner = await getRequestOwner(req);
    if (!owner.uid || owner.signInProvider === "anonymous") {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) return NextResponse.json({ error: "Razorpay is not configured" }, { status: 501 });

    const body = await req.json().catch(() => ({}));
    const { plan, razorpay_payment_id, razorpay_order_id, razorpay_subscription_id, razorpay_signature } = body ?? {};
    if (!isPlanId(plan) || typeof razorpay_payment_id !== "string" || typeof razorpay_signature !== "string") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const def = PLANS[plan];
    const payload =
      def.kind === "one_time"
        ? typeof razorpay_order_id === "string" && `${razorpay_order_id}|${razorpay_payment_id}`
        : typeof razorpay_subscription_id === "string" && `${razorpay_payment_id}|${razorpay_subscription_id}`;
    if (!payload || !verifyRazorpaySignature(payload, razorpay_signature, secret)) {
      return NextResponse.json({ error: "Signature verification failed" }, { status: 400 });
    }

    // Bind the payment to THIS account via the tamper-proof notes.uid set at
    // checkout. A valid-but-foreign tuple can only ever re-activate its own
    // buyer, so it can't be resold to unlock other accounts.
    let notes: Record<string, string> = {};
    try {
      if (def.kind === "one_time") {
        const order = await razorpay().orders.fetch(razorpay_order_id as string);
        notes = (order?.notes as Record<string, string>) ?? {};
      } else {
        const sub = await razorpay().subscriptions.fetch(razorpay_subscription_id as string);
        notes = (sub?.notes as Record<string, string>) ?? {};
      }
    } catch (e) {
      console.error("[billing/verify] fetch failed", e);
      return NextResponse.json({ error: "Could not confirm the payment" }, { status: 502 });
    }
    if (notes.uid !== owner.uid) {
      return NextResponse.json({ error: "This payment isn't linked to your account" }, { status: 403 });
    }
    // trust the plan recorded server-side at checkout, not the client body
    const effectivePlan = isPlanId(notes.plan) ? notes.plan : plan;
    const effectiveDef = PLANS[effectivePlan];

    await writeBilling(owner.uid, {
      plan: effectivePlan,
      status: "active",
      kind: effectiveDef.kind,
      paymentId: razorpay_payment_id,
      orderId: typeof razorpay_order_id === "string" ? razorpay_order_id : undefined,
      subscriptionId: typeof razorpay_subscription_id === "string" ? razorpay_subscription_id : undefined,
      via: "checkout",
      updatedAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ active: true, plan: effectivePlan });
  } catch (err) {
    if (err instanceof FirebaseConfigError) {
      return NextResponse.json({ error: "Firebase is not configured", hint: firebaseSetupHint() }, { status: 501 });
    }
    console.error("[billing/verify]", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
