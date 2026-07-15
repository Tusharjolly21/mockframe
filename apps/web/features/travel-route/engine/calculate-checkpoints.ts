import { length, lineString, nearestPointOnLine, point } from "@turf/turf";
import type { LngLat, TravelCheckpoint } from "../types/travel-project.types";

export function calculateCheckpointProgress(
  routeCoordinates: LngLat[],
  checkpoints: TravelCheckpoint[]
): TravelCheckpoint[] {
  const route = lineString(routeCoordinates);
  const totalDistanceKm = length(route, {
    units: "kilometers",
  });

  return checkpoints
    .map((checkpoint) => {
      const snapped = nearestPointOnLine(route, point(checkpoint.coordinates), {
        units: "kilometers",
      });

      const locationKm = Number(snapped.properties.location ?? 0);
      const distanceFromRouteKm = Number(snapped.properties.dist ?? 0);

      return {
        ...checkpoint,
        calculated: {
          routeProgress: totalDistanceKm === 0 ? 0 : locationKm / totalDistanceKm,
          snappedCoordinates: snapped.geometry.coordinates as LngLat,
          distanceFromRouteKm,
        },
      };
    })
    .sort(
      (first, second) =>
        (first.calculated?.routeProgress ?? 0) - (second.calculated?.routeProgress ?? 0)
    );
}
