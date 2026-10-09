import { createHash, randomBytes } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { firebaseStorage, firestoreDb } from "./firebaseAdmin";
import { isBillingActive, readBilling } from "./billing";
import { launchBrowser } from "./browser";
import { assertPublicTarget, capturePng } from "./capturePage";
import { consumeDailyQuota } from "./quota";
import { PackDocumentSchema } from "@/lib/pack/schema";
import { capturableScreens } from "@/lib/pack/ops";
import { packAssetIds } from "@/lib/pack/persistShape";
import {
  HOOK_COOLDOWN_MS,
  HOOK_DAILY_RUNS,
  HOOK_TOKEN_PREFIX,
  mergePending,
  pngSize,
  type PendingRefresh,
  type PendingUpdate,
} from "@/lib/pack/deployRefresh";

/**
 * Deploy refresh — the server half (see lib/pack/deployRefresh.ts for the model).
 *
 * Firestore layout:
 *  · packRefreshHooks/{sha256(token)} — { ownerId, uid, packId, createdAtMs,
 *    lastRunAtMs, lastResult, liveAssets: {screenId: assetId} }. The token
 *    itself is shown once and never stored.
 *  · mockframeOwners/{owner}/packRefreshes/{packId} — the pending refresh.
 *
 * Refresh-made screenshots are ordinary assets in the owner's asset library.
 * The ones a newer capture supersedes are deleted (liveAssets tracks which
 * refresh asset each screen currently shows), so daily deploys don't fill the
 * library up to its cap.
 */

/** Same viewport as the studio's "Re-capture from URLs": 390 CSS px at 2× → 780×1688. */
const CAPTURE_WIDTH = 390;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const hooks = () => firestoreDb().collection("packRefreshHooks");
const pendingDoc = (ownerId: string, packId: string) => firestoreDb().doc(`mockframeOwners/${ownerId}/packRefreshes/${packId}`);
const draftDoc = (ownerId: string, packId: string) => firestoreDb().doc(`mockframeOwners/${ownerId}/drafts/${packId}`);
const assetDoc = (ownerId: string, id: string) => firestoreDb().doc(`mockframeOwners/${ownerId}/assets/${id}`);

export const PACK_ID_RE = /^[a-zA-Z0-9_-]{1,100}$/;

export interface HookInfo {
  createdAtMs: number;
  lastRunAtMs: number | null;
  lastResult: string | null;
}

async function hookFor(ownerId: string, packId: string) {
  const snap = await hooks().where("ownerId", "==", ownerId).where("packId", "==", packId).limit(5).get();
  return snap.docs;
}

export async function getHookInfo(ownerId: string, packId: string): Promise<HookInfo | null> {
  const [doc] = await hookFor(ownerId, packId);
  if (!doc) return null;
  const d = doc.data();
  return { createdAtMs: d.createdAtMs ?? 0, lastRunAtMs: d.lastRunAtMs ?? null, lastResult: d.lastResult ?? null };
}

/** Create the pack's hook, replacing any earlier link (one live link per pack). Returns the token, once. */
export async function createHook(ownerId: string, uid: string, packId: string): Promise<string> {
  const previous = await hookFor(ownerId, packId);
  // carry the asset bookkeeping over so rotating the link doesn't orphan assets
  const liveAssets = previous.reduce<Record<string, string>>((acc, d) => ({ ...acc, ...(d.data().liveAssets ?? {}) }), {});
  const token = HOOK_TOKEN_PREFIX + randomBytes(24).toString("base64url").replace(/[-_]/g, "x");
  const batch = firestoreDb().batch();
  for (const d of previous) batch.delete(d.ref);
  batch.set(hooks().doc(hashToken(token)), { ownerId, uid, packId, createdAtMs: Date.now(), lastRunAtMs: null, lastResult: null, liveAssets });
  await batch.commit();
  return token;
}

export async function revokeHook(ownerId: string, packId: string): Promise<boolean> {
  const docs = await hookFor(ownerId, packId);
  await Promise.all(docs.map((d) => d.ref.delete()));
  return docs.length > 0;
}

export type HookCheck =
  | { ok: true; ownerId: string; packId: string; screens: { id: string; url: string; dark: boolean }[] }
  | { ok: false; status: number; error: string };

/**
 * Everything the webhook must verify before it accepts a run: a live link,
 * an active Pro subscription, cooldown + daily cap, and a cloud-saved pack
 * with at least one source URL. Claims the run (stamps lastRunAtMs) so a
 * burst of duplicate notifications starts one refresh, not several.
 */
export async function checkHook(token: string): Promise<HookCheck> {
  const ref = hooks().doc(hashToken(token));
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, status: 404, error: "Unknown or revoked refresh link" };
  const hook = snap.data()!;
  if (!isBillingActive(await readBilling(hook.uid))) {
    return { ok: false, status: 402, error: "Deploy refresh is a Pro feature — the subscription on this pack isn't active" };
  }

  const draft = (await draftDoc(hook.ownerId, hook.packId).get()).data();
  const parsed = PackDocumentSchema.safeParse(draft?.pack);
  if (!parsed.success) return { ok: false, status: 409, error: "This pack isn't saved to the account — open it in MockFrame once" };
  const screens = capturableScreens(parsed.data).map((s) => ({ id: s.id, url: s.capture!.url, dark: !!s.capture!.dark }));
  if (!screens.length) return { ok: false, status: 409, error: "No screens in this pack have a source URL" };

  const claimed = await firestoreDb().runTransaction(async (tx) => {
    const fresh = (await tx.get(ref)).data();
    if (!fresh) return false;
    if (fresh.lastRunAtMs && Date.now() - fresh.lastRunAtMs < HOOK_COOLDOWN_MS) return false;
    tx.update(ref, { lastRunAtMs: Date.now(), lastResult: "Running…" });
    return true;
  });
  if (!claimed) return { ok: false, status: 429, error: "A refresh ran in the last 2 minutes — skipped" };
  const quota = await consumeDailyQuota(`user_${hook.uid}`, "pack-refresh", HOOK_DAILY_RUNS);
  if (!quota.allowed) {
    await ref.update({ lastResult: `Skipped: daily limit of ${HOOK_DAILY_RUNS} refreshes reached` });
    return { ok: false, status: 429, error: `Daily limit of ${HOOK_DAILY_RUNS} refreshes reached` };
  }
  return { ok: true, ownerId: hook.ownerId, packId: hook.packId, screens };
}

/** Store a captured PNG in the owner's asset library, the same shape /api/assets writes. */
async function saveCapture(ownerId: string, png: Uint8Array, url: string): Promise<string> {
  const buffer = Buffer.from(png);
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const host = new URL(url).hostname.replace(/[^a-zA-Z0-9.-]/g, "-").slice(0, 60);
  const name = `${host}-refresh.png`;
  const storagePath = `uploads/${ownerId}/${sha256.slice(0, 16)}-${name}`;
  await firebaseStorage()
    .bucket()
    .file(storagePath)
    .save(buffer, { resumable: false, metadata: { contentType: "image/png", metadata: { ownerId, originalName: name, sha256, source: "deploy-refresh" } } });
  const size = pngSize(png);
  const ref = firestoreDb().collection(`mockframeOwners/${ownerId}/assets`).doc();
  await ref.set({
    name,
    mime: "image/png",
    width: size?.width ?? null,
    height: size?.height ?? null,
    bytes: buffer.length,
    sha256,
    storagePath,
    ownerId,
    source: "deploy-refresh",
    createdAtMs: Date.now(),
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

/**
 * Of `ids`, the ones the cloud-saved pack doesn't show. Cleanup only deletes
 * those: the studio may have applied a refresh and saved before this server
 * caught up, and a leaked asset is cheap where a broken screen isn't.
 */
async function notInSavedPack(ownerId: string, packId: string, ids: string[]): Promise<string[]> {
  if (!ids.length) return ids;
  const saved = PackDocumentSchema.safeParse((await draftDoc(ownerId, packId).get()).data()?.pack);
  if (!saved.success) return []; // can't tell what's in use — keep everything
  const inUse = new Set(packAssetIds(saved.data));
  return ids.filter((id) => !inUse.has(id));
}

/** Delete refresh-made assets (only ever ones this feature created). */
async function deleteRefreshAssets(ownerId: string, ids: string[]): Promise<void> {
  await Promise.all(
    ids.map(async (id) => {
      try {
        const ref = assetDoc(ownerId, id);
        const data = (await ref.get()).data();
        if (!data || data.source !== "deploy-refresh") return;
        if (data.storagePath) await firebaseStorage().bucket().file(data.storagePath).delete({ ignoreNotFound: true });
        await ref.delete();
      } catch (err) {
        console.error("[pack-refresh] asset cleanup failed", id, err);
      }
    })
  );
}

/** Capture every source-URL screen and fold the results into the pack's pending refresh. */
export async function runRefresh(token: string, job: Extract<HookCheck, { ok: true }>): Promise<string> {
  const { ownerId, packId, screens } = job;
  const updates: PendingUpdate[] = [];
  const failed: PendingRefresh["failed"] = [];
  let browser: Awaited<ReturnType<typeof launchBrowser>> | null = null;
  try {
    browser = await launchBrowser();
    // one at a time in one browser: steady memory, and the function's time limit covers 10 screens
    for (const s of screens) {
      try {
        const target = new URL(s.url);
        await assertPublicTarget(target);
        const png = await capturePng(browser, { target, dark: s.dark, viewportWidth: CAPTURE_WIDTH });
        updates.push({ screenId: s.id, assetId: await saveCapture(ownerId, png, s.url), url: s.url });
      } catch (err) {
        const msg = err instanceof Error && /timeout/i.test(err.message) ? "The page took too long to load" : "Couldn't capture that page";
        failed.push({ url: s.url, error: msg });
      }
    }
  } catch (err) {
    console.error("[pack-refresh] browser failed", err);
    for (const s of screens.slice(updates.length + failed.length)) failed.push({ url: s.url, error: "Capture service unavailable" });
  } finally {
    await browser?.close().catch(() => {});
  }

  const run: PendingRefresh = { atMs: Date.now(), updates, failed };
  const superseded = await firestoreDb().runTransaction(async (tx) => {
    const ref = pendingDoc(ownerId, packId);
    const existing = (await tx.get(ref)).data() as PendingRefresh | undefined;
    const { merged, superseded } = mergePending(existing ?? null, run);
    if (merged.updates.length || merged.failed.length) tx.set(ref, merged);
    return superseded;
  });
  await deleteRefreshAssets(ownerId, await notInSavedPack(ownerId, packId, superseded));

  const result = failed.length
    ? `Captured ${updates.length} of ${screens.length} screens · ${failed.length} failed`
    : `Captured ${updates.length} screen${updates.length === 1 ? "" : "s"}`;
  await hooks().doc(hashToken(token)).update({ lastResult: result }).catch(() => {});
  return result;
}

async function signedUrl(storagePath: string): Promise<string> {
  const [url] = await firebaseStorage().bucket().file(storagePath).getSignedUrl({ action: "read", expires: Date.now() + 7 * 24 * 3600_000 });
  return url;
}

/** The pending refresh, with each new screenshot as a ready-to-render asset. */
export async function readPending(ownerId: string, packId: string) {
  const pending = (await pendingDoc(ownerId, packId).get()).data() as PendingRefresh | undefined;
  if (!pending) return null;
  const assets = (
    await Promise.all(
      pending.updates.map(async (u) => {
        const d = (await assetDoc(ownerId, u.assetId).get()).data();
        if (!d?.storagePath) return null;
        return { id: u.assetId, name: d.name ?? "refresh.png", width: d.width ?? 0, height: d.height ?? 0, url: await signedUrl(d.storagePath) };
      })
    )
  ).filter((a): a is NonNullable<typeof a> => !!a);
  const live = new Set(assets.map((a) => a.id));
  return { pending: { ...pending, updates: pending.updates.filter((u) => live.has(u.assetId)) }, assets };
}

/**
 * The studio applied a pending refresh: clear it (only if no newer run landed
 * meanwhile) and delete the refresh screenshots those screens showed before.
 */
export async function acknowledgePending(ownerId: string, packId: string, atMs: number, appliedScreenIds: string[]): Promise<void> {
  const ref = pendingDoc(ownerId, packId);
  const pending = await firestoreDb().runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data() as PendingRefresh | undefined;
    if (!current || current.atMs !== atMs) return null;
    tx.delete(ref);
    return current;
  });
  if (!pending) return;

  const applied = new Set(appliedScreenIds);
  const [hook] = await hookFor(ownerId, packId);
  const live: Record<string, string> = { ...(hook?.data().liveAssets ?? {}) };
  const stale: string[] = [];
  for (const u of pending.updates) {
    if (!applied.has(u.screenId)) {
      stale.push(u.assetId); // never shown (screen gone or its URL changed)
      continue;
    }
    if (live[u.screenId] && live[u.screenId] !== u.assetId) stale.push(live[u.screenId]);
    live[u.screenId] = u.assetId;
  }
  if (hook) await hook.ref.update({ liveAssets: live });
  await deleteRefreshAssets(ownerId, await notInSavedPack(ownerId, packId, stale));
}
