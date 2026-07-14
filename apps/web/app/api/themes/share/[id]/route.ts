import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { firebaseErrorPayload, firebaseSetupHint, FirebaseConfigError, firestoreDb, firebaseAuth } from "@/lib/server/firebaseAdmin";
import { attachOwnerCookie, getRequestOwner } from "@/lib/server/requestOwner";

export const runtime = "nodejs";
type Role = "read" | "contribute";

async function access(req: NextRequest, id: string) {
  const owner = await getRequestOwner(req);
  if (owner.isGuest || !owner.uid) return { owner, doc: null, role: null as Role | null };
  const ref = firestoreDb().collection("sharedThemes").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return { owner, doc: null, role: null as Role | null };
  const data = snap.data() as { ownerUid: string; members?: { uid?: string | null; email?: string; role?: Role }[] };
  if (data.ownerUid === owner.uid) return { owner, doc: { ref, snap, data }, role: "contribute" as Role };
  const member = (data.members ?? []).find((item) => item.uid === owner.uid || (!!owner.email && item.email?.toLowerCase() === owner.email.toLowerCase()));
  return { owner, doc: member ? { ref, snap, data } : null, role: member?.role ?? null };
}

function errorResponse(err: unknown) {
  if (err instanceof FirebaseConfigError) return NextResponse.json({ error: "Firebase is not configured", hint: firebaseSetupHint() }, { status: 501 });
  return NextResponse.json(firebaseErrorPayload(err), { status: 500 });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const result = await access(req, id);
    if (!result.doc) return NextResponse.json({ error: "Shared theme not found or access denied." }, { status: 404 });
    const response = NextResponse.json({ id, ...result.doc.snap.data(), role: result.role });
    return attachOwnerCookie(response, result.owner);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const result = await access(req, id);
    if (!result.doc) return NextResponse.json({ error: "Shared theme not found or access denied." }, { status: 404 });
    if (result.role !== "contribute") return NextResponse.json({ error: "This theme is read-only for your account." }, { status: 403 });
    const body = (await req.json()) as { theme?: unknown; email?: string; role?: Role };
    if (body.theme && typeof body.theme === "object") {
      await result.doc.ref.update({ theme: { ...(body.theme as object), id, builtin: false }, updatedAt: FieldValue.serverTimestamp() });
    }
    if (body.email && body.role && (body.role === "read" || body.role === "contribute") && result.doc.data.ownerUid === result.owner.uid) {
      const email = body.email.trim().toLowerCase();
      let uid: string | null = null;
      try { uid = (await firebaseAuth().getUserByEmail(email)).uid; } catch { /* pending invite */ }
      const members = (result.doc.data.members ?? []).filter((member: { email?: string }) => member.email?.toLowerCase() !== email);
      members.push({ email, uid, role: body.role });
      // keep the denormalized membership arrays in sync so GET's indexed queries find it
      const memberUids = [...new Set(members.map((m) => m.uid).filter((v): v is string => !!v))];
      const memberEmails = [...new Set(members.map((m) => m.email?.toLowerCase()).filter((v): v is string => !!v))];
      await result.doc.ref.update({ members, memberUids, memberEmails, updatedAt: FieldValue.serverTimestamp() });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
