"use client";

import React from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, MapPin, Eye, Zap, Camera } from "lucide-react";
import type { TravelCheckpoint } from "../types/travel-project.types";

interface CheckpointListProps {
  checkpoints: TravelCheckpoint[];
  onUpdateCheckpoint: (id: string, updates: Partial<TravelCheckpoint>) => void;
  onRemoveCheckpoint: (id: string) => void;
  onReorderCheckpoints: (checkpoints: TravelCheckpoint[]) => void;
}

function arrayMove<T>(array: T[], from: number, to: number): T[] {
  const newArray = [...array];
  const [removed] = newArray.splice(from, 1);
  newArray.splice(to, 0, removed);
  return newArray;
}

export function CheckpointList({
  checkpoints,
  onUpdateCheckpoint,
  onRemoveCheckpoint,
  onReorderCheckpoints,
}: CheckpointListProps) {
  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = checkpoints.findIndex((i) => i.id === active.id);
      const newIndex = checkpoints.findIndex((i) => i.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(checkpoints, oldIndex, newIndex);
        onReorderCheckpoints(reordered);
      }
    }
  };

  const checkpointIds = checkpoints.map((c) => c.id);

  return (
    <div className="w-full">
      <span className="block mb-2 text-xs font-semibold text-[#6b6b76] uppercase tracking-wider">
        Checkpoints & Stops ({checkpoints.length})
      </span>

      {checkpoints.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-[#e4e4ec] rounded-xl text-xs text-[#9a9aa4] bg-[#fafafc]">
          No checkpoints added yet. Search locations above to add.
        </div>
      ) : (
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={checkpointIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-2.5">
              {checkpoints.map((checkpoint) => (
                <SortableCheckpointItem
                  key={checkpoint.id}
                  checkpoint={checkpoint}
                  onUpdate={(updates) => onUpdateCheckpoint(checkpoint.id, updates)}
                  onRemove={() => onRemoveCheckpoint(checkpoint.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function SortableCheckpointItem({
  checkpoint,
  onUpdate,
  onRemove,
}: {
  checkpoint: TravelCheckpoint;
  onUpdate: (updates: Partial<TravelCheckpoint>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: checkpoint.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform) || undefined,
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col p-3 bg-white border border-[#e4e4ec] rounded-xl shadow-xs transition-shadow hover:shadow-sm"
    >
      <div className="flex items-start gap-2">
        {/* Drag Handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-[#9a9aa4] hover:text-[#5c5c66] transition-colors shrink-0"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-[#3b82f6] shrink-0" />
            <h4 className="text-xs font-semibold text-[#17171c] truncate">{checkpoint.name}</h4>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {/* Routing Mode */}
            <div>
              <label className="block text-[10px] text-[#6b6b76] mb-0.5">Routing</label>
              <select
                value={checkpoint.routingMode}
                onChange={(e) => onUpdate({ routingMode: e.target.value as any })}
                className="w-full h-7 px-1 text-[10px] bg-white border border-[#e4e4ec] rounded-md focus:outline-none focus:border-[#3b82f6]"
              >
                <option value="required-stop">Required</option>
                <option value="visual-only">Visual</option>
              </select>
            </div>

            {/* Transport Mode */}
            <div>
              <label className="block text-[10px] text-[#6b6b76] mb-0.5">Transport</label>
              <select
                value={checkpoint.transportMode || ""}
                onChange={(e) => onUpdate({ transportMode: e.target.value ? e.target.value as any : undefined })}
                className="w-full h-7 px-1 text-[10px] bg-white border border-[#e4e4ec] rounded-md focus:outline-none focus:border-[#3b82f6]"
              >
                <option value="">Inherit</option>
                <option value="car">Car</option>
                <option value="flight">Plane</option>
                <option value="train">Train</option>
                <option value="boat">Boat</option>
                <option value="bike">Family Car</option>
              </select>
            </div>

            {/* Pause Duration */}
            <div>
              <label className="block text-[10px] text-[#6b6b76] mb-0.5">Pause (s)</label>
              <input
                type="number"
                min={0}
                max={20}
                step={0.5}
                value={checkpoint.pauseDurationSeconds}
                onChange={(e) => onUpdate({ pauseDurationSeconds: Number(e.target.value) })}
                className="w-full h-7 px-1 text-[10px] bg-white border border-[#e4e4ec] rounded-md focus:outline-none focus:border-[#3b82f6]"
              />
            </div>
          </div>

          {/* Animation toggles */}
          <div className="mt-2.5 flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                onUpdate({
                  animation: { ...checkpoint.animation, showLabel: !checkpoint.animation.showLabel },
                })
              }
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                checkpoint.animation.showLabel
                  ? "bg-[#eff6ff] text-[#3b82f6] border-[#bfdbfe]"
                  : "bg-transparent text-[#6b6b76] border-[#e4e4ec]"
              }`}
            >
              <Eye className="h-3 w-3" />
              <span>Label</span>
            </button>

            <button
              type="button"
              onClick={() =>
                onUpdate({
                  animation: { ...checkpoint.animation, cameraZoom: !checkpoint.animation.cameraZoom },
                })
              }
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                checkpoint.animation.cameraZoom
                  ? "bg-[#f0fdf4] text-[#22c55e] border-[#bbf7d0]"
                  : "bg-transparent text-[#6b6b76] border-[#e4e4ec]"
              }`}
            >
              <Camera className="h-3 w-3" />
              <span>Zoom</span>
            </button>

            <button
              type="button"
              onClick={() =>
                onUpdate({
                  animation: { ...checkpoint.animation, pulse: !checkpoint.animation.pulse },
                })
              }
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                checkpoint.animation.pulse
                  ? "bg-[#faf5ff] text-[#a855f7] border-[#f3e8ff]"
                  : "bg-transparent text-[#6b6b76] border-[#e4e4ec]"
              }`}
            >
              <Zap className="h-3 w-3" />
              <span>Pulse</span>
            </button>
          </div>
        </div>

        {/* Delete */}
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 text-[#9a9aa4] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
