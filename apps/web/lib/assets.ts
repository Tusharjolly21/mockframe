"use client";

import { createId } from "@framekit/scene";
import type { ResolvedAsset } from "@framekit/renderer";
import { resolveBuiltin } from "./builtinBackgrounds";
import { decodeScreenAsset, resolveScreenAsset, screenLogicalHeight, SCREEN_PREFIX } from "./screens";
import { SCREEN_APP_LABELS } from "./screens/types";
import { firebaseFetch } from "./firebaseClient";

/**
 * Client asset registry. Newly selected files start as data URLs so the
 * client-side exporter can serialize the DOM without any fetches. On draft
 * save, referenced assets are uploaded to Firebase Storage and their signed
 * URLs are restored into this same registry.
 */
export interface GuestAsset extends ResolvedAsset {
  id: string;
  name: string;
}

const assets = new Map<string, GuestAsset>();
const listeners = new Set<() => void>();

export function resolveAsset(assetId: string): GuestAsset | undefined {
  if (assetId.startsWith("builtin:")) {
    const b = resolveBuiltin(assetId);
    return b ? { id: assetId, name: b.label, url: b.url, width: b.width, height: b.height } : undefined;
  }
  // composed fake app screens render on demand — the encoded doc IS the id;
  // the lookup lets the doc reference uploaded photos (contact DPs) by id
  if (assetId.startsWith(SCREEN_PREFIX)) return resolveScreenAsset(assetId, (id) => assets.get(id)?.url);
  return assets.get(assetId);
}

const previewCache = new Map<string, GuestAsset>();

function svgPreviewDataUri(label: string, width: number, height: number, dark: boolean): string {
  const bg = dark ? "#111827" : "#f8fafc";
  const panel = dark ? "#1f2937" : "#ffffff";
  const muted = dark ? "#4b5563" : "#dbe2ea";
  const text = dark ? "#e5e7eb" : "#334155";
  const accent = dark ? "#38bdf8" : "#7c3aed";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="${width}" height="${height}" fill="${bg}"/>` +
    `<rect x="${width * 0.07}" y="${height * 0.08}" width="${width * 0.86}" height="${height * 0.84}" rx="${width * 0.055}" fill="${panel}" stroke="${muted}" stroke-width="${Math.max(2, width * 0.006)}"/>` +
    `<circle cx="${width * 0.18}" cy="${height * 0.18}" r="${width * 0.045}" fill="${accent}"/>` +
    `<rect x="${width * 0.26}" y="${height * 0.145}" width="${width * 0.44}" height="${height * 0.025}" rx="${height * 0.0125}" fill="${muted}"/>` +
    `<rect x="${width * 0.26}" y="${height * 0.19}" width="${width * 0.30}" height="${height * 0.018}" rx="${height * 0.009}" fill="${muted}" opacity="0.7"/>` +
    Array.from({ length: 7 }, (_, i) => {
      const y = height * (0.31 + i * 0.075);
      const right = i % 2 === 1;
      const w = width * (0.28 + ((i * 37) % 18) / 100);
      const x = right ? width * 0.86 - w : width * 0.14;
      const fill = right ? accent : muted;
      return `<rect x="${x}" y="${y}" width="${w}" height="${height * 0.043}" rx="${height * 0.021}" fill="${fill}" opacity="${right ? 0.95 : 0.82}"/>`;
    }).join("") +
    `<text x="${width / 2}" y="${height * 0.84}" text-anchor="middle" font-family="Inter,system-ui,sans-serif" font-size="${Math.max(30, width * 0.055)}" font-weight="750" fill="${text}">${label}</text>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Lightweight resolver for tiny editor previews. Full `screen:` SVGs are rich
 * and expensive to paint repeatedly, so thumbnails use a cheap surrogate while
 * the main canvas/export still call `resolveAsset()`.
 */
export function resolvePreviewAsset(assetId: string): GuestAsset | undefined {
  if (!assetId.startsWith(SCREEN_PREFIX)) return resolveAsset(assetId);
  const hit = previewCache.get(assetId);
  if (hit) return hit;
  const doc = decodeScreenAsset(assetId);
  if (!doc) return undefined;
  const width = 1206;
  const height = Math.round(screenLogicalHeight(doc) * 3);
  const dark = "chrome" in doc && !!doc.chrome.dark;
  const label = SCREEN_APP_LABELS[doc.app] ?? "Screen";
  const asset: GuestAsset = {
    id: assetId,
    name: `${label} preview`,
    url: svgPreviewDataUri(label, width, height, dark),
    width,
    height,
  };
  if (previewCache.size >= 64) {
    const oldest = previewCache.keys().next().value;
    if (oldest !== undefined) previewCache.delete(oldest);
  }
  previewCache.set(assetId, asset);
  return asset;
}

export function onAssetsChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function ingestFile(file: File): Promise<GuestAsset> {
  if (!file.type.startsWith("image/")) throw new Error("Only image files are supported");
  if (file.size > 40 * 1024 * 1024) throw new Error("Image exceeds 40MB");

  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });

  const { width, height } = await new Promise<{ width: number; height: number }>(
    (resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error("Not a decodable image"));
      img.src = url;
    }
  );

  const asset: GuestAsset = { id: createId(), name: file.name || "pasted-image", url, width, height };
  assets.set(asset.id, asset);
  listeners.forEach((fn) => fn());
  return asset;
}

/** Snapshot the uploaded (non-builtin) assets a scene references — drafts
 *  persist these alongside the document so a reload can restore them. */
export function collectAssets(ids: Iterable<string>): GuestAsset[] {
  const out: GuestAsset[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id) || id.startsWith("builtin:")) continue;
    seen.add(id);
    const a = assets.get(id);
    if (a) out.push(a);
  }
  return out;
}

/** Re-register assets restored from a saved draft. */
export function restoreAssets(list: GuestAsset[]): void {
  for (const a of list) assets.set(a.id, a);
  listeners.forEach((fn) => fn());
}

/** Upload a locally-ingested asset and retain its id so scene references do not
 * need to be rewritten. The returned URL is signed by the server. */
export async function persistAsset(asset: GuestAsset): Promise<GuestAsset> {
  if (asset.id.startsWith("builtin:") || asset.url.startsWith("http") === true) return asset;
  const response = await fetch(asset.url);
  const blob = await response.blob();
  const form = new FormData();
  form.set("id", asset.id);
  form.set("file", new File([blob], asset.name || "upload", { type: blob.type || "image/png" }));
  form.set("width", String(asset.width));
  form.set("height", String(asset.height));
  const result = await firebaseFetch("/api/assets", { method: "POST", body: form });
  if (!result.ok) throw new Error((await result.json().catch(() => null))?.error ?? "Asset upload failed");
  const saved = (await result.json()) as GuestAsset;
  const next = { ...asset, ...saved };
  assets.set(next.id, next);
  listeners.forEach((fn) => fn());
  return next;
}
