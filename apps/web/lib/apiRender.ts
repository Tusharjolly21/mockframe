/**
 * Render jobs for the paid API (/api/v1/screenshots) and the MCP server.
 * The server resolves each screenshot to a data URL, then a headless browser
 * opens /render and builds the scenes with the same code as the editor
 * (components/render/RenderHost.tsx). Pure, so validation is tested once.
 */

export const API_MAX_SCREENSHOTS = 8;
export const API_RESULT_TTL_MS = 24 * 60 * 60 * 1000;
export const STORE_SET_STYLES = ["stride", "penny", "hush", "habitat"] as const;
export type StoreSetStyle = (typeof STORE_SET_STYLES)[number];
/** "Make it pretty" looks, by position (see lib/prettify.ts) */
export const LOOK_NAMES = ["deep", "glow", "soft", "aurora", "duotone", "studio"] as const;

export type RenderFormat = "png" | "jpeg";

interface JobBase {
  /** data URLs once resolved; before that also https URLs or upload ids */
  screenshots: string[];
  format: RenderFormat;
  scale: 1 | 2;
}

export interface MockupJob extends JobBase {
  kind: "mockup";
  /** a device id, or "auto" for the one that fits each screenshot */
  device: string;
  /** index into LOOK_NAMES, or null to keep the device's own background */
  look: number | null;
}

export interface StoreSetJob extends JobBase {
  kind: "store-set";
  set: StoreSetStyle;
  platform: "ios" | "android";
}

export type RenderJob = MockupJob | StoreSetJob;

export interface RenderedImage {
  name: string;
  width: number;
  height: number;
  dataUrl: string;
}

const DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const UPLOAD_ID = /^upload_[0-9a-f-]{36}$/;

/** A screenshot reference: a data URL, a public https URL, or an id from /api/v1/uploads. */
export function screenshotRef(s: unknown): string | null {
  if (typeof s !== "string") return null;
  const v = s.trim();
  if (DATA_URL.test(v) || UPLOAD_ID.test(v)) return v;
  try {
    const u = new URL(v);
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export const isUploadRef = (s: string) => UPLOAD_ID.test(s);
export const isDataUrl = (s: string) => DATA_URL.test(s);

type Parsed = { ok: true; job: RenderJob } | { ok: false; error: string };

export function parseRenderJob(body: unknown): Parsed {
  if (!body || typeof body !== "object") return { ok: false, error: "Send a JSON body." };
  const b = body as Record<string, unknown>;
  const list = Array.isArray(b.screenshots) ? b.screenshots : typeof b.screenshot === "string" ? [b.screenshot] : [];
  if (!list.length) return { ok: false, error: "Add screenshots: an array of https URLs, data URLs or upload ids." };
  if (list.length > API_MAX_SCREENSHOTS) return { ok: false, error: `Send up to ${API_MAX_SCREENSHOTS} screenshots per request.` };
  const screenshots: string[] = [];
  for (const s of list) {
    const ref = screenshotRef(s);
    if (!ref) return { ok: false, error: "Each screenshot must be an https URL, a PNG/JPEG/WebP data URL, or an upload id." };
    screenshots.push(ref);
  }
  const format: RenderFormat = b.format === "jpeg" || b.format === "jpg" ? "jpeg" : "png";
  const scale = b.scale === 2 ? 2 : 1;

  if (b.type === "store-set" || b.kind === "store-set") {
    const set = STORE_SET_STYLES.find((s) => s === b.style || s === b.set);
    if ((b.style ?? b.set) !== undefined && !set) return { ok: false, error: `style must be one of ${STORE_SET_STYLES.join(", ")}.` };
    return { ok: true, job: { kind: "store-set", screenshots, set: set ?? "stride", platform: b.platform === "android" ? "android" : "ios", format, scale: 1 } };
  }

  const device = typeof b.device === "string" && b.device.trim() ? b.device.trim().slice(0, 80) : "auto";
  let look: number | null = null;
  if (b.look !== undefined && b.look !== null && b.look !== "none") {
    const i = typeof b.look === "number" ? b.look : LOOK_NAMES.indexOf(b.look as (typeof LOOK_NAMES)[number]);
    if (!Number.isInteger(i) || i < 0 || i >= LOOK_NAMES.length) return { ok: false, error: `look must be one of ${LOOK_NAMES.join(", ")}.` };
    look = i;
  }
  return { ok: true, job: { kind: "mockup", screenshots, device, look, format, scale } };
}
