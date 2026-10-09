import { describe, expect, it } from "vitest";
import { addScreens, setScreenCapture } from "../ops";
import { createPack, type PackDocument } from "../schema";
import { applyPendingRefresh, looksLikeHookToken, mergePending, pngSize, type PendingRefresh } from "../deployRefresh";

const run = (atMs: number, updates: [string, string, string][], failed: PendingRefresh["failed"] = []): PendingRefresh => ({
  atMs,
  updates: updates.map(([screenId, assetId, url]) => ({ screenId, assetId, url })),
  failed,
});

describe("mergePending", () => {
  it("takes the run as-is when nothing is pending", () => {
    const r = run(10, [["s1", "a1", "https://x.dev/1"]]);
    expect(mergePending(null, r)).toEqual({ merged: r, superseded: [] });
  });

  it("lets the newer capture of a screen win and reports the replaced one", () => {
    const old = run(10, [["s1", "a1", "https://x.dev/1"], ["s2", "a2", "https://x.dev/2"]]);
    const fresh = run(20, [["s1", "b1", "https://x.dev/1"]]);
    const { merged, superseded } = mergePending(old, fresh);
    expect(merged.atMs).toBe(20);
    expect(Object.fromEntries(merged.updates.map((u) => [u.screenId, u.assetId]))).toEqual({ s1: "b1", s2: "a2" });
    expect(superseded).toEqual(["a1"]);
  });

  it("keeps only the newest run's failures", () => {
    const old = run(10, [], [{ url: "https://x.dev/1", error: "timeout" }]);
    const fresh = run(20, [["s1", "b1", "https://x.dev/1"]]);
    expect(mergePending(old, fresh).merged.failed).toEqual([]);
  });
});

function packWithUrls(): PackDocument {
  let { pack } = addScreens(createPack(), [
    { id: "old1", name: "a.png", width: 780, height: 1688 },
    { id: "old2", name: "b.png", width: 780, height: 1688 },
  ]);
  pack = setScreenCapture(pack, pack.screens[0].id, { url: "https://x.dev/home" });
  pack = setScreenCapture(pack, pack.screens[1].id, { url: "https://x.dev/search" });
  return pack;
}

describe("applyPendingRefresh", () => {
  it("swaps in captured screenshots and keeps captions", () => {
    const pack = packWithUrls();
    const [s1, s2] = pack.screens;
    const { pack: next, applied } = applyPendingRefresh(pack, run(5, [[s1.id, "new1", "https://x.dev/home"], [s2.id, "new2", "https://x.dev/search"]]));
    expect(applied).toBe(2);
    expect(next.screens.map((s) => s.assetId)).toEqual(["new1", "new2"]);
    expect(next.screens.map((s) => s.captions)).toEqual(pack.screens.map((s) => s.captions));
  });

  it("skips screens deleted since, or whose URL changed after the capture", () => {
    const pack = packWithUrls();
    const [s1, s2] = pack.screens;
    const moved = setScreenCapture(pack, s2.id, { url: "https://x.dev/settings" });
    const { pack: next, applied } = applyPendingRefresh(
      moved,
      run(5, [["gone", "n0", "https://x.dev/old"], [s1.id, "new1", "https://x.dev/home"], [s2.id, "new2", "https://x.dev/search"]])
    );
    expect(applied).toBe(1);
    expect(next.screens.map((s) => s.assetId)).toEqual(["new1", "old2"]);
  });

  it("returns the same pack object when nothing applies", () => {
    const pack = packWithUrls();
    expect(applyPendingRefresh(pack, run(5, [])).pack).toBe(pack);
  });
});

describe("helpers", () => {
  it("reads PNG dimensions from the header", () => {
    const bytes = new Uint8Array(24);
    bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const view = new DataView(bytes.buffer);
    view.setUint32(16, 780);
    view.setUint32(20, 1688);
    expect(pngSize(bytes)).toEqual({ width: 780, height: 1688 });
    expect(pngSize(new Uint8Array(24))).toBeNull();
  });

  it("recognises hook tokens", () => {
    expect(looksLikeHookToken("mfh_" + "a".repeat(32))).toBe(true);
    expect(looksLikeHookToken("mfh_short")).toBe(false);
    expect(looksLikeHookToken("mf_live_" + "a".repeat(40))).toBe(false);
    expect(looksLikeHookToken("mfh_" + "a".repeat(30) + "/../")).toBe(false);
  });
});
