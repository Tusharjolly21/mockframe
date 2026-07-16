"use client";

import { renderSceneToPng } from "../bulkExport";
import { firebaseFetch } from "../firebaseClient";
import { buildZip, type ZipEntry } from "../zip";
import { compilePack, packReadme } from "./compile";
import type { PackExportVerdict } from "./gate";
import type { PackDocument } from "./schema";

/** Ask the server whether this export may proceed (and whether it's watermark-free). */
export async function requestPackExport(): Promise<PackExportVerdict> {
  let res: Response;
  try {
    res = await firebaseFetch("/api/pack-export", { method: "POST" });
  } catch {
    throw new Error("Couldn't reach the export service — check your connection and retry.");
  }
  if (res.status === 401) return { allowed: false, reason: "signin" };
  if (res.status === 402) return { allowed: false, reason: "pro" };
  if (!res.ok) throw new Error("Export authorization failed — please retry.");
  const json = (await res.json()) as { allowed?: boolean; clean?: boolean };
  return json.allowed ? { allowed: true, clean: !!json.clean } : { allowed: false, reason: "pro" };
}

/** Render every enabled screen × target offscreen and download one zip.
 *  Per-file failures are skipped and reported, never abort the pack. */
export async function exportPackZip(
  pack: PackDocument,
  opts: { clean: boolean; onProgress?: (done: number, total: number) => void }
): Promise<{ failed: string[] }> {
  const compiled = compilePack(pack);
  const entries: ZipEntry[] = [];
  const failed: string[] = [];
  for (let i = 0; i < compiled.length; i++) {
    const entry = compiled[i];
    try {
      const png = await renderSceneToPng(entry.scene, 1, opts.clean, entry.panoramaIdx, entry.panoramaTotal);
      entries.push({ name: entry.path, data: png });
    } catch {
      failed.push(entry.path);
    }
    opts.onProgress?.(i + 1, compiled.length);
  }
  if (!entries.length) throw new Error("Every screenshot failed to render — please retry.");
  entries.push({ name: "README.txt", data: new TextEncoder().encode(packReadme(pack, failed)) });

  const zip = buildZip(entries);
  const slug = (pack.appName || "app").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "app";
  const a = document.createElement("a");
  a.href = URL.createObjectURL(zip);
  a.download = `${slug}-screenshots.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return { failed };
}
