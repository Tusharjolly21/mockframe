import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { FirebaseConfigError, firestoreDb } from "@/lib/server/firebaseAdmin";
import { requestIsPro } from "@/lib/server/entitlement";
import { attachOwnerCookie, getRequestOwner } from "@/lib/server/requestOwner";

export const runtime = "nodejs";

/**
 * POST /api/launch-kit/consume → { allowed, remainingFree }
 * The kit's paid gate: first kit free per signed-in account, then Pro.
 * Transactional counter so parallel exports can't double-spend the free slot.
 * (Mirrors the AI-pack accounting pattern.)
 */
export async function POST(req: NextRequest) {
  try {
    const owner = await getRequestOwner(req);
    if (!owner.uid) {
      return NextResponse.json({ allowed: false, reason: "signin" }, { status: 401 });
    }
    const isPro = await requestIsPro(req);
    if (isPro) return attachOwnerCookie(NextResponse.json({ allowed: true, remainingFree: null }), owner);

    const db = firestoreDb();
    const counterRef = db.doc(`mockframeOwners/${owner.ownerId}/private/launch-kits`);
    const ok = await db.runTransaction(async (txn) => {
      const now = Number(((await txn.get(counterRef)).data()?.value as { count?: number } | undefined)?.count) || 0;
      if (now >= 1) return false;
      txn.set(counterRef, { value: { count: now + 1 }, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      return true;
    });
    if (!ok) return NextResponse.json({ allowed: false, reason: "pro" }, { status: 402 });
    return attachOwnerCookie(NextResponse.json({ allowed: true, remainingFree: 0 }), owner);
  } catch (err) {
    if (err instanceof FirebaseConfigError) {
      return NextResponse.json({ error: "Firebase is not configured" }, { status: 501 });
    }
    return NextResponse.json({ error: "Could not check your plan" }, { status: 500 });
  }
}
