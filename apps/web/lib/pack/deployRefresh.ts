import type { PackDocument } from "./schema";

/**
 * Deploy refresh — the pure half. A CI/deploy webhook re-captures a pack's
 * URL screens on the server and stores the results as a PENDING refresh; the
 * studio applies it the next time the pack is open. The pack document itself
 * is never written by the server, so a refresh can't race the studio's
 * autosave or overwrite someone's edits. Shared by the API routes, the
 * studio and the tests: no browser or Firebase imports here.
 */

/** Hook link tokens: `mfh_` + 32 base64url-ish chars. Only the hash is stored. */
export const HOOK_TOKEN_PREFIX = "mfh_";
export const looksLikeHookToken = (t: string) => t.startsWith(HOOK_TOKEN_PREFIX) && /^mfh_[A-Za-z0-9]{32,64}$/.test(t);

/** The same deploy often fires several notifications (preview + production, retries). */
export const HOOK_COOLDOWN_MS = 2 * 60_000;
export const HOOK_DAILY_RUNS = 30;

export interface PendingUpdate {
  screenId: string;
  assetId: string;
  url: string;
}

export interface PendingRefresh {
  /** ms epoch of the newest run folded into this refresh */
  atMs: number;
  updates: PendingUpdate[];
  failed: { url: string; error: string }[];
}

/**
 * Fold a new run into a refresh the studio hasn't applied yet: the newer
 * capture of a screen wins, screens only the older run touched are kept, and
 * failures are only those of the newest run (an old failure that now works
 * shouldn't linger). Returns the merged refresh plus the asset ids the newer
 * run superseded — never applied anywhere, so safe to delete.
 */
export function mergePending(
  existing: PendingRefresh | null,
  run: PendingRefresh
): { merged: PendingRefresh; superseded: string[] } {
  if (!existing) return { merged: run, superseded: [] };
  const byScreen = new Map(existing.updates.map((u) => [u.screenId, u]));
  const superseded: string[] = [];
  for (const u of run.updates) {
    const old = byScreen.get(u.screenId);
    if (old && old.assetId !== u.assetId) superseded.push(old.assetId);
    byScreen.set(u.screenId, u);
  }
  return {
    merged: { atMs: Math.max(existing.atMs, run.atMs), updates: [...byScreen.values()], failed: run.failed },
    superseded,
  };
}

/**
 * Apply a pending refresh to the pack open in the studio. Updates for screens
 * the user has since deleted are dropped; so are updates for screens whose
 * source URL changed after the capture (the capture is of the wrong page).
 */
export function applyPendingRefresh(pack: PackDocument, pending: PendingRefresh): { pack: PackDocument; applied: number } {
  let applied = 0;
  const byScreen = new Map(pending.updates.map((u) => [u.screenId, u]));
  const screens = pack.screens.map((s) => {
    const u = byScreen.get(s.id);
    if (!u || s.capture?.url !== u.url) return s;
    applied++;
    return { ...s, assetId: u.assetId };
  });
  return { pack: applied ? { ...pack, screens } : pack, applied };
}

/** Width/height from a PNG's IHDR chunk (bytes 16–23), or null if it isn't a PNG. */
export function pngSize(bytes: Uint8Array): { width: number; height: number } | null {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 24 || sig.some((b, i) => bytes[i] !== b)) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}
