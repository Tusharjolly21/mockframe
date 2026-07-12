"use client";

import { create } from "zustand";
import { temporal } from "zundo";
import { getDevice, listDevices } from "@framekit/devices";
import {
  createMockupLayer,
  createScene,
  type Layer,
  type SceneDocument,
} from "@framekit/scene";

/* ------------------------------- scene store ------------------------------- */
/* One hot object mutated during drags. Undo/redo via zundo; drags pause the
   temporal store and commit a single history entry on pointer-up. */

interface SceneState {
  scene: SceneDocument;
  setScene: (updater: (s: SceneDocument) => SceneDocument) => void;
  updateLayer: (id: string, patch: (l: Layer) => Layer) => void;
  resetScene: () => void;
}

function initialScene(): SceneDocument {
  const scene = createScene({ width: 1920, height: 1080 });
  const iphone = getDevice("iphone-16-pro") ?? listDevices()[0];
  const layer = createMockupLayer({
    deviceId: iphone.id,
    frameHeight: iphone.frame.height,
    canvasHeight: scene.canvas.height,
  });
  // deterministic ids so the SSR'd initial scene hydrates cleanly
  scene.id = "scene-initial";
  layer.id = "layer-initial";
  scene.layers.push(layer);
  return scene;
}

export const useSceneStore = create<SceneState>()(
  temporal(
    (set) => ({
      scene: initialScene(),
      setScene: (updater) => set((st) => ({ scene: updater(st.scene) })),
      updateLayer: (id, patch) =>
        set((st) => ({
          scene: {
            ...st.scene,
            layers: st.scene.layers.map((l) => (l.id === id ? patch(l) : l)),
          },
        })),
      resetScene: () => set({ scene: initialScene() }),
    }),
    { limit: 200 }
  )
);

export const sceneTemporal = useSceneStore.temporal;

/** Wrap continuous interactions (drags) so they cost one undo step. */
export function withTransientHistory(run: () => void) {
  sceneTemporal.getState().pause();
  try {
    run();
  } finally {
    sceneTemporal.getState().resume();
  }
}

/* -------------------------------- view store -------------------------------- */
/* Editor-only state: zoom/pan/selection. Never serialized into the document. */

interface ViewState {
  zoom: number;
  pan: { x: number; y: number };
  /** selection supports shift-click multi-select; last entry is the primary */
  selectedIds: string[];
  assetVersion: number;
  activeLayoutId: string | null;
  layoutMods: { spread: number; angle: number; tilt: number; scale: number };
  /** when on, dragging a mockup on the canvas rotates it in 3D (tiltX/tiltY) */
  threeD: boolean;
  setThreeD: (v: boolean) => void;
  /** free-tier watermark is baked into exports; a paid plan (future) flips this */
  removeWatermark: boolean;
  setRemoveWatermark: (v: boolean) => void;
  setZoom: (z: number) => void;
  setPan: (p: { x: number; y: number }) => void;
  select: (id: string | null, opts?: { additive?: boolean }) => void;
  bumpAssets: () => void;
  setActiveLayout: (id: string | null) => void;
  setLayoutMods: (m: { spread: number; angle: number; tilt: number; scale: number }) => void;
  fitToView: (viewport: { width: number; height: number }, canvas: { width: number; height: number }) => void;
}

export const useViewStore = create<ViewState>()((set) => ({
  zoom: 0.4,
  pan: { x: 0, y: 0 },
  selectedIds: [],
  assetVersion: 0,
  activeLayoutId: null,
  layoutMods: { spread: 1, angle: 0, tilt: 0, scale: 1 },
  threeD: false,
  setThreeD: (threeD) => set({ threeD }),
  removeWatermark: false,
  setRemoveWatermark: (removeWatermark) => set({ removeWatermark }),
  setZoom: (zoom) => set({ zoom }),
  setPan: (pan) => set({ pan }),
  select: (id, opts) =>
    set((s) => {
      if (id === null) return { selectedIds: [] };
      if (opts?.additive) {
        return {
          selectedIds: s.selectedIds.includes(id)
            ? s.selectedIds.filter((x) => x !== id)
            : [...s.selectedIds, id],
        };
      }
      return { selectedIds: [id] };
    }),
  bumpAssets: () => set((s) => ({ assetVersion: s.assetVersion + 1 })),
  setActiveLayout: (activeLayoutId) =>
    set({ activeLayoutId, layoutMods: { spread: 1, angle: 0, tilt: 0, scale: 1 } }),
  setLayoutMods: (layoutMods) => set({ layoutMods }),
  fitToView: (viewport, canvas) => {
    const zoom = Math.min(
      (viewport.width - 96) / canvas.width,
      (viewport.height - 96) / canvas.height
    );
    set({
      zoom,
      pan: {
        x: (viewport.width - canvas.width * zoom) / 2,
        y: (viewport.height - canvas.height * zoom) / 2,
      },
    });
  },
}));
