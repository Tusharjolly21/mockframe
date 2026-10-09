import { NextRequest, NextResponse } from "next/server";
import type { DocumentData } from "firebase-admin/firestore";
import { FirebaseConfigError, firebaseSetupHint, firebaseStorage, firestoreDb } from "@/lib/server/firebaseAdmin";
import { attachOwnerCookie, getRequestOwner } from "@/lib/server/requestOwner";
import { BrandKitSchema, type BrandKitRecord } from "@/lib/brandKitSchema";

export const runtime = "nodejs";

/**
 * Brand kit sync: one document per owner, so the kit (name, accent, logo)
 * follows the account to every device instead of living in one browser's
 * localStorage. Same owner model as drafts — guests sync by cookie, signed-in
 * users by uid. The logo is an ordinary uploaded asset (/api/assets); GET
 * re-signs its URL because stored signed URLs expire after 7 days.
 */

function configError() {
  return NextResponse.json({ error: "Firebase is not configured", hint: firebaseSetupHint() }, { status: 501 });
}

function kitDoc(ownerId: string) {
  return firestoreDb().doc(`mockframeOwners/${ownerId}/settings/brandKit`);
}

function readKit(data: DocumentData | undefined): BrandKitRecord | null {
  const parsed = BrandKitSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

async function logoFor(ownerId: string, assetId: string | null) {
  if (!assetId) return null;
  try {
    const snap = await firestoreDb().doc(`mockframeOwners/${ownerId}/assets/${assetId}`).get();
    const data = snap.data();
    if (!data?.storagePath) return null;
    const [url] = await firebaseStorage()
      .bucket()
      .file(data.storagePath)
      .getSignedUrl({ action: "read", expires: Date.now() + 1000 * 60 * 60 * 24 * 7 });
    return { id: assetId, name: data.name ?? "logo", width: data.width ?? 0, height: data.height ?? 0, url };
  } catch (err) {
    // a missing or unsignable logo must not lose the rest of the kit
    console.error("[brand-kit] logo sign failed", assetId, err);
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const owner = await getRequestOwner(req);
    const kit = readKit((await kitDoc(owner.ownerId).get()).data());
    const logo = kit ? await logoFor(owner.ownerId, kit.logoAssetId) : null;
    return attachOwnerCookie(NextResponse.json({ kit, logo }, { headers: { "Cache-Control": "no-store" } }), owner);
  } catch (err) {
    if (err instanceof FirebaseConfigError) return configError();
    console.error("[brand-kit GET]", err);
    return NextResponse.json({ error: "Brand kit load failed" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const parsed = BrandKitSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid brand kit" }, { status: 400 });
  const incoming = parsed.data;
  if (incoming.updatedAt > Date.now() + 5 * 60_000) {
    // a skewed clock in the future would win every later merge — refuse it
    return NextResponse.json({ error: "Invalid timestamp" }, { status: 400 });
  }

  try {
    const owner = await getRequestOwner(req);
    const ref = kitDoc(owner.ownerId);
    // last edit wins: never let an older tab overwrite a newer kit
    const stale = await firestoreDb().runTransaction(async (tx) => {
      const current = readKit((await tx.get(ref)).data());
      if (current && current.updatedAt > incoming.updatedAt) return current;
      tx.set(ref, incoming);
      return null;
    });
    if (stale) {
      return attachOwnerCookie(NextResponse.json({ error: "A newer brand kit exists", kit: stale }, { status: 409 }), owner);
    }
    return attachOwnerCookie(NextResponse.json({ ok: true }), owner);
  } catch (err) {
    if (err instanceof FirebaseConfigError) return configError();
    console.error("[brand-kit PUT]", err);
    return NextResponse.json({ error: "Brand kit save failed" }, { status: 500 });
  }
}
