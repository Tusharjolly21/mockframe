import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { FirebaseConfigError, firebaseSetupHint, firestoreDb } from "@/lib/server/firebaseAdmin";
import { attachOwnerCookie, getRequestOwner } from "@/lib/server/requestOwner";

export const runtime = "nodejs";

/**
 * Cloud sync for fonts the user uploaded for text layers — same shape as the
 * custom-devices API: owner-scoped Firestore collection, IndexedDB stays the
 * instant/offline copy. Each document is one face (family + weight + style)
 * stored as a base64 data URL, so it must fit a single Firestore document.
 */

const MAX_DOC_BODY = 950_000; // Firestore document limit is 1 MiB
const ID_RE = /^font-[a-zA-Z0-9_-]{1,80}$/;
const DATA_URL_RE = /^data:font\/(ttf|otf|woff2?);base64,[A-Za-z0-9+/]+=*$/;
const FAMILY_RE = /^[^"'\\,;{}<>()\u0000-\u001f]{1,60}$/;
const MAX_FONTS = 40;

function collection(ownerId: string) {
  return firestoreDb().collection(`mockframeOwners/${ownerId}/customFonts`);
}

function configError() {
  return NextResponse.json({ error: "Firebase is not configured", hint: firebaseSetupHint() }, { status: 501 });
}

/** The decoded bytes must start like a font, whatever the declared type says. */
function looksLikeFont(dataUrl: string): boolean {
  const head = Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1, dataUrl.indexOf(",") + 9), "base64");
  if (head.length < 4) return false;
  const tag = head.subarray(0, 4).toString("latin1");
  return tag === "wOF2" || tag === "wOFF" || tag === "OTTO" || tag === "true" || head.readUInt32BE(0) === 0x00010000;
}

export async function GET(req: NextRequest) {
  try {
    const owner = await getRequestOwner(req);
    const snap = await collection(owner.ownerId).orderBy("createdAt", "asc").limit(MAX_FONTS).get();
    const fonts = snap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        family: d.family,
        weight: d.weight,
        style: d.style,
        fileName: d.fileName ?? "",
        dataUrl: d.dataUrl,
        bytes: typeof d.bytes === "number" ? d.bytes : 0,
        createdAt: typeof d.createdAt === "number" ? d.createdAt : 0,
      };
    });
    return attachOwnerCookie(NextResponse.json(fonts), owner);
  } catch (err) {
    if (err instanceof FirebaseConfigError) return configError();
    console.error("[custom-fonts GET]", err);
    return NextResponse.json({ error: "Load failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const owner = await getRequestOwner(req);
    const raw = await req.text();
    if (raw.length > MAX_DOC_BODY) {
      return NextResponse.json({ error: "Font file too large to sync" }, { status: 413 });
    }
    let font;
    try {
      font = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Invalid font" }, { status: 400 });
    }
    if (
      typeof font?.id !== "string" || !ID_RE.test(font.id) ||
      typeof font.family !== "string" || !FAMILY_RE.test(font.family) ||
      !Number.isInteger(font.weight) || font.weight < 100 || font.weight > 900 ||
      (font.style !== "normal" && font.style !== "italic") ||
      typeof font.dataUrl !== "string" || !DATA_URL_RE.test(font.dataUrl) || !looksLikeFont(font.dataUrl)
    ) {
      return NextResponse.json({ error: "Invalid font" }, { status: 400 });
    }
    const col = collection(owner.ownerId);
    const exists = (await col.doc(font.id).get()).exists;
    if (!exists) {
      const count = (await col.count().get()).data().count;
      if (count >= MAX_FONTS) {
        return NextResponse.json({ error: `Limit of ${MAX_FONTS} uploaded fonts reached` }, { status: 409 });
      }
    }
    await col.doc(font.id).set({
      family: font.family,
      weight: font.weight,
      style: font.style,
      fileName: typeof font.fileName === "string" ? font.fileName.slice(0, 120) : "",
      dataUrl: font.dataUrl,
      bytes: typeof font.bytes === "number" ? font.bytes : 0,
      createdAt: typeof font.createdAt === "number" ? font.createdAt : Date.now(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return attachOwnerCookie(NextResponse.json({ ok: true }), owner);
  } catch (err) {
    if (err instanceof FirebaseConfigError) return configError();
    console.error("[custom-fonts POST]", err);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
