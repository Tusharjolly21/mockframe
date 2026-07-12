import { NextRequest, NextResponse } from "next/server";
import { FirebaseConfigError, firebaseSetupHint, firebaseStorage, firestoreDb } from "@/lib/server/firebaseAdmin";
import { attachOwnerCookie, getRequestOwner } from "@/lib/server/requestOwner";

export const runtime = "nodejs";

const ASSET_ID_RE = /^[a-zA-Z0-9_-]{1,100}$/;

function configError() {
  return NextResponse.json({ error: "Firebase is not configured", hint: firebaseSetupHint() }, { status: 501 });
}

function validId(id: string): boolean {
  return ASSET_ID_RE.test(id);
}

function assetDoc(ownerId: string, id: string) {
  return firestoreDb().doc(`mockframeOwners/${ownerId}/assets/${id}`);
}

async function signedReadUrl(storagePath: string): Promise<string> {
  const [url] = await firebaseStorage().bucket().file(storagePath).getSignedUrl({
    action: "read",
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
  });
  return url;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!validId(id)) return NextResponse.json({ error: "Bad asset id" }, { status: 400 });
  try {
    const owner = await getRequestOwner(req);
    const snap = await assetDoc(owner.ownerId, id).get();
    if (!snap.exists) return attachOwnerCookie(NextResponse.json({ error: "Not found" }, { status: 404 }), owner);
    const data = snap.data() ?? {};
    return attachOwnerCookie(
      NextResponse.json({
        id: snap.id,
        name: data.name,
        mime: data.mime,
        width: data.width,
        height: data.height,
        bytes: data.bytes,
        url: await signedReadUrl(data.storagePath),
        createdAt: data.createdAtMs,
      }),
      owner
    );
  } catch (err) {
    if (err instanceof FirebaseConfigError) return configError();
    return NextResponse.json({ error: "Asset read failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!validId(id)) return NextResponse.json({ error: "Bad asset id" }, { status: 400 });
  try {
    const owner = await getRequestOwner(req);
    const ref = assetDoc(owner.ownerId, id);
    const snap = await ref.get();
    if (snap.exists) {
      const data = snap.data() ?? {};
      if (typeof data.storagePath === "string") {
        await firebaseStorage().bucket().file(data.storagePath).delete({ ignoreNotFound: true });
      }
      await ref.delete();
    }
    return attachOwnerCookie(NextResponse.json({ ok: true }), owner);
  } catch (err) {
    if (err instanceof FirebaseConfigError) return configError();
    return NextResponse.json({ error: "Asset delete failed" }, { status: 500 });
  }
}
