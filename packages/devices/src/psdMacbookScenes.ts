import type { Device } from "./types";

type Quad = [[number, number], [number, number], [number, number], [number, number]];

const ROOT = "/psd-templates";
const SOURCE_SIZE: [number, number] = [2560, 1664];

const MACBOOKS: Array<{
  id: string;
  name: string;
  folder: string;
  quad: Quad;
}> = [
  {
    id: "realistic",
    name: "MacBook Air 13 · Realistic",
    folder: "01---macbook-air-13-mockup",
    quad: [[2029.3646, 1205.6328], [5473.6354, 1205.6328], [5473.6354, 3448.3672], [2029.3646, 3448.3672]],
  },
  {
    id: "clay",
    name: "MacBook Air 13 · Clay",
    folder: "02---macbook-air-13-clay-mockup",
    quad: [[2029.3646, 1205.6328], [5473.6354, 1205.6328], [5473.6354, 3448.3672], [2029.3646, 3448.3672]],
  },
  {
    id: "vector",
    name: "MacBook Air 13 · Vector",
    folder: "03---macbook-air-13-vector-mockup",
    quad: [[2031, 1208], [5468, 1208], [5468, 3446], [2031, 3446]],
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
      width: 7500,
      height: 5000,
      screenRect: { x: left, y: top, width: right - left, height: bottom - top },
      maskPath: "",
      overlaySelector: "#foreground",
    },
    variants: [{ id: "default", label: "PSD template", body: "", overlay: "", preview: "" }],
    aliases: ["macbook air realistic mockup", "macbook psd mockup", "laptop mockup"],
    seo: { monthlyQueries: ["macbook air mockup", "laptop mockup"] },
    plate: {
      src: `${base}/device-base.png`,
      width: 7500,
      height: 5000,
      screenRect: { x: left, y: top, width: right - left, height: bottom - top },
      screenQuad: macbook.quad,
      screenRadius: 0,
      screenMask: `${base}/screen-mask.png`,
      mode: "under",
      bezelMask: false,
    },
  };
});
