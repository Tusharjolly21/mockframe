import { describe, expect, it } from "vitest";
import { API_MAX_SCREENSHOTS, LOOK_NAMES, parseRenderJob, screenshotRef } from "../apiRender";

const PNG = "data:image/png;base64,iVBORw0KGgo=";
const UPLOAD = "upload_123e4567-e89b-12d3-a456-426614174000";

describe("screenshotRef", () => {
  it("takes data URLs, upload ids and https URLs", () => {
    expect(screenshotRef(PNG)).toBe(PNG);
    expect(screenshotRef(UPLOAD)).toBe(UPLOAD);
    expect(screenshotRef(" https://example.com/a.png ")).toBe("https://example.com/a.png");
  });

  it("refuses everything else", () => {
    expect(screenshotRef("http://example.com/a.png")).toBeNull();
    expect(screenshotRef("file:///etc/passwd")).toBeNull();
    expect(screenshotRef("data:image/svg+xml;base64,PHN2Zz4=")).toBeNull();
    expect(screenshotRef("upload_nope")).toBeNull();
    expect(screenshotRef(42)).toBeNull();
  });
});

describe("parseRenderJob", () => {
  it("defaults a mockup job", () => {
    const r = parseRenderJob({ screenshots: [PNG] });
    expect(r).toEqual({ ok: true, job: { kind: "mockup", screenshots: [PNG], device: "auto", look: null, format: "png", scale: 1 } });
  });

  it("accepts a single screenshot, a look by name or index, scale and jpeg", () => {
    const r = parseRenderJob({ screenshot: PNG, look: "glow", scale: 2, format: "jpg", device: " iphone-17-pro " });
    expect(r.ok && r.job).toMatchObject({ kind: "mockup", look: LOOK_NAMES.indexOf("glow"), scale: 2, format: "jpeg", device: "iphone-17-pro" });
    const byIndex = parseRenderJob({ screenshots: [PNG], look: 3 });
    expect(byIndex.ok && byIndex.job.kind === "mockup" && byIndex.job.look).toBe(3);
    const none = parseRenderJob({ screenshots: [PNG], look: "none" });
    expect(none.ok && none.job.kind === "mockup" && none.job.look).toBeNull();
  });

  it("parses a store set", () => {
    const r = parseRenderJob({ type: "store-set", style: "penny", platform: "android", screenshots: [UPLOAD], scale: 2 });
    expect(r).toEqual({ ok: true, job: { kind: "store-set", screenshots: [UPLOAD], set: "penny", platform: "android", format: "png", scale: 1 } });
    const d = parseRenderJob({ type: "store-set", screenshots: [UPLOAD] });
    expect(d.ok && d.job).toMatchObject({ set: "stride", platform: "ios" });
  });

  it("explains what's wrong", () => {
    expect(parseRenderJob(null)).toMatchObject({ ok: false });
    expect(parseRenderJob({})).toMatchObject({ ok: false, error: expect.stringContaining("Add screenshots") });
    expect(parseRenderJob({ screenshots: Array(API_MAX_SCREENSHOTS + 1).fill(PNG) })).toMatchObject({ ok: false, error: expect.stringContaining(`${API_MAX_SCREENSHOTS}`) });
    expect(parseRenderJob({ screenshots: ["http://insecure.example/a.png"] })).toMatchObject({ ok: false });
    expect(parseRenderJob({ screenshots: [PNG], look: "sparkly" })).toMatchObject({ ok: false, error: expect.stringContaining("look must be") });
    expect(parseRenderJob({ type: "store-set", style: "neon", screenshots: [PNG] })).toMatchObject({ ok: false, error: expect.stringContaining("style must be") });
  });
});
