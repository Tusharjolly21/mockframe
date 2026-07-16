import { rgba } from "./theme";

/** A premium background = a base colour + layered radial "mesh" blobs that drift.
 *  Defined as data so the <Background> component can animate the blob positions
 *  per frame instead of baking a static gradient. */
export interface MeshBlob {
  /** 0..1 anchor position within the frame. */
  x: number;
  y: number;
  /** radius as a fraction of the larger frame dimension. */
  r: number;
  color: string;
  /** how far (0..1 of frame) the blob drifts over its cycle. */
  drift: number;
}

export interface PromoBackground {
  base: string;
  blobs: MeshBlob[];
  /** vignette strength 0..1 */
  vignette: number;
}

export const PROMO_BACKGROUNDS: Record<string, PromoBackground> = {
  aurora: {
    base: "#0a0714",
    vignette: 0.55,
    blobs: [
      { x: 0.25, y: 0.2, r: 0.7, color: rgba("#7c3aed", 0.55), drift: 0.06 },
      { x: 0.8, y: 0.15, r: 0.6, color: rgba("#22d3ee", 0.35), drift: 0.08 },
      { x: 0.6, y: 0.9, r: 0.8, color: rgba("#d946ef", 0.3), drift: 0.05 },
    ],
  },
  midnight: {
    base: "#05070f",
    vignette: 0.6,
    blobs: [
      { x: 0.5, y: 0.1, r: 0.7, color: rgba("#1d4ed8", 0.45), drift: 0.05 },
      { x: 0.85, y: 0.7, r: 0.6, color: rgba("#22d3ee", 0.3), drift: 0.07 },
      { x: 0.15, y: 0.85, r: 0.6, color: rgba("#0ea5e9", 0.28), drift: 0.06 },
    ],
  },
  graphite: {
    base: "#0c0d10",
    vignette: 0.5,
    blobs: [
      { x: 0.3, y: 0.25, r: 0.7, color: rgba("#34d399", 0.3), drift: 0.05 },
      { x: 0.8, y: 0.8, r: 0.7, color: rgba("#10b981", 0.22), drift: 0.06 },
      { x: 0.6, y: 0.05, r: 0.5, color: rgba("#a3e635", 0.16), drift: 0.05 },
    ],
  },
  dusk: {
    base: "#100513",
    vignette: 0.55,
    blobs: [
      { x: 0.2, y: 0.15, r: 0.7, color: rgba("#f472b6", 0.45), drift: 0.06 },
      { x: 0.85, y: 0.35, r: 0.6, color: rgba("#fb7185", 0.32), drift: 0.07 },
      { x: 0.55, y: 0.95, r: 0.8, color: rgba("#a855f7", 0.3), drift: 0.05 },
    ],
  },
  "violet-glow": {
    base: "#0b0817",
    vignette: 0.62,
    blobs: [
      { x: 0.5, y: 0.35, r: 0.85, color: rgba("#7c3aed", 0.5), drift: 0.04 },
      { x: 0.85, y: 0.85, r: 0.55, color: rgba("#a78bfa", 0.3), drift: 0.06 },
      { x: 0.12, y: 0.7, r: 0.5, color: rgba("#6366f1", 0.28), drift: 0.05 },
    ],
  },
  ember: {
    base: "#140a05",
    vignette: 0.58,
    blobs: [
      { x: 0.3, y: 0.2, r: 0.7, color: rgba("#fb923c", 0.5), drift: 0.06 },
      { x: 0.82, y: 0.7, r: 0.65, color: rgba("#ef4444", 0.32), drift: 0.07 },
      { x: 0.6, y: 0.95, r: 0.7, color: rgba("#f59e0b", 0.28), drift: 0.05 },
    ],
  },
};

export const PROMO_BACKGROUND_IDS = Object.keys(PROMO_BACKGROUNDS);

export function getPromoBackground(id: string): PromoBackground {
  return PROMO_BACKGROUNDS[id] ?? PROMO_BACKGROUNDS.aurora;
}
