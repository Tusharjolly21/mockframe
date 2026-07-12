export type DeviceCategory = "phone" | "tablet" | "laptop" | "desktop" | "watch" | "browser" | "scene";

export interface ScreenSpec {
  width: number;
  height: number;
  cornerRadius: number;
}

export interface FrameSpec {
  width: number;
  height: number;
  screenRect: { x: number; y: number; width: number; height: number };
  maskPath: string;
  overlaySelector: string;
}

export interface DeviceVariant {
  id: string;
  label: string;
  /** SVG fragment drawn below the screenshot */
  body: string;
  /** SVG fragment drawn on top of the screenshot (island, punch-hole, notch, toolbar buttons) */
  overlay: string;
  /** full standalone SVG (with a placeholder screen) for device pickers */
  preview: string;
}

/**
 * A photorealistic "photo scene" mockup (category === "scene"): a raster
 * foreground plate (hand / desk / pocket photo) with a transparent screen hole.
 * The screenshot is drawn BEHIND the plate at `screenRect`; the plate's own
 * alpha provides frame edges, occlusion (fingers over the screen) and shadows.
 * Extracted from a layered PSD — see packages/devices/scenes-src/.
 */
export interface RasterPlate {
  /** URL of the foreground PNG (opaque everywhere except the screen hole) */
  src: string;
  /** natural pixel size of the plate image (SVG viewBox) */
  width: number;
  height: number;
  /** where the screenshot sits, in plate px (behind the plate) */
  screenRect: { x: number; y: number; width: number; height: number };
  /**
   * Perspective screen corners in plate px [TL, TR, BR, BL], for ANGLED scenes.
   * When present the screenshot is warped onto this quad (CSS matrix3d); when
   * absent the axis-aligned `screenRect` is used.
   */
  screenQuad?: [[number, number], [number, number], [number, number], [number, number]];
  /** corner radius (plate px) used to clip the screenshot; the plate hole does the final masking */
  screenRadius?: number;
  /** Optional raster mask in plate coordinates for irregular or rounded PSD screens. */
  screenMask?: string;
  /**
   * Compositing mode. "hole" (default): the plate is a foreground PNG with a
   * transparent screen hole — the screenshot renders BEHIND it (occlusion, e.g.
   * a thumb over the screen, comes for free). "under": the plate is an ORDINARY
   * OPAQUE PHOTO (user-calibrated custom mockup) — the screenshot renders ON TOP,
   * clipped to the quad, since there is no hole to show through.
   */
  mode?: "hole" | "under";
  /**
   * True for "bodied" plates: an opaque device body surrounds the screen hole
   * (watch, MacBook, iPad-duo, hand). The screenshot is rendered with SQUARE
   * corners and a generous outset so it fills the full glass corner-to-corner;
   * the opaque body masks the overshoot precisely. Without this, a rounded
   * clip box can't match the hole's real corners → thin canvas/glass wedges.
   * Leave false/undefined for FRAME-EDGE plates (thin outline only, no body to
   * mask overshoot) — those keep the exact rounded-rect clip.
   */
  bezelMask?: boolean;
}

export interface Device {
  id: string;
  name: string;
  brand: string;
  category: DeviceCategory;
  released: string;
  screen: ScreenSpec;
  frame: FrameSpec;
  variants: DeviceVariant[];
  aliases: string[];
  seo?: { monthlyQueries: string[] };
  urlBarText?: string;
  /** wallpaper hues for empty-screen placeholders [base, deep, glow] */
  wallpaper?: string[];
  /** present only for category === "scene": raster photo-scene plate */
  plate?: RasterPlate;
}
