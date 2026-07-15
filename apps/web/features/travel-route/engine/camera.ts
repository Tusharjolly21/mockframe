import type { LngLat } from "../types/travel-project.types";

export interface CameraState {
  center: LngLat;
  zoom: number;
  pitch: number;
  bearing: number;
}

interface CameraInput {
  vehicleCoordinates: LngLat;
  vehicleBearing: number;
  routeProgress: number;
  activeCheckpoint: boolean | null;
}

export function calculateCameraState({
  vehicleCoordinates,
  routeProgress,
  activeCheckpoint,
}: CameraInput): CameraState {
  // Keep bearing fixed at 0 to prevent the map from spinning/revolving disorientingly
  const defaultBearing = 0;

  if (routeProgress < 0.08) {
    return {
      center: vehicleCoordinates,
      zoom: 9.0, // High-quality close follow zoom
      pitch: 45,
      bearing: defaultBearing,
    };
  }

  if (routeProgress > 0.92) {
    return {
      center: vehicleCoordinates,
      zoom: 10.0,
      pitch: 45,
      bearing: defaultBearing,
    };
  }

  if (activeCheckpoint) {
    return {
      center: vehicleCoordinates,
      zoom: 10.5, // Extra close zoom on arrival cards
      pitch: 50,
      bearing: defaultBearing,
    };
  }

  return {
    center: vehicleCoordinates,
    zoom: 9.5,
    pitch: 45,
    bearing: defaultBearing,
  };
}
