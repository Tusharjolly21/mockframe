export { SceneRenderer, noiseTile } from "./SceneRenderer";
export { MockupLayerView } from "./MockupLayerView";
export { backgroundToCss, meshGradientCss, mulberry32 } from "./background";
export { patternStyle, overlayStyle, stageStyle, portraitBlur, waveTile } from "./backdrop";
export { shadowToFilter } from "./shadow";
export { plateToBoxDelta, rectToQuad, quadMatrix3d, quadHomography, quadSize, type Quad } from "./quad";
export type { ResolveAsset, ResolvedAsset } from "./types";

import type { SceneDocument } from "@framekit/scene";

/** Every assetId a scene references — exporters inline exactly these. */
export function collectAssets(scene: SceneDocument): string[] {
  const ids = new Set<string>();
  if (scene.canvas.background.type === "image") ids.add(scene.canvas.background.assetId);
  for (const layer of scene.layers) {
    if (layer.type === "mockup" && layer.media) ids.add(layer.media.assetId);
    if (layer.type === "sticker" && "assetId" in layer) ids.add(layer.assetId);
  }
  return [...ids];
}
