import type { Device } from "./types";

type Quad = [[number, number], [number, number], [number, number], [number, number]];

const ROOT = "/psd-templates/apple-watch-ultra";

const WATCHES: Array<{
  id: string;
  name: string;
  folder: string;
  width: number;
  height: number;
  quad: Quad;
}> = [
  { id: "midnight-1", name: "Midnight Ocean · Front", folder: "titanium-case-with-midnight-ocean-band/1", width: 2380, height: 2595, quad: [[64.0227, 537.3657], [876.1511, 360.0257], [878.5531, 1908.9424], [61.3155, 1969.1806]] },
  { id: "midnight-2", name: "Midnight Ocean · Tall", folder: "titanium-case-with-midnight-ocean-band/2", width: 2230, height: 3646, quad: [[224.9984, 832.3947], [1889.7064, 834.8345], [1894.5728, 2868.3134], [215.6401, 2867.5434]] },
  { id: "midnight-3", name: "Midnight Ocean · Right", folder: "titanium-case-with-midnight-ocean-band/3", width: 2426, height: 2595, quad: [[1510.6323, 360.7084], [2320.4947, 538.2653], [2322.5839, 1975.438], [1503.5827, 1899.9595]] },
  { id: "orange-1", name: "Orange Alpine · Front", folder: "titanium-case-with-orange-alpine-loop/1", width: 2315, height: 2697, quad: [[65.0227, 595.3657], [877.1511, 418.0257], [879.5531, 1966.9424], [62.3155, 2027.1806]] },
  { id: "orange-2", name: "Orange Alpine · Tall", folder: "titanium-case-with-orange-alpine-loop/2", width: 2229, height: 3691, quad: [[224.9984, 825.3947], [1889.7064, 827.8345], [1894.5728, 2861.3134], [215.6401, 2860.5434]] },
  { id: "orange-3", name: "Orange Alpine · Right", folder: "titanium-case-with-orange-alpine-loop/3", width: 2350, height: 2696, quad: [[1440.6323, 418.7084], [2250.4947, 596.2653], [2252.5839, 2033.438], [1433.5827, 1957.9595]] },
  { id: "trail-1", name: "Yellow Trail · Front", folder: "titanium-case-with-yellow-beige-trail-loop/1", width: 2313, height: 2691, quad: [[65.0227, 595.3657], [877.1511, 418.0257], [879.5531, 1966.9424], [62.3155, 2027.1806]] },
  { id: "trail-2", name: "Yellow Trail · Tall", folder: "titanium-case-with-yellow-beige-trail-loop/2", width: 2229, height: 3690, quad: [[224.9984, 830.3947], [1889.7064, 832.8345], [1894.5728, 2866.3134], [215.6401, 2865.5434]] },
  { id: "trail-3", name: "Yellow Trail · Right", folder: "titanium-case-with-yellow-beige-trail-loop/3", width: 2349, height: 2693, quad: [[1439.6323, 419.7084], [2249.4947, 597.2653], [2251.5839, 2034.438], [1432.5827, 1958.9595]] },
];

export const PSD_WATCH_SCENES: Device[] = WATCHES.map((watch) => {
  const left = Math.min(...watch.quad.map(([x]) => x));
  const top = Math.min(...watch.quad.map(([, y]) => y));
  const right = Math.max(...watch.quad.map(([x]) => x));
  const bottom = Math.max(...watch.quad.map(([, y]) => y));
  const base = `${ROOT}/${watch.folder}`;
  return {
    id: `apple-watch-ultra-psd-${watch.id}`,
    name: `Apple Watch Ultra · ${watch.name}`,
    brand: "apple",
    category: "watch",
    released: "2026-07",
    screen: { width: 410, height: 502, cornerRadius: 36 },
    frame: {
      width: watch.width,
      height: watch.height,
      screenRect: { x: left, y: top, width: right - left, height: bottom - top },
      maskPath: "",
      overlaySelector: "#foreground",
    },
    variants: [{ id: "default", label: "PSD template", body: "", overlay: "", preview: "" }],
    aliases: ["apple watch ultra realistic", "apple watch ultra psd", "apple watch mockup"],
    seo: { monthlyQueries: ["apple watch ultra mockup", "apple watch mockup"] },
    plate: {
      src: `${base}/device-base.png`,
      width: watch.width,
      height: watch.height,
      screenRect: { x: left, y: top, width: right - left, height: bottom - top },
      screenQuad: watch.quad,
      screenRadius: 36,
      screenMask: `${base}/screen-mask.png`,
      mode: "hole",
      bezelMask: false,
    },
  };
});
