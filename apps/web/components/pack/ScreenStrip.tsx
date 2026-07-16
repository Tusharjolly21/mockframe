"use client";

import { useRef, useState } from "react";
import { resolveAsset } from "@/lib/assets";
import { usePackStore } from "@/lib/pack/store";

/** Left rail: one thumbnail per screen, multi-file add, drag (or buttons) to reorder. */
export function ScreenStrip() {
  const { pack, activeScreenId, setActiveScreen, addFiles, removeScreenById, moveScreenById } = usePackStore();
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const step = from < to ? 1 : -1;
    let id = pack.screens[from].id;
    for (let i = from; i !== to; i += step) moveScreenById(id, step as 1 | -1);
  };

  return (
    <aside className="flex w-40 shrink-0 flex-col gap-2 overflow-y-auto border-r border-white/10 bg-[#101014] p-3">
      {pack.screens.map((screen, i) => {
        const asset = screen.assetId ? resolveAsset(screen.assetId) : undefined;
        return (
          <div
            key={screen.id}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => dragIndex !== null && (reorder(dragIndex, i), setDragIndex(null))}
            onClick={() => setActiveScreen(screen.id)}
            className={`group relative cursor-pointer rounded-lg border p-1 transition ${
              screen.id === activeScreenId ? "border-violet-500 bg-violet-500/10" : "border-white/10 hover:border-white/25"
            }`}
          >
            <div className="flex aspect-[9/19] items-center justify-center overflow-hidden rounded-md bg-black/40">
              {asset ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={asset.url} alt={`Screen ${i + 1}`} className="h-full w-full object-cover" />
              ) : (
                <span className="px-2 text-center text-[11px] text-white/40">Drop a screenshot</span>
              )}
            </div>
            <div className="mt-1 flex items-center justify-between px-0.5 text-[11px] text-white/50">
              <span>{String(i + 1).padStart(2, "0")}</span>
              <span className="hidden gap-1 group-hover:flex">
                <button aria-label="Move up" onClick={(e) => { e.stopPropagation(); moveScreenById(screen.id, -1); }}>↑</button>
                <button aria-label="Move down" onClick={(e) => { e.stopPropagation(); moveScreenById(screen.id, 1); }}>↓</button>
                <button aria-label="Remove" onClick={(e) => { e.stopPropagation(); removeScreenById(screen.id); }}>×</button>
              </span>
            </div>
          </div>
        );
      })}
      <button
        onClick={() => fileInput.current?.click()}
        className="rounded-lg border border-dashed border-white/20 py-3 text-sm text-white/60 transition hover:border-violet-400 hover:text-white"
      >
        + Add screenshots
      </button>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void addFiles(Array.from(e.target.files));
          e.target.value = "";
        }}
      />
    </aside>
  );
}
