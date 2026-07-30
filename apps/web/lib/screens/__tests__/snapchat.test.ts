import { describe, expect, it } from "vitest";
import { renderSnapchat } from "../snapchat";
import type { SnapchatDoc } from "../types";
import { defaultSnapchatAd } from "../types";

function doc(overrides: Partial<SnapchatDoc> = {}): SnapchatDoc {
  return {
    app: "snapchat",
    chrome: { time: "9:41", battery: 100 },
    contact: "Jess 🌙",
    streak: 214,
    status: "Opened",
    statusKind: "chat",
    messages: [
      { from: "them", text: "Did you see the sunset??" },
      { from: "me", text: "Driving to the lookout rn", reaction: "😮" },
    ],
    ...overrides,
  };
}

describe("renderSnapchat", () => {
  it("renders the chat without NaN/undefined", () => {
    const svg = renderSnapchat(doc());
    expect(svg).not.toContain("NaN");
    expect(svg).not.toContain("undefined");
    expect(svg.length).toBeGreaterThan(500);
  });

  it("ad variant renders Sponsored chrome, headline and CTA", () => {
    const svg = renderSnapchat(defaultSnapchatAd());
    expect(svg).toContain("Sponsored");
    expect(svg).toContain("Glow Skincare");
    expect(svg).toContain("Shop Now");
    expect(svg).toContain("fk_scad_bg"); // gradient placeholder without an uploaded creative
    expect(svg).not.toContain("NaN");
    expect(svg).not.toContain("undefined");
  });

  it("ad variant escapes XML-hostile brand, headline and CTA", () => {
    const svg = renderSnapchat(doc({ variant: "ad", brand: "<script>", headline: 'x<b>&"q"', cta: "<img>" }));
    expect(svg).not.toContain("<script>");
    expect(svg).not.toContain("x<b>");
    expect(svg).not.toContain("<img>");
  });

  it("ad variant tolerates empty optional fields", () => {
    const svg = renderSnapchat(doc({ variant: "ad", brand: undefined, headline: undefined, cta: undefined }));
    expect(svg).toContain("Sponsored");
    expect(svg).toContain("Learn More"); // CTA fallback
    expect(svg).not.toContain("NaN");
  });

  it("ad variant uses the uploaded creative instead of the gradient", () => {
    const svg = renderSnapchat(doc({ variant: "ad", adImage: "asset1" }), undefined, (id) =>
      id === "asset1" ? "https://example.com/x.png" : undefined
    );
    expect(svg).toContain("example.com/x.png");
    expect(svg).not.toContain("fk_scad_bg");
  });
});
