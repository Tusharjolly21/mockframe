import type { LngLat, TravelRouteResult } from "../types/travel-project.types";

interface BuildRoadRouteInput {
  start: LngLat;
  destination: LngLat;
  requiredCheckpoints: LngLat[];
}

export async function buildRoadRoute(input: BuildRoadRouteInput): Promise<TravelRouteResult> {
  const response = await fetch("/api/travel/route", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      start: input.start,
      destination: input.destination,
      checkpoints: input.requiredCheckpoints,
    }),
  });

  const text = await response.text();
  let data: any = {};
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(`Server returned HTTP ${response.status}: ${text || "Internal Server Error"}`);
  }

  if (!response.ok) {
    throw new Error(data.error ?? "Route calculation failed.");
  }

  return data;
}
