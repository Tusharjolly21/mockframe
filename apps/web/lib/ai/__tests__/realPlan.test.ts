import { describe, expect, it } from "vitest";
import { PackDocumentSchema } from "../../pack/schema";
import { buildRealPackFromPlan, RealPackPlanSchema, repairRealPlanScreens, type RealPackPlan } from "../plan";

const REFS = ["a1", "b2", "c3", "d4"];
const plan = (screens: RealPackPlan["screens"]): RealPackPlan =>
  RealPackPlanSchema.parse({ styleId: "minimal-light", accent: "#0ea5e9", captionPosition: "top", screens });

const s = (ref: string, title = `cap ${ref}`) => ({ ref, caption: { title } });

describe("repairRealPlanScreens", () => {
  it("keeps a valid permutation untouched", () => {
    const input = [s("b2"), s("a1"), s("d4"), s("c3")];
    expect(repairRealPlanScreens(input, REFS)).toEqual(input);
  });
  it("drops unknown refs, dedupes first-wins, appends missing in original order", () => {
    const out = repairRealPlanScreens([s("b2"), s("zz"), s("b2", "dupe"), s("a1")], REFS);
    expect(out.map((x) => x.ref)).toEqual(["b2", "a1", "c3", "d4"]);
    expect(out[0].caption.title).toBe("cap b2");
    expect(out[2].caption.title).toBe("");
  });
  it("handles a fully-invalid plan by returning all refs with empty captions", () => {
    const out = repairRealPlanScreens([s("x"), s("y")], REFS);
    expect(out.map((x) => x.ref)).toEqual(REFS);
  });
});

describe("buildRealPackFromPlan", () => {
  it("produces a valid PackDocument whose assetIds are the refIds", () => {
    const pack = buildRealPackFromPlan(plan([s("b2"), s("a1"), s("c3"), s("d4")]), "Focusly", REFS);
    expect(PackDocumentSchema.safeParse(pack).success).toBe(true);
    expect(pack.screens.map((x) => x.assetId)).toEqual(["b2", "a1", "c3", "d4"]);
    expect(pack.styleId).toBe("minimal-light");
  });
  it("clamps long captions to schema caps", () => {
    const pack = buildRealPackFromPlan(
      plan([{ ref: "a1", caption: { title: "x".repeat(300), subtitle: "y".repeat(300) } }, s("b2")]),
      "Focusly",
      ["a1", "b2"]
    );
    expect(pack.screens[0].captions.en.title).toHaveLength(120);
    expect(pack.screens[0].captions.en.subtitle).toHaveLength(160);
  });
  it("schema rejects <2 or >10 screens and bad accent", () => {
    expect(RealPackPlanSchema.safeParse({ styleId: "minimal-light", accent: "#0ea5e9", captionPosition: "top", screens: [s("a1")] }).success).toBe(false);
    expect(RealPackPlanSchema.safeParse({ styleId: "minimal-light", accent: "blue", captionPosition: "top", screens: [s("a1"), s("b2")] }).success).toBe(false);
  });
});
