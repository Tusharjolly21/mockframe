"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Download, Keyboard, MousePointerClick, Pause, Play, Plus, Redo2, Undo2 } from "lucide-react";
import { UpgradeModal } from "@/components/editor/UpgradeModal";
import { track } from "@/lib/analytics";
import { useEntitlementSync } from "@/lib/billing/client";
import { useIsPro } from "@/lib/billing/gate";
import { downloadBlob } from "@/lib/videoEncode";
import { canvasSize, canvasToRecording, DEFAULT_RECORDER_STYLE, drawFrame, paintBackground, type RecorderStyle } from "@/lib/recorder/compose";
import { DEFAULT_CURSOR, rawCursorAt, smoothCursor, type CursorSettings } from "@/lib/recorder/cursor";
import { cameraCursor, exportRecording, shutterPoses } from "@/lib/recorder/export";
import { decodeMusicFile, musicBed } from "@/lib/recorder/music";
import { cleanFrameTime, CursorEraser, DEFAULT_CAMERA, drawCameraBubble, drawCursorLayer, type CameraSettings, type CursorLayer } from "@/lib/recorder/overlay";
import { matchEditorKey, matchRecordingKey } from "@/lib/recorder/shortcuts";
import { buildSoundEvents, DEFAULT_SOUNDS, LiveSoundPlayer, type SoundSettings } from "@/lib/recorder/sounds";
import {
  analyzeRecording,
  canCapture,
  frameFetcher,
  listDevices,
  loadCameraRecording,
  loadRecording,
  openCamera,
  openMic,
  startCapture,
  type Capture,
  type Recording,
} from "@/lib/recorder/source";
import { clickId, type ClickEvent, type CursorTrack, type TypingBurst } from "@/lib/recorder/track";
import { cameraTrack, clampFocus, DEFAULT_ZOOM, detectZooms, normalizeZooms, zoomId, type ActivitySample, type ZoomMotion, type ZoomSegment } from "@/lib/recorder/zoom";
import { canFloat, FloatingControls, useFloatingWindow, type ControlsProps } from "./FloatingControls";
import { Inspector, type InspectorTab } from "./Inspector";
import { DEFAULT_RECORD_OPTIONS, RecordSetup, type RecordOptions } from "./RecordSetup";
import { RecorderShortcuts } from "./RecorderShortcuts";
import { Timeline, typingId, type Selection } from "./Timeline";

/** the preview's long side in canvas pixels: sharp on high-density screens, capped to keep playback smooth */
const previewLong = () => (typeof window === "undefined" ? 1280 : Math.round(Math.min(2560, Math.max(1280, window.innerWidth * 0.8 * (window.devicePixelRatio || 1)))));
const PREVIEW_FPS = 30;
const PREFS_KEY = "mockframe.recorder.v2";

const fmt = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

interface Edits {
  zooms: ZoomSegment[];
  clicks: ClickEvent[];
  typing: TypingBurst[];
}
const NO_EDITS: Edits = { zooms: [], clicks: [], typing: [] };

interface Prefs {
  options: RecordOptions;
  style: RecorderStyle;
  cursor: CursorSettings;
  sound: SoundSettings;
  camera: CameraSettings;
  motion: ZoomMotion;
}

function loadPrefs(): Partial<Prefs> {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") as Partial<Prefs>;
  } catch {
    return {};
  }
}

/** A fresh recording starts plain and silent (see `open`). */
const FRESH_CURSOR: Partial<CursorSettings> = { style: "original", clickEffect: "none", highlight: "none", motionBlur: false };
const FRESH_SOUND: Partial<SoundSettings> = { click: "none", typing: "none", zoom: "none", music: "none" };

const emptyTrack = (rec: Recording): CursorTrack => ({ points: [], shapes: [], res: { w: rec.width, h: rec.height }, w: 0.01, h: 0.016 });

function beep(freq: number) {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.12, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.2);
    o.onended = () => void ctx.close();
  } catch {
    /* no audio: the countdown still shows */
  }
}

/**
 * Screen Recorder: record (or upload) a screen recording. Mockframe finds the
 * cursor, the clicks and the typing in it, zooms in on them, restyles the
 * cursor, adds click and typing sounds, music and a camera bubble, and
 * exports an MP4.
 */
export function RecorderStudio() {
  useEntitlementSync();
  const isPro = useIsPro();

  /* ------------------------------ preferences ----------------------------- */

  const [options, setOptions] = useState<RecordOptions>(DEFAULT_RECORD_OPTIONS);
  const [style, setStyle] = useState<RecorderStyle>(DEFAULT_RECORDER_STYLE);
  const [cursor, setCursor] = useState<CursorSettings>(DEFAULT_CURSOR);
  const [sound, setSound] = useState<SoundSettings>(DEFAULT_SOUNDS);
  const [camera, setCamera] = useState<CameraSettings>(DEFAULT_CAMERA);
  const [motion, setMotion] = useState<ZoomMotion>("smooth");
  const prefsLoaded = useRef(false);
  useEffect(() => {
    const p = loadPrefs();
    if (p.options) setOptions({ ...DEFAULT_RECORD_OPTIONS, ...p.options });
    if (p.style) setStyle({ ...DEFAULT_RECORDER_STYLE, ...p.style });
    if (p.cursor) setCursor({ ...DEFAULT_CURSOR, ...p.cursor });
    if (p.sound) setSound({ ...DEFAULT_SOUNDS, ...p.sound, music: p.sound.music === "custom" ? "none" : (p.sound.music ?? "none") });
    if (p.camera) setCamera({ ...DEFAULT_CAMERA, ...p.camera });
    if (p.motion) setMotion(p.motion);
    prefsLoaded.current = true;
  }, []);
  useEffect(() => {
    if (!prefsLoaded.current) return;
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ options, style, cursor, sound, camera, motion } satisfies Prefs));
    } catch {
      /* private mode: settings just won't stick */
    }
  }, [options, style, cursor, sound, camera, motion]);

  /* -------------------------------- sources -------------------------------- */

  const [captureOk, setCaptureOk] = useState(false);
  const [floatOk, setFloatOk] = useState(false);
  useEffect(() => {
    setCaptureOk(canCapture());
    setFloatOk(canFloat());
  }, []);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [camStream, setCamStream] = useState<MediaStream | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [rec, setRec] = useState<Recording | null>(null);
  /** back on the setup screen for another take, with the last one still open */
  const [newTake, setNewTake] = useState(false);
  const editing = !!rec && !newTake;

  // open the mic and camera while setting up, so permission is asked once and you can see yourself
  useEffect(() => {
    if (editing || !options.mic) {
      setMicStream(null);
      return;
    }
    let stream: MediaStream | null = null;
    let live = true;
    openMic(options.micId || undefined)
      .then(async (s) => {
        if (!live) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        setMicStream(s);
        const d = await listDevices();
        setMics(d.mics);
      })
      .catch(() => {
        setError("Mockframe couldn't use your microphone. Allow it in the address bar, then turn Microphone on again.");
        setOptions((o) => ({ ...o, mic: false }));
      });
    return () => {
      live = false;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [options.mic, options.micId, editing]);

  useEffect(() => {
    if (editing || !options.camera) {
      setCamStream(null);
      return;
    }
    let stream: MediaStream | null = null;
    let live = true;
    openCamera(options.cameraId || undefined)
      .then(async (s) => {
        if (!live) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        setCamStream(s);
        const d = await listDevices();
        setCameras(d.cameras);
      })
      .catch(() => {
        setError("Mockframe couldn't use your camera. Allow it in the address bar, then turn Camera on again.");
        setOptions((o) => ({ ...o, camera: false }));
      });
    return () => {
      live = false;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [options.camera, options.cameraId, editing]);

  // mic level meter
  useEffect(() => {
    if (!micStream) return setMicLevel(0);
    const ctx = new AudioContext();
    const an = ctx.createAnalyser();
    an.fftSize = 512;
    ctx.createMediaStreamSource(micStream).connect(an);
    const buf = new Uint8Array(an.fftSize);
    const id = setInterval(() => {
      an.getByteTimeDomainData(buf);
      let peak = 0;
      for (const v of buf) peak = Math.max(peak, Math.abs(v - 128) / 128);
      setMicLevel(Math.min(1, peak * 2.2));
    }, 90);
    return () => {
      clearInterval(id);
      void ctx.close();
    };
  }, [micStream]);

  /* ------------------------------- recording ------------------------------- */

  const float = useFloatingWindow();
  const [controls, setControls] = useState<{ phase: ControlsProps["phase"]; count: number; needsClick: boolean } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const captureRef = useRef<Capture | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [edits, setEditsState] = useState<Edits>(NO_EDITS);
  const history = useRef<{ undo: Edits[]; redo: Edits[]; base: Edits | null }>({ undo: [], redo: [], base: null });
  const editsRef = useRef(edits);
  editsRef.current = edits;
  const [cursorTrack, setCursorTrack] = useState<CursorTrack | null>(null);
  const [activity, setActivity] = useState<ActivitySample[] | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [selected, setSelected] = useState<Selection>(null);

  /** Change the edits; `commit` adds an undo step (live drags pass false until they let go). */
  const setEdits = useCallback((next: Edits, commit = true) => {
    const h = history.current;
    if (!commit) {
      h.base ??= editsRef.current;
    } else {
      h.undo.push(h.base ?? editsRef.current);
      if (h.undo.length > 100) h.undo.shift();
      h.redo = [];
      h.base = null;
    }
    editsRef.current = next;
    setEditsState(next);
  }, []);
  const undo = useCallback(() => {
    const h = history.current;
    const prev = h.undo.pop();
    if (!prev) return;
    h.redo.push(editsRef.current);
    editsRef.current = prev;
    setEditsState(prev);
  }, []);
  const redo = useCallback(() => {
    const h = history.current;
    const next = h.redo.pop();
    if (!next) return;
    h.undo.push(editsRef.current);
    editsRef.current = next;
    setEditsState(next);
  }, []);

  const open = useCallback(async (blob: Blob, name: string, source: "record" | "upload", cameraBlob: Blob | null = null) => {
    setError(null);
    setBusy("Reading your recording…");
    try {
      const next = await loadRecording(blob, name, { fromCapture: source === "record" });
      if (cameraBlob) next.camera = await loadCameraRecording(cameraBlob);
      setNewTake(false);
      setRec((old) => {
        if (old) {
          URL.revokeObjectURL(old.url);
          if (old.camera) URL.revokeObjectURL(old.camera.url);
        }
        return next;
      });
      history.current = { undo: [], redo: [], base: null };
      // every new recording opens clean: the screen as recorded with the camera
      // zooming and following along, silent, no effects. Sounds, music and cursor
      // styles are one click away in the panel.
      setCursor((c) => ({ ...c, ...FRESH_CURSOR }));
      setSound((s) => ({ ...s, ...FRESH_SOUND }));
      setStyle((st) => ({ ...st, motionBlur: false }));
      // a sharp screen gets a sharp export: zoomed-in shots keep their detail
      setQuality(next.width >= 2560 ? 2560 : 1920);
      editsRef.current = NO_EDITS;
      setEditsState(NO_EDITS);
      setSelected(null);
      setTimeMs(0);
      setCursorTrack(null);
      setActivity(null);
      setBusy(null);
      track("recorder_loaded", { source, seconds: Math.round(next.durationMs / 1000), camera: !!next.camera });

      setAnalysing(true);
      setBusy("Finding your cursor, clicks and typing… 0%");
      const a = await analyzeRecording(next, (f) => setBusy(`Finding your cursor, clicks and typing… ${Math.round(f * 100)}%`));
      setCursorTrack(a.cursor);
      setActivity(a.activity);
      const zooms = detectZooms(a.activity, next.durationMs, { clicks: a.clicks, typing: a.typing, follow: !!a.cursor });
      editsRef.current = { zooms, clicks: a.clicks, typing: a.typing };
      setEditsState(editsRef.current);
      track("recorder_auto_zoom", { zooms: zooms.length, clicks: a.clicks.length, typing: a.typing.length, cursor: !!a.cursor });
    } catch (e) {
      setError(e instanceof Error ? e.message : "That recording couldn't be opened.");
    } finally {
      setAnalysing(false);
      setBusy(null);
    }
  }, []);

  const finishCapture = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = null;
    captureRef.current = null;
    setControls(null);
    float.close();
  }, [float]);

  /** Ask for the screen, count down, record, then open the result. */
  const pickAndRecord = useCallback(async () => {
    setControls({ phase: "picking", count: 0, needsClick: false });
    let c: Capture;
    try {
      c = await startCapture({ systemAudio: options.systemAudio, mic: options.mic ? micStream : null, camera: options.camera ? camStream : null });
    } catch (e) {
      // opening the floating window can use up the click that allows screen sharing:
      // ask for one more click there (it counts for this tab too)
      if (e instanceof DOMException && e.name === "InvalidStateError" && float.win) {
        setControls({ phase: "picking", count: 0, needsClick: true });
        return;
      }
      finishCapture();
      // cancelling the share picker is not an error worth showing
      if (!(e instanceof DOMException && e.name === "NotAllowedError")) setError(e instanceof Error ? e.message : "Recording failed.");
      return;
    }
    captureRef.current = c;
    const go = () => {
      c.begin();
      setControls({ phase: "recording", count: 0, needsClick: false });
      track("recorder_started", { mic: options.mic, camera: options.camera, countdown: options.countdown });
    };
    if (options.countdown > 0) {
      let n = options.countdown;
      setControls({ phase: "countdown", count: n, needsClick: false });
      beep(660);
      countdownRef.current = setInterval(() => {
        n--;
        if (n <= 0) {
          clearInterval(countdownRef.current!);
          countdownRef.current = null;
          beep(990);
          go();
        } else {
          beep(660);
          setControls({ phase: "countdown", count: n, needsClick: false });
        }
      }, 1000);
    } else go();

    try {
      const result = await c.done;
      finishCapture();
      await open(result.screen, `recording-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.webm`, "record", result.camera);
    } catch (e) {
      finishCapture();
      if (!(e instanceof DOMException && e.name === "AbortError")) setError(e instanceof Error ? e.message : "Recording failed.");
    }
  }, [options, micStream, camStream, float.win, finishCapture, open]);

  const record = useCallback(async () => {
    if (captureRef.current || controls || busy) return;
    setError(null);
    // the floating window needs the click that started this, so it opens first
    if (options.floating && canFloat()) await float.open();
    await pickAndRecord();
  }, [controls, busy, options.floating, float, pickAndRecord]);

  const stopRecording = useCallback(() => captureRef.current?.stop(), []);
  const cancelRecording = useCallback(() => {
    captureRef.current?.cancel();
    if (!captureRef.current) finishCapture();
  }, [finishCapture]);
  const togglePause = useCallback(() => {
    const c = captureRef.current;
    if (!c) return;
    if (c.state() === "recording") {
      c.pause();
      setControls({ phase: "paused", count: 0, needsClick: false });
    } else if (c.state() === "paused") {
      c.resume();
      setControls({ phase: "recording", count: 0, needsClick: false });
    }
  }, []);

  useEffect(() => {
    if (!controls || (controls.phase !== "recording" && controls.phase !== "paused")) return;
    const id = setInterval(() => setElapsed(captureRef.current?.elapsedMs() ?? 0), 200);
    return () => clearInterval(id);
  }, [controls]);

  /* ------------------------------- playback -------------------------------- */

  const [playing, setPlaying] = useState(false);
  const [timeMs, setTimeMs] = useState(0);
  const [quality, setQuality] = useState(1920);
  const [fps, setFps] = useState<30 | 60>(60);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [tab, setTab] = useState<InspectorTab>("zoom");
  const [help, setHelp] = useState(false);
  const [musicBuf, setMusicBuf] = useState<AudioBuffer | null>(null);
  const [customMusic, setCustomMusic] = useState<{ name: string; buf: AudioBuffer } | null>(null);
  const [musicLoading, setMusicLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const camVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgRef = useRef<HTMLCanvasElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const playerRef = useRef<LiveSoundPlayer | null>(null);
  const player = () => (playerRef.current ??= new LiveSoundPlayer());
  useEffect(() => () => playerRef.current?.dispose(), []);

  const [long, setLong] = useState(1280);
  useEffect(() => {
    const fit = () => setLong(previewLong());
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  const size = useMemo(() => canvasSize(style.aspect, Math.round(long / 160) * 160), [style.aspect, long]);
  const dur = rec?.durationMs ?? 0;
  const ctrack = useMemo(() => (rec ? (cursorTrack ?? emptyTrack(rec)) : null), [rec, cursorTrack]);
  const custom = cursor.style !== "original" && !!cursorTrack;
  const effectiveCursor = useMemo<CursorSettings>(() => (cursorTrack ? cursor : { ...cursor, style: "original" }), [cursor, cursorTrack]);
  const smooth = useMemo(
    () => (ctrack ? smoothCursor(ctrack, edits.clicks, dur, PREVIEW_FPS, { ...cursor, smoothing: custom ? cursor.smoothing : 0 }) : null),
    [ctrack, edits.clicks, dur, cursor, custom]
  );
  const camTrack = useMemo(
    () => (rec ? cameraTrack(edits.zooms, dur, PREVIEW_FPS, { motion, cursor: smooth && cursorTrack ? (t) => cameraCursor(smooth, t) : undefined }) : null),
    [rec, edits.zooms, dur, motion, smooth, cursorTrack]
  );
  const eraser = useMemo(() => (rec && cursorTrack && custom ? new CursorEraser(cursorTrack, rec.width, rec.height) : null), [rec, cursorTrack, custom]);
  const fetchFrame = useMemo(() => (rec ? frameFetcher(rec) : null), [rec]);
  const layer = useMemo<CursorLayer | null>(
    () => (ctrack && smooth ? { track: ctrack, smooth, clicks: edits.clicks, settings: effectiveCursor, eraser } : null),
    [ctrack, smooth, edits.clicks, effectiveCursor, eraser]
  );
  const events = useMemo(() => buildSoundEvents(edits.clicks, edits.typing, edits.zooms, sound, dur), [edits, sound, dur]);
  const music = sound.music === "custom" ? (customMusic?.buf ?? null) : musicBuf;

  // music beds render once, on first use
  useEffect(() => {
    if (sound.music === "none" || sound.music === "custom") return;
    let live = true;
    setMusicLoading(true);
    musicBed(sound.music)
      .then((b) => live && setMusicBuf(b))
      .catch(() => live && setError("The music couldn't be prepared in this browser."))
      .finally(() => live && setMusicLoading(false));
    return () => {
      live = false;
      setMusicLoading(false);
    };
  }, [sound.music]);

  const onMusicFile = async (f: File) => {
    setMusicLoading(true);
    try {
      const buf = await decodeMusicFile(f);
      setCustomMusic({ name: f.name, buf });
      setSound((s) => ({ ...s, music: "custom" }));
    } catch {
      setError("That music file couldn't be read. Try an MP3, M4A or WAV.");
    } finally {
      setMusicLoading(false);
    }
  };

  // give the eraser a clean picture of the screen after loading or a jump
  const plateFor = useRef(-1);
  const primeEraser = useCallback(
    (t: number) => {
      if (!eraser || !cursorTrack || !fetchFrame) return;
      const ct = cleanFrameTime(cursorTrack, t, dur);
      if (ct == null) return;
      eraser.ready = false;
      plateFor.current = t;
      void fetchFrame(ct).then((f) => {
        if (f && plateFor.current === t) {
          eraser.init(f);
          const v = videoRef.current;
          if (v && v.readyState >= 2) eraser.update(v, v.currentTime * 1000);
        }
      });
    },
    [eraser, cursorTrack, fetchFrame, dur]
  );
  useEffect(() => primeEraser(videoRef.current ? videoRef.current.currentTime * 1000 : 0), [primeEraser]);

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
    if (!cvs || !video || !rec || !camTrack || !bg || video.readyState < 2) return;
    const ctx = cvs.getContext("2d")!;
    const t = video.currentTime * 1000;
    eraser?.update(video, t);
    const poses = shutterPoses(camTrack, t, PREVIEW_FPS, style.motionBlur);
    const cam = camVideoRef.current;
    const camOn = !!rec.camera && camera.visible && !!cam && cam.readyState >= 2;
    drawFrame(ctx, size.width, size.height, video, rec.width, rec.height, {
      poses,
      style,
      background: bg,
      t,
      durationMs: dur,
      overlay: layer ? (c, v) => drawCursorLayer(c, v, t, layer) : undefined,
      top: camOn ? (c) => drawCameraBubble(c, size.width, size.height, cam!, rec.camera!.width, rec.camera!.height, camera, poses[0].scale) : undefined,
    });
  }, [rec, camTrack, size, style, layer, eraser, camera, dur]);

  useEffect(() => {
    if (!rec) return;
    let raf = 0;
    let lastState = 0;
    const loop = (ts: number) => {
      draw();
      const video = videoRef.current;
      const cam = camVideoRef.current;
      if (video && cam && rec.camera) {
        // keep the camera in step with the screen
        if (Math.abs(cam.currentTime - video.currentTime) > 0.15) cam.currentTime = video.currentTime;
        if (video.paused !== cam.paused) void (video.paused ? cam.pause() : cam.play().catch(() => {}));
      }
      if (video && ts - lastState > 66) {
        lastState = ts;
        setTimeMs(video.currentTime * 1000);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [rec, draw]);

  // the recording's own sound plays from the video element
  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = Math.min(1, sound.recordingVolume);
  }, [sound.recordingVolume, rec]);

  // effects and music follow playback, and restart when they change mid-play
  const soundRef = useRef({ events, music, sound, dur });
  soundRef.current = { events, music, sound, dur };
  const restartSound = useCallback(() => {
    const v = videoRef.current;
    if (!v || v.paused) return player().stop();
    const s = soundRef.current;
    player().play(v.currentTime * 1000, s.events, s.music, s.sound, s.dur);
  }, []);
  useEffect(() => {
    if (playing) restartSound();
  }, [events, music, sound, playing, restartSound]);

  const seek = useCallback(
    (ms: number) => {
      const video = videoRef.current;
      if (!video || !rec) return;
      video.currentTime = Math.min(rec.durationMs, Math.max(0, ms)) / 1000;
      setTimeMs(video.currentTime * 1000);
      primeEraser(video.currentTime * 1000);
    },
    [rec, primeEraser]
  );

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      if (video.ended || video.currentTime >= dur / 1000 - 0.05) seek(0);
      void video.play();
    } else video.pause();
  }, [dur, seek]);

  /* -------------------------------- editing -------------------------------- */

  const { zooms, clicks, typing } = edits;
  const selectedZoom = selected?.kind === "zoom" ? (zooms.find((z) => z.id === selected.id) ?? null) : null;
  const selectedClick = selected?.kind === "click" ? (clicks.find((c) => c.id === selected.id) ?? null) : null;
  const selectedTyping = selected?.kind === "typing" ? (typing.find((b) => typingId(b) === selected.id) ?? null) : null;

  const setZooms = (list: ZoomSegment[], commit = true) => rec && setEdits({ ...editsRef.current, zooms: commit ? normalizeZooms(list, rec.durationMs) : list }, commit);
  const patchZoom = (id: string, patch: Partial<ZoomSegment>) =>
    setZooms(zooms.map((z) => (z.id === id ? { ...z, ...patch, ...("x" in patch || "scale" in patch ? clampFocus(patch.x ?? z.x, patch.y ?? z.y, patch.scale ?? z.scale) : {}) } : z)));

  const addZoomAt = (ms: number, x?: number, y?: number) => {
    if (!rec) return;
    const start = Math.max(0, ms - 300);
    const next = zooms.find((z) => z.startMs > start);
    const end = Math.min(rec.durationMs, next ? next.startMs : start + 2500, start + 2500);
    if (end - start < 400) return setError("There's no room for another zoom here. Move or delete the next one first.");
    // aim at the cursor if we know where it is
    const c = cursorTrack ? rawCursorAt(cursorTrack, ms) : null;
    const fx = x ?? (c?.visible ? c.x : 0.5);
    const fy = y ?? (c?.visible ? c.y : 0.5);
    const z: ZoomSegment = { id: zoomId(), startMs: start, endMs: end, scale: DEFAULT_ZOOM, ...clampFocus(fx, fy, DEFAULT_ZOOM) };
    setZooms([...zooms, z]);
    setSelected({ kind: "zoom", id: z.id });
    track("recorder_zoom_added");
  };

  const addClickAt = (ms: number) => {
    if (!rec) return;
    const c = cursorTrack ? rawCursorAt(cursorTrack, ms) : null;
    const click: ClickEvent = { id: clickId(), t: Math.round(ms), x: c?.visible ? c.x : 0.5, y: c?.visible ? c.y : 0.5 };
    setEdits({ ...editsRef.current, clicks: [...clicks, click].sort((a, b) => a.t - b.t) });
    setSelected({ kind: "click", id: click.id });
    if (sound.click !== "none") player().audition(`click:${sound.click}:0`, sound.clickVolume);
    track("recorder_click_added");
  };

  const deleteSelected = useCallback(() => {
    const sel = selected;
    if (!sel) return;
    const e = editsRef.current;
    if (sel.kind === "zoom") setEdits({ ...e, zooms: e.zooms.filter((z) => z.id !== sel.id) });
    if (sel.kind === "click") setEdits({ ...e, clicks: e.clicks.filter((c) => c.id !== sel.id) });
    if (sel.kind === "typing") setEdits({ ...e, typing: e.typing.filter((b) => typingId(b) !== sel.id) });
    setSelected(null);
  }, [selected, setEdits]);

  const autoZoom = () => {
    if (!rec || !activity) return;
    const auto = detectZooms(activity, rec.durationMs, { clicks, typing });
    setZooms(auto);
    setSelected(null);
    track("recorder_auto_zoom", { zooms: auto.length, again: true });
  };

  // click the preview: move the selected click or zoom there, or add a zoom at the playhead
  const onPreviewClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!rec) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * size.width;
    const py = ((e.clientY - r.top) / r.height) * size.height;
    const p = canvasToRecording(px, py, size.width, size.height, rec.width, rec.height, style);
    if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) return;
    if (selectedClick) {
      setEdits({ ...editsRef.current, clicks: clicks.map((c) => (c.id === selectedClick.id ? { ...c, x: p.x, y: p.y } : c)) });
      return;
    }
    const z = selectedZoom ?? zooms.find((s) => timeMs >= s.startMs && timeMs < s.endMs);
    if (z) {
      setSelected({ kind: "zoom", id: z.id });
      patchZoom(z.id, { x: p.x, y: p.y });
    } else addZoomAt(timeMs, p.x, p.y);
  };

  /* -------------------------------- export --------------------------------- */

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
      const { blob, ext } = await exportRecording({
        rec,
        zooms,
        motion,
        style,
        cursor: ctrack ? { track: ctrack, clicks, settings: effectiveCursor } : null,
        camera,
        sound: { settings: sound, events, music },
        long: quality,
        fps,
        signal: ac.signal,
        onProgress: setExportProgress,
      });
      downloadBlob(blob, `${rec.name.replace(/\.[a-z0-9]+$/i, "")}-mockframe.${ext}`);
      track("recorder_exported", {
        seconds: Math.round(rec.durationMs / 1000),
        zooms: zooms.length,
        clicks: clicks.length,
        quality,
        fps,
        aspect: style.aspect,
        cursor: effectiveCursor.style,
        click_sound: sound.click,
        music: sound.music,
        camera: !!rec.camera && camera.visible,
      });
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setError(e instanceof Error ? e.message : "Export failed. Please try again.");
    } finally {
      setExportProgress(null);
      abortRef.current = null;
    }
  }

  /* ------------------------------- shortcuts ------------------------------- */

  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyRef.current = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement | null)?.closest?.("input, select, textarea, [contenteditable]")) return;
    const rk = matchRecordingKey(e);
    if (captureRef.current || controls) {
      if (rk === "record") {
        e.preventDefault();
        if (captureRef.current?.state() === "ready") cancelRecording();
        else stopRecording();
      } else if (rk === "pause") {
        e.preventDefault();
        togglePause();
      } else if (rk === "cancel" && controls?.phase === "countdown") {
        e.preventDefault();
        cancelRecording();
      }
      return;
    }
    if (rk === "record") {
      e.preventDefault();
      if (exportProgress !== null) return;
      if (editing) {
        videoRef.current?.pause();
        setNewTake(true);
      } else void record();
      return;
    }
    if (newTake && e.key === "Escape") return setNewTake(false);
    if (!editing) return;
    const a = matchEditorKey(e);
    if (!a) return;
    if (a === "help") return setHelp((h) => !h);
    if (help && e.key === "Escape") return setHelp(false);
    e.preventDefault();
    const v = videoRef.current;
    const now = v ? v.currentTime * 1000 : timeMs;
    switch (a) {
      case "play":
        return togglePlay();
      case "back":
        return seek(now - 1000);
      case "forward":
        return seek(now + 1000);
      case "backLong":
        return seek(now - 5000);
      case "forwardLong":
        return seek(now + 5000);
      case "start":
        return seek(0);
      case "end":
        return seek(dur);
      case "addZoom":
        return addZoomAt(now);
      case "addClick":
        return addClickAt(now);
      case "follow":
        return selectedZoom && patchZoom(selectedZoom.id, { follow: !selectedZoom.follow });
      case "delete":
        return deleteSelected();
      case "undo":
        return undo();
      case "redo":
        return redo();
      case "export":
        return void onExport();
    }
  };
  const onKey = useCallback((e: KeyboardEvent) => keyRef.current(e), []);
  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  /* --------------------------------- views --------------------------------- */

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

  const controlProps: ControlsProps | null = controls
    ? { phase: controls.phase, count: controls.count, onPick: controls.needsClick ? () => void pickAndRecord() : undefined, elapsedMs: elapsed, onPause: togglePause, onResume: togglePause, onStop: stopRecording, onCancel: cancelRecording, camera: options.camera ? camStream : null }
    : null;
  const floating = float.win && controlProps ? <FloatingControls win={float.win} onKey={onKey} {...controlProps} /> : null;

  if (!rec || controls || newTake) {
    return (
      <>
        {picker}
        {floating}
        <RecordSetup
          options={options}
          setOptions={setOptions}
          mics={mics}
          cameras={cameras}
          cameraStream={camStream}
          micLevel={micLevel}
          captureOk={captureOk}
          floatOk={floatOk}
          busy={busy}
          error={error}
          controls={controlProps}
          onRecord={() => void record()}
          onUpload={() => fileRef.current?.click()}
          onDrop={(f) => void open(f, f.name, "upload")}
          onBack={rec && !controls ? () => setNewTake(false) : undefined}
        />
      </>
    );
  }

  return (
    <div className="flex h-screen min-h-[600px] flex-col bg-[#0b0b0f] text-white">
      {picker}
      <header className="flex items-center gap-3 border-b border-white/10 bg-[#101014] px-4 py-2.5">
        <Link href="/" className="text-[13px] font-semibold text-white hover:text-violet-200">MockFrame</Link>
        <span aria-hidden className="h-4 w-px bg-white/15" />
        <p className="min-w-0 truncate text-[13px] text-white/70">{rec.name}</p>
        <span className="hidden text-[12px] text-white/35 md:inline">
          {fmt(dur)} long, {zooms.length} zoom{zooms.length === 1 ? "" : "s"}, {clicks.length} click{clicks.length === 1 ? "" : "s"}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={undo} aria-label="Undo" title="Undo" className="grid h-8 w-8 place-items-center rounded-lg text-white/55 hover:bg-white/5 hover:text-white">
            <Undo2 size={15} />
          </button>
          <button type="button" onClick={redo} aria-label="Redo" title="Redo" className="grid h-8 w-8 place-items-center rounded-lg text-white/55 hover:bg-white/5 hover:text-white">
            <Redo2 size={15} />
          </button>
          <button type="button" onClick={() => setHelp(true)} aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)" className="grid h-8 w-8 place-items-center rounded-lg text-white/55 hover:bg-white/5 hover:text-white">
            <Keyboard size={15} />
          </button>
          <span aria-hidden className="mx-1 h-4 w-px bg-white/15" />
          <button type="button" onClick={() => fileRef.current?.click()} className="rounded-lg px-3 py-1.5 text-[13px] text-white/60 hover:bg-white/5 hover:text-white">
            Open another
          </button>
          {captureOk && (
            <button type="button" onClick={() => { videoRef.current?.pause(); setNewTake(true); }} className="rounded-lg px-3 py-1.5 text-[13px] text-white/60 hover:bg-white/5 hover:text-white">
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
              {!isPro && <span className="rounded-full bg-white/20 px-1.5 text-[9px] font-bold">Pro</span>}
            </button>
          )}
        </div>
      </header>
      {(error || busy) && <div className={`border-b border-white/10 px-4 py-2 text-[13px] ${error ? "text-red-300" : "text-white/60"}`}>{error ?? busy}</div>}

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
              title={selectedClick ? "Click to move this click here" : selectedZoom ? "Click to move the zoom's focus here" : "Click to zoom in here"}
            />
            <video
              ref={videoRef}
              src={rec.url}
              playsInline
              preload="auto"
              className="hidden"
              onPlay={() => {
                setPlaying(true);
                restartSound();
              }}
              onPause={() => {
                setPlaying(false);
                player().stop();
              }}
              onSeeked={() => restartSound()}
              onEnded={() => setPlaying(false)}
            />
            {rec.camera && <video ref={camVideoRef} src={rec.camera.url} playsInline muted preload="auto" className="hidden" />}
          </div>

          <div className="border-t border-white/10 bg-[#101014] px-4 pb-4 pt-3">
            <div className="mb-2 flex items-center gap-2">
              <button type="button" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"} className="grid h-8 w-8 place-items-center rounded-full bg-white text-zinc-950 hover:bg-zinc-200">
                {playing ? <Pause size={14} className="fill-current" /> : <Play size={14} className="ml-0.5 fill-current" />}
              </button>
              <span className="w-24 text-[12px] tabular-nums text-white/60">{fmt(timeMs)} / {fmt(dur)}</span>
              <button type="button" onClick={() => addZoomAt(timeMs)} title="Add zoom (Z)" className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-[12px] text-white/75 hover:border-white/25 hover:text-white">
                <Plus size={12} /> Zoom
              </button>
              <button type="button" onClick={() => addClickAt(timeMs)} title="Add click (C)" className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-[12px] text-white/75 hover:border-white/25 hover:text-white">
                <MousePointerClick size={12} /> Click
              </button>
              <p className="ml-auto hidden text-[11.5px] text-white/35 xl:block">
                Click the video to zoom there. Drag zooms and clicks to move them. Press ? for shortcuts.
              </p>
            </div>
            <Timeline
              durationMs={dur}
              timeMs={timeMs}
              zooms={zooms}
              clicks={clicks}
              typing={typing}
              selected={selected}
              onSelect={setSelected}
              onSeek={seek}
              onZoomsChange={(list, commit) => setZooms(list, commit)}
              onClicksChange={(list, commit) => setEdits({ ...editsRef.current, clicks: list }, commit)}
            />
          </div>
        </main>

        <Inspector
          tab={tab}
          setTab={setTab}
          analysing={analysing}
          hasCursor={!!cursorTrack}
          hasCamera={!!rec.camera}
          hasAudio={rec.hasAudio}
          durationMs={dur}
          zooms={zooms}
          selectedZoom={selectedZoom}
          selectedClick={selectedClick}
          selectedTyping={selectedTyping}
          clicksCount={clicks.length}
          onAutoZoom={autoZoom}
          onPatchZoom={(patch) => selectedZoom && patchZoom(selectedZoom.id, patch)}
          onDeleteSelected={deleteSelected}
          motion={motion}
          setMotion={setMotion}
          cursor={cursor}
          setCursor={setCursor}
          sound={sound}
          setSound={setSound}
          musicName={customMusic?.name ?? null}
          musicLoading={musicLoading}
          onMusicFile={(f) => void onMusicFile(f)}
          onAudition={(key) => player().audition(key)}
          camera={camera}
          setCamera={setCamera}
          style={style}
          setStyle={setStyle}
          quality={quality}
          setQuality={setQuality}
          fps={fps}
          setFps={setFps}
        />
      </div>
      {help && <RecorderShortcuts onClose={() => setHelp(false)} />}
      {upgradeOpen && <UpgradeModal reason="Screen recording exports" onClose={() => setUpgradeOpen(false)} />}
    </div>
  );
}
