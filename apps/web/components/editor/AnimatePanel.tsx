"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Clapperboard, ImageIcon, Play, Video, X } from "lucide-react";
import type { MockupLayer } from "@framekit/scene";
import {
  animMessageCount,
  animStateDoc,
  buildAnimPlan,
  decodeScreenAsset,
  encodeScreenAsset,
  isScreenAsset,
  type AnimShot,
} from "@/lib/screens";
import { exportSceneVideo } from "@/lib/videoExport";
import { exportSceneGif } from "@/lib/gifExport";
import { useSceneStore, useViewStore, withTransientHistory } from "@/lib/store";
import { openUpgrade } from "@/lib/billing/gate";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Web Audio Synthesizer for typing/pops & ambient music
class SoundManager {
  ctx: AudioContext | null = null;
  lofiTimer: ReturnType<typeof setInterval> | null = null;
  dest: MediaStreamAudioDestinationNode | null = null;
  isPlayingKeyClick = true;
  isPlayingMusic = false;

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.dest = this.ctx.createMediaStreamDestination();
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
  }

  playClick() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(900, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1400, this.ctx.currentTime + 0.04);
    
    gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    if (this.dest) gain.connect(this.dest);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }

  playPop() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    const gain2 = this.ctx.createGain();
    
    osc1.frequency.setValueAtTime(550, now);
    gain1.gain.setValueAtTime(0.06, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    if (this.dest) gain1.connect(this.dest);
    osc1.start(now);
    osc1.stop(now + 0.12);
    
    osc2.frequency.setValueAtTime(700, now + 0.06);
    gain2.gain.setValueAtTime(0.06, now + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    if (this.dest) gain2.connect(this.dest);
    osc2.start(now + 0.06);
    osc2.stop(now + 0.2);
  }

  startLofi() {
    this.init();
    if (!this.ctx) return;
    this.stopLofi();
    
    const chords = [
      [261.63, 329.63, 392.00, 493.88], // Cmaj7
      [220.00, 261.63, 329.63, 392.00], // Am7
      [174.61, 220.00, 261.63, 329.63], // Fmaj7
      [196.00, 246.94, 293.66, 349.23], // G7
    ];
    
    let idx = 0;
    const playChord = () => {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const notes = chords[idx % chords.length];
      notes.forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.015, now + 0.6);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 3.8);
        
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        if (this.dest) gain.connect(this.dest);
        osc.start(now);
        osc.stop(now + 4);
      });
      idx++;
    };
    
    playChord();
    this.lofiTimer = setInterval(playChord, 4000);
  }

  stopLofi() {
    if (this.lofiTimer) {
      clearInterval(this.lofiTimer);
      this.lofiTimer = null;
    }
  }
}
const sound = new SoundManager();



/** Bottom-center "Animate" control: chat-replay preview + WebM video export. */
export function AnimatePanel() {
  const scene = useSceneStore((s) => s.scene);
  const updateLayer = useSceneStore((s) => s.updateLayer);
  const [open, setOpen] = useState(false);
  const [speed, setSpeed] = useState<"slow" | "normal" | "fast">("normal");
  const [busy, setBusy] = useState<null | { pct: number; label: string }>(null);
  const [plan, setPlan] = useState<AnimShot[]>([]);
  
  // Scrubber & effects state
  const [currentTime, setCurrentTime] = useState(0);
  const [typingSound, setTypingSound] = useState(true);
  const [musicSound, setMusicSound] = useState(false);
  const [zoomFocus, setZoomFocus] = useState(false);
  const [tiltFloat, setTiltFloat] = useState(false);
  
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (window as unknown as { __soundManager: unknown }).__soundManager = sound;
  }, []);

  useEffect(() => {
    sound.isPlayingKeyClick = typingSound;
    sound.isPlayingMusic = musicSound;
    if (open && musicSound && !busy) {
      sound.startLofi();
    } else {
      sound.stopLofi();
    }
    return () => sound.stopLofi();
  }, [typingSound, musicSound, open, busy]);

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

  const totalDur = plan.reduce((sum, shot) => sum + shot.holdMs + shot.fadeMs, 0);

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

  const seekTo = (tMs: number) => {
    if (!anim) return;
    setCurrentTime(tMs);
    let acc = 0;
    let targetShotIdx = 0;
    let typing = false;
    let settled = false;
    let dotPhase = 0;

    for (let i = 0; i < plan.length; i++) {
      const shot = plan[i];
      const nextAcc = acc + shot.holdMs + shot.fadeMs;
      if (tMs >= acc && tMs <= nextAcc) {
        targetShotIdx = i;
        typing = shot.typing;
        settled = !!shot.settled;
        if (typing) {
          dotPhase = Math.floor((tMs - acc) / 180) % 3;
        }
        break;
      }
      acc = nextAcc;
      if (i === plan.length - 1) {
        targetShotIdx = plan.length - 1;
        typing = shot.typing;
        settled = !!shot.settled;
      }
    }
    const shot = plan[targetShotIdx];
    renderState({ k: shot ? shot.k : 0, typing, dotPhase, settled });
  };

  const play = async () => {
    if (!anim || busy) return;
    setBusy({ pct: 0, label: "Playing…" });
    
    // Save original view state for restore
    const origZoom = useViewStore.getState().zoom;
    const origPan = useViewStore.getState().pan;
    const origLayerX = anim.layer.transform.x;
    const origLayerY = anim.layer.transform.y;
    const origTiltX = anim.layer.transform.tiltX;
    const origTiltY = anim.layer.transform.tiltY;
    
    sound.init();
    if (musicSound) sound.startLofi();
    
    let elapsed = 0;
    
    for (let index = 0; index < plan.length; index++) {
      const shot = plan[index];
      
      // Zoom Focus
      if (zoomFocus) {
        const zoomFactor = 1 + (index / plan.length) * 0.15;
        useViewStore.setState({ zoom: origZoom * zoomFactor });
      }
      
      if (shot.typing) {
        const cycles = Math.max(1, Math.round(shot.holdMs / 180));
        for (let p = 0; p < cycles; p++) {
          renderState({ k: shot.k, typing: true, dotPhase: p, settled: false });
          if (typingSound) sound.playClick();
          
          if (tiltFloat) {
            withTransientHistory(() => {
              updateLayer(anim.layer.id, (l) => ({
                ...l,
                transform: {
                  ...l.transform,
                  tiltX: (origTiltX ?? 0) + Math.sin(elapsed / 100) * 1.5,
                  tiltY: (origTiltY ?? 0) + Math.cos(elapsed / 100) * 1.5,
                }
              }));
            });
          }
          
          await wait(180);
          elapsed += 180;
          setCurrentTime(elapsed);
        }
      } else {
        renderState({ k: shot.k, typing: false, dotPhase: 0, settled: !!shot.settled });
        if (typingSound && !shot.settled) sound.playPop();
        
        const steps = Math.max(1, Math.round(shot.holdMs / 50));
        const stepMs = shot.holdMs / steps;
        for (let s = 0; s < steps; s++) {
          if (tiltFloat) {
            withTransientHistory(() => {
              updateLayer(anim.layer.id, (l) => ({
                ...l,
                transform: {
                  ...l.transform,
                  tiltX: (origTiltX ?? 0) + Math.sin(elapsed / 100) * 1.5,
                  tiltY: (origTiltY ?? 0) + Math.cos(elapsed / 100) * 1.5,
                }
              }));
            });
          }
          await wait(stepMs);
          elapsed += stepMs;
          setCurrentTime(elapsed);
        }
      }
    }
    
    // Restore original positions
    useViewStore.setState({ zoom: origZoom, pan: origPan });
    withTransientHistory(() => {
      updateLayer(anim.layer.id, (l) => ({
        ...l,
        transform: {
          ...l.transform,
          x: origLayerX,
          y: origLayerY,
          tiltX: origTiltX,
          tiltY: origTiltY,
        }
      }));
    });
    
    restore();
    if (musicSound) sound.stopLofi();
    setBusy(null);
    setCurrentTime(0);
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
        className={`fk-card pointer-events-auto flex cursor-pointer items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold transition-all ${
          open
            ? "bg-violet-600 text-white border-violet-600 shadow-[0_0_12px_rgba(139,92,246,0.4)]"
            : "bg-white text-[#17171c]"
        }`}
      >
        <Clapperboard size={15} />
        {open ? "Close Timeline" : "Animate"}
        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
          open ? "bg-white/20 text-white" : "bg-violet-100 text-violet-700"
        }`}>
          video
        </span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100vw-540px)] min-w-[700px] max-w-[960px] bg-[#0c0c0e]/95 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-50 flex flex-col pointer-events-auto select-none transition-all text-white font-sans">
            {/* Header controls row */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3.5">
              <div className="flex items-center gap-2.5">
                <Clapperboard size={15} className="text-violet-400" />
                <span className="text-[12px] font-bold tracking-wider text-white/90">REMOTION TIMELINE</span>
                <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[8.5px] font-semibold text-violet-300 uppercase tracking-wide border border-violet-500/30">
                  Interactive Live Replay
                </span>
              </div>

              {/* Playback Settings */}
              {anim && !busy && (
                <div className="flex items-center gap-4">
                  {/* Effects / Sounds checkboxes */}
                  <div className="flex items-center gap-2 bg-white/5 rounded-lg p-1 border border-white/5">
                    <button
                      onClick={() => setTypingSound(!typingSound)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                        typingSound ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
                      }`}
                    >
                      🔊 Audio
                    </button>
                    <button
                      onClick={() => setMusicSound(!musicSound)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                        musicSound ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
                      }`}
                    >
                      🎵 Music
                    </button>
                    <button
                      onClick={() => setZoomFocus(!zoomFocus)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                        zoomFocus ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
                      }`}
                    >
                      🔍 Zoom
                    </button>
                    <button
                      onClick={() => setTiltFloat(!tiltFloat)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                        tiltFloat ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
                      }`}
                    >
                      📐 Tilt
                    </button>
                  </div>

                  {/* Playback speed selector */}
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-bold text-white/40 uppercase mr-1">Speed</span>
                    <div className="flex rounded-md bg-white/5 p-0.5 border border-white/5">
                      {([["slow", "0.5x", 1.6], ["normal", "1.0x", 1], ["fast", "1.5x", 0.6]] as const).map(([id, label, factor]) => (
                        <button
                          key={id}
                          onClick={() => {
                            if (speed === id) return;
                            const prev = speed === "slow" ? 1.6 : speed === "fast" ? 0.6 : 1;
                            const ratio = factor / prev;
                            setPlan((current) => current.map((shot) => ({
                              ...shot,
                              holdMs: Math.round(shot.holdMs * ratio),
                              fadeMs: Math.round(shot.fadeMs * ratio),
                            })));
                            setSpeed(id);
                          }}
                          className={`rounded px-1.5 py-0.5 text-[9px] font-bold transition-all ${
                            speed === id ? "bg-white/15 text-white" : "text-white/40 hover:text-white/60"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Close timeline button */}
              <button
                onClick={() => setOpen(false)}
                className="w-6 h-6 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-all text-white/50 hover:text-white cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>

            {!anim ? (
              <p className="py-8 text-center text-[12px] leading-relaxed text-white/40">
                Add a Screen Studio chat with 2+ messages to unlock the interactive Replay Timeline.
              </p>
            ) : (
              <div className="flex-1 flex flex-col justify-between">
                {/* Horizontal tracks and scrubber ruler */}
                <div className="relative w-full flex flex-col gap-2 bg-white/5 border border-white/5 rounded-xl p-3">
                  {/* Scrubber Ruler Slider */}
                  <div className="relative w-full flex items-center">
                    <input
                      type="range"
                      min={0}
                      max={totalDur}
                      value={currentTime}
                      onChange={(e) => seekTo(Number(e.target.value))}
                      className="w-full h-1 appearance-none rounded bg-white/10 outline-none accent-violet-500 cursor-pointer z-10 hover:h-1.5 transition-all"
                      style={{
                        background: `linear-gradient(to right, #8b5cf6 ${(currentTime / totalDur) * 100}%, rgba(255,255,255,0.1) ${(currentTime / totalDur) * 100}%)`,
                      }}
                    />
                  </div>

                  {/* Horizontal Segment Blocks Track Row */}
                  <div className="flex gap-1 w-full mt-1.5 overflow-hidden">
                    {(() => {
                      let accumulatedMs = 0;
                      return plan.map((shot, index) => {
                        const start = accumulatedMs;
                        const duration = shot.holdMs + shot.fadeMs;
                        accumulatedMs += duration;

                        const isActive = currentTime >= start && currentTime <= start + duration;
                        const widthPct = (duration / totalDur) * 100;

                        return (
                          <button
                            key={`${index}-${shot.k}-${shot.typing}`}
                            onClick={() => seekTo(start)}
                            style={{ width: `${widthPct}%` }}
                            className={`h-9 rounded-lg border flex flex-col items-center justify-center transition-all ${
                              isActive
                                ? "bg-violet-600/30 border-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.3)] text-white"
                                : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:border-white/10"
                            }`}
                          >
                            <span className="text-[9.5px] font-bold truncate max-w-full px-1">
                              {shot.typing ? "💬 Typing" : `✉️ Msg ${shot.k}`}
                            </span>
                            <span className="text-[8px] opacity-60">
                              {((duration) / 1000).toFixed(1)}s
                            </span>
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Bottom Row controls & settings panel */}
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-3 text-xs text-white/40 font-mono">
                    <button
                      onClick={play}
                      disabled={!!busy}
                      className="h-8 rounded-full px-4 flex items-center justify-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-800 text-white text-[11px] font-bold shadow-md cursor-pointer transition-colors"
                    >
                      <Play size={11} className="fill-white" />
                      <span>{busy?.label === "Playing…" ? "Replay..." : "Preview Playback"}</span>
                    </button>
                    <span className="text-white/80 font-bold tabular-nums">
                      {(currentTime / 1000).toFixed(2)}s
                    </span>
                    <span className="opacity-20">/</span>
                    <span className="tabular-nums">{(totalDur / 1000).toFixed(2)}s</span>
                  </div>

                  {/* Right side download buttons */}
                  {busy && busy.label !== "Playing…" ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-white/50">{busy.label}</span>
                      <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-violet-500 transition-all duration-300"
                          style={{ width: `${busy.pct * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-white font-mono">{Math.round(busy.pct * 100)}%</span>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={exportVideo}
                        className="h-8 px-4 text-[11px] font-bold rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/10 cursor-pointer flex items-center gap-1.5 transition-all"
                      >
                        <Video size={11} />
                        <span>Export MP4 Video</span>
                      </button>
                      <button
                        onClick={exportGif}
                        className="h-8 px-4 text-[11px] font-bold rounded-lg bg-white/15 hover:bg-white/20 text-white border border-white/10 cursor-pointer flex items-center gap-1.5 transition-all"
                      >
                        <ImageIcon size={11} />
                        <span>Export Replay GIF</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
