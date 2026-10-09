"use client";

import { create } from "zustand";
import { ingestFile, resolveAsset, restoreAssets } from "../assets";
import { firebaseFetch } from "../firebaseClient";
import { addScreens, capturableScreens, moveScreen, refreshScreens, removeScreen } from "./ops";
import { loadLatestPack, savePack } from "./persist";
import { applyPendingRefresh } from "./deployRefresh";
import { acknowledgeRefresh, fetchPendingRefresh } from "./deployClient";
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
  /** a release refresh is running: progress through its screens */
  refreshing: { done: number; total: number } | null;
  /** swap in a new release's screenshots, keeping captions/style; resolves to a summary line */
  refreshFiles: (files: File[]) => Promise<string>;
  /** re-capture every screen that has a source URL (or just one); resolves to a summary line */
  refreshFromUrls: (onlyScreenId?: string) => Promise<string>;
  /** set when a deploy refresh was just applied — shown once in the studio */
  deployNote: string | null;
  dismissDeployNote: () => void;
  /** apply screenshots a deploy webhook captured since the pack was last open */
  applyDeployRefresh: () => Promise<void>;
}

let deployCheck: Promise<void> | null = null;

/** Mobile viewport for store captures: /api/capture renders 390px wide at 2x (780×1688, portrait). */
const CAPTURE_WIDTH = 390;

async function captureScreen(url: string, dark: boolean): Promise<File> {
  const res = await firebaseFetch("/api/capture", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, dark, width: CAPTURE_WIDTH }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error ?? "Capture failed");
  }
  const host = url.replace(/^https?:\/\//i, "").split(/[/?#]/)[0];
  return new File([await res.blob()], `${host}.png`, { type: "image/png" });
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
  refreshing: null,
  deployNote: null,

  hydrate: async () => {
    if (get().hydrated) return;
    const saved = await loadLatestPack().catch(() => null);
    if (saved && saved.screens.length) {
      set({ pack: saved, activeScreenId: saved.screens[0].id, hydrated: true });
    } else {
      set({ hydrated: true });
    }
    void get().applyDeployRefresh();
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

  refreshFiles: async (files) => {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (!images.length) return "No images selected.";
    set({ refreshing: { done: 0, total: images.length } });
    try {
      const assets = await Promise.all(images.map((f) => ingestFile(f)));
      const result = refreshScreens(get().pack, assets, (id) => resolveAsset(id)?.name);
      set({ warnings: [...get().warnings, ...result.warnings] });
      get().update(() => result.pack);
      return `Updated ${result.updated} screenshot${result.updated === 1 ? "" : "s"} — captions, translations and style kept. Export to get the new set.`;
    } finally {
      set({ refreshing: null });
    }
  },

  refreshFromUrls: async (onlyScreenId) => {
    const screens = capturableScreens(get().pack).filter((s) => !onlyScreenId || s.id === onlyScreenId);
    if (!screens.length) return "No screens have a source URL yet — add one in the screen settings.";
    const failed: string[] = [];
    let updated = 0;
    set({ refreshing: { done: 0, total: screens.length } });
    try {
      // one at a time: every capture boots headless Chromium on the server
      for (const [i, screen] of screens.entries()) {
        const capture = screen.capture!;
        try {
          const asset = await ingestFile(await captureScreen(capture.url, !!capture.dark));
          // the screen may have been edited or removed while we waited
          get().update((p) => ({
            ...p,
            screens: p.screens.map((s) => (s.id === screen.id ? { ...s, assetId: asset.id } : s)),
          }));
          updated++;
        } catch (e) {
          failed.push(`${capture.url} (${e instanceof Error ? e.message : "failed"})`);
          // a quota or plan limit will fail every remaining capture the same way
          if (e instanceof Error && /captures a day|Upgrade/i.test(e.message)) break;
        }
        set({ refreshing: { done: i + 1, total: screens.length } });
      }
    } finally {
      set({ refreshing: null });
    }
    if (failed.length) set({ warnings: [...get().warnings, `Couldn't refresh: ${failed.join("; ")}`] });
    return `Re-captured ${updated} of ${screens.length} screen${screens.length === 1 ? "" : "s"}.${updated ? " Export to get the new set." : ""}`;
  },

  dismissDeployNote: () => set({ deployNote: null }),

  applyDeployRefresh: () => {
    // focus events can fire in bursts — one check at a time
    deployCheck ??= (async () => {
      try {
        const packId = get().pack.id;
        const { pending, assets } = await fetchPendingRefresh(packId);
        if (!pending || get().pack.id !== packId) return;
        restoreAssets(assets);
        const { pack, applied } = applyPendingRefresh(get().pack, pending);
        const appliedIds = pending.updates
          .filter((u) => pack.screens.some((s) => s.id === u.screenId && s.assetId === u.assetId))
          .map((u) => u.screenId);
        if (applied) {
          get().update(() => pack);
          // save now, not on the debounce: the server cleans up the replaced
          // screenshots once it sees the saved pack no longer uses them
          await savePack(pack).catch(() => {});
        }
        const when = new Date(pending.atMs).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
        set({
          deployNote: applied
            ? `Updated ${applied} screen${applied === 1 ? "" : "s"} from your deploy on ${when}. Export to get the new set.`
            : null,
        });
        if (pending.failed.length) {
          set({ warnings: [...get().warnings, `Deploy refresh couldn't capture: ${pending.failed.map((f) => `${f.url} (${f.error})`).join("; ")}`] });
        }
        await acknowledgeRefresh(packId, pending.atMs, appliedIds);
      } catch {
        // offline or not configured — the refresh stays pending for next time
      } finally {
        deployCheck = null;
      }
    })();
    return deployCheck;
  },
}));
