import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { FirebaseConfigError, firebaseSetupHint, firebaseStorage, firestoreDb } from "@/lib/server/firebaseAdmin";
import { attachOwnerCookie, getRequestOwner } from "@/lib/server/requestOwner";
import { requestIsPro } from "@/lib/server/entitlement";

export const runtime = "nodejs";

/**
 * Storage ceilings, per tier. The old flat 40MB × 500 let a single anonymous
 * owner park ~20GB in Storage for free — a bill set by strangers rather than
 * by us. Free limits are still well above what a real session uses (a 4K
 * screenshot is ~5MB); Pro keeps the original headroom because Pro pays for it.
 */
const MAX_IMAGE_BYTES_FREE = 12 * 1024 * 1024;
const MAX_IMAGE_BYTES_PRO = 40 * 1024 * 1024;
const MAX_ASSETS_FREE = 120;
const MAX_ASSETS_PRO = 500;

const mb = (bytes: number) => Math.round(bytes / (1024 * 1024));

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
    // one malformed row (missing storagePath) or a transient signing error must
    // not 500 the whole listing — skip it and return the rest
    const assets = (
      await Promise.all(
        snap.docs.map(async (doc) => {
          const data = doc.data();
          if (!data.storagePath) return null;
          try {
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
          } catch (e) {
            console.error("[assets] sign failed", doc.id, e);
            return null;
          }
        })
      )
    ).filter(Boolean);
    return attachOwnerCookie(NextResponse.json(assets), owner);
  } catch (err) {
    if (err instanceof FirebaseConfigError) return configError();
    return NextResponse.json({ error: "Asset list failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const owner = await getRequestOwner(req);
    const isPro = await requestIsPro(req);
    const maxBytes = isPro ? MAX_IMAGE_BYTES_PRO : MAX_IMAGE_BYTES_FREE;
    const maxAssets = isPro ? MAX_ASSETS_PRO : MAX_ASSETS_FREE;

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Missing file" }, { status: 400 });
    if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Only image uploads are supported" }, { status: 415 });
    if (file.size > maxBytes) {
      return NextResponse.json(
        {
          error: isPro
            ? `Image exceeds ${mb(maxBytes)}MB`
            : `Image exceeds ${mb(maxBytes)}MB — upgrade to upload files up to ${mb(MAX_IMAGE_BYTES_PRO)}MB`,
        },
        { status: 413 }
      );
    }

    // bound total objects per owner so a runaway/abusive client can't write
    // unlimited large blobs into Storage
    const existing = await assetsCollection(owner.ownerId).count().get();
    if (existing.data().count >= maxAssets) {
      return NextResponse.json(
        {
          error: isPro
            ? "Asset limit reached — delete some uploads to add more"
            : `Upload limit reached (${maxAssets}) — delete some uploads, or upgrade for ${MAX_ASSETS_PRO}`,
        },
        { status: 429 }
      );
    }

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
