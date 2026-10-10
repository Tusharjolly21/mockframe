import { get as blobGet, put as blobPut } from "@vercel/blob";
import { FirebaseConfigError, firebaseStorage, isFirebaseConfigured } from "./firebaseAdmin";

/**
 * Short-lived files (Figma imports, API uploads and renders). They go to
 * Vercel Blob when BLOB_READ_WRITE_TOKEN is set (a private store), else
 * Firebase Storage. Without either, during local development only, they live
 * in memory so these features can be tried against `npm run dev`.
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

// Private store: nothing here is public, files are only served through our routes.
const blobBackend: Backend = {
  async save(path, data, contentType) {
    await blobPut(path, data, { access: "private", contentType, addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60 });
  },
  async read(path) {
    // useCache: false so a file that was just overwritten (results.json) reads back fresh
    const hit = await blobGet(path, { access: "private", useCache: false });
    if (!hit || hit.statusCode !== 200) return null;
    return { data: Buffer.from(await new Response(hit.stream).arrayBuffer()), contentType: hit.blob.contentType || "application/octet-stream" };
  },
  async signedUrl() {
    return null;
  },
};

export const hasBlobStore = () => !!process.env.BLOB_READ_WRITE_TOKEN;

function backend(): Backend {
  if (hasBlobStore()) return blobBackend;
  if (isFirebaseConfigured()) return firebaseBackend;
  if (process.env.NODE_ENV !== "production") return memoryBackend;
  throw new FirebaseConfigError("Firebase is not configured");
}

export const tempSave = (path: string, data: Buffer, contentType: string) => backend().save(path, data, contentType);
export const tempRead = (path: string) => backend().read(path);
export const tempSignedUrl = (path: string, ttlMs: number) => backend().signedUrl(path, ttlMs);
