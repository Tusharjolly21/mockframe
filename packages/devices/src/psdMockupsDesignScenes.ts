import type { Device } from "./types";

type Quad = [[number, number], [number, number], [number, number], [number, number]];

/**
 * Full-bleed photo scenes extracted from layered PSD mockups by
 * tooling/psd-template/extract_mockups_design.py (mockups-design.com packs, plus
 * the mockupnest iPhone 18 Pro and Watch Ultra files). Each plate is the finished
 * photo (4000 × 3000, 4500 × 3000 or 3000 × 2250) with the screen cut out and the
 * glass glare kept on top, so the canvas is sized to the plate and the screenshot
 * is warped onto `quad`. A PSD with several screens (the three watches) becomes
 * one scene per screen.
 */
const ROOT = "/psd-templates/mockups-design";

const SCENES: Array<{
  id: string;
  name: string;
  category: "phone" | "laptop" | "watch";
  /** plate (photo) size in px */
  plate: [number, number];
  /** screenshot resolution the PSD smart object was built for */
  screen: [number, number];
  /** screen corners in plate px: TL, TR, BR, BL */
  quad: Quad;
}> = [
  { id: "iphone-17-1", name: "iPhone 17 · Front and back", category: "phone", plate: [4000, 3000], screen: [971, 2106], quad: [[1783.0, 473.0], [2754.0, 473.0], [2754.0, 2579.0], [1783.0, 2579.0]] },
  { id: "iphone-17-2", name: "iPhone 17 · Tilted", category: "phone", plate: [4000, 3000], screen: [971, 2106], quad: [[1139.321, 793.0], [1901.408, 557.0], [2981.859, 2136.0], [2210.789, 2452.0]] },
  { id: "iphone-17-3", name: "iPhone 17 · Side view", category: "phone", plate: [4000, 3000], screen: [971, 2106], quad: [[1719.5, 522.976], [2459.5, 459.005], [2460.0, 2469.0], [1721.5, 2623.5]] },
  { id: "iphone-17-4", name: "iPhone 17 · Front and back, angled", category: "phone", plate: [4000, 3000], screen: [971, 2106], quad: [[1967.0, 480.0], [2670.0, 480.0], [2668.0, 2490.0], [1967.0, 2583.0]] },
  { id: "iphone-17-5", name: "iPhone 17 · Straight on", category: "phone", plate: [4000, 3000], screen: [971, 2106], quad: [[1454.0, 369.0], [2525.654, 369.0], [2525.654, 2693.309], [1454.0, 2693.309]] },
  { id: "iphone-pro-1", name: "iPhone · On stone, diagonal", category: "phone", plate: [4000, 3000], screen: [948, 2049], quad: [[1108.0, 1085.0], [1815.0, 590.0], [3118.0, 1981.0], [2401.0, 2533.0]] },
  { id: "iphone-pro-2", name: "iPhone · On stone, angled", category: "phone", plate: [4000, 3000], screen: [948, 2049], quad: [[2389.84, 489.75], [3066.743, 1072.75], [1610.784, 2421.75], [934.852, 1774.75]] },
  { id: "iphone-pro-3", name: "iPhone · On stone, standing", category: "phone", plate: [4000, 3000], screen: [948, 2049], quad: [[1982.584, 387.935], [2884.706, 713.714], [2178.641, 2660.646], [1279.127, 2324.705]] },
  { id: "iphone-podium-1", name: "iPhone · On a podium, straight on", category: "phone", plate: [4000, 3000], screen: [1179, 2556], quad: [[1596.0, 519.0], [2371.0, 519.0], [2371.0, 2180.0], [1596.0, 2180.0]] },
  { id: "iphone-podium-2", name: "iPhone · On a podium, tilted", category: "phone", plate: [4000, 3000], screen: [1179, 2556], quad: [[2138.718, 568.0], [2799.784, 793.0], [2000.177, 2107.0], [1325.139, 1821.0]] },
  { id: "iphone-podium-3", name: "iPhone · On a podium, front and back", category: "phone", plate: [4000, 3000], screen: [1179, 2556], quad: [[1964.822, 679.487], [2754.992, 679.487], [2754.992, 2373.0], [1964.822, 2373.0]] },
  { id: "iphone-podium-4", name: "iPhone · On a podium, front and back, angled", category: "phone", plate: [4000, 3000], screen: [1179, 2556], quad: [[1799.83, 501.0], [2590.0, 501.0], [2590.0, 2194.513], [1799.83, 2194.513]] },
  { id: "iphone-podium-5", name: "iPhone · On a podium, from above", category: "phone", plate: [4000, 3000], screen: [1179, 2556], quad: [[1534.0, 425.617], [2400.63, 425.617], [2400.63, 2283.0], [1534.0, 2283.0]] },
  { id: "macbook-chair-1", name: "MacBook · On a wooden chair", category: "laptop", plate: [4000, 3000], screen: [2000, 1299], quad: [[1891.561, 624.0], [3517.739, 775.0], [3399.796, 1886.0], [1777.612, 1701.0]] },
  { id: "macbook-chair-2", name: "MacBook · Chair, low angle", category: "laptop", plate: [4000, 3000], screen: [2000, 1299], quad: [[820.861, 872.877], [2161.909, 652.728], [2396.422, 1698.594], [1067.7, 1989.357]] },
  { id: "macbook-chair-3", name: "MacBook · Chair, from above", category: "laptop", plate: [4000, 3000], screen: [2000, 1299], quad: [[1707.084, 355.634], [3277.769, 1016.379], [3009.845, 2076.405], [1500.146, 1392.154]] },
  { id: "macbook-pro-1", name: "MacBook Pro · Front", category: "laptop", plate: [3000, 2250], screen: [2881, 1801], quad: [[677.0, 448.0], [2318.0, 448.0], [2328.0, 1477.0], [668.0, 1477.0]] },
  { id: "macbook-pro-2", name: "MacBook Pro · Three-quarter", category: "laptop", plate: [3000, 2250], screen: [2881, 1801], quad: [[708.0, 742.0], [1653.0, 341.0], [1738.0, 1054.0], [841.0, 1503.0]] },
  { id: "macbook-pro-3", name: "MacBook Pro · Side view", category: "laptop", plate: [3000, 2250], screen: [2881, 1801], quad: [[559.0, 598.0], [1746.0, 716.0], [1866.0, 1624.0], [659.0, 1640.0]] },
  { id: "macbook-pro-4", name: "MacBook Pro · From above", category: "laptop", plate: [3000, 2250], screen: [2881, 1801], quad: [[1521.2, 323.0], [2244.8, 960.6], [2105.6, 1453.2], [1432.6, 821.0]] },
  { id: "watch-ultra-1", name: "Apple Watch Ultra · Orange band, side angle", category: "watch", plate: [4000, 3000], screen: [1250, 1502], quad: [[1191.991, 1036.0], [1803.01, 1036.0], [1797.506, 2079.942], [1181.994, 2042.058]] },
  { id: "watch-ultra-2", name: "Apple Watch Ultra · Orange band, straight on", category: "watch", plate: [4000, 3000], screen: [1250, 1502], quad: [[1560.0, 975.739], [2419.904, 975.739], [2419.904, 2009.0], [1560.0, 2009.0]] },
  { id: "watch-ultra-3", name: "Apple Watch Ultra · Orange band, tilted", category: "watch", plate: [4000, 3000], screen: [1250, 1502], quad: [[924.355, 1226.188], [1627.287, 814.984], [2040.793, 1864.984], [1315.863, 2241.691]] },
  { id: "watch-ultra-4", name: "Apple Watch Ultra · Orange band, turned", category: "watch", plate: [4000, 3000], screen: [1250, 1502], quad: [[2301.779, 950.933], [2947.866, 1460.534], [2360.778, 2435.095], [1679.574, 1952.163]] },
  { id: "watch-ultra-5", name: "Apple Watch Ultra · Orange band, from above", category: "watch", plate: [4000, 3000], screen: [1250, 1502], quad: [[1507.0, 933.0], [2491.0, 933.0], [2491.0, 2119.0], [1507.0, 2119.0]] },
  { id: "iphone-18-pro-side", name: "iPhone 18 Pro · Silver, side perspective", category: "phone", plate: [4500, 3000], screen: [1320, 2868], quad: [[2130.33, 506.196], [2993.651, 701.037], [3020.808, 2766.764], [2126.54, 2613.596]] },
  { id: "watch-ultra-clean-1", name: "Apple Watch Ultra · Three watches, left screen", category: "watch", plate: [4500, 3000], screen: [1266, 1542], quad: [[278.532, 1087.169], [915.521, 1060.36], [925.612, 2044.95], [287.725, 2052.21]] },
  { id: "watch-ultra-clean-2", name: "Apple Watch Ultra · Three watches, middle screen", category: "watch", plate: [4500, 3000], screen: [1266, 1542], quad: [[1805.923, 1019.808], [2642.522, 1009.787], [2655.066, 2036.365], [1817.493, 2046.22]] },
  { id: "watch-ultra-clean-3", name: "Apple Watch Ultra · Three watches, right screen", category: "watch", plate: [4500, 3000], screen: [1266, 1542], quad: [[3479.02, 1020.01], [4169.329, 1028.087], [4182.902, 2000.146], [3492.05, 2008.376]] },
];

export const PSD_MOCKUPS_DESIGN_SCENES: Device[] = SCENES.map((scene) => {
  const left = Math.min(...scene.quad.map(([x]) => x));
  const top = Math.min(...scene.quad.map(([, y]) => y));
  const right = Math.max(...scene.quad.map(([x]) => x));
  const bottom = Math.max(...scene.quad.map(([, y]) => y));
  const screenRect = { x: left, y: top, width: right - left, height: bottom - top };
  const base = `${ROOT}/${scene.id}`;
  const [pw, ph] = scene.plate;
  const laptop = scene.category === "laptop";
  const watch = scene.category === "watch";
  return {
    id: `psd-scene-${scene.id}`,
    name: scene.name,
    brand: "apple",
    category: scene.category,
    released: "2026-10",
    screen: { width: scene.screen[0], height: scene.screen[1], cornerRadius: 0 },
    frame: { width: pw, height: ph, screenRect, maskPath: "", overlaySelector: "#foreground" },
    variants: [{ id: "default", label: "Photo scene", body: "", overlay: "", preview: "" }],
    aliases: watch
      ? ["apple watch ultra mockup", "realistic apple watch scene", "smartwatch mockup"]
      : laptop
        ? ["macbook mockup", "realistic macbook scene", "laptop mockup"]
        : ["iphone mockup", "realistic iphone scene", "iphone photo mockup"],
    seo: { monthlyQueries: watch ? ["apple watch mockup", "apple watch ultra mockup"] : laptop ? ["macbook mockup", "laptop mockup"] : ["iphone mockup", "iphone 17 mockup"] },
    plate: {
      src: `${base}/plate.webp`,
      thumb: `${base}/thumb.webp`,
      width: pw,
      height: ph,
      screenRect,
      screenQuad: scene.quad,
      screenRadius: 0,
      screenMask: `${base}/screen-mask.png`,
      mode: "hole",
      bezelMask: false,
      fullBleed: true,
    },
  };
});
