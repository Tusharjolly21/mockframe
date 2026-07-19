import { describe, expect, it } from "vitest";
import { applyCaptions } from "../../pack/ops";
import { createPack, createPackScreen } from "../../pack/schema";
import {
  AI_RECAPTION_SYSTEM_PROMPT,
  aiRecaptionUserPrompt,
  RecaptionPlanSchema,
  repairRecaption,
  type RecaptionPlan,
} from "../plan";

describe("RecaptionPlanSchema", () => {
  it("accepts 1-10 captions", () => {
    expect(RecaptionPlanSchema.safeParse({ captions: [{ title: "Plan your day" }] }).success).toBe(true);
    expect(
      RecaptionPlanSchema.safeParse({
        captions: Array.from({ length: 10 }, (_, i) => ({ title: `Feature ${i + 1}` })),
      }).success
    ).toBe(true);
  });

  it("accepts an optional subtitle", () => {
    expect(
      RecaptionPlanSchema.safeParse({ captions: [{ title: "Plan your day", subtitle: "Effortlessly" }] }).success
    ).toBe(true);
  });

  it("rejects 0 captions", () => {
    expect(RecaptionPlanSchema.safeParse({ captions: [] }).success).toBe(false);
  });

  it("rejects 11 captions", () => {
    expect(
      RecaptionPlanSchema.safeParse({
        captions: Array.from({ length: 11 }, (_, i) => ({ title: `Feature ${i + 1}` })),
      }).success
    ).toBe(false);
  });

  it("rejects a caption missing a title", () => {
    expect(RecaptionPlanSchema.safeParse({ captions: [{ subtitle: "no title" }] }).success).toBe(false);
  });
});

describe("repairRecaption", () => {
  const caption = (title: string) => ({ title });

  it("pads with blank titles when short (3 -> 5 pads two blanks)", () => {
    const captions = [caption("A"), caption("B"), caption("C")];
    const repaired = repairRecaption(captions, 5);
    expect(repaired).toHaveLength(5);
    expect(repaired.slice(0, 3)).toEqual([caption("A"), caption("B"), caption("C")]);
    expect(repaired[3]).toEqual({ title: "" });
    expect(repaired[4]).toEqual({ title: "" });
  });

  it("truncates when long (7 -> 5)", () => {
    const captions = Array.from({ length: 7 }, (_, i) => caption(`T${i}`));
    const repaired = repairRecaption(captions, 5);
    expect(repaired).toHaveLength(5);
    expect(repaired).toEqual(Array.from({ length: 5 }, (_, i) => caption(`T${i}`)));
  });

  it("returns exactly n even for n=0", () => {
    expect(repairRecaption([caption("A")], 0)).toHaveLength(0);
  });

  it("never throws on empty input", () => {
    expect(() => repairRecaption([], 3)).not.toThrow();
    expect(repairRecaption([], 3)).toEqual([{ title: "" }, { title: "" }, { title: "" }]);
  });

  it("preserves subtitles on kept captions", () => {
    const captions: RecaptionPlan["captions"] = [{ title: "A", subtitle: "Sub A" }];
    const repaired = repairRecaption(captions, 2);
    expect(repaired[0]).toEqual({ title: "A", subtitle: "Sub A" });
    expect(repaired[1]).toEqual({ title: "" });
  });
});

describe("applyCaptions", () => {
  function packWithScreens(n: number) {
    let pack = createPack();
    pack = { ...pack, screens: Array.from({ length: n }, () => createPackScreen()) };
    return pack;
  }

  it("sets screens[i].captions.en from captions[i], clamped to 120/160", () => {
    const pack = packWithScreens(2);
    const captions = [
      { title: "T".repeat(200), subtitle: "S".repeat(200) },
      { title: "Short title", subtitle: "Short subtitle" },
    ];
    const next = applyCaptions(pack, captions);
    expect(next.screens[0].captions.en.title.length).toBe(120);
    expect(next.screens[0].captions.en.subtitle?.length).toBe(160);
    expect(next.screens[1].captions.en).toEqual({ title: "Short title", subtitle: "Short subtitle" });
  });

  it("drops a blank/whitespace-only subtitle", () => {
    const pack = packWithScreens(1);
    const next = applyCaptions(pack, [{ title: "Hello", subtitle: "   " }]);
    expect(next.screens[0].captions.en).toEqual({ title: "Hello" });
  });

  it("drops a missing subtitle", () => {
    const pack = packWithScreens(1);
    const next = applyCaptions(pack, [{ title: "Hello" }]);
    expect(next.screens[0].captions.en).toEqual({ title: "Hello" });
  });

  it("returns a new pack object and does not mutate the input", () => {
    const pack = packWithScreens(1);
    const originalScreens = pack.screens;
    const before = JSON.parse(JSON.stringify(pack));
    const next = applyCaptions(pack, [{ title: "Hello" }]);
    expect(next).not.toBe(pack);
    expect(next.screens).not.toBe(originalScreens);
    expect(pack).toEqual(before);
  });

  it("handles fewer captions than screens, leaving extra screens unchanged", () => {
    const pack = packWithScreens(3);
    const untouched = pack.screens[2];
    const next = applyCaptions(pack, [{ title: "One" }]);
    expect(next.screens[0].captions.en).toEqual({ title: "One" });
    expect(next.screens[1]).toBe(pack.screens[1]);
    expect(next.screens[2]).toBe(untouched);
  });

  it("handles more captions than screens without throwing", () => {
    const pack = packWithScreens(1);
    expect(() => applyCaptions(pack, [{ title: "One" }, { title: "Two" }])).not.toThrow();
    const next = applyCaptions(pack, [{ title: "One" }, { title: "Two" }]);
    expect(next.screens).toHaveLength(1);
    expect(next.screens[0].captions.en).toEqual({ title: "One" });
  });
});

describe("aiRecaptionUserPrompt", () => {
  const screens = [{ archetype: "onboarding", currentTitle: "Welcome" }, { archetype: "dashboard" }];

  it("includes the app name and screen info without tone/audience lines when omitted", () => {
    const prompt = aiRecaptionUserPrompt("Focusly", undefined, undefined, undefined, screens);
    expect(prompt).toContain("Focusly");
    expect(prompt.toLowerCase()).not.toContain("tone:");
    expect(prompt.toLowerCase()).not.toContain("audience:");
  });

  it("includes a tone line only when tone is provided", () => {
    const prompt = aiRecaptionUserPrompt("Focusly", undefined, "playful", undefined, screens);
    expect(prompt.toLowerCase()).toContain("tone");
    expect(prompt).toContain("playful");
  });

  it("includes an audience line only when audience is provided", () => {
    const prompt = aiRecaptionUserPrompt("Focusly", undefined, undefined, "busy professionals", screens);
    expect(prompt.toLowerCase()).toContain("audience");
    expect(prompt).toContain("busy professionals");
  });

  it("includes the description when provided", () => {
    const prompt = aiRecaptionUserPrompt("Focusly", "A calm daily planner.", undefined, undefined, screens);
    expect(prompt).toContain("A calm daily planner.");
  });

  it("omits a description line when not provided", () => {
    const prompt = aiRecaptionUserPrompt("Focusly", undefined, undefined, undefined, screens);
    expect(prompt.toLowerCase()).not.toContain("description:");
  });
});

describe("AI_RECAPTION_SYSTEM_PROMPT", () => {
  it("is a non-empty prompt mentioning captions", () => {
    expect(AI_RECAPTION_SYSTEM_PROMPT.length).toBeGreaterThan(0);
    expect(AI_RECAPTION_SYSTEM_PROMPT.toLowerCase()).toContain("caption");
  });

  it("references the 6-word title rule and 10-word subtitle rule", () => {
    expect(AI_RECAPTION_SYSTEM_PROMPT).toMatch(/6 words?/);
    expect(AI_RECAPTION_SYSTEM_PROMPT).toMatch(/10 words?/);
  });
});
