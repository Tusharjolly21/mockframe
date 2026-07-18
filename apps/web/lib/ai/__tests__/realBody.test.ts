import { describe, expect, it } from "vitest";
import { AiPackBodySchema, ConceptBodySchema, hasDuplicateRefs, RealBodySchema } from "../requestSchemas";

const PNG_PREFIX = "data:image/png;base64,";
const validImage = (bytes = 100) => PNG_PREFIX + "A".repeat(bytes);

const validScreenshots = [
  { refId: "s1", image: validImage() },
  { refId: "s2", image: validImage() },
];

describe("AiPackBodySchema", () => {
  it("parses a concept body without a mode field as concept", () => {
    const result = AiPackBodySchema.safeParse({
      appName: "Focusly",
      description: "A focus timer app for deep work sessions",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(ConceptBodySchema.safeParse(result.data).success).toBe(true);
    }
  });

  it("parses a real body with mode: real and >=2 screenshots", () => {
    const result = AiPackBodySchema.safeParse({
      mode: "real",
      appName: "Focusly",
      screenshots: validScreenshots,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a real body with only 1 screenshot", () => {
    const result = RealBodySchema.safeParse({
      mode: "real",
      appName: "Focusly",
      screenshots: [{ refId: "s1", image: validImage() }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a screenshot with a bad data-url prefix", () => {
    const result = RealBodySchema.safeParse({
      mode: "real",
      appName: "Focusly",
      screenshots: [
        { refId: "s1", image: "data:image/gif;base64,AAAA" },
        { refId: "s2", image: validImage() },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an oversized image payload", () => {
    const result = RealBodySchema.safeParse({
      mode: "real",
      appName: "Focusly",
      screenshots: [
        { refId: "s1", image: validImage(600_000) },
        { refId: "s2", image: validImage() },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a bare-prefix data URL with an empty payload", () => {
    const result = RealBodySchema.safeParse({
      mode: "real",
      appName: "Focusly",
      screenshots: [
        { refId: "s1", image: PNG_PREFIX },
        { refId: "s2", image: validImage() },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a payload containing characters outside the base64 charset (space or <)", () => {
    const spaceResult = RealBodySchema.safeParse({
      mode: "real",
      appName: "Focusly",
      screenshots: [
        { refId: "s1", image: PNG_PREFIX + "AAAA BBBB" },
        { refId: "s2", image: validImage() },
      ],
    });
    expect(spaceResult.success).toBe(false);

    const angleBracketResult = RealBodySchema.safeParse({
      mode: "real",
      appName: "Focusly",
      screenshots: [
        { refId: "s1", image: PNG_PREFIX + "<script>" },
        { refId: "s2", image: validImage() },
      ],
    });
    expect(angleBracketResult.success).toBe(false);
  });
});

describe("hasDuplicateRefs", () => {
  it("returns true when refIds repeat", () => {
    expect(hasDuplicateRefs([{ refId: "a" }, { refId: "b" }, { refId: "a" }])).toBe(true);
  });

  it("returns false when refIds are unique", () => {
    expect(hasDuplicateRefs([{ refId: "a" }, { refId: "b" }, { refId: "c" }])).toBe(false);
  });

  it("schema itself allows duplicate refIds (route must reject them separately)", () => {
    const result = RealBodySchema.safeParse({
      mode: "real",
      appName: "Focusly",
      screenshots: [
        { refId: "dup", image: validImage() },
        { refId: "dup", image: validImage() },
      ],
    });
    expect(result.success).toBe(true);
  });
});
