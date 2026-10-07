import { NextResponse } from "next/server";
import { FirebaseConfigError, firebaseStorage, isFirebaseConfigured } from "./firebaseAdmin";
import { isExpired, isImportId, type FigmaImageType, type FigmaImportManifest } from "../figmaImport";

/**
 * Storage for Figma plugin imports: a manifest plus one file per frame under
 * figma-imports/<id>/ in Firebase Storage. They're read once, within a day;
 * a bucket lifecycle rule on that prefix can delete them after that.
 *
 * Without Firebase (local development only) imports live in memory, so the
 * plugin can be tried against `npm run dev`.
 */

interface Backend {
  save(path: string, data: Buffer, contentType: string): Promise<void>;
  read(path: string): Promise<{ data: Buffer; contentType: string } | null>;
}

// on globalThis so every route module (and hot reloads) share one store
const g = globalThis as { __figmaImports?: Map<string, { data: Buffer; contentType: string }> };
const memory = (g.__figmaImports ??= new Map());
const memoryBackend: Backend = {
  async save(path, data, contentType) {
    memory.set(path, { data, contentType });
  },
  async read(path) {
    return memory.get(path) ?? null;
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
};

function backend(): Backend {
  if (isFirebaseConfigured()) return firebaseBackend;
  if (process.env.NODE_ENV !== "production") return memoryBackend;
  throw new FirebaseConfigError("Firebase is not configured");
}

const dir = (id: string) => `figma-imports/${id}`;

export async function saveManifest(m: FigmaImportManifest): Promise<void> {
  await backend().save(`${dir(m.id)}/manifest.json`, Buffer.from(JSON.stringify(m)), "application/json");
}

/** The import's manifest, or null when it doesn't exist or has expired. */
export async function readManifest(id: string): Promise<FigmaImportManifest | null> {
  if (!isImportId(id)) return null;
  const hit = await backend().read(`${dir(id)}/manifest.json`);
  if (!hit) return null;
  const m = JSON.parse(hit.data.toString("utf8")) as FigmaImportManifest;
  return isExpired(m) ? null : m;
}

export async function saveFrame(id: string, n: number, data: Buffer, type: FigmaImageType): Promise<void> {
  await backend().save(`${dir(id)}/${n}`, data, type);
}

export async function readFrame(id: string, n: number) {
  return backend().read(`${dir(id)}/${n}`);
}

/** The plugin's UI runs in a sandboxed iframe (origin "null"), so these
 *  routes answer any origin. They hold nothing private: ids are random. */
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Max-Age": "86400",
};

export function corsJson(body: unknown, init: { status?: number } = {}) {
  return NextResponse.json(body, { status: init.status ?? 200, headers: CORS_HEADERS });
}

export function figmaErrorResponse(err: unknown, where: string) {
  if (err instanceof FirebaseConfigError) return corsJson({ error: "Imports aren't set up on this server" }, { status: 501 });
  console.error(`[figma-import] ${where}`, err);
  return corsJson({ error: "Something went wrong. Try sending the frames again." }, { status: 500 });
}
