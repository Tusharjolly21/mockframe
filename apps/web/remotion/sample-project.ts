import type { TravelProject } from "@/features/travel-route/types/travel-project.types";

export const sampleProject: TravelProject = {
  id: "sample-id",
  name: "Sample Journey",
  start: {
    id: "delhi",
    name: "Delhi, India",
    coordinates: [77.209, 28.6139],
  },
  destination: {
    id: "jaipur",
    name: "Jaipur, Rajasthan, India",
    coordinates: [75.7873, 26.9124],
  },
  checkpoints: [],
  transportMode: "car",
  route: {
    coordinates: [
      [77.209, 28.6139],
      [76.5, 27.5],
      [75.7873, 26.9124],
    ],
    distanceMeters: 270000,
  },
  animation: {
    durationSeconds: 10,
    fps: 30,
    cameraMode: "follow",
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
