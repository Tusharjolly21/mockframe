import { describe, expect, it } from "vitest";
import { FONT_CATALOG, cleanFamily, nearestWeight, parseFontFileName, readSfntMeta, sniffFont } from "../fonts";

/** Minimal sfnt: OS/2 (weight + fsSelection) and a name table with ids 1 and 16. */
function sfnt({ family, typo, weight, italic }: { family: string; typo?: string; weight: number; italic: boolean }): ArrayBuffer {
  const names: [number, string][] = [[1, family], ...(typo ? ([[16, typo]] as [number, string][]) : [])];
  const strings = names.map(([, s]) => s);
  const nameLen = 6 + names.length * 12 + strings.reduce((n, s) => n + s.length * 2, 0);
  const os2Len = 96;
  const headerLen = 12 + 2 * 16;
  const buf = new ArrayBuffer(headerLen + os2Len + nameLen);
  const v = new DataView(buf);
  v.setUint32(0, 0x00010000);
  v.setUint16(4, 2);
  const table = (i: number, tag: string, offset: number, length: number) => {
    const r = 12 + i * 16;
    for (let k = 0; k < 4; k++) v.setUint8(r + k, tag.charCodeAt(k));
    v.setUint32(r + 8, offset);
    v.setUint32(r + 12, length);
  };
  const os2 = headerLen;
  const name = os2 + os2Len;
  table(0, "OS/2", os2, os2Len);
  table(1, "name", name, nameLen);
  v.setUint16(os2 + 4, weight);
  v.setUint16(os2 + 62, italic ? 1 : 0);
  v.setUint16(name + 2, names.length);
  v.setUint16(name + 4, 6 + names.length * 12);
  let off = 0;
  names.forEach(([id, s], i) => {
    const r = name + 6 + i * 12;
    v.setUint16(r, 3); // Windows, UTF-16BE
    v.setUint16(r + 6, id);
    v.setUint16(r + 8, s.length * 2);
    v.setUint16(r + 10, off);
    for (let k = 0; k < s.length; k++) v.setUint16(name + 6 + names.length * 12 + off + k * 2, s.charCodeAt(k));
    off += s.length * 2;
  });
  return buf;
}

describe("sniffFont", () => {
  const bytes = (head: number[]) => new Uint8Array([...head, ...new Array(12).fill(0)]);
  it("recognises every supported container by its magic bytes", () => {
    expect(sniffFont(bytes([0x77, 0x4f, 0x46, 0x32]))).toBe("woff2");
    expect(sniffFont(bytes([0x77, 0x4f, 0x46, 0x46]))).toBe("woff");
    expect(sniffFont(bytes([0x4f, 0x54, 0x54, 0x4f]))).toBe("opentype");
    expect(sniffFont(bytes([0, 1, 0, 0]))).toBe("truetype");
    expect(sniffFont(bytes([0x74, 0x72, 0x75, 0x65]))).toBe("truetype");
  });
  it("rejects anything else", () => {
    expect(sniffFont(bytes([0x89, 0x50, 0x4e, 0x47]))).toBeNull(); // PNG
    expect(sniffFont(new Uint8Array([0, 1, 0, 0]))).toBeNull(); // truncated
  });
});

describe("parseFontFileName", () => {
  it.each([
    ["AcmeSans-SemiBoldItalic.woff2", "Acme Sans", 600, "italic"],
    ["Acme Sans Bold.ttf", "Acme Sans", 700, "normal"],
    ["acme_sans-regular.otf", "acme sans", 400, "normal"],
    ["Acme-Italic.woff", "Acme", 400, "italic"],
    ["Acme-ExtraLight.ttf", "Acme", 200, "normal"],
    ["Acme-Black.ttf", "Acme", 900, "normal"],
    ["Inter[wght].ttf", "Inter", 400, "normal"],
    ["Brand.ttf", "Brand", 400, "normal"],
  ])("%s → %s %d %s", (file, family, weight, style) => {
    expect(parseFontFileName(file)).toEqual({ family, weight, style });
  });
});

describe("readSfntMeta", () => {
  it("prefers the typographic family and reads weight + italic", () => {
    const meta = readSfntMeta(sfnt({ family: "Acme Sans SemiBold", typo: "Acme Sans", weight: 600, italic: true }));
    expect(meta).toEqual({ family: "Acme Sans", weight: 600, italic: true });
  });
  it("falls back to the legacy family and rounds odd weights", () => {
    expect(readSfntMeta(sfnt({ family: "Brand", weight: 450, italic: false }))).toEqual({ family: "Brand", weight: 500, italic: false });
  });
  it("never throws on garbage", () => {
    expect(readSfntMeta(new ArrayBuffer(8))).toEqual({});
  });
});

describe("cleanFamily", () => {
  it("strips characters that could break out of CSS strings", () => {
    expect(cleanFamily(`Evil"; } body { color: red`)).toBe("Evil body color: red");
    expect(cleanFamily("  Acme   Sans \n")).toBe("Acme Sans");
  });
});

describe("catalog", () => {
  it("has unique families with sorted, real weights", () => {
    const families = FONT_CATALOG.map((f) => f.family);
    expect(new Set(families).size).toBe(families.length);
    for (const f of FONT_CATALOG) {
      expect(f.weights.length).toBeGreaterThan(0);
      expect([...f.weights].sort((a, b) => a - b)).toEqual(f.weights);
      expect(cleanFamily(f.family)).toBe(f.family);
    }
  });
});

describe("nearestWeight", () => {
  it("keeps available weights and snaps the rest (ties go heavier)", () => {
    expect(nearestWeight(700, [400, 700])).toBe(700);
    expect(nearestWeight(800, [400, 700])).toBe(700);
    expect(nearestWeight(500, [400, 600])).toBe(600);
    expect(nearestWeight(600, [400])).toBe(400);
  });
});

describe("googleCss", () => {
  it("asks for upright weights only by default", async () => {
    const { googleCss } = await import("../fonts");
    expect(googleCss("Space Grotesk", [400, 700])).toBe("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&display=swap");
  });

  it("asks for true italics, uprights first, for families that have them", async () => {
    const { googleCss } = await import("../fonts");
    expect(googleCss("Newsreader", [400, 600], true)).toBe("https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,600;1,400;1,600&display=swap");
  });

  it("only flags families with italics", async () => {
    const { FONT_CATALOG } = await import("../fonts");
    expect(FONT_CATALOG.filter((f) => f.italics).map((f) => f.family).sort()).toEqual(["Fraunces", "Instrument Serif", "Newsreader"]);
  });
});
