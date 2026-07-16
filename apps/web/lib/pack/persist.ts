"use client";

import { collectAssets, persistAsset, restoreAssets, type GuestAsset } from "../assets";
import { firebaseFetch } from "../firebaseClient";
import { packAssetIds } from "./persistShape";
import { PackDocumentSchema, type PackDocument } from "./schema";

/**
 * Pack persistence mirrors drafts.ts: IndexedDB is the always-on local layer
 * (its own DB so the drafts store's schema/version is untouched), the drafts
 * API (kind: "pack") is the cloud layer, best-effort.
 */

export interface PackRecord {
  id: string;
  name: string;
  kind: "pack";
  updatedAt: number;
  pack: PackDocument;
  assets: GuestAsset[];
}

const DB_NAME = "framekit-packs";
const STORE = "packs";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB unavailable"));
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = run(tx.objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed"));
    });
  } finally {
    db.close();
  }
}

export async function savePack(pack: PackDocument): Promise<void> {
  const record: PackRecord = {
    id: pack.id,
    name: pack.appName.trim() || "App screenshots",
    kind: "pack",
    updatedAt: Date.now(),
    pack,
    assets: collectAssets(packAssetIds(pack)),
  };
  await withStore("readwrite", (s) => s.put(record));
  try {
    const assets = await Promise.all(record.assets.map((a) => persistAsset(a)));
    await firebaseFetch("/api/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...record, assets }),
    });
  } catch {
    // IndexedDB remains the offline fallback, same contract as drafts.ts
  }
}

export async function loadLatestPack(): Promise<PackDocument | null> {
  try {
    const res = await firebaseFetch("/api/drafts");
    if (res.ok) {
      const list = (await res.json()) as Array<{ kind?: string; updatedAt?: number; pack?: unknown; assets?: GuestAsset[] }>;
      const packs = list
        .filter((r) => r.kind === "pack")
        .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
      for (const r of packs) {
        const parsed = PackDocumentSchema.safeParse(r.pack);
        if (parsed.success) {
          restoreAssets(r.assets ?? []);
          return parsed.data;
        }
      }
    }
  } catch {
    // fall through to local
  }
  const local = await withStore("readonly", (s) => s.getAll() as IDBRequest<PackRecord[]>);
  const latest = [...local].sort((a, b) => b.updatedAt - a.updatedAt)[0];
  if (!latest) return null;
  const parsed = PackDocumentSchema.safeParse(latest.pack);
  if (!parsed.success) return null;
  restoreAssets(latest.assets ?? []);
  return parsed.data;
}
