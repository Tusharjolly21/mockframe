import { length, lineSliceAlong, lineString } from "@turf/turf";
import type { LngLat } from "../types/travel-project.types";

export function getCompletedRoute(coordinates: LngLat[], progress: number) {
  const route = lineString(coordinates);
  const totalKm = length(route, {
    units: "kilometers",
  });

  const safeProgress = Math.max(0.00001, Math.min(progress, 1));

  return lineSliceAlong(route, 0, totalKm * safeProgress, {
    units: "kilometers",
  });
}
