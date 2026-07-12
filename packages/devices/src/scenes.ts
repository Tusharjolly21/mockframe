import type { Device } from "./types";

/**
 * Photo-scene mockups (category === "scene"): photorealistic device renders
 * where the screenshot is composited BEHIND a raster foreground plate that
 * carries the real frame, hand/occlusion and shadows (shots.so / ls.graphics
 * parity). Unlike the parametric-SVG frames, these come from layered PSDs —
 * the plate PNG + screenRect are extracted by scenes-src/extract-scene.py,
 * with the photo background removed and cropped to the device so it fills the
 * frame at any aspect ratio. The renderer branches on `device.plate`.
 *
 * Grouped for the /templates gallery via SCENE_TEMPLATES (screenTemplates.ts).
 */
export const SCENE_DEVICES: Device[] = [
  {
    id: "ipad-floating",
    name: "iPad · Floating",
    brand: "apple",
    category: "scene",
    released: "2022-10",
    screen: { width: 1451, height: 2073, cornerRadius: 40 },
    frame: {
      width: 2000,
      height: 2704,
      screenRect: { x: 178, y: 182, width: 1641, height: 2345 },
      maskPath: "",
      overlaySelector: "#overlay",
    },
    variants: [{ id: "space-gray", label: "Space Gray", body: "", overlay: "", preview: "" }],
    aliases: ["ipad mockup", "ipad pro mockup"],
    seo: { monthlyQueries: ["ipad mockup", "ipad pro mockup"] },
    plate: {
      src: "/scenes/ipad-floating/plate.png",
      width: 2000,
      height: 2704,
      screenRect: { x: 178, y: 182, width: 1641, height: 2345 },
      screenRadius: 18,
    },
  },
  {
    id: "ipad-angle",
    name: "iPad · Angled",
    brand: "apple",
    category: "scene",
    released: "2022-10",
    screen: { width: 1451, height: 2073, cornerRadius: 40 },
    frame: { width: 2000, height: 1451, screenRect: { x: 101, y: 76, width: 1795, height: 1260 }, maskPath: "", overlaySelector: "#overlay" },
    variants: [{ id: "space-gray", label: "Space Gray", body: "", overlay: "", preview: "" }],
    aliases: ["ipad perspective mockup", "angled ipad mockup"],
    seo: { monthlyQueries: ["ipad perspective mockup"] },
    plate: {
      src: "/scenes/ipad-angle/plate.png",
      width: 2000,
      height: 1451,
      screenRect: { x: 101, y: 76, width: 1795, height: 1260 },
      screenQuad: [[101, 518], [896, 76], [1896, 821], [1093, 1336]],
      screenRadius: 10,
    },
  },
  {
    id: "ipad-duo",
    name: "iPad · Front & Back",
    brand: "apple",
    category: "scene",
    released: "2022-10",
    screen: { width: 1451, height: 2073, cornerRadius: 40 },
    frame: { width: 2000, height: 1190, screenRect: { x: 79, y: 95, width: 1203, height: 1003 }, maskPath: "", overlaySelector: "#overlay" },
    variants: [{ id: "space-gray", label: "Space Gray", body: "", overlay: "", preview: "" }],
    aliases: ["ipad front and back mockup", "two ipad mockup"],
    seo: { monthlyQueries: ["ipad front back mockup"] },
    plate: {
      src: "/scenes/ipad-duo/plate.png",
      width: 2000,
      height: 1190,
      screenRect: { x: 79, y: 95, width: 1203, height: 1003 },
      screenQuad: [[79, 400], [704, 95], [1282, 756], [646, 1098]],
      screenRadius: 8,
      bezelMask: true,
    },
  },
  {
    id: "ipad-tilt",
    name: "iPad · Tilted",
    brand: "apple",
    category: "scene",
    released: "2022-10",
    screen: { width: 1451, height: 2073, cornerRadius: 40 },
    frame: { width: 2000, height: 1753, screenRect: { x: 101, y: 87, width: 1804, height: 1549 }, maskPath: "", overlaySelector: "#overlay" },
    variants: [{ id: "space-gray", label: "Space Gray", body: "", overlay: "", preview: "" }],
    aliases: ["ipad tilted mockup", "floating angled ipad"],
    seo: { monthlyQueries: ["ipad tilted mockup"] },
    plate: {
      src: "/scenes/ipad-tilt/plate.png",
      width: 2000,
      height: 1753,
      screenRect: { x: 101, y: 87, width: 1804, height: 1549 },
      screenQuad: [[101, 618], [913, 87], [1905, 1040], [1077, 1636]],
      screenRadius: 10,
    },
  },

  /* ------------------------------- iPhones -------------------------------- */

  /* ------------------------------ MacBooks -------------------------------- */
  {
    id: "macbook-pro-16-mockup",
    name: "MacBook Pro 16″",
    brand: "apple",
    category: "scene",
    released: "2023-10",
    screen: { width: 3456, height: 2234, cornerRadius: 40 },
    frame: { width: 2000, height: 1199, screenRect: { x: 252, y: 73, width: 1496, height: 953 }, maskPath: "", overlaySelector: "#overlay" },
    variants: [{ id: "space-gray", label: "Space Gray", body: "", overlay: "", preview: "" }],
    aliases: ["macbook pro 16 mockup", "macbook mockup"],
    seo: { monthlyQueries: ["macbook pro mockup", "macbook mockup"] },
    plate: {
      src: "/scenes/macbook-pro-16/plate.png",
      width: 2000,
      height: 1199,
      screenRect: { x: 252, y: 73, width: 1496, height: 953 },
      screenQuad: [[266, 79], [1734, 79], [1739, 1021], [261, 1020]],
      screenRadius: 6,
    },
  },

];
