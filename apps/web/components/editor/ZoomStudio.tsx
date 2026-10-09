"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Crosshair, ImageIcon, Play, Sparkles, Square, Trash2, Video } from "lucide-react";
import type { Layer, SceneDocument, ZoomShot } from "@framekit/scene";
import {
  autoZoomShots,
  MAX_ZOOMS,
  newZoomShot,
  RAMP_MS,
  sampleCameraScene,
  sceneZooms,
  shotEnd,
  withZooms,
  zoomClipDuration,
} from "@/lib/cameraZoom";
import { exportMotionGif, exportMotionVideo } from "@/lib/motionExport";
import { useSceneStore, useViewStore, withTransientHistory } from "@/lib/store";
import { openUpgrade } from "@/lib/billing/gate";
import { useVideoSettings, VideoSettingsControl } from "./VideoSettingsControl";

const SCENE_NODE = "#scene-canvas [data-scene-id]";

/** pose every layer under the camera at time t, without touching undo history */
function poseAt(base: SceneDocument, zooms: ZoomShot[], tMs: number) {
  useViewStore.getState().setTextTime(tMs);
  const poses = sampleCameraScene(base, zooms, tMs);
  withTransientHistory(() =>
    useSceneStore.setState((st) => ({
      scene: { ...st.scene, layers: st.scene.layers.map((l) => (poses.has(l.id) ? ({ ...l, transform: poses.get(l.id)! } as Layer) : l)) },
    }))
  );
}

function restore(base: SceneDocument) {
  useViewStore.getState().setTextTime(null);
  const byId = new Map(base.layers.map((l) => [l.id, l.transform]));
  withTransientHistory(() =>
    useSceneStore.setState((st) => ({
      scene: { ...st.scene, layers: st.scene.layers.map((l) => (byId.has(l.id) ? ({ ...l, transform: byId.get(l.id)! } as Layer) : l)) },
    }))
  );
}

/** the scene element's on-screen box, kept current while the studio is open */
function useSceneRect(active: boolean): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = "";
    const tick = () => {
      const r = document.querySelector(SCENE_NODE)?.getBoundingClientRect() ?? null;
      const key = r ? `${r.left}|${r.top}|${r.width}|${r.height}` : "";
      if (key !== last) {
        last = key;
        setRect(r);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);
  return rect;
}

/** a drag costs one undo step: the first move is recorded, the rest ride along transiently */
function dragUpdate(first: boolean, updater: (s: SceneDocument) => SceneDocument) {
  const apply = () => useSceneStore.getState().setScene(updater);
  if (first) apply();
  else withTransientHistory(apply);
}

const fmt = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

/**
 * Video zoom: click points on the canvas and the camera eases in on each one,
 * holds, and eases out — with an optional 3D tilt. Preview live, export as
 * MP4/WebM or GIF with the same pipeline as motion presets.
 */
export function ZoomStudio() {
  const zooms = useSceneStore((s) => s.scene.timeline?.zooms ?? null);
  const hasLayers = useSceneStore((s) => s.scene.layers.length > 0);
  const shots = zooms ? [...zooms].sort((a, b) => a.startMs - b.startMs) : [];
  const [picking, setPicking] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playhead, setPlayhead] = useState<number | null>(null);
  const [busy, setBusy] = useState<null | { pct: number; label: string }>(null);
  const [videoSettings] = useVideoSettings();
  const baseRef = useRef<SceneDocument | null>(null);
  const rafRef = useRef(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const rect = useSceneRect(true);
  const duration = zoomClipDuration(shots);
  const selected = shots.find((s) => s.id === selectedId) ?? null;
  const playing = playhead !== null;

  const moveShot = (id: string, x: number, y: number, first: boolean) =>
    dragUpdate(first, (sc) => withZooms(sc, sceneZooms(sc).map((z) => (z.id === id ? { ...z, x, y } : z))));
  const setShots = (next: ZoomShot[]) => useSceneStore.getState().setScene((s) => withZooms(s, next));
  const patchShot = (id: string, patch: Partial<ZoomShot>) => setShots(shots.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const stop = () => {
    cancelAnimationFrame(rafRef.current);
    if (baseRef.current) restore(baseRef.current);
    baseRef.current = null;
    setPlayhead(null);
  };
  // never leave the canvas mid-zoom if the panel closes during a preview
  useEffect(() => () => stop(), []);

  const play = () => {
    if (busy || !shots.length) return;
    if (baseRef.current) stop();
    setPicking(false);
    const base = useSceneStore.getState().scene;
    const list = sceneZooms(base);
    const dur = zoomClipDuration(list);
    baseRef.current = base;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = now - t0;
      if (t >= dur) {
        stop();
        return;
      }
      poseAt(base, list, t);
      setPlayhead(t);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const runExport = async (kind: "video" | "gif") => {
    if (busy || !shots.length) return;
    if (!useViewStore.getState().removeWatermark) {
      openUpgrade("Video zooms");
      return;
    }
    if (baseRef.current) stop();
    setPicking(false);
    const node = document.querySelector<HTMLElement>(SCENE_NODE);
    if (!node) return;
    const base = useSceneStore.getState().scene;
    const list = sceneZooms(base);
    const dur = zoomClipDuration(list);
    setBusy({ pct: 0, label: "Preparing…" });
    const opts = {
      node,
      scene: base,
      preset: { id: "video-zoom", kind: "intro" as const, durationMs: dur },
      renderAt: (t: number) => poseAt(base, list, t * dur),
      restore: () => restore(base),
      onProgress: (pct: number, label: string) => setBusy({ pct, label }),
    };
    try {
      if (kind === "video") {
        const ext = await exportMotionVideo({ ...opts, settings: videoSettings });
        window.dispatchEvent(new CustomEvent("framekit:toast", { detail: `Saved zoom video (${ext.toUpperCase()} · ${videoSettings.fps} fps)` }));
      } else {
        await exportMotionGif(opts);
        window.dispatchEvent(new CustomEvent("framekit:toast", { detail: "Saved zoom GIF" }));
      }
    } catch (e) {
      restore(base);
      window.dispatchEvent(new CustomEvent("framekit:toast", { detail: `Export failed: ${(e as Error).message}` }));
    } finally {
      setBusy(null);
    }
  };

  /** drag a timeline block to move its start time */
  const dragBlock = (e: React.PointerEvent, s: ZoomShot) => {
    e.preventDefault();
    setSelectedId(s.id);
    const track = trackRef.current;
    if (!track) return;
    const pxPerMs = track.clientWidth / duration;
    const x0 = e.clientX;
    const start0 = s.startMs;
    let first = true;
    const move = (ev: PointerEvent) => {
      const startMs = Math.max(0, Math.round((start0 + (ev.clientX - x0) / pxPerMs) / 50) * 50);
      dragUpdate(first, (sc) => withZooms(sc, sceneZooms(sc).map((z) => (z.id === s.id ? { ...z, startMs } : z))));
      first = false;
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  if (!hasLayers) {
    return <p className="py-8 text-center text-[12px] text-white/40">Add a device or some content to the canvas, then pick points to zoom into.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* canvas overlay: zoom points, and click-to-add while picking */}
      {rect &&
        !playing &&
        !busy &&
        createPortal(
          <div
            data-animate-overlay
            className="fixed z-40"
            style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height, pointerEvents: picking ? "auto" : "none", cursor: picking ? "crosshair" : undefined }}
            onClick={(e) => {
              if (!picking) return;
              const x = (e.clientX - rect.left) / rect.width;
              const y = (e.clientY - rect.top) / rect.height;
              const shot = newZoomShot(shots, x, y);
              setShots([...shots, shot]);
              setSelectedId(shot.id);
              if (shots.length + 1 >= MAX_ZOOMS) setPicking(false);
            }}
          >
            {picking && <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-violet-500/10 ring-2 ring-inset ring-violet-500/60" />}
            {shots.map((s, i) => (
              <ZoomMarker
                key={s.id}
                shot={s}
                index={i}
                rect={rect}
                selected={s.id === selectedId}
                onSelect={() => setSelectedId(s.id)}
                onMove={(x, y, first) => moveShot(s.id, x, y, first)}
              />
            ))}
          </div>,
          document.body
        )}

      {/* timeline */}
      <div className="rounded-xl border border-white/5 bg-white/5 p-3">
        <div className="mb-2 flex items-center justify-between text-[10px] text-white/45">
          <span>{shots.length ? `${shots.length} zoom${shots.length === 1 ? "" : "s"} · drag a block to retime it, drag a marker on the canvas to move it` : "No zooms yet"}</span>
          <span className="tabular-nums">{playing ? `${fmt(playhead!)} / ` : ""}{fmt(duration)}</span>
        </div>
        <div ref={trackRef} className="relative h-9 rounded-lg bg-black/40">
          {shots.map((s, i) => {
            const left = (s.startMs / duration) * 100;
            const width = ((shotEnd(s) - s.startMs) / duration) * 100;
            const ramp = (RAMP_MS / (shotEnd(s) - s.startMs)) * 100;
            return (
              <div
                key={s.id}
                onPointerDown={(e) => dragBlock(e, s)}
                title={`Zoom ${i + 1}: ${s.zoom.toFixed(1)}× at ${fmt(s.startMs)}`}
                className={`absolute top-1 bottom-1 cursor-grab rounded-md border text-[10px] font-bold active:cursor-grabbing ${
                  s.id === selectedId ? "border-violet-300 text-white" : "border-violet-500/40 text-white/80"
                }`}
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  background: `linear-gradient(90deg, rgba(139,92,246,0.15), rgba(139,92,246,0.55) ${ramp}%, rgba(139,92,246,0.55) ${100 - ramp}%, rgba(139,92,246,0.15))`,
                }}
              >
                <span className="absolute left-1.5 top-1/2 -translate-y-1/2">{i + 1}</span>
              </div>
            );
          })}
          {playing && <div className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-white" style={{ left: `${(playhead! / duration) * 100}%` }} />}
        </div>
      </div>

      {/* selected shot */}
      {selected && !playing && (
        <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto] items-center gap-4 rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-[11px]">
          <span className="font-bold text-violet-300">Zoom {shots.indexOf(selected) + 1}</span>
          <Slider label="Zoom" value={selected.zoom} min={1.1} max={3.5} step={0.1} display={`${selected.zoom.toFixed(1)}×`} onChange={(v) => patchShot(selected.id, { zoom: v })} />
          <Slider label="Hold" value={selected.holdMs} min={300} max={5000} step={100} display={fmt(selected.holdMs)} onChange={(v) => patchShot(selected.id, { holdMs: v })} />
          <Slider label="Tilt" value={selected.tilt ?? 0} min={-20} max={20} step={1} display={`${selected.tilt ?? 0}°`} onChange={(v) => patchShot(selected.id, { tilt: v })} />
          <button
            onClick={() => {
              setShots(shots.filter((s) => s.id !== selected.id));
              setSelectedId(null);
            }}
            title="Delete this zoom"
            className="grid h-7 w-7 place-items-center rounded-md text-white/50 hover:bg-white/10 hover:text-red-300"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}

      {/* actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => (playing ? stop() : play())}
            disabled={!!busy || !shots.length}
            className="flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-violet-600 px-4 text-[11px] font-bold text-white shadow-md transition-colors hover:bg-violet-700 disabled:bg-violet-900 disabled:text-white/40"
          >
            {playing ? <Square size={10} className="fill-white" /> : <Play size={11} className="fill-white" />}
            {playing ? "Stop" : "Preview"}
          </button>
          <button
            onClick={() => setPicking((v) => !v)}
            disabled={!!busy || playing || shots.length >= MAX_ZOOMS}
            className={`flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[11px] font-bold transition-colors disabled:opacity-40 ${
              picking ? "border-violet-400 bg-violet-500/25 text-white" : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
            }`}
          >
            <Crosshair size={12} />
            {picking ? "Done" : "Add point"}
          </button>
          <button
            onClick={() => {
              const auto = autoZoomShots(useSceneStore.getState().scene);
              if (!auto.length) return;
              setShots(auto);
              setSelectedId(auto[0].id);
              setPicking(false);
            }}
            disabled={!!busy || playing}
            title="A zoom on each device, in reading order"
            className="flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-3.5 text-[11px] font-bold text-white/80 hover:bg-white/10 disabled:opacity-40"
          >
            <Sparkles size={12} />
            Auto zoom
          </button>
          {shots.length > 0 && (
            <button
              onClick={() => {
                setShots([]);
                setSelectedId(null);
              }}
              disabled={!!busy || playing}
              className="h-8 shrink-0 rounded-full px-3 text-[11px] text-white/45 hover:text-white/80 disabled:opacity-40"
            >
              Clear
            </button>
          )}
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
              disabled={!shots.length}
              className="flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-white/10 bg-white/10 px-4 text-[11px] font-bold text-white transition-all hover:bg-white/15 disabled:opacity-40"
            >
              <Video size={11} />
              Export Video
            </button>
            <button
              onClick={() => runExport("gif")}
              disabled={!shots.length}
              className="flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-white/10 bg-white/15 px-4 text-[11px] font-bold text-white transition-all hover:bg-white/20 disabled:opacity-40"
            >
              <ImageIcon size={11} />
              Export GIF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Slider(p: { label: string; value: number; min: number; max: number; step: number; display: string; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-2">
      <span className="w-8 text-white/50">{p.label}</span>
      <input type="range" min={p.min} max={p.max} step={p.step} value={p.value} onChange={(e) => p.onChange(Number(e.target.value))} className="h-1 flex-1 accent-violet-500" />
      <span className="w-10 text-right tabular-nums text-white/80">{p.display}</span>
    </label>
  );
}

/** a numbered zoom point on the canvas; drag to move it */
function ZoomMarker(p: { shot: ZoomShot; index: number; rect: DOMRect; selected: boolean; onSelect: () => void; onMove: (x: number, y: number, first: boolean) => void }) {
  const { shot, rect } = p;
  // the frame the zoom will fill: canvas size / zoom, around the focus
  const fw = rect.width / shot.zoom;
  const fh = rect.height / shot.zoom;
  return (
    <>
      {p.selected && (
        <div
          className="pointer-events-none absolute rounded-md border-2 border-dashed border-violet-400/80"
          style={{ left: shot.x * rect.width - fw / 2, top: shot.y * rect.height - fh / 2, width: fw, height: fh }}
        />
      )}
      <button
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          p.onSelect();
          let first = true;
          const move = (ev: PointerEvent) => {
            p.onMove(Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width)), Math.min(1, Math.max(0, (ev.clientY - rect.top) / rect.height)), first);
            first = false;
          };
          const up = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
          };
          window.addEventListener("pointermove", move);
          window.addEventListener("pointerup", up);
        }}
        onClick={(e) => e.stopPropagation()}
        title={`Zoom ${p.index + 1} — drag to move`}
        className={`pointer-events-auto absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 cursor-move place-items-center rounded-full text-[11px] font-bold shadow-lg ring-2 ${
          p.selected ? "bg-violet-600 text-white ring-white" : "bg-white text-violet-700 ring-violet-500"
        }`}
        style={{ left: shot.x * rect.width, top: shot.y * rect.height }}
      >
        {p.index + 1}
      </button>
    </>
  );
}
