import { describe, expect, it } from "vitest";
import { AiPackBodySchema, ConceptBodySchema, RealBodySchema, RecaptionBodySchema } from "../requestSchemas";

/**
 * RecaptionBodySchema + tone/audience threading on the concept/real arms.
 * Reviewer emphasis (task-2 brief): recaption must never be misparsed as
 * concept by the AiPackBodySchema union (concept's `mode` is optional, so a
 * recaption body without careful ordering could fall through to it).
 */

const validScreens = [
  { archetype: "onboarding", currentTitle: "Welcome" },
  { archetype: "dashboard" },
];

describe("RecaptionBodySchema", () => {
  it("parses a valid recaption body", () => {
    const result = RecaptionBodySchema.safeParse({
      mode: "recaption",
      appName: "Focusly",
      description: "A calm daily planner.",
      tone: "playful",
      audience: "busy professionals",
      screens: validScreens,
    });
    expect(result.success).toBe(true);
  });

  it("parses with only the required fields (screens min length 1)", () => {
    const result = RecaptionBodySchema.safeParse({
      mode: "recaption",
      appName: "Focusly",
      screens: [{}],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing screens array", () => {
    const result = RecaptionBodySchema.safeParse({
      mode: "recaption",
      appName: "Focusly",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty screens array", () => {
    const result = RecaptionBodySchema.safeParse({
      mode: "recaption",
      appName: "Focusly",
      screens: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects 11 screens (max 10)", () => {
    const result = RecaptionBodySchema.safeParse({
      mode: "recaption",
      appName: "Focusly",
      screens: Array.from({ length: 11 }, () => ({ archetype: "list" })),
    });
    expect(result.success).toBe(false);
  });

  it("accepts exactly 10 screens", () => {
    const result = RecaptionBodySchema.safeParse({
      mode: "recaption",
      appName: "Focusly",
      screens: Array.from({ length: 10 }, () => ({ archetype: "list" })),
    });
    expect(result.success).toBe(true);
  });

  it("rejects a bad tone", () => {
    const result = RecaptionBodySchema.safeParse({
      mode: "recaption",
      appName: "Focusly",
      tone: "sarcastic",
      screens: validScreens,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing mode", () => {
    const result = RecaptionBodySchema.safeParse({
      appName: "Focusly",
      screens: validScreens,
    });
    expect(result.success).toBe(false);
  });
});

describe("AiPackBodySchema union ordering", () => {
  it("parses a recaption body as recaption, not misrouted to concept or real", () => {
    const result = AiPackBodySchema.safeParse({
      mode: "recaption",
      appName: "Focusly",
      screens: validScreens,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(RecaptionBodySchema.safeParse(result.data).success).toBe(true);
      expect(result.data.mode).toBe("recaption");
    }
  });

  it("does not parse a recaption body against ConceptBodySchema directly", () => {
    const recaptionBody = { mode: "recaption", appName: "Focusly", screens: validScreens };
    expect(ConceptBodySchema.safeParse(recaptionBody).success).toBe(false);
  });

  it("does not parse a recaption body against RealBodySchema directly", () => {
    const recaptionBody = { mode: "recaption", appName: "Focusly", screens: validScreens };
    expect(RealBodySchema.safeParse(recaptionBody).success).toBe(false);
  });

  it("does not parse a concept body (with description, no screens) against RecaptionBodySchema", () => {
    const conceptBody = {
      appName: "Focusly",
      description: "A focus timer app for deep work sessions",
    };
    expect(RecaptionBodySchema.safeParse(conceptBody).success).toBe(false);
  });

  it("does not parse a real body against RecaptionBodySchema", () => {
    const realBody = {
      mode: "real",
      appName: "Focusly",
      screenshots: [
        { refId: "s1", image: "data:image/png;base64,AAAA" },
        { refId: "s2", image: "data:image/png;base64,AAAA" },
      ],
    };
    expect(RecaptionBodySchema.safeParse(realBody).success).toBe(false);
  });

  it("parses a concept body with tone + audience", () => {
    const result = AiPackBodySchema.safeParse({
      appName: "Focusly",
      description: "A focus timer app for deep work sessions",
      tone: "professional",
      audience: "remote teams",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(ConceptBodySchema.safeParse(result.data).success).toBe(true);
    }
  });

  it("rejects a concept body with a bad tone", () => {
    const result = AiPackBodySchema.safeParse({
      appName: "Focusly",
      description: "A focus timer app for deep work sessions",
      tone: "sarcastic",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a concept body with an oversized audience", () => {
    const result = ConceptBodySchema.safeParse({
      appName: "Focusly",
      description: "A focus timer app for deep work sessions",
      audience: "a".repeat(61),
    });
    expect(result.success).toBe(false);
  });

  it("parses a real body with tone + audience", () => {
    const result = AiPackBodySchema.safeParse({
      mode: "real",
      appName: "Focusly",
      tone: "bold",
      audience: "gamers",
      screenshots: [
        { refId: "s1", image: "data:image/png;base64,AAAA" },
        { refId: "s2", image: "data:image/png;base64,AAAA" },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(RealBodySchema.safeParse(result.data).success).toBe(true);
    }
  });

  it("rejects a real body with a bad tone", () => {
    const result = RealBodySchema.safeParse({
      mode: "real",
      appName: "Focusly",
      tone: "sarcastic",
      screenshots: [
        { refId: "s1", image: "data:image/png;base64,AAAA" },
        { refId: "s2", image: "data:image/png;base64,AAAA" },
      ],
    });
    expect(result.success).toBe(false);
  });
});
