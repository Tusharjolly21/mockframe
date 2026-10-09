"use client";

import { useEffect, useState } from "react";
import { LIVE_BACKGROUNDS, loadLiveBackground, saveLiveBackground, type LiveBackground } from "@/lib/backgroundMotion";

const EVENT = "mockframe:live-background";

/** The live-background choice, shared by the Motion and Zoom tabs and remembered per browser. */
export function useLiveBackground(): [LiveBackground, (v: LiveBackground) => void] {
  const [value, setValue] = useState<LiveBackground>("off");
  useEffect(() => {
    setValue(loadLiveBackground());
    const on = () => setValue(loadLiveBackground());
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  const set = (v: LiveBackground) => {
    saveLiveBackground(v);
    setValue(v);
    window.dispatchEvent(new CustomEvent(EVENT));
  };
  return [value, set];
}

/** "Background: Off · Drift · Hue · Breathe" — how the background moves during the clip. */
export function LiveBackgroundControl({ disabled }: { disabled?: boolean }) {
  const [value, setValue] = useLiveBackground();
  return (
    <div className="flex items-center gap-2 text-[10.5px]">
      <span className="text-white/45">Live background</span>
      <div className="flex rounded-lg border border-white/5 bg-white/5 p-0.5">
        {LIVE_BACKGROUNDS.map((b) => (
          <button
            key={b.id}
            title={b.hint}
            disabled={disabled}
            onClick={() => setValue(b.id)}
            className={`whitespace-nowrap rounded-md px-2.5 py-1 font-bold transition-all disabled:opacity-40 ${
              value === b.id ? "bg-white/15 text-white" : "text-white/45 hover:text-white/75"
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>
    </div>
  );
}
