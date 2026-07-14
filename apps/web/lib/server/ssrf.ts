import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * SSRF guard for server-side fetches to user-supplied URLs. A string blocklist
 * alone is bypassable via a public hostname whose DNS points at an internal
 * address (or a rebinding record), so we ALSO resolve the host and reject any
 * private/loopback/link-local/metadata address. Mirrors the capture route's
 * assertPublicTarget so post-import gets the same protection.
 */

function isBlockedHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h === "0.0.0.0" || h === "::1" || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (/^127\.|^10\.|^192\.168\.|^169\.254\./.test(h)) return true;
  const m172 = h.match(/^172\.(\d+)\./);
  if (m172 && +m172[1] >= 16 && +m172[1] <= 31) return true;
  if (/^f[cd][0-9a-f]{2}:|^fe80:/.test(h)) return true; // IPv6 ULA + link-local
  return false;
}

function isBlockedAddress(address: string): boolean {
  const normalized = address.toLowerCase().split("%")[0];
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (mapped) return isBlockedAddress(mapped);
  if (isIP(normalized) === 4) {
    const [a, b] = normalized.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  if (isIP(normalized) === 6) {
    return normalized === "::" || normalized === "::1" || /^f[cd]/.test(normalized) || /^fe[89ab]/.test(normalized) || /^ff/.test(normalized);
  }
  return true; // unresolved / unexpected → block
}

/** Throws if `target` is non-public (bad scheme, blocked host, or any resolved
 *  IP is private/loopback/link-local/metadata). */
export async function assertPublicUrl(target: URL): Promise<void> {
  if (target.protocol !== "https:" && target.protocol !== "http:") throw new Error("Only http(s) URLs are supported");
  if (isBlockedHost(target.hostname)) throw new Error("This host is not allowed");
  const addresses = await lookup(target.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isBlockedAddress(address))) {
    throw new Error("This host is not allowed");
  }
}
