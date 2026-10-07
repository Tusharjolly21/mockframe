import { describe, expect, it } from "vitest";
import { getDevice } from "@framekit/devices";
import type { MockupLayer } from "@framekit/scene";
import { buildPhoneScene, devicesForShot, PHONE_SIZES, phoneExportScale, stylePhoneScene } from "../phoneEditor";

const PHONE_SHOT = { id: "shot-phone", width: 1179, height: 2556 };
const DESKTOP_SHOT = { id: "shot-desktop", width: 2880, height: 1800 };
const mockup = (s: { layers: { type: string }[] }) => s.layers.find((l): l is MockupLayer => l.type === "mockup")!;

describe("devicesForShot", () => {
  it("offers phones for phone screenshots and computers for desktop ones, best first", () => {
    const phones = devicesForShot(PHONE_SHOT.width, PHONE_SHOT.height);
    expect(phones.length).toBeGreaterThan(4);
    expect(phones.every((id) => getDevice(id)?.category === "phone")).toBe(true);
    const desk = devicesForShot(DESKTOP_SHOT.width, DESKTOP_SHOT.height);
    expect(desk.every((id) => ["laptop", "desktop", "browser"].includes(getDevice(id)!.category))).toBe(true);
    expect(new Set(desk).size).toBe(desk.length);
  });
});

describe("buildPhoneScene", () => {
  it("puts the screenshot in the device, centred", () => {
    const scene = buildPhoneScene(PHONE_SHOT, "iphone-17-pro", "auto")!;
    const m = mockup(scene);
    expect(m.deviceId).toBe("iphone-17-pro");
    expect(m.media?.assetId).toBe("shot-phone");
    expect(m.transform).toMatchObject({ x: 0, y: 0 });
  });

  it("resizes the canvas and keeps the device inside it", () => {
    for (const size of PHONE_SIZES.filter((s) => s.width)) {
      for (const id of ["iphone-17-pro", "macbook-pro-14"]) {
        const scene = buildPhoneScene(PHONE_SHOT, id, size.id)!;
        expect(scene.canvas).toMatchObject({ width: size.width, height: size.height });
        const frame = getDevice(id)!.frame;
        const m = mockup(scene);
        expect(frame.width * m.transform.scale).toBeLessThanOrEqual(size.width! * 0.83);
        expect(frame.height * m.transform.scale).toBeLessThanOrEqual(size.height! * 0.79);
      }
    }
  });

  it("returns null for an unknown device", () => {
    expect(buildPhoneScene(PHONE_SHOT, "nope", "auto")).toBeNull();
  });
});

describe("stylePhoneScene", () => {
  const base = buildPhoneScene(DESKTOP_SHOT, "macbook-pro-14", "story")!;

  it("applies a look without letting a wide device spill off a tall canvas", () => {
    for (let i = 0; i < 6; i++) {
      const s = stylePhoneScene(base, { kind: "look", index: i, round: 0 }, ["#101820", "#2563eb", "#93c5fd"]);
      expect(s.canvas.background).not.toEqual(base.canvas.background);
      for (const m of s.layers.filter((l): l is MockupLayer => l.type === "mockup")) {
        expect(getDevice(m.deviceId!)!.frame.width * m.transform.scale).toBeLessThanOrEqual(s.canvas.width * 0.881);
      }
    }
  });

  it("sets a plain background and drops the pattern", () => {
    const bg = { type: "solid", color: "#ffffff" } as const;
    const s = stylePhoneScene(base, { kind: "background", bg }, []);
    expect(s.canvas.background).toEqual(bg);
    expect(s.canvas.backdrop?.pattern).toBeUndefined();
    expect(stylePhoneScene(base, { kind: "device" }, [])).toBe(base);
  });
});

it("phoneExportScale keeps big canvases drawable on phones", () => {
  expect(phoneExportScale(buildPhoneScene(PHONE_SHOT, "iphone-17-pro", "portrait")!)).toBe(2);
  const story = buildPhoneScene(PHONE_SHOT, "iphone-17-pro", "story")!;
  const k = phoneExportScale(story);
  expect(story.canvas.width * story.canvas.height * k * k).toBeLessThanOrEqual(12_000_000);
});
