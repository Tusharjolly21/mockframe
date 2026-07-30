import { describe, expect, it } from "vitest";
import { renderInstagram } from "../instagram";
import type { InstagramDoc } from "../types";
import { defaultInstagramRequests } from "../types";

function doc(overrides: Partial<InstagramDoc> = {}): InstagramDoc {
  return {
    app: "instagram",
    chrome: { time: "9:41", battery: 100 },
    username: "riley.makes",
    presence: "Active now",
    messages: [
      { from: "them", text: "Your new reel is everywhere 😭" },
      { from: "me", text: "It hit 100k overnight??", reaction: "❤️" },
    ],
    ...overrides,
  };
}

describe("renderInstagram", () => {
  it("renders the DM thread without NaN/undefined", () => {
    const svg = renderInstagram(doc());
    expect(svg).not.toContain("NaN");
    expect(svg).not.toContain("undefined");
    expect(svg.length).toBeGreaterThan(500);
  });

  it("renders the requests inbox with title, rows and Delete all", () => {
    const svg = renderInstagram(defaultInstagramRequests());
    expect(svg).toContain("Message requests");
    expect(svg).toContain("Hidden Requests");
    expect(svg).toContain("Delete all");
    expect(svg).toContain("fitcoach.dan");
    expect(svg).not.toContain("NaN");
    expect(svg).not.toContain("undefined");
  });

  it("requests mode escapes XML-hostile names and previews", () => {
    const svg = renderInstagram(
      doc({ mode: "requests", requests: [{ name: "<script>", preview: 'a<b>&"quote"', time: "1d" }] })
    );
    expect(svg).not.toContain("<script>");
    expect(svg).not.toContain("a<b>");
  });

  it("requests mode tolerates an empty request list", () => {
    const svg = renderInstagram(doc({ mode: "requests", requests: [] }));
    expect(svg).toContain("Message requests");
    expect(svg).not.toContain("NaN");
  });

  it("requests mode renders the verified seal only when set", () => {
    const withSeal = renderInstagram(doc({ mode: "requests", requests: [{ name: "a", preview: "p", verified: true }] }));
    const without = renderInstagram(doc({ mode: "requests", requests: [{ name: "a", preview: "p" }] }));
    expect(withSeal).toContain("#0095f6");
    expect(without.split("#0095f6").length).toBeLessThan(withSeal.split("#0095f6").length);
  });

  it("requests mode dark theme uses the black background", () => {
    const svg = renderInstagram(doc({ mode: "requests", requests: [], chrome: { time: "9:41", battery: 100, dark: true } }));
    expect(svg).toContain('fill="#000000"');
  });
});
