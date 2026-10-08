"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Camera, CameraOff, Mic, MicOff, Monitor, PictureInPicture2, Timer, Upload, Volume2, VolumeX } from "lucide-react";
import { keyLabel } from "@/lib/recorder/shortcuts";
import { RecordingControls, type ControlsProps } from "./FloatingControls";

export interface RecordOptions {
  mic: boolean;
  micId: string;
  camera: boolean;
  cameraId: string;
  systemAudio: boolean;
  countdown: 0 | 3 | 5;
  floating: boolean;
}

export const DEFAULT_RECORD_OPTIONS: RecordOptions = { mic: false, micId: "", camera: false, cameraId: "", systemAudio: true, countdown: 3, floating: true };

function Kbd({ keys }: { keys: string[] }) {
  return (
    <span className="inline-flex gap-1">
      {keyLabel(keys).map((k) => (
        <kbd key={k} className="min-w-[22px] rounded-md border border-white/15 bg-white/[0.06] px-1.5 py-0.5 text-center font-sans text-[11px] text-white/75">
          {k}
        </kbd>
      ))}
    </span>
  );
}

function Toggle({ on, onClick, icon, offIcon, label, detail }: { on: boolean; onClick: () => void; icon: React.ReactNode; offIcon?: React.ReactNode; label: string; detail?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`flex min-w-0 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition ${
        on ? "border-violet-400/50 bg-violet-500/[0.12] text-white" : "border-white/10 bg-white/[0.03] text-white/55 hover:border-white/20 hover:text-white/80"
      }`}
    >
      <span className={on ? "text-violet-300" : ""}>{on ? icon : (offIcon ?? icon)}</span>
      <span className="min-w-0">
        <span className="block text-[13px] font-medium leading-tight">{label}</span>
        {detail && <span className="mt-0.5 block truncate text-[11px] text-white/45">{detail}</span>}
      </span>
    </button>
  );
}

export interface RecordSetupProps {
  options: RecordOptions;
  setOptions: (o: RecordOptions) => void;
  mics: MediaDeviceInfo[];
  cameras: MediaDeviceInfo[];
  cameraStream: MediaStream | null;
  micLevel: number;
  captureOk: boolean;
  floatOk: boolean;
  busy: string | null;
  error: string | null;
  /** set while picking, counting down or recording */
  controls: (ControlsProps & { phase: ControlsProps["phase"] }) | null;
  onRecord: () => void;
  onUpload: () => void;
  onDrop: (f: File) => void;
  /** back to the recording that's already open */
  onBack?: () => void;
}

/** The recorder's first screen: choose sources, then record (or upload a recording). */
export function RecordSetup(p: RecordSetupProps) {
  const camRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (camRef.current) camRef.current.srcObject = p.cameraStream;
  }, [p.cameraStream]);
  const o = p.options;
  const set = (patch: Partial<RecordOptions>) => p.setOptions({ ...o, ...patch });
  const counting = p.controls?.phase === "countdown";

  return (
    <div
      className="relative flex min-h-screen flex-col bg-[#0b0b0f] text-white"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const f = Array.from(e.dataTransfer.files).find((x) => x.type.startsWith("video/"));
        if (f) p.onDrop(f);
      }}
    >
      <header className="flex items-center justify-between px-5 py-4">
        <Link href="/" className="text-[13px] font-semibold text-white/85 hover:text-white">MockFrame</Link>
        {p.onBack ? (
          <button type="button" onClick={p.onBack} className="rounded-lg px-3 py-1.5 text-[13px] text-white/70 hover:bg-white/5 hover:text-white">
            Back to your recording
          </button>
        ) : (
          <span className="text-[12px] text-white/40">Screen Recorder</span>
        )}
      </header>

      <div className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-10 px-6 pb-16 pt-6 lg:grid-cols-[1fr_400px]">
        <div>
          <h1 className="max-w-lg text-balance text-[40px] font-semibold leading-[1.08] tracking-[-0.035em]">Record your screen. It zooms in on every click.</h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/55">
            Your take opens crisp and quiet, with the camera zooming in where you click and following your cursor. Then add sounds, music, a camera
            bubble or a new cursor if you like. All on this device.
          </p>
          <ul className="mt-7 space-y-2 text-[13px] text-white/60">
            <li className="flex items-center gap-3"><Kbd keys={["Alt", "Shift", "R"]} /> start and stop, from the floating controls too</li>
            <li className="flex items-center gap-3"><Kbd keys={["Alt", "Shift", "P"]} /> pause and resume</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#121216] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
          {p.controls && !counting ? (
            <div className="py-6">
              <RecordingControls {...p.controls} />
              <p className="px-4 pt-2 text-[12px] leading-5 text-white/40">
                {p.controls.phase === "picking"
                  ? "Pick a tab, a window or your whole screen."
                  : "Switch to what you're recording. Use the floating controls, this tab, or your browser's Stop sharing bar to finish."}
              </p>
            </div>
          ) : (
            <>
              <div className="relative grid aspect-video place-items-center overflow-hidden rounded-xl bg-[radial-gradient(circle_at_50%_30%,#4c1d95,#1e1b4b_55%,#0b0b0f)]">
                <Monitor size={38} strokeWidth={1.4} className="text-white/35" />
                {o.camera && (
                  <video ref={camRef} autoPlay muted playsInline className="absolute bottom-3 right-3 h-[38%] aspect-square rounded-full border-2 border-white/90 object-cover shadow-lg [transform:scaleX(-1)]" />
                )}
                {o.mic && (
                  <span className="absolute bottom-3 left-3 flex h-6 items-end gap-0.5" aria-label="Microphone level">
                    {[0.2, 0.45, 0.7, 0.95].map((k) => (
                      <span key={k} className={`w-1 rounded-full transition-all ${p.micLevel >= k * 0.6 ? "bg-emerald-400" : "bg-white/20"}`} style={{ height: `${25 + k * 75}%` }} />
                    ))}
                  </span>
                )}
                {counting && (
                  <div className="absolute inset-0 grid place-items-center bg-black/55 backdrop-blur-sm">
                    <span key={p.controls!.count} className="text-[92px] font-semibold tabular-nums leading-none motion-safe:animate-[mf-count_1s_ease-out_both]">{p.controls!.count}</span>
                  </div>
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Toggle on={o.mic} onClick={() => set({ mic: !o.mic })} icon={<Mic size={16} />} offIcon={<MicOff size={16} />} label="Microphone" detail={o.mic ? (p.mics.find((m) => m.deviceId === o.micId)?.label || "Default mic") : "Off"} />
                <Toggle on={o.camera} onClick={() => set({ camera: !o.camera })} icon={<Camera size={16} />} offIcon={<CameraOff size={16} />} label="Camera" detail={o.camera ? (p.cameras.find((c) => c.deviceId === o.cameraId)?.label || "Default camera") : "Off"} />
                <Toggle on={o.systemAudio} onClick={() => set({ systemAudio: !o.systemAudio })} icon={<Volume2 size={16} />} offIcon={<VolumeX size={16} />} label="Screen sound" detail={o.systemAudio ? "Tab or system audio" : "Off"} />
                <Toggle
                  on={o.countdown > 0}
                  onClick={() => set({ countdown: o.countdown === 0 ? 3 : o.countdown === 3 ? 5 : 0 })}
                  icon={<Timer size={16} />}
                  label="Countdown"
                  detail={o.countdown ? `${o.countdown} seconds` : "Off"}
                />
              </div>
              {(o.mic && p.mics.length > 1) || (o.camera && p.cameras.length > 1) ? (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {o.mic && p.mics.length > 1 ? (
                    <select aria-label="Microphone" value={o.micId} onChange={(e) => set({ micId: e.target.value })} className="min-w-0 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-[12px]">
                      {p.mics.map((m) => <option key={m.deviceId} value={m.deviceId}>{m.label || "Microphone"}</option>)}
                    </select>
                  ) : <span />}
                  {o.camera && p.cameras.length > 1 ? (
                    <select aria-label="Camera" value={o.cameraId} onChange={(e) => set({ cameraId: e.target.value })} className="min-w-0 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-[12px]">
                      {p.cameras.map((c) => <option key={c.deviceId} value={c.deviceId}>{c.label || "Camera"}</option>)}
                    </select>
                  ) : <span />}
                </div>
              ) : null}
              {p.floatOk && (
                <label className="mt-3 flex items-center gap-2 px-1 text-[12px] text-white/60">
                  <input type="checkbox" checked={o.floating} onChange={(e) => set({ floating: e.target.checked })} className="accent-violet-500" />
                  <PictureInPicture2 size={13} /> Floating controls over other apps
                </label>
              )}

              {p.busy ? (
                <p className="mt-4 rounded-xl bg-white/[0.04] px-4 py-3 text-center text-[13px] text-white/70">{p.busy}</p>
              ) : (
                <div className="mt-4 flex flex-col gap-2">
                  {p.captureOk && (
                    <button
                      type="button"
                      onClick={p.onRecord}
                      disabled={counting}
                      className="flex items-center justify-center gap-2.5 rounded-xl bg-white px-5 py-3 text-[14px] font-semibold text-zinc-950 hover:bg-zinc-200 disabled:opacity-60"
                    >
                      <span className="h-3 w-3 rounded-full bg-red-500" /> {counting ? "Get ready…" : "Start recording"}
                      <span className="ml-1 text-[11px] font-medium text-zinc-500">{keyLabel(["Alt", "Shift"]).join(" ")} R</span>
                    </button>
                  )}
                  <button type="button" onClick={p.onUpload} className="flex items-center justify-center gap-2 rounded-xl border border-white/12 px-5 py-2.5 text-[13px] font-medium text-white/75 hover:border-white/25 hover:text-white">
                    <Upload size={14} /> Upload a recording
                  </button>
                </div>
              )}
              {!p.captureOk && <p className="mt-3 text-[12px] text-white/45">Recording needs Chrome, Edge or Firefox on a computer. You can still upload a recording.</p>}
            </>
          )}
          {p.error && <p role="alert" className="mt-3 text-[13px] text-red-300">{p.error}</p>}
        </div>
      </div>
      <p className="pb-6 text-center text-[12px] text-white/35">Your recording stays on this device. Up to 10 minutes; MP4, WebM or MOV.</p>
    </div>
  );
}
