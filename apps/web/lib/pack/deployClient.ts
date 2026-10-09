"use client";

import type { GuestAsset } from "../assets";
import { firebaseFetch } from "../firebaseClient";
import type { PendingRefresh } from "./deployRefresh";

/** Browser calls for deploy refresh (routes under /api/packs/[id]). */

export interface HookInfo {
  createdAtMs: number;
  lastRunAtMs: number | null;
  lastResult: string | null;
}

const base = (packId: string) => `/api/packs/${encodeURIComponent(packId)}`;

async function errorOf(res: Response, fallback: string): Promise<Error & { reason?: string }> {
  const j = (await res.json().catch(() => ({}))) as { error?: string; reason?: string };
  return Object.assign(new Error(j.error ?? fallback), { reason: j.reason });
}

export async function fetchPendingRefresh(packId: string): Promise<{ pending: PendingRefresh | null; assets: GuestAsset[] }> {
  const res = await firebaseFetch(`${base(packId)}/pending-refresh`);
  if (!res.ok) return { pending: null, assets: [] };
  return res.json();
}

export async function acknowledgeRefresh(packId: string, atMs: number, applied: string[]): Promise<void> {
  await firebaseFetch(`${base(packId)}/pending-refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ atMs, applied }),
  });
}

export async function fetchHook(packId: string): Promise<HookInfo | null> {
  const res = await firebaseFetch(`${base(packId)}/refresh-hook`);
  if (!res.ok) return null;
  return ((await res.json()) as { hook: HookInfo | null }).hook;
}

/** Create or rotate the link. The URL is only ever returned here. Throws with `.reason` "signin" | "pro". */
export async function createHookLink(packId: string): Promise<{ url: string; hook: HookInfo }> {
  const res = await firebaseFetch(`${base(packId)}/refresh-hook`, { method: "POST" });
  if (!res.ok) throw await errorOf(res, "Couldn't create the deploy link");
  return res.json();
}

export async function turnOffHook(packId: string): Promise<void> {
  const res = await firebaseFetch(`${base(packId)}/refresh-hook`, { method: "DELETE" });
  if (!res.ok) throw await errorOf(res, "Couldn't turn off the deploy link");
}
