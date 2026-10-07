import { describe, expect, it } from "vitest";
import { FIGMA_IMPORT_TTL_MS, FIGMA_MAX_FRAMES, isExpired, isImportId, parseImportRequest, sniffImage } from "../figmaImport";
import { planFigmaScenes } from "../figmaOpen";
import type { GuestAsset } from "../assets";
import type { MockupLayer } from "@framekit/scene";
import { getDevice } from "@framekit/devices";

const frame = (w: number, h: number, name = "Frame") => ({ name, width: w, height: h });
const asset = (id: string, width: number, height: number): GuestAsset => ({ id, name: id, url: "data:,", width, height });

describe("Figma import requests", () => {
  it("accepts frames and defaults the mode", () => {
    const r = parseImportRequest({ frames: [frame(804, 1748, "  Home  ")] });
    expect(r).toEqual({ ok: true, value: { mode: "devices", frames: [{ name: "Home", width: 804, height: 1748 }] } });
  });

  it("checks frame count and sizes", () => {
    expect(parseImportRequest({ frames: [] }).ok).toBe(false);
    expect(parseImportRequest({ frames: Array.from({ length: FIGMA_MAX_FRAMES + 1 }, () => frame(10, 10)) }).ok).toBe(false);
    expect(parseImportRequest({ frames: [{ name: "x", width: "10", height: 10 }] }).ok).toBe(false);
    expect(parseImportRequest(null).ok).toBe(false);
  });

  it("keeps store-set options to known values", () => {
    const r = parseImportRequest({ mode: "set", set: "nope", platform: "windows", frames: [frame(1, 2)] });
    expect(r.ok && r.value).toMatchObject({ mode: "set", set: "stride", platform: "ios" });
    const a = parseImportRequest({ mode: "set", set: "hush", platform: "android", frames: [frame(1, 2)] });
    expect(a.ok && a.value).toMatchObject({ set: "hush", platform: "android" });
  });

  it("only takes PNG and JPEG bytes", () => {
    expect(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffImage(new TextEncoder().encode("<svg></svg>"))).toBeNull();
  });

  it("expires imports after a day and checks ids", () => {
    const now = 1_800_000_000_000;
    expect(isExpired({ createdAt: now - FIGMA_IMPORT_TTL_MS + 1000 }, now)).toBe(false);
    expect(isExpired({ createdAt: now - FIGMA_IMPORT_TTL_MS - 1 }, now)).toBe(true);
    expect(isImportId("1b4e28ba-2fa1-11d2-883f-0016d3cca427")).toBe(true);
    expect(isImportId("../../etc/passwd")).toBe(false);
  });
});

describe("opening Figma frames", () => {
  const mockups = (s: { scene: { layers: unknown[] } }) => s.scene.layers.filter((l): l is MockupLayer => (l as MockupLayer).type === "mockup");

  it("puts each frame in a device that fits it, one shot each", () => {
    const { shots, filled } = planFigmaScenes({ mode: "devices" }, [
      { asset: asset("p", 1179, 2556), name: "Home" },
      { asset: asset("d", 2880, 1800), name: "Landing" },
    ]);
    expect(filled).toBe(2);
    expect(shots.map((s) => s.name)).toEqual(["Home", "Landing"]);
    expect(getDevice(mockups(shots[0])[0].deviceId!)?.category).toBe("phone");
    expect(getDevice(mockups(shots[1])[0].deviceId!)?.category).toMatch(/laptop|desktop/);
    expect(mockups(shots[0])[0].media?.assetId).toBe("p");
    // the baseline is the empty device, so undo takes the frame out
    expect(mockups({ scene: shots[0].base })[0].media).toBeNull();
  });

  it("fills a store set with phone frames, and reports when none fit", () => {
    const set = planFigmaScenes({ mode: "set", set: "penny", platform: "ios" }, [{ asset: asset("p", 1179, 2556), name: "Home" }]);
    expect(set.shots).toHaveLength(8);
    expect(set.filled).toBeGreaterThan(8);
    const ids = set.shots.flatMap((s) => mockups(s).map((m) => m.media?.assetId));
    expect(ids.every((id) => id === "p")).toBe(true);
    const wide = planFigmaScenes({ mode: "set", set: "penny" }, [{ asset: asset("d", 2880, 1800), name: "Web" }]);
    expect(wide.shots).toHaveLength(8);
    expect(wide.filled).toBe(0);
  });
});
