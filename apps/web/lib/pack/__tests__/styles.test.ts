import { describe, expect, it } from "vitest";
import { BackgroundSchema } from "@framekit/scene";
import { PACK_STYLE_IDS } from "../schema";
import { mixHex, PACK_STYLES } from "../styles";

describe("mixHex", () => {
  it("t=0 returns a, t=1 returns b", () => {
    expect(mixHex("#ff0000", "#0000ff", 0)).toBe("#ff0000");
    expect(mixHex("#ff0000", "#0000ff", 1)).toBe("#0000ff");
  });
  it("midpoint blends channels", () => {
    expect(mixHex("#000000", "#ffffff", 0.5)).toBe("#808080");
  });
});

describe("PACK_STYLES", () => {
  it("defines every declared style id", () => {
    for (const id of PACK_STYLE_IDS) {
      expect(PACK_STYLES[id], id).toBeDefined();
      expect(PACK_STYLES[id].id).toBe(id);
    }
  });

  it("every style background validates against the scene BackgroundSchema", () => {
    for (const id of PACK_STYLE_IDS) {
      const bg = PACK_STYLES[id].background("#6d28d9");
      expect(BackgroundSchema.safeParse(bg).success, id).toBe(true);
    }
  });

  it("device layouts stay renderable (positive height, sane rotation)", () => {
    for (const id of PACK_STYLE_IDS) {
      for (let i = 0; i < 5; i++) {
        const d = PACK_STYLES[id].device(i, 5);
        expect(d.heightFrac, id).toBeGreaterThan(0.3);
        expect(d.heightFrac, id).toBeLessThanOrEqual(1.0);
        expect(Math.abs(d.rotate), id).toBeLessThanOrEqual(15);
      }
    }
  });

  it("tilted-rhythm alternates rotation sign per screen", () => {
    const a = PACK_STYLES["tilted-rhythm"].device(0, 4).rotate;
    const b = PACK_STYLES["tilted-rhythm"].device(1, 4).rotate;
    expect(Math.sign(a)).not.toBe(Math.sign(b));
  });

  it("only panorama-flow declares panorama", () => {
    expect(PACK_STYLES["panorama-flow"].panorama).toBe(true);
    expect(PACK_STYLE_IDS.filter((id) => PACK_STYLES[id].panorama)).toEqual(["panorama-flow"]);
  });
});
