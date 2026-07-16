"use client";

import { create } from "zustand";
import { ingestFile } from "../assets";
import { addScreens, moveScreen, removeScreen } from "./ops";
import { loadLatestPack, savePack } from "./persist";
import { createPack, type PackDocument, type PackTargetId } from "./schema";

interface PackState {
  pack: PackDocument;
  activeScreenId: string;
  activeTarget: PackTargetId;
  hydrated: boolean;
  exporting: boolean;
  progress: { done: number; total: number } | null;
  warnings: string[];
  hydrate: () => Promise<void>;
  /** all pack mutations flow through here — schedules the debounced autosave */
  update: (mut: (pack: PackDocument) => PackDocument) => void;
  addFiles: (files: File[]) => Promise<void>;
  removeScreenById: (id: string) => void;
  moveScreenById: (id: string, delta: -1 | 1) => void;
  setActiveScreen: (id: string) => void;
  setActiveTarget: (t: PackTargetId) => void;
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
    // keep the active screen valid after removals
    if (!pack.screens.some((s) => s.id === get().activeScreenId)) {
      set({ activeScreenId: pack.screens[0].id });
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

  removeScreenById: (id) => get().update((p) => removeScreen(p, id)),
  moveScreenById: (id, delta) => get().update((p) => moveScreen(p, id, delta)),
  setActiveScreen: (id) => set({ activeScreenId: id }),
  setActiveTarget: (activeTarget) => set({ activeTarget }),
  setExporting: (exporting, progress = null) => set({ exporting, progress }),
  dismissWarnings: () => set({ warnings: [] }),
}));
