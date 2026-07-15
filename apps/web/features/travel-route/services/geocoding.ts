import type { LngLat } from "../types/travel-project.types";

export interface LocationSearchResult {
  id: string;
  name: string;
  coordinates: LngLat;
  type: string;
}

export async function searchLocations(query: string): Promise<LocationSearchResult[]> {
  const response = await fetch(`/api/travel/geocode?q=${encodeURIComponent(query)}`);
  const text = await response.text();
  let data: any = {};
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(`Server returned HTTP ${response.status}: ${text || "Internal Server Error"}`);
  }

  if (!response.ok) {
    throw new Error(data.error ?? "Unable to search locations.");
  }

  return data.results;
}
