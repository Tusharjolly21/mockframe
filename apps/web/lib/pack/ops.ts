import { createPackScreen, type PackDocument } from "./schema";

/** Pure pack mutations — the zustand store wraps these; tests hit them directly. */

export interface IncomingAsset {
  id: string;
  width: number;
  height: number;
  name: string;
}

const MAX_SCREENS = 10;

export function addScreens(
  pack: PackDocument,
  assets: IncomingAsset[]
): { pack: PackDocument; warnings: string[]; addedIds: string[] } {
  const warnings: string[] = [];
  const addedIds: string[] = [];
  let screens = [...pack.screens];
  for (const asset of assets) {
    if (asset.width >= asset.height) {
      warnings.push(`${asset.name} looks landscape — store phone screenshots are portrait; it will be cover-cropped.`);
    }
    // fill the single empty placeholder before appending
    const empty = screens.length === 1 && screens[0].assetId === null ? 0 : -1;
    if (empty >= 0) {
      screens = [{ ...screens[empty], assetId: asset.id }];
      addedIds.push(screens[0].id);
      continue;
    }
    if (screens.length >= MAX_SCREENS) {
      warnings.push(`Packs are capped at ${MAX_SCREENS} screenshots (both stores' limit) — ${asset.name} was skipped.`);
      continue;
    }
    const screen = createPackScreen(asset.id);
    screens.push(screen);
    addedIds.push(screen.id);
  }
  return { pack: { ...pack, screens }, warnings, addedIds };
}

export function removeScreen(pack: PackDocument, id: string): PackDocument {
  const screens = pack.screens.filter((s) => s.id !== id);
  return { ...pack, screens: screens.length ? screens : [createPackScreen()] };
}

export function moveScreen(pack: PackDocument, id: string, delta: -1 | 1): PackDocument {
  const i = pack.screens.findIndex((s) => s.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= pack.screens.length) return pack;
  const screens = [...pack.screens];
  [screens[i], screens[j]] = [screens[j], screens[i]];
  return { ...pack, screens };
}

export function setCaption(pack: PackDocument, screenId: string, title: string, subtitle: string): PackDocument {
  return {
    ...pack,
    screens: pack.screens.map((s) =>
      s.id === screenId
        ? { ...s, captions: { ...s.captions, en: { title, ...(subtitle.trim() ? { subtitle } : {}) } } }
        : s
    ),
  };
}
