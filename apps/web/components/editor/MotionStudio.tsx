"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ImageIcon, Play, Square, Video } from "lucide-react";
import type { SceneDocument } from "@framekit/scene";
import { MOTION_PRESETS, motionPreset, presetForScene, sampleScene, type MotionPreset, type MotionPresetId } from "@/lib/motion";
import { exportMotionGif, exportMotionVideo } from "@/lib/motionExport";
import { useSceneStore, useViewStore, withTransientHistory } from "@/lib/store";
import { openUpgrade } from "@/lib/billing/gate";
import { useVideoSettings, VideoSettingsControl } from "./VideoSettingsControl";
import { applyBgMotion, backgroundPose, clearBgMotion, isRest, type LiveBackground } from "@/lib/backgroundMotion";
import { LiveBackgroundControl, useLiveBackground } from "./LiveBackgroundControl";

const SCENE_NODE = "#scene-canvas [data-scene-id]";

/** move the background for clip time t: the live background plus the preset's own background move (parallax) */
function poseBackground(base: SceneDocument, preset: MotionPreset, live: LiveBackground, t: number) {
  const node = document.querySelector<HTMLElement>(SCENE_NODE);
  const m = backgroundPose(live, t, base.canvas.width, base.canvas.height, preset.background?.(t));
  if (isRest(m)) clearBgMotion(node);
  else applyBgMotion(node, m);
}

/** pose every moving layer of `base` at clip time t without touching history */
function poseScene(base: SceneDocument, preset: MotionPreset, t: number) {
  // text animations run on the same clock (view state, so history is untouched)
  useViewStore.getState().setTextTime(t * preset.durationMs);
  const poses = sampleScene(base, preset, t);
  withTransientHistory(() =>
    useSceneStore.setState((st) => ({
      scene: {
        ...st.scene,
        layers: st.scene.layers.map((l) => {
          const tf = poses.get(l.id);
          return tf ? ({ ...l, transform: tf } as typeof l) : l;
        }),
      },
    }))
  );
}

function restoreScene(base: SceneDocument) {
  useViewStore.getState().setTextTime(null);
  clearBgMotion(document.querySelector<HTMLElement>(SCENE_NODE));
  const byId = new Map(base.layers.map((l) => [l.id, l.transform]));
  withTransientHistory(() =>
    useSceneStore.setState((st) => ({
      scene: {
        ...st.scene,
        layers: st.scene.layers.map((l) => (byId.has(l.id) ? ({ ...l, transform: byId.get(l.id)! } as typeof l) : l)),
      },
    }))
  );
}

/** tiny looping phone glyph that previews a preset on its card */
function PresetGlyph({ preset, active }: { preset: MotionPreset; active: boolean }) {
  const [t, setT] = useState(preset.kind === "loop" ? 0 : 1);
  useEffect(() => {
    if (!active) {
      setT(preset.kind === "loop" ? 0 : 1);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const dur = preset.durationMs + (preset.kind === "intro" ? 700 : 0);
    const tick = (now: number) => {
      setT(Math.min(1, ((now - t0) % dur) / preset.durationMs));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, preset]);
  const d = preset.sample(t, 60);
  return (
    <div className="flex h-14 items-center justify-center [perspective:220px]">
      <div
        className="h-10 w-5 rounded-[5px] border-[1.5px] border-white/80 bg-gradient-to-b from-violet-400 to-fuchsia-500 shadow-[0_6px_14px_rgba(139,92,246,0.45)]"
        style={{
          transform: `translate(${d.x ?? 0}px, ${(d.y ?? 0) * 0.5}px) scale(${d.scale ?? 1}) rotate(${d.rotate ?? 0}deg) rotateX(${d.tiltX ?? 0}deg) rotateY(${d.tiltY ?? 0}deg)`,
        }}
      />
    </div>
  );
}

/**
 * Motion presets for ANY scene: pick a move, preview it live on the canvas,
 * export it as MP4/WebM or GIF. Works alongside (not instead of) chat replay.
 */
export function MotionStudio() {
  const [presetId, setPresetId] = useState<MotionPresetId>("float");
  const [hover, setHover] = useState<MotionPresetId | null>(null);
  const [busy, setBusy] = useState<null | { pct: number; label: string }>(null);
  const [playing, setPlaying] = useState(false);
  const baseRef = useRef<SceneDocument | null>(null);
  const rafRef = useRef(0);
  const hasMockup = useSceneStore((s) => s.scene.layers.some((l) => l.type === "mockup" || (l.type === "text" && !!l.animation)));
  const hasTextAnim = useSceneStore((s) => s.scene.layers.some((l) => l.type === "text" && !!l.animation));
  const [videoSettings] = useVideoSettings();
  const [live] = useLiveBackground();
  const preset = motionPreset(presetId);

  const stop = () => {
    cancelAnimationFrame(rafRef.current);
    if (baseRef.current) restoreScene(baseRef.current);
    baseRef.current = null;
    setPlaying(false);
  };
  // never leave the canvas mid-pose if the panel closes during a preview
  useEffect(() => () => stop(), []);

  const play = (picked = preset) => {
    if (busy) return;
    if (baseRef.current) stop();
    const base = useSceneStore.getState().scene;
    const p = presetForScene(picked, base);
    baseRef.current = base;
    setPlaying(true);
    const t0 = performance.now();
    const cycles = p.kind === "loop" ? 2 : 1;
    const tick = (now: number) => {
      const elapsed = now - t0;
      if (elapsed >= p.durationMs * cycles) {
        stop();
        return;
      }
      const t = (elapsed % p.durationMs) / p.durationMs;
      poseScene(base, p, t);
      poseBackground(base, p, live, t);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const runExport = async (kind: "video" | "gif") => {
    if (busy) return;
    if (!useViewStore.getState().removeWatermark) {
      openUpgrade();
      return;
    }
    if (baseRef.current) stop();
    const node = document.querySelector<HTMLElement>("#scene-canvas [data-scene-id]");
    if (!node) return;
    const base = useSceneStore.getState().scene;
    const clip = presetForScene(preset, base);
    setBusy({ pct: 0, label: "Preparing…" });
    const opts = {
      node,
      scene: base,
      preset: clip,
      renderAt: (t: number) => {
        poseScene(base, clip, t);
        poseBackground(base, clip, live, t);
      },
      restore: () => restoreScene(base),
      onProgress: (pct: number, label: string) => setBusy({ pct, label }),
    };
    try {
      if (kind === "video") {
        const fmt = await exportMotionVideo({ ...opts, settings: videoSettings });
        window.dispatchEvent(
          new CustomEvent("framekit:toast", { detail: `Saved ${preset.label} video (${fmt.toUpperCase()} · ${videoSettings.fps} fps)` })
        );
      } else {
        await exportMotionGif(opts);
        window.dispatchEvent(new CustomEvent("framekit:toast", { detail: `Saved ${preset.label} GIF` }));
      }
    } catch (e) {
      restoreScene(base);
      window.dispatchEvent(new CustomEvent("framekit:toast", { detail: `Export failed: ${(e as Error).message}` }));
    } finally {
      setBusy(null);
    }
  };

  if (!hasMockup) {
    return <p className="py-8 text-center text-[12px] text-white/40">Add a device mockup, or give a text layer an animation, to animate the scene.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-5 gap-2 lg:grid-cols-9">
        {MOTION_PRESETS.map((p) => (
          <motion.button
            key={p.id}
            whileTap={{ scale: 0.96 }}
            onMouseEnter={() => setHover(p.id)}
            onMouseLeave={() => setHover(null)}
            onClick={() => {
              setPresetId(p.id);
              play(p);
            }}
            disabled={!!busy}
            data-motion={p.id}
            className={`group flex flex-col items-center rounded-xl border px-1.5 pb-2 pt-1 text-center transition-all ${
              p.id === presetId
                ? "border-violet-500 bg-violet-600/25 shadow-[0_0_14px_rgba(139,92,246,0.3)]"
                : "border-white/5 bg-white/5 hover:border-white/15 hover:bg-white/10"
            }`}
          >
            <PresetGlyph preset={p} active={hover === p.id || (playing && p.id === presetId)} />
            <span className="text-[10.5px] font-bold text-white">{p.label}</span>
            <span className="mt-0.5 line-clamp-1 text-[8.5px] text-white/45">{p.hint}</span>
            <span className={`mt-1 rounded-full px-1.5 py-px text-[7.5px] font-bold uppercase tracking-wide ${p.kind === "loop" ? "bg-emerald-500/15 text-emerald-300" : "bg-sky-500/15 text-sky-300"}`}>
              {p.kind === "loop" ? "Loop" : "Intro"} · {(p.durationMs / 1000).toFixed(1)}s
            </span>
          </motion.button>
        ))}
      </div>

      <LiveBackgroundControl disabled={!!busy || playing} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => (playing ? stop() : play())}
            disabled={!!busy}
            className="flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-violet-600 px-4 text-[11px] font-bold text-white shadow-md transition-colors hover:bg-violet-700 disabled:bg-violet-800"
          >
            {playing ? <Square size={10} className="fill-white" /> : <Play size={11} className="fill-white" />}
            <span>{playing ? "Stop" : `Preview ${preset.label}`}</span>
          </button>
          <span className="hidden text-[10px] text-white/40 2xl:inline">Moves every device{preset.kind === "intro" ? " and caption" : ""}, staggered across layers{hasTextAnim ? " · text animations play too" : ""}.</span>
        </div>
        {busy ? (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/50">{busy.label}</span>
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-violet-500 transition-all duration-300" style={{ width: `${busy.pct * 100}%` }} />
            </div>
            <span className="font-mono text-[10px] text-white">{Math.round(busy.pct * 100)}%</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <VideoSettingsControl />
            <button
              onClick={() => runExport("video")}
              className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-4 text-[11px] font-bold text-white transition-all hover:bg-white/15"
            >
              <Video size={11} />
              <span>Export Video</span>
            </button>
            <button
              onClick={() => runExport("gif")}
              className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/15 px-4 text-[11px] font-bold text-white transition-all hover:bg-white/20"
            >
              <ImageIcon size={11} />
              <span>Export GIF</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
