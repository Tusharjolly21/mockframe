import { describe, expect, it } from "vitest";
import { aiGenerationDecision } from "../gate";

describe("aiGenerationDecision", () => {
  it("guests must sign in", () => {
    expect(aiGenerationDecision({ signedIn: false, isPro: false, priorGenerations: 0 })).toEqual({ allowed: false, reason: "signin" });
  });
  it("pro is allowed regardless of count (quota handled separately)", () => {
    expect(aiGenerationDecision({ signedIn: true, isPro: true, priorGenerations: 99 })).toEqual({ allowed: true });
  });
  it("free users get exactly 2", () => {
    expect(aiGenerationDecision({ signedIn: true, isPro: false, priorGenerations: 0 })).toEqual({ allowed: true });
    expect(aiGenerationDecision({ signedIn: true, isPro: false, priorGenerations: 1 })).toEqual({ allowed: true });
    expect(aiGenerationDecision({ signedIn: true, isPro: false, priorGenerations: 2 })).toEqual({ allowed: false, reason: "pro" });
  });
});
