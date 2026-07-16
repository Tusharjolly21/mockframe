import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { FirebaseConfigError, firebaseStorage, firebaseSetupHint } from "@/lib/server/firebaseAdmin";
import { attachOwnerCookie, getRequestOwner } from "@/lib/server/requestOwner";
import { requestIsPro } from "@/lib/server/entitlement";

export const runtime = "nodejs";

const MAX_SHARE_BYTES = 20 * 1024 * 1024;
const SHARE_TTL_DAYS = 7;

/**
 * Shareable links (PostSpark parity): POST a rendered PNG → stored under the
 * owner in Firebase Storage → returns a signed URL valid for 7 days.
 *
 * Pro-only, enforced HERE — hosting costs us storage + signed-URL bandwidth for
 * a week per link, so the UI gate in RightPanel is a courtesy and this is the
 * real one. Without it a direct POST from any guest gets free hosting.
 */
export async function POST(req: NextRequest) {
  try {
    if (!(await requestIsPro(req))) {
      return NextResponse.json({ error: "Share links are a Pro feature — upgrade to create them" }, { status: 402 });
    }
    const owner = await getRequestOwner(req);
    const bytes = Buffer.from(await req.arrayBuffer());
    if (!bytes.length) return NextResponse.json({ error: "Empty image" }, { status: 400 });
    if (bytes.length > MAX_SHARE_BYTES) return NextResponse.json({ error: "Image exceeds 20MB" }, { status: 413 });
    // PNG magic — this endpoint only hosts our own canvas renders
    if (!(bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47)) {
      return NextResponse.json({ error: "Only PNG is supported" }, { status: 415 });
    }

    const storagePath = `shares/${owner.ownerId}/${randomUUID()}.png`;
    const file = firebaseStorage().bucket().file(storagePath);
    await file.save(bytes, { contentType: "image/png", resumable: false });
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + SHARE_TTL_DAYS * 24 * 60 * 60 * 1000,
    });
    return attachOwnerCookie(NextResponse.json({ url, expiresInDays: SHARE_TTL_DAYS }), owner);
  } catch (err) {
    if (err instanceof FirebaseConfigError) {
      return NextResponse.json({ error: "Firebase is not configured", hint: firebaseSetupHint() }, { status: 501 });
    }
    console.error("[share]", err);
    return NextResponse.json({ error: "Could not create link" }, { status: 500 });
  }
}
