"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { AnnotationGraphic } from "@framekit/renderer";
import { addAnnotation, type AnnotationStickerId } from "@/lib/sceneOps";
import { useSceneStore, useViewStore } from "@/lib/store";
import { Popover } from "./ui";

/** Curated annotation colours — shared with the inspector. */
export const ANNOTATION_SWATCHES = ["#ff3b30", "#ff9500", "#ffd60a", "#34c759", "#0a84ff", "#7c3aed", "#ff2d92", "#111114", "#ffffff"];

type Tool = {
  id: AnnotationStickerId;
  label: string;
  /** what the preview renders (ids that carry a value need a sample) */
  preview: string;
  /** natural size of the graphic, used to fit it into the tile */
  box: [number, number];
  /** colour shown in the preview when it doesn't follow the accent */
  fixedTint?: string;
};

const GROUPS: { title: string; tools: Tool[] }[] = [
  {
    title: "Point",
    tools: [
      { id: "annot-arrow", label: "Curved", preview: "annot-arrow", box: [330, 150] },
      { id: "annot-arrow-straight", label: "Straight", preview: "annot-arrow-straight", box: [330, 90] },
      { id: "annot-arrow-loop", label: "Loop", preview: "annot-arrow-loop", box: [340, 180] },
      { id: "annot-step-1", label: "Step", preview: "annot-step-1", box: [120, 120] },
    ],
  },
  {
    title: "Label & frame",
    tools: [
      { id: "annot-callout", label: "Callout", preview: "annot-callout-New", box: [190, 92] },
      { id: "annot-box", label: "Box", preview: "annot-box", box: [440, 260] },
      { id: "annot-circle", label: "Circle", preview: "annot-circle", box: [360, 220] },
      { id: "annot-kbd", label: "Shortcut", preview: "annot-kbd-⌘+K", box: [176, 86], fixedTint: "#17171c" },
    ],
  },
  {
    title: "Mark & hide",
    tools: [
      { id: "annot-highlight", label: "Highlight", preview: "annot-highlight", box: [380, 84], fixedTint: "#ffe066" },
      { id: "annot-redact", label: "Redact", preview: "annot-redact", box: [360, 88], fixedTint: "#111114" },
      { id: "annot-blur", label: "Blur", preview: "annot-blur", box: [360, 118], fixedTint: "#ffffff" },
    ],
  },
];

const ACCENT_KEY = "fk-annot-accent";
const TILE_W = 74;
const TILE_H = 50;

/** Scaled, live render of an annotation over a faux-UI backdrop. */
export function AnnotationPreview({ id, tint, box, w = TILE_W, h = TILE_H }: { id: string; tint: string; box: [number, number]; w?: number; h?: number }) {
  const k = Math.min(w / box[0], h / box[1]);
  return (
    <span className="pointer-events-none relative grid place-items-center" style={{ width: w, height: h }}>
      <span style={{ width: box[0] * k, height: box[1] * k }} className="relative block">
        <span className="absolute left-0 top-0 block origin-top-left" style={{ transform: `scale(${k})`, width: box[0], height: box[1] }}>
          <span className="grid h-full w-full place-items-center">
            <AnnotationGraphic id={id} tint={tint} />
          </span>
        </span>
      </span>
    </span>
  );
}

export function AnnotatePopover({ onClose }: { onClose: () => void }) {
  const setScene = useSceneStore((s) => s.setScene);
  const select = useViewStore((s) => s.select);
  const [accent, setAccent] = useState(ANNOTATION_SWATCHES[0]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ACCENT_KEY);
      if (saved && ANNOTATION_SWATCHES.includes(saved)) setAccent(saved);
    } catch {
      /* storage unavailable — keep the default */
    }
  }, []);

  const pickAccent = (c: string) => {
    setAccent(c);
    try {
      localStorage.setItem(ACCENT_KEY, c);
    } catch {
      /* ignore */
    }
  };

  const add = (id: AnnotationStickerId) => {
    const r = addAnnotation(useSceneStore.getState().scene, id, accent);
    setScene(() => r.scene);
    select(r.layerId);
    onClose();
  };

  return (
    <Popover className="bottom-[calc(100%+10px)] left-1/2 w-[372px] -translate-x-1/2 p-0" onEscape={onClose}>
      <div className="flex items-center justify-between border-b border-[#ececf2] px-4 pb-2.5 pt-3">
        <div>
          <p className="text-[13px] font-bold tracking-[-0.01em] text-[#17171c]">Annotate</p>
          <p className="text-[10.5px] text-[#9a9aa4]">Press A to open or close</p>
        </div>
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Annotation colour">
          {ANNOTATION_SWATCHES.slice(0, 7).map((c) => (
            <button
              key={c}
              role="radio"
              aria-checked={accent === c}
              aria-label={`Colour ${c}`}
              onClick={() => pickAccent(c)}
              className="fk-press grid h-[18px] w-[18px] place-items-center rounded-full ring-1 ring-black/10 transition-transform hover:scale-110"
              style={{ background: c, boxShadow: accent === c ? `0 0 0 2px #fff, 0 0 0 3.5px ${c}` : undefined }}
            >
              {accent === c && <Check size={10} strokeWidth={3.5} className={c === "#ffd60a" ? "text-black/70" : "text-white"} />}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-3 px-3 pb-3 pt-2.5">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#a0a0aa]">{g.title}</p>
            <div className="grid grid-cols-4 gap-1.5">
              {g.tools.map((t) => (
                <button
                  key={t.id}
                  onClick={() => add(t.id)}
                  title={`Add ${t.label.toLowerCase()}`}
                  className="fk-press group flex flex-col items-center gap-1 rounded-xl border border-[#ececf2] bg-white p-1.5 pb-1 transition-[border-color,box-shadow] hover:border-[#c9c9d4] hover:shadow-[0_4px_14px_rgba(20,20,40,0.08)]"
                >
                  <span className="relative grid w-full place-items-center overflow-hidden rounded-lg bg-[linear-gradient(180deg,#f7f7fa,#efeff4)] py-1">
                    {/* faux UI lines so highlight / blur / redact read in context */}
                    <span aria-hidden className="absolute left-2 right-5 top-[30%] h-[5px] rounded-full bg-[#dcdce4]" />
                    <span aria-hidden className="absolute left-2 right-9 top-[58%] h-[5px] rounded-full bg-[#e3e3ea]" />
                    <span className="relative transition-transform duration-200 group-hover:scale-[1.06]">
                      <AnnotationPreview id={t.preview} tint={t.fixedTint ?? accent} box={t.box} />
                    </span>
                  </span>
                  <span className="text-[11px] font-semibold text-[#3a3a44] group-hover:text-[#17171c]">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="border-t border-[#ececf2] px-4 py-2 text-center text-[10.5px] text-[#9a9aa4]">
        Drag to place · corner handles resize · Shift snaps arrows straight
      </p>
    </Popover>
  );
}
