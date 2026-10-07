import { DEFAULT_SOURCE_STORE_LOCALE, isStoreLocale, MAX_PACK_LOCALES, SOURCE_LOCALE } from "./locales";
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
