import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { applyBillingEvent, subscriptionOwner } from "@/lib/server/billing";
import { planForProduct } from "@/lib/server/dodo";
import { billingUpdateFromEvent, verifyWebhookSignature, type DodoWebhookEvent } from "@/lib/server/dodoWebhook";

export const runtime = "nodejs";

/**
 * Dodo Payments webhook — the durable source of truth (the post-checkout
 * verify call handles the happy path; this catches renewals, cancellations,
 * dunning and browser-closed-early). Configure at Dodo Dashboard → Developer →
 * Webhooks pointing at https://<host>/api/billing/webhook, and put its signing
 * secret in DODO_PAYMENTS_WEBHOOK_SECRET.
 *
 * Signatures follow the Standard Webhooks spec (webhook-id / webhook-timestamp
 * / webhook-signature). Deliveries are idempotent on webhook-id, and
 * out-of-order events are dropped by event timestamp (see applyBillingEvent).
 */
export async function POST(req: NextRequest) {
  const secret = process.env.DODO_PAYMENTS_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Billing is not configured" }, { status: 501 });

  const raw = await req.text();
  const webhookId = req.headers.get("webhook-id");
  const ok = verifyWebhookSignature({
    secret,
    id: webhookId,
    timestamp: req.headers.get("webhook-timestamp"),
    signature: req.headers.get("webhook-signature"),
    body: raw,
  });
  if (!ok || !webhookId) return NextResponse.json({ error: "Bad signature" }, { status: 401 });

  let event: DodoWebhookEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }
  const type = event.type ?? "";

  try {
    const update = billingUpdateFromEvent(event, { planForProduct });
    if (!update) return NextResponse.json({ ok: true, ignored: true });

    // uid travels in checkout metadata; fall back to the subscription → user
    // mapping recorded on earlier events in case a payload omits it
    const uid = update.uid ?? (update.subscriptionId ? await subscriptionOwner(update.subscriptionId) : null);
    if (!uid) {
      console.warn("[billing/webhook] unattributable event", type, update.subscriptionId);
      return NextResponse.json({ ok: true, ignored: true });
    }

    const result = await applyBillingEvent(
      uid,
      { ...update.state, updatedAt: FieldValue.serverTimestamp() },
      { eventId: webhookId, eventType: type }
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[billing/webhook]", type, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 }); // Dodo retries on non-2xx
  }
}
