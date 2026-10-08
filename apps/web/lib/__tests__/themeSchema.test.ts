import { describe, expect, it } from "vitest";
import { CssColorSchema } from "@framekit/scene";
import { parseTheme } from "../themeSchema";

describe("parseTheme", () => {
  const good = { id: "t1", name: "Sky", background: { type: "linear-gradient", angle: 90, stops: [{ at: 0, color: "#fff" }, { at: 1, color: "rgb(0 0 0 / 50%)" }] } };

  it("keeps a well-formed theme", () => {
    expect(parseTheme(good)).toMatchObject({ id: "t1", name: "Sky", background: { type: "linear-gradient" } });
  });

  it("rejects themes whose background would crash the panel", () => {
    expect(parseTheme({ id: "t", name: "x", background: { type: "linear-gradient" } })).toBeNull();
    expect(parseTheme({ id: "t", name: "x", background: "red" })).toBeNull();
    expect(parseTheme({ id: "t", background: good.background })).toBeNull();
    expect(parseTheme(null)).toBeNull();
  });

  it("drops a bad backdrop, effects and border without losing the theme", () => {
    const t = parseTheme({ ...good, backdrop: { pattern: "nope" }, effects: [{ type: "bogus" }, { type: "grain", intensity: 0.2, seed: 1 }], border: { width: 2, color: "url(https://evil/x.png)" }, cornerRadius: -4 });
    expect(t).not.toBeNull();
    expect(t!.backdrop).toBeUndefined();
    expect(t!.effects).toHaveLength(1);
    expect(t!.border).toBeUndefined();
    expect(t!.cornerRadius).toBeUndefined();
  });
});

describe("CssColorSchema", () => {
  it("accepts ordinary colours", () => {
    for (const c of ["#fff", "#112233aa", "rgba(0,0,0,.4)", "hsl(200 50% 50%)", "transparent", "rebeccapurple", "color-mix(in srgb, red 40%, blue)"]) {
      expect(CssColorSchema.safeParse(c).success, c).toBe(true);
    }
  });

  it("rejects values that could load files or break out of a declaration", () => {
    for (const c of ["url(https://evil/p.png)", "red 145%), url(//evil/p.png), radial-gradient(red", "red; background: url(x)", "red}body{x:y", "red\\\\", "<b>", "@import 'x'"]) {
      expect(CssColorSchema.safeParse(c).success, c).toBe(false);
    }
  });
});
