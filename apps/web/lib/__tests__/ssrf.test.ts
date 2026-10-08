import { describe, expect, it } from "vitest";
import { assertPublicUrl, isBlockedAddress } from "../server/ssrf";

describe("ssrf guard", () => {
  it("blocks private, loopback and metadata addresses in every IPv6 spelling", () => {
    for (const a of [
      "127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "192.0.0.8", "192.0.2.5",
      "::1", "::", "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:a9fe:a9fe", "0:0:0:0:0:ffff:7f00:1",
      "64:ff9b::7f00:1", "64:ff9b::a00:1", "2002:7f00:1::1", "::7f00:1", "fd00::1", "fc00::1", "fe80::1", "ff02::1",
    ]) {
      expect(isBlockedAddress(a), a).toBe(true);
    }
  });

  it("allows public addresses", () => {
    for (const a of ["8.8.8.8", "93.184.216.34", "192.0.64.1", "::ffff:c000:4001", "2606:4700:4700::1111", "::ffff:808:808", "64:ff9b::808:808"]) {
      expect(isBlockedAddress(a), a).toBe(false);
    }
  });

  it("judges IP literals in URLs without a DNS lookup", async () => {
    await expect(assertPublicUrl(new URL("https://[::ffff:7f00:1]:8443/x.png"))).rejects.toThrow();
    await expect(assertPublicUrl(new URL("http://169.254.169.254/latest/meta-data"))).rejects.toThrow();
    await expect(assertPublicUrl(new URL("http://[::1]/"))).rejects.toThrow();
    await expect(assertPublicUrl(new URL("ftp://example.com/"))).rejects.toThrow();
    await expect(assertPublicUrl(new URL("https://8.8.8.8/"))).resolves.toBeUndefined();
  });
});

describe("guarded lookup", () => {
  it("refuses a name that resolves to an internal address", async () => {
    const { guardedLookup } = await import("../server/ssrf");
    await expect(
      new Promise((resolve, reject) => guardedLookup("localhost", { all: true }, (err, addrs) => (err ? reject(err) : resolve(addrs))))
    ).rejects.toThrow("not allowed");
  });
});
