import { NextRequest, NextResponse } from "next/server";
import { FirebaseConfigError } from "@/lib/server/firebaseAdmin";
import { getRequestOwner } from "@/lib/server/requestOwner";
import { isBillingActive, readBilling } from "@/lib/server/billing";

export const runtime = "nodejs";

const NONE = { active: false, plan: null, kind: null, status: null, paidThrough: null, cancelAtPeriodEnd: false };

/** GET → { active, plan, kind, status, paidThrough, cancelAtPeriodEnd } for the current user (guests are never Pro). */
export async function GET(req: NextRequest) {
  try {
    const owner = await getRequestOwner(req);
    if (!owner.uid) return NextResponse.json(NONE);
    const billing = await readBilling(owner.uid);
    return NextResponse.json({
      active: isBillingActive(billing),
      plan: billing?.plan ?? null,
      kind: billing?.kind ?? null,
      status: billing?.status ?? null,
      paidThrough: billing?.paidThrough ?? null,
      cancelAtPeriodEnd: billing?.cancelAtPeriodEnd === true,
    });
  } catch (err) {
    if (err instanceof FirebaseConfigError) return NextResponse.json(NONE);
    console.error("[billing/status]", err);
    return NextResponse.json(NONE);
  }
}
