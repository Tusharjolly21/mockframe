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

const ToggleExtra = ({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`fk-press flex-1 rounded-lg px-2 py-1 text-[10px] font-semibold border ${
      on ? "bg-[#17171c] text-white border-[#17171c]" : "bg-white text-[#6b6b76] border-[#e4e4ec]"
    }`}
  >
    {label}
  </button>
);

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

  const total = anim ? animMessageCount(anim.doc) : 0;
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
                  Reveals {total} messages of your {SCREEN_APP_LABELS[anim.doc.app]} chat one at a time.
                </p>

                {/* playback speed */}
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9a9aa4]">Speed</span>
                  <div className="grid flex-1 grid-cols-3 rounded-lg bg-[#f1f1f6] p-1">
                    {([["slow", "Slow", 1.6], ["normal", "Medium", 1], ["fast", "Fast", 0.6]] as const).map(([id, label, factor]) => (
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
                        className={`fk-press rounded-md px-2 py-1 text-[10px] font-semibold ${speed === id ? "bg-white text-[#17171c] shadow-sm" : "text-[#85858f]"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scrubber slider */}
                <div className="mb-3 rounded-xl border border-[#e8e8ef] bg-[#fafafd] p-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-[#17171c]">Scrubber</span>
                    <span className="text-[9.5px] tabular-nums text-[#9a9aa4]">{(currentTime / 1000).toFixed(1)}s / {(totalDur / 1000).toFixed(1)}s</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={totalDur}
                    value={currentTime}
                    onChange={(e) => seekTo(Number(e.target.value))}
                    className="w-full h-1 appearance-none rounded bg-[#ececf2] outline-none accent-violet-600"
                  />
                </div>

                {/* Effects & Sound toggles */}
                <div className="mb-3">
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#9a9aa4]">Effects &amp; Sounds</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <ToggleExtra label="🔊 Ticks" on={typingSound} onClick={() => setTypingSound(!typingSound)} />
                    <ToggleExtra label="🎵 Music" on={musicSound} onClick={() => setMusicSound(!musicSound)} />
                    <ToggleExtra label="🔍 Zoom" on={zoomFocus} onClick={() => setZoomFocus(!zoomFocus)} />
                    <ToggleExtra label="📐 Float" on={tiltFloat} onClick={() => setTiltFloat(!tiltFloat)} />
                  </div>
                </div>

                <div className="mb-3 rounded-xl border border-[#e8e8ef] bg-[#fafafd] p-2.5">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#17171c]"><Clapperboard size={12} /> Timeline</div>
                    <span className="text-[10px] tabular-nums text-[#9a9aa4]">{(totalDur / 1000).toFixed(1)}s</span>
                  </div>
                  <div className="panel-scroll max-h-40 space-y-1.5 overflow-y-auto pr-0.5">
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
                  {plan.length === 0 && <p className="py-2 text-center text-[10px] text-[#9a9aa4]">All segments removed.</p>}
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
                <p className="mt-2 text-[10px] text-[#b0b0ba]">WebM records video + synthesised sound effects.</p>
              </>
            )}
          </Popover>
        )}
      </AnimatePresence>
    </div>
  );
}
