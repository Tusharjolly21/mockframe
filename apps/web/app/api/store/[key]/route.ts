import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { FirebaseConfigError, firebaseErrorPayload, firebaseSetupHint, firestoreDb } from "@/lib/server/firebaseAdmin";
import { attachOwnerCookie, getRequestOwner } from "@/lib/server/requestOwner";

/**
 * Firebase-backed JSON k/v store — server persistence for themes and other
 * small documents. Guest users are isolated by a cookie-backed owner id; signed
 * in users can send a Firebase Auth bearer token and get a user-scoped store.
 */

export const runtime = "nodejs";

function validKey(key: string): boolean {
  return /^[a-z0-9-]{1,64}$/.test(key);
}

function configError() {
  return NextResponse.json({ error: "Firebase is not configured", hint: firebaseSetupHint() }, { status: 501 });
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ key: string }> }) {
  const req = _req;
  const { key } = await ctx.params;
  if (!validKey(key)) return NextResponse.json({ error: "Bad key" }, { status: 400 });
  try {
    const owner = await getRequestOwner(req);
    const snap = await firestoreDb().doc(`mockframeOwners/${owner.ownerId}/kv/${key}`).get();
    const res = NextResponse.json(snap.exists ? snap.data()?.value ?? null : null);
    return attachOwnerCookie(res, owner);
  } catch (err) {
    if (err instanceof FirebaseConfigError) return configError();
    return NextResponse.json(firebaseErrorPayload(err), { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ key: string }> }) {
  const { key } = await ctx.params;
  if (!validKey(key)) return NextResponse.json({ error: "Bad key" }, { status: 400 });
  const body = await req.text();
  if (body.length > 1_000_000) return NextResponse.json({ error: "Too large" }, { status: 413 });
  let value: unknown;
  try {
    value = JSON.parse(body); // must be valid JSON
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  try {
    const owner = await getRequestOwner(req);
    await firestoreDb().doc(`mockframeOwners/${owner.ownerId}/kv/${key}`).set({
      value,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return attachOwnerCookie(NextResponse.json({ ok: true }), owner);
  } catch (err) {
    if (err instanceof FirebaseConfigError) return configError();
    return NextResponse.json(firebaseErrorPayload(err), { status: 500 });
  }
}
