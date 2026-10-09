"use client";

import { useRef, useState } from "react";
import { resolveAsset } from "@/lib/assets";
import { usePackStore } from "@/lib/pack/store";

/** Left rail: one thumbnail per screen, multi-file add, drag (or buttons) to reorder. */
export function ScreenStrip() {
  const { pack, activeScreenId, setActiveScreen, addFiles, replaceScreenFile, removeScreenById, moveScreenById } = usePackStore();
  const replaceInput = useRef<HTMLInputElement>(null);
  const replaceFor = useRef<string | null>(null);
  const pickFor = (id: string) => {
    replaceFor.current = id;
    replaceInput.current?.click();
  };
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const step = from < to ? 1 : -1;
    const id = pack.screens[from].id;
    for (let i = from; i !== to; i += step) moveScreenById(id, step as 1 | -1);
  };

  return (
    <aside className="flex w-full shrink-0 gap-2 overflow-x-auto border-b border-white/10 bg-[#101014] p-3 md:w-40 md:flex-col md:overflow-y-auto md:overflow-x-hidden md:border-b-0 md:border-r">
      {pack.screens.map((screen, i) => {
        const asset = screen.assetId ? resolveAsset(screen.assetId) : undefined;
        return (
          <div
            key={screen.id}
            role="button"
            tabIndex={0}
            draggable
            onDragStart={(e) => { e.dataTransfer.setData("text/plain", String(i)); setDragIndex(i); }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              // an image dropped on a screen replaces its screenshot; a dragged thumbnail reorders
              const file = e.dataTransfer.files?.[0];
              if (file) {
                e.preventDefault();
                e.stopPropagation();
                void replaceScreenFile(screen.id, file);
                return;
              }
              if (dragIndex !== null) {
                reorder(dragIndex, i);
                setDragIndex(null);
              }
            }}
            onClick={() => {
              setActiveScreen(screen.id);
              if (!screen.assetId) pickFor(screen.id);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                if (e.key === " ") e.preventDefault();
                setActiveScreen(screen.id);
              }
            }}
            className={`group relative w-24 shrink-0 cursor-pointer rounded-lg border p-1 transition md:w-auto ${
              screen.id === activeScreenId ? "border-violet-500 bg-violet-500/10" : "border-white/10 hover:border-white/25"
            }`}
          >
            <div className="flex aspect-[9/19] items-center justify-center overflow-hidden rounded-md bg-black/40">
              {asset ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={asset.url} alt={`Screen ${i + 1}`} className="h-full w-full object-cover" />
              ) : (
                <span className="px-2 text-center text-[11px] text-white/40">Drop or click to add a screenshot</span>
              )}
            </div>
            <div className="mt-1 flex items-center justify-between px-0.5 text-[11px] text-white/50">
              <span>{String(i + 1).padStart(2, "0")}</span>
              <span className="flex gap-1 transition md:opacity-0 md:group-hover:opacity-100 group-focus-within:opacity-100">
                <button aria-label="Move up" onClick={(e) => { e.stopPropagation(); moveScreenById(screen.id, -1); }}>↑</button>
                <button aria-label="Move down" onClick={(e) => { e.stopPropagation(); moveScreenById(screen.id, 1); }}>↓</button>
                <button aria-label="Replace screenshot" title="Replace screenshot" onClick={(e) => { e.stopPropagation(); pickFor(screen.id); }}>↻</button>
                <button aria-label="Remove" onClick={(e) => { e.stopPropagation(); removeScreenById(screen.id); }}>×</button>
              </span>
            </div>
          </div>
        );
      })}
      <button
        onClick={() => fileInput.current?.click()}
        className="w-24 shrink-0 rounded-lg border border-dashed border-white/20 px-2 py-3 text-sm md:w-auto md:px-0 text-white/60 transition hover:border-violet-400 hover:text-white"
      >
        + Add screenshots
      </button>
      <input
        ref={replaceInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && replaceFor.current) void replaceScreenFile(replaceFor.current, file);
          e.target.value = "";
        }}
      />
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
