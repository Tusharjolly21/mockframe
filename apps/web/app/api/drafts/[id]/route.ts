import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { migrateScene } from "@framekit/scene";
import { FirebaseConfigError, firebaseSetupHint, firestoreDb } from "@/lib/server/firebaseAdmin";
import { attachOwnerCookie, getRequestOwner } from "@/lib/server/requestOwner";

export const runtime = "nodejs";

const MAX_DRAFT_BODY = 950_000;
const DRAFT_ID_RE = /^[a-zA-Z0-9_-]{1,100}$/;

function configError() {
  return NextResponse.json({ error: "Firebase is not configured", hint: firebaseSetupHint() }, { status: 501 });
}

function validId(id: string): boolean {
  return DRAFT_ID_RE.test(id);
}

function draftDoc(ownerId: string, id: string) {
  return firestoreDb().doc(`mockframeOwners/${ownerId}/drafts/${id}`);
}

function toRecord(id: string, data: FirebaseFirestore.DocumentData) {
  return {
    id,
    name: data.name ?? "Untitled draft",
    kind: data.kind === "template" ? "template" : "scene",
    updatedAt: typeof data.updatedAtMs === "number" ? data.updatedAtMs : Date.now(),
    scene: data.scene,
    assets: Array.isArray(data.assets) ? data.assets : [],
    thumbnail: data.thumbnail,
  };
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!validId(id)) return NextResponse.json({ error: "Bad draft id" }, { status: 400 });
  try {
    const owner = await getRequestOwner(req);
    const snap = await draftDoc(owner.ownerId, id).get();
    if (!snap.exists) return attachOwnerCookie(NextResponse.json({ error: "Not found" }, { status: 404 }), owner);
    return attachOwnerCookie(NextResponse.json(toRecord(snap.id, snap.data() ?? {})), owner);
  } catch (err) {
    if (err instanceof FirebaseConfigError) return configError();
    return NextResponse.json({ error: "Draft read failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!validId(id)) return NextResponse.json({ error: "Bad draft id" }, { status: 400 });
  const raw = await req.text();
  if (raw.length > MAX_DRAFT_BODY) {
    return NextResponse.json({ error: "Draft is too large for Firestore; upload assets to Storage first" }, { status: 413 });
  }
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {
    updatedAtMs: Date.now(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim().slice(0, 120);
  if (body.kind === "scene" || body.kind === "template") patch.kind = body.kind;
  if (typeof body.thumbnail === "string") patch.thumbnail = body.thumbnail;
  if (Array.isArray(body.assets)) patch.assets = body.assets;
  if ("scene" in body) {
    try {
      patch.scene = migrateScene(body.scene);
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid scene" }, { status: 400 });
    }
  }

  try {
    const owner = await getRequestOwner(req);
    await draftDoc(owner.ownerId, id).set(patch, { merge: true });
    const snap = await draftDoc(owner.ownerId, id).get();
    return attachOwnerCookie(NextResponse.json(toRecord(snap.id, snap.data() ?? {})), owner);
  } catch (err) {
    if (err instanceof FirebaseConfigError) return configError();
    return NextResponse.json({ error: "Draft update failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!validId(id)) return NextResponse.json({ error: "Bad draft id" }, { status: 400 });
  try {
    const owner = await getRequestOwner(req);
    await draftDoc(owner.ownerId, id).delete();
    return attachOwnerCookie(NextResponse.json({ ok: true }), owner);
  } catch (err) {
    if (err instanceof FirebaseConfigError) return configError();
    return NextResponse.json({ error: "Draft delete failed" }, { status: 500 });
  }
}
