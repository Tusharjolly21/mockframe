import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { FirebaseConfigError, firebaseSetupHint, firestoreDb } from "@/lib/server/firebaseAdmin";
import { attachOwnerCookie, getRequestOwner } from "@/lib/server/requestOwner";
import { requestIsPro } from "@/lib/server/entitlement";
import { FREE_SAVED_TEMPLATES } from "@/lib/billing/limits";

export const runtime = "nodejs";

/**
 * User scene templates (3 free, 24 with Pro): a saved snapshot of the whole composition —
 * background, effects, layer positions, text, stickers — with screenshots
 * stripped, so applying one restyles the user's CURRENT shots. Same
 * owner-scoped Firestore + local-cache architecture as drafts/custom devices.
 * Saving beyond the free three requires Pro; loading/deleting stays open so a lapsed subscription
 * never strands what a user already made.
 */

const MAX_DOC_BODY = 950_000; // Firestore document limit is 1 MiB
const ID_RE = /^tpl-[a-zA-Z0-9_-]{1,80}$/;
const MAX_TEMPLATES = 24;

function collection(ownerId: string) {
  return firestoreDb().collection(`mockframeOwners/${ownerId}/templates`);
}

function configError() {
  return NextResponse.json({ error: "Firebase is not configured", hint: firebaseSetupHint() }, { status: 501 });
}

export async function GET(req: NextRequest) {
  try {
    const owner = await getRequestOwner(req);
    const snap = await collection(owner.ownerId).orderBy("createdAt", "desc").limit(MAX_TEMPLATES).get();
    const templates = snap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        name: d.name ?? "Template",
        scene: JSON.parse(d.sceneJson ?? "null"),
        assets: JSON.parse(d.assetsJson ?? "[]"),
        createdAt: typeof d.createdAt === "number" ? d.createdAt : 0,
      };
    });
    return attachOwnerCookie(NextResponse.json(templates), owner);
  } catch (err) {
    if (err instanceof FirebaseConfigError) return configError();
    console.error("[user-templates GET]", err);
    return NextResponse.json({ error: "Load failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const isPro = await requestIsPro(req);
    const owner = await getRequestOwner(req);
    const raw = await req.text();
    if (raw.length > MAX_DOC_BODY) {
      return NextResponse.json({ error: "Template too large to sync — remove big background images" }, { status: 413 });
    }
    const tpl = JSON.parse(raw);
    if (typeof tpl?.id !== "string" || !ID_RE.test(tpl.id) || typeof tpl.name !== "string" || !tpl.scene) {
      return NextResponse.json({ error: "Invalid template" }, { status: 400 });
    }
    const col = collection(owner.ownerId);
    const exists = (await col.doc(tpl.id).get()).exists;
    if (!exists) {
      const saved = (await col.count().get()).data().count;
      // updating a template you already have never counts against the limit
      if (!isPro && saved >= FREE_SAVED_TEMPLATES) {
        return NextResponse.json(
          { error: `The free plan keeps ${FREE_SAVED_TEMPLATES} saved templates — upgrade for up to ${MAX_TEMPLATES}, or delete one` },
          { status: 402 }
        );
      }
      if (saved >= MAX_TEMPLATES) {
        return NextResponse.json({ error: `Limit of ${MAX_TEMPLATES} templates reached — delete one first` }, { status: 409 });
      }
    }
    await col.doc(tpl.id).set({
      name: String(tpl.name).slice(0, 60),
      // JSON strings dodge Firestore's nested-array limits (quads, gradients…)
      sceneJson: JSON.stringify(tpl.scene),
      assetsJson: JSON.stringify(Array.isArray(tpl.assets) ? tpl.assets : []),
      createdAt: typeof tpl.createdAt === "number" ? tpl.createdAt : 0,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return attachOwnerCookie(NextResponse.json({ ok: true }), owner);
  } catch (err) {
    if (err instanceof FirebaseConfigError) return configError();
    console.error("[user-templates POST]", err);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
