import { along, bearing, length, lineString } from "@turf/turf";
import type { LngLat } from "../types/travel-project.types";

export interface VehicleFrame {
  coordinates: LngLat;
  bearing: number;
}

export function calculateVehicleFrame(
  routeCoordinates: LngLat[],
  routeProgress: number
): VehicleFrame {
  const route = lineString(routeCoordinates);
  const totalDistanceKm = length(route, {
    units: "kilometers",
  });

  const safeProgress = Math.max(0, Math.min(routeProgress, 1));
  const currentDistance = totalDistanceKm * safeProgress;
  const previousDistance = Math.max(0, currentDistance - 0.05);

  const currentPoint = along(route, currentDistance, {
    units: "kilometers",
  });

  const previousPoint = along(route, previousDistance, {
    units: "kilometers",
  });

  return {
    coordinates: currentPoint.geometry.coordinates as LngLat,
    bearing: safeProgress === 0 ? 0 : bearing(previousPoint, currentPoint),
  };
}
