import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { firebaseErrorPayload, firebaseSetupHint, FirebaseConfigError, firestoreDb, firebaseAuth } from "@/lib/server/firebaseAdmin";
import { attachOwnerCookie, getRequestOwner } from "@/lib/server/requestOwner";

export const runtime = "nodejs";

type Role = "read" | "contribute";

function accountOnly(owner: Awaited<ReturnType<typeof getRequestOwner>>) {
  return !owner.isGuest && !!owner.uid;
}

function errorResponse(err: unknown) {
  if (err instanceof FirebaseConfigError) return NextResponse.json({ error: "Firebase is not configured", hint: firebaseSetupHint() }, { status: 501 });
  return NextResponse.json(firebaseErrorPayload(err), { status: 500 });
}

export async function GET(req: NextRequest) {
  try {
    const owner = await getRequestOwner(req);
    if (!accountOnly(owner)) return NextResponse.json({ error: "Sign in to access shared themes." }, { status: 401 });
    const snapshot = await firestoreDb().collection("sharedThemes").get();
    const email = owner.email?.toLowerCase();
    const themes = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((theme) => {
        const data = theme as { ownerUid?: string; members?: { uid?: string | null; email?: string }[] };
        return data.ownerUid === owner.uid || (data.members ?? []).some((member) => member.uid === owner.uid || (!!email && member.email?.toLowerCase() === email));
      });
    return attachOwnerCookie(NextResponse.json(themes), owner);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const owner = await getRequestOwner(req);
    if (!accountOnly(owner)) return NextResponse.json({ error: "Sign in before sharing a theme." }, { status: 401 });
    const body = (await req.json()) as { theme?: unknown; name?: string; email?: string; role?: Role };
    const email = body.email?.trim().toLowerCase();
    if (!email || !email.includes("@")) return NextResponse.json({ error: "Enter a valid employee email." }, { status: 400 });
    if (body.role !== "read" && body.role !== "contribute") return NextResponse.json({ error: "Choose a valid permission." }, { status: 400 });
    if (!body.theme || typeof body.theme !== "object") return NextResponse.json({ error: "Theme data is required." }, { status: 400 });

    let invitedUid: string | null = null;
    try {
      invitedUid = (await firebaseAuth().getUserByEmail(email)).uid;
    } catch {
      // Pending invites are matched by email when the employee signs in.
    }
    const doc = firestoreDb().collection("sharedThemes").doc();
    const theme = body.theme as Record<string, unknown>;
    await doc.set({
      name: body.name?.trim() || String(theme.name || "Shared theme"),
      theme: { ...theme, id: doc.id, builtin: false },
      ownerUid: owner.uid,
      ownerEmail: owner.email ?? null,
      members: [{ email, uid: invitedUid, role: body.role }],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return attachOwnerCookie(NextResponse.json({ id: doc.id, shareUrl: `/editor?sharedTheme=${encodeURIComponent(doc.id)}` }), owner);
  } catch (err) {
    return errorResponse(err);
  }
}
