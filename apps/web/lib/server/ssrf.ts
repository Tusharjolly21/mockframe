import { lookup as lookupCb, type LookupAddress } from "node:dns";
import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
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

/** Expand an IPv6 address (any textual form, including a dotted tail) to its 16 bytes. */
function ipv6Bytes(address: string): number[] | null {
  let a = address;
  const tail = a.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/);
  if (tail) {
    const o = tail[2].split(".").map(Number);
    if (o.some((n) => n > 255)) return null;
    a = tail[1] + ((o[0] << 8) | o[1]).toString(16) + ":" + ((o[2] << 8) | o[3]).toString(16);
  }
  const halves = a.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const rest = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const fill = 8 - head.length - rest.length;
  if (halves.length === 1 ? head.length !== 8 : fill < 0) return null;
  const groups = [...head, ...Array(halves.length === 2 ? fill : 0).fill("0"), ...rest];
  const bytes: number[] = [];
  for (const g of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
    const n = parseInt(g, 16);
    bytes.push(n >> 8, n & 255);
  }
  return bytes.length === 16 ? bytes : null;
}

function isBlockedIPv4(a: number, b: number, c = 0): boolean {
  return (
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) || // 192.0.0.0/24 + 192.0.2.0/24 only: the rest of 192.0/16 is public (WordPress CDN etc.)
    (a === 198 && (b === 18 || b === 19))
  );
}

export function isBlockedAddress(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, "").split("%")[0];
  if (isIP(normalized) === 4) {
    const [a, b, c] = normalized.split(".").map(Number);
    return isBlockedIPv4(a, b, c);
  }
  if (isIP(normalized) === 6) {
    const x = ipv6Bytes(normalized);
    if (!x) return true;
    const zeros = (from: number, to: number) => x.slice(from, to).every((v) => v === 0);
    if (zeros(0, 16) || (zeros(0, 15) && x[15] === 1)) return true; // :: and ::1
    // embedded IPv4: ::ffff:a.b.c.d (mapped), ::a.b.c.d (compatible), 64:ff9b::/96 (NAT64), 2002::/16 (6to4)
    if (zeros(0, 10) && x[10] === 0xff && x[11] === 0xff) return isBlockedIPv4(x[12], x[13], x[14]);
    if (zeros(0, 12)) return isBlockedIPv4(x[12], x[13], x[14]);
    if (x[0] === 0x00 && x[1] === 0x64 && x[2] === 0xff && x[3] === 0x9b) return isBlockedIPv4(x[12], x[13], x[14]);
    if (x[0] === 0x20 && x[1] === 0x02) return isBlockedIPv4(x[2], x[3], x[4]);
    return (x[0] & 0xfe) === 0xfc || (x[0] === 0xfe && (x[1] & 0xc0) === 0x80) || x[0] === 0xff; // ULA, link-local, multicast
  }
  return true; // unresolved / unexpected → block
}

/** Throws if `target` is non-public (bad scheme, blocked host, or any resolved
 *  IP is private/loopback/link-local/metadata). */
export async function assertPublicUrl(target: URL): Promise<void> {
  if (target.protocol !== "https:" && target.protocol !== "http:") throw new Error("Only http(s) URLs are supported");
  if (isBlockedHost(target.hostname)) throw new Error("This host is not allowed");
  const host = target.hostname.replace(/^\[|\]$/g, "");
  // an IP literal needs no DNS: judge it directly (URL() normalises ::ffff:127.0.0.1 to hex, which a DNS lookup of the brackets would not catch)
  if (isIP(host)) {
    if (isBlockedAddress(host)) throw new Error("This host is not allowed");
    return;
  }
  const addresses = await lookup(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isBlockedAddress(address))) {
    throw new Error("This host is not allowed");
  }
}

/**
 * A DNS lookup that refuses internal addresses at CONNECT time. assertPublicUrl
 * resolves the host once and the HTTP client resolves it again, so a name that
 * alternates between a public and an internal address (DNS rebinding) can pass
 * the first check and still be fetched from inside. Handing this to the client
 * as its `lookup` makes the address it connects to the address we judged.
 */
export function guardedLookup(
  hostname: string,
  options: { all?: boolean; family?: number | string } | undefined,
  callback: (err: Error | null, address?: string | LookupAddress[], family?: number) => void
): void {
  lookupCb(hostname, { all: true, verbatim: true }, (err, addresses) => {
    if (err) return callback(err);
    // judge every record, even ones the caller will not use
    if (!addresses.length || addresses.some(({ address }) => isBlockedAddress(address))) return callback(new Error("This host is not allowed"));
    const wanted = Number(options?.family) === 4 || Number(options?.family) === 6 ? Number(options?.family) : 0;
    const usable = wanted ? addresses.filter(({ family }) => family === wanted) : addresses;
    if (!usable.length) return callback(new Error("ENOTFOUND"));
    if (options?.all) return callback(null, usable);
    callback(null, usable[0].address, usable[0].family);
  });
}

/**
 * GET a public URL into memory with a byte cap, no redirects, a deadline and
 * connect-time address checks. Streams, so a hostile host cannot make us buffer
 * gigabytes before the size check.
 */
export async function fetchPublicBytes(
  target: URL,
  { maxBytes, timeoutMs = 15_000, accept = "*/*" }: { maxBytes: number; timeoutMs?: number; accept?: string }
): Promise<{ status: number; contentType: string; data: Buffer; tooLarge: boolean }> {
  await assertPublicUrl(target);
  const client = target.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const settle = <T,>(fn: (value: T) => void) => (value: T) => {
      clearTimeout(deadline);
      fn(value);
    };
    const done = settle(resolve);
    const fail = settle(reject);
    const req = client.request(
      target,
      { method: "GET", headers: { accept, "user-agent": "MockFrameBot/1.0 (+https://mockframe.app)" }, lookup: guardedLookup as never, timeout: timeoutMs },
      (res) => {
        const contentType = String(res.headers["content-type"] ?? "").split(";")[0].trim();
        const declared = Number(res.headers["content-length"] ?? 0);
        if (declared > maxBytes) {
          res.destroy();
          return done({ status: res.statusCode ?? 0, contentType, data: Buffer.alloc(0), tooLarge: true });
        }
        const chunks: Buffer[] = [];
        let total = 0;
        res.on("data", (chunk: Buffer) => {
          total += chunk.length;
          if (total > maxBytes) {
            res.destroy();
            done({ status: res.statusCode ?? 0, contentType, data: Buffer.alloc(0), tooLarge: true });
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => done({ status: res.statusCode ?? 0, contentType, data: Buffer.concat(chunks), tooLarge: false }));
        res.on("error", fail);
      }
    );
    // `timeout` above is an idle timer that every received byte resets; this is the real deadline
    const deadline = setTimeout(() => req.destroy(new Error("timeout")), timeoutMs);
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", fail);
    req.end();
  });
}
