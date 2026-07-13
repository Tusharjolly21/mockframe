import { NextRequest, NextResponse } from "next/server";
import { FirebaseConfigError, firebaseSetupHint } from "@/lib/server/firebaseAdmin";
import { getRequestOwner } from "@/lib/server/requestOwner";
import {
  ensureRazorpayPlanId,
  razorpay,
  razorpayKeyId,
  RazorpayConfigError,
} from "@/lib/server/razorpay";
import { isCurrency, isPlanId, PLANS } from "@/lib/billing/plans";

export const runtime = "nodejs";

/**
 * POST { plan, currency } → the payload Razorpay Checkout needs on the client.
 * Lifetime is a one-time Order; monthly/yearly are Subscriptions. The uid is
 * attached to notes so webhooks can attribute the payment without a session.
 */
export async function POST(req: NextRequest) {
  try {
    const owner = await getRequestOwner(req);
    // payments require a REAL account (Razorpay verification answer: login
    // required) — anonymous guest sessions can't attach a recoverable purchase
    if (!owner.uid || owner.signInProvider === "anonymous") {
      return NextResponse.json({ error: "Sign in to upgrade" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { plan, currency } = body ?? {};
    if (!isPlanId(plan) || !isCurrency(currency)) {
      return NextResponse.json({ error: "Invalid plan or currency" }, { status: 400 });
    }

    const def = PLANS[plan];
    const notes = { uid: owner.uid, plan };

    if (def.kind === "one_time") {
      const order = await razorpay().orders.create({
        amount: def.price[currency],
        currency,
        receipt: `life_${owner.uid.slice(0, 30)}`,
        notes,
      });
      return NextResponse.json({
        mode: "order",
        keyId: razorpayKeyId(),
        orderId: order.id,
        amount: def.price[currency],
        currency,
      });
    }

    const planId = await ensureRazorpayPlanId(plan, currency);
    const sub = await razorpay().subscriptions.create({
      plan_id: planId,
      total_count: def.totalCount ?? 120,
      notes,
    });
    return NextResponse.json({
      mode: "subscription",
      keyId: razorpayKeyId(),
      subscriptionId: sub.id,
    });
  } catch (err) {
    if (err instanceof RazorpayConfigError) {
      return NextResponse.json({ error: err.message }, { status: 501 });
    }
    if (err instanceof FirebaseConfigError) {
      return NextResponse.json({ error: "Firebase is not configured", hint: firebaseSetupHint() }, { status: 501 });
    }
    console.error("[billing/checkout]", err);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
