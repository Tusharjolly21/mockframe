"use client";

import type { ReactNode } from "react";
import { ArrowLeft, Copy, Minus, Plus, Trash2 } from "lucide-react";
import type { StickerLayer } from "@framekit/scene";
import { ANNOTATION_DEFAULT_SIZE, isSizedAnnotation } from "@framekit/renderer";
import { duplicateLayer, removeLayer } from "@/lib/sceneOps";
import { useSceneStore, useViewStore } from "@/lib/store";
import { AnnotationPreview, ANNOTATION_SWATCHES } from "./AnnotatePopover";
import { Section, Seg, SliderRow } from "./ui";

/* ------------------------------- layer header ------------------------------ */

/**
 * Header for a selected layer's inspector: Back returns to the main editor
 * (clears the selection), with duplicate / delete alongside.
 */
export function LayerHeader({ layerId, kind, title }: { layerId: string; kind: string; title: string }) {
  const setScene = useSceneStore((s) => s.setScene);
  const select = useViewStore((s) => s.select);
  return (
    <div className="flex items-center gap-2 px-3 pb-1 pt-3">
      <button
        onClick={() => select(null)}
        title="Back to editor (Esc)"
        aria-label="Back to editor"
        className="fk-press flex h-8 items-center gap-1 rounded-lg border border-[#e4e4ec] bg-white pl-1.5 pr-2.5 text-[12px] font-semibold text-[#17171c] transition-colors hover:border-[#17171c]"
      >
        <ArrowLeft size={15} />
        Back
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-[#a0a0aa]">{kind}</p>
        <p className="-mt-0.5 truncate text-[13px] font-bold tracking-[-0.01em] text-[#17171c]">{title}</p>
      </div>
      <HeaderAction
        title="Duplicate"
        onClick={() => {
          const before = new Set(useSceneStore.getState().scene.layers.map((l) => l.id));
          setScene((s) => duplicateLayer(s, layerId));
          const copy = useSceneStore.getState().scene.layers.find((l) => !before.has(l.id));
          if (copy) select(copy.id);
        }}
      >
        <Copy size={14} />
      </HeaderAction>
      <HeaderAction
        title="Delete"
        danger
        onClick={() => {
          setScene((s) => removeLayer(s, layerId));
          select(null);
        }}
      >
        <Trash2 size={14} />
      </HeaderAction>
    </div>
  );
}

function HeaderAction({ title, onClick, danger, children }: { title: string; onClick: () => void; danger?: boolean; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`fk-press grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#e4e4ec] bg-white text-[#5a5a66] transition-colors ${
        danger ? "hover:border-[#ff3b30] hover:text-[#ff3b30]" : "hover:border-[#17171c] hover:text-[#17171c]"
      }`}
    >
      {children}
    </button>
  );
}

/* ------------------------------ colour swatches ---------------------------- */

export function SwatchRow({ value, onChange, swatches = ANNOTATION_SWATCHES }: { value: string; onChange: (v: string) => void; swatches?: string[] }) {
  const custom = !swatches.includes(value.toLowerCase()) && !swatches.includes(value);
  return (
    <div className="mb-3 flex flex-wrap items-center gap-1">
      {swatches.map((c) => {
        const active = value.toLowerCase() === c.toLowerCase();
        return (
          <button
            key={c}
            aria-label={`Colour ${c}`}
            aria-pressed={active}
            onClick={() => onChange(c)}
            className="fk-press h-[22px] w-[22px] rounded-full ring-1 ring-black/10 transition-transform hover:scale-110"
            style={{ background: c, boxShadow: active ? `0 0 0 2px #fff, 0 0 0 3.5px ${c === "#ffffff" ? "#c9c9d4" : c}` : undefined }}
          />
        );
      })}
      <label
        title="Custom colour"
        className="fk-press relative h-[22px] w-[22px] cursor-pointer overflow-hidden rounded-full ring-1 ring-black/10 transition-transform hover:scale-110"
        style={{
          background: custom ? value : "conic-gradient(#ff3b30, #ffd60a, #34c759, #0a84ff, #7c3aed, #ff2d92, #ff3b30)",
          boxShadow: custom ? `0 0 0 2px #fff, 0 0 0 3.5px ${value}` : undefined,
        }}
      >
        <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#7c3aed"} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
      </label>
    </div>
  );
}

/* -------------------------------- annotations ------------------------------ */

type AnnotationLayer = Extract<StickerLayer, { stickerId: string }>;

const ARROW_KINDS = ["annot-arrow", "annot-arrow-straight", "annot-arrow-loop"] as const;
const FRAME_KINDS = ["annot-box", "annot-circle"] as const;
const KEY_PRESETS = ["⌘+K", "⌘+⇧+P", "⌥+⌘+I", "Ctrl+C", "Esc", "⏎"];
const ARROW_BOX: Record<string, [number, number]> = {
  "annot-arrow": [330, 150],
  "annot-arrow-straight": [330, 90],
  "annot-arrow-loop": [340, 180],
};

export function annotationLabel(id: string) {
  if (id.startsWith("annot-arrow")) return "Arrow";
  if (id === "annot-highlight") return "Highlight";
  if (id === "annot-redact") return "Redaction";
  if (id === "annot-blur") return "Blur patch";
  if (id === "annot-box") return "Box";
  if (id === "annot-circle") return "Circle";
  if (id.startsWith("annot-step-")) return "Step marker";
  if (id.startsWith("annot-kbd-")) return "Shortcut";
  if (id.startsWith("annot-callout-")) return "Callout";
  return "Annotation";
}

function defaultTint(id: string) {
  if (id === "annot-redact") return "#111114";
  if (id === "annot-highlight") return "#ffe066";
  if (id === "annot-blur") return "#ffffff";
  if (id.startsWith("annot-kbd-")) return "#17171c";
  if (id.startsWith("annot-arrow") || FRAME_KINDS.includes(id as (typeof FRAME_KINDS)[number])) return "#ff3b30";
  return "#7c3aed";
}

/** natural footprint of an annotation, for the inspector preview */
function previewBox(layer: AnnotationLayer): [number, number] {
  const id = layer.stickerId;
  if (ARROW_BOX[id]) return ARROW_BOX[id];
  if (isSizedAnnotation(id)) {
    const s = layer.size ?? ANNOTATION_DEFAULT_SIZE[id];
    return [s.width, s.height];
  }
  if (id.startsWith("annot-step-")) return [120, 120];
  if (id.startsWith("annot-callout-")) return [80 + Math.max(3, id.length - 14) * 17, 92];
  if (id.startsWith("annot-kbd-")) {
    const keys = id.slice("annot-kbd-".length).split("+").filter(Boolean);
    return [28 + keys.reduce((w, k) => w + Math.max(58, 32 + k.length * 16) + 10, 0), 86];
  }
  return [160, 160];
}

export function AnnotationControls({ layer }: { layer: AnnotationLayer }) {
  const updateLayer = useSceneStore((s) => s.updateLayer);
  const patch = (p: Partial<AnnotationLayer>) => updateLayer(layer.id, (l) => ({ ...(l as AnnotationLayer), ...p }));
  const patchTransform = (p: Partial<AnnotationLayer["transform"]>) =>
    updateLayer(layer.id, (l) => ({ ...l, transform: { ...l.transform, ...p } }));
  const id = layer.stickerId;
  const tint = layer.tint ?? defaultTint(id);
  const isArrow = (ARROW_KINDS as readonly string[]).includes(id);
  const isFrame = (FRAME_KINDS as readonly string[]).includes(id);
  const size = isSizedAnnotation(id) ? layer.size ?? ANNOTATION_DEFAULT_SIZE[id] : null;

  return (
    <>
      <LayerHeader layerId={layer.id} kind="Annotation" title={annotationLabel(id)} />
      <div className="mx-3 mt-2 grid place-items-center overflow-hidden rounded-2xl border border-[#ececf2] bg-[linear-gradient(180deg,#f8f8fb,#efeff4)] py-3">
        <AnnotationPreview id={id} tint={tint} box={previewBox(layer)} w={236} h={78} />
      </div>

      <Section title="Style">
        {isArrow && (
          <Seg
            id="annot-arrow-kind"
            options={[
              { value: "annot-arrow", label: "Curved" },
              { value: "annot-arrow-straight", label: "Straight" },
              { value: "annot-arrow-loop", label: "Loop" },
            ]}
            value={id}
            onChange={(v) => patch({ stickerId: v })}
          />
        )}
        {isFrame && (
          <Seg
            id="annot-frame-kind"
            options={[
              { value: "annot-box", label: "Box" },
              { value: "annot-circle", label: "Circle" },
            ]}
            value={id}
            onChange={(v) => patch({ stickerId: v })}
          />
        )}

        <span className="mb-1.5 block text-xs text-[#6b6b76]">{id === "annot-blur" ? "Glass tint" : id.startsWith("annot-kbd-") ? "Key colour" : "Colour"}</span>
        <SwatchRow value={tint} onChange={(v) => patch({ tint: v })} />

        {id.startsWith("annot-callout-") && (
          <>
            <span className="mb-1.5 block text-xs text-[#6b6b76]">Label</span>
            <input
              value={id.slice("annot-callout-".length)}
              maxLength={40}
              onChange={(e) => patch({ stickerId: `annot-callout-${e.target.value}` })}
              placeholder="New"
              className="mb-3 w-full rounded-xl border border-[#e4e4ec] bg-white px-3 py-2 text-sm text-[#17171c] focus:border-[#17171c] focus:outline-none"
            />
          </>
        )}

        {id.startsWith("annot-kbd-") && (
          <>
            <span className="mb-1.5 block text-xs text-[#6b6b76]">Keys — separate with +</span>
            <input
              value={id.slice("annot-kbd-".length)}
              onChange={(e) => patch({ stickerId: `annot-kbd-${e.target.value}` })}
              placeholder="⌘+K"
              className="w-full rounded-xl border border-[#e4e4ec] bg-white px-3 py-2 text-sm text-[#17171c] focus:border-[#17171c] focus:outline-none"
            />
            <div className="mb-3 mt-2 flex flex-wrap gap-1">
              {KEY_PRESETS.map((k) => (
                <button
                  key={k}
                  onClick={() => patch({ stickerId: `annot-kbd-${k}` })}
                  className="fk-press rounded-md border border-[#e4e4ec] bg-white px-2 py-1 text-[11px] font-semibold text-[#3a3a44] shadow-[inset_0_-2px_0_#ececf2] hover:border-[#17171c]"
                >
                  {k.replaceAll("+", " ")}
                </button>
              ))}
            </div>
          </>
        )}

        {id.startsWith("annot-step-") && (
          <>
            <span className="mb-1.5 block text-xs text-[#6b6b76]">Number</span>
            {(() => {
              const n = parseInt(id.slice("annot-step-".length), 10) || 1;
              return (
                <div className="mb-3 flex items-center gap-1 rounded-xl bg-[#ececf2] p-1">
                  <button
                    aria-label="Previous number"
                    onClick={() => patch({ stickerId: `annot-step-${Math.max(1, n - 1)}` })}
                    className="fk-press grid h-8 w-10 place-items-center rounded-lg text-[#17171c] hover:bg-white"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="flex-1 text-center text-[15px] font-bold tabular-nums text-[#17171c]">{n}</span>
                  <button
                    aria-label="Next number"
                    onClick={() => patch({ stickerId: `annot-step-${Math.min(99, n + 1)}` })}
                    className="fk-press grid h-8 w-10 place-items-center rounded-lg text-[#17171c] hover:bg-white"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              );
            })()}
          </>
        )}

        {size && (
          <>
            <SliderRow label="Width" value={size.width} min={60} max={1400} onChange={(width) => patch({ size: { width, height: size.height } })} />
            <SliderRow label="Height" value={size.height} min={30} max={900} onChange={(height) => patch({ size: { width: size.width, height } })} />
          </>
        )}
      </Section>

      <Section title="Transform">
        <SliderRow
          label="Scale"
          value={Math.round(layer.transform.scale * 100)}
          min={20}
          max={400}
          format={(v) => `${Math.round(v)}%`}
          onChange={(v) => patchTransform({ scale: v / 100 })}
        />
        <SliderRow
          label="Rotate"
          value={layer.transform.rotate}
          min={-180}
          max={180}
          format={(v) => `${Math.round(v)}°`}
          onChange={(rotate) => patchTransform({ rotate })}
        />
      </Section>
    </>
  );
}
