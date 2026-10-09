import { DEFAULT_SOURCE_STORE_LOCALE, isStoreLocale, MAX_PACK_LOCALES, SOURCE_LOCALE } from "./locales";
import { createPackScreen, type PackCapture, type PackDocument } from "./schema";

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

/** Pure recaption apply: writes captions[i] into screens[i].captions.en for
 *  i up to min(screens.length, captions.length); screens beyond that (either
 *  side) are left untouched. Mirrors the clamp/blank-subtitle-drop pattern
 *  used by buildPackFromPlan and setCaption. */
export function applyCaptions(
  pack: PackDocument,
  captions: { title: string; subtitle?: string }[]
): PackDocument {
  const n = Math.min(pack.screens.length, captions.length);
  return {
    ...pack,
    screens: pack.screens.map((s, i) => {
      if (i >= n) return s;
      const { title, subtitle } = captions[i];
      return {
        ...s,
        captions: {
          ...s.captions,
          en: {
            title: title.slice(0, 120),
            ...(subtitle && subtitle.trim() ? { subtitle: subtitle.slice(0, 160) } : {}),
          },
        },
      };
    }),
  };
}

export function setCaption(
  pack: PackDocument,
  screenId: string,
  title: string,
  subtitle: string,
  locale: string = SOURCE_LOCALE
): PackDocument {
  return {
    ...pack,
    screens: pack.screens.map((s) =>
      s.id === screenId
        ? { ...s, captions: { ...s.captions, [locale]: { title, ...(subtitle.trim() ? { subtitle } : {}) } } }
        : s
    ),
  };
}

/** Add store languages (unknown ids and duplicates are ignored, capped at MAX_PACK_LOCALES). */
export function addLocales(pack: PackDocument, ids: string[]): PackDocument {
  const next = [...(pack.locales ?? [])];
  for (const id of ids) {
    if (id === SOURCE_LOCALE || id === packSourceLocale(pack) || !isStoreLocale(id) || next.includes(id)) continue;
    if (next.length >= MAX_PACK_LOCALES) break;
    next.push(id);
  }
  return { ...pack, locales: next };
}

/** The store locale the pack's source captions are written in. */
export function packSourceLocale(pack: PackDocument): string {
  return pack.sourceLocale && isStoreLocale(pack.sourceLocale) ? pack.sourceLocale : DEFAULT_SOURCE_STORE_LOCALE;
}

/** Set the source captions' language; it can't also be a translation target. */
export function setSourceLocale(pack: PackDocument, id: string): PackDocument {
  if (!isStoreLocale(id)) return pack;
  return removeLocale({ ...pack, sourceLocale: id }, id);
}

/** Drop a language and its translated captions. */
export function removeLocale(pack: PackDocument, id: string): PackDocument {
  return {
    ...pack,
    locales: (pack.locales ?? []).filter((l) => l !== id),
    screens: pack.screens.map((s) => {
      if (!(id in s.captions) || id === SOURCE_LOCALE) return s;
      const captions = { ...s.captions };
      delete captions[id];
      return { ...s, captions };
    }),
  };
}

/** Screens of `locale` that have no translated title yet. */
export function missingTranslations(pack: PackDocument, locale: string): number {
  return pack.screens.filter((s) => (s.captions[SOURCE_LOCALE]?.title.trim() ?? "") && !s.captions[locale]?.title.trim()).length;
}

/** Write translated captions for one language, screen by screen in order.
 *  Screens whose source caption is empty stay untranslated. */
export function applyTranslation(
  pack: PackDocument,
  locale: string,
  captions: { title: string; subtitle?: string }[]
): PackDocument {
  if (locale === SOURCE_LOCALE) return pack;
  return {
    ...pack,
    screens: pack.screens.map((s, i) => {
      const t = captions[i];
      if (!t || !s.captions[SOURCE_LOCALE]?.title.trim()) return s;
      const subtitle = s.captions[SOURCE_LOCALE]?.subtitle?.trim() ? t.subtitle?.trim() : undefined;
      return {
        ...s,
        captions: {
          ...s.captions,
          [locale]: { title: t.title.trim().slice(0, 120), ...(subtitle ? { subtitle: subtitle.slice(0, 160) } : {}) },
        },
      };
    }),
  };
}

/** File name without folders or extension, case-folded — "Home Screen.PNG" ≡ "home screen". */
function baseName(name: string): string {
  return (name.split(/[\\/]/).pop() ?? name).replace(/\.[a-z0-9]{2,5}$/i, "").trim().toLowerCase();
}

export interface RefreshResult {
  pack: PackDocument;
  /** screens whose screenshot was replaced */
  updated: number;
  /** incoming files that had no screen to go to (refresh never adds screens) */
  skipped: string[];
  warnings: string[];
}

/**
 * Release refresh: swap in a new set of screenshots while keeping everything
 * else — captions in every language, style, order, overrides. Each file goes
 * to the screen whose current screenshot has the same file name; the rest
 * fill the remaining screens top to bottom. `currentName` maps an existing
 * asset id to its file name (the asset registry lives in the browser).
 */
export function refreshScreens(
  pack: PackDocument,
  incoming: IncomingAsset[],
  currentName: (assetId: string) => string | undefined
): RefreshResult {
  const assigned = new Map<string, IncomingAsset>(); // screen id → new asset
  const leftovers: IncomingAsset[] = [];

  for (const asset of incoming) {
    const key = baseName(asset.name);
    const match = pack.screens.find(
      (s) => !assigned.has(s.id) && s.assetId !== null && baseName(currentName(s.assetId) ?? "") === key && key !== ""
    );
    if (match) assigned.set(match.id, asset);
    else leftovers.push(asset);
  }
  for (const screen of pack.screens) {
    if (!leftovers.length) break;
    if (!assigned.has(screen.id)) assigned.set(screen.id, leftovers.shift()!);
  }

  const warnings: string[] = [];
  for (const a of assigned.values()) {
    if (a.width >= a.height) {
      warnings.push(`${a.name} looks landscape — store phone screenshots are portrait; it will be cover-cropped.`);
    }
  }
  const skipped = leftovers.map((a) => a.name);
  if (skipped.length) {
    warnings.push(
      `${skipped.length} file(s) had no screen to replace and were skipped (${skipped.join(", ")}). Use “Add screenshots” for new screens.`
    );
  }

  return {
    pack: {
      ...pack,
      screens: pack.screens.map((s) => {
        const a = assigned.get(s.id);
        return a ? { ...s, assetId: a.id } : s;
      }),
    },
    updated: assigned.size,
    skipped,
    warnings,
  };
}

/** Set (or clear, with null) the URL a screen is re-captured from on refresh. */
export function setScreenCapture(pack: PackDocument, screenId: string, capture: PackCapture | null): PackDocument {
  return {
    ...pack,
    screens: pack.screens.map((s) => {
      if (s.id !== screenId) return s;
      if (capture) return { ...s, capture };
      const next = { ...s };
      delete next.capture;
      return next;
    }),
  };
}

/** Screens that "Refresh from URLs" can re-capture. */
export function capturableScreens(pack: PackDocument): PackDocument["screens"] {
  return pack.screens.filter((s) => !!s.capture?.url);
}
