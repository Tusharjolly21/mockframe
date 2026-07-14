"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Clapperboard, ImageIcon, Play, Scissors, Video } from "lucide-react";
import type { MockupLayer } from "@framekit/scene";
import {
  animMessageCount,
  animStateDoc,
  buildAnimPlan,
  decodeScreenAsset,
  encodeScreenAsset,
  isScreenAsset,
  SCREEN_APP_LABELS,
  type AnimShot,
} from "@/lib/screens";
import { exportSceneVideo } from "@/lib/videoExport";
import { exportSceneGif } from "@/lib/gifExport";
import { useSceneStore, useViewStore, withTransientHistory } from "@/lib/store";
import { openUpgrade } from "@/lib/billing/gate";
import { Popover } from "./ui";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Bottom-center "Animate" control: chat-replay preview + WebM video export. */
export function AnimatePanel() {
  const scene = useSceneStore((s) => s.scene);
  const updateLayer = useSceneStore((s) => s.updateLayer);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<null | { pct: number; label: string }>(null);
  const [plan, setPlan] = useState<AnimShot[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  // the first mockup carrying an animatable chat screen (2+ messages)
  const animLive = useMemo(() => {
    for (const l of scene.layers) {
      if (l.type !== "mockup" || !l.media || !isScreenAsset(l.media.assetId)) continue;
      const doc = decodeScreenAsset(l.media.assetId);
      if (doc && animMessageCount(doc) > 1) {
        return { layer: l as MockupLayer, doc, assetId: l.media.assetId };
      }
    }
    return null;
  }, [scene.layers]);

  // freeze the target while playing/exporting — the layer media is being
  // mutated frame-by-frame, so we must keep pointing at the FULL doc
  const animRef = useRef(animLive);
  if (!busy) animRef.current = animLive;
  const anim = animRef.current;

  const total = anim ? animMessageCount(anim.doc) : 0;

  useEffect(() => {
    setPlan(anim ? buildAnimPlan(anim.doc) : []);
  }, [anim]);

  const renderState = (s: { k: number; typing: boolean; dotPhase: number; settled: boolean }) => {
    if (!anim) return;
    withTransientHistory(() =>
      updateLayer(anim.layer.id, (l) => ({
        ...l,
        media: {
          ...(l as MockupLayer).media!,
          assetId: encodeScreenAsset(animStateDoc(anim.doc, s.k, s.typing, s.dotPhase, s.settled)),
        },
      }))
    );
  };
  const restore = () => {
    if (!anim) return;
    withTransientHistory(() =>
      updateLayer(anim.layer.id, (l) => ({ ...l, media: { ...(l as MockupLayer).media!, assetId: anim.assetId } }))
    );
  };

  const play = async () => {
    if (!anim || busy) return;
    setBusy({ pct: 0, label: "Playing…" });
    for (const shot of plan) {
      if (shot.typing) {
        // cycle the typing dots for the hold duration
        const cycles = Math.max(1, Math.round(shot.holdMs / 180));
        for (let p = 0; p < cycles; p++) {
          renderState({ k: shot.k, typing: true, dotPhase: p, settled: false });
          await wait(180);
        }
      } else {
        renderState({ k: shot.k, typing: false, dotPhase: 0, settled: !!shot.settled });
        await wait(shot.holdMs);
      }
    }
    restore();
    setBusy(null);
  };

  const exportVideo = async () => {
    if (!anim || busy) return;
    if (!useViewStore.getState().removeWatermark) {
      openUpgrade();
      return;
    }
    const node = document.querySelector<HTMLElement>("#scene-canvas [data-scene-id]");
    if (!node) return;
    setBusy({ pct: 0, label: "Preparing…" });
    try {
      await exportSceneVideo({
        node,
        scene,
        plan,
        renderState,
        restore,
        onProgress: (pct, label) => setBusy({ pct, label }),
      });
      window.dispatchEvent(new CustomEvent("framekit:toast", { detail: "Saved chat replay video (WebM)" }));
    } catch (e) {
      restore();
      window.dispatchEvent(
        new CustomEvent("framekit:toast", { detail: `Video export failed: ${(e as Error).message}` })
      );
    } finally {
      setBusy(null);
    }
  };

  const exportGif = async () => {
    if (!anim || busy) return;
    if (!useViewStore.getState().removeWatermark) {
      openUpgrade();
      return;
    }
    const node = document.querySelector<HTMLElement>("#scene-canvas [data-scene-id]");
    if (!node) return;
    setBusy({ pct: 0, label: "Preparing…" });
    try {
      await exportSceneGif({
        node,
        plan,
        canvasW: scene.canvas.width,
        renderState,
        restore,
        onProgress: (pct, label) => setBusy({ pct, label }),
      });
      window.dispatchEvent(new CustomEvent("framekit:toast", { detail: "Saved chat replay GIF" }));
    } catch (e) {
      restore();
      window.dispatchEvent(
        new CustomEvent("framekit:toast", { detail: `GIF export failed: ${(e as Error).message}` })
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => setOpen((v) => !v)}
        className="fk-card pointer-events-auto flex cursor-pointer items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold text-[#17171c]"
      >
        <Clapperboard size={15} />
        Animate
        <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-700">
          video
        </span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <Popover className="bottom-[calc(100%+10px)] left-1/2 -ml-[130px] w-[260px] p-3.5">
            <div className="mb-1 flex items-center gap-2">
              <Clapperboard size={14} className="text-violet-600" />
              <span className="text-[13px] font-bold text-[#17171c]">Chat replay video</span>
            </div>
            {!anim ? (
              <p className="py-2 text-[11px] leading-relaxed text-[#9a9aa4]">
                Add a Screen Studio chat with 2+ messages, and this plays them one reply at a time — then
                exports the whole scene (device, background, 3D tilt) as a video.
              </p>
            ) : (
              <>
                <p className="mb-3 text-[11px] leading-relaxed text-[#9a9aa4]">
                  Reveals {total} messages of your {SCREEN_APP_LABELS[anim.doc.app]} chat one at a time — replies
                  land with the sender&apos;s rhythm.
                </p>

                <div className="mb-3 rounded-xl border border-[#e8e8ef] bg-[#fafafd] p-2.5">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#17171c]"><Clapperboard size={12} /> Timeline</div>
                    <span className="text-[10px] tabular-nums text-[#9a9aa4]">{(plan.reduce((sum, shot) => sum + shot.holdMs + shot.fadeMs, 0) / 1000).toFixed(1)}s</span>
                  </div>
                  <div className="panel-scroll max-h-52 space-y-1.5 overflow-y-auto pr-0.5">
                    {plan.map((shot, index) => (
                      <div key={`${index}-${shot.k}-${shot.kind}`} className="rounded-lg border border-[#e4e4ec] bg-white p-2">
                        <div className="mb-1.5 flex items-center gap-1.5">
                          <span className={`h-1.5 w-1.5 rounded-full ${shot.typing ? "bg-violet-500" : "bg-emerald-500"}`} />
                          <span className="min-w-0 flex-1 truncate text-[10.5px] font-semibold text-[#3c3c46]">{shot.typing ? "Typing" : shot.settled ? "Final settle" : `Message ${shot.k}`}</span>
                          <button title="Jump cut" onClick={() => setPlan((current) => current.filter((_, i) => i !== index))} disabled={plan.length <= 1} className="fk-press rounded p-0.5 text-[#9a9aa4] hover:text-red-600 disabled:opacity-30"><Scissors size={12} /></button>
                        </div>
                        <div className="grid grid-cols-[1fr_1fr_76px] gap-2">
                          <label className="text-[9.5px] text-[#8a8a94]">Hold <input type="range" min={200} max={3000} step={50} value={shot.holdMs} onChange={(event) => setPlan((current) => current.map((item, i) => i === index ? { ...item, holdMs: Number(event.target.value) } : item))} className="mt-0.5 w-full" /></label>
                          <label className="text-[9.5px] text-[#8a8a94]">Fade <input type="range" min={0} max={1000} step={25} value={shot.fadeMs} onChange={(event) => setPlan((current) => current.map((item, i) => i === index ? { ...item, fadeMs: Number(event.target.value) } : item))} className="mt-0.5 w-full" /></label>
                          <label className="text-[9.5px] text-[#8a8a94]">Easing <select value={shot.easing ?? "ease-in-out"} onChange={(event) => setPlan((current) => current.map((item, i) => i === index ? { ...item, easing: event.target.value as AnimShot["easing"] } : item))} className="mt-0.5 w-full rounded border border-[#e4e4ec] bg-white px-1 py-1 text-[9px] text-[#3c3c46]"><option value="linear">Linear</option><option value="ease-in-out">Smooth</option><option value="spring">Spring</option></select></label>
                        </div>
                        <div className="mt-1 flex justify-between text-[9px] tabular-nums text-[#b0b0ba]"><span>{(shot.holdMs / 1000).toFixed(2)}s hold</span><span>{(shot.fadeMs / 1000).toFixed(2)}s fade</span></div>
                      </div>
                    ))}
                  </div>
                  {plan.length === 0 && <p className="py-2 text-center text-[10px] text-[#9a9aa4]">All segments removed. Add the replay again to restore them.</p>}
                </div>

                {busy ? (
                  <div className="py-1">
                    <div className="mb-1.5 flex justify-between text-[11px] font-medium text-[#6b6b76]">
                      <span>{busy.label}</span>
                      <span className="tabular-nums">{Math.round(busy.pct * 100)}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#ececf2]">
                      <div
                        className="h-full rounded-full bg-violet-600 transition-[width]"
                        style={{ width: `${Math.max(4, busy.pct * 100)}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={play}
                      className="fk-press flex items-center justify-center gap-1.5 rounded-xl border border-[#e4e4ec] bg-white py-2 text-xs font-semibold text-[#17171c] hover:border-[#c9c9d4]"
                    >
                      <Play size={13} /> Preview
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={exportVideo}
                        className="fk-press flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#17171c] py-2 text-xs font-semibold text-white hover:bg-black"
                      >
                        <Video size={13} /> WebM
                      </button>
                      <button
                        onClick={exportGif}
                        className="fk-press flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#e4e4ec] bg-white py-2 text-xs font-semibold text-[#17171c] hover:border-[#c9c9d4]"
                      >
                        <ImageIcon size={13} /> GIF
                      </button>
                    </div>
                  </div>
                )}
                <p className="mt-2 text-[10px] text-[#b0b0ba]">WebM plays in browsers/Premiere/CapCut · GIF drops into Slack, GitHub &amp; docs.</p>
              </>
            )}
          </Popover>
        )}
      </AnimatePresence>
    </div>
  );
}
