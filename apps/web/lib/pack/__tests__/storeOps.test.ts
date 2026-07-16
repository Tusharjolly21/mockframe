import { describe, expect, it } from "vitest";
import { addScreens, moveScreen, removeScreen, setCaption } from "../ops";
import { createPack, createPackScreen } from "../schema";

const asset = (id: string, w = 1320, h = 2868) => ({ id, width: w, height: h, name: `${id}.png` });

describe("addScreens", () => {
  it("fills the single empty placeholder screen first, then appends", () => {
    const start = createPack(); // one screen, assetId null
    const { pack, addedIds } = addScreens(start, [asset("a"), asset("b")]);
    expect(pack.screens).toHaveLength(2);
    expect(pack.screens[0].assetId).toBe("a");
    expect(pack.screens[1].assetId).toBe("b");
    expect(addedIds).toHaveLength(2);
  });

  it("warns on landscape screenshots but still adds them", () => {
    const { pack, warnings } = addScreens(createPack(), [asset("wide", 2868, 1320)]);
    expect(pack.screens[0].assetId).toBe("wide");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("wide.png");
  });

  it("caps at 10 screens with a warning", () => {
    let pack = createPack();
    ({ pack } = addScreens(pack, Array.from({ length: 10 }, (_, i) => asset(`s${i}`))));
    const result = addScreens(pack, [asset("overflow")]);
    expect(result.pack.screens).toHaveLength(10);
    expect(result.warnings.some((w) => w.includes("10"))).toBe(true);
  });
});

describe("removeScreen / moveScreen / setCaption", () => {
  it("removeScreen keeps at least one (empty) screen", () => {
    const pack = createPack();
    const only = pack.screens[0].id;
    const next = removeScreen(pack, only);
    expect(next.screens).toHaveLength(1);
    expect(next.screens[0].assetId).toBeNull();
  });

  it("moveScreen swaps neighbors and clamps at edges", () => {
    let pack = createPack();
    ({ pack } = addScreens(pack, [asset("a"), asset("b"), asset("c")]));
    const [s1, s2] = pack.screens;
    const moved = moveScreen(pack, s2.id, -1);
    expect(moved.screens[0].id).toBe(s2.id);
    expect(moved.screens[1].id).toBe(s1.id);
    expect(moveScreen(moved, s2.id, -1).screens[0].id).toBe(s2.id); // clamped
  });

  it("setCaption writes the en locale", () => {
    const pack = createPack();
    const next = setCaption(pack, pack.screens[0].id, "Hello", "World");
    expect(next.screens[0].captions.en).toEqual({ title: "Hello", subtitle: "World" });
  });

  it("setCaption with empty subtitle drops it", () => {
    const pack = createPack();
    const next = setCaption(pack, pack.screens[0].id, "Hello", "");
    expect(next.screens[0].captions.en).toEqual({ title: "Hello" });
  });
});
