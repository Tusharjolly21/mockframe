import { describe, expect, it } from "vitest";
import { safeJsonLd } from "../jsonLd";

describe("safeJsonLd", () => {
  it("never lets a value close the script tag", () => {
    const out = safeJsonLd({ name: "</script><img src=x onerror=alert(1)>", note: "a b c" });
    expect(out).not.toContain("<");
    expect(out).not.toContain(" ");
    expect(out).not.toContain(" ");
  });

  it("round-trips to the same data", () => {
    const value = { name: "</script><b>", n: 3, list: ["a", "<"] };
    expect(JSON.parse(safeJsonLd(value))).toEqual(value);
  });
});
