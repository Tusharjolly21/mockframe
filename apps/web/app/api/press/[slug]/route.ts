import { NextRequest, NextResponse } from "next/server";
import { FirebaseConfigError, firestoreDb } from "@/lib/server/firebaseAdmin";
import { getRequestOwner } from "@/lib/server/requestOwner";
import { PRESS_SLUG_RE } from "@/lib/launchkit/types";

export const runtime = "nodejs";

/** DELETE /api/press/[slug] — owner unpublishes their page. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!PRESS_SLUG_RE.test(slug)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const owner = await getRequestOwner(req);
    if (!owner.uid) return NextResponse.json({ error: "Sign in" }, { status: 401 });
    const ref = firestoreDb().collection("pressPages").doc(slug);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (snap.data()?.ownerId !== owner.ownerId) return NextResponse.json({ error: "Not yours" }, { status: 403 });
    await ref.delete();
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof FirebaseConfigError) return NextResponse.json({ error: "Firebase is not configured" }, { status: 501 });
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
