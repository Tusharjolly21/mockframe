import { describe, expect, it } from "vitest";
import { FRAME_STYLES, renderFramed, type FrameTheme } from "../frames";
import { defaultTemplateDoc, defaultScreenDoc, type CodeDoc } from "../types";
import { isWebDoc, hasWebVersion } from "../webPage";

const theme: FrameTheme = { cardBg: "#ffffff", barBg: "#f4f4f6", barText: "#6b6b76", dark: false, title: "mockframe.app" };
const draw = (x: number, y: number) => ({ svg: `<rect x="${x}" y="${y}" width="10" height="10"/>`, height: 200 });

describe("renderFramed", () => {
  it("draws every window style and keeps the content inside the total height", () => {
    for (const style of FRAME_STYLES) {
      const r = renderFramed(style, theme, draw, 402);
      expect(r.svg).toContain("<rect");
      expect(r.totalH).toBeGreaterThanOrEqual(200);
      expect(r.totalW).toBe(402);
    }
  });

  it("makes the card taller for styles with a title bar than for none", () => {
    const none = renderFramed("none", theme, draw, 402).totalH;
    expect(renderFramed("chrome", theme, draw, 402).totalH).toBeGreaterThan(renderFramed("macos", theme, draw, 402).totalH);
    expect(renderFramed("macos", theme, draw, 402).totalH).toBeGreaterThan(none);
  });

  it("draws no shadow unless one is asked for", () => {
    expect(renderFramed("card", theme, draw, 402).svg).not.toContain("drop-shadow");
    expect(renderFramed("card", theme, draw, 402, { shadow: 1 }).svg).toContain("drop-shadow");
  });

  it("uses the title and the inset the user sets", () => {
    expect(renderFramed("chrome", theme, draw, 402, { title: "docs.example.com" }).svg).toContain("docs.example.com");
    const small = renderFramed("card", theme, draw, 402, { pad: 4 }).totalH;
    const big = renderFramed("card", theme, draw, 402, { pad: 40 }).totalH;
    expect(big).toBeGreaterThan(small);
  });

  it("forces a dark or light title bar", () => {
    expect(renderFramed("macos", theme, draw, 402, { bar: "dark" }).svg).toContain("#202124");
  });
});

describe("template card defaults", () => {
  it("opens the post card without a shadow", () => {
    const doc = defaultTemplateDoc("social") as { cardShadow?: number };
    expect(doc.cardShadow).toBe(0);
  });
  it("code card has no shadow by default", () => {
    const doc = defaultScreenDoc("code") as CodeDoc;
    expect(doc.cardShadow ?? 0).toBe(0);
  });
});

describe("web versions", () => {
  it("only apps with a web page report one", () => {
    expect(hasWebVersion(defaultScreenDoc("googlemaps"))).toBe(true);
    expect(hasWebVersion(defaultScreenDoc("whatsapp"))).toBe(false);
    expect(isWebDoc({ ...defaultScreenDoc("reddit"), web: true } as never)).toBe(true);
    expect(isWebDoc(defaultScreenDoc("reddit"))).toBe(false);
  });
});
