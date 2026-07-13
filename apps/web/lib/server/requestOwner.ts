import { randomUUID } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { firebaseAuth, FirebaseConfigError } from "./firebaseAdmin";

const GUEST_COOKIE = "mf_guest_id";
const GUEST_RE = /^[a-zA-Z0-9_-]{12,80}$/;

export type RequestOwner = {
  ownerId: string;
  uid: string | null;
  isGuest: boolean;
  /** Firebase sign_in_provider — "anonymous" for guest sessions, "google.com" / "password" / "emailLink" for real accounts */
  signInProvider?: string;
  guestId?: string;
  shouldSetGuestCookie?: boolean;
};

function safeOwnerPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 96);
}

export async function getRequestOwner(req: NextRequest): Promise<RequestOwner> {
  const auth = req.headers.get("authorization");
  const token = auth?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (token) {
    try {
      const decoded = await firebaseAuth().verifyIdToken(token);
      return {
        ownerId: `user_${safeOwnerPart(decoded.uid)}`,
        uid: decoded.uid,
        isGuest: false,
        signInProvider: decoded.firebase?.sign_in_provider,
      };
    } catch (err) {
      if (err instanceof FirebaseConfigError) throw err;
      // Bad tokens fall back to guest mode so the editor remains usable.
    }
  }

  const cookie = req.cookies.get(GUEST_COOKIE)?.value;
  const guestId = cookie && GUEST_RE.test(cookie) ? cookie : randomUUID();
  return {
    ownerId: `guest_${safeOwnerPart(guestId)}`,
    uid: null,
    isGuest: true,
    guestId,
    shouldSetGuestCookie: !cookie,
  };
}

export function attachOwnerCookie(res: NextResponse, owner: RequestOwner): NextResponse {
  if (owner.isGuest && owner.shouldSetGuestCookie && owner.guestId) {
    res.cookies.set(GUEST_COOKIE, owner.guestId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}
