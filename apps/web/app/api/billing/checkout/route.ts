import { NextRequest, NextResponse } from "next/server";
import { FirebaseConfigError, firebaseSetupHint } from "@/lib/server/firebaseAdmin";
import { getRequestOwner } from "@/lib/server/requestOwner";
import { createCheckoutSession, DodoConfigError, isDodoConfigured } from "@/lib/server/dodo";
import { isPlanId, PLANS } from "@/lib/billing/plans";

export const runtime = "nodejs";

/**
 * POST { plan, expectedPrice } → { checkoutUrl } for Dodo Payments' hosted
 * checkout. The client redirects there; Dodo sends the buyer back to
 * /editor?upgrade=success (with subscription_id/status appended), where the
 * editor confirms the entitlement via /api/billing/verify. The uid + plan are
 * attached as metadata so webhooks can attribute the purchase without a session.
 */
export async function POST(req: NextRequest) {
  try {
    if (!isDodoConfigured()) throw new DodoConfigError();

    const owner = await getRequestOwner(req);
    // payments require a REAL account — anonymous guest sessions can't attach
    // a recoverable purchase
    if (!owner.uid || owner.signInProvider === "anonymous") {
      return NextResponse.json({ error: "Sign in to upgrade" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { plan, expectedPrice } = body ?? {};
    if (!isPlanId(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // the client must state the price it DISPLAYED — a browser running a
    // pre-price-change bundle gets a refresh prompt instead of a surprise charge
    if (expectedPrice !== PLANS[plan].price) {
      return NextResponse.json(
        { error: "Prices were updated — refresh the page to see current pricing" },
        { status: 409 }
      );
    }

    const origin = req.nextUrl.origin;
    const { checkoutUrl } = await createCheckoutSession({
      plan,
      uid: owner.uid,
      email: owner.email,
      returnUrl: `${origin}/editor?upgrade=success`,
      cancelUrl: `${origin}/editor?upgrade=1&plan=${plan}`,
    });
    return NextResponse.json({ checkoutUrl });
  } catch (err) {
    if (err instanceof DodoConfigError) {
      return NextResponse.json({ error: err.message }, { status: 501 });
    }
    if (err instanceof FirebaseConfigError) {
      return NextResponse.json({ error: "Firebase is not configured", hint: firebaseSetupHint() }, { status: 501 });
    }
    console.error("[billing/checkout]", err);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
