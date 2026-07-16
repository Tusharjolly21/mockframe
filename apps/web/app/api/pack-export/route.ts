import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { FirebaseConfigError, firestoreDb } from "@/lib/server/firebaseAdmin";
import { attachOwnerCookie, getRequestOwner } from "@/lib/server/requestOwner";
import { isBillingActive, readBilling } from "@/lib/server/razorpay";
import { packExportDecision, type PackExportVerdict } from "@/lib/pack/gate";

export const runtime = "nodejs";

/**
 * Authorize one pack export. The first free pack is tracked in the caller's
 * kv space and incremented INSIDE a transaction so parallel requests can't
 * both claim the free slot. Enforced here, not in the client.
 */
export async function POST(req: NextRequest) {
  try {
    const owner = await getRequestOwner(req);
    if (!owner.uid) {
      return NextResponse.json({ allowed: false, reason: "signin" } satisfies PackExportVerdict, { status: 401 });
    }
    const isPro = isBillingActive(await readBilling(owner.uid));
    const db = firestoreDb();
    // SECURITY: Counter lives in private/ (not kv/) so clients cannot reset it via PUT /api/store/pack-exports.
    const ref = db.doc(`mockframeOwners/${owner.ownerId}/private/pack-exports`);
    const verdict = await db.runTransaction(async (txn): Promise<PackExportVerdict> => {
      const snap = await txn.get(ref);
      const priorExports = snap.exists ? Number((snap.data()?.value as { count?: number } | undefined)?.count) || 0 : 0;
      const decision = packExportDecision({ signedIn: true, isPro, priorExports });
      if (decision.allowed) {
        txn.set(ref, { value: { count: priorExports + 1 }, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      }
      return decision;
    });
    return attachOwnerCookie(NextResponse.json(verdict, { status: verdict.allowed ? 200 : 402 }), owner);
  } catch (err) {
    if (err instanceof FirebaseConfigError) {
      // Local dev without Firebase: allow the export but watermark it.
      return NextResponse.json({ allowed: true, clean: false } satisfies PackExportVerdict);
    }
    return NextResponse.json({ error: "Export authorization failed" }, { status: 500 });
  }
}
