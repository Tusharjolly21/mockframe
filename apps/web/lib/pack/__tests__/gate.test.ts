import { describe, expect, it } from "vitest";
import { packExportDecision } from "../gate";

describe("packExportDecision", () => {
  it("guests must sign in", () => {
    expect(packExportDecision({ signedIn: false, isPro: false, priorExports: 0 })).toEqual({ allowed: false, reason: "signin" });
  });
  it("pro exports unlimited and clean", () => {
    expect(packExportDecision({ signedIn: true, isPro: true, priorExports: 99 })).toEqual({ allowed: true, clean: true });
  });
  it("first free export is clean", () => {
    expect(packExportDecision({ signedIn: true, isPro: false, priorExports: 0 })).toEqual({ allowed: true, clean: true });
  });
  it("second export requires pro", () => {
    expect(packExportDecision({ signedIn: true, isPro: false, priorExports: 1 })).toEqual({ allowed: false, reason: "pro" });
  });
});
