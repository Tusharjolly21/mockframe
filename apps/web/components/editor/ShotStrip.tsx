"use client";

import { memo, useDeferredValue, useRef, useState } from "react";
import { Download, ImagePlus, Plus } from "lucide-react";
import { SceneRenderer } from "@framekit/renderer";
import type { SceneDocument } from "@framekit/scene";
import { ingestFile, resolveAsset } from "@/lib/assets";
import { isSampleScreen } from "@/lib/storeSets";
import { useShotBatchStore, type BatchShot } from "@/lib/shotBatch";
import { sceneTemporal, useSceneStore, useViewStore } from "@/lib/store";
import { toast } from "./Toolbar";

/**
 * The shots of a multi-shot set (a store listing set, or a batch the user
 * built) as a filmstrip under the canvas: live thumbnails in listing order,
 * click to edit one. Hidden while the batch has a single shot.
 */

const THUMB_H = 84;

export function ShotStrip() {
  const shots = useShotBatchStore((s) => s.shots);
  const activeId = useShotBatchStore((s) => s.activeId);
  const live = useDeferredValue(useSceneStore((s) => s.scene));
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  if (shots.length < 2) return null;

  const hasSamples = shots.some((shot) => shot.scene.layers.some((l) => l.type === "mockup" && isSampleScreen(l.media?.assetId)));

  const activate = (id: string) => {
    if (id === activeId) return;
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
    toast(`${shot.name} added as a copy of the shot you were on.`);
  };

  // Screens are matched in order: the first image replaces sample screen 1
  // everywhere it appears (phones and the cards lifted from it), and so on.
  const swapScreens = async (files: File[]) => {
    const images = files
      .filter((f) => f.type.startsWith("image/"))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    if (!images.length) return;
    setBusy(true);
    try {
      const current = useSceneStore.getState().scene;
      const all = useShotBatchStore.getState().shots.map((shot) => (shot.id === activeId ? current : shot.scene));
      const samples = [...new Set(all.flatMap((scene) => scene.layers.flatMap((l) => (l.type === "mockup" && isSampleScreen(l.media?.assetId) ? [l.media!.assetId] : []))))].sort();
      const map = new Map<string, string>();
      for (let i = 0; i < Math.min(images.length, samples.length); i++) {
        const asset = await ingestFile(images[i]);
        map.set(samples[i], asset.id);
      }
      const swap = (scene: SceneDocument): SceneDocument => ({
        ...scene,
        layers: scene.layers.map((l) =>
          l.type === "mockup" && l.media && map.has(l.media.assetId) ? { ...l, media: { ...l.media, assetId: map.get(l.media.assetId)! } } : l,
        ),
      });
      useShotBatchStore.setState((state) => ({
        shots: state.shots.map((shot) => (shot.id === activeId ? shot : { ...shot, scene: swap(shot.scene) })),
      }));
      useSceneStore.setState({ scene: swap(current) });
      useViewStore.getState().bumpAssets();
      const left = samples.length - map.size;
      toast(
        left > 0
          ? `Swapped in ${map.size} screens. ${left} sample ${left === 1 ? "screen is" : "screens are"} left to replace.`
          : `Swapped in all ${map.size} screens across the set.`,
      );
    } catch (error) {
      toast(`Couldn't use those images: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fk-card flex max-w-[calc(100vw-24px)] items-center gap-1.5 rounded-[18px] p-1.5">
      <ol className="flex min-w-0 items-center gap-1.5 overflow-x-auto px-0.5 py-0.5 [scrollbar-width:none]" aria-label="Shots in this set">
        {shots.map((shot, i) => (
          <li key={shot.id} className="shrink-0">
            <ShotThumb
              shot={shot}
              scene={shot.id === activeId ? live : shot.scene}
              index={i}
              total={shots.length}
              active={shot.id === activeId}
              onClick={() => activate(shot.id)}
            />
          </li>
        ))}
      </ol>
      <div className="flex shrink-0 flex-col gap-1 border-l border-[#ececf2] pl-1.5">
        <button onClick={addShot} title="Add a shot (copies the current one)" className="fk-press grid h-[26px] w-[26px] place-items-center rounded-lg text-[#55555f] hover:bg-[#f2f2f6] hover:text-[#17171c]">
          <Plus size={15} />
        </button>
        {hasSamples && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            title="Swap in your screens: pick up to 8 screenshots, in order"
            className="fk-press grid h-[26px] w-[26px] place-items-center rounded-lg text-[#55555f] hover:bg-[#f2f2f6] hover:text-[#17171c] disabled:opacity-40"
          >
            <ImagePlus size={15} />
          </button>
        )}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("framekit:open-batch"))}
          title={`Export all ${shots.length} shots`}
          className="fk-press grid h-[26px] w-[26px] place-items-center rounded-lg text-[#55555f] hover:bg-[#f2f2f6] hover:text-[#17171c]"
        >
          <Download size={15} />
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          void swapScreens(files);
        }}
      />
    </div>
  );
}

const ShotThumb = memo(function ShotThumb({
  shot,
  scene,
  index,
  total,
  active,
  onClick,
}: {
  shot: BatchShot;
  scene: SceneDocument;
  index: number;
  total: number;
  active: boolean;
  onClick: () => void;
}) {
  const k = THUMB_H / scene.canvas.height;
  const w = Math.round(scene.canvas.width * k);
  return (
    <button
      onClick={onClick}
      title={shot.name}
      aria-current={active ? "true" : undefined}
      className={`fk-press group relative block overflow-hidden rounded-[9px] outline-offset-2 transition-shadow ${
        active ? "shadow-[0_0_0_2px_#17171c]" : "shadow-[0_0_0_1px_rgba(0,0,0,0.08)] hover:shadow-[0_0_0_1px_rgba(0,0,0,0.3)]"
      }`}
      style={{ width: w, height: THUMB_H }}
    >
      <span aria-hidden className="pointer-events-none absolute left-0 top-0 origin-top-left" style={{ transform: `scale(${k})` }}>
        <SceneRenderer scene={scene} resolveAsset={resolveAsset} panoramaIdx={index} panoramaTotal={total} />
      </span>
      <span className="absolute bottom-1 left-1 grid h-[15px] min-w-[15px] place-items-center rounded-full bg-black/55 px-1 text-[9.5px] font-semibold tabular-nums text-white backdrop-blur-sm">
        {index + 1}
      </span>
      <span className="sr-only">{`Shot ${index + 1}: ${shot.name}`}</span>
    </button>
  );
});
