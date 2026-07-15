"use client";

import { useDelayRender, useVideoConfig } from "remotion";
import { useEffect, useRef, useState } from "react";
import { featureCollection, lineString, point } from "@turf/turf";
import "maplibre-gl/dist/maplibre-gl.css";

import type { TravelProject } from "../types/travel-project.types";
import { calculateVehicleFrame } from "../engine/calculate-vehicle-frame";
import { getCompletedRoute } from "../engine/get-completed-route";
import { calculateCameraState } from "../engine/camera";

interface TravelMapProps {
  project: TravelProject;
  routeProgress: number;
  activeCheckpointId: string | null;
}

export function TravelMap({
  project,
  routeProgress,
  activeCheckpointId,
}: TravelMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const { width, height } = useVideoConfig();
  const { delayRender, continueRender } = useDelayRender();
  const [renderHandle] = useState(() => delayRender("Loading travel map"));

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current || !project.route || !project.start) {
      return;
    }

    let isMounted = true;
    let mapInstance: any = null;
    let markerInstance: any = null;

    // Load MapLibre GL dynamically to ensure no server-side execution crashes
    import("maplibre-gl").then((maplibregl) => {
      if (!isMounted || !containerRef.current || !project.start) return;

      let styleUrl =
        process.env.NEXT_PUBLIC_MAP_STYLE_URL ??
        "https://demotiles.maplibre.org/style.json";

      if (styleUrl.startsWith("/")) {
        const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
        styleUrl = `${origin}${styleUrl}`;
      }

      const map = new maplibregl.default.Map({
        container: containerRef.current,
        style: styleUrl,
        center: project.start.coordinates,
        zoom: 5,
        pitch: 50,
        bearing: 0,
        interactive: false,
        attributionControl: false,
        fadeDuration: 0,
        canvasContextAttributes: {
          preserveDrawingBuffer: true,
          antialias: true,
        },
      });

      const vehicleElement = document.createElement("div");
      vehicleElement.className = "mockframe-vehicle";
      const image = document.createElement("img");
      image.crossOrigin = "anonymous";
      
      const cleanImg = () => {
        const src = image.src;
        if (image.dataset.cleanSrc === src) return;
        if (src.startsWith("data:")) return;

        if (src.endsWith(".png") || src.endsWith(".jpg") || src.endsWith(".jpeg") || src.includes("isometric")) {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(image, 0, 0);
              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const data = imgData.data;
              for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                // Make solid black background pixels (RGB < 40) fully transparent
                if (r < 40 && g < 40 && b < 40) {
                  data[i + 3] = 0;
                }
              }
              ctx.putImageData(imgData, 0, 0);
              const dataUrl = canvas.toDataURL();
              image.dataset.cleanSrc = dataUrl;
              image.src = dataUrl;
            }
          } catch (e) {
            console.error("Canvas cleaning failed:", e);
          }
        }
      };

      image.onload = cleanImg;
      image.src = project.vehicle.assetUrl;
      image.alt = "";
      
      const scale = project.vehicle.scale || 1;
      const size = project.vehicle.assetUrl.includes("isometric") ? 64 : 48;
      image.style.width = `${size * scale}px`;
      image.style.height = `${size * scale}px`;
      image.style.objectFit = "contain";
      image.style.filter = "drop-shadow(0px 8px 12px rgba(0, 0, 0, 0.45))";
      vehicleElement.appendChild(image);

      const vehicleMarker = new maplibregl.default.Marker({
        element: vehicleElement,
        rotationAlignment: "map",
        pitchAlignment: "map",
      })
        .setLngLat(project.start.coordinates)
        .addTo(map);

      mapRef.current = map;
      markerRef.current = vehicleMarker;
      mapInstance = map;
      markerInstance = vehicleMarker;

      map.on("load", () => {
        if (!isMounted || !project.route) return;

        map.addSource("full-route", {
          type: "geojson",
          data: lineString(project.route.coordinates),
        });

        map.addLayer({
          id: "full-route",
          type: "line",
          source: "full-route",
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
          paint: {
            "line-width": project.routeStyle.width,
            "line-color": project.routeStyle.remainingColor,
            "line-opacity": 0.55,
          },
        });

        map.addSource("completed-route", {
          type: "geojson",
          data: lineString([project.route.coordinates[0], project.route.coordinates[0]]),
        });

        map.addLayer({
          id: "completed-route",
          type: "line",
          source: "completed-route",
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
          paint: {
            "line-width": project.routeStyle.width,
            "line-color": project.routeStyle.completedColor,
          },
        });

        const checkpointFeatures = project.checkpoints.map((checkpoint) =>
          point(checkpoint.coordinates, {
            id: checkpoint.id,
            name: checkpoint.name,
            active: false,
            reached: false,
          })
        );

        map.addSource("checkpoints", {
          type: "geojson",
          data: featureCollection(checkpointFeatures),
        });

        map.addLayer({
          id: "checkpoint-circles",
          type: "circle",
          source: "checkpoints",
          paint: {
            "circle-radius": [
              "case",
              ["==", ["get", "active"], true],
              11,
              7,
            ],
            "circle-color": [
              "case",
              ["==", ["get", "active"], true],
              "#ffffff",
              ["==", ["get", "reached"], true],
              "#22c55e",
              "#111827",
            ],
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
          },
        });

        map.addLayer({
          id: "checkpoint-labels",
          type: "symbol",
          source: "checkpoints",
          layout: {
            "text-field": ["get", "name"],
            "text-size": 13,
            "text-offset": [0, 1.7],
            "text-anchor": "top",
          },
          paint: {
            "text-color": "#ffffff",
            "text-halo-color": "#111827",
            "text-halo-width": 2,
          },
        });

        map.once("idle", () => {
          if (isMounted) {
            continueRender(renderHandle);
          }
        });
      });
    });

    return () => {
      isMounted = false;
      if (markerInstance) {
        markerInstance.remove();
      }
      if (mapInstance) {
        mapInstance.remove();
      }
      markerRef.current = null;
      mapRef.current = null;
    };
  }, [project.route, project.start, renderHandle, continueRender]);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;

    if (!map || !marker || !project.route) {
      return;
    }

    const vehicle = calculateVehicleFrame(project.route.coordinates, routeProgress);

    // Determine active segment transport mode based on route progress
    let activeMode = project.start?.transportMode ?? project.transportMode;
    const sortedCheckpoints = [...project.checkpoints].sort(
      (a, b) => (a.calculated?.routeProgress ?? 0) - (b.calculated?.routeProgress ?? 0)
    );
    for (const cp of sortedCheckpoints) {
      const threshold = cp.calculated?.routeProgress ?? 0;
      if (routeProgress >= threshold) {
        if (cp.transportMode) {
          activeMode = cp.transportMode;
        }
      }
    }

    const assets = {
      car: "/vehicles/car-isometric.png",
      flight: "/vehicles/plane-isometric.png",
      train: "/vehicles/train-isometric.png",
      boat: "/vehicles/boat-isometric.png",
      bike: "/vehicles/family-car-isometric.png",
    };
    const activeAssetUrl = assets[activeMode as keyof typeof assets] || project.vehicle.assetUrl;

    const isIsometric = activeAssetUrl.includes("isometric");
    const rotationOffset = isIsometric ? 135 : 0;
    marker.setLngLat(vehicle.coordinates).setRotation(vehicle.bearing + rotationOffset);

    // Update marker image dimensions and source reactively
    const imgEl = marker.getElement().querySelector("img");
    if (imgEl) {
      // Resolve absolute paths for verification
      const resolvedTarget = activeAssetUrl.startsWith("/") 
        ? `${typeof window !== "undefined" ? window.location.origin : ""}${activeAssetUrl}` 
        : activeAssetUrl;

      if (imgEl.src !== resolvedTarget && imgEl.dataset.cleanSrc !== resolvedTarget) {
        imgEl.src = activeAssetUrl;
      }

      const scale = project.vehicle.scale || 1;
      const size = isIsometric ? 64 : 48;
      const newWidth = `${size * scale}px`;
      const newHeight = `${size * scale}px`;
      if (imgEl.style.width !== newWidth) {
        imgEl.style.width = newWidth;
        imgEl.style.height = newHeight;
      }
    }

    const completedSource = map.getSource("completed-route");
    if (completedSource) {
      completedSource.setData(getCompletedRoute(project.route.coordinates, routeProgress));
    }

    const checkpointSource = map.getSource("checkpoints");
    if (checkpointSource) {
      checkpointSource.setData(
        featureCollection(
          project.checkpoints.map((checkpoint) => {
            const checkpointProgress = checkpoint.calculated?.routeProgress ?? 0;
            return point(checkpoint.coordinates, {
              id: checkpoint.id,
              name: checkpoint.name,
              active: checkpoint.id === activeCheckpointId,
              reached: routeProgress >= checkpointProgress,
            });
          })
        )
      );
    }

    const camera = calculateCameraState({
      vehicleCoordinates: vehicle.coordinates,
      vehicleBearing: vehicle.bearing,
      routeProgress,
      activeCheckpoint: activeCheckpointId !== null,
    });

    map.jumpTo({
      center: camera.center,
      bearing: camera.bearing,
      zoom: camera.zoom,
      pitch: camera.pitch,
    });
  }, [project.route, project.checkpoints, routeProgress, activeCheckpointId]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        inset: 0,
        width,
        height,
      }}
    />
  );
}
