"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Pause, Play, Square, X } from "lucide-react";
import { keyLabel } from "@/lib/recorder/shortcuts";

/**
 * A small always-on-top window with the recording controls (Chrome's
 * Document Picture-in-Picture). It floats over whatever app you're
 * recording, so you can pause or stop without coming back to this tab, and
 * the recording shortcuts work while it has focus.
 */

interface DocumentPip {
  requestWindow(opts: { width: number; height: number; disallowReturnToOpener?: boolean }): Promise<Window>;
  window: Window | null;
}

const pipApi = (): DocumentPip | null => (typeof window !== "undefined" && (window as unknown as { documentPictureInPicture?: DocumentPip }).documentPictureInPicture) || null;

export const canFloat = () => !!pipApi();

function copyStyles(target: Document) {
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const css = Array.from(sheet.cssRules)
        .map((r) => r.cssText)
        .join("\n");
      const style = target.createElement("style");
      style.textContent = css;
      target.head.appendChild(style);
    } catch {
      // cross-origin sheet: link it instead
      if (sheet.href) {
        const link = target.createElement("link");
        link.rel = "stylesheet";
        link.href = sheet.href;
        target.head.appendChild(link);
      }
    }
  }
}

export function useFloatingWindow() {
  const [win, setWin] = useState<Window | null>(null);
  const open = useCallback(async () => {
    const api = pipApi();
    if (!api) return null;
    if (api.window) return api.window;
    try {
      const w = await api.requestWindow({ width: 340, height: 132, disallowReturnToOpener: false });
      copyStyles(w.document);
      w.document.body.className = "m-0 bg-[#121216] text-white antialiased";
      w.document.title = "Mockframe recording";
      w.addEventListener("pagehide", () => setWin(null));
      setWin(w);
      return w;
    } catch {
      return null;
    }
  }, []);
  const close = useCallback(() => {
    pipApi()?.window?.close();
    setWin(null);
  }, []);
  useEffect(() => () => pipApi()?.window?.close(), []);
  return { win, open, close };
}

const fmt = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export interface ControlsProps {
  phase: "picking" | "countdown" | "recording" | "paused";
  count: number;
  elapsedMs: number;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onCancel: () => void;
  /** set when the browser needs one more click before it shows the share picker */
  onPick?: () => void;
  camera?: MediaStream | null;
}

export function RecordingControls(p: ControlsProps & { compact?: boolean }) {
  const camRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (camRef.current) camRef.current.srcObject = p.camera ?? null;
  }, [p.camera]);
  const live = p.phase === "recording";
  return (
    <div className="flex h-full w-full items-center gap-3 px-4 py-3 font-sans">
      {p.camera && <video ref={camRef} autoPlay muted playsInline className="h-14 w-14 shrink-0 rounded-full object-cover [transform:scaleX(-1)]" />}
      <div className="min-w-0 flex-1">
        {p.phase === "picking" &&
          (p.onPick ? (
            <button type="button" onClick={p.onPick} className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-zinc-950 hover:bg-zinc-200">
              Choose what to record
            </button>
          ) : (
            <p className="text-[13px] text-white/70">Choose what to share in the browser&apos;s window.</p>
          ))}
        {p.phase === "countdown" && (
          <p className="flex items-baseline gap-2 text-[13px] text-white/70">
            <span className="text-[30px] font-semibold tabular-nums leading-none text-white">{p.count}</span> Recording starts…
          </p>
        )}
        {(p.phase === "recording" || p.phase === "paused") && (
          <>
            <p className="flex items-center gap-2 text-[22px] font-semibold tabular-nums leading-none">
              <span className={`h-2.5 w-2.5 rounded-full ${live ? "animate-pulse bg-red-500" : "bg-amber-400"}`} />
              {fmt(p.elapsedMs)}
            </p>
            <p className="mt-1.5 text-[11px] text-white/45">
              {live ? "Recording." : "Paused."} {keyLabel(["Alt", "Shift"]).join(" ")} R to stop
            </p>
          </>
        )}
      </div>
      {(p.phase === "recording" || p.phase === "paused") && (
        <button
          type="button"
          onClick={live ? p.onPause : p.onResume}
          aria-label={live ? "Pause recording" : "Resume recording"}
          className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20"
        >
          {live ? <Pause size={15} className="fill-current" /> : <Play size={15} className="ml-0.5 fill-current" />}
        </button>
      )}
      {p.phase !== "picking" && (
        <button type="button" onClick={p.onStop} aria-label="Stop recording" className="grid h-9 w-9 place-items-center rounded-full bg-red-500 hover:bg-red-400">
          <Square size={13} className="fill-current" />
        </button>
      )}
      <button type="button" onClick={p.onCancel} aria-label="Discard recording" title="Discard" className="grid h-7 w-7 place-items-center rounded-full text-white/45 hover:bg-white/10 hover:text-white">
        <X size={14} />
      </button>
    </div>
  );
}

/** Render the controls into the floating window, and route its keys to `onKey`. */
export function FloatingControls({ win, onKey, ...p }: ControlsProps & { win: Window; onKey: (e: KeyboardEvent) => void }) {
  useEffect(() => {
    win.addEventListener("keydown", onKey);
    return () => win.removeEventListener("keydown", onKey);
  }, [win, onKey]);
  return createPortal(<RecordingControls {...p} />, win.document.body);
}
