import { NextRequest, NextResponse } from "next/server";
import { FirebaseConfigError } from "@/lib/server/firebaseAdmin";
import { getRequestOwner } from "@/lib/server/requestOwner";
import { isBillingActive, readBilling } from "@/lib/server/billing";

export const runtime = "nodejs";

/** GET → { active, plan, ... } for the current user (guests are never Pro). The extra
    fields feed the profile page: when the plan renews or ends, and whether a billing portal exists. */
export async function GET(req: NextRequest) {
  try {
    const owner = await getRequestOwner(req);
    if (!owner.uid) return NextResponse.json({ active: false, plan: null });
    const billing = await readBilling(owner.uid);
    return NextResponse.json({
      active: isBillingActive(billing),
      plan: billing?.plan ?? null,
      status: billing?.status ?? null,
      paidThrough: billing?.paidThrough ?? null,
      cancelAtPeriodEnd: billing?.cancelAtPeriodEnd ?? billing?.status === "cancelled",
      lifetime: billing?.kind === "one_time",
      canManage: !!billing?.customerId,
    });
  } catch (err) {
    if (err instanceof FirebaseConfigError) return NextResponse.json({ active: false, plan: null });
    console.error("[billing/status]", err);
    return NextResponse.json({ active: false, plan: null });
  }
}
