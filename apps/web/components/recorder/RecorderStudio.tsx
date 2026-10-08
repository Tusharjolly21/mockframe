"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Circle, Download, Film, Pause, Play, Plus, Square, Trash2, Upload, Wand2 } from "lucide-react";
import { UpgradeModal } from "@/components/editor/UpgradeModal";
import { track } from "@/lib/analytics";
import { useEntitlementSync } from "@/lib/billing/client";
import { useIsPro } from "@/lib/billing/gate";
import { downloadBlob } from "@/lib/videoEncode";
import {
  canvasSize,
  canvasToRecording,
  DEFAULT_RECORDER_STYLE,
  drawFrame,
  paintBackground,
  RECORDER_BACKGROUNDS,
  type Aspect,
  type FrameStyle,
  type RecorderStyle,
} from "@/lib/recorder/compose";
import { exportRecording } from "@/lib/recorder/export";
import { analyzeActivity, canCapture, loadRecording, startCapture, type Capture, type Recording } from "@/lib/recorder/source";
import {
  cameraAt,
  cameraTrack,
  clampFocus,
  DEFAULT_ZOOM,
  detectZooms,
  MAX_ZOOM,
  MIN_ZOOM,
  normalizeZooms,
  zoomId,
  type ActivitySample,
  type ZoomSegment,
} from "@/lib/recorder/zoom";

const PREVIEW_LONG = 1280;

const fmt = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const FRAMES: { id: FrameStyle; label: string }[] = [
  { id: "window", label: "Window" },
  { id: "rounded", label: "Rounded" },
  { id: "none", label: "None" },
];
const ASPECTS: { id: Aspect; label: string }[] = [
  { id: "16:9", label: "16:9" },
  { id: "4:3", label: "4:3" },
  { id: "1:1", label: "1:1" },
  { id: "4:5", label: "4:5" },
  { id: "9:16", label: "9:16" },
];
const QUALITIES = [
  { long: 1920, label: "1080p" },
  { long: 2560, label: "1440p" },
  { long: 3840, label: "4K" },
];

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-lg border border-white/10 bg-black/30 p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={`flex-1 rounded-md px-2 py-1 text-[12px] transition ${value === o.id ? "bg-white/15 font-medium text-white" : "text-white/55 hover:text-white"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-white/10 px-4 py-4">
      <h3 className="mb-2.5 text-[12px] font-semibold text-white/80">{title}</h3>
      {children}
    </section>
  );
}

/**
 * Screen Recorder: record (or upload) a screen recording, get smooth zooms
 * wherever something happens on screen, put it in a window on a background,
 * and export an MP4.
 */
export function RecorderStudio() {
  useEntitlementSync();
  const isPro = useIsPro();
  const [rec, setRec] = useState<Recording | null>(null);
  const [zooms, setZooms] = useState<ZoomSegment[]>([]);
  const [samples, setSamples] = useState<ActivitySample[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [style, setStyle] = useState<RecorderStyle>(DEFAULT_RECORDER_STYLE);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capture, setCapture] = useState<Capture | null>(null);
  const [captureStart, setCaptureStart] = useState(0);
  const [now, setNow] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [timeMs, setTimeMs] = useState(0);
  const [quality, setQuality] = useState(1920);
  const [fps, setFps] = useState<30 | 60>(60);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  // browser-only check, after hydration so server and client markup match
  const [captureOk, setCaptureOk] = useState(false);
  useEffect(() => setCaptureOk(canCapture()), []);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgRef = useRef<HTMLCanvasElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const size = useMemo(() => canvasSize(style.aspect, PREVIEW_LONG), [style.aspect]);
  const camera = useMemo(() => (rec ? cameraTrack(zooms, rec.durationMs, 30) : null), [zooms, rec]);
  const selectedZoom = zooms.find((z) => z.id === selected) ?? null;

  /* ------------------------------ loading ------------------------------ */

  const open = useCallback(async (blob: Blob, name: string, source: "record" | "upload") => {
    setError(null);
    setBusy("Reading your recording…");
    try {
      const next = await loadRecording(blob, name, { fromCapture: source === "record" });
      setRec((old) => {
        if (old) URL.revokeObjectURL(old.url);
        return next;
      });
      setZooms([]);
      setSelected(null);
      setTimeMs(0);
      track("recorder_loaded", { source, seconds: Math.round(next.durationMs / 1000) });
      setBusy("Finding the moments to zoom in on…");
      const found = await analyzeActivity(next, (f) => setBusy(`Finding the moments to zoom in on… ${Math.round(f * 100)}%`));
      setSamples(found);
      const auto = detectZooms(found, next.durationMs);
      setZooms(auto);
      track("recorder_auto_zoom", { zooms: auto.length });
    } catch (e) {
      setError(e instanceof Error ? e.message : "That recording couldn't be opened.");
    } finally {
      setBusy(null);
    }
  }, []);

  async function record() {
    setError(null);
    try {
      const c = await startCapture();
      setCapture(c);
      setCaptureStart(Date.now());
      track("recorder_started");
      const blob = await c.done;
      setCapture(null);
      await open(blob, `recording-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.webm`, "record");
    } catch (e) {
      setCapture(null);
      // cancelling the share picker is not an error worth showing
      if (e instanceof DOMException && e.name === "NotAllowedError") return;
      setError(e instanceof Error ? e.message : "Recording failed.");
    }
  }

  useEffect(() => {
    if (!capture) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [capture]);

  useEffect(() => () => {
    if (rec) URL.revokeObjectURL(rec.url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------ preview ------------------------------ */

  useEffect(() => {
    const bg = document.createElement("canvas");
    bg.width = size.width;
    bg.height = size.height;
    paintBackground(bg.getContext("2d")!, size.width, size.height, style.background);
    bgRef.current = bg;
  }, [size, style.background]);

  const draw = useCallback(() => {
    const cvs = canvasRef.current;
    const video = videoRef.current;
    const bg = bgRef.current;
    if (!cvs || !video || !rec || !camera || !bg) return;
    const ctx = cvs.getContext("2d")!;
    const t = video.currentTime * 1000;
    drawFrame(ctx, size.width, size.height, video, rec.width, rec.height, cameraAt(camera, t), style, bg);
  }, [rec, camera, size, style]);

  useEffect(() => {
    if (!rec) return;
    let raf = 0;
    let lastState = 0;
    const loop = (ts: number) => {
      draw();
      const video = videoRef.current;
      if (video && ts - lastState > 66) {
        lastState = ts;
        setTimeMs(video.currentTime * 1000);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [rec, draw]);

  const seek = (ms: number) => {
    const video = videoRef.current;
    if (!video || !rec) return;
    video.currentTime = Math.min(rec.durationMs, Math.max(0, ms)) / 1000;
    setTimeMs(video.currentTime * 1000);
  };

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  }, []);

  /* ------------------------------- zooms ------------------------------- */

  const setZoomList = (list: ZoomSegment[]) => rec && setZooms(normalizeZooms(list, rec.durationMs));
  const patchZoom = (id: string, patch: Partial<ZoomSegment>) =>
    setZoomList(zooms.map((z) => (z.id === id ? { ...z, ...patch, ...("x" in patch || "scale" in patch ? clampFocus(patch.x ?? z.x, patch.y ?? z.y, patch.scale ?? z.scale) : {}) } : z)));

  const addZoomAt = (ms: number, x = 0.5, y = 0.5) => {
    if (!rec) return;
    const start = Math.max(0, ms - 300);
    const next = zooms.find((z) => z.startMs > start);
    const end = Math.min(rec.durationMs, next ? next.startMs : start + 2500, start + 2500);
    if (end - start < 400) return setError("There's no room for another zoom here. Move or delete the next one first.");
    const z: ZoomSegment = { id: zoomId(), startMs: start, endMs: end, scale: DEFAULT_ZOOM, ...clampFocus(x, y, DEFAULT_ZOOM) };
    setZoomList([...zooms, z]);
    setSelected(z.id);
    track("recorder_zoom_added");
  };

  const deleteZoom = useCallback((id: string) => {
    setZooms((list) => list.filter((z) => z.id !== id));
    setSelected(null);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest("input, select, textarea")) return;
      if (e.code === "Space" && rec) {
        e.preventDefault();
        togglePlay();
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selected) deleteZoom(selected);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rec, selected, togglePlay, deleteZoom]);

  // click the preview: focus the selected zoom there, or add one at the playhead
  const onPreviewClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!rec) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * size.width;
    const py = ((e.clientY - r.top) / r.height) * size.height;
    const p = canvasToRecording(px, py, size.width, size.height, rec.width, rec.height, style);
    if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) return;
    const z = selectedZoom ?? zooms.find((s) => timeMs >= s.startMs && timeMs < s.endMs);
    if (z) {
      setSelected(z.id);
      patchZoom(z.id, { x: p.x, y: p.y });
    } else addZoomAt(timeMs, p.x, p.y);
  };

  /* ------------------------------ timeline ----------------------------- */

  const timelineRef = useRef<HTMLDivElement>(null);
  const msAt = (clientX: number) => {
    const r = timelineRef.current!.getBoundingClientRect();
    return ((clientX - r.left) / r.width) * (rec?.durationMs ?? 0);
  };
  const startDrag = (e: React.PointerEvent, z: ZoomSegment, mode: "move" | "start" | "end") => {
    e.stopPropagation();
    setSelected(z.id);
    const origin = msAt(e.clientX);
    const { startMs, endMs } = z;
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const d = msAt(ev.clientX) - origin;
      const others = zooms.filter((o) => o.id !== z.id);
      const lo = Math.max(0, ...others.filter((o) => o.endMs <= startMs).map((o) => o.endMs));
      const hi = Math.min(rec!.durationMs, ...others.filter((o) => o.startMs >= endMs).map((o) => o.startMs));
      let s = startMs;
      let en = endMs;
      if (mode === "move") {
        const len = endMs - startMs;
        s = Math.min(Math.max(lo, startMs + d), hi - len);
        en = s + len;
      } else if (mode === "start") s = Math.min(Math.max(lo, startMs + d), endMs - 400);
      else en = Math.max(Math.min(hi, endMs + d), startMs + 400);
      setZooms((list) => list.map((o) => (o.id === z.id ? { ...o, startMs: Math.round(s), endMs: Math.round(en) } : o)));
    };
    const up = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", up);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
  };

  /* ------------------------------- export ------------------------------ */

  async function onExport() {
    if (!rec || exportProgress !== null) return;
    if (!isPro) {
      track("recorder_export_blocked");
      setUpgradeOpen(true);
      return;
    }
    setError(null);
    videoRef.current?.pause();
    const ac = new AbortController();
    abortRef.current = ac;
    setExportProgress(0);
    try {
      const { blob, ext } = await exportRecording({ rec, zooms, style, long: quality, fps, signal: ac.signal, onProgress: setExportProgress });
      downloadBlob(blob, `${rec.name.replace(/\.[a-z0-9]+$/i, "")}-mockframe.${ext}`);
      track("recorder_exported", { seconds: Math.round(rec.durationMs / 1000), zooms: zooms.length, quality, fps, aspect: style.aspect });
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setError(e instanceof Error ? e.message : "Export failed. Please try again.");
    } finally {
      setExportProgress(null);
      abortRef.current = null;
    }
  }

  /* -------------------------------- views ------------------------------- */

  const picker = (
    <input
      ref={fileRef}
      type="file"
      accept="video/mp4,video/webm,video/quicktime,video/*"
      className="hidden"
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) void open(f, f.name, "upload");
        e.target.value = "";
      }}
    />
  );

  if (!rec) {
    return (
      <div
        className="relative flex min-h-screen flex-col items-center justify-center bg-[#0b0b0f] px-6 py-20 text-center text-white"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = Array.from(e.dataTransfer.files).find((x) => x.type.startsWith("video/"));
          if (f) void open(f, f.name, "upload");
        }}
      >
        {picker}
        <Link href="/" className="absolute left-5 top-4 text-[13px] font-semibold text-white/80 hover:text-white">MockFrame</Link>
        <Film size={30} className="text-violet-300" />
        <h1 className="mt-5 max-w-xl text-balance text-[36px] font-semibold leading-tight tracking-[-0.03em]">Screen recordings that zoom in on what matters</h1>
        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-white/55">
          Record a tab, a window or your whole screen. Mockframe zooms in smoothly wherever something happens, puts it in a window on a
          background, and exports an MP4.
        </p>
        {capture ? (
          <div className="mt-9 flex flex-col items-center gap-3">
            <p className="flex items-center gap-2 text-[15px] font-medium">
              <Circle size={10} className="animate-pulse fill-red-500 text-red-500" /> Recording {fmt(now - captureStart)}
            </p>
            <button type="button" onClick={() => capture.stop()} className="flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-[14px] font-semibold text-zinc-950 hover:bg-zinc-200">
              <Square size={13} className="fill-current" /> Stop recording
            </button>
            <p className="text-[12.5px] text-white/40">Or use your browser&apos;s Stop sharing button.</p>
          </div>
        ) : busy ? (
          <p className="mt-9 text-[14px] text-white/70">{busy}</p>
        ) : (
          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
            {captureOk && (
              <button type="button" onClick={() => void record()} className="flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-[14px] font-semibold text-zinc-950 hover:bg-zinc-200">
                <Circle size={12} className="fill-red-500 text-red-500" /> Record your screen
              </button>
            )}
            <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-[14px] font-medium text-white/85 hover:border-white/30">
              <Upload size={14} /> Upload a recording
            </button>
          </div>
        )}
        {error && <p role="alert" className="mt-5 text-[13px] text-red-300">{error}</p>}
        <p className="mt-10 text-[12.5px] text-white/35">Your recording stays on this device. Up to 10 minutes; MP4, WebM or MOV.</p>
      </div>
    );
  }

  const dur = rec.durationMs;
  return (
    <div className="flex h-screen min-h-[600px] flex-col bg-[#0b0b0f] text-white">
      {picker}
      <header className="flex items-center gap-3 border-b border-white/10 bg-[#101014] px-4 py-2.5">
        <Link href="/" className="text-[13px] font-semibold text-white hover:text-violet-200">MockFrame</Link>
        <span aria-hidden className="h-4 w-px bg-white/15" />
        <p className="min-w-0 truncate text-[13px] text-white/70">{rec.name}</p>
        <span className="text-[12px] text-white/35">{fmt(dur)} long, {zooms.length} zoom{zooms.length === 1 ? "" : "s"}</span>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={() => fileRef.current?.click()} className="rounded-lg px-3 py-1.5 text-[13px] text-white/60 hover:bg-white/5 hover:text-white">
            Open another
          </button>
          {captureOk && (
            <button type="button" onClick={() => { setRec(null); void record(); }} className="rounded-lg px-3 py-1.5 text-[13px] text-white/60 hover:bg-white/5 hover:text-white">
              Record again
            </button>
          )}
          {exportProgress !== null ? (
            <button type="button" onClick={() => abortRef.current?.abort()} className="rounded-lg bg-white/10 px-4 py-1.5 text-[13px] font-semibold">
              Exporting {Math.round(exportProgress * 100)}%, cancel
            </button>
          ) : (
            <button type="button" onClick={() => void onExport()} className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-1.5 text-[13px] font-semibold hover:bg-violet-500">
              <Download size={14} /> Export video
              {!isPro && <span className="rounded-full bg-white/20 px-1.5 text-[9px] font-bold uppercase">Pro</span>}
            </button>
          )}
        </div>
      </header>
      {(error || busy) && (
        <div className={`border-b border-white/10 px-4 py-2 text-[13px] ${error ? "text-red-300" : "text-white/60"}`}>{error ?? busy}</div>
      )}

      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 items-center justify-center p-6">
            <canvas
              ref={canvasRef}
              width={size.width}
              height={size.height}
              onClick={onPreviewClick}
              className="max-h-full max-w-full cursor-crosshair rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
              style={{ aspectRatio: `${size.width} / ${size.height}` }}
              title={selectedZoom ? "Click to move the zoom's focus here" : "Click to zoom in here"}
            />
            <video
              ref={videoRef}
              src={rec.url}
              playsInline
              preload="auto"
              className="hidden"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
            />
          </div>

          <div className="border-t border-white/10 bg-[#101014] px-4 pb-4 pt-3">
            <div className="mb-2 flex items-center gap-3">
              <button type="button" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"} className="grid h-8 w-8 place-items-center rounded-full bg-white text-zinc-950 hover:bg-zinc-200">
                {playing ? <Pause size={14} className="fill-current" /> : <Play size={14} className="ml-0.5 fill-current" />}
              </button>
              <span className="w-24 text-[12px] tabular-nums text-white/60">{fmt(timeMs)} / {fmt(dur)}</span>
              <button type="button" onClick={() => addZoomAt(timeMs)} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-[12px] text-white/75 hover:border-white/25 hover:text-white">
                <Plus size={12} /> Add zoom here
              </button>
              <p className="ml-auto hidden text-[11.5px] text-white/35 lg:block">Click the video to zoom there. Drag a zoom to move it, or its edges to change how long it lasts.</p>
            </div>
            <div
              ref={timelineRef}
              className="relative h-12 cursor-pointer rounded-lg bg-white/[0.04]"
              onPointerDown={(e) => {
                setSelected(null);
                seek(msAt(e.clientX));
              }}
            >
              {zooms.map((z) => (
                <div
                  key={z.id}
                  onPointerDown={(e) => startDrag(e, z, "move")}
                  className={`absolute top-1.5 flex h-9 cursor-grab items-center justify-center rounded-md text-[11px] font-medium active:cursor-grabbing ${
                    z.id === selected ? "bg-violet-500 text-white ring-2 ring-white/70" : "bg-violet-600/60 text-white/90 hover:bg-violet-600/80"
                  }`}
                  style={{ left: `${(z.startMs / dur) * 100}%`, width: `${((z.endMs - z.startMs) / dur) * 100}%` }}
                >
                  <span onPointerDown={(e) => startDrag(e, z, "start")} className="absolute inset-y-0 left-0 w-2 cursor-ew-resize rounded-l-md hover:bg-white/30" />
                  <span className="truncate px-2">{z.scale.toFixed(1)}×</span>
                  <span onPointerDown={(e) => startDrag(e, z, "end")} className="absolute inset-y-0 right-0 w-2 cursor-ew-resize rounded-r-md hover:bg-white/30" />
                </div>
              ))}
              <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white" style={{ left: `${(timeMs / dur) * 100}%` }} />
            </div>
          </div>
        </main>

        <aside className="panel-scroll w-72 shrink-0 overflow-y-auto border-l border-white/10 bg-[#101014]">
          <Section title="Zooms">
            <button
              type="button"
              disabled={!samples}
              onClick={() => {
                if (!samples) return;
                const auto = detectZooms(samples, dur);
                setZooms(auto);
                setSelected(null);
                track("recorder_auto_zoom", { zooms: auto.length, again: true });
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-violet-600 px-2.5 py-1.5 text-[12px] font-semibold hover:bg-violet-500 disabled:opacity-50"
            >
              <Wand2 size={13} /> {zooms.length ? "Redo auto-zoom" : "Auto-zoom"}
            </button>
            {zooms.length === 0 && samples && (
              <p className="mt-2 text-[11.5px] leading-4 text-white/45">Nothing stood out to zoom on. Click the video to add a zoom where you want one.</p>
            )}
            {selectedZoom ? (
              <div className="mt-3 rounded-lg border border-white/10 bg-black/25 p-3">
                <div className="mb-2 flex items-center justify-between text-[12px] text-white/70">
                  <span>{fmt(selectedZoom.startMs)} to {fmt(selectedZoom.endMs)}</span>
                  <button type="button" onClick={() => deleteZoom(selectedZoom.id)} aria-label="Delete zoom" className="grid h-6 w-6 place-items-center rounded text-white/50 hover:bg-white/10 hover:text-red-300">
                    <Trash2 size={13} />
                  </button>
                </div>
                <label className="block text-[11.5px] text-white/55">
                  Zoom {selectedZoom.scale.toFixed(1)}×
                  <input
                    type="range"
                    min={MIN_ZOOM}
                    max={MAX_ZOOM}
                    step={0.05}
                    value={selectedZoom.scale}
                    onChange={(e) => patchZoom(selectedZoom.id, { scale: Number(e.target.value) })}
                    className="mt-1 w-full accent-violet-500"
                  />
                </label>
                <p className="mt-1 text-[11px] leading-4 text-white/40">Click the video to choose where this zoom looks.</p>
              </div>
            ) : (
              zooms.length > 0 && <p className="mt-2 text-[11.5px] leading-4 text-white/45">Pick a zoom on the timeline to change it.</p>
            )}
          </Section>

          <Section title="Background">
            <div className="grid grid-cols-4 gap-1.5">
              {RECORDER_BACKGROUNDS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  title={b.label}
                  aria-label={b.label}
                  aria-pressed={style.background === b.id}
                  onClick={() => setStyle((s) => ({ ...s, background: b.id }))}
                  className={`h-11 rounded-lg border ${style.background === b.id ? "border-white shadow-[0_0_0_1.5px_white]" : "border-white/10"}`}
                  style={{
                    background: b.radial
                      ? `radial-gradient(circle at 50% 30%, ${b.stops.join(", ")})`
                      : `linear-gradient(${b.angle ?? 135}deg, ${b.stops.join(", ")})`,
                  }}
                />
              ))}
            </div>
          </Section>

          <Section title="Frame">
            <Segmented value={style.frame} options={FRAMES} onChange={(frame) => setStyle((s) => ({ ...s, frame }))} />
            <label className="mt-3 block text-[11.5px] text-white/55">
              Space around it
              <input
                type="range"
                min={0}
                max={0.2}
                step={0.005}
                value={style.padding}
                onChange={(e) => setStyle((s) => ({ ...s, padding: Number(e.target.value) }))}
                className="mt-1 w-full accent-violet-500"
              />
            </label>
            <label className="mt-2 flex items-center gap-2 text-[12px] text-white/70">
              <input type="checkbox" checked={style.shadow} onChange={(e) => setStyle((s) => ({ ...s, shadow: e.target.checked }))} className="accent-violet-500" />
              Shadow
            </label>
          </Section>

          <Section title="Shape">
            <Segmented value={style.aspect} options={ASPECTS} onChange={(aspect) => setStyle((s) => ({ ...s, aspect }))} />
            <p className="mt-1.5 text-[11px] leading-4 text-white/40">16:9 for YouTube and websites, 1:1 or 4:5 for feeds, 9:16 for Reels and TikTok.</p>
          </Section>

          <Section title="Export">
            <div className="flex gap-2">
              <select value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="flex-1 rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-[12px]">
                {QUALITIES.map((q) => (
                  <option key={q.long} value={q.long}>{q.label}</option>
                ))}
              </select>
              <select value={fps} onChange={(e) => setFps(Number(e.target.value) as 30 | 60)} className="flex-1 rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-[12px]">
                <option value={60}>60 fps</option>
                <option value={30}>30 fps</option>
              </select>
            </div>
            <p className="mt-1.5 text-[11px] leading-4 text-white/40">
              {rec.hasAudio ? "The recording's sound is kept." : "This recording has no sound."} Exporting happens on this device.
            </p>
          </Section>

        </aside>
      </div>
      {upgradeOpen && <UpgradeModal reason="Screen recording exports" onClose={() => setUpgradeOpen(false)} />}
    </div>
  );
}
