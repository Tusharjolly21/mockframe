import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES, sanitizePreferences } from "../preferences";
import { NO_PLAN, parsePlanFacts, summarizePlan, type PlanFacts } from "../billing/summary";

const facts = (p: Partial<PlanFacts>): PlanFacts => ({ ...NO_PLAN, active: true, ...p });
const JAN_2027 = Date.UTC(2027, 0, 15) / 1000;

describe("summarizePlan", () => {
  it("free", () => {
    expect(summarizePlan(NO_PLAN)).toMatchObject({ pro: false, title: "Free", notice: null });
  });

  it("a lapsed plan says so", () => {
    expect(summarizePlan({ ...NO_PLAN, status: "expired" }).notice).toMatch(/isn't active/);
  });

  it("lifetime and legacy one-time never expire, whatever the plan field says", () => {
    expect(summarizePlan(facts({ plan: "lifetime", kind: "one_time" }))).toMatchObject({ pro: true, title: "Pro for life" });
    expect(summarizePlan(facts({ plan: "yearly", kind: "one_time" })).title).toBe("Pro for life");
  });

  it("an active subscription shows its renewal date", () => {
    const s = summarizePlan(facts({ plan: "yearly", kind: "subscription", status: "active", paidThrough: JAN_2027 }));
    expect(s).toMatchObject({ pro: true, title: "Pro yearly", detail: "Renews on January 15, 2027.", notice: null });
    expect(summarizePlan(facts({ plan: "monthly", status: "active" })).detail).toBe("Renews automatically.");
  });

  it("a cancelled plan keeps Pro until it ends", () => {
    const s = summarizePlan(facts({ plan: "monthly", status: "cancelled", paidThrough: JAN_2027 }));
    expect(s).toMatchObject({ pro: true, detail: "Ends on January 15, 2027." });
    expect(s.notice).toMatch(/keep Pro/);
    expect(summarizePlan(facts({ plan: "monthly", status: "active", cancelAtPeriodEnd: true, paidThrough: JAN_2027 })).detail).toMatch(/^Ends on/);
  });

  it("a failed renewal warns but stays Pro", () => {
    const s = summarizePlan(facts({ plan: "monthly", status: "past_due", paidThrough: JAN_2027 }));
    expect(s.pro).toBe(true);
    expect(s.notice).toMatch(/didn't go through/);
  });
});

describe("parsePlanFacts", () => {
  it("keeps valid fields and drops junk", () => {
    expect(parsePlanFacts({ active: true, plan: "yearly", kind: "subscription", status: "active", paidThrough: 123, cancelAtPeriodEnd: true })).toEqual({
      active: true, plan: "yearly", kind: "subscription", status: "active", paidThrough: 123, cancelAtPeriodEnd: true,
    });
    expect(parsePlanFacts({ active: "yes", plan: "gold", paidThrough: "soon" })).toEqual(NO_PLAN);
    expect(parsePlanFacts(null)).toEqual(NO_PLAN);
  });
});

describe("sanitizePreferences", () => {
  it("fills in defaults and rejects bad values field by field", () => {
    expect(sanitizePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(sanitizePreferences({ exportFormat: "webp", exportQuality: "best", autosave: false })).toEqual({ exportFormat: "webp", exportQuality: "best", autosave: false });
    expect(sanitizePreferences({ exportFormat: "gif", exportQuality: 3, autosave: "no" })).toEqual(DEFAULT_PREFERENCES);
    expect(sanitizePreferences({ exportFormat: "jpeg" })).toEqual({ ...DEFAULT_PREFERENCES, exportFormat: "jpeg" });
  });
});
