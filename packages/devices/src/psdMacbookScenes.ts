import type { Device } from "./types";

type Quad = [[number, number], [number, number], [number, number], [number, number]];

const ROOT = "/psd-templates";
const SOURCE_SIZE: [number, number] = [2560, 1664];

// Plates are cropped to the laptop (+90px margin) and scaled so the screen is
// ~1:1 with a 2560-wide screenshot; the source PSDs are 7500 × 5000 with the
// laptop filling only the middle third, which made it tiny on the canvas.
const MACBOOKS: Array<{
  id: string;
  name: string;
  folder: string;
  size: [number, number];
  quad: Quad;
}> = [
  {
    id: "realistic",
    name: "MacBook Air 13 · Realistic",
    folder: "01---macbook-air-13-mockup",
    size: [3733, 2197],
    quad: [[587.569, 126.542], [3187.569, 126.542], [3187.569, 1819.53], [587.569, 1819.53]],
  },
  {
    id: "clay",
    name: "MacBook Air 13 · Clay",
    folder: "02---macbook-air-13-clay-mockup",
    size: [3733, 2196],
    quad: [[587.569, 126.542], [3187.569, 126.542], [3187.569, 1819.53], [587.569, 1819.53]],
  },
  {
    id: "vector",
    name: "MacBook Air 13 · Vector",
    folder: "03---macbook-air-13-vector-mockup",
    size: [3391, 2108],
    quad: [[396.392, 128.601], [2996.392, 128.601], [2996.392, 1821.589], [396.392, 1821.589]],
  },
];

export const PSD_MACBOOK_SCENES: Device[] = MACBOOKS.map((macbook) => {
  const left = Math.min(...macbook.quad.map(([x]) => x));
  const top = Math.min(...macbook.quad.map(([, y]) => y));
  const right = Math.max(...macbook.quad.map(([x]) => x));
  const bottom = Math.max(...macbook.quad.map(([, y]) => y));
  const base = `${ROOT}/${macbook.folder}/scene`;

  return {
    id: `macbook-air-13-psd-${macbook.id}`,
    name: macbook.name,
    brand: "apple",
    category: "laptop",
    released: "2026-07",
    screen: { width: SOURCE_SIZE[0], height: SOURCE_SIZE[1], cornerRadius: 0 },
    frame: {
      width: macbook.size[0],
      height: macbook.size[1],
      screenRect: { x: left, y: top, width: right - left, height: bottom - top },
      maskPath: "",
      overlaySelector: "#foreground",
    },
    variants: [{ id: "default", label: "PSD template", body: "", overlay: "", preview: "" }],
    aliases: ["macbook air realistic mockup", "macbook psd mockup", "laptop mockup"],
    seo: { monthlyQueries: ["macbook air mockup", "laptop mockup"] },
    plate: {
      src: `${base}/device-base.png`,
      width: macbook.size[0],
      height: macbook.size[1],
      screenRect: { x: left, y: top, width: right - left, height: bottom - top },
      screenQuad: macbook.quad,
      screenRadius: 0,
      screenMask: `${base}/screen-mask.png`,
      mode: "under",
      bezelMask: false,
    },
  };
});
