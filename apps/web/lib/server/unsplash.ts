import "server-only";

/**
 * Server-only wrapper over the Unsplash public API. The access key is a secret
 * and must never reach the browser — every call goes through /api/unsplash/*,
 * which call these helpers. Public photo search needs only the Access Key
 * (`Authorization: Client-ID <key>`); the Secret Key is for OAuth user flows we
 * don't use, so it is intentionally never read here.
 *
 * Unsplash production-approval guidelines this integration follows:
 *  · hotlink thumbnails to the returned urls.* (the client renders those URLs)
 *  · trigger the download endpoint when a photo is actually used (triggerDownload)
 *  · attribute the photographer + Unsplash with UTM links (buildAttribution)
 * Demo tier is 50 req/hr; apply for production (1000/hr) once live.
 */

const BASE = "https://api.unsplash.com";
/** Unsplash requires UTM attribution on links back; app name per the dashboard. */
export const UTM = "utm_source=MockFrame&utm_medium=referral";

export class UnsplashError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "UnsplashError";
    this.status = status;
  }
}

export function hasUnsplashKey(): boolean {
  return !!process.env.UNSPLASH_ACCESS_KEY;
}

function accessKey(): string {
  const k = process.env.UNSPLASH_ACCESS_KEY;
  if (!k) throw new UnsplashError("Unsplash is not configured (set UNSPLASH_ACCESS_KEY)", 501);
  return k;
}

async function call<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: {
        Authorization: `Client-ID ${accessKey()}`,
        "Accept-Version": "v1",
      },
      // Unsplash editorial/search results are fine to cache briefly; keeps us
      // well under the 50 req/hr demo ceiling when many users browse the feed.
      next: { revalidate: 300 },
    });
  } catch {
    throw new UnsplashError("Could not reach Unsplash", 502);
  }
  if (res.status === 401) throw new UnsplashError("Unsplash rejected the access key", 401);
  if (res.status === 403) throw new UnsplashError("Unsplash rate limit reached — try again shortly", 429);
  if (!res.ok) throw new UnsplashError(`Unsplash error (${res.status})`, res.status);
  return (await res.json()) as T;
}

/** Slimmed photo shape the client actually needs. */
export interface UnsplashPhoto {
  id: string;
  /** small hotlinked thumbnail for the grid */
  thumb: string;
  /** full-res-ish url for the canvas (we still route the real fetch through the
   *  download endpoint so the photographer gets credited) */
  regular: string;
  /** Unsplash download_location — hit via triggerDownload when the photo is used */
  downloadLocation: string;
  /** average color, for a graceful skeleton */
  color: string;
  alt: string;
  authorName: string;
  authorLink: string;
  /** link back to the photo on Unsplash (attribution) */
  photoLink: string;
  blurHash: string | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function slim(p: any): UnsplashPhoto {
  return {
    id: String(p.id),
    thumb: p.urls?.thumb ?? p.urls?.small ?? "",
    regular: p.urls?.regular ?? p.urls?.full ?? "",
    downloadLocation: p.links?.download_location ?? "",
    color: typeof p.color === "string" ? p.color : "#e4e4ec",
    alt: p.alt_description || p.description || "Unsplash photo",
    authorName: p.user?.name ?? "Unknown",
    authorLink: `${p.user?.links?.html ?? "https://unsplash.com"}?${UTM}`,
    photoLink: `${p.links?.html ?? "https://unsplash.com"}?${UTM}`,
    blurHash: p.blur_hash ?? null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Editorial feed (no query) or keyword search. Landscape-biased for backdrops. */
export async function searchPhotos(query: string, page: number, perPage = 24): Promise<{ photos: UnsplashPhoto[]; totalPages: number }> {
  const q = query.trim();
  if (q) {
    const data = await call<{ results: unknown[]; total_pages: number }>(
      `/search/photos?query=${encodeURIComponent(q)}&page=${page}&per_page=${perPage}&orientation=landscape&content_filter=high`
    );
    return { photos: (data.results ?? []).map(slim), totalPages: data.total_pages ?? 1 };
  }
  // no query → the curated editorial feed
  const data = await call<unknown[]>(`/photos?page=${page}&per_page=${perPage}&order_by=popular`);
  return { photos: (Array.isArray(data) ? data : []).map(slim), totalPages: 20 };
}

/**
 * Register the download with Unsplash and return the real image URL to fetch.
 * REQUIRED by the API guidelines whenever a photo is actually used (not just
 * viewed) — this is what credits the photographer's download count.
 */
export async function triggerDownload(downloadLocation: string): Promise<string> {
  // only accept Unsplash's own download endpoints — never an arbitrary URL
  let loc: URL;
  try {
    loc = new URL(downloadLocation);
  } catch {
    throw new UnsplashError("Bad download location", 400);
  }
  if (loc.hostname !== "api.unsplash.com") throw new UnsplashError("Bad download location", 400);
  const data = await call<{ url: string }>(`${loc.pathname}${loc.search}`);
  if (!data.url) throw new UnsplashError("No download URL returned", 502);
  return data.url;
}
