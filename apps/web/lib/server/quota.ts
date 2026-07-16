import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { FirebaseConfigError, firestoreDb } from "./firebaseAdmin";
import type { RequestOwner } from "./requestOwner";

/**
 * Per-caller, per-UTC-day counters for routes that cost real money to serve.
 *
 * This is a COST guard, not a security boundary — SSRF/auth checks do that job.
 * It exists so an anonymous caller can't run our headless-Chromium bill up
 * unbounded with a shell loop.
 */

export interface QuotaResult {
  allowed: boolean;
  used: number;
  limit: number;
}

/**
 * Guests are keyed by client IP, NOT by the guest cookie: clearing a cookie is
 * one click, so a cookie-keyed quota is decorative. Signed-in callers are keyed
 * by uid, which survives IP changes and is the fairer unit for someone on a
 * shared/CGNAT address.
 */
export function quotaSubject(req: NextRequest, owner: RequestOwner): string {
  if (owner.uid) return `user_${owner.uid}`;
  // Trusted client IP. On Vercel `x-real-ip` is set by the platform to the real
  // client IP and cannot be spoofed by the caller. `x-forwarded-for`'s LEFTMOST
  // entry IS caller-controlled (Vercel appends the real IP to the right), so we
  // must never key on split(",")[0] — that would let an attacker rotate the
  // header and get a fresh quota bucket per request. Fall back to the RIGHTMOST
  // XFF hop (the one a trusted proxy stamped), never the leftmost.
  const realIp = req.headers.get("x-real-ip")?.trim();
  const xff = req.headers.get("x-forwarded-for");
  const rightmostHop = xff?.split(",").map((s) => s.trim()).filter(Boolean).pop();
  const ip = realIp || rightmostHop || "unknown";
  // hashed so we don't store raw IPs
  return `ip_${createHash("sha256").update(ip).digest("hex").slice(0, 32)}`;
}

function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Atomically consume one unit. Returns allowed:false once `limit` is spent for
 * the current UTC day. The transaction matters — without it, concurrent
 * requests read the same count and every one of them passes.
 *
 * Fails OPEN on infrastructure errors (including Firebase not being configured
 * locally): a caller cannot induce those, so availability wins over strictness.
 */
export async function consumeDailyQuota(subject: string, bucket: string, limit: number): Promise<QuotaResult> {
  try {
    const db = firestoreDb();
    const ref = db.doc(`mockframeQuota/${bucket}_${subject}`);
    const day = utcDay();
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.exists ? snap.data() : undefined;
      const used = data?.day === day ? Number(data?.used ?? 0) : 0;
      if (used >= limit) return { allowed: false, used, limit };
      tx.set(ref, { day, used: used + 1, updatedAt: FieldValue.serverTimestamp() });
      return { allowed: true, used: used + 1, limit };
    });
  } catch (err) {
    if (!(err instanceof FirebaseConfigError)) console.error("[quota]", bucket, err);
    return { allowed: true, used: 0, limit };
  }
}
