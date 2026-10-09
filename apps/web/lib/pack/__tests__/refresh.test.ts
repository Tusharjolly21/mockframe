import { describe, expect, it } from "vitest";
import { addScreens, capturableScreens, refreshScreens, setScreenCapture, setCaption } from "../ops";
import { createPack, PackDocumentSchema, type PackDocument } from "../schema";

const asset = (id: string, name: string, w = 1320, h = 2868) => ({ id, width: w, height: h, name });

/** a 3-screen pack built from home.png, search.png, profile.png, with captions */
function threeScreenPack(): { pack: PackDocument; names: Map<string, string> } {
  const names = new Map([
    ["old-home", "home.png"],
    ["old-search", "search.png"],
    ["old-profile", "profile.png"],
  ]);
  let { pack } = addScreens(createPack(), [...names].map(([id, name]) => asset(id, name)));
  pack.screens.forEach((s, i) => {
    pack = setCaption(pack, s.id, `Caption ${i}`, "");
    pack = setCaption(pack, s.id, `Légende ${i}`, "", "fr-FR");
  });
  return { pack, names };
}

describe("refreshScreens", () => {
  it("matches new files to screens by file name, regardless of upload order and case", () => {
    const { pack, names } = threeScreenPack();
    const r = refreshScreens(
      pack,
      [asset("new-profile", "Profile.PNG"), asset("new-home", "home.jpg"), asset("new-search", "search.png")],
      (id) => names.get(id)
    );
    expect(r.pack.screens.map((s) => s.assetId)).toEqual(["new-home", "new-search", "new-profile"]);
    expect(r.updated).toBe(3);
    expect(r.skipped).toEqual([]);
  });

  it("keeps captions in every language, order and overrides", () => {
    const { pack, names } = threeScreenPack();
    const before = pack.screens.map(({ id, captions, overrides }) => ({ id, captions, overrides }));
    const r = refreshScreens(pack, [asset("n1", "home.png")], (id) => names.get(id));
    expect(r.pack.screens.map(({ id, captions, overrides }) => ({ id, captions, overrides }))).toEqual(before);
    expect(r.pack.screens[1].assetId).toBe("old-search"); // untouched screens keep their shot
  });

  it("falls back to top-to-bottom order for files whose names don't match", () => {
    const { pack, names } = threeScreenPack();
    const r = refreshScreens(
      pack,
      [asset("a", "IMG_0001.png"), asset("b", "search.png"), asset("c", "IMG_0002.png")],
      (id) => names.get(id)
    );
    // search.png claims screen 2 by name; the rest fill screens 1 and 3 in order
    expect(r.pack.screens.map((s) => s.assetId)).toEqual(["a", "b", "c"]);
  });

  it("never adds screens — extra files are reported as skipped", () => {
    const { pack, names } = threeScreenPack();
    const files = ["1", "2", "3", "4"].map((n) => asset(`x${n}`, `shot-${n}.png`));
    const r = refreshScreens(pack, files, (id) => names.get(id));
    expect(r.pack.screens).toHaveLength(3);
    expect(r.updated).toBe(3);
    expect(r.skipped).toEqual(["shot-4.png"]);
    expect(r.warnings.some((w) => w.includes("shot-4.png"))).toBe(true);
  });

  it("fills empty screens and warns on landscape shots", () => {
    const r = refreshScreens(createPack(), [asset("w", "wide.png", 2868, 1320)], () => undefined);
    expect(r.pack.screens[0].assetId).toBe("w");
    expect(r.warnings.some((w) => w.includes("landscape"))).toBe(true);
  });

  it("produces a pack that still validates", () => {
    const { pack, names } = threeScreenPack();
    const r = refreshScreens(pack, [asset("n", "home.png")], (id) => names.get(id));
    expect(PackDocumentSchema.safeParse(r.pack).success).toBe(true);
  });
});

describe("screen capture sources", () => {
  it("sets, lists and clears a source URL", () => {
    const { pack } = threeScreenPack();
    const id = pack.screens[1].id;
    const withUrl = setScreenCapture(pack, id, { url: "https://example.com/search", dark: true });
    expect(capturableScreens(withUrl).map((s) => s.id)).toEqual([id]);
    expect(PackDocumentSchema.safeParse(withUrl).success).toBe(true);
    const cleared = setScreenCapture(withUrl, id, null);
    expect(capturableScreens(cleared)).toEqual([]);
    expect("capture" in cleared.screens[1]).toBe(false);
  });

  it("rejects non-http source URLs", () => {
    const { pack } = threeScreenPack();
    const bad = setScreenCapture(pack, pack.screens[0].id, { url: "javascript:alert(1)" });
    expect(PackDocumentSchema.safeParse(bad).success).toBe(false);
  });

  it("still parses packs saved before capture sources existed", () => {
    const legacy = JSON.parse(JSON.stringify(createPack()));
    expect(PackDocumentSchema.safeParse(legacy).success).toBe(true);
  });
});
