import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { FirebaseConfigError } from "./firebaseAdmin";
import { tempRead, tempSave } from "./tempStore";
import { isExpired, isImportId, upsertResult, type FigmaImageType, type FigmaImportManifest, type FigmaResult } from "../figmaImport";

/**
 * Storage for Figma plugin imports: a manifest plus one file per frame under
 * figma-imports/<id>/ (see tempStore), and the images going back to Figma
 * under figma-imports/<id>/results/. They're used within a day; a bucket
 * lifecycle rule on that prefix can delete them after that.
 */

const dir = (id: string) => `figma-imports/${id}`;

export async function saveManifest(m: FigmaImportManifest): Promise<void> {
  await tempSave(`${dir(m.id)}/manifest.json`, Buffer.from(JSON.stringify(m)), "application/json");
}

/** The import's manifest, or null when it doesn't exist or has expired. */
export async function readManifest(id: string): Promise<FigmaImportManifest | null> {
  if (!isImportId(id)) return null;
  const hit = await tempRead(`${dir(id)}/manifest.json`);
  if (!hit) return null;
  const m = JSON.parse(hit.data.toString("utf8")) as FigmaImportManifest;
  return isExpired(m) ? null : m;
}

export async function saveFrame(id: string, n: number, data: Buffer, type: FigmaImageType): Promise<void> {
  await tempSave(`${dir(id)}/${n}`, data, type);
}

export async function readFrame(id: string, n: number) {
  return tempRead(`${dir(id)}/${n}`);
}

/** What has been sent back to Figma for this import, by slot. */
export async function readResults(id: string): Promise<FigmaResult[]> {
  const hit = await tempRead(`${dir(id)}/results.json`);
  return hit ? (JSON.parse(hit.data.toString("utf8")) as FigmaResult[]) : [];
}

/**
 * Keep images for Figma and list them. One writer at a time per import (the
 * editor sends its shots one after another), so read-modify-write is enough.
 */
export async function saveResults(id: string, items: { n: number; name: string; width: number; height: number; scale: number; data: Buffer; type: FigmaImageType }[]): Promise<FigmaResult[]> {
  let results = await readResults(id);
  for (const item of items) {
    await tempSave(`${dir(id)}/results/${item.n}`, item.data, item.type);
    const hash = createHash("sha256").update(item.data).digest("hex").slice(0, 32);
    results = upsertResult(results, { n: item.n, name: item.name, width: item.width, height: item.height, scale: item.scale, hash });
  }
  await tempSave(`${dir(id)}/results.json`, Buffer.from(JSON.stringify(results)), "application/json");
  return results;
}

export async function readResult(id: string, n: number) {
  return tempRead(`${dir(id)}/results/${n}`);
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
