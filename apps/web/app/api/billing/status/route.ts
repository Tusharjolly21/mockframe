import { NextRequest, NextResponse } from "next/server";
import { FirebaseConfigError } from "@/lib/server/firebaseAdmin";
import { getRequestOwner } from "@/lib/server/requestOwner";
import { isBillingActive, readBilling } from "@/lib/server/razorpay";

export const runtime = "nodejs";

/** GET → { active, plan } for the current user (guests are never Pro). */
export async function GET(req: NextRequest) {
  try {
    const owner = await getRequestOwner(req);
    if (!owner.uid) return NextResponse.json({ active: false, plan: null });
    const billing = await readBilling(owner.uid);
    return NextResponse.json({
      active: isBillingActive(billing),
      plan: billing?.plan ?? null,
    });
  } catch (err) {
    if (err instanceof FirebaseConfigError) return NextResponse.json({ active: false, plan: null });
    console.error("[billing/status]", err);
    return NextResponse.json({ active: false, plan: null });
  }
}
