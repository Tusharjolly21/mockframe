import type { PackDocument } from "./schema";

/** Uploaded asset ids a pack references — the snapshot saved beside it. */
export function packAssetIds(pack: PackDocument): string[] {
  const ids = pack.screens.flatMap((s) => (s.assetId ? [s.assetId] : []));
  if (pack.style.background?.type === "image") ids.push(pack.style.background.assetId);
  return ids;
}
