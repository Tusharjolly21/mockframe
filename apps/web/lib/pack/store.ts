"use client";

import { create } from "zustand";
import { ingestFile } from "../assets";
import { addScreens, moveScreen, removeScreen } from "./ops";
import { loadLatestPack, savePack } from "./persist";
import { SOURCE_LOCALE } from "./locales";
import { createPack, type PackDocument } from "./schema";

interface PackState {
  pack: PackDocument;
  activeScreenId: string;
  activeTarget: string;
  /** language shown in the preview and edited in the caption fields */
  activeLocale: string;
  hydrated: boolean;
  exporting: boolean;
  progress: { done: number; total: number } | null;
  warnings: string[];
  hydrate: () => Promise<void>;
  /** all pack mutations flow through here — schedules the debounced autosave */
  update: (mut: (pack: PackDocument) => PackDocument) => void;
  addFiles: (files: File[]) => Promise<void>;
  /** swap the screenshot on one screen, keeping its captions and overrides */
  replaceScreenFile: (id: string, file: File) => Promise<void>;
  removeScreenById: (id: string) => void;
  moveScreenById: (id: string, delta: -1 | 1) => void;
  setActiveScreen: (id: string) => void;
  setActiveTarget: (t: string) => void;
  setActiveLocale: (locale: string) => void;
  setExporting: (exporting: boolean, progress?: { done: number; total: number } | null) => void;
  dismissWarnings: () => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSave(pack: PackDocument) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void savePack(pack).catch(() => {}), 800);
}

const initial = createPack();

export const usePackStore = create<PackState>()((set, get) => ({
  pack: initial,
  activeScreenId: initial.screens[0].id,
  activeTarget: "appstore-69",
  activeLocale: SOURCE_LOCALE,
  hydrated: false,
  exporting: false,
  progress: null,
  warnings: [],

  hydrate: async () => {
    if (get().hydrated) return;
    const saved = await loadLatestPack().catch(() => null);
    if (saved && saved.screens.length) {
      set({ pack: saved, activeScreenId: saved.screens[0].id, hydrated: true });
    } else {
      set({ hydrated: true });
    }
  },

  update: (mut) => {
    const pack = mut(get().pack);
    set({ pack });
    // keep the active screen and language valid after removals
    if (!pack.screens.some((s) => s.id === get().activeScreenId)) {
      set({ activeScreenId: pack.screens[0].id });
    }
    if (get().activeLocale !== SOURCE_LOCALE && !(pack.locales ?? []).includes(get().activeLocale)) {
      set({ activeLocale: SOURCE_LOCALE });
    }
    scheduleSave(pack);
  },

  addFiles: async (files) => {
    const assets = await Promise.all(files.filter((f) => f.type.startsWith("image/")).map((f) => ingestFile(f)));
    if (!assets.length) return;
    const { pack, warnings, addedIds } = addScreens(get().pack, assets);
    set({ pack, warnings: [...get().warnings, ...warnings] });
    if (addedIds.length) set({ activeScreenId: addedIds[addedIds.length - 1] });
    scheduleSave(pack);
  },

  replaceScreenFile: async (id, file) => {
    if (!file.type.startsWith("image/")) return;
    const asset = await ingestFile(file);
    get().update((p) => ({ ...p, screens: p.screens.map((s) => (s.id === id ? { ...s, assetId: asset.id } : s)) }));
    if (asset.width >= asset.height) {
      set({ warnings: [...get().warnings, `${asset.name} looks landscape — store phone screenshots are portrait; it will be cover-cropped.`] });
    }
  },

  removeScreenById: (id) => get().update((p) => removeScreen(p, id)),
  moveScreenById: (id, delta) => get().update((p) => moveScreen(p, id, delta)),
  setActiveScreen: (id) => set({ activeScreenId: id }),
  setActiveTarget: (activeTarget) => set({ activeTarget }),
  setActiveLocale: (activeLocale) => set({ activeLocale }),
  setExporting: (exporting, progress = null) => set({ exporting, progress }),
  dismissWarnings: () => set({ warnings: [] }),
}));
