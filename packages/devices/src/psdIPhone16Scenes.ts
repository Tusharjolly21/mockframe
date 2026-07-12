import type { Device } from "./types";

type Quad = [[number, number], [number, number], [number, number], [number, number]];

const ROOT = "/psd-templates/iphone-16-pro";

const IPHONES: Array<{
  id: string;
  name: string;
  folder: string;
  width: number;
  height: number;
  quad: Quad;
}> = [
  { id: "desert-1", name: "Desert Titanium · Front", folder: "desert-titanium/1", width: 1299, height: 3086, quad: [[29.4781, 95.7618], [1183.2567, 31.2486], [1183.2181, 3049.3741], [29.4395, 3008.2591]] },
  { id: "desert-2", name: "Desert Titanium · Leaning", folder: "desert-titanium/2", width: 1300, height: 3086, quad: [[117.3346, 38.1131], [1271.1119, 75.224], [1270.9846, 2991.4591], [117.2047, 3051.6054]] },
  { id: "natural-1", name: "Natural Titanium · Front", folder: "natural-titanium/1", width: 1299, height: 3086, quad: [[29.4781, 95.7618], [1183.2567, 31.2486], [1183.2181, 3049.3741], [29.4395, 3008.2591]] },
  { id: "natural-2", name: "Natural Titanium · Leaning", folder: "natural-titanium/2", width: 1300, height: 3086, quad: [[117.3346, 38.1131], [1271.1119, 75.224], [1270.9846, 2991.4591], [117.2047, 3051.6054]] },
  { id: "white-1", name: "White Titanium · Front", folder: "white-titanium/1", width: 1299, height: 3086, quad: [[29.4781, 95.7618], [1183.2567, 31.2486], [1183.2181, 3049.3741], [29.4395, 3008.2591]] },
  { id: "white-2", name: "White Titanium · Leaning", folder: "white-titanium/2", width: 1300, height: 3086, quad: [[117.3346, 38.1131], [1271.1119, 75.224], [1270.9846, 2991.4591], [117.2047, 3051.6054]] },
  { id: "black-1", name: "Black Titanium · Front", folder: "black-titanium/1", width: 1299, height: 3086, quad: [[29.4781, 95.7618], [1183.2567, 31.2486], [1183.2181, 3049.3741], [29.4395, 3008.2591]] },
  { id: "black-2", name: "Black Titanium · Leaning", folder: "black-titanium/2", width: 1298, height: 3086, quad: [[116.3346, 38.1131], [1270.1119, 75.224], [1269.9846, 2991.4591], [116.2047, 3051.6054]] },
];

export const PSD_IPHONE16_SCENES: Device[] = IPHONES.map((phone) => {
  const left = Math.min(...phone.quad.map(([x]) => x));
  const top = Math.min(...phone.quad.map(([, y]) => y));
  const right = Math.max(...phone.quad.map(([x]) => x));
  const bottom = Math.max(...phone.quad.map(([, y]) => y));
  const base = `${ROOT}/${phone.folder}`;
  return {
    id: `iphone-16-pro-psd-${phone.id}`,
    name: `iPhone 16 Pro · ${phone.name}`,
    brand: "apple",
    category: "phone",
    released: "2026-07",
    screen: { width: 1206, height: 2622, cornerRadius: 0 },
    frame: {
      width: phone.width,
      height: phone.height,
      screenRect: { x: left, y: top, width: right - left, height: bottom - top },
      maskPath: "",
      overlaySelector: "#foreground",
    },
    variants: [{ id: "default", label: "PSD template", body: "", overlay: "", preview: "" }],
    aliases: ["iphone 16 pro realistic mockup", "iphone 16 pro psd", "iphone mockup"],
    seo: { monthlyQueries: ["iphone 16 pro mockup", "iphone mockup"] },
    plate: {
      src: `${base}/device-base.png`,
      width: phone.width,
      height: phone.height,
      screenRect: { x: left, y: top, width: right - left, height: bottom - top },
      screenQuad: phone.quad,
      screenRadius: 0,
      screenMask: `${base}/screen-mask.png`,
      mode: "hole",
      bezelMask: false,
    },
  };
});
