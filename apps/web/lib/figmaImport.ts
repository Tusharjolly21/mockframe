/**
 * Frames sent from the Mockframe Figma plugin (public/figma-plugin). The
 * plugin creates an import, uploads each frame as a PNG or JPEG, then opens
 * /editor?figma=<id>, which downloads them. Shared by the API routes and the
 * editor; pure, so the rules are tested in one place.
 */

export const FIGMA_MAX_FRAMES = 8;
/** stays under Vercel's 4.5 MB body limit; the plugin re-exports smaller frames */
export const FIGMA_MAX_FRAME_BYTES = 4 * 1024 * 1024;
export const FIGMA_IMPORT_TTL_MS = 24 * 60 * 60 * 1000;
export const FIGMA_STORE_SETS = ["stride", "penny", "hush", "habitat"] as const;

export type FigmaImageType = "image/png" | "image/jpeg";
export type FigmaImportMode = "devices" | "set";

export interface FigmaFrameMeta {
  name: string;
  width: number;
  height: number;
}

export interface FigmaImportManifest {
  id: string;
  createdAt: number;
  mode: FigmaImportMode;
  /** store set slug, for mode "set" */
  set?: string;
  platform?: "ios" | "android";
  frames: FigmaFrameMeta[];
}

type Parsed = { ok: true; value: Omit<FigmaImportManifest, "id" | "createdAt"> } | { ok: false; error: string };

const finite = (v: unknown, lo: number, hi: number): v is number => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;

/** Validate the plugin's "create an import" request body. */
export function parseImportRequest(body: unknown): Parsed {
  if (!body || typeof body !== "object") return { ok: false, error: "Send a JSON body" };
  const b = body as Record<string, unknown>;
  const mode: FigmaImportMode = b.mode === "set" ? "set" : "devices";
  if (!Array.isArray(b.frames) || !b.frames.length) return { ok: false, error: "Select at least one frame" };
  if (b.frames.length > FIGMA_MAX_FRAMES) return { ok: false, error: `Send up to ${FIGMA_MAX_FRAMES} frames at a time` };
  const frames: FigmaFrameMeta[] = [];
  for (const f of b.frames as unknown[]) {
    const r = (f ?? {}) as Record<string, unknown>;
    if (!finite(r.width, 1, 16384) || !finite(r.height, 1, 16384)) return { ok: false, error: "Each frame needs a width and height" };
    const name = typeof r.name === "string" && r.name.trim() ? r.name.trim().slice(0, 120) : `Frame ${frames.length + 1}`;
    frames.push({ name, width: Math.round(r.width), height: Math.round(r.height) });
  }
  if (mode === "set") {
    const set = FIGMA_STORE_SETS.find((s) => s === b.set) ?? FIGMA_STORE_SETS[0];
    return { ok: true, value: { mode, set, platform: b.platform === "android" ? "android" : "ios", frames } };
  }
  return { ok: true, value: { mode, frames } };
}

/** PNG or JPEG from the file's first bytes; null for anything else. */
export function sniffImage(bytes: Uint8Array): FigmaImageType | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  return null;
}

export const isImportId = (id: string) => /^[0-9a-f-]{36}$/.test(id);

export const isExpired = (m: Pick<FigmaImportManifest, "createdAt">, now = Date.now()) => now - m.createdAt > FIGMA_IMPORT_TTL_MS;
