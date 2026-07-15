"use client";

import React, { useState } from "react";
import { useTravelProjectStore } from "../store/travel-project-store";
import { generateProjectRoute } from "../store/routing-action";
import { LocationSearch } from "./LocationSearch";
import { CheckpointList } from "./CheckpointList";
import { TravelRoutePreview } from "./TravelRoutePreview";
import {
  Car,
  Plane,
  Train,
  Ship,
  Bike,
  Plus,
  Play,
  RotateCcw,
  Sparkles,
  Download,
  Loader2,
  FileVideo,
} from "lucide-react";

export function TravelRouteEditor() {
  const { project, updateProject, addCheckpoint, removeCheckpoint, reorderCheckpoints, setProject } =
    useTravelProjectStore();

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportUrl, setExportUrl] = useState<string | null>(null);

  const handleStartSelect = (loc: any) => {
    updateProject((prev) => ({
      ...prev,
      start: {
        id: loc.id,
        name: loc.name,
        coordinates: loc.coordinates,
      },
    }));
  };

  const handleDestSelect = (loc: any) => {
    updateProject((prev) => ({
      ...prev,
      destination: {
        id: loc.id,
        name: loc.name,
        coordinates: loc.coordinates,
      },
    }));
  };

  const handleAddCheckpointSelect = (loc: any) => {
    addCheckpoint({
      name: loc.name,
      coordinates: loc.coordinates,
      routingMode: "required-stop",
      type: "custom",
      pauseDurationSeconds: 1.5,
      animation: {
        showLabel: true,
        cameraZoom: true,
        pulse: true,
      },
    });
  };

  const handleUpdateCheckpoint = (id: string, updates: any) => {
    updateProject((prev) => ({
      ...prev,
      checkpoints: prev.checkpoints.map((cp) => (cp.id === id ? { ...cp, ...updates } : cp)),
    }));
  };

  const handleGenerate = async () => {
    if (!project.start || !project.destination) {
      setError("Please specify both a starting point and a destination.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const updated = await generateProjectRoute(project);
      setProject(updated);
    } catch (err: any) {
      setError(err.message || "Failed to calculate GPS route. Check network coordinates.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!project.route) {
      setError("Generate a valid route path before exporting.");
      return;
    }
    setExporting(true);
    setError(null);
    setExportUrl(null);
    try {
      const response = await fetch("/api/travel/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(project),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Programmatic render failed.");
      setExportUrl(data.url);
    } catch (err: any) {
      setError(err.message || "Export process hit a resource limitation.");
    } finally {
      setExporting(false);
    }
  };

  const handleTransportChange = (mode: any) => {
    const assets = {
      car: "/vehicles/car-isometric.png",
      flight: "/vehicles/plane-isometric.png",
      train: "/vehicles/train-isometric.png",
      boat: "/vehicles/boat-isometric.png",
      bike: "/vehicles/family-car-isometric.png",
    };
    updateProject((prev) => ({
      ...prev,
      transportMode: mode,
      vehicle: {
        ...prev.vehicle,
        assetUrl: assets[mode as keyof typeof assets],
      },
    }));
  };

  return (
    <div className="flex h-screen bg-[#fafafc] overflow-hidden">
      {/* Sidebar Controls */}
      <div className="w-[420px] bg-white border-r border-[#e4e4ec] flex flex-col h-full shrink-0">
        <div className="p-4 border-b border-[#f1f1f5] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#3b82f6]" />
            <h1 className="text-base font-bold text-[#17171c]">Travel Route Animator</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Journey Path */}
          <div className="space-y-3.5">
            <LocationSearch
              label="Starting Location"
              placeholder="e.g. Delhi, New York"
              onSelect={handleStartSelect}
              initialValue={project.start?.name || ""}
            />

            <LocationSearch
              label="Destination"
              placeholder="e.g. Mumbai, Los Angeles"
              onSelect={handleDestSelect}
              initialValue={project.destination?.name || ""}
            />
          </div>

          {/* Transport mode */}
          <div>
            <span className="block mb-2 text-xs font-semibold text-[#6b6b76] uppercase tracking-wider">
              Transport mode
            </span>
            <div className="grid grid-cols-5 gap-1.5">
              {([
                ["car", "Tesla Car"],
                ["flight", "Plane"],
                ["train", "Bullet Train"],
                ["boat", "Sailboat"],
                ["bike", "Family Car"],
              ] as const).map(([mode, label]) => {
                const assets = {
                  car: "/vehicles/car-isometric.png",
                  flight: "/vehicles/plane-isometric.png",
                  train: "/vehicles/train-isometric.png",
                  boat: "/vehicles/boat-isometric.png",
                  bike: "/vehicles/family-car-isometric.png",
                };
                const imgSrc = assets[mode];

                return (
                  <button
                    key={mode}
                    type="button"
                    title={label}
                    onClick={() => handleTransportChange(mode)}
                    className={`flex flex-col items-center justify-center p-1.5 rounded-xl border text-[9px] font-bold transition-all ${
                      project.transportMode === mode
                        ? "bg-[#eff6ff] text-[#3b82f6] border-[#3b82f6] shadow-xs"
                        : "bg-white text-[#5c5c66] border-[#e4e4ec] hover:bg-[#f8f8fb]"
                    }`}
                  >
                    <div className="h-10 w-10 flex items-center justify-center overflow-hidden mb-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imgSrc}
                        alt={label}
                        className="max-h-full max-w-full object-contain filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.15)] animate-fade-in"
                      />
                    </div>
                    <span className="truncate w-full text-center leading-tight">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Add Checkpoints Lookup */}
          <div>
            <LocationSearch
              label="Add Checkpoint"
              placeholder="Search stop to insert..."
              onSelect={handleAddCheckpointSelect}
            />
          </div>

          {/* Checkpoints list */}
          <CheckpointList
            checkpoints={project.checkpoints}
            onUpdateCheckpoint={handleUpdateCheckpoint}
            onRemoveCheckpoint={removeCheckpoint}
            onReorderCheckpoints={reorderCheckpoints}
          />

          {/* Stylings config */}
          <div className="rounded-xl border border-[#e7e7ee] bg-[#f8f8fb] p-3 space-y-3.5">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#7d7d88]">
              Styles & Options
            </span>

            {/* Model size */}
            <div>
              <div className="flex justify-between text-[10px] text-[#6b6b76] mb-1">
                <span>Model size</span>
                <span>{project.vehicle.scale}</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={2.0}
                step={0.05}
                value={project.vehicle.scale}
                onChange={(e) =>
                  updateProject((prev) => ({
                    ...prev,
                    vehicle: { ...prev.vehicle, scale: Number(e.target.value) },
                  }))
                }
                className="w-full h-1.5 bg-[#e4e4ec] rounded-lg appearance-none cursor-pointer accent-[#3b82f6]"
              />
            </div>

            {/* Animation duration */}
            <div>
              <div className="flex justify-between text-[10px] text-[#6b6b76] mb-1">
                <span>Duration</span>
                <span>{project.animation.durationSeconds}s</span>
              </div>
              <input
                type="range"
                min={3}
                max={60}
                value={project.animation.durationSeconds}
                onChange={(e) =>
                  updateProject((prev) => ({
                    ...prev,
                    animation: { ...prev.animation, durationSeconds: Number(e.target.value) },
                  }))
                }
                className="w-full h-1.5 bg-[#e4e4ec] rounded-lg appearance-none cursor-pointer accent-[#3b82f6]"
              />
            </div>

            {/* Route width */}
            <div>
              <div className="flex justify-between text-[10px] text-[#6b6b76] mb-1">
                <span>Trail Width</span>
                <span>{project.routeStyle.width}px</span>
              </div>
              <input
                type="range"
                min={2}
                max={15}
                value={project.routeStyle.width}
                onChange={(e) =>
                  updateProject((prev) => ({
                    ...prev,
                    routeStyle: { ...prev.routeStyle, width: Number(e.target.value) },
                  }))
                }
                className="w-full h-1.5 bg-[#e4e4ec] rounded-lg appearance-none cursor-pointer accent-[#3b82f6]"
              />
            </div>

            {/* Route Colors */}
            <div className="grid grid-cols-2 gap-2">
              <label>
                <span className="block text-[10px] text-[#6b6b76] mb-1">Trail Completed</span>
                <input
                  type="color"
                  value={project.routeStyle.completedColor}
                  onChange={(e) =>
                    updateProject((prev) => ({
                      ...prev,
                      routeStyle: { ...prev.routeStyle, completedColor: e.target.value },
                    }))
                  }
                  className="h-8 w-full cursor-pointer rounded-lg border border-[#e4e4ec] bg-white p-1"
                />
              </label>

              <label>
                <span className="block text-[10px] text-[#6b6b76] mb-1">Trail Remaining</span>
                <input
                  type="color"
                  value={project.routeStyle.remainingColor}
                  onChange={(e) =>
                    updateProject((prev) => ({
                      ...prev,
                      routeStyle: { ...prev.routeStyle, remainingColor: e.target.value },
                    }))
                  }
                  className="h-8 w-full cursor-pointer rounded-lg border border-[#e4e4ec] bg-white p-1"
                />
              </label>
            </div>
          </div>

          {/* Action triggers */}
          <div className="space-y-2 pt-2">
            {error && <div className="text-xs text-red-500 bg-red-50 border border-red-200 p-3 rounded-xl">{error}</div>}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="w-full h-11 bg-[#3b82f6] hover:bg-[#2563eb] disabled:bg-[#93c5fd] text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  <span>Calculating route...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="h-4.5 w-4.5" />
                  <span>Generate Journey Route</span>
                </>
              )}
            </button>

            {project.route && (
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                className="w-full h-11 bg-[#111827] hover:bg-[#1f2937] disabled:bg-[#4b5563] text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-colors"
              >
                {exporting ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    <span>Rendering video (Remotion)...</span>
                  </>
                ) : (
                  <>
                    <FileVideo className="h-4.5 w-4.5" />
                    <span>Export Journey Video (MP4)</span>
                  </>
                )}
              </button>
            )}

            {exportUrl && (
              <a
                href={exportUrl}
                download
                className="w-full h-11 bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors decoration-none"
              >
                <Download className="h-4.5 w-4.5" />
                <span>Download Journey Video</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Main Workspace Preview */}
      <div className="flex-1 bg-[#f1f1f5] p-6 flex flex-col justify-center items-center h-full relative overflow-y-auto">
        {project.route ? (
          <div className="w-full max-w-[500px]">
            <TravelRoutePreview project={project} />
          </div>
        ) : (
          <div className="text-center p-8 bg-white border border-[#e4e4ec] rounded-2xl max-w-sm shadow-sm">
            <Play className="h-10 w-10 text-[#3b82f6] mx-auto mb-3" />
            <h3 className="text-sm font-bold text-[#17171c] mb-1">Animation workspace empty</h3>
            <p className="text-xs text-[#6b6b76] leading-relaxed">
              Set starting coordinates, target destination, add required visual checkpoints and click{" "}
              <strong>Generate Journey Route</strong> to calculate paths.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
export default TravelRouteEditor;
