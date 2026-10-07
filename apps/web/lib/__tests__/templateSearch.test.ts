import { describe, expect, it } from "vitest";
import { isFiltering, matchesTemplate, NO_FILTER } from "../templateSearch";

const launch = { text: ["Launch Hero", "Website hero · X / LinkedIn", "Big headline and one tilted phone"], uses: ["website" as const, "social" as const] };
const chat = { text: ["WhatsApp chat", "Messaging"], uses: ["chat" as const] };

describe("template search", () => {
  it("matches every word, in any order, ignoring case and punctuation", () => {
    expect(matchesTemplate({ query: "hero launch", use: null }, launch)).toBe(true);
    expect(matchesTemplate({ query: "LINKEDIN", use: null }, launch)).toBe(true);
    expect(matchesTemplate({ query: "launch keynote", use: null }, launch)).toBe(false);
  });

  it("matches the use labels too", () => {
    expect(matchesTemplate({ query: "social post", use: null }, launch)).toBe(true);
    expect(matchesTemplate({ query: "chat", use: null }, chat)).toBe(true);
  });

  it("filters by use", () => {
    expect(matchesTemplate({ query: "", use: "website" }, launch)).toBe(true);
    expect(matchesTemplate({ query: "", use: "chat" }, launch)).toBe(false);
    expect(matchesTemplate({ query: "whatsapp", use: "chat" }, chat)).toBe(true);
  });

  it("treats a one-letter word as a whole word", () => {
    expect(matchesTemplate({ query: "x", use: null }, launch)).toBe(true);
    expect(matchesTemplate({ query: "x", use: null }, chat)).toBe(false);
  });

  it("knows when nothing is filtered", () => {
    expect(isFiltering(NO_FILTER)).toBe(false);
    expect(isFiltering({ query: "  ", use: null })).toBe(false);
    expect(isFiltering({ query: "", use: "video" })).toBe(true);
  });
});
