import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { FirebaseConfigError, firebaseSetupHint, firebaseStorage, firestoreDb } from "@/lib/server/firebaseAdmin";
import { attachOwnerCookie, getRequestOwner } from "@/lib/server/requestOwner";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 40 * 1024 * 1024;

function configError() {
  return NextResponse.json({ error: "Firebase is not configured", hint: firebaseSetupHint() }, { status: 501 });
}

function cleanName(name: string): string {
  return (name || "upload").replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 96);
}

function assetsCollection(ownerId: string) {
  return firestoreDb().collection(`mockframeOwners/${ownerId}/assets`);
}

async function signedReadUrl(storagePath: string): Promise<string> {
  const [url] = await firebaseStorage().bucket().file(storagePath).getSignedUrl({
    action: "read",
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
  });
  return url;
}

export async function GET(req: NextRequest) {
  try {
    const owner = await getRequestOwner(req);
    const snap = await assetsCollection(owner.ownerId).orderBy("createdAtMs", "desc").limit(100).get();
    const assets = await Promise.all(
      snap.docs.map(async (doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          mime: data.mime,
          width: data.width,
          height: data.height,
          bytes: data.bytes,
          url: await signedReadUrl(data.storagePath),
          createdAt: data.createdAtMs,
        };
      })
    );
    return attachOwnerCookie(NextResponse.json(assets), owner);
  } catch (err) {
    if (err instanceof FirebaseConfigError) return configError();
    return NextResponse.json({ error: "Asset list failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const owner = await getRequestOwner(req);
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Missing file" }, { status: 400 });
    if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Only image uploads are supported" }, { status: 415 });
    if (file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: "Image exceeds 40MB" }, { status: 413 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    const requestedId = String(form.get("id") ?? "");
    const id = /^[a-zA-Z0-9_-]{1,100}$/.test(requestedId) ? requestedId : randomUUID();
    const name = cleanName(file.name);
    const storagePath = `uploads/${owner.ownerId}/${sha256.slice(0, 16)}-${name}`;
    const width = Number(form.get("width") ?? 0) || null;
    const height = Number(form.get("height") ?? 0) || null;

    const bucketFile = firebaseStorage().bucket().file(storagePath);
    await bucketFile.save(buffer, {
      resumable: false,
      metadata: {
        contentType: file.type,
        metadata: { ownerId: owner.ownerId, originalName: file.name, sha256 },
      },
    });

    const record = {
      name: file.name || name,
      mime: file.type,
      width,
      height,
      bytes: file.size,
      sha256,
      storagePath,
      ownerId: owner.ownerId,
      createdAtMs: Date.now(),
      createdAt: FieldValue.serverTimestamp(),
    };
    await assetsCollection(owner.ownerId).doc(id).set(record);

    return attachOwnerCookie(
      NextResponse.json({
        id,
        name: record.name,
        mime: record.mime,
        width,
        height,
        bytes: record.bytes,
        url: await signedReadUrl(storagePath),
      }),
      owner
    );
  } catch (err) {
    if (err instanceof FirebaseConfigError) return configError();
    return NextResponse.json({ error: "Asset upload failed" }, { status: 500 });
  }
}
