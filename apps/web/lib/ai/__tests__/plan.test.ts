import { describe, expect, it } from "vitest";
import { PackDocumentSchema } from "../../pack/schema";
import { decodeScreenAsset } from "../../screens";
import { AiPackPlanSchema, buildPackFromPlan, encodeAiScreenAsset, type AiPackPlan } from "../plan";

function samplePlan(screens = 8): AiPackPlan {
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
  });
}

describe("AiPackPlanSchema", () => {
  it("accepts 8–10 screens and rejects 7 or 11", () => {
    expect(() => samplePlan(8)).not.toThrow();
    expect(() => samplePlan(10)).not.toThrow();
    expect(() => samplePlan(7)).toThrow();
    expect(() => samplePlan(11)).toThrow();
  });

  it("rejects unknown style ids", () => {
    const raw = JSON.parse(JSON.stringify(samplePlan()));
    raw.styleId = "vaporwave";
    expect(AiPackPlanSchema.safeParse(raw).success).toBe(false);
  });

  it("rejects invalid hex colors in palette", () => {
    const raw = JSON.parse(JSON.stringify(samplePlan()));
    raw.screens[0].doc.palette.primary = "not-a-color";
    expect(AiPackPlanSchema.safeParse(raw).success).toBe(false);
  });

  it("rejects invalid hex accent color", () => {
    const raw = JSON.parse(JSON.stringify(samplePlan()));
    raw.accent = "not-a-color";
    expect(AiPackPlanSchema.safeParse(raw).success).toBe(false);
  });
});

describe("buildPackFromPlan", () => {
  it("produces a valid PackDocument with encoded aiapp screens", () => {
    const pack = buildPackFromPlan(samplePlan(9), "Focusly");
    expect(PackDocumentSchema.safeParse(pack).success).toBe(true);
    expect(pack.appName).toBe("Focusly");
    expect(pack.styleId).toBe("bold-gradient");
    expect(pack.style.accent).toBe("#0ea5e9");
    expect(pack.screens).toHaveLength(9);
    for (const s of pack.screens) {
      expect(s.assetId).toMatch(/^screen:/);
      expect(s.captions.en.title.length).toBeGreaterThan(0);
    }
  });

  it("encoded docs decode through the real screens decoder", () => {
    const pack = buildPackFromPlan(samplePlan(8), "Focusly");
    const doc = decodeScreenAsset(pack.screens[0].assetId!);
    expect(doc).toBeDefined();
    expect(doc && (doc as { app: string }).app).toBe("aiapp");
    expect(doc && (doc as { appName: string }).appName).toBe("Focusly");
  });

  it("encodeAiScreenAsset matches the screens module format", () => {
    const enc = encodeAiScreenAsset({ app: "aiapp", appName: "X" });
    expect(decodeScreenAsset(enc)).toMatchObject({ app: "aiapp", appName: "X" });
  });

  it("clamps overlong captions to the PackDocumentSchema caps", () => {
    const plan = samplePlan(8);
    plan.screens[0].caption.title = "T".repeat(300);
    plan.screens[0].caption.subtitle = "S".repeat(300);
    const pack = buildPackFromPlan(plan, "Focusly");
    expect(PackDocumentSchema.safeParse(pack).success).toBe(true);
    expect(pack.screens[0].captions.en.title.length).toBe(120);
    expect(pack.screens[0].captions.en.subtitle?.length).toBe(160);
  });
});
