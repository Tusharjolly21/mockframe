import { describe, expect, it } from "vitest";
import { SceneDocumentSchema } from "@framekit/scene";
import { compilePackScene } from "../../pack/compile";
import { AiPackPlanSchema, buildPackFromPlan, type AiPackPlan } from "../plan";

/**
 * Proof that an AI-generated pack flows through the SAME studio compiler used
 * by hand-built packs, unchanged: buildPackFromPlan() output is a plain
 * PackDocument, and compilePackScene() has no idea (nor should it) that the
 * screen assets came from Claude instead of a user. No API key needed — this
 * is pure data through pure functions.
 */

const TEST_MARKETING = {
  appStoreSubtitle: "Plan your day",
  appStoreDescription: "Hook line.\n\nMore detail.",
  keywords: ["planner", "focus"],
  productHuntTagline: "The calmest way to plan",
  launchTweet: "I built this to plan calmly.",
};

function samplePlan(screens = 9): AiPackPlan {
  return AiPackPlanSchema.parse({
    styleId: "bold-gradient",
    accent: "#0ea5e9",
    captionPosition: "top",
    screens: Array.from({ length: screens }, (_, i) => ({
      archetype: (["onboarding", "home-feed", "dashboard", "list", "detail", "profile", "settings", "chat"] as const)[i % 8],
      caption: { title: `Feature ${i + 1}`, subtitle: i % 2 ? undefined : "Why it matters" },
      doc: {
        dark: false,
        palette: { primary: "#0ea5e9", bg: "#f4f8fb", card: "#ffffff", text: "#101418", muted: "#5c6670" },
        header: { title: `Screen ${i + 1}`, subtitle: "Sub" },
        items: [{ title: "Item A", value: "12" }, { title: "Item B" }],
        stats: [{ label: "Users", value: "10k" }],
        cta: "Try it",
        tabs: ["Home", "Stats"],
      },
    })),
    marketing: TEST_MARKETING,
  });
}

describe("AI pack -> studio compiler integration", () => {
  it("compiles an AI-generated pack's screen 0 into a schema-valid scene with an aiapp screen: asset", () => {
    const plan = samplePlan(9);
    const pack = buildPackFromPlan(plan, "Focusly");

    const scene = compilePackScene(pack, 0, "appstore-69");

    const parsed = SceneDocumentSchema.safeParse(scene);
    expect(parsed.success).toBe(true);

    const mockupLayer = scene.layers.find((l) => l.type === "mockup");
    expect(mockupLayer).toBeDefined();
    expect(mockupLayer?.media?.assetId).toBeDefined();
    expect(mockupLayer?.media?.assetId?.startsWith("screen:")).toBe(true);
  });
});
