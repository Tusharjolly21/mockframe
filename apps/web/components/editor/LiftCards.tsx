"use client";

import { useEffect, useRef, useState } from "react";
import type { MockupLayer } from "@framekit/scene";
import { Layers2, Trash2 } from "lucide-react";
import { track } from "@/lib/analytics";
import { resolveAsset } from "@/lib/assets";
import { addLiftedCard, clampCrop, detectCards, isLiftedCard, PRESET_CROPS, type Crop, type LiftSide, type LiftStyle } from "@/lib/liftCard";
import { useSceneStore, useViewStore } from "@/lib/store";
import { Seg } from "./ui";

const sizeOf = (id: string) => resolveAsset(id);
const cache = new Map<string, Crop[]>();

/** Card-like blocks in the screenshot, found on a small copy of it. */
export async function findCards(url: string): Promise<Crop[]> {
  const hit = cache.get(url);
  if (hit) return hit;
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = url;
  await img.decode();
  const w = 220;
  const h = Math.max(16, Math.round((img.naturalHeight / img.naturalWidth) * w));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];
  ctx.drawImage(img, 0, 0, w, h);
  const crops = detectCards(ctx.getImageData(0, 0, w, h));
  cache.set(url, crops);
  return crops;
}

const STYLES: { value: LiftStyle; label: string }[] = [
  { value: "pop", label: "Pop" },
  { value: "tilt", label: "Tilted" },
  { value: "glass", label: "Glass" },
  { value: "flat", label: "Outline" },
];

const SIDES: { value: LiftSide; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "left", label: "Left" },
  { value: "center", label: "Centre" },
  { value: "right", label: "Right" },
];

/**
 * Lift a piece of the screen out as a floating card: tap a block the editor
 * found, or drag over the screenshot to choose your own.
 */
export function LiftCards({ layer }: { layer: MockupLayer }) {
  const scene = useSceneStore((s) => s.scene);
  const setScene = useSceneStore((s) => s.setScene);
  const select = useViewStore((s) => s.select);
  const triggerEntrance = useViewStore((s) => s.triggerEntrance);
  const [style, setStyle] = useState<LiftStyle>("pop");
  const [side, setSide] = useState<LiftSide>("auto");
  const [found, setFound] = useState<Crop[] | null>(null);
  const [drag, setDrag] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const [drawn, setDrawn] = useState<Crop | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const asset = layer.media ? resolveAsset(layer.media.assetId) : undefined;
  const url = asset?.url;

  useEffect(() => {
    setFound(null);
    setDrawn(null);
    if (!url) return;
    let live = true;
    findCards(url)
      .then((c) => live && setFound(c))
      .catch(() => live && setFound([]));
    return () => {
      live = false;
    };
  }, [url]);

  if (!layer.media || layer.media.kind !== "image" || !asset || isLiftedCard(layer)) return null;
  const lifted = scene.layers.filter((l) => isLiftedCard(l) && (l as MockupLayer).media?.assetId === layer.media!.assetId);
  const picks = found && found.length ? found : PRESET_CROPS.map((p) => p.crop);

  const lift = (crop: Crop) => {
    let id = "";
    setScene((s) => {
      const r = addLiftedCard(s, layer.id, crop, sizeOf, { style, side });
      id = r.layerId;
      return r.scene;
    });
    if (id) {
      select(id);
      triggerEntrance(id);
      track("card_lifted", { style, side, detected: !!found?.length });
    }
    setDrawn(null);
  };

  const point = (e: React.PointerEvent) => {
    const r = boxRef.current!.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
  };

  const rectOf = (d: { x0: number; y0: number; x1: number; y1: number }): Crop => ({
    x: Math.min(d.x0, d.x1),
    y: Math.min(d.y0, d.y1),
    w: Math.abs(d.x1 - d.x0),
    h: Math.abs(d.y1 - d.y0),
  });
  const live = drag ? rectOf(drag) : drawn;
  const pct = (c: Crop) => ({ left: `${c.x * 100}%`, top: `${c.y * 100}%`, width: `${c.w * 100}%`, height: `${c.h * 100}%` });

  return (
    <section className="mx-3 mt-3 rounded-xl border border-[#e4e4ec] bg-white p-2.5" aria-labelledby="lift-title">
      <div className="flex items-center gap-1.5">
        <Layers2 size={13} className="text-[#5b4cff]" />
        <h3 id="lift-title" className="text-[12px] font-bold text-[#17171c]">Lift a card</h3>
        {lifted.length > 0 && (
          <button
            type="button"
            onClick={() => setScene((s) => ({ ...s, layers: s.layers.filter((l) => !lifted.some((c) => c.id === l.id)) }))}
            className="fk-press ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold text-[#85858f] hover:bg-[#f4f4f8] hover:text-[#17171c]"
            title="Remove the cards lifted from this screen"
          >
            <Trash2 size={11} /> Remove {lifted.length}
          </button>
        )}
      </div>
      <p className="mt-0.5 text-[10.5px] leading-snug text-[#858590]">
        Float part of this screen out of the device. Tap a highlighted block, or drag to choose your own.
      </p>

      <div className="mt-2 grid place-items-center rounded-lg bg-[#f2f2f7] p-2">
        <div
          ref={boxRef}
          className="relative touch-none select-none"
          style={{ aspectRatio: `${asset.width}/${asset.height}`, height: asset.height >= asset.width ? 240 : undefined, width: asset.height < asset.width ? "100%" : undefined }}
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest("[data-pick]")) return;
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            const p = point(e);
            setDrag({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
            setDrawn(null);
          }}
          onPointerMove={(e) => drag && setDrag({ ...drag, ...((p) => ({ x1: p.x, y1: p.y }))(point(e)) })}
          onPointerUp={() => {
            if (!drag) return;
            const c = rectOf(drag);
            setDrag(null);
            if (c.w > 0.06 && c.h > 0.025) setDrawn(clampCrop(c));
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset.url} alt="" draggable={false} className="pointer-events-none h-full w-full rounded-md object-fill shadow-sm" />
          {!live &&
            picks.map((c, i) => (
              <button
                key={i}
                type="button"
                data-pick
                onClick={() => lift(c)}
                title="Lift this block"
                className="group absolute rounded-[6px] border-[1.5px] border-[#6d4aff]/70 bg-[#6d4aff]/10 transition-colors hover:border-[#6d4aff] hover:bg-[#6d4aff]/25 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#6d4aff]"
                style={pct(c)}
              >
                <span className="absolute -top-2 left-1 rounded-full bg-[#6d4aff] px-1.5 text-[8.5px] font-bold leading-4 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  Lift
                </span>
              </button>
            ))}
          {live && <span className="pointer-events-none absolute rounded-[6px] border-2 border-[#6d4aff] bg-[#6d4aff]/15" style={pct(live)} />}
        </div>
      </div>
      {found && found.length === 0 && !live && (
        <p className="mt-1.5 text-[10px] text-[#9a9aa4]">No clear blocks found, so these are the top, middle and lower parts.</p>
      )}
      {drawn && (
        <div className="mt-2 flex gap-1.5">
          <button type="button" onClick={() => lift(drawn)} className="fk-press flex-1 rounded-lg bg-[#17171c] py-1.5 text-[11.5px] font-semibold text-white">
            Lift this area
          </button>
          <button type="button" onClick={() => setDrawn(null)} className="fk-press rounded-lg border border-[#e4e4ec] px-3 py-1.5 text-[11.5px] font-semibold text-[#4a4a55]">
            Cancel
          </button>
        </div>
      )}
      <div className="mt-2.5 space-y-1.5">
        <Seg id="lift-style" options={STYLES} value={style} onChange={setStyle} />
        <Seg id="lift-side" options={SIDES} value={side} onChange={setSide} />
      </div>
    </section>
  );
}
