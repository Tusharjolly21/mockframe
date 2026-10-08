"use client";

import { useEffect, useRef } from "react";
import { Camera, Download, MousePointer2, Music2, Navigation, Palette, Play, Trash2, Upload, Volume2, Wand2, ZoomIn } from "lucide-react";
import { ENTRANCES, RECORDER_BACKGROUNDS, type Aspect, type FrameStyle, type RecorderStyle } from "@/lib/recorder/compose";
import { CLICK_EFFECTS, CURSOR_COLORS, CURSOR_STYLES, drawClickEffect, drawCursor, type CursorSettings, type Highlight } from "@/lib/recorder/cursor";
import type { CameraCorner, CameraSettings, CameraShape } from "@/lib/recorder/overlay";
import { CLICK_SOUNDS, MUSIC, TYPING_SOUNDS, ZOOM_SOUNDS, type SoundSettings } from "@/lib/recorder/sounds";
import type { ClickEvent, TypingBurst } from "@/lib/recorder/track";
import { MAX_ZOOM, MIN_ZOOM, ZOOM_MOTIONS, type ZoomMotion, type ZoomSegment } from "@/lib/recorder/zoom";

export type InspectorTab = "zoom" | "cursor" | "sound" | "camera" | "look" | "export";

const TABS: { id: InspectorTab; label: string; icon: React.ReactNode }[] = [
  { id: "zoom", label: "Zoom", icon: <ZoomIn size={16} /> },
  { id: "cursor", label: "Cursor", icon: <MousePointer2 size={16} /> },
  { id: "sound", label: "Sound", icon: <Volume2 size={16} /> },
  { id: "camera", label: "Camera", icon: <Camera size={16} /> },
  { id: "look", label: "Look", icon: <Palette size={16} /> },
  { id: "export", label: "Export", icon: <Download size={16} /> },
];

const FRAMES: { id: FrameStyle; label: string }[] = [
  { id: "window", label: "Window" },
  { id: "rounded", label: "Rounded" },
  { id: "none", label: "None" },
];
const ASPECTS: { id: Aspect; label: string }[] = ["16:9", "4:3", "1:1", "4:5", "9:16"].map((a) => ({ id: a as Aspect, label: a }));
export const QUALITIES = [
  { long: 1920, label: "1080p" },
  { long: 2560, label: "1440p" },
  { long: 3840, label: "4K" },
];

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label?: string }) {
  return (
    <div role="group" aria-label={label} className="flex rounded-lg border border-white/10 bg-black/30 p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={`flex-1 rounded-md px-1.5 py-1 text-[12px] transition ${value === o.id ? "bg-white/15 font-medium text-white" : "text-white/55 hover:text-white"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="border-b border-white/[0.07] px-4 py-4 last:border-0">
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="text-[12px] font-semibold text-white/85">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Slider({ label, value, min, max, step, onChange, display }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; display?: string }) {
  return (
    <label className="mt-2.5 block text-[11.5px] text-white/55 first:mt-0">
      <span className="flex justify-between">
        {label}
        {display && <span className="tabular-nums text-white/40">{display}</span>}
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full accent-violet-500" />
    </label>
  );
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="mt-2 flex items-center gap-2 text-[12px] text-white/70">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-violet-500" />
      {children}
    </label>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-[11.5px] leading-[1.45] text-white/45">{children}</p>;
}

/** A tiny live drawing of a cursor look, with its click effect. */
function CursorSwatch({ style, color, effect }: { style: CursorSettings["style"]; color: string; effect: CursorSettings["clickEffect"] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = 48 * dpr;
    c.height = 40 * dpr;
    const ctx = c.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, 48, 40);
    const round = style === "dot" || style === "ring" || style === "glass";
    if (style === "original") {
      drawClickEffect(ctx, effect === "none" ? "ripple" : effect, 21, 15, 220, 13, color);
      drawCursor(ctx, { style: "mac", x: 20, y: 9, height: 20, alpha: 0.55, press: 0, color });
      return;
    }
    drawCursor(ctx, { style, x: round ? 24 : style === "hand" ? 22 : 18, y: round ? 20 : 7, height: round ? 26 : 24, alpha: 1, press: 0, color });
  }, [style, color, effect]);
  return <canvas ref={ref} style={{ width: 48, height: 40 }} aria-hidden />;
}

export interface InspectorProps {
  tab: InspectorTab;
  setTab: (t: InspectorTab) => void;
  analysing: boolean;
  hasCursor: boolean;
  hasCamera: boolean;
  hasAudio: boolean;
  durationMs: number;

  zooms: ZoomSegment[];
  selectedZoom: ZoomSegment | null;
  selectedClick: ClickEvent | null;
  selectedTyping: TypingBurst | null;
  clicksCount: number;
  onAutoZoom: () => void;
  onPatchZoom: (patch: Partial<ZoomSegment>) => void;
  onDeleteSelected: () => void;
  motion: ZoomMotion;
  setMotion: (m: ZoomMotion) => void;

  cursor: CursorSettings;
  setCursor: (c: CursorSettings) => void;
  sound: SoundSettings;
  setSound: (s: SoundSettings) => void;
  musicName: string | null;
  musicLoading: boolean;
  onMusicFile: (f: File) => void;
  onAudition: (key: string) => void;
  camera: CameraSettings;
  setCamera: (c: CameraSettings) => void;
  style: RecorderStyle;
  setStyle: (s: RecorderStyle) => void;
  quality: number;
  setQuality: (q: number) => void;
  fps: 30 | 60;
  setFps: (f: 30 | 60) => void;
}

const fmt = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}.${Math.floor((ms % 1000) / 100)}`;
};

export function Inspector(p: InspectorProps) {
  const musicRef = useRef<HTMLInputElement>(null);
  const c = p.cursor;
  const setC = (patch: Partial<CursorSettings>) => p.setCursor({ ...c, ...patch });
  const s = p.sound;
  const setS = (patch: Partial<SoundSettings>) => p.setSound({ ...s, ...patch });
  const cam = p.camera;
  const setCam = (patch: Partial<CameraSettings>) => p.setCamera({ ...cam, ...patch });
  const st = p.style;
  const setSt = (patch: Partial<RecorderStyle>) => p.setStyle({ ...st, ...patch });

  return (
    <aside className="flex w-[19rem] shrink-0 border-l border-white/10 bg-[#101014]">
      <nav className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-white/[0.07] py-3" aria-label="Settings">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => p.setTab(t.id)}
            aria-current={p.tab === t.id ? "page" : undefined}
            className={`flex w-12 flex-col items-center gap-1 rounded-lg py-2 text-[10px] transition ${p.tab === t.id ? "bg-white/10 text-white" : "text-white/45 hover:bg-white/5 hover:text-white/80"}`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </nav>
      <div className="panel-scroll min-w-0 flex-1 overflow-y-auto">
        {p.tab === "zoom" && (
          <>
            <Section title="Zooms">
              <button
                type="button"
                disabled={p.analysing}
                onClick={p.onAutoZoom}
                className="flex w-full items-center justify-center gap-1.5 rounded-md bg-violet-600 px-2.5 py-1.5 text-[12px] font-semibold hover:bg-violet-500 disabled:opacity-50"
              >
                <Wand2 size={13} /> {p.zooms.length ? "Redo auto-zoom" : "Auto-zoom"}
              </button>
              <Hint>
                {p.analysing
                  ? "Watching the recording for clicks and typing…"
                  : p.clicksCount
                    ? `Zooms in on your ${p.clicksCount} click${p.clicksCount === 1 ? "" : "s"}, typing, and anything else that changes.`
                    : "Zooms in wherever something changes on screen. Press Z to add one at the playhead."}
              </Hint>
            </Section>
            <Section title="Animation">
              <div className="grid grid-cols-3 gap-1.5">
                {ZOOM_MOTIONS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    title={m.hint}
                    aria-pressed={p.motion === m.id}
                    onClick={() => p.setMotion(m.id)}
                    className={`rounded-md border px-1 py-1.5 text-[11.5px] ${p.motion === m.id ? "border-violet-400/70 bg-violet-500/15 text-white" : "border-white/10 text-white/60 hover:text-white"}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <Check checked={st.motionBlur} onChange={(v) => setSt({ motionBlur: v })}>Motion blur on fast moves</Check>
            </Section>
            {p.selectedZoom ? (
              <Section
                title={`Zoom ${fmt(p.selectedZoom.startMs)} to ${fmt(p.selectedZoom.endMs)}`}
                aside={
                  <button type="button" onClick={p.onDeleteSelected} aria-label="Delete zoom" className="grid h-6 w-6 place-items-center rounded text-white/50 hover:bg-white/10 hover:text-red-300">
                    <Trash2 size={13} />
                  </button>
                }
              >
                <Slider
                  label={p.selectedZoom.scale < 1 ? "Zoom out" : "Zoom in"}
                  display={`${p.selectedZoom.scale.toFixed(2)}×`}
                  min={MIN_ZOOM}
                  max={MAX_ZOOM}
                  step={0.05}
                  value={p.selectedZoom.scale}
                  onChange={(v) => p.onPatchZoom({ scale: Math.abs(v - 1) < 0.04 ? 1.05 : v })}
                />
                <div className="mt-2 flex gap-1.5">
                  {[0.8, 1.5, 2, 2.5, 3].map((v) => (
                    <button key={v} type="button" onClick={() => p.onPatchZoom({ scale: v })} className="flex-1 rounded border border-white/10 py-0.5 text-[11px] text-white/60 hover:text-white">
                      {v}×
                    </button>
                  ))}
                </div>
                <Check checked={!!p.selectedZoom.follow} onChange={(v) => p.onPatchZoom({ follow: v })}>
                  <Navigation size={12} /> Follow the cursor
                </Check>
                <Hint>{p.selectedZoom.follow ? (p.hasCursor ? "The camera pans to keep your cursor in view." : "No cursor was found in this recording, so the zoom stays put.") : "Click the video to choose where this zoom looks."}</Hint>
              </Section>
            ) : p.selectedClick ? (
              <Section
                title={`Click at ${fmt(p.selectedClick.t)}`}
                aside={
                  <button type="button" onClick={p.onDeleteSelected} aria-label="Delete click" className="grid h-6 w-6 place-items-center rounded text-white/50 hover:bg-white/10 hover:text-red-300">
                    <Trash2 size={13} />
                  </button>
                }
              >
                <Hint>Drag it on the timeline to move it in time, or click the video to move where it happens. Clicks play the click sound and effect.</Hint>
              </Section>
            ) : p.selectedTyping ? (
              <Section
                title={`Typing ${fmt(p.selectedTyping.startMs)} to ${fmt(p.selectedTyping.endMs)}`}
                aside={
                  <button type="button" onClick={p.onDeleteSelected} aria-label="Delete typing" className="grid h-6 w-6 place-items-center rounded text-white/50 hover:bg-white/10 hover:text-red-300">
                    <Trash2 size={13} />
                  </button>
                }
              >
                <Hint>Plays keyboard sounds while you type. Delete it if this wasn&apos;t typing.</Hint>
              </Section>
            ) : (
              <Section title="Editing">
                <Hint>Pick a zoom, click or typing mark on the timeline to change it. Click the video to add a zoom where you click.</Hint>
              </Section>
            )}
          </>
        )}

        {p.tab === "cursor" && (
          <>
            <Section title="Cursor">
              {!p.hasCursor && !p.analysing && (
                <p className="mb-3 rounded-lg bg-amber-400/10 px-3 py-2 text-[11.5px] leading-[1.45] text-amber-100/80">
                  No cursor was found in this recording, so new cursor looks can&apos;t be drawn. Click effects still play on clicks you add.
                </p>
              )}
              <div className="grid grid-cols-4 gap-1.5">
                {CURSOR_STYLES.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={c.style === o.id}
                    onClick={() => setC({ style: o.id })}
                    disabled={!p.hasCursor && o.id !== "original"}
                    className={`flex flex-col items-center rounded-lg border pb-1 pt-0.5 text-[10px] disabled:opacity-35 ${c.style === o.id ? "border-violet-400/70 bg-violet-500/15 text-white" : "border-white/10 text-white/55 hover:border-white/25"}`}
                  >
                    <CursorSwatch style={o.id} color={c.color} effect={c.clickEffect} />
                    {o.label}
                  </button>
                ))}
              </div>
              {c.style !== "original" && (
                <>
                  <Slider label="Size" display={`${c.size.toFixed(1)}×`} min={0.8} max={3.5} step={0.1} value={c.size} onChange={(v) => setC({ size: v })} />
                  <Slider label="Smoothing" display={c.smoothing < 0.05 ? "Off" : c.smoothing < 0.4 ? "Light" : c.smoothing < 0.75 ? "Smooth" : "Floaty"} min={0} max={1} step={0.05} value={c.smoothing} onChange={(v) => setC({ smoothing: v })} />
                  <Check checked={c.motionBlur} onChange={(v) => setC({ motionBlur: v })}>Stretch on fast moves</Check>
                </>
              )}
              <Check checked={c.hideIdle} onChange={(v) => setC({ hideIdle: v })}>Hide when it stops moving</Check>
            </Section>
            <Section title="Highlight">
              <Segmented<Highlight>
                label="Highlight"
                value={c.highlight}
                options={[
                  { id: "none", label: "None" },
                  { id: "halo", label: "Glow" },
                  { id: "spotlight", label: "Spotlight" },
                ]}
                onChange={(v) => setC({ highlight: v })}
              />
            </Section>
            <Section title="Clicks">
              <Segmented label="Click effect" value={c.clickEffect} options={CLICK_EFFECTS} onChange={(v) => setC({ clickEffect: v })} />
              <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Colour">
                {CURSOR_COLORS.map((col) => (
                  <button
                    key={col}
                    type="button"
                    aria-label={`Colour ${col}`}
                    aria-pressed={c.color === col}
                    onClick={() => setC({ color: col })}
                    className={`h-6 w-6 rounded-full border ${c.color === col ? "border-white shadow-[0_0_0_2px_rgba(255,255,255,0.35)]" : "border-white/20"}`}
                    style={{ background: col }}
                  />
                ))}
              </div>
              <Hint>{p.clicksCount ? `${p.clicksCount} click${p.clicksCount === 1 ? "" : "s"} found. Press C to add one at the playhead.` : "Press C to add a click at the playhead."}</Hint>
            </Section>
          </>
        )}

        {p.tab === "sound" && (
          <>
            <Section title="Click sound">
              <div className="grid grid-cols-3 gap-1.5">
                {CLICK_SOUNDS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={s.click === o.id}
                    onClick={() => {
                      setS({ click: o.id });
                      if (o.id !== "none") p.onAudition(`click:${o.id}:0`);
                    }}
                    className={`rounded-md border px-1 py-1.5 text-[11.5px] ${s.click === o.id ? "border-violet-400/70 bg-violet-500/15 text-white" : "border-white/10 text-white/60 hover:text-white"}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              {s.click !== "none" && <Slider label="Volume" display={`${Math.round(s.clickVolume * 100)}%`} min={0} max={1.5} step={0.05} value={s.clickVolume} onChange={(v) => setS({ clickVolume: v })} />}
            </Section>
            <Section title="Typing sound">
              <Segmented
                label="Typing sound"
                value={s.typing}
                options={TYPING_SOUNDS}
                onChange={(v) => {
                  setS({ typing: v });
                  if (v !== "none") p.onAudition(`key:${v}:1`);
                }}
              />
              {s.typing !== "none" && <Slider label="Volume" display={`${Math.round(s.typingVolume * 100)}%`} min={0} max={1.5} step={0.05} value={s.typingVolume} onChange={(v) => setS({ typingVolume: v })} />}
            </Section>
            <Section title="Zoom sound">
              <Segmented
                label="Zoom sound"
                value={s.zoom}
                options={ZOOM_SOUNDS}
                onChange={(v) => {
                  setS({ zoom: v });
                  if (v !== "none") p.onAudition(`whoosh:${v}:in`);
                }}
              />
              {s.zoom !== "none" && <Slider label="Volume" display={`${Math.round(s.zoomVolume * 100)}%`} min={0} max={1.5} step={0.05} value={s.zoomVolume} onChange={(v) => setS({ zoomVolume: v })} />}
            </Section>
            <Section title="Music" aside={<Music2 size={13} className="text-white/35" />}>
              <input
                ref={musicRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) p.onMusicFile(f);
                  e.target.value = "";
                }}
              />
              <div className="grid grid-cols-3 gap-1.5">
                {MUSIC.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={s.music === o.id}
                    onClick={() => (o.id === "custom" && !p.musicName ? musicRef.current?.click() : setS({ music: o.id }))}
                    className={`rounded-md border px-1 py-1.5 text-[11.5px] ${s.music === o.id ? "border-violet-400/70 bg-violet-500/15 text-white" : "border-white/10 text-white/60 hover:text-white"}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              {s.music === "custom" && p.musicName && (
                <button type="button" onClick={() => musicRef.current?.click()} className="mt-2 flex w-full items-center gap-1.5 truncate text-[11.5px] text-white/55 hover:text-white">
                  <Upload size={12} /> {p.musicName}
                </button>
              )}
              {s.music !== "none" && <Slider label="Volume" display={`${Math.round(s.musicVolume * 100)}%`} min={0} max={1} step={0.05} value={s.musicVolume} onChange={(v) => setS({ musicVolume: v })} />}
              {p.musicLoading && <Hint>Preparing the music…</Hint>}
              {s.music !== "none" && s.music !== "custom" && <Hint>Made by Mockframe, free to use anywhere. It fades in and out with your video.</Hint>}
            </Section>
            <Section title="Recording sound">
              {p.hasAudio ? (
                <Slider label="Voice and screen sound" display={`${Math.round(s.recordingVolume * 100)}%`} min={0} max={1.5} step={0.05} value={s.recordingVolume} onChange={(v) => setS({ recordingVolume: v })} />
              ) : (
                <Hint>This recording has no sound of its own.</Hint>
              )}
              <button type="button" onClick={() => p.onAudition(`click:${s.click === "none" ? "mouse" : s.click}:0`)} className="mt-3 flex items-center gap-1.5 text-[11.5px] text-white/55 hover:text-white">
                <Play size={11} className="fill-current" /> Hear the click
              </button>
            </Section>
          </>
        )}

        {p.tab === "camera" && (
          <Section title="Camera bubble">
            {!p.hasCamera ? (
              <Hint>Turn on Camera before you record to add a camera bubble. It&apos;s recorded alongside your screen and placed here.</Hint>
            ) : (
              <>
                <Check checked={cam.visible} onChange={(v) => setCam({ visible: v })}>Show the camera</Check>
                <p className="mb-1.5 mt-3 text-[11.5px] text-white/55">Corner</p>
                <Segmented<CameraCorner>
                  label="Corner"
                  value={cam.corner}
                  options={[
                    { id: "tl", label: "Top left" },
                    { id: "tr", label: "Top right" },
                    { id: "bl", label: "Bottom left" },
                    { id: "br", label: "Bottom right" },
                  ]}
                  onChange={(v) => setCam({ corner: v })}
                />
                <p className="mb-1.5 mt-3 text-[11.5px] text-white/55">Shape</p>
                <Segmented<CameraShape>
                  label="Shape"
                  value={cam.shape}
                  options={[
                    { id: "circle", label: "Circle" },
                    { id: "rounded", label: "Rounded" },
                    { id: "square", label: "Square" },
                  ]}
                  onChange={(v) => setCam({ shape: v })}
                />
                <Slider label="Size" display={`${Math.round(cam.size * 100)}%`} min={0.1} max={0.42} step={0.01} value={cam.size} onChange={(v) => setCam({ size: v })} />
                <Check checked={cam.shrinkOnZoom} onChange={(v) => setCam({ shrinkOnZoom: v })}>Shrink while zoomed in</Check>
                <Check checked={cam.mirror} onChange={(v) => setCam({ mirror: v })}>Mirror</Check>
                <Check checked={cam.border} onChange={(v) => setCam({ border: v })}>White border</Check>
              </>
            )}
          </Section>
        )}

        {p.tab === "look" && (
          <>
            <Section title="Background">
              <div className="grid grid-cols-4 gap-1.5">
                {RECORDER_BACKGROUNDS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    title={b.label}
                    aria-label={b.label}
                    aria-pressed={st.background === b.id}
                    onClick={() => setSt({ background: b.id })}
                    className={`h-11 rounded-lg border ${st.background === b.id ? "border-white shadow-[0_0_0_1.5px_white]" : "border-white/10"}`}
                    style={{ background: b.radial ? `radial-gradient(circle at 50% 30%, ${b.stops.join(", ")})` : `linear-gradient(${b.angle ?? 135}deg, ${b.stops.join(", ")})` }}
                  />
                ))}
              </div>
            </Section>
            <Section title="Frame">
              <Segmented label="Frame" value={st.frame} options={FRAMES} onChange={(frame) => setSt({ frame })} />
              <Slider label="Space around it" min={0} max={0.2} step={0.005} value={st.padding} onChange={(v) => setSt({ padding: v })} />
              {st.frame !== "none" && <Slider label="Corners" min={0} max={0.05} step={0.002} value={st.radius} onChange={(v) => setSt({ radius: v })} />}
              <Check checked={st.shadow} onChange={(v) => setSt({ shadow: v })}>Shadow</Check>
            </Section>
            <Section title="Intro and outro">
              <p className="mb-1.5 text-[11.5px] text-white/55">At the start</p>
              <Segmented label="Intro" value={st.intro} options={ENTRANCES} onChange={(intro) => setSt({ intro })} />
              <p className="mb-1.5 mt-3 text-[11.5px] text-white/55">At the end</p>
              <Segmented label="Outro" value={st.outro} options={ENTRANCES} onChange={(outro) => setSt({ outro })} />
            </Section>
            <Section title="Shape">
              <Segmented label="Shape" value={st.aspect} options={ASPECTS} onChange={(aspect) => setSt({ aspect })} />
              <Hint>16:9 for YouTube and websites, 1:1 or 4:5 for feeds, 9:16 for Reels and TikTok.</Hint>
            </Section>
          </>
        )}

        {p.tab === "export" && (
          <Section title="Export">
            <div className="flex gap-2">
              <select aria-label="Quality" value={p.quality} onChange={(e) => p.setQuality(Number(e.target.value))} className="flex-1 rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-[12px]">
                {QUALITIES.map((q) => (
                  <option key={q.long} value={q.long}>{q.label}</option>
                ))}
              </select>
              <select aria-label="Frame rate" value={p.fps} onChange={(e) => p.setFps(Number(e.target.value) as 30 | 60)} className="flex-1 rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-[12px]">
                <option value={60}>60 fps</option>
                <option value={30}>30 fps</option>
              </select>
            </div>
            <Hint>
              Exports an MP4 with your zooms, cursor, camera and every sound mixed in. {p.hasAudio ? "The recording's own sound is kept." : ""} Exporting happens on this device.
            </Hint>
          </Section>
        )}
      </div>
    </aside>
  );
}
