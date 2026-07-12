import type { Device } from "./types";

type Quad = [[number, number], [number, number], [number, number], [number, number]];

const COMPOSITES: Array<{
  id: string;
  name: string;
  root: string;
  sourceSize: [number, number];
  quad: Quad;
}> = [
  { id: "watch-01", name: "Apple Watch Series 11 · Hand", root: "01-copy", sourceSize: [1664, 1984], quad: [[1772.2628, 1069.117], [2137.7372, 1069.117], [2137.7372, 1506.883], [1772.2628, 1506.883]] },
  { id: "iphone-01", name: "iPhone 17 Pro · Hand", root: "01", sourceSize: [1206, 2622], quad: [[1598.5048, 309], [2399.4952, 309], [2399.4952, 2047], [1599.0681, 2047]] },
  { id: "watch-02", name: "Apple Watch Series 11 · Angled", root: "02-copy", sourceSize: [1664, 1984], quad: [[1485.6577, 959.7088], [1916.132, 844.5777], [2077.3504, 1373.2912], [1649.8757, 1494.4215]] },
  { id: "iphone-02", name: "iPhone 17 Pro · Angled", root: "02", sourceSize: [1206, 2622], quad: [[1038.3341, 334.1371], [1807.7669, 257.6967], [2132.7598, 2074.4242], [1368.7001, 2192.0743]] },
];

const SAMSUNG: Array<{
  id: string;
  name: string;
  folder: string;
}> = [
  { id: "gray", name: "Titanium Gray", folder: "titanium-gray/device-2" },
  { id: "black", name: "Titanium Black", folder: "titanium-black/device-2" },
  { id: "violet", name: "Titanium Violet", folder: "titanium-violet/device-2" },
  { id: "yellow", name: "Titanium Yellow", folder: "titanium-yellow/device-2" },
];

function compositeDevice(item: (typeof COMPOSITES)[number]): Device {
  const base = `/psd-templates/${item.root}/scene`;
  return {
    id: `psd-composite-${item.id}`,
    name: item.name,
    brand: "apple",
    category: item.id.startsWith("watch") ? "watch" : "phone",
    released: "2026-07",
    screen: { width: item.sourceSize[0], height: item.sourceSize[1], cornerRadius: 0 },
    frame: { width: 4000, height: 2666, screenRect: { x: 0, y: 0, width: 4000, height: 2666 }, maskPath: "", overlaySelector: "#foreground" },
    variants: [{ id: "default", label: "PSD template", body: "", overlay: "", preview: "" }],
    aliases: ["realistic hand mockup", "psd mockup", "device mockup"],
    seo: { monthlyQueries: ["realistic device mockup", "hand mockup"] },
    plate: {
      src: `${base}/device-base.png`, width: 4000, height: 2666,
      screenRect: { x: item.quad[0][0], y: item.quad[0][1], width: item.quad[1][0] - item.quad[0][0], height: item.quad[3][1] - item.quad[0][1] },
      screenQuad: item.quad, screenRadius: 0, screenMask: `${base}/screen-mask.png`, mode: "under", bezelMask: false,
    },
  };
}

function samsungDevice(item: (typeof SAMSUNG)[number]): Device {
  const base = `/psd-templates/samsung-s24-ultra/${item.folder}`;
  const quad: Quad = [[2010.0813, 98.5596], [3060.7312, 604.8471], [1229.5054, 2590.1588], [164.7231, 1985.9705]];
  const left = Math.min(...quad.map(([x]) => x));
  const top = Math.min(...quad.map(([, y]) => y));
  const right = Math.max(...quad.map(([x]) => x));
  const bottom = Math.max(...quad.map(([, y]) => y));
  return {
    id: `samsung-s24-ultra-psd-${item.id}`,
    name: `Samsung Galaxy S24 Ultra · ${item.name}`,
    brand: "samsung", category: "phone", released: "2026-07",
    screen: { width: 1440, height: 3120, cornerRadius: 0 },
    frame: { width: 3349, height: 2889, screenRect: { x: left, y: top, width: right - left, height: bottom - top }, maskPath: "", overlaySelector: "#foreground" },
    variants: [{ id: "default", label: "PSD template", body: "", overlay: "", preview: "" }],
    aliases: ["samsung galaxy s24 ultra mockup", "samsung psd mockup", "android mockup"],
    seo: { monthlyQueries: ["samsung s24 ultra mockup", "android mockup"] },
    plate: { src: `${base}/device-base.png`, width: 3349, height: 2889, screenRect: { x: left, y: top, width: right - left, height: bottom - top }, screenQuad: quad, screenRadius: 0, screenMask: `${base}/screen-mask.png`, mode: "hole", bezelMask: false },
  };
}

export const PSD_COMPOSITE_SCENES: Device[] = [...COMPOSITES.map(compositeDevice), ...SAMSUNG.map(samsungDevice)];
