"use client";

import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  BringToFront,
  Copy,
  Crop,
  Group,
  SendToBack,
  type LucideIcon,
} from "lucide-react";
import { runArrange, type ArrangeAction } from "@/lib/arrange";
import { canAdjust, enterAdjust } from "@/lib/adjust";
import { duplicateLayer, groupLayers } from "@/lib/sceneOps";
import { useSceneStore, useViewStore } from "@/lib/store";

type Box = { id: string; x: number; y: number; w: number; h: number };

const ALIGN: [ArrangeAction, LucideIcon, string][] = [
  ["left", AlignStartVertical, "Align left (⌥A)"],
  ["center", AlignCenterVertical, "Align centers horizontally (⌥H)"],
  ["right", AlignEndVertical, "Align right (⌥D)"],
  ["top", AlignStartHorizontal, "Align top (⌥W)"],
  ["middle", AlignCenterHorizontal, "Align middles vertically (⌥V)"],
  ["bottom", AlignEndHorizontal, "Align bottom (⌥S)"],
];

/**
 * Floating arrange bar under the selection (Figma-style): align to the canvas
 * (one element) or to each other (several), distribute, restack, duplicate,
 * group. Every action is a single undo step.
 */
export function ArrangeBar({ boxes, hostW, hostH }: { boxes: Box[]; hostW: number; hostH: number }) {
  const selectedIds = useViewStore((s) => s.selectedIds);
  const setScene = useSceneStore((s) => s.setScene);
  const many = selectedIds.length > 1;
  const adjustable = useSceneStore((s) => !many && canAdjust(s.scene.layers.find((l) => l.id === selectedIds[0])));

  const l = Math.min(...boxes.map((b) => b.x));
  const r = Math.max(...boxes.map((b) => b.x + b.w));
  const t = Math.min(...boxes.map((b) => b.y));
  const b = Math.max(...boxes.map((bx) => bx.y + bx.h));
  // below the selection when there is room, else above its rotate handle,
  // else (selection fills the view) floating just above the bottom bar
  const top = b + 150 < hostH ? b + 14 : t - 92 >= 84 ? t - 92 : hostH - 132;
  const left = Math.min(Math.max((l + r) / 2, 210), hostW - 210);

  const btn = (key: string, Icon: LucideIcon, title: string, fn: () => void) => (
    <button
      key={key}
      title={title}
      onClick={fn}
      className="fk-press grid h-7 w-7 place-items-center rounded-lg text-[#4a4a55] hover:bg-black/[0.06] hover:text-[#17171c]"
    >
      <Icon size={15} />
    </button>
  );
  const sep = (k: string) => <span key={k} className="mx-0.5 h-4 w-px bg-black/10" />;

  return (
    <div
      data-arrange-bar
      onPointerDown={(e) => e.stopPropagation()}
      className="fk-card absolute z-20 flex -translate-x-1/2 items-center gap-0.5 rounded-xl bg-white/95 px-1.5 py-1 shadow-[0_8px_28px_rgba(20,20,40,0.16)] backdrop-blur"
      style={{ left, top }}
    >
      {adjustable && (
        <>
          <button
            data-adjust-open
            title="Adjust the screenshot: move, zoom, crop (double-click)"
            onClick={() => enterAdjust(selectedIds[0])}
            className="fk-press flex h-7 items-center gap-1.5 rounded-lg bg-violet-600 px-2.5 text-[11.5px] font-bold text-white hover:bg-violet-700"
          >
            <Crop size={13} /> Adjust
          </button>
          {sep("s0")}
        </>
      )}
      <span className="px-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#9a9aa4]">{many ? "Align" : "To canvas"}</span>
      {ALIGN.map(([a, Icon, title]) => btn(a, Icon, title, () => runArrange(a)))}
      {many && sep("s1")}
      {many && btn("dist-h", AlignHorizontalDistributeCenter, "Distribute horizontally (3+)", () => runArrange("dist-h"))}
      {many && btn("dist-v", AlignVerticalDistributeCenter, "Distribute vertically (3+)", () => runArrange("dist-v"))}
      {sep("s2")}
      {btn("front", BringToFront, "Bring to front (⌘])", () => runArrange("front"))}
      {btn("back", SendToBack, "Send to back (⌘[)", () => runArrange("back"))}
      {sep("s3")}
      {btn("dup", Copy, "Duplicate (⌘D)", () => {
        for (const id of selectedIds) setScene((s) => duplicateLayer(s, id));
      })}
      {many &&
        btn("group", Group, "Group (⌘G)", () => {
          setScene((s) => groupLayers(s, selectedIds));
          window.dispatchEvent(new CustomEvent("framekit:toast", { detail: `Grouped ${selectedIds.length} elements` }));
        })}
    </div>
  );
}
