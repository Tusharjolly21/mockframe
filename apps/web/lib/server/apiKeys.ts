import { createHash, randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { isBillingActive, readBilling } from "./billing";
import { FirebaseConfigError, firestoreDb, isFirebaseConfigured } from "./firebaseAdmin";
import { consumeDailyQuota } from "./quota";

/**
 * API keys for the render API and the MCP server. A key is shown once; only
 * its SHA-256 is stored (apiKeys/<hash>), and that hash is the key's public id.
 * Keys belong to an account and work while it has Pro.
 */

export const KEY_PREFIX = "mf_live_";
export const MAX_KEYS = 5;
/** API requests per account per UTC day */
export const API_DAILY_REQUESTS = 500;

export interface ApiKeyInfo {
  id: string;
  name: string;
  /** the first characters, to tell keys apart */
  preview: string;
  createdAt: number | null;
  lastUsedAt: number | null;
}

export interface ApiCaller {
  uid: string;
  keyId: string;
}

const hashKey = (key: string) => createHash("sha256").update(key).digest("hex");
export const looksLikeKey = (key: string) => key.startsWith(KEY_PREFIX) && /^[A-Za-z0-9_]{40,80}$/.test(key);

const millis = (v: unknown) => (v && typeof (v as { toMillis?: () => number }).toMillis === "function" ? (v as { toMillis: () => number }).toMillis() : null);

export async function createApiKey(uid: string, name: string): Promise<{ key: string; info: ApiKeyInfo }> {
  const db = firestoreDb();
  const existing = await db.collection("apiKeys").where("uid", "==", uid).count().get();
  if (existing.data().count >= MAX_KEYS) throw new Error(`You can have up to ${MAX_KEYS} keys. Revoke one first.`);
  const key = KEY_PREFIX + randomBytes(24).toString("base64url").replace(/-/g, "a").replace(/_/g, "b");
  const id = hashKey(key);
  const label = name.trim().slice(0, 60) || "API key";
  const preview = key.slice(0, KEY_PREFIX.length + 4);
  await db.collection("apiKeys").doc(id).set({ uid, name: label, preview, createdAt: FieldValue.serverTimestamp(), lastUsedAt: null });
  return { key, info: { id, name: label, preview, createdAt: Date.now(), lastUsedAt: null } };
}

export async function listApiKeys(uid: string): Promise<ApiKeyInfo[]> {
  const snap = await firestoreDb().collection("apiKeys").where("uid", "==", uid).get();
  return snap.docs
    .map((d) => {
      const v = d.data();
      return { id: d.id, name: String(v.name ?? "API key"), preview: String(v.preview ?? ""), createdAt: millis(v.createdAt), lastUsedAt: millis(v.lastUsedAt) };
    })
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

export async function revokeApiKey(uid: string, id: string): Promise<boolean> {
  const ref = firestoreDb().collection("apiKeys").doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.uid !== uid) return false;
  await ref.delete();
  return true;
}

/** The key from `Authorization: Bearer mf_live_…` (or an `x-api-key` header). */
export function keyFromRequest(req: NextRequest | Request): string | null {
  const auth = req.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  const key = auth ?? req.headers.get("x-api-key")?.trim();
  return key && looksLikeKey(key) ? key : null;
}

export type AuthResult =
  | { ok: true; caller: ApiCaller; remaining: number }
  | { ok: false; status: 401 | 402 | 429 | 501; error: string };

/**
 * Who's calling, whether they have Pro, and (unless consume is false) one
 * unit of their daily quota.
 * MOCKFRAME_DEV_API_KEY stands in for a Pro key in local development.
 */
export async function authorizeApiRequest(req: NextRequest | Request, opts: { consume?: boolean } = {}): Promise<AuthResult> {
  const consume = opts.consume ?? true;
  const key = keyFromRequest(req);
  if (!key) return { ok: false, status: 401, error: `Add your API key as "Authorization: Bearer ${KEY_PREFIX}…". Create one at https://mockframe.app/developers/api` };
  const dev = process.env.NODE_ENV !== "production" ? process.env.MOCKFRAME_DEV_API_KEY : undefined;
  if (dev && key === dev) return { ok: true, caller: { uid: "dev", keyId: "dev" }, remaining: API_DAILY_REQUESTS };
  if (!isFirebaseConfigured()) return { ok: false, status: 501, error: "API keys aren't set up on this server" };
  try {
    const ref = firestoreDb().collection("apiKeys").doc(hashKey(key));
    const snap = await ref.get();
    const uid = snap.exists ? (snap.data()?.uid as string | undefined) : undefined;
    if (!uid) return { ok: false, status: 401, error: "That API key isn't valid. It may have been revoked." };
    if (!isBillingActive(await readBilling(uid))) return { ok: false, status: 402, error: "The API needs Pro. Upgrade at https://mockframe.app/pricing" };
    if (!consume) return { ok: true, caller: { uid, keyId: snap.id }, remaining: API_DAILY_REQUESTS };
    const quota = await consumeDailyQuota(`user_${uid}`, "api", API_DAILY_REQUESTS);
    if (!quota.allowed) return { ok: false, status: 429, error: `You've used today's ${API_DAILY_REQUESTS} API requests. The limit resets at midnight UTC.` };
    void ref.update({ lastUsedAt: FieldValue.serverTimestamp() }).catch(() => {});
    return { ok: true, caller: { uid, keyId: snap.id }, remaining: Math.max(0, quota.limit - quota.used) };
  } catch (err) {
    if (err instanceof FirebaseConfigError) return { ok: false, status: 501, error: "API keys aren't set up on this server" };
    throw err;
  }
}

/** Spend one unit of an already-authorized caller's daily quota. */
export async function consumeApiQuota(caller: ApiCaller): Promise<{ allowed: boolean; remaining: number }> {
  if (caller.uid === "dev") return { allowed: true, remaining: API_DAILY_REQUESTS };
  const q = await consumeDailyQuota(`user_${caller.uid}`, "api", API_DAILY_REQUESTS);
  return { allowed: q.allowed, remaining: Math.max(0, q.limit - q.used) };
}
