import { describe, expect, it } from "vitest";
import { SceneDocumentSchema, createTextLayer, type MockupLayer } from "@framekit/scene";
import { buildDeviceScene } from "../deviceScene";
import { canPrettify, hsl, pickAccent, prettyLooks } from "../prettify";

function phoneScene() {
  const scene = buildDeviceScene("iphone-17-pro")!;
  const m = scene.layers[0] as MockupLayer;
  m.media = { assetId: "a1", kind: "image", fit: "cover", offsetX: 0, offsetY: 0, scale: 1 };
  return scene;
}

describe("make it pretty", () => {
  it("converts hsl to hex", () => {
    expect(hsl(0, 1, 0.5)).toBe("#ff0000");
    expect(hsl(240, 1, 0.5)).toBe("#0000ff");
    expect(hsl(-120, 1, 0.5)).toBe("#0000ff");
    expect(hsl(0, 0, 1)).toBe("#ffffff");
  });

  it("builds around the most colourful palette colour and falls back for greyscale", () => {
    const a = pickAccent(["#111111", "#2b6cff", "#eeeeee"]);
    expect(Math.round(a.hue)).toBe(222);
    const grey = pickAccent(["#111111", "#777777", "#eeeeee"]);
    expect(grey.hue).toBe(262);
    expect(pickAccent(["#111111", "#777777"], 1).hue).not.toBe(grey.hue);
  });

  it("gives six valid, distinct looks that keep the screenshot", () => {
    const scene = phoneScene();
    const looks = prettyLooks(scene, ["#0b1020", "#2b6cff", "#ff7a59", "#f4f4f6"]);
    expect(looks).toHaveLength(6);
    expect(new Set(looks.map((l) => JSON.stringify(l.scene.canvas.background))).size).toBe(6);
    for (const look of looks) {
      expect(SceneDocumentSchema.safeParse(look.scene).success, look.id).toBe(true);
      const mockups = look.scene.layers.filter((l): l is MockupLayer => l.type === "mockup");
      expect(mockups).toHaveLength(1);
      expect(mockups[0].media?.assetId).toBe("a1");
      expect(mockups[0].shadow).toBeTruthy();
    }
    expect(canPrettify(scene)).toBe(true);
    expect(canPrettify(buildDeviceScene("iphone-17-pro")!)).toBe(false);
  });

  it("reshuffles staging and colour on the next round", () => {
    const scene = phoneScene();
    const a = prettyLooks(scene, ["#2b6cff", "#ff7a59"], 0);
    const b = prettyLooks(scene, ["#2b6cff", "#ff7a59"], 1);
    expect(JSON.stringify(a[0].scene.canvas.background)).not.toBe(JSON.stringify(b[0].scene.canvas.background));
    const tilt = (s: typeof scene) => (s.layers[0] as MockupLayer).transform.tiltY;
    expect(a.map((l) => tilt(l.scene))).not.toEqual(b.map((l) => tilt(l.scene)));
  });

  it("keeps several devices where they are and flips unreadable text", () => {
    const scene = phoneScene();
    const second = { ...(scene.layers[0] as MockupLayer), id: "m2", transform: { ...scene.layers[0].transform, x: 300 } };
    const text = { ...createTextLayer("Hello"), color: "#ffffff" };
    scene.layers.push(second, text);
    const looks = prettyLooks(scene, ["#2b6cff"]);
    const soft = looks.find((l) => l.id === "soft")!.scene;
    expect(soft.layers.find((l) => l.id === "m2")?.transform.x).toBe(300);
    expect((soft.layers.find((l) => l.type === "text") as { color: string }).color).toBe("#17171c");
    const deep = looks.find((l) => l.id === "deep")!.scene;
    expect((deep.layers.find((l) => l.type === "text") as { color: string }).color).toBe("#ffffff");
  });
});
