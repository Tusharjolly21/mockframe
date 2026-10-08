import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { firebaseErrorPayload, firebaseSetupHint, FirebaseConfigError, firestoreDb, firebaseAuth } from "@/lib/server/firebaseAdmin";
import { attachOwnerCookie, getRequestOwner } from "@/lib/server/requestOwner";
import { parseTheme } from "@/lib/themeSchema";

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
    // Indexed union instead of scanning the whole global collection: themes I
    // own + themes I'm a member of (by uid, or by email for pending invites).
    // memberUids/memberEmails are denormalized on write for exactly this.
    // pending (email) invites only count for a provider-verified address
    const email = owner.emailVerified ? owner.email?.toLowerCase() : undefined;
    const col = firestoreDb().collection("sharedThemes");
    const queries = [
      col.where("ownerUid", "==", owner.uid).get(),
      col.where("memberUids", "array-contains", owner.uid).get(),
    ];
    if (email) queries.push(col.where("memberEmails", "array-contains", email).get());
    const snaps = await Promise.all(queries);
    const byId = new Map<string, unknown>();
    for (const snap of snaps) for (const doc of snap.docs) byId.set(doc.id, { id: doc.id, ...doc.data() });
    return attachOwnerCookie(NextResponse.json([...byId.values()]), owner);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const owner = await getRequestOwner(req);
    if (!accountOnly(owner)) return NextResponse.json({ error: "Sign in before sharing a theme." }, { status: 401 });
    const body = (await req.json().catch(() => null)) as { theme?: unknown; name?: string; email?: string; role?: Role } | null;
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    const email = body.email?.trim().toLowerCase();
    if (!email || !email.includes("@")) return NextResponse.json({ error: "Enter a valid employee email." }, { status: 400 });
    if (body.role !== "read" && body.role !== "contribute") return NextResponse.json({ error: "Choose a valid permission." }, { status: 400 });
    if (!body.theme || typeof body.theme !== "object") return NextResponse.json({ error: "Theme data is required." }, { status: 400 });
    // members open this in their editor: only a well-formed theme may be shared
    const checkedTheme = parseTheme({ id: "shared", name: "Shared theme", ...(body.theme as object) });
    if (!checkedTheme) return NextResponse.json({ error: "That theme can't be shared." }, { status: 400 });

    let invitedUid: string | null = null;
    try {
      const user = await firebaseAuth().getUserByEmail(email);
      if (user.emailVerified) invitedUid = user.uid;
    } catch {
      // Pending invites are matched by email when the employee signs in.
    }
    const doc = firestoreDb().collection("sharedThemes").doc();
    const theme = checkedTheme;
    await doc.set({
      name: body.name?.trim().slice(0, 120) || theme.name || "Shared theme",
      theme: { ...theme, id: doc.id, builtin: false },
      ownerUid: owner.uid,
      ownerEmail: owner.email ?? null,
      members: [{ email, uid: invitedUid, role: body.role }],
      // denormalized for indexed membership queries in GET
      memberUids: invitedUid ? [invitedUid] : [],
      memberEmails: [email],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return attachOwnerCookie(NextResponse.json({ id: doc.id, shareUrl: `/editor?sharedTheme=${encodeURIComponent(doc.id)}` }), owner);
  } catch (err) {
    return errorResponse(err);
  }
}
