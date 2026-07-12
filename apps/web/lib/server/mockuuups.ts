import "server-only";

/**
 * Server-only wrapper over the Mockuuups Studio REST API (photoreal device
 * mockups). The API key is a secret and must never reach the browser — every
 * call goes through the /api/mockuuups/* routes, which call these helpers.
 *
 * Contract (discovered against the live API):
 *   GET  /v1/mockups?page&limit  → { total, pages, mockups:[{id,title,thumbnail,
 *                                    width,height,placements:[{slug,title,family,
 *                                    width,height,type}],tags}] }  (no server filter)
 *   POST /v1/renders  { mockup, size, destination:"cdn",
 *                       contents:[{type:"image"|"screenshot", url}] }
 *        → { id, state:"success", cost, cdn:{download,thumbnail,optimized,expiration} }
 *        contents.length must equal the mockup's placement count, same order.
 *        Synchronous by default; size>1000 = +1 credit; HTTP 402 when out of credits.
 *   GET  /v1/account → { usage:{creditsLeft,creditsUsed}, subscription:{plan} }
 */

const BASE = "https://api.mockuuups.studio/v1";

export class MockuuupsError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "MockuuupsError";
    this.status = status;
    this.code = code;
  }
}

function apiKey(): string {
  const k = process.env.MOCKUUUPS_API_KEY;
  if (!k) throw new MockuuupsError("Mockuuups API key is not configured (set MOCKUUUPS_API_KEY)", 501);
  return k;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers ?? {}),
      },
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new MockuuupsError("Couldn't reach Mockuuups — try again", 502);
  }
  const json = (await res.json().catch(() => null)) as
    | { error?: { code?: string; detail?: string; message?: string } }
    | null;
  if (!res.ok) {
    const code = json?.error?.code;
    const message =
      res.status === 402 || code === "out-of-credits"
        ? "You're out of Mockuuups render credits"
        : json?.error?.detail || json?.error?.message || `Mockuuups request failed (${res.status})`;
    throw new MockuuupsError(message, res.status, code);
  }
  return json as T;
}

export interface MkPlacement {
  slug: string;
  title: string;
  family: string;
  width: number;
  height: number;
  type: "digital" | "print" | string;
}
export interface MkMockup {
  id: string;
  title: string;
  thumbnail: string;
  width: number;
  height: number;
  placements: MkPlacement[];
  tags: { slug: string; title: string }[];
}

export async function listDevices(): Promise<{ slug: string; title: string }[]> {
  return call(`/devices`);
}

export async function listMockups(
  page: number,
  limit: number,
  device?: string
): Promise<{ total: number; pages: number; mockups: MkMockup[] }> {
  // The API supports server-side filtering by device slug (`device=<slug>`);
  // no filter → newest-first across the whole catalog.
  const dev = device ? `&device=${encodeURIComponent(device)}` : "";
  return call(`/mockups?page=${page}&limit=${limit}${dev}`);
}

interface RenderResponse {
  id: string;
  state: string;
  cost: number;
  cdn?: { download?: string; thumbnail?: string; optimized?: string; expiration?: string };
}

export async function renderMockup(
  mockup: string,
  imageUrl: string,
  size: number
): Promise<{ dataUrl: string; cost: number }> {
  const data = await call<RenderResponse>(`/renders`, {
    method: "POST",
    body: JSON.stringify({
      mockup,
      size,
      destination: "cdn",
      contents: [{ type: "image", url: imageUrl }],
    }),
  });
  const cdnUrl = data.cdn?.download;
  if (!cdnUrl) throw new MockuuupsError("Render succeeded but no image URL was returned", 502);

  // The render CDN is cross-origin (and temporary on the trial), so the browser
  // can't fetch it directly. Pull the bytes server-side and hand back a data URL
  // the client can ingest same-origin into a permanent local asset.
  let img: Response;
  try {
    img = await fetch(cdnUrl, { signal: AbortSignal.timeout(30_000) });
  } catch {
    throw new MockuuupsError("Rendered image couldn't be downloaded — try again", 502);
  }
  if (!img.ok) throw new MockuuupsError("Rendered image couldn't be downloaded — try again", 502);
  const buf = Buffer.from(await img.arrayBuffer());
  const ct = img.headers.get("content-type");
  const mime = ct && ct.startsWith("image/") ? ct : "image/jpeg";
  return { dataUrl: `data:${mime};base64,${buf.toString("base64")}`, cost: data.cost ?? 0 };
}

export async function account(): Promise<{ creditsLeft: number; creditsUsed: number; plan: string }> {
  const data = await call<{
    usage?: { creditsLeft?: number; creditsUsed?: number };
    subscription?: { plan?: string };
  }>(`/account`);
  return {
    creditsLeft: data.usage?.creditsLeft ?? 0,
    creditsUsed: data.usage?.creditsUsed ?? 0,
    plan: data.subscription?.plan ?? "",
  };
}
