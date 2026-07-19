import { describe, expect, it } from "vitest";
import { createPack, MarketingSchema, PackDocumentSchema } from "../schema";

const validMarketing = {
  appStoreSubtitle: "Plan your day, effortlessly",
  appStoreDescription: "Focus on what matters.\n\nFocusly turns your to-dos into a calm daily plan.",
  keywords: ["planner", "focus", "productivity", "todo"],
  productHuntTagline: "The calmest way to plan your day",
  launchTweet: "I built Focusly to stop drowning in to-dos. It turns your list into a calm daily plan. 🧘",
};

describe("MarketingSchema", () => {
  it("accepts valid marketing", () => {
    expect(MarketingSchema.safeParse(validMarketing).success).toBe(true);
  });
  it("rejects a >30-char subtitle and >280-char tweet and >12 keywords", () => {
    expect(MarketingSchema.safeParse({ ...validMarketing, appStoreSubtitle: "x".repeat(31) }).success).toBe(false);
    expect(MarketingSchema.safeParse({ ...validMarketing, launchTweet: "x".repeat(281) }).success).toBe(false);
    expect(MarketingSchema.safeParse({ ...validMarketing, keywords: Array(13).fill("k") }).success).toBe(false);
  });
});

describe("pack.marketing back-compat", () => {
  it("createPack has no marketing and still validates", () => {
    const p = createPack();
    expect(p.marketing).toBeUndefined();
    expect(PackDocumentSchema.safeParse(p).success).toBe(true);
  });
  it("a pack WITH valid marketing validates", () => {
    const p = createPack();
    (p as { marketing?: unknown }).marketing = validMarketing;
    expect(PackDocumentSchema.safeParse(p).success).toBe(true);
  });
});
