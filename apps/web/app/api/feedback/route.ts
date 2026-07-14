import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { FirebaseConfigError, firebaseSetupHint, firestoreDb } from "@/lib/server/firebaseAdmin";
import { attachOwnerCookie, getRequestOwner } from "@/lib/server/requestOwner";

export const runtime = "nodejs";

const TYPES = new Set(["feedback", "bug", "feature", "showcase"]);

export async function POST(req: NextRequest) {
  try {
    const owner = await getRequestOwner(req);
    const body = await req.json();
    const type = typeof body?.type === "string" && TYPES.has(body.type) ? body.type : "feedback";
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim().slice(0, 180) : "";
    const page = typeof body?.page === "string" ? body.page.slice(0, 500) : "";
    const mayFeature = body?.mayFeature === true;

    if (message.length < 8) return NextResponse.json({ error: "Tell us a little more so we can act on it." }, { status: 400 });
    if (message.length > 2500) return NextResponse.json({ error: "Feedback must be under 2,500 characters." }, { status: 400 });
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

    await firestoreDb().collection("productFeedback").add({
      ownerId: owner.ownerId,
      signedIn: !owner.isGuest,
      type,
      message,
      email: email || null,
      page: page || null,
      mayFeature,
      status: "new",
      createdAt: FieldValue.serverTimestamp(),
    });

    return attachOwnerCookie(NextResponse.json({ ok: true }), owner);
  } catch (error) {
    if (error instanceof FirebaseConfigError) {
      return NextResponse.json({ error: "Feedback is temporarily unavailable.", hint: firebaseSetupHint() }, { status: 503 });
    }
    console.error("[feedback POST]", error);
    return NextResponse.json({ error: "Could not send feedback. Please try again." }, { status: 500 });
  }
}
