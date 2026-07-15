import { greatCircle, length, lineString, point } from "@turf/turf";
import type { LngLat, TravelRouteResult } from "../types/travel-project.types";

function createFlightSegment(start: LngLat, destination: LngLat): LngLat[] {
  const result = greatCircle(point(start), point(destination), {
    npoints: 128,
  });

  if (result.geometry.type === "LineString") {
    return result.geometry.coordinates as LngLat[];
  }
  return result.geometry.coordinates.flat() as LngLat[];
}

export function buildFlightRoute(locations: LngLat[]): TravelRouteResult {
  const coordinates: LngLat[] = [];

  for (let index = 0; index < locations.length - 1; index++) {
    const segment = createFlightSegment(locations[index], locations[index + 1]);

    if (index > 0) {
      segment.shift();
    }
    coordinates.push(...segment);
  }

  const distanceKm = length(lineString(coordinates), {
    units: "kilometers",
  });

  return {
    coordinates,
    distanceMeters: distanceKm * 1000,
  };
}
