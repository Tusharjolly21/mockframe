"use client";

import { getDevice } from "@framekit/devices";
import type { MockupLayer } from "@framekit/scene";
import { Check } from "lucide-react";
import { useSceneStore } from "@/lib/store";
import { Section } from "./ui";

/** Matte clay colours: soft neutrals and pastels plus two deep tones. */
export const CLAY_PRESETS: { id: string; label: string; color: string }[] = [
  { id: "porcelain", label: "Porcelain", color: "#f3f1ec" },
  { id: "sand", label: "Sand", color: "#e9dcc8" },
  { id: "blush", label: "Blush", color: "#f2d4cf" },
  { id: "peach", label: "Peach", color: "#f6cfae" },
  { id: "sage", label: "Sage", color: "#cddbc6" },
  { id: "sky", label: "Sky", color: "#cbdcf0" },
  { id: "lilac", label: "Lilac", color: "#dbd1f1" },
  { id: "butter", label: "Butter", color: "#f3e6a8" },
  { id: "stone", label: "Stone", color: "#a9a7a1" },
  { id: "charcoal", label: "Charcoal", color: "#3b3b41" },
  { id: "midnight", label: "Midnight", color: "#22283a" },
];

/** Clay works on drawn device frames; photo scenes and frameless shots keep their look. */
export function supportsClay(layer: MockupLayer): boolean {
  const device = layer.deviceId ? getDevice(layer.deviceId) : undefined;
  return !!device && !device.plate && !layer.render;
}

export function ClayControls({ layer }: { layer: MockupLayer }) {
  const updateLayer = useSceneStore((s) => s.updateLayer);
  const setScene = useSceneStore((s) => s.setScene);
  const others = useSceneStore((s) =>
    s.scene.layers.filter((l): l is MockupLayer => l.type === "mockup" && l.id !== layer.id && supportsClay(l)).length
  );
  const clay = layer.clay;
  const set = (next: MockupLayer["clay"]) => updateLayer(layer.id, (l) => ({ ...(l as MockupLayer), clay: next }));
  const applyToAll = () =>
    setScene((s) => ({
      ...s,
      layers: s.layers.map((l) => (l.type === "mockup" && supportsClay(l) ? { ...l, clay } : l)),
    }));

  return (
    <Section
      title="Clay"
      action={
        others > 0 ? (
          <button
            type="button"
            onClick={applyToAll}
            className="fk-press rounded-full border border-[#e4e4ec] px-2.5 py-1 text-[10.5px] font-semibold text-[#55555f] hover:border-[#c9c9d4]"
          >
            {clay ? "Use on all devices" : "Remove from all"}
          </button>
        ) : undefined
      }
    >
      <div role="radiogroup" aria-label="Clay finish" className="grid grid-cols-6 gap-2">
        <button
          type="button"
          role="radio"
          aria-checked={!clay}
          title="Original finish"
          onClick={() => set(undefined)}
          className={`fk-press grid aspect-square place-items-center rounded-full border text-[9.5px] font-semibold text-[#6b6b76] ${
            !clay ? "border-[#17171c] shadow-[0_0_0_1px_#17171c]" : "border-[#e4e4ec]"
          }`}
        >
          Off
        </button>
        {CLAY_PRESETS.map((p) => {
          const on = clay?.color.toLowerCase() === p.color;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={p.label}
              title={p.label}
              onClick={() => set({ color: p.color })}
              className={`fk-press grid aspect-square place-items-center rounded-full border shadow-[inset_0_-4px_8px_rgba(0,0,0,0.08),inset_0_3px_6px_rgba(255,255,255,0.6)] ${
                on ? "border-[#17171c] shadow-[0_0_0_1px_#17171c]" : "border-black/10"
              }`}
              style={{ background: p.color }}
            >
              {on && <Check size={12} className={parseInt(p.color.slice(1, 3), 16) < 128 ? "text-white" : "text-[#17171c]"} />}
            </button>
          );
        })}
      </div>
      <label className="mt-3 flex items-center justify-between text-xs text-[#6b6b76]">
        Custom colour
        <input
          type="color"
          value={clay?.color ?? "#f3f1ec"}
          onChange={(e) => set({ color: e.target.value.toLowerCase() })}
          className="h-7 w-10 cursor-pointer rounded-md border border-[#e4e4ec] bg-white"
        />
      </label>
    </Section>
  );
}
