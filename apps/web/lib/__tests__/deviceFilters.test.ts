import { describe, expect, it } from "vitest";
import {
  deviceModel,
  facetOptions,
  filterDevices,
  filterFromParams,
  filterToParams,
  listDevices,
  normalizeFilter,
  setFacet,
} from "@framekit/devices";

const devices = listDevices();

describe("deviceModel", () => {
  it("groups variants and scenes under one model", () => {
    expect(deviceModel({ name: "iPhone 16 Pro · Black Titanium · Front" })).toBe("iPhone 16 Pro");
    expect(deviceModel({ name: "MacBook Air 13″" })).toBe("MacBook Air");
    expect(deviceModel({ name: "MacBook Pro 14″" })).toBe("MacBook Pro");
    expect(deviceModel({ name: "iPad Pro 13″ (M4)" })).toBe("iPad Pro");
    expect(deviceModel({ name: "iPad Pro (2024) · Silver · Flat" })).toBe("iPad Pro");
    expect(deviceModel({ name: "Apple Watch Ultra 3" })).toBe("Apple Watch Ultra");
    expect(deviceModel({ name: "Samsung Galaxy S24 Ultra · Titanium Gray" })).toBe("Galaxy S24 Ultra");
    expect(deviceModel({ name: "Nothing Phone (3)" })).toBe("Nothing Phone (3)");
    expect(deviceModel({ name: "iMac 24″" })).toBe("iMac");
  });
});

describe("device filters", () => {
  it("combine device type, brand and model", () => {
    const f = { type: "phone", brand: "apple", model: "iPhone 17" };
    const hits = filterDevices(devices, f);
    expect(hits.length).toBeGreaterThan(3);
    expect(hits.every((d) => d.category === "phone" && d.brand === "apple" && d.name.startsWith("iPhone 17"))).toBe(true);
  });

  it("count each facet against the other facets", () => {
    const brands = facetOptions(devices, { type: "watch" }, "brand").map((o) => o.value);
    expect(brands).toContain("apple");
    expect(brands).not.toContain("oneplus");
    const models = facetOptions(devices, { type: "laptop" }, "model").map((o) => o.value);
    expect(models).toEqual(expect.arrayContaining(["MacBook Air", "MacBook Pro"]));
    expect(models.some((m) => m.startsWith("iPhone"))).toBe(false);
  });

  it("drop choices that another choice rules out", () => {
    const next = setFacet(devices, { type: "phone", model: "iPhone 17" }, "type", "watch");
    expect(next).toEqual({ type: "watch" });
    expect(setFacet(devices, { model: "MacBook Pro" }, "brand", "samsung")).toEqual({ brand: "samsung" });
  });

  it("clear a facet when its active value is clicked again", () => {
    expect(setFacet(devices, { type: "phone" }, "type", "phone")).toEqual({});
  });

  it("round-trip through URL params", () => {
    const f = { type: "phone", brand: "apple", model: "iPhone 16 Pro", style: "photo" as const };
    expect(filterFromParams(filterToParams(f))).toEqual(f);
    expect(filterFromParams(new URLSearchParams("device=Watch"))).toEqual({ type: "watch" });
    expect(filterFromParams(new URLSearchParams("style=bogus"))).toEqual({});
  });

  it("separate photo scenes from plain frames", () => {
    const photo = filterDevices(devices, { style: "photo" });
    const frames = filterDevices(devices, { style: "frame" });
    expect(photo.every((d) => !!d.plate)).toBe(true);
    expect(frames.every((d) => !d.plate)).toBe(true);
    expect(photo.length + frames.length).toBe(devices.length);
  });
});
