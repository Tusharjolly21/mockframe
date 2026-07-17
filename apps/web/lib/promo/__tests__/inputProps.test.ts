import { describe, expect, it } from "vitest";
import { createPromoProject } from "../registry";
import { buildPromoInputProps } from "../inputProps";

const shots = [
  { url: "blob:a", width: 1206, height: 2622 },
  { url: "blob:b", width: 1206, height: 2622 },
];

describe("buildPromoInputProps", () => {
  it("maps the project + screenshots into composition props with format dimensions", () => {
    const project = createPromoProject("rise-reveal", ["asset_1", "asset_2"]);
    const props = buildPromoInputProps(project, { screenshots: shots, watermark: true });
    expect(props).toEqual({
      deviceId: "iphone-16-pro",
      screenshots: shots,
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
    const project = { ...createPromoProject("rise-reveal", ["asset_1"]), format: "16:9" as const };
    const props = buildPromoInputProps(project, { screenshots: shots, watermark: false, musicUrl: "https://x/track.mp3" });
    expect({ width: props.width, height: props.height }).toEqual({ width: 1920, height: 1080 });
    expect(props.watermark).toBe(false);
    expect(props.musicUrl).toBe("https://x/track.mp3");
  });
});
