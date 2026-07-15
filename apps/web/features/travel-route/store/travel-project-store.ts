import { create } from "zustand";
import { nanoid } from "nanoid";
import type { TravelCheckpoint, TravelProject, TravelRouteResult } from "../types/travel-project.types";

interface TravelProjectStore {
  project: TravelProject;
  setProject: (project: TravelProject) => void;
  updateProject: (updater: (project: TravelProject) => TravelProject) => void;
  addCheckpoint: (checkpoint: Omit<TravelCheckpoint, "id">) => void;
  removeCheckpoint: (checkpointId: string) => void;
  reorderCheckpoints: (checkpoints: TravelCheckpoint[]) => void;
  setRoute: (route: TravelRouteResult | null) => void;
}

const initialProject: TravelProject = {
  id: nanoid(),
  name: "Untitled journey",
  start: null,
  destination: null,
  checkpoints: [],
  transportMode: "car",
  route: null,
  animation: {
    durationSeconds: 15,
    fps: 30,
    cameraMode: "cinematic",
  },
  vehicle: {
    assetUrl: "/vehicles/car-isometric.png",
    scale: 0.4,
  },
  routeStyle: {
    width: 9,
    completedColor: "#ef4444",
    remainingColor: "#cbd5e1",
  },
  checkpointStyle: {
    markerStyle: "numbered",
    showNames: true,
  },
  output: {
    width: 1080,
    height: 1920,
  },
};

export const useTravelProjectStore = create<TravelProjectStore>((set) => ({
  project: initialProject,
  setProject: (project) => {
    set({ project });
  },
  updateProject: (updater) => {
    set((state) => ({
      project: updater(state.project),
    }));
  },
  addCheckpoint: (checkpoint) => {
    set((state) => ({
      project: {
        ...state.project,
        checkpoints: [
          ...state.project.checkpoints,
          {
            ...checkpoint,
            id: nanoid(),
          },
        ],
      },
    }));
  },
  removeCheckpoint: (checkpointId) => {
    set((state) => ({
      project: {
        ...state.project,
        checkpoints: state.project.checkpoints.filter((checkpoint) => checkpoint.id !== checkpointId),
      },
    }));
  },
  reorderCheckpoints: (checkpoints) => {
    set((state) => ({
      project: {
        ...state.project,
        checkpoints,
      },
    }));
  },
  setRoute: (route) => {
    set((state) => ({
      project: {
        ...state.project,
        route,
      },
    }));
  },
}));
