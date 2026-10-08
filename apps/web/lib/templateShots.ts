import { getDevice } from "@framekit/devices";
import type { MockupLayer, SceneDocument } from "@framekit/scene";

/**
 * Templates that show your own screenshots: every slot a template fills with
 * a sample app screen (or leaves empty) takes one of yours instead, when its
 * shape fits. Pure, so the gallery preview and the opened template match.
 */

export interface MyShot {
  assetId: string;
  width: number;
  height: number;
}

export const MAX_SHOTS = 8;

const SAMPLE_PREFIX = "builtin:sample/";
/** a screenshot fits a slot when their aspect ratios are within this factor */
const FIT = 1.45;

type SizeOf = (assetId: string) => { width: number; height: number } | undefined;

/**
 * Aspect ratio (w / h) of the screen a layer shows, or null when the layer
 * isn't a slot: it already holds a real screenshot or a composed app screen,
 * or it's a flat realistic render.
 */
export function slotAspect(layer: MockupLayer, sizeOf: SizeOf): number | null {
  if (layer.render) return null;
  const id = layer.media?.assetId;
  if (id && !id.startsWith(SAMPLE_PREFIX)) return null;
  if (layer.deviceId) {
    const screen = getDevice(layer.deviceId)?.screen;
    return screen ? screen.width / screen.height : null;
  }
  // a frameless card cut from a sample screen: the cut is reapplied to yours
  const size = id ? sizeOf(id) : undefined;
  return size ? size.width / size.height : null;
}

export function shotFits(shot: MyShot, aspect: number): boolean {
  return Math.abs(Math.log(shot.width / shot.height / aspect)) <= Math.log(FIT);
}

/**
 * Put `shots` into the slots of `scenes`. Each sample screen maps to one of
 * your screenshots everywhere it appears (a store set reuses screen 2 in the
 * phone and in the card lifted out of it), so sample 1 becomes your first
 * fitting shot, sample 2 your second, and so on, cycling when you have fewer.
 */
export function fillScenes(scenes: SceneDocument[], shots: MyShot[], sizeOf: SizeOf): { scenes: SceneDocument[]; filled: number } {
  const bySample = new Map<string, MyShot>();
  const next = new Map<string, number>();
  let filled = 0;

  const pick = (options: MyShot[]) => {
    const key = options.map((s) => s.assetId).join("|");
    const n = next.get(key) ?? 0;
    next.set(key, n + 1);
    return options[n % options.length];
  };

  const out = scenes.map((scene) => {
    let changed = false;
    const layers = scene.layers.map((layer) => {
      if (layer.type !== "mockup") return layer;
      const aspect = slotAspect(layer, sizeOf);
      if (aspect === null) return layer;
      const sample = layer.media?.assetId;
      let shot = sample ? bySample.get(sample) : undefined;
      if (!shot || !shotFits(shot, aspect)) {
        const options = shots.filter((s) => shotFits(s, aspect));
        if (!options.length) return layer;
        shot = pick(options);
        if (sample && !bySample.has(sample)) bySample.set(sample, shot);
      }
      changed = true;
      filled++;
      return withShot(layer, shot, sizeOf);
    });
    return changed ? { ...scene, layers } : scene;
  });
  return { scenes: out, filled };
}

function withShot(layer: MockupLayer, shot: MyShot, sizeOf: SizeOf): MockupLayer {
  if (layer.deviceId || !layer.media) {
    return { ...layer, media: { assetId: shot.assetId, kind: "image", fit: "cover", offsetX: 0, offsetY: 0, scale: 1 } };
  }
  // frameless cards size from the image's pixels: keep the card the same size
  const sample = sizeOf(layer.media.assetId);
  const k = sample ? sample.width / shot.width : 1;
  return {
    ...layer,
    media: { ...layer.media, assetId: shot.assetId },
    transform: { ...layer.transform, scale: Math.round(layer.transform.scale * k * 10000) / 10000 },
  };
}

/** Whether a template has any slot one of `shots` would fill. */
export function takesShots(scenes: SceneDocument[], shots: MyShot[], sizeOf: SizeOf): boolean {
  if (!shots.length) return false;
  return scenes.some((scene) =>
    scene.layers.some((layer) => {
      if (layer.type !== "mockup") return false;
      const aspect = slotAspect(layer, sizeOf);
      return aspect !== null && shots.some((s) => shotFits(s, aspect));
    })
  );
}
