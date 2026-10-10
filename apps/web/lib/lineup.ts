import { getDevice, type Device, type DeviceCategory } from "@framekit/devices";
import type { Layer, MockupLayer, SceneDocument } from "@framekit/scene";

/**
 * Several devices on one canvas, and keeping a composition fitted when the
 * canvas changes shape. Pure: sizes come from the device registry and a
 * `sizeOf` lookup for screenshots, so the rules are tested in one place.
 */

export type SizeOf = (assetId: string) => { width: number; height: number } | undefined;

/** Rough real-world size of each kind of screen (its long side, mm), so an iPhone sits next to a MacBook at a believable size. */
const SCREEN_MM: Record<DeviceCategory, number> = {
  phone: 150,
  tablet: 255,
  laptop: 300,
  desktop: 540,
  watch: 42,
  browser: 320,
  scene: 300,
};

/** small devices are drawn a little larger than life, or a watch beside an iMac is a dot */
const MIN_SHARE: Partial<Record<DeviceCategory, number>> = { watch: 0.34, phone: 0.56, tablet: 0.68 };

/** A photo plate fills the canvas (a desk, a hand): it is a backdrop, not a device to arrange. */
export function isPlateLayer(layer: Layer): boolean {
  if (layer.type !== "mockup" || !layer.deviceId) return false;
  const d = getDevice(layer.deviceId);
  return !!d && (d.category === "scene" || !!d.plate?.fullBleed);
}

/** The layer's own size before its transform, in px. */
export function layerSize(layer: MockupLayer, sizeOf: SizeOf): { w: number; h: number } | null {
  if (layer.deviceId) {
    const d = getDevice(layer.deviceId);
    if (!d) return null;
    const turned = layer.orientation === "landscape" && d.frame.height > d.frame.width;
    return turned ? { w: d.frame.height, h: d.frame.width } : { w: d.frame.width, h: d.frame.height };
  }
  const a = layer.media ? sizeOf(layer.media.assetId) : undefined;
  if (!a?.width || !a?.height) return null;
  const c = layer.media?.crop ?? { x: 0, y: 0, w: 1, h: 1 };
  return { w: a.width * c.w, h: a.height * c.h };
}

function categoryOf(layer: MockupLayer, size: { w: number; h: number }): DeviceCategory {
  const d = layer.deviceId ? getDevice(layer.deviceId) : undefined;
  if (d) return d.category;
  return size.w > size.h * 1.15 ? "browser" : "phone";
}

/** mm per layer px, so different devices share one real-world scale */
export function mmPerPx(layer: MockupLayer, sizeOf: SizeOf): number {
  const size = layerSize(layer, sizeOf);
  if (!size) return 0;
  const d: Device | undefined = layer.deviceId ? getDevice(layer.deviceId) : undefined;
  const cat = categoryOf(layer, size);
  const screenLong = d ? Math.max(d.screen.width, d.screen.height) : Math.max(size.w, size.h);
  return SCREEN_MM[cat] / Math.max(1, screenLong);
}

/** Canvas scale for `next` so it keeps the real-world scale `prev` is drawn at. */
export function matchPhysicalScale(prev: MockupLayer, next: MockupLayer, sizeOf: SizeOf): number {
  const a = mmPerPx(prev, sizeOf);
  const b = mmPerPx(next, sizeOf);
  if (!a || !b) return prev.transform.scale;
  return Math.round(((prev.transform.scale / a) * b) * 10000) / 10000;
}

interface Item {
  layer: MockupLayer;
  size: { w: number; h: number };
  /** drawn size in mm, after the small-device boost */
  w: number;
  h: number;
  x: number; // centre
  bottom: number;
}

/**
 * Arrange every device (not photo plates, not text) as a lineup: the largest
 * in the middle, the others alternating right and left, overlapping it a
 * little and standing slightly in front, all at one believable scale and
 * fitted to the canvas with a margin. Straightens tilts so the row reads
 * cleanly. Stacking follows size, smallest in front.
 */
export function arrangeLineup(scene: SceneDocument, sizeOf: SizeOf, opts: { margin?: number } = {}): SceneDocument {
  const items: Item[] = [];
  for (const l of scene.layers) {
    if (l.type !== "mockup" || isPlateLayer(l) || l.id.startsWith("lift-")) continue;
    const size = layerSize(l, sizeOf);
    const k = mmPerPx(l, sizeOf);
    if (!size || !k) continue;
    items.push({ layer: l, size, w: size.w * k, h: size.h * k, x: 0, bottom: 0 });
  }
  if (items.length < 2) return items.length === 1 ? fitLayers(scene, [items[0].layer.id], sizeOf, opts.margin) : scene;

  items.sort((a, b) => b.w * b.h - a.w * a.h);
  const hero = items[0];
  for (const it of items.slice(1)) {
    const share = MIN_SHARE[categoryOf(it.layer, it.size)] ?? 0;
    if (it.h < hero.h * share) {
      const boost = (hero.h * share) / it.h;
      it.w *= boost;
      it.h *= boost;
    }
  }

  // hero centred; then right, left, right… each tucked against the row so far
  let right = hero.w / 2;
  let left = -hero.w / 2;
  items.forEach((it, i) => {
    if (i === 0) return;
    const similar = it.h > hero.h * 0.85;
    // similar sizes sit side by side with a gap, smaller ones overlap the edge
    const tuck = similar ? -hero.w * 0.06 : it.w * 0.4;
    const onRight = i % 2 === 1;
    if (onRight) {
      it.x = right - tuck + it.w / 2;
      right = it.x + it.w / 2;
    } else {
      it.x = left + tuck - it.w / 2;
      left = it.x - it.w / 2;
    }
    // stand a touch in front of the hero
    it.bottom = similar ? 0 : hero.h * 0.04 * Math.ceil(i / 2);
  });

  const minX = Math.min(...items.map((it) => it.x - it.w / 2));
  const maxX = Math.max(...items.map((it) => it.x + it.w / 2));
  const minY = Math.min(...items.map((it) => it.bottom - it.h));
  const maxY = Math.max(...items.map((it) => it.bottom));
  const bw = maxX - minX;
  const bh = maxY - minY;
  const { width: W, height: H } = scene.canvas;
  const margin = opts.margin ?? 0.09;
  const k = Math.min((W * (1 - margin * 2)) / bw, (H * (1 - margin * 2)) / bh);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  const placed = new Map<string, MockupLayer>();
  for (const it of items) {
    const drawnH = it.h * k;
    placed.set(it.layer.id, {
      ...it.layer,
      transform: {
        ...it.layer.transform,
        x: Math.round((it.x - cx) * k),
        y: Math.round((it.bottom - it.h / 2 - cy) * k),
        scale: Math.round((drawnH / it.size.h) * 10000) / 10000,
        rotate: 0,
        tiltX: 0,
        tiltY: 0,
      },
    });
  }

  // restack: devices take the slots they already had, biggest at the back
  const order = items.map((it) => placed.get(it.layer.id)!);
  let next = 0;
  const layers = scene.layers.map((l) => (placed.has(l.id) ? order[next++] : l));
  return { ...scene, layers: layers.map((l) => followSource(l, items, placed)) };
}

/** A card lifted out of a device's screen moves and scales with that device. */
function followSource(layer: Layer, items: Item[], placed: Map<string, MockupLayer>): Layer {
  if (layer.type !== "mockup" || !layer.id.startsWith("lift-") || !layer.media) return layer;
  const src = items.find((it) => it.layer.media?.assetId === layer.media!.assetId);
  const now = src && placed.get(src.layer.id);
  if (!src || !now) return layer;
  const was = src.layer.transform;
  const r = now.transform.scale / was.scale;
  return {
    ...layer,
    transform: {
      ...layer.transform,
      x: Math.round(now.transform.x + (layer.transform.x - was.x) * r),
      y: Math.round(now.transform.y + (layer.transform.y - was.y) * r),
      scale: round4(layer.transform.scale * r),
      rotate: layer.transform.rotate - was.rotate,
    },
  };
}

/* ---------------------------------- boxes ---------------------------------- */

export interface Box {
  l: number;
  t: number;
  r: number;
  b: number;
}

/** Axis-aligned box of a layer in canvas px, estimated from its size and transform. */
export function estimateBox(layer: Layer, canvas: { width: number; height: number }, sizeOf: SizeOf): Box | null {
  let w = 0;
  let h = 0;
  if (layer.type === "mockup") {
    const s = layerSize(layer, sizeOf);
    if (!s) return null;
    w = s.w;
    h = s.h;
  } else if (layer.type === "text") {
    const size = layer.font.size;
    const lines = layer.content.split("\n");
    const longest = Math.max(...lines.map((l) => l.length), 1);
    w = layer.maxWidth ?? Math.min(longest * size * 0.55, canvas.width);
    h = size * 1.2 * Math.max(lines.length, Math.ceil((longest * size * 0.55) / w));
  } else {
    const sz = "size" in layer && layer.size ? layer.size : { width: 200, height: 200 };
    w = sz.width;
    h = sz.height;
  }
  const t = layer.transform;
  const rad = (t.rotate * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const bw = (w * cos + h * sin) * t.scale;
  const bh = (w * sin + h * cos) * t.scale;
  const cx = canvas.width / 2 + t.x;
  const cy = canvas.height / 2 + t.y;
  return { l: cx - bw / 2, t: cy - bh / 2, r: cx + bw / 2, b: cy + bh / 2 };
}

/** Scale and centre the given layers as one group so they fill the canvas with a margin. */
export function fitLayers(scene: SceneDocument, ids: string[], sizeOf: SizeOf, margin = 0.09): SceneDocument {
  const set = new Set(ids);
  const boxes = scene.layers.filter((l) => set.has(l.id)).map((l) => estimateBox(l, scene.canvas, sizeOf)).filter((b): b is Box => !!b);
  if (!boxes.length) return scene;
  const u = union(boxes);
  const { width: W, height: H } = scene.canvas;
  const k = Math.min((W * (1 - margin * 2)) / (u.r - u.l), (H * (1 - margin * 2)) / (u.b - u.t));
  const cx = (u.l + u.r) / 2 - W / 2;
  const cy = (u.t + u.b) / 2 - H / 2;
  return {
    ...scene,
    layers: scene.layers.map((l) =>
      set.has(l.id)
        ? ({ ...l, transform: { ...l.transform, x: Math.round((l.transform.x - cx) * k), y: Math.round((l.transform.y - cy) * k), scale: round4(l.transform.scale * k) } } as Layer)
        : l
    ),
  };
}

const round4 = (v: number) => Math.round(v * 10000) / 10000;

function union(boxes: Box[]): Box {
  return {
    l: Math.min(...boxes.map((b) => b.l)),
    t: Math.min(...boxes.map((b) => b.t)),
    r: Math.max(...boxes.map((b) => b.r)),
    b: Math.max(...boxes.map((b) => b.b)),
  };
}

/* ---------------------------------- refit ---------------------------------- */

/**
 * Give the canvas a new size and keep the composition fitted: the content
 * keeps the share of the canvas it filled before on its tightest side, so a
 * phone that filled 78% of a portrait canvas fills 78% of the height of a
 * landscape one, never spilling past the edge or shrinking to a speck. A
 * full-bleed photo scene instead scales to cover the new canvas. `boxes` are
 * the layers' rendered boxes when the editor can measure them; otherwise
 * they are estimated.
 */
export function resizeCanvas(scene: SceneDocument, width: number, height: number, sizeOf: SizeOf, boxes?: Map<string, Box>): SceneDocument {
  const W0 = scene.canvas.width;
  const H0 = scene.canvas.height;
  const W1 = Math.max(64, Math.min(8192, Math.round(width) || 64));
  const H1 = Math.max(64, Math.min(8192, Math.round(height) || 64));
  const sized = { ...scene, canvas: { ...scene.canvas, width: W1, height: H1 } };
  if ((W0 === W1 && H0 === H1) || !scene.layers.length) return sized;

  const scaleAll = (k: number, ox = 0, oy = 0): SceneDocument => ({
    ...sized,
    layers: scene.layers.map((l) => ({ ...l, transform: { ...l.transform, x: Math.round(l.transform.x * k + ox), y: Math.round(l.transform.y * k + oy), scale: round4(l.transform.scale * k) } }) as Layer),
  });

  // a photo plate is the background: cover the new canvas with it
  if (scene.layers.some((l) => l.type === "mockup" && isPlateLayer(l) && getDevice(l.deviceId!)?.plate?.fullBleed)) {
    return scaleAll(Math.max(W1 / W0, H1 / H0));
  }

  const list = scene.layers
    .map((l) => boxes?.get(l.id) ?? estimateBox(l, scene.canvas, sizeOf))
    .filter((b): b is Box => !!b);
  if (!list.length) return scaleAll(Math.min(W1 / W0, H1 / H0));
  const u = union(list);
  const bw = Math.max(1, u.r - u.l);
  const bh = Math.max(1, u.b - u.t);
  // how full the old canvas was on its tightest side, kept within sane bounds
  const fill = Math.min(0.94, Math.max(0.42, Math.max(bw / W0, bh / H0)));
  const k = fill * Math.min(W1 / bw, H1 / bh);

  // keep the group's off-centre position in proportion, but never past the edge
  const gx = (u.l + u.r) / 2 - W0 / 2;
  const gy = (u.t + u.b) / 2 - H0 / 2;
  const maxX = Math.max(0, (W1 - bw * k) / 2);
  const maxY = Math.max(0, (H1 - bh * k) / 2);
  const nx = Math.max(-maxX, Math.min(maxX, gx * k));
  const ny = Math.max(-maxY, Math.min(maxY, gy * k));
  return scaleAll(k, nx - gx * k, ny - gy * k);
}

/** Popular picks for "Add a device", one per kind. */
export const QUICK_DEVICES: { id: string; label: string; category: DeviceCategory }[] = [
  { id: "iphone-17-pro", label: "iPhone", category: "phone" },
  { id: "pixel-10-pro", label: "Android", category: "phone" },
  { id: "ipad-pro-13", label: "iPad", category: "tablet" },
  { id: "macbook-pro-14", label: "MacBook", category: "laptop" },
  { id: "macbook-air-15", label: "Air", category: "laptop" },
  { id: "chrome-browser", label: "Browser", category: "browser" },
];
