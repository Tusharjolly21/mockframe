"use client";

import { useState } from "react";
import { Check, ChevronDown, Copy, Download, Plus, Trash2 } from "lucide-react";
import { bulkExportZip } from "@/lib/bulkExport";
import { resolveAsset } from "@/lib/assets";
import { useShotBatchStore } from "@/lib/shotBatch";
import { sceneTemporal, useSceneStore, useViewStore } from "@/lib/store";
import { StaticScenePreview } from "./StaticScenePreview";
import type { SceneDocument } from "@framekit/scene";

export function ShotBatchPanel({ onToast }: { onToast: (message: string) => void }) {
  const shots = useShotBatchStore((state) => state.shots);
  const activeId = useShotBatchStore((state) => state.activeId);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const activeShot = shots.find((shot) => shot.id === activeId) ?? shots[0];

  const activate = (id: string) => {
    const next = useShotBatchStore.getState().activate(id, useSceneStore.getState().scene);
    if (!next) return;
    useSceneStore.setState({ scene: next });
    sceneTemporal.getState().clear();
    const view = useViewStore.getState();
    view.select(null);
    view.setActiveLayout(null);
    window.dispatchEvent(new CustomEvent("framekit:fit"));
  };

  const addShot = () => {
    const shot = useShotBatchStore.getState().addFromCurrent(useSceneStore.getState().scene);
    useSceneStore.setState({ scene: shot.scene });
    sceneTemporal.getState().clear();
    useViewStore.getState().select(null);
    onToast(`${shot.name} created — replace its screenshot and choose its layout.`);
  };

  const removeShot = (id: string) => {
    const next = useShotBatchStore.getState().remove(id, useSceneStore.getState().scene);
    if (!next) {
      onToast("A batch needs at least one shot.");
      return;
    }
    useSceneStore.setState({ scene: next });
    sceneTemporal.getState().clear();
    useViewStore.getState().select(null);
  };

  const exportAll = async () => {
    if (!shots.length) return;
    setProgress({ done: 0, total: shots.length });
    try {
      await bulkExportZip(
        shots.map((shot, index) => ({ name: `${String(index + 1).padStart(2, "0")}-${safeName(shot.name)}`, scene: shot.scene })),
        {
          scale: 1,
          watermark: !useViewStore.getState().removeWatermark,
          onProgress: (done, total) => setProgress({ done, total }),
        }
      );
      onToast(`Downloaded ${shots.length} edited shots as one ZIP.`);
    } catch (error) {
      onToast(`Batch export failed: ${(error as Error).message}`);
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="w-[min(360px,86vw)] p-2">
      <div className="flex items-center justify-between gap-3 px-2 py-1.5">
        <span>
          <span className="block text-sm font-bold text-[#17171c]">Shot batch</span>
          <span className="block text-[11px] text-[#8a8a94]">{shots.length} independent edits, one ZIP.</span>
        </span>
        <button onClick={addShot} disabled={!!progress} className="fk-press flex shrink-0 items-center gap-1 rounded-lg bg-[#17171c] px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50">
          <Plus size={13} /> Add shot
        </button>
      </div>

      {activeShot && (
        <button
          onClick={() => setListOpen((open) => !open)}
          className="fk-press mt-1 flex w-full items-center gap-2 rounded-xl border border-[#e4e4ec] bg-white p-1.5 text-left hover:border-[#a9a9b3]"
          aria-expanded={listOpen}
        >
          <span className="h-12 w-20 shrink-0 overflow-hidden rounded-lg border border-black/8 bg-[#ececf2]">
            <ShotMediaPreview scene={activeShot.scene} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-medium text-[#92929d]">Editing shot {Math.max(1, shots.findIndex((shot) => shot.id === activeShot.id) + 1)} of {shots.length}</span>
            <span className="block truncate text-xs font-semibold text-[#17171c]">{activeShot.name}</span>
          </span>
          <ChevronDown size={16} className={`shrink-0 text-[#6b6b76] transition-transform ${listOpen ? "rotate-180" : ""}`} />
        </button>
      )}

      {listOpen && (
        <div className="mt-1 max-h-[min(46vh,320px)] space-y-1 overflow-y-auto px-1 py-1">
          {shots.map((shot, index) => {
          const active = shot.id === activeId;
          return (
            <div key={shot.id} className={`flex gap-2 rounded-xl border p-1.5 ${active ? "border-[#17171c] bg-[#f4f4f8]" : "border-transparent hover:bg-[#f4f4f8]"}`}>
              <button onClick={() => { activate(shot.id); setListOpen(false); }} className="h-12 w-20 shrink-0 overflow-hidden rounded-lg border border-black/8 bg-[#ececf2]" title={`Open ${shot.name}`}>
                <ShotMediaPreview scene={shot.scene} />
              </button>
              <button onClick={() => { activate(shot.id); setListOpen(false); }} className="min-w-0 flex-1 text-left">
                <span className="block text-[10px] font-medium text-[#92929d]">Shot {index + 1}</span>
                <input
                  value={shot.name}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => useShotBatchStore.getState().rename(shot.id, event.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-[#17171c] outline-none"
                  aria-label={`Name for shot ${index + 1}`}
                />
              </button>
              {active && <Check size={14} className="mt-3 text-emerald-600" />}
              <button onClick={() => removeShot(shot.id)} disabled={!!progress} title="Delete shot" className="fk-press mt-1 h-7 w-7 rounded-md text-[#8a8a94] hover:bg-black/6 hover:text-red-600 disabled:opacity-40">
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}
        </div>
      )}

      <button onClick={exportAll} disabled={!!progress} className="fk-press mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#17171c] px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-55">
        {progress ? <Copy size={14} /> : <Download size={14} />}
        {progress ? `Rendering ${progress.done}/${progress.total}` : `Export all ${shots.length} shots · ZIP`}
      </button>
    </div>
  );
}

function safeName(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "shot";
}

/** The batch is identified by the content a user uploaded, not a generic
 * device outline. Multi-phone shots show up to three screenshot thumbnails. */
function ShotMediaPreview({ scene }: { scene: SceneDocument }) {
  const assets = scene.layers
    .flatMap((layer) => layer.type === "mockup" && layer.media ? [resolveAsset(layer.media.assetId)] : [])
    .filter(Boolean)
    .slice(0, 3);

  if (!assets.length) return <StaticScenePreview scene={scene} className="h-full w-full" />;
  return (
    <span className={`grid h-full w-full gap-px bg-[#d8d8e0] ${assets.length === 1 ? "grid-cols-1" : assets.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
      {assets.map((asset) => asset && (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={asset.id} src={asset.url} alt="" className="h-full min-w-0 bg-white object-cover" draggable={false} />
      ))}
    </span>
  );
}
