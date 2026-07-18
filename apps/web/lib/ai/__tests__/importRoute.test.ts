import { describe, expect, it } from "vitest";
import { ImportFetchError, resolveRedirectTarget } from "../importRedirect";

/**
 * Unit coverage for the one pure helper extracted out of the /api/ai-import
 * redirect loop: resolving a redirect's Location header against the URL it
 * was served from. No network, no SSRF check (the route re-validates the
 * result with assertPublicUrl before following it) — so this is the one
 * piece worth testing in isolation. The rest of the route (gating, fetch,
 * body cap, error mapping) is reviewed by inspection per the task brief.
 */
describe("resolveRedirectTarget", () => {
  const current = new URL("https://example.com/a/b");

  it("resolves an absolute Location", () => {
    expect(resolveRedirectTarget("https://other.com/x", current).toString()).toBe("https://other.com/x");
  });

  it("resolves a relative Location against the current URL", () => {
    expect(resolveRedirectTarget("/c", current).toString()).toBe("https://example.com/c");
  });

  it("resolves a protocol-relative Location", () => {
    expect(resolveRedirectTarget("//other.com/y", current).toString()).toBe("https://other.com/y");
  });

  it("throws ImportFetchError when Location is missing", () => {
    expect(() => resolveRedirectTarget(null, current)).toThrow(ImportFetchError);
  });

  it("throws ImportFetchError when Location is unparseable", () => {
    expect(() => resolveRedirectTarget("http://[::1", current)).toThrow(ImportFetchError);
  });
});
