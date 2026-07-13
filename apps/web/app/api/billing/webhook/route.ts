import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { verifyRazorpaySignature, writeBilling } from "@/lib/server/razorpay";
import { isPlanId } from "@/lib/billing/plans";

export const runtime = "nodejs";

/**
 * Razorpay webhook — the durable source of truth (checkout verify handles the
 * happy path; this catches renewals, cancellations, and browser-closed-early).
 * Configure at dashboard.razorpay.com → Webhooks with RAZORPAY_WEBHOOK_SECRET;
 * for local testing tunnel it (e.g. `npx localtunnel --port 3000`) or replay
 * events with curl — the signature is HMAC_SHA256(raw body, webhook secret).
 */
export async function POST(req: NextRequest) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook secret not configured" }, { status: 501 });

  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  if (!signature || !verifyRazorpaySignature(raw, signature, secret)) {
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  let event: {
    event?: string;
    payload?: {
      payment?: { entity?: { id?: string; order_id?: string; notes?: Record<string, string> } };
      subscription?: { entity?: { id?: string; notes?: Record<string, string> } };
    };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const type = event.event ?? "";
  const payment = event.payload?.payment?.entity;
  const subscription = event.payload?.subscription?.entity;
  // uid/plan travel in notes (set at checkout creation) so attribution never
  // depends on a browser session existing
  const notes = subscription?.notes ?? payment?.notes ?? {};
  const uid = notes.uid;
  const plan = notes.plan;

  try {
    if (uid && isPlanId(plan)) {
      if (type === "payment.captured" && plan === "lifetime") {
        await writeBilling(uid, {
          plan,
          status: "active",
          kind: "one_time",
          paymentId: payment?.id,
          orderId: payment?.order_id,
          via: "webhook",
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else if (type === "subscription.activated" || type === "subscription.charged" || type === "subscription.resumed") {
        await writeBilling(uid, {
          plan,
          status: "active",
          kind: "subscription",
          subscriptionId: subscription?.id,
          via: "webhook",
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else if (type === "subscription.halted" || type === "subscription.cancelled" || type === "subscription.completed" || type === "subscription.paused") {
        await writeBilling(uid, {
          plan,
          status: type === "subscription.halted" ? "halted" : "cancelled",
          kind: "subscription",
          subscriptionId: subscription?.id,
          via: "webhook",
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }
  } catch (err) {
    console.error("[billing/webhook]", type, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 }); // Razorpay retries on 5xx
  }

  return NextResponse.json({ ok: true });
}
