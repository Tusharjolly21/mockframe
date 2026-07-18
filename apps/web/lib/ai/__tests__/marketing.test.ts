import { describe, expect, it } from "vitest";
import { AI_REAL_SYSTEM_PROMPT, AI_SYSTEM_PROMPT, AiPackPlanSchema, buildPackFromPlan, buildRealPackFromPlan, RealPackPlanSchema } from "../plan";

const marketing = {
  appStoreSubtitle: "Plan your day",
  appStoreDescription: "Hook line.\n\nMore detail.",
  keywords: ["planner", "focus"],
  productHuntTagline: "The calmest way to plan",
  launchTweet: "I built this to plan calmly.",
};

function conceptPlan(over: Partial<{ marketing: typeof marketing }> = {}) {
  return AiPackPlanSchema.parse({
    styleId: "bold-gradient", accent: "#0ea5e9", captionPosition: "top",
    screens: Array.from({ length: 8 }, (_, i) => ({
      archetype: (["onboarding","home-feed","dashboard","list","detail","profile","settings","chat"] as const)[i],
      caption: { title: `F${i}` },
      doc: { dark: false, palette: { primary: "#0ea5e9", bg: "#f4f8fb", card: "#ffffff", text: "#101418", muted: "#5c6670" }, header: { title: "H" }, items: [{ title: "a" }] },
    })),
    marketing, ...over,
  });
}

describe("marketing in plans", () => {
  it("both schemas require marketing", () => {
    expect(() => conceptPlan()).not.toThrow();
    expect(AiPackPlanSchema.safeParse({ ...conceptPlan(), marketing: undefined }).success).toBe(false);
  });
  it("buildPackFromPlan clamps over-long fields and sets pack.marketing", () => {
    const plan = conceptPlan({ marketing: { ...marketing, appStoreSubtitle: "x".repeat(50), launchTweet: "y".repeat(400), keywords: Array(20).fill("kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk") } });
    const pack = buildPackFromPlan(plan, "Focusly");
    expect(pack.marketing!.appStoreSubtitle).toHaveLength(30);
    expect(pack.marketing!.launchTweet).toHaveLength(280);
    expect(pack.marketing!.keywords).toHaveLength(12);
    expect(pack.marketing!.keywords[0]).toHaveLength(25);
  });
  it("seeds pack.launch.tagline from the PH tagline (clamped 120)", () => {
    const pack = buildPackFromPlan(conceptPlan({ marketing: { ...marketing, productHuntTagline: "The calmest way to plan" } }), "Focusly");
    expect(pack.launch!.tagline).toBe("The calmest way to plan");
  });
  it("real builder also sets marketing", () => {
    const rp = RealPackPlanSchema.parse({
      styleId: "minimal-light", accent: "#0ea5e9", captionPosition: "top",
      screens: [{ ref: "a", caption: { title: "A" } }, { ref: "b", caption: { title: "B" } }],
      marketing,
    });
    const pack = buildRealPackFromPlan(rp, "Focusly", ["a", "b"]);
    expect(pack.marketing!.productHuntTagline).toBe("The calmest way to plan");
  });
  it("prompts instruct marketing copy", () => {
    for (const p of [AI_SYSTEM_PROMPT, AI_REAL_SYSTEM_PROMPT]) {
      expect(p.toLowerCase()).toContain("subtitle");
      expect(p.toLowerCase()).toContain("tweet");
    }
  });
});
