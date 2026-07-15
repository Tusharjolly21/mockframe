import { buildRoadRoute } from "../services/routing";
import { buildFlightRoute } from "../engine/build-flight-route";
import { calculateCheckpointProgress } from "../engine/calculate-checkpoints";
import type { TravelProject } from "../types/travel-project.types";

export async function generateProjectRoute(project: TravelProject): Promise<TravelProject> {
  if (!project.start || !project.destination) {
    throw new Error("Start and destination are required.");
  }

  const requiredStops = project.checkpoints.filter((checkpoint) => checkpoint.routingMode === "required-stop");
  const pathStops = [project.start, ...requiredStops, project.destination];

  const coordinates: [number, number][] = [];
  let totalDistanceMeters = 0;

  for (let i = 0; i < pathStops.length - 1; i++) {
    const startLoc = pathStops[i];
    const endLoc = pathStops[i + 1];
    
    // Segment transport mode: use checkpoint custom override, or fallback to project global transport mode
    const mode = ("transportMode" in startLoc && startLoc.transportMode) 
      ? startLoc.transportMode 
      : project.transportMode;

    let segmentRoute;
    if (mode === "flight") {
      segmentRoute = buildFlightRoute([startLoc.coordinates, endLoc.coordinates]);
    } else {
      try {
        segmentRoute = await buildRoadRoute({
          start: startLoc.coordinates,
          destination: endLoc.coordinates,
          requiredCheckpoints: [],
        });
      } catch (e) {
        console.warn("Road routing segment failed, falling back to flight path:", e);
        segmentRoute = buildFlightRoute([startLoc.coordinates, endLoc.coordinates]);
      }
    }

    const segCoords = segmentRoute.coordinates;
    if (coordinates.length > 0 && segCoords.length > 0) {
      // Avoid duplicating the connection junction coordinate
      coordinates.pop();
    }
    coordinates.push(...segCoords);
    totalDistanceMeters += segmentRoute.distanceMeters;
  }

  const route = {
    coordinates,
    distanceMeters: totalDistanceMeters,
  };

  const checkpoints = calculateCheckpointProgress(route.coordinates, project.checkpoints);

  return {
    ...project,
    route,
    checkpoints,
  };
}
