import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getDevice } from "@framekit/devices";
import {
  FIGMA_DEVICES,
  FIGMA_MAX_IMAGE_EDGE,
  FIGMA_MAX_RESULTS,
  FIGMA_STORE_SETS,
  assignSlots,
  figmaScale,
  imageSize,
  parseImportRequest,
  parseRenderRequest,
  parseResultUpload,
  upsertResult,
  type FigmaResult,
} from "../figmaImport";
import { LOOK_NAMES } from "../apiRender";

const png = (w: number, h: number) => {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(b.buffer).setUint32(16, w);
  new DataView(b.buffer).setUint32(20, h);
  return b;
};

// SOI, an APP0 segment, then a baseline SOF0 with the size
const jpeg = (w: number, h: number) =>
  new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x4a, 0x46, 0xff, 0xc0, 0x00, 0x11, 0x08, h >> 8, h & 255, w >> 8, w & 255, 0x03, 0, 0, 0, 0, 0, 0]);

describe("image sizes", () => {
  it("reads PNG and JPEG headers", () => {
    expect(imageSize(png(2640, 5736))).toEqual({ width: 2640, height: 5736 });
    expect(imageSize(jpeg(1920, 1080))).toEqual({ width: 1920, height: 1080 });
  });

  it("gives up on anything else", () => {
    expect(imageSize(new TextEncoder().encode("GIF89a........................"))).toBeNull();
    expect(imageSize(png(0, 10))).toBeNull();
    expect(imageSize(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]))).toBeNull();
  });
});

describe("results sent back to Figma", () => {
  it("validates the slot, name and scale of an upload", () => {
    expect(parseResultUpload("3", new URLSearchParams({ name: "  Home  ", scale: "1.5" }))).toEqual({ ok: true, n: 3, name: "Home", scale: 1.5 });
    expect(parseResultUpload("0", new URLSearchParams())).toEqual({ ok: true, n: 0, name: "Mockup 1", scale: 2 });
    expect(parseResultUpload(String(FIGMA_MAX_RESULTS), new URLSearchParams()).ok).toBe(false);
    expect(parseResultUpload("-1", new URLSearchParams()).ok).toBe(false);
    expect(parseResultUpload("1.5", new URLSearchParams()).ok).toBe(false);
    expect(parseResultUpload("1", new URLSearchParams({ scale: "9" })).ok).toBe(false);
    expect(parseResultUpload("1", new URLSearchParams({ scale: "abc" })).ok).toBe(false);
  });

  it("bumps a slot's version only when its image changes", () => {
    const entry = (n: number, hash: string) => ({ n, name: `Shot ${n}`, width: 100, height: 200, scale: 2, hash });
    let list: FigmaResult[] = [];
    list = upsertResult(list, entry(1, "a"));
    list = upsertResult(list, entry(0, "b"));
    expect(list.map((r) => [r.n, r.version])).toEqual([[0, 1], [1, 1]]);
    list = upsertResult(list, entry(1, "a"));
    expect(list.find((r) => r.n === 1)?.version).toBe(1);
    list = upsertResult(list, entry(1, "c"));
    expect(list.find((r) => r.n === 1)?.version).toBe(2);
    expect(list).toHaveLength(2);
  });

  it("keeps each shot in its slot across sends", () => {
    const first = assignSlots({}, ["a", "b", "c"]);
    expect(first).toEqual({ a: 0, b: 1, c: 2 });
    // b was deleted and d added: d takes a fresh slot so b's frame isn't overwritten
    const second = assignSlots(first, ["a", "c", "d"]);
    expect(second).toEqual({ a: 0, c: 2, d: 3 });
  });

  it("reuses slots of deleted shots once the fresh ones run out", () => {
    const full = assignSlots({}, Array.from({ length: FIGMA_MAX_RESULTS }, (_, i) => `s${i}`));
    expect(Object.keys(full)).toHaveLength(FIGMA_MAX_RESULTS);
    const next = assignSlots(full, ["s0", "new"]);
    expect(next.s0).toBe(0);
    expect(next.new).toBe(1);
    const over = assignSlots({}, Array.from({ length: FIGMA_MAX_RESULTS + 2 }, (_, i) => `s${i}`));
    expect(Object.keys(over)).toHaveLength(FIGMA_MAX_RESULTS);
  });

  it("renders at 2x unless that passes Figma's image limit", () => {
    expect(figmaScale(1920, 1080)).toBe(2);
    expect(figmaScale(1320, 2868)).toBeCloseTo(FIGMA_MAX_IMAGE_EDGE / 2868, 2);
    expect(2868 * figmaScale(1320, 2868)).toBeLessThanOrEqual(FIGMA_MAX_IMAGE_EDGE);
    expect(figmaScale(100000, 10)).toBe(0.25);
  });
});

describe("instant mockups from the plugin", () => {
  it("takes a device and a look", () => {
    expect(parseRenderRequest({ kind: "mockup", device: "iphone-17-pro", look: 2 })).toEqual({ ok: true, device: "iphone-17-pro", look: 2 });
    expect(parseRenderRequest({})).toEqual({ ok: true, device: "auto", look: null });
    expect(parseRenderRequest({ look: "glow" })).toEqual({ ok: true, device: "auto", look: 1 });
  });

  it("refuses store sets and bad values", () => {
    expect(parseRenderRequest({ kind: "store-set" }).ok).toBe(false);
    expect(parseRenderRequest({ device: "../x" }).ok).toBe(false);
    expect(parseRenderRequest({ look: LOOK_NAMES.length }).ok).toBe(false);
    expect(parseRenderRequest(null).ok).toBe(false);
  });

  it("offers devices that exist", () => {
    for (const d of FIGMA_DEVICES) if (d.id !== "auto" && d.id !== "frameless") expect(getDevice(d.id), d.id).toBeDefined();
  });

  it("opens showcases only from devices mode", () => {
    const frames = [{ name: "Home", width: 402, height: 874 }];
    expect(parseImportRequest({ showcase: true, frames })).toMatchObject({ ok: true, value: { showcase: true } });
    const set = parseImportRequest({ mode: "set", showcase: true, frames });
    expect(set.ok && "showcase" in set.value).toBe(false);
  });
});

describe("the plugin files", () => {
  const dir = join(__dirname, "../../public/figma-plugin");
  const ui = readFileSync(join(dir, "ui.html"), "utf8");
  const code = readFileSync(join(dir, "code.js"), "utf8");
  const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));

  it("lists every device, look and store set the server knows", () => {
    for (const d of FIGMA_DEVICES) expect(ui, d.id).toContain(`value="${d.id}"`);
    for (const s of FIGMA_STORE_SETS) expect(ui, s).toContain(`value="${s}"`);
    for (let i = 0; i < LOOK_NAMES.length; i++) expect(ui).toContain(`data-look="${i}"`);
  });

  it("declares its commands and relaunch button", () => {
    const commands = manifest.menu.map((m: { command: string }) => m.command);
    expect(commands).toEqual(["open", "quick"]);
    expect(manifest.relaunchButtons[0].command).toBe("open");
    expect(manifest.documentAccess).toBe("dynamic-page");
    expect(manifest.networkAccess.allowedDomains).toEqual(["https://mockframe.app"]);
    expect(manifest.networkAccess.devAllowedDomains).toEqual(["http://localhost:3000"]);
  });

  it("only opens mockframe.app", () => {
    const rule = code.match(/if \(!\/(.+)\/\.test\(target\)\)/)?.[1];
    expect(rule).toBeDefined();
    const re = new RegExp(rule!);
    expect(re.test("https://mockframe.app/editor?figma=1")).toBe(true);
    expect(re.test("https://mockframe.app.evil.com/")).toBe(false);
    expect(re.test("http://localhost:3000/editor")).toBe(false);
  });

  it("sends every request to the server the developer toggle picks", () => {
    const script = ui.slice(ui.indexOf("<script>"));
    const fetches = script.match(/fetch\(([^,)]+)/g) ?? [];
    expect(fetches.length).toBeGreaterThan(4);
    for (const f of fetches) expect(f).toMatch(/fetch\((root|sent\.root|w\.base) \+/);
  });
});
