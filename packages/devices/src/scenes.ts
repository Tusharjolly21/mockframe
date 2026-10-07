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
// The original iPad and MacBook Pro 16 plates were simplified, low-resolution
// extractions (the MacBook screen rendered at 0.43×). They were replaced by
// the calibrated PSD scenes; old ids resolve to those in index.ts, and new
// photo scenes go in the psd*Scenes.ts modules.
export const SCENE_DEVICES: Device[] = [];
