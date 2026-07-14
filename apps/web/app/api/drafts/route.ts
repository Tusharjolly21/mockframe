import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { migrateScene } from "@framekit/scene";
import { FirebaseConfigError, firebaseSetupHint, firestoreDb } from "@/lib/server/firebaseAdmin";
import { attachOwnerCookie, getRequestOwner } from "@/lib/server/requestOwner";

export const runtime = "nodejs";

const MAX_DRAFT_BODY = 950_000; // Firestore document limit is 1 MiB.
const DRAFT_ID_RE = /^[a-zA-Z0-9_-]{1,100}$/;

function configError() {
  return NextResponse.json({ error: "Firebase is not configured", hint: firebaseSetupHint() }, { status: 501 });
}

function draftId(input: unknown): string {
  return typeof input === "string" && DRAFT_ID_RE.test(input) ? input : randomUUID();
}

function draftsCollection(ownerId: string) {
  return firestoreDb().collection(`mockframeOwners/${ownerId}/drafts`);
}

export async function GET(req: NextRequest) {
  try {
    const owner = await getRequestOwner(req);
    const snap = await draftsCollection(owner.ownerId).orderBy("updatedAt", "desc").limit(100).get();
    const records = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name ?? "Untitled draft",
        kind: data.kind === "template" ? "template" : "scene",
        updatedAt: typeof data.updatedAtMs === "number" ? data.updatedAtMs : Date.now(),
        scene: data.scene,
        assets: Array.isArray(data.assets) ? data.assets : [],
        thumbnail: data.thumbnail,
      };
    });
    return attachOwnerCookie(NextResponse.json(records), owner);
  } catch (err) {
    if (err instanceof FirebaseConfigError) return configError();
    return NextResponse.json({ error: "Draft list failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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

  let scene: unknown;
  try {
    scene = migrateScene(body.scene);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid scene" }, { status: 400 });
  }

  try {
    const owner = await getRequestOwner(req);
    const id = draftId(body.id);
    const updatedAt = Date.now();
    const record = {
      name: typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 120) : "Untitled draft",
      kind: body.kind === "template" ? "template" : "scene",
      updatedAtMs: updatedAt,
      scene,
      assets: Array.isArray(body.assets) ? body.assets : [],
      thumbnail: typeof body.thumbnail === "string" ? body.thumbnail : undefined,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      ownerId: owner.ownerId,
    };
    await draftsCollection(owner.ownerId).doc(id).set(record, { merge: true });
    return attachOwnerCookie(
      NextResponse.json({ id, name: record.name, kind: record.kind, updatedAt, scene, assets: record.assets, thumbnail: record.thumbnail }),
      owner
    );
  } catch (err) {
    if (err instanceof FirebaseConfigError) return configError();
    return NextResponse.json({ error: "Draft save failed" }, { status: 500 });
  }
}
