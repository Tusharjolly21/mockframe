"use client";

/** Canvas size catalog — plain aspect ratios plus platform-native presets,
 *  mirroring the export targets that matter (shots.so parity). */
export interface SizePreset {
  id: string;
  label: string;
  ratio: string;
  width: number;
  height: number;
}

export interface SizeCategory {
  id: string;
  label: string | null;
  brand?: "instagram" | "x" | "youtube" | "pinterest" | "dribbble" | "appstore";
  presets: SizePreset[];
}

const p = (id: string, label: string, ratio: string, width: number, height: number): SizePreset => ({
  id, label, ratio, width, height,
});

export const SIZE_CATEGORIES: SizeCategory[] = [
  {
    id: "ratios",
    label: null,
    presets: [
      p("r-16-9", "16:9", "16:9", 1920, 1080),
      p("r-3-2", "3:2", "3:2", 1920, 1280),
      p("r-4-3", "4:3", "4:3", 1920, 1440),
      p("r-5-4", "5:4", "5:4", 1800, 1440),
      p("r-1-1", "1:1", "1:1", 1440, 1440),
      p("r-4-5", "4:5", "4:5", 1440, 1800),
      p("r-3-4", "3:4", "3:4", 1440, 1920),
      p("r-2-3", "2:3", "2:3", 1280, 1920),
      p("r-9-16", "9:16", "9:16", 1080, 1920),
    ],
  },
  {
    id: "instagram",
    label: "Instagram",
    brand: "instagram",
    presets: [
      p("ig-post", "Post", "1:1", 1080, 1080),
      p("ig-portrait", "Portrait", "4:5", 1080, 1350),
      p("ig-story", "Story", "9:16", 1080, 1920),
    ],
  },
  {
    id: "x",
    label: "Twitter / X",
    brand: "x",
    presets: [
      p("tw-tweet", "Tweet", "16:9", 1600, 900),
      p("tw-cover", "Cover", "3:1", 1500, 500),
    ],
  },
  {
    id: "youtube",
    label: "YouTube",
    brand: "youtube",
    presets: [
      p("yt-banner", "Banner", "16:9", 2560, 1440),
      p("yt-thumb", "Thumbnail", "16:9", 1280, 720),
      p("yt-video", "Video", "16:9", 1920, 1080),
    ],
  },
  {
    id: "pinterest",
    label: "Pinterest",
    brand: "pinterest",
    presets: [
      p("pin-long", "Long", "10:21", 1000, 2100),
      p("pin-optimal", "Optimal", "2:3", 1000, 1500),
      p("pin-square", "Square", "1:1", 1080, 1080),
    ],
  },
  {
    id: "dribbble",
    label: "Dribbble",
    brand: "dribbble",
    presets: [p("dr-shot", "Shot", "4:3", 1600, 1200)],
  },
  {
    id: "appstore",
    label: "Appstore",
    brand: "appstore",
    presets: [
      p("as-65", 'iPhone 6.5"', "1284:2778", 1284, 2778),
      p("as-55", 'iPhone 5.5"', "1242:2208", 1242, 2208),
      p("as-ipad", 'iPad Pro 12.9"', "2048:2732", 2048, 2732),
      p("as-65-l", 'iPhone 6.5"', "2778:1284", 2778, 1284),
      p("as-55-l", "iPhone 5.5", "2208:1242", 2208, 1242),
      p("as-ipad-l", 'iPad Pro 12.9"', "2732:2048", 2732, 2048),
      p("as-mac", "Mac", "16:10", 2560, 1600),
      p("as-tvos", "Apple TV", "16:9", 3840, 2160),
    ],
  },
];

export const ALL_SIZE_PRESETS: SizePreset[] = SIZE_CATEGORIES.flatMap((c) => c.presets);

export function findSizePreset(width: number, height: number): SizePreset | undefined {
  return ALL_SIZE_PRESETS.find((s) => s.width === width && s.height === height);
}
