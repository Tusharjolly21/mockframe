import { LOOK_NAMES } from "./apiRender";

/**
 * Frames sent from the Mockframe Figma plugin (public/figma-plugin). The
 * plugin creates an import, uploads each frame as a PNG or JPEG, then either
 * opens /editor?figma=<id>, which downloads them, or asks the server to render
 * mockups of them. Finished images go back the other way as the import's
 * results (/results), which the plugin places on the Figma page. Shared by the API
 * routes and the editor; pure, so the rules are tested in one place.
 */

export const FIGMA_MAX_FRAMES = 8;
/** stays under Vercel's 4.5 MB body limit; the plugin re-exports smaller frames */
export const FIGMA_MAX_FRAME_BYTES = 4 * 1024 * 1024;
export const FIGMA_IMPORT_TTL_MS = 24 * 60 * 60 * 1000;
export const FIGMA_STORE_SETS = ["stride", "penny", "hush", "habitat", "tempo", "parla", "vault", "orbit", "atlas"] as const;
/** images sent back to Figma per import */
export const FIGMA_MAX_RESULTS = 24;
/** Figma scales down images over 4096 px on a side, so results stay within it */
export const FIGMA_MAX_IMAGE_EDGE = 4096;
/** results render at 2x when they fit, so they're crisp at 100% in Figma */
export const FIGMA_RESULT_SCALE = 2;
/** free mockup runs from the plugin, per person per day (each makes up to 8) */
export const FIGMA_DAILY_RENDERS = 30;

/** The plugin's device picker for instant mockups ("auto" fits each frame). */
export const FIGMA_DEVICES = [
  { id: "auto", label: "Auto" },
  { id: "iphone-17-pro", label: "iPhone 17 Pro" },
  { id: "iphone-17-pro-max", label: "iPhone 17 Pro Max" },
  { id: "pixel-10-pro", label: "Pixel 10 Pro" },
  { id: "galaxy-s25-ultra", label: "Galaxy S25 Ultra" },
  { id: "ipad-pro-13", label: "iPad Pro 13" },
  { id: "macbook-pro-14", label: "MacBook Pro 14" },
  { id: "imac-24", label: "iMac 24" },
  { id: "apple-watch-series-11", label: "Apple Watch Series 11" },
  { id: "chrome-browser", label: "Chrome browser" },
  { id: "safari-browser", label: "Safari browser" },
  { id: "frameless", label: "Frameless" },
] as const;

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
  /** open as a Showcase: a poster, a before / after and finished shots */
  showcase?: true;
  frames: FigmaFrameMeta[];
}

/** An image going back to Figma, rendered in the editor or by the server. */
export interface FigmaResult {
  /** slot 0 to FIGMA_MAX_RESULTS - 1; sending to the same slot updates it */
  n: number;
  name: string;
  /** pixels */
  width: number;
  height: number;
  /** pixels per Figma unit: the placed frame is width / scale wide */
  scale: number;
  /** goes up each time the slot gets a different image */
  version: number;
  hash: string;
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
  return { ok: true, value: b.showcase === true ? { mode, showcase: true, frames } : { mode, frames } };
}

/** PNG or JPEG from the file's first bytes; null for anything else. */
export function sniffImage(bytes: Uint8Array): FigmaImageType | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  return null;
}

export const isImportId = (id: string) => /^[0-9a-f-]{36}$/.test(id);

export const isExpired = (m: Pick<FigmaImportManifest, "createdAt">, now = Date.now()) => now - m.createdAt > FIGMA_IMPORT_TTL_MS;

/** Pixel size from a PNG or JPEG header; null when it can't be read. */
export function imageSize(bytes: Uint8Array): { width: number; height: number } | null {
  const type = sniffImage(bytes);
  const u16 = (i: number) => (bytes[i] << 8) | bytes[i + 1];
  if (type === "image/png") {
    if (bytes.length < 24) return null;
    const u32 = (i: number) => ((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]) >>> 0;
    const width = u32(16);
    const height = u32(20);
    return width && height ? { width, height } : null;
  }
  if (type !== "image/jpeg") return null;
  let i = 2;
  while (i + 8 < bytes.length) {
    if (bytes[i] !== 0xff) return null;
    const marker = bytes[i + 1];
    if (marker === 0xff) {
      i++; // fill byte
      continue;
    }
    // markers without a length
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      i += 2;
      continue;
    }
    // start of frame: every SOFn, which leaves out DHT, JPG and DAC
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const height = u16(i + 5);
      const width = u16(i + 7);
      return width && height ? { width, height } : null;
    }
    i += 2 + u16(i + 2);
  }
  return null;
}

/** The slot and details of a result the editor sends: PUT /results/<n>?name=&scale=. */
export function parseResultUpload(n: string, query: URLSearchParams): { ok: true; n: number; name: string; scale: number } | { ok: false; error: string } {
  if (!/^\d{1,3}$/.test(n) || Number(n) >= FIGMA_MAX_RESULTS) return { ok: false, error: `Send up to ${FIGMA_MAX_RESULTS} designs at a time` };
  const slot = Number(n);
  const name = (query.get("name") ?? "").trim().slice(0, 120) || `Mockup ${slot + 1}`;
  const scale = Number(query.get("scale") ?? FIGMA_RESULT_SCALE);
  if (!finite(scale, 0.25, 4)) return { ok: false, error: "Scale must be between 0.25 and 4" };
  return { ok: true, n: slot, name, scale: Math.round(scale * 1000) / 1000 };
}

/** The results with `entry` in its slot. The version only goes up when the image changed. */
export function upsertResult(results: FigmaResult[], entry: Omit<FigmaResult, "version">): FigmaResult[] {
  const prev = results.find((r) => r.n === entry.n);
  const version = !prev ? 1 : prev.hash === entry.hash ? prev.version : prev.version + 1;
  return [...results.filter((r) => r.n !== entry.n), { ...entry, version }].sort((a, b) => a.n - b.n);
}

/**
 * A result slot for each shot, keeping the slots shots already had so a
 * resend updates the same frames in Figma. New shots take free slots; past
 * FIGMA_MAX_RESULTS they reuse slots of shots that are gone, then get none.
 */
export function assignSlots(previous: Record<string, number>, shotIds: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  const used = new Set<number>();
  for (const id of shotIds) {
    const n = previous[id];
    if (n !== undefined && !used.has(n)) {
      out[id] = n;
      used.add(n);
    }
  }
  const taken = new Set(Object.values(previous));
  const fresh = Array.from({ length: FIGMA_MAX_RESULTS }, (_, n) => n).filter((n) => !taken.has(n));
  const stale = [...taken].filter((n) => !used.has(n)).sort((a, b) => a - b);
  for (const id of shotIds) {
    if (id in out) continue;
    const n = fresh.shift() ?? stale.shift();
    if (n === undefined) break;
    out[id] = n;
    used.add(n);
  }
  return out;
}

/** The scale to render a design at for Figma: 2x, or less when that would pass Figma's image limit. */
export function figmaScale(width: number, height: number, want = FIGMA_RESULT_SCALE): number {
  const fit = Math.floor((FIGMA_MAX_IMAGE_EDGE / Math.max(width, height, 1)) * 1000) / 1000;
  return Math.max(0.25, Math.min(want, fit));
}

/** A result as the plugin sees it, without the content hash. */
export const publicResult = ({ n, name, width, height, scale, version }: FigmaResult) => ({ n, name, width, height, scale, version });

/** Validate POST /api/figma-import/<id>/render: { kind: "mockup", device, look }. */
export function parseRenderRequest(body: unknown): { ok: true; device: string; look: number | null } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Send a JSON body" };
  const b = body as Record<string, unknown>;
  if (b.kind !== undefined && b.kind !== "mockup") return { ok: false, error: "Store sets are made in the editor. Use Open in editor." };
  const device = b.device ?? "auto";
  if (typeof device !== "string" || !/^[a-z0-9-]{1,80}$/.test(device)) return { ok: false, error: "Pick a device, or Auto" };
  let look: number | null = null;
  if (b.look !== undefined && b.look !== null && b.look !== "none") {
    const i = typeof b.look === "number" ? b.look : LOOK_NAMES.indexOf(b.look as (typeof LOOK_NAMES)[number]);
    if (!Number.isInteger(i) || i < 0 || i >= LOOK_NAMES.length) return { ok: false, error: `look must be one of ${LOOK_NAMES.join(", ")}` };
    look = i;
  }
  return { ok: true, device, look };
}
