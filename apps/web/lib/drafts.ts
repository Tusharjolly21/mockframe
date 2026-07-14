"use client";

import { create } from "zustand";
import { createId, migrateScene, type SceneDocument } from "@framekit/scene";
import { collectAssets, persistAsset, restoreAssets, type GuestAsset } from "./assets";
import { firebaseFetch } from "./firebaseClient";
import { decodeScreenAsset, isScreenAsset } from "./screens";

/**
 * Drafts use cloud Firestore when available and IndexedDB as an offline cache.
 * The record shape is shared by both stores, so guest work can migrate without
 * changing the scene document or its asset references.
 */

export interface DraftRecord {
  id: string;
  name: string;
  kind: "scene" | "template";
  updatedAt: number;
  scene: SceneDocument;
  /** uploaded (non-builtin) assets the scene references, inlined as data URLs */
  assets: GuestAsset[];
  /** small WebP preview captured at save time */
  thumbnail?: string;
}

/* --------------------------------- storage ---------------------------------- */

const DB_NAME = "framekit";
const STORE = "drafts";

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

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = run(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error("Draft storage failed"));
    });
  } finally {
    db.close();
  }
}

async function listLocalDrafts(): Promise<DraftRecord[]> {
  const all = await withStore("readonly", (s) => s.getAll() as IDBRequest<DraftRecord[]>);
  return all.map(normalizeDraftRecord).sort((a, b) => b.updatedAt - a.updatedAt);
}

function normalizeDraftRecord(record: DraftRecord): DraftRecord {
  return { ...record, kind: record.kind === "template" ? "template" : "scene" };
}

async function deleteLocalDraft(id: string): Promise<void> {
  await withStore("readwrite", (s) => s.delete(id));
}

async function putLocalDraft(record: DraftRecord): Promise<void> {
  await withStore("readwrite", (s) => s.put(record));
}

async function cloudRecord(record: DraftRecord): Promise<DraftRecord> {
  const assets = await Promise.all(record.assets.map((asset) => persistAsset(asset)));
  const response = await firebaseFetch("/api/drafts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...record, assets }),
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(detail?.error || "Cloud draft save failed");
  }
  return (await response.json()) as DraftRecord;
}

/** Cloud-first draft list with automatic migration of local guest drafts. */
export async function listDrafts(): Promise<DraftRecord[]> {
  try {
    const response = await firebaseFetch("/api/drafts");
    if (!response.ok) throw new Error("Cloud draft list failed");
    const cloud = ((await response.json()) as DraftRecord[]).map(normalizeDraftRecord);
    if (cloud.length > 0) return cloud.sort((a, b) => b.updatedAt - a.updatedAt);

    const local = await listLocalDrafts();
    for (const record of local) {
      try {
        await cloudRecord(record);
      } catch {
        // Keep the local copy; a temporary upload failure must not lose work.
      }
    }
    return local;
  } catch {
    return listLocalDrafts();
  }
}

export async function deleteDraft(id: string): Promise<void> {
  await deleteLocalDraft(id);
  try {
    const response = await firebaseFetch(`/api/drafts/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok && response.status !== 404) throw new Error("Cloud draft delete failed");
  } catch {
    // Local deletion is still useful while offline; the next cloud refresh can retry.
  }
}

export async function putDraft(record: DraftRecord): Promise<void> {
  await putLocalDraft(record);
  try {
    await cloudRecord(record);
  } catch {
    // IndexedDB remains the offline fallback.
  }
}

/* ------------------------------ save / load ---------------------------------- */

function sceneAssetIds(scene: SceneDocument): string[] {
  const ids: string[] = [];
  const push = (assetId: string) => {
    ids.push(assetId);
    // screen docs regenerate from their id, but any uploaded photo they
    // reference (contact DP) must be snapshotted or a reload loses it
    if (isScreenAsset(assetId)) {
      const doc = decodeScreenAsset(assetId);
      if (doc && "avatar" in doc && doc.avatar) ids.push(doc.avatar);
      // per-message image attachments
      if (doc && "messages" in doc && Array.isArray(doc.messages)) {
        for (const m of doc.messages) if (m && typeof m === "object" && "image" in m && m.image) ids.push(m.image as string);
      }
    }
  };
  if (scene.canvas.background.type === "image") push(scene.canvas.background.assetId);
  for (const l of scene.layers) {
    if (l.type === "mockup" && l.media) push(l.media.assetId);
    if (l.type === "sticker" && "assetId" in l) push(l.assetId);
  }
  return ids;
}

function defaultName(): string {
  const now = new Date();
  const day = now.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const time = now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `Draft · ${day}, ${time}`;
}

export async function saveDraft(opts: {
  scene: SceneDocument;
  id?: string; // update in place when set
  name?: string;
  kind?: "scene" | "template";
  thumbnail?: string;
  /** override the asset snapshot (duplicating a non-loaded draft) */
  assets?: GuestAsset[];
}): Promise<DraftRecord> {
  const record: DraftRecord = {
    id: opts.id ?? createId(),
    name: opts.name ?? defaultName(),
    kind: opts.kind ?? "scene",
    updatedAt: Date.now(),
    scene: opts.scene,
    assets: opts.assets ?? collectAssets(sceneAssetIds(opts.scene)),
    thumbnail: opts.thumbnail,
  };
  await putLocalDraft(record);
  try {
    return await cloudRecord(record);
  } catch {
    return record;
  }
}

/** Restore a draft's assets and return its validated scene document. */
export function openDraft(record: DraftRecord): SceneDocument {
  restoreAssets(record.assets);
  return migrateScene(record.scene); // validates + upgrades older drafts
}

/** Low-res snapshot of the live canvas for the drafts list. */
export async function captureThumbnail(scene: SceneDocument): Promise<string | undefined> {
  const node = document.querySelector<HTMLElement>("#scene-canvas [data-scene-id]");
  if (!node) return undefined;
  try {
    const { toCanvas } = await import("html-to-image");
    const w = 320;
    const canvas = await toCanvas(node, {
      pixelRatio: 1,
      canvasWidth: w,
      canvasHeight: Math.round((w * scene.canvas.height) / scene.canvas.width),
      style: { transform: "none" },
    });
    return canvas.toDataURL("image/webp", 0.65);
  } catch {
    return undefined; // a draft without a thumbnail is still a draft
  }
}

/* ------------------------------- current draft -------------------------------- */
/* Which saved draft the canvas currently "is" — ⌘S and the panel's Save button
   update it in place; Start Over / loading another draft repoints it. */

interface DraftsUiState {
  currentId: string | null;
  currentName: string | null;
  setCurrent: (id: string | null, name?: string | null) => void;
}

export const useDraftsUi = create<DraftsUiState>()((set) => ({
  currentId: null,
  currentName: null,
  setCurrent: (currentId, currentName = null) => set({ currentId, currentName }),
}));

/** Save the live scene — updates the loaded draft, or creates a new one. */
export async function saveCurrentDraft(scene: SceneDocument): Promise<DraftRecord> {
  const { currentId, currentName } = useDraftsUi.getState();
  const thumbnail = await captureThumbnail(scene);
  const record = await saveDraft({
    scene,
    id: currentId ?? undefined,
    name: currentName ?? undefined,
    kind: "scene",
    thumbnail,
  });
  useDraftsUi.getState().setCurrent(record.id, record.name);
  return record;
}

export function timeAgo(ts: number): string {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}
