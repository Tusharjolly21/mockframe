export type LngLat = [longitude: number, latitude: number];

export type TransportMode = "car" | "flight" | "train" | "boat" | "bike";

export type CheckpointRoutingMode = "required-stop" | "visual-only";

export interface TravelLocation {
  id: string;
  name: string;
  coordinates: LngLat;
  transportMode?: TransportMode;
}

export interface TravelCheckpoint extends TravelLocation {
  routingMode: CheckpointRoutingMode;
  type: "city" | "state" | "border" | "landmark" | "custom";
  pauseDurationSeconds: number;
  animation: {
    showLabel: boolean;
    cameraZoom: boolean;
    pulse: boolean;
  };
  calculated?: {
    routeProgress: number;
    snappedCoordinates: LngLat;
    distanceFromRouteKm: number;
  };
}

export interface TravelRouteResult {
  coordinates: LngLat[];
  distanceMeters: number;
  durationSeconds?: number;
}

export interface TravelProject {
  id: string;
  name: string;
  start: TravelLocation | null;
  destination: TravelLocation | null;
  checkpoints: TravelCheckpoint[];
  transportMode: TransportMode;
  route: TravelRouteResult | null;
  animation: {
    durationSeconds: number;
    fps: number;
    cameraMode: "overview" | "follow" | "cinematic";
  };
  vehicle: {
    assetUrl: string;
    scale: number;
  };
  routeStyle: {
    width: number;
    completedColor: string;
    remainingColor: string;
  };
  checkpointStyle: {
    markerStyle: "dot" | "pin" | "flag" | "numbered";
    showNames: boolean;
  };
  output: {
    width: number;
    height: number;
  };
}
