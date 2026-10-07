import { FirebaseConfigError, firebaseStorage, isFirebaseConfigured } from "./firebaseAdmin";

/**
 * Short-lived files (Figma imports, API uploads and renders) in Firebase
 * Storage. Without Firebase, during local development only, they live in
 * memory so these features can be tried against `npm run dev`.
 */

export interface StoredFile {
  data: Buffer;
  contentType: string;
}

interface Backend {
  save(path: string, data: Buffer, contentType: string): Promise<void>;
  read(path: string): Promise<StoredFile | null>;
  /** a URL anyone can fetch for `ttlMs`, or null when the caller must serve it */
  signedUrl(path: string, ttlMs: number): Promise<string | null>;
}

// on globalThis so every route module (and hot reloads) share one store
const g = globalThis as { __mockframeTemp?: Map<string, StoredFile> };
const memory = (g.__mockframeTemp ??= new Map());

const memoryBackend: Backend = {
  async save(path, data, contentType) {
    memory.set(path, { data, contentType });
  },
  async read(path) {
    return memory.get(path) ?? null;
  },
  async signedUrl() {
    return null;
  },
};

const firebaseBackend: Backend = {
  async save(path, data, contentType) {
    await firebaseStorage().bucket().file(path).save(data, { contentType, resumable: false });
  },
  async read(path) {
    const file = firebaseStorage().bucket().file(path);
    try {
      const [data] = await file.download();
      const [meta] = await file.getMetadata();
      return { data, contentType: meta.contentType ?? "application/octet-stream" };
    } catch (err) {
      if ((err as { code?: number }).code === 404) return null;
      throw err;
    }
  },
  async signedUrl(path, ttlMs) {
    const [url] = await firebaseStorage().bucket().file(path).getSignedUrl({ action: "read", expires: Date.now() + ttlMs });
    return url;
  },
};

function backend(): Backend {
  if (isFirebaseConfigured()) return firebaseBackend;
  if (process.env.NODE_ENV !== "production") return memoryBackend;
  throw new FirebaseConfigError("Firebase is not configured");
}

export const tempSave = (path: string, data: Buffer, contentType: string) => backend().save(path, data, contentType);
export const tempRead = (path: string) => backend().read(path);
export const tempSignedUrl = (path: string, ttlMs: number) => backend().signedUrl(path, ttlMs);
