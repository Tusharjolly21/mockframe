"use client";

/**
 * Hands a screenshot from a marketing page to the editor. The file is parked
 * in IndexedDB (screenshots are often bigger than sessionStorage allows), the
 * page navigates to /editor?drop=1, and the editor takes it out again.
 * One slot: a newer drop replaces an older one, and stale drops expire.
 */

const DB_NAME = "mockframe-handoff";
const STORE = "files";
const KEY = "pending";
const MAX_AGE_MS = 10 * 60 * 1000;

interface Parked {
  blob: Blob;
  name: string;
  at: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB unavailable"));
  });
}

/** Park `file` for the editor. Rejects if the browser blocks storage. */
export async function parkScreenshot(file: File): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({ blob: file, name: file.name || "screenshot.png", at: Date.now() } satisfies Parked, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Could not save the screenshot"));
    });
  } finally {
    db.close();
  }
}

/** Take the parked screenshot out (it's removed either way). Null when there
 *  is none, it's expired, or storage is unavailable. */
export async function takeParkedScreenshot(): Promise<File | null> {
  let db: IDBDatabase;
  try {
    db = await openDb();
  } catch {
    return null;
  }
  try {
    const parked = await new Promise<Parked | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const get = store.get(KEY);
      get.onsuccess = () => {
        store.delete(KEY);
        resolve(get.result as Parked | undefined);
      };
      tx.onerror = () => reject(tx.error);
    });
    if (!parked || !(parked.blob instanceof Blob) || Date.now() - parked.at > MAX_AGE_MS) return null;
    return new File([parked.blob], parked.name, { type: parked.blob.type || "image/png" });
  } catch {
    return null;
  } finally {
    db.close();
  }
}
