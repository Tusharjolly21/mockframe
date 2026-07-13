import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { FirebaseConfigError, firebaseSetupHint } from "@/lib/server/firebaseAdmin";
import { getRequestOwner } from "@/lib/server/requestOwner";
import { verifyRazorpaySignature, writeBilling } from "@/lib/server/razorpay";
import { isPlanId, PLANS } from "@/lib/billing/plans";

export const runtime = "nodejs";

/**
 * POST — Razorpay Checkout success handler payload. Recomputes the signature
 * server-side with the key secret (never trust the client's word that it paid):
 *   order:        HMAC_SHA256(order_id  + "|" + payment_id)
 *   subscription: HMAC_SHA256(payment_id + "|" + subscription_id)
 * On success the Pro entitlement is written to users/{uid}.billing.
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

    await writeBilling(owner.uid, {
      plan,
      status: "active",
      kind: def.kind,
      paymentId: razorpay_payment_id,
      orderId: typeof razorpay_order_id === "string" ? razorpay_order_id : undefined,
      subscriptionId: typeof razorpay_subscription_id === "string" ? razorpay_subscription_id : undefined,
      via: "checkout",
      updatedAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ active: true, plan });
  } catch (err) {
    if (err instanceof FirebaseConfigError) {
      return NextResponse.json({ error: "Firebase is not configured", hint: firebaseSetupHint() }, { status: 501 });
    }
    console.error("[billing/verify]", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
