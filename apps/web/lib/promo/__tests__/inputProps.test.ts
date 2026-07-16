import { describe, expect, it } from "vitest";
import { createPromoProject } from "../registry";
import { buildPromoInputProps } from "../inputProps";

describe("buildPromoInputProps", () => {
  it("maps the project + options into composition props with format dimensions", () => {
    const project = createPromoProject("rise-reveal", "asset_1");
    const props = buildPromoInputProps(project, { screenshotUrl: "blob:abc", watermark: true });
    expect(props).toEqual({
      screenshotUrl: "blob:abc",
      texts: project.texts,
      accent: project.accent,
      background: project.background,
      watermark: true,
      musicUrl: null,
      width: 1080,
      height: 1920,
    });
  });

  it("uses 16:9 dimensions when the project format is 16:9 and passes music through", () => {
    const project = { ...createPromoProject("rise-reveal", "asset_1"), format: "16:9" as const };
    const props = buildPromoInputProps(project, { screenshotUrl: "u", watermark: false, musicUrl: "https://x/track.mp3" });
    expect({ width: props.width, height: props.height }).toEqual({ width: 1920, height: 1080 });
    expect(props.watermark).toBe(false);
    expect(props.musicUrl).toBe("https://x/track.mp3");
  });
});
