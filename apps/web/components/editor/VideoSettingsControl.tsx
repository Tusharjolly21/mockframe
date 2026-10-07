"use client";

import { useSyncExternalStore } from "react";
import { useSceneStore } from "@/lib/store";
import {
  DEFAULT_VIDEO_SETTINGS,
  VIDEO_FPS,
  VIDEO_RESOLUTIONS,
  isVideoSettings,
  videoSize,
  type VideoSettings,
} from "@/lib/videoSettings";

/* One choice for every video export (motion + chat replay), remembered per browser. */
const KEY = "mockframe:video-settings";
const listeners = new Set<() => void>();
let current: VideoSettings | null = null;

function read(): VideoSettings {
  if (current) return current;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    current = isVideoSettings(raw) ? raw : DEFAULT_VIDEO_SETTINGS;
  } catch {
    current = DEFAULT_VIDEO_SETTINGS;
  }
  return current;
}

function write(next: VideoSettings) {
  current = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode: the choice still holds for this session */
  }
  listeners.forEach((fn) => fn());
}

export function useVideoSettings(): [VideoSettings, (patch: Partial<VideoSettings>) => void] {
  const value = useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    read,
    () => DEFAULT_VIDEO_SETTINGS
  );
  return [value, (patch) => write({ ...read(), ...patch })];
}

function Seg<T extends string | number>({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-lg border border-white/5 bg-white/5 p-0.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-2 py-1 text-[10px] font-bold tabular-nums transition-all disabled:cursor-not-allowed ${
            o.value === value ? "bg-white/15 text-white" : "text-white/45 hover:text-white/75"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** FPS + resolution picker for the Animate panel, with the exact output size. */
export function VideoSettingsControl({ disabled = false }: { disabled?: boolean }) {
  const [settings, update] = useVideoSettings();
  const canvas = useSceneStore((s) => s.scene.canvas);
  const { width, height } = videoSize(canvas.width, canvas.height, settings.resolution);
  return (
    <div className="flex items-center gap-1.5">
      <Seg
        label="Frame rate"
        options={VIDEO_FPS.map((f) => ({ value: f, label: `${f} fps` }))}
        value={settings.fps}
        onChange={(fps) => update({ fps })}
        disabled={disabled}
      />
      <Seg
        label="Resolution"
        options={VIDEO_RESOLUTIONS.map((r) => ({ value: r.id, label: r.label }))}
        value={settings.resolution}
        onChange={(resolution) => update({ resolution })}
        disabled={disabled}
      />
      <span className="hidden font-mono text-[9.5px] text-white/40 xl:inline" title="Output size">
        {width}×{height}
      </span>
    </div>
  );
}
