import { getDevice } from "@framekit/devices";
import { isLandscape, mediaCrop, mediaPlacement, uncroppedBox } from "@framekit/renderer";
import { createId, type MockupLayer, type SceneDocument, type Shadow } from "@framekit/scene";
import { layerSize, type SizeOf } from "./lineup";

/**
 * Lifted cards: a piece of a device's screenshot floated out of the screen as
 * its own rounded, shadowed card, the way premium store shots pull one widget
 * forward. The card is a frameless mockup that crops the same image, so it
 * stays sharp and editable. Pure geometry here; detection runs in the browser.
 */

export interface Crop {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type LiftStyle = "pop" | "tilt" | "glass" | "flat";
export type LiftSide = "auto" | "left" | "right" | "center";

const CARD_SHADOW: Shadow = { mode: "spread", lightAngle: 90, distance: 38, softness: 80, opacity: 0.3, color: "#0b0b17" };

export const LIFT_PREFIX = "lift-";
export const isLiftedCard = (layer: { id: string; type: string }) => layer.type === "mockup" && layer.id.startsWith(LIFT_PREFIX);

/** Where `crop` (fractions of the source image) is drawn inside the layer, in the layer's own px. */
function regionInLayer(layer: MockupLayer, crop: Crop, asset: { width: number; height: number }, size: { w: number; h: number }) {
  const media = layer.media!;
  const device = layer.deviceId ? getDevice(layer.deviceId) : undefined;
  let rect = { x: 0, y: 0, width: size.w, height: size.h };
  if (device) {
    if (isLandscape(layer, device)) return null;
    if (device.plate) {
      const p = device.plate;
      const k = size.w / p.width;
      rect = { x: p.screenRect.x * k, y: p.screenRect.y * k, width: p.screenRect.width * k, height: p.screenRect.height * k };
    } else {
      rect = device.frame.screenRect;
    }
  }
  const placed = device
    ? mediaPlacement(rect, { ...asset, url: "" }, media)
    : { x: 0, y: 0, w: size.w, h: size.h };
  const full = uncroppedBox(placed, mediaCrop(media));
  return { x: full.x + crop.x * full.w, y: full.y + crop.y * full.h, w: crop.w * full.w, h: crop.h * full.h, screen: rect };
}

/**
 * A card lifting `crop` out of `source`: it starts exactly over that part of
 * the screen, a little larger, and slides past the device's nearer edge.
 */
export function liftCard(
  source: MockupLayer,
  crop: Crop,
  sizeOf: SizeOf,
  opts: { style?: LiftStyle; side?: LiftSide; pop?: number } = {}
): MockupLayer | null {
  if (!source.media || source.media.kind !== "image") return null;
  const asset = sizeOf(source.media.assetId);
  const size = layerSize(source, sizeOf);
  if (!asset?.width || !asset?.height || !size) return null;
  const c = clampCrop(crop);
  const style = opts.style ?? "pop";
  const pop = opts.pop ?? 1.12;
  const t = source.transform;
  const region = regionInLayer(source, c, asset, size);

  // centre of the region relative to the layer centre, in canvas px
  let dx = 0;
  let dy = 0;
  let width = Math.min(size.w, size.h) * 0.8 * t.scale;
  let screenW = size.w * t.scale;
  if (region) {
    dx = (region.x + region.w / 2 - size.w / 2) * t.scale;
    dy = (region.y + region.h / 2 - size.h / 2) * t.scale;
    width = region.w * t.scale * pop;
    screenW = region.screen.width * t.scale;
  }
  const side = opts.side ?? "auto";
  const dir = side === "left" ? -1 : side === "right" ? 1 : side === "center" ? 0 : dx < -screenW * 0.04 ? -1 : 1;
  const shift = dir * screenW * 0.16;
  const rad = (t.rotate * Math.PI) / 180;
  const ox = dx + shift;
  const x = t.x + ox * Math.cos(rad) - dy * Math.sin(rad);
  const y = t.y + ox * Math.sin(rad) + dy * Math.cos(rad);

  const naturalW = asset.width * c.w;
  const scale = width / naturalW;
  const radiusCanvas = Math.max(10, width * 0.055);
  return {
    type: "mockup",
    id: `${LIFT_PREFIX}${createId()}`,
    deviceId: null,
    screenshotStyle: style === "glass" ? "glass-light" : "default",
    media: { assetId: source.media.assetId, kind: "image", fit: "cover", offsetX: 0, offsetY: 0, scale: 1, crop: c },
    cornerRadius: Math.round(radiusCanvas / scale),
    border: style === "flat" ? { width: Math.max(2, Math.round(3 / scale)), color: "rgba(255,255,255,0.85)", inset: 0 } : undefined,
    transform: {
      x: Math.round(x),
      y: Math.round(y),
      scale: Math.round(scale * 10000) / 10000,
      rotate: t.rotate + (style === "tilt" ? (dir || 1) * -4 : 0),
      tiltX: 0,
      tiltY: 0,
      perspective: t.perspective,
    },
    shadow: style === "flat" ? { ...CARD_SHADOW, distance: 14, softness: 30, opacity: 0.16 } : { ...CARD_SHADOW },
  };
}

/** Add a lifted card in front of everything and return its id. */
export function addLiftedCard(scene: SceneDocument, sourceId: string, crop: Crop, sizeOf: SizeOf, opts?: Parameters<typeof liftCard>[3]) {
  const source = scene.layers.find((l) => l.id === sourceId);
  if (source?.type !== "mockup") return { scene, layerId: "" };
  const card = liftCard(source, crop, sizeOf, opts);
  if (!card) return { scene, layerId: "" };
  return { scene: { ...scene, layers: [...scene.layers, card] }, layerId: card.id };
}

export function clampCrop(c: Crop): Crop {
  const x = Math.min(0.98, Math.max(0, c.x));
  const y = Math.min(0.98, Math.max(0, c.y));
  return { x, y, w: Math.max(0.02, Math.min(1 - x, c.w)), h: Math.max(0.02, Math.min(1 - y, c.h)) };
}

/** Fallback picks when nothing is detected: the top, middle and lower thirds of the content area. */
export const PRESET_CROPS: { label: string; crop: Crop }[] = [
  { label: "Top", crop: { x: 0.05, y: 0.12, w: 0.9, h: 0.24 } },
  { label: "Middle", crop: { x: 0.05, y: 0.38, w: 0.9, h: 0.24 } },
  { label: "Lower", crop: { x: 0.05, y: 0.64, w: 0.9, h: 0.22 } },
];

/* --------------------------------- detection -------------------------------- */

export interface Pixels {
  width: number;
  height: number;
  /** RGBA, row-major */
  data: Uint8ClampedArray | Uint8Array;
}

const iou = (a: Crop, b: Crop) => {
  const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const i = ix * iy;
  return i / (a.w * a.h + b.w * b.h - i);
};

/**
 * Find card-like blocks in a UI screenshot: filled panels that differ from the
 * page background, plus blocks of content separated by empty rows. Returns
 * up to `max` crops (0..1 fractions), top to bottom.
 */
export function detectCards(px: Pixels, max = 6): Crop[] {
  const { width: W, height: H, data } = px;
  if (W < 16 || H < 16) return [];
  const at = (x: number, y: number) => (y * W + x) * 4;
  // the page colour: the most common colour down both side edges
  const counts = new Map<number, number>();
  for (let y = Math.floor(H * 0.08); y < H; y += 2) {
    for (const x of [1, 2, W - 3, W - 2]) {
      const i = at(x, y);
      const key = ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  let bgKey = 0;
  let best = -1;
  for (const [k, n] of counts) if (n > best) [bgKey, best] = [k, n];
  const bg = [((bgKey >> 10) & 31) * 8 + 4, ((bgKey >> 5) & 31) * 8 + 4, (bgKey & 31) * 8 + 4];
  const diff = (i: number) => Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]);

  const fg = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) fg[y * W + x] = diff(at(x, y)) > 22 ? 1 : 0;

  const found: Crop[] = [];

  // 1. filled panels: connected regions of non-page colour (text inside them leaves holes, not gaps)
  const seen = new Uint8Array(W * H);
  const stack: number[] = [];
  for (let start = 0; start < W * H; start++) {
    if (!fg[start] || seen[start]) continue;
    let minX = W, minY = H, maxX = 0, maxY = 0, n = 0;
    stack.push(start);
    seen[start] = 1;
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % W;
      const y = (p - x) / W;
      n++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x > 0 && fg[p - 1] && !seen[p - 1]) {
        seen[p - 1] = 1;
        stack.push(p - 1);
      }
      if (x < W - 1 && fg[p + 1] && !seen[p + 1]) {
        seen[p + 1] = 1;
        stack.push(p + 1);
      }
      if (y > 0 && fg[p - W] && !seen[p - W]) {
        seen[p - W] = 1;
        stack.push(p - W);
      }
      if (y < H - 1 && fg[p + W] && !seen[p + W]) {
        seen[p + W] = 1;
        stack.push(p + W);
      }
    }
    const bw = maxX - minX + 1;
    const bh = maxY - minY + 1;
    const fill = n / (bw * bh);
    const touchesEdge = minY <= H * 0.02 || maxY >= H * 0.98;
    if (bw >= W * 0.3 && bh >= H * 0.05 && bw * bh <= W * H * 0.6 && fill >= 0.45 && !touchesEdge) {
      found.push({ x: minX / W, y: minY / H, w: bw / W, h: bh / H });
    }
  }

  // 2. content blocks: runs of rows with something on them, between empty rows
  const rowHas = (y: number) => {
    let n = 0;
    for (let x = 0; x < W; x++) n += fg[y * W + x];
    return n > W * 0.01;
  };
  const top = Math.floor(H * 0.07);
  const bottom = Math.floor(H * 0.93);
  let y = top;
  while (y < bottom) {
    if (!rowHas(y)) {
      y++;
      continue;
    }
    const y0 = y;
    let gap = 0;
    while (y < bottom && gap < Math.max(3, H * 0.012)) {
      gap = rowHas(y) ? 0 : gap + 1;
      y++;
    }
    const y1 = y - gap;
    if (y1 - y0 >= H * 0.06 && y1 - y0 <= H * 0.5) {
      let minX = W, maxX = 0;
      for (let yy = y0; yy < y1; yy++)
        for (let x = 0; x < W; x++)
          if (fg[yy * W + x]) {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
          }
      const pad = W * 0.02;
      const x0 = Math.max(0, minX - pad);
      const x1 = Math.min(W, maxX + 1 + pad);
      if (x1 - x0 >= W * 0.3) found.push({ x: x0 / W, y: Math.max(0, y0 - pad) / H, w: (x1 - x0) / W, h: Math.min(H - y0 + pad, y1 - y0 + pad * 2) / H });
    }
  }

  const unique: Crop[] = [];
  for (const c of found.sort((a, b) => b.w * b.h - a.w * a.h)) if (!unique.some((u) => iou(u, c) > 0.55)) unique.push(clampCrop(c));
  return unique.slice(0, max).sort((a, b) => a.y - b.y);
}
