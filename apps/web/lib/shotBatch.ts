"use client";

import { create } from "zustand";
import { createId, type SceneDocument } from "@framekit/scene";

export interface BatchShot {
  id: string;
  name: string;
  scene: SceneDocument;
}

interface ShotBatchState {
  shots: BatchShot[];
  activeId: string | null;
  ensure: (scene: SceneDocument) => void;
  syncActive: (scene: SceneDocument) => void;
  addFromCurrent: (scene: SceneDocument) => BatchShot;
  activate: (id: string, currentScene: SceneDocument) => SceneDocument | null;
  rename: (id: string, name: string) => void;
  remove: (id: string, currentScene: SceneDocument) => SceneDocument | null;
}

function clonedScene(scene: SceneDocument): SceneDocument {
  const next = structuredClone(scene);
  next.id = createId();
  return next;
}

export const useShotBatchStore = create<ShotBatchState>()((set, get) => ({
  shots: [],
  activeId: null,
  ensure: (scene) => {
    if (get().shots.length) return;
    const id = createId();
    set({ shots: [{ id, name: "Shot 1", scene }], activeId: id });
  },
  syncActive: (scene) =>
    set((state) => {
      if (!state.activeId) return state;
      const index = state.shots.findIndex((shot) => shot.id === state.activeId);
      if (index < 0 || state.shots[index].scene === scene) return state;
      const shots = [...state.shots];
      shots[index] = { ...shots[index], scene };
      return { shots };
    }),
  addFromCurrent: (scene) => {
    const id = createId();
    const shot: BatchShot = { id, name: `Shot ${get().shots.length + 1}`, scene: clonedScene(scene) };
    set((state) => ({ shots: [...state.shots, shot], activeId: id }));
    return shot;
  },
  activate: (id, currentScene) => {
    const state = get();
    const target = state.shots.find((shot) => shot.id === id);
    if (!target) return null;
    set({
      activeId: id,
      shots: state.shots.map((shot) => shot.id === state.activeId ? { ...shot, scene: currentScene } : shot),
    });
    return target.scene;
  },
  rename: (id, name) =>
    set((state) => ({ shots: state.shots.map((shot) => shot.id === id ? { ...shot, name: name.slice(0, 80) || "Untitled shot" } : shot) })),
  remove: (id, currentScene) => {
    const state = get();
    if (state.shots.length <= 1) return null;
    const index = state.shots.findIndex((shot) => shot.id === id);
    if (index < 0) return null;
    const synced = state.shots.map((shot) => shot.id === state.activeId ? { ...shot, scene: currentScene } : shot);
    const shots = synced.filter((shot) => shot.id !== id);
    const next = shots[Math.min(index, shots.length - 1)];
    set({ shots, activeId: next.id });
    return next.scene;
  },
}));
