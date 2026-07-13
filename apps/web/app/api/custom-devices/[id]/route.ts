import { NextRequest, NextResponse } from "next/server";
import { FirebaseConfigError, firebaseSetupHint, firestoreDb } from "@/lib/server/firebaseAdmin";
import { attachOwnerCookie, getRequestOwner } from "@/lib/server/requestOwner";

export const runtime = "nodejs";

const ID_RE = /^custom-[a-zA-Z0-9_-]{1,80}$/;

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!ID_RE.test(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
    const owner = await getRequestOwner(req);
    await firestoreDb().collection(`mockframeOwners/${owner.ownerId}/customDevices`).doc(id).delete();
    return attachOwnerCookie(NextResponse.json({ ok: true }), owner);
  } catch (err) {
    if (err instanceof FirebaseConfigError) {
      return NextResponse.json({ error: "Firebase is not configured", hint: firebaseSetupHint() }, { status: 501 });
    }
    console.error("[custom-devices DELETE]", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
