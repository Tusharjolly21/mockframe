/**
 * Pure helper for /api/ai-import's manual redirect loop, kept separate from
 * the route so it can be unit-tested without pulling in Next.js / Firebase
 * imports (which aren't resolvable under the plain-node vitest config).
 */

export class ImportFetchError extends Error {}

/**
 * Resolves a redirect's `Location` header against the URL it was served
 * from. No network, no SSRF check — the caller re-validates the result with
 * assertPublicUrl before following it. Throws ImportFetchError on a missing
 * or unparseable Location.
 */
export function resolveRedirectTarget(location: string | null, current: URL): URL {
  if (!location) throw new ImportFetchError("bad-redirect");
  try {
    return new URL(location, current);
  } catch {
    throw new ImportFetchError("bad-redirect");
  }
}
