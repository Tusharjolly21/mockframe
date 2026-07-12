import type { Device } from "./types";

type Quad = [[number, number], [number, number], [number, number], [number, number]];

const ROOT = "/psd-templates/ipad-pro-2024";

const IPADS: Array<{
  id: string;
  name: string;
  folder: string;
  width: number;
  height: number;
  quad: Quad;
}> = [
  { id: "silver-1", name: "Silver · Angled", folder: "silver/device-1", width: 4837, height: 3214, quad: [[1545.8516, 47.6717], [3541.1059, 1182.4934], [2304.1418, 2819.0668], [376.7317, 1509.1804]] },
  { id: "silver-2", name: "Silver · Flat", folder: "silver/device-2", width: 3459, height: 1846, quad: [[934.2794, 40.6122], [3310.4343, 678.9152], [2774.6726, 1696.0501], [114.1528, 918.0219]] },
  { id: "space-black-1", name: "Space Black · Angled", folder: "space-black/device-1", width: 4837, height: 3214, quad: [[1545.8516, 47.6717], [3541.1059, 1182.4934], [2304.1418, 2819.0668], [376.7317, 1509.1804]] },
  { id: "space-black-2", name: "Space Black · Flat", folder: "space-black/device-2", width: 3459, height: 1846, quad: [[934.2794, 40.6122], [3310.4343, 678.9152], [2774.6726, 1696.0501], [114.1528, 918.0219]] },
];

export const PSD_IPAD_PRO_SCENES: Device[] = IPADS.map((ipad) => {
  const left = Math.min(...ipad.quad.map(([x]) => x));
  const top = Math.min(...ipad.quad.map(([, y]) => y));
  const right = Math.max(...ipad.quad.map(([x]) => x));
  const bottom = Math.max(...ipad.quad.map(([, y]) => y));
  const base = `${ROOT}/${ipad.folder}`;
  return {
    id: `ipad-pro-2024-psd-${ipad.id}`,
    name: `iPad Pro (2024) · ${ipad.name}`,
    brand: "apple",
    category: "tablet",
    released: "2026-07",
    screen: { width: 2752, height: 2064, cornerRadius: 0 },
    frame: {
      width: ipad.width,
      height: ipad.height,
      screenRect: { x: left, y: top, width: right - left, height: bottom - top },
      maskPath: "",
      overlaySelector: "#foreground",
    },
    variants: [{ id: "default", label: "PSD template", body: "", overlay: "", preview: "" }],
    aliases: ["ipad pro 2024 realistic mockup", "ipad pro psd", "ipad mockup"],
    seo: { monthlyQueries: ["ipad pro 2024 mockup", "ipad mockup"] },
    plate: {
      src: `${base}/device-base.png`,
      width: ipad.width,
      height: ipad.height,
      screenRect: { x: left, y: top, width: right - left, height: bottom - top },
      screenQuad: ipad.quad,
      screenRadius: 0,
      screenMask: `${base}/screen-mask.png`,
      mode: "hole",
      bezelMask: false,
    },
  };
});
