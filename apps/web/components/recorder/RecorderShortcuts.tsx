"use client";

import { X } from "lucide-react";
import { keyLabel, SHORTCUTS } from "@/lib/recorder/shortcuts";

export function RecorderShortcuts({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal aria-label="Keyboard shortcuts">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141418] p-5 text-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Keyboard shortcuts</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-7 w-7 place-items-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white">
            <X size={15} />
          </button>
        </div>
        {SHORTCUTS.map((g) => (
          <div key={g.group} className="mt-3">
            <h3 className="mb-1 text-[12px] font-medium text-white/45">{g.group}</h3>
            {g.items.map((it) => (
              <div key={it.label} className="flex items-center justify-between py-1 text-[13px] text-white/80">
                {it.label}
                <span className="flex gap-1">
                  {keyLabel(it.keys).map((k) => (
                    <kbd key={k} className="min-w-[22px] rounded-md border border-white/15 bg-white/[0.06] px-1.5 py-0.5 text-center font-sans text-[11px] text-white/75">{k}</kbd>
                  ))}
                </span>
              </div>
            ))}
          </div>
        ))}
        <p className="mt-4 text-[11.5px] leading-[1.45] text-white/40">
          Browsers only pass keys to the page you&apos;re on. While you record another app, use the floating controls window: the recording shortcuts work there too.
        </p>
      </div>
    </div>
  );
}
