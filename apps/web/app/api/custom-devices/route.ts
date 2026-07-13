import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { FirebaseConfigError, firebaseSetupHint, firestoreDb } from "@/lib/server/firebaseAdmin";
import { attachOwnerCookie, getRequestOwner } from "@/lib/server/requestOwner";

export const runtime = "nodejs";

/**
 * Cloud sync for user-calibrated custom mockup devices — same shape as the
 * drafts API: owner-scoped Firestore collection, localStorage stays the
 * instant/offline cache. Because guest sessions LINK into real accounts on
 * sign-in (same uid), devices created as a guest follow the account.
 */

const MAX_DOC_BODY = 950_000; // Firestore document limit is 1 MiB
const ID_RE = /^custom-[a-zA-Z0-9_-]{1,80}$/;
const MAX_DEVICES = 30;

function collection(ownerId: string) {
  return firestoreDb().collection(`mockframeOwners/${ownerId}/customDevices`);
}

function configError() {
  return NextResponse.json({ error: "Firebase is not configured", hint: firebaseSetupHint() }, { status: 501 });
}

export async function GET(req: NextRequest) {
  try {
    const owner = await getRequestOwner(req);
    const snap = await collection(owner.ownerId).orderBy("createdAt", "desc").limit(MAX_DEVICES).get();
    const defs = snap.docs.map((doc) => {
      const d = doc.data();
      // Firestore forbids nested arrays — quad round-trips as 8 flat numbers
      const flat: number[] = Array.isArray(d.quadFlat) ? d.quadFlat : [];
      return {
        id: doc.id,
        name: d.name ?? "My device",
        plate: d.plate,
        plateW: d.plateW,
        plateH: d.plateH,
        quad: [
          [flat[0] ?? 0, flat[1] ?? 0],
          [flat[2] ?? 0, flat[3] ?? 0],
          [flat[4] ?? 0, flat[5] ?? 0],
          [flat[6] ?? 0, flat[7] ?? 0],
        ],
        radius: d.radius ?? 0,
        createdAt: typeof d.createdAt === "number" ? d.createdAt : 0,
      };
    });
    return attachOwnerCookie(NextResponse.json(defs), owner);
  } catch (err) {
    if (err instanceof FirebaseConfigError) return configError();
    console.error("[custom-devices GET]", err);
    return NextResponse.json({ error: "Load failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const owner = await getRequestOwner(req);
    const raw = await req.text();
    if (raw.length > MAX_DOC_BODY) {
      return NextResponse.json({ error: "Device photo too large to sync" }, { status: 413 });
    }
    const def = JSON.parse(raw);
    if (
      typeof def?.id !== "string" || !ID_RE.test(def.id) ||
      typeof def.name !== "string" ||
      typeof def.plate !== "string" || !def.plate.startsWith("data:image/") ||
      !Array.isArray(def.quad) || def.quad.length !== 4 ||
      typeof def.plateW !== "number" || typeof def.plateH !== "number"
    ) {
      return NextResponse.json({ error: "Invalid device definition" }, { status: 400 });
    }
    const col = collection(owner.ownerId);
    const count = (await col.count().get()).data().count;
    const exists = (await col.doc(def.id).get()).exists;
    if (!exists && count >= MAX_DEVICES) {
      return NextResponse.json({ error: `Limit of ${MAX_DEVICES} custom mockups reached` }, { status: 409 });
    }
    const quadFlat = (def.quad as [number, number][]).flat().map((n) => (Number.isFinite(n) ? n : 0));
    if (quadFlat.length !== 8) {
      return NextResponse.json({ error: "Invalid device definition" }, { status: 400 });
    }
    await col.doc(def.id).set({
      name: def.name.slice(0, 60),
      plate: def.plate,
      plateW: def.plateW,
      plateH: def.plateH,
      quadFlat, // Firestore forbids nested arrays
      radius: typeof def.radius === "number" ? def.radius : 0,
      createdAt: typeof def.createdAt === "number" ? def.createdAt : 0,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return attachOwnerCookie(NextResponse.json({ ok: true }), owner);
  } catch (err) {
    if (err instanceof FirebaseConfigError) return configError();
    console.error("[custom-devices POST]", err);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
