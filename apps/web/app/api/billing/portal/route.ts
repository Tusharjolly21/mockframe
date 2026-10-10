import { NextRequest, NextResponse } from "next/server";
import { FirebaseConfigError } from "@/lib/server/firebaseAdmin";
import { getRequestOwner } from "@/lib/server/requestOwner";
import { createPortalSession, DodoConfigError } from "@/lib/server/dodo";
import { readBilling } from "@/lib/server/billing";

export const runtime = "nodejs";

/** POST → { url } of Dodo's customer portal (card, invoices, cancel) for the signed-in subscriber. */
export async function POST(req: NextRequest) {
  try {
    const owner = await getRequestOwner(req);
    if (!owner.uid || owner.signInProvider === "anonymous") return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    const billing = await readBilling(owner.uid);
    if (!billing?.customerId) return NextResponse.json({ error: "No subscription to manage" }, { status: 404 });
    const url = await createPortalSession(billing.customerId, `${req.nextUrl.origin}/profile`);
    return NextResponse.json({ url });
  } catch (err) {
    if (err instanceof FirebaseConfigError || err instanceof DodoConfigError) return NextResponse.json({ error: "Billing isn't set up here" }, { status: 501 });
    console.error("[billing/portal]", err);
    return NextResponse.json({ error: "The billing portal couldn't be opened. Email hello@mockframe.app and we'll sort it out." }, { status: 502 });
  }
}
