"use client";

import type { Layer, MockupLayer } from "@framekit/scene";
import { isLandscape, mediaCrop } from "@framekit/renderer";
import { getDevice } from "@framekit/devices";
import { resolveAsset } from "./assets";
import { sceneTemporal, useSceneStore, useViewStore } from "./store";

/**
 * On-canvas screenshot adjusting: pan + freehand zoom inside a device screen,
 * and non-destructive cropping of frameless screenshots. The overlay calls these
 * pure helpers; they never touch the renderer, so exports stay WYSIWYG.
 */

export type Crop = { x: number; y: number; w: number; h: number };

export const MIN_CROP = 0.04;
export const MEDIA_SCALE_MIN = 0.1;
export const MEDIA_SCALE_MAX = 10;

const round = (v: number, p = 1000) => Math.round(v * p) / p;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** rotate a layer-local vector into canvas space (layer scale + rotation) */
export function localToCanvas(layer: Layer, dx: number, dy: number): [number, number] {
  const r = (layer.transform.rotate * Math.PI) / 180;
  const s = layer.transform.scale;
  return [s * (Math.cos(r) * dx - Math.sin(r) * dy), s * (Math.sin(r) * dx + Math.cos(r) * dy)];
}

/** client (screen px) delta → layer-local delta (undo canvas zoom, layer scale + rotation) */
export function clientToLocal(layer: Layer, zoom: number, dx: number, dy: number): [number, number] {
  const s = zoom * layer.transform.scale || 1;
  const r = (-layer.transform.rotate * Math.PI) / 180;
  const px = dx / s;
  const py = dy / s;
  return [px * Math.cos(r) - py * Math.sin(r), px * Math.sin(r) + py * Math.cos(r)];
}

/**
 * Set a frameless screenshot's crop while keeping the pixels that stay visible
 * exactly where they were on the canvas: the layer box is the crop window, so
 * when the window's centre moves inside the image the layer moves with it.
 */
export function withCrop(layer: MockupLayer, next: Crop, W: number, H: number): MockupLayer {
  if (!layer.media) return layer;
  const c0 = mediaCrop(layer.media);
  const dcx = (next.x + next.w / 2 - (c0.x + c0.w / 2)) * W;
  const dcy = (next.y + next.h / 2 - (c0.y + c0.h / 2)) * H;
  const [sx, sy] = localToCanvas(layer, dcx, dcy);
  const full = next.x <= 0.0005 && next.y <= 0.0005 && next.w >= 0.9995 && next.h >= 0.9995;
  return {
    ...layer,
    media: {
      ...layer.media,
      crop: full ? undefined : { x: round(next.x, 1e4), y: round(next.y, 1e4), w: round(next.w, 1e4), h: round(next.h, 1e4) },
    },
    transform: { ...layer.transform, x: round(layer.transform.x + sx, 100), y: round(layer.transform.y + sy, 100) },
  };
}

export type CropHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

/** drag one crop edge/corner by a fraction of the image (fx, fy) */
export function dragCrop(c0: Crop, handle: CropHandle, fx: number, fy: number, aspect?: number, imgAspect = 1): Crop {
  let { x, y, w, h } = c0;
  const r = c0.x + c0.w;
  const b = c0.y + c0.h;
  if (handle.includes("w")) {
    x = clamp(c0.x + fx, 0, r - MIN_CROP);
    w = r - x;
  }
  if (handle.includes("e")) w = clamp(c0.w + fx, MIN_CROP, 1 - c0.x);
  if (handle.includes("n")) {
    y = clamp(c0.y + fy, 0, b - MIN_CROP);
    h = b - y;
  }
  if (handle.includes("s")) h = clamp(c0.h + fy, MIN_CROP, 1 - c0.y);
  if (aspect && handle.length === 2) {
    // locked ratio (in pixels): follow the larger change, anchor the opposite corner
    const toH = (ww: number) => (ww * imgAspect) / aspect; // fraction h for fraction w
    const toW = (hh: number) => (hh * aspect) / imgAspect;
    if (Math.abs(w - c0.w) * imgAspect >= Math.abs(h - c0.h)) h = toH(w);
    else w = toW(h);
    const maxW = handle.includes("w") ? r : 1 - c0.x;
    const maxH = handle.includes("n") ? b : 1 - c0.y;
    if (w > maxW) {
      w = maxW;
      h = toH(w);
    }
    if (h > maxH) {
      h = maxH;
      w = toW(h);
    }
    if (handle.includes("w")) x = r - w;
    if (handle.includes("n")) y = b - h;
  }
  return { x, y, w, h };
}

/** largest crop of the given pixel aspect inside the image, centred on `around` */
export function cropForAspect(aspect: number | null, W: number, H: number, around: Crop): Crop {
  if (!aspect) return { x: 0, y: 0, w: 1, h: 1 };
  let w = 1;
  let h = (W / aspect) / H;
  if (h > 1) {
    h = 1;
    w = (H * aspect) / W;
  }
  const cx = around.x + around.w / 2;
  const cy = around.y + around.h / 2;
  return { x: clamp(cx - w / 2, 0, 1 - w), y: clamp(cy - h / 2, 0, 1 - h), w, h };
}

/** zoom a frameless crop window in/out about its centre (k > 1 zooms in) */
export function zoomCrop(c0: Crop, k: number): { crop: Crop; k: number } {
  const kk = clamp(k, Math.max(c0.w, c0.h), Math.min(c0.w, c0.h) / MIN_CROP);
  const w = c0.w / kk;
  const h = c0.h / kk;
  const cx = c0.x + c0.w / 2;
  const cy = c0.y + c0.h / 2;
  return { crop: { x: clamp(cx - w / 2, 0, 1 - w), y: clamp(cy - h / 2, 0, 1 - h), w, h }, k: kk };
}

/* --------------------------- one undo step per gesture --------------------------- */

let session: { id: string; original: Layer } | null = null;

/** start a live gesture: later `liveUpdate`s are NOT recorded until `endGesture` */
export function beginGesture(id: string) {
  if (session) return;
  const original = useSceneStore.getState().scene.layers.find((l) => l.id === id);
  if (!original) return;
  session = { id, original };
  sceneTemporal.getState().pause();
}

export function liveUpdate(id: string, fn: (l: MockupLayer) => MockupLayer) {
  useSceneStore.getState().updateLayer(id, (l) => (l.type === "mockup" ? fn(l) : l));
}

/** commit the gesture as a single history entry (restore → resume → apply final) */
export function endGesture() {
  const s = session;
  session = null;
  if (!s) return;
  const final = useSceneStore.getState().scene.layers.find((l) => l.id === s.id);
  const store = useSceneStore.getState();
  if (final && final !== s.original) store.updateLayer(s.id, () => s.original);
  sceneTemporal.getState().resume();
  if (final && final !== s.original) store.updateLayer(s.id, () => final);
}

/* --------------------------------- enter / exit -------------------------------- */

/** can this layer be adjusted on the canvas? (needs a screenshot; baked renders can't) */
export function canAdjust(layer: Layer | undefined): layer is MockupLayer {
  return !!layer && layer.type === "mockup" && !!layer.media && !layer.render && !!resolveAsset(layer.media.assetId) && !landscapeDevice(layer);
}

/** On-canvas adjusting isn't rotation-aware yet; landscape devices use the panel's Fill/Fit and zoom. */
function landscapeDevice(layer: MockupLayer): boolean {
  const device = layer.deviceId ? getDevice(layer.deviceId) : undefined;
  return !!device && isLandscape(layer, device);
}

export function enterAdjust(id: string) {
  const layer = useSceneStore.getState().scene.layers.find((l) => l.id === id);
  if (!canAdjust(layer)) {
    const l = layer as Layer | undefined;
    if (l?.type === "mockup" && l.render) {
      window.dispatchEvent(new CustomEvent("framekit:toast", { detail: "Realistic renders are baked. Use Edit screenshot to change the source." }));
    } else if (l?.type === "mockup" && landscapeDevice(l)) {
      window.dispatchEvent(new CustomEvent("framekit:toast", { detail: "In landscape, use Fill / Fit and Zoom in the panel — on-canvas adjusting works in portrait." }));
    }
    return;
  }
  // Stretch ignores pan/zoom, so freehand adjusting starts from Fill
  if (layer.deviceId && layer.media!.fit === "fill") {
    useSceneStore.getState().updateLayer(id, (l) =>
      l.type === "mockup" && l.media ? { ...l, media: { ...l.media, fit: "cover", offsetX: 0, offsetY: 0, scale: 1 } } : l
    );
    window.dispatchEvent(new CustomEvent("framekit:toast", { detail: "Switched Stretch to Fill so you can move it freely" }));
  }
  useViewStore.getState().setThreeD(false);
  useViewStore.getState().setAdjustId(id);
}

export function exitAdjust() {
  endGesture();
  useViewStore.getState().setAdjustId(null);
}

export const clampMediaScale = (v: number) => round(clamp(v, MEDIA_SCALE_MIN, MEDIA_SCALE_MAX));
