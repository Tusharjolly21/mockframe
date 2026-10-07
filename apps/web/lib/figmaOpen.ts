import { createId, type SceneDocument } from "@framekit/scene";
import type { GuestAsset } from "./assets";
import { resolveBuiltin } from "./builtinBackgrounds";
import { buildDeviceScene, deviceForScreenshot } from "./deviceScene";
import type { FigmaImportManifest } from "./figmaImport";
import { placeAsset } from "./sceneOps";
import { buildStoreSet, storeSetBySlug } from "./storeSets";
import { fillScenes } from "./templateShots";

export interface PlannedShot {
  id: string;
  name: string;
  scene: SceneDocument;
  /** the same shot before the frame went in (the undo baseline) */
  base: SceneDocument;
}

/**
 * What the editor opens for frames sent from Figma: one shot per frame, each
 * in the device that fits its shape, or a store listing set with the frames
 * on its screens (frame 1 on sample screen 1, and so on).
 */
export function planFigmaScenes(manifest: Pick<FigmaImportManifest, "mode" | "set" | "platform">, frames: { asset: GuestAsset; name: string }[]): { shots: PlannedShot[]; filled: number } {
  if (!frames.length) return { shots: [], filled: 0 };
  const set = manifest.mode === "set" ? storeSetBySlug(manifest.set ?? "") : undefined;
  if (set) {
    const shots = buildStoreSet(set, manifest.platform ?? "ios");
    const mine = frames.map((f) => ({ assetId: f.asset.id, width: f.asset.width, height: f.asset.height }));
    const sizes = new Map(frames.map((f) => [f.asset.id, f.asset]));
    const sizeOf = (id: string) => sizes.get(id) ?? resolveBuiltin(id);
    const { scenes, filled } = fillScenes(
      shots.map((s) => s.scene),
      mine,
      sizeOf
    );
    return { shots: shots.map((s, i) => ({ id: createId(), name: s.name, scene: scenes[i], base: s.scene })), filled };
  }
  const planned = frames.flatMap((f) => {
    const base = buildDeviceScene(deviceForScreenshot(f.asset.width, f.asset.height));
    if (!base) return [];
    return [{ id: createId(), name: f.name, scene: placeAsset(base, f.asset, {}).scene, base }];
  });
  return { shots: planned, filled: planned.length };
}
