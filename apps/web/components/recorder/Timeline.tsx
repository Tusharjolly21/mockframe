"use client";

import { useRef } from "react";
import { Keyboard, MousePointerClick, Navigation, ZoomIn } from "lucide-react";
import type { ClickEvent, TypingBurst } from "@/lib/recorder/track";
import type { ZoomSegment } from "@/lib/recorder/zoom";

export type Selection = { kind: "zoom" | "click" | "typing"; id: string } | null;

export interface TimelineProps {
  durationMs: number;
  timeMs: number;
  zooms: ZoomSegment[];
  clicks: ClickEvent[];
  typing: TypingBurst[];
  selected: Selection;
  onSelect: (s: Selection) => void;
  onSeek: (ms: number) => void;
  /** live while dragging; `commit` once on release (for undo) */
  onZoomsChange: (zooms: ZoomSegment[], commit: boolean) => void;
  onClicksChange: (clicks: ClickEvent[], commit: boolean) => void;
}

const typingId = (b: TypingBurst) => `t${b.startMs}`;

function ticks(durationMs: number): number[] {
  const s = durationMs / 1000;
  const step = s <= 15 ? 1 : s <= 40 ? 5 : s <= 120 ? 10 : s <= 300 ? 30 : 60;
  return Array.from({ length: Math.floor(s / step) + 1 }, (_, i) => i * step * 1000);
}

const label = (ms: number) => {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** Three lanes under the preview: zooms, clicks and typing, with a ruler and the playhead. */
export function Timeline(p: TimelineProps) {
  const ref = useRef<HTMLDivElement>(null);
  const dur = Math.max(1, p.durationMs);
  const pct = (ms: number) => `${(ms / dur) * 100}%`;
  const msAt = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect();
    return Math.min(dur, Math.max(0, ((clientX - r.left) / r.width) * dur));
  };

  const drag = (e: React.PointerEvent, onMove: (dms: number) => void, onUp: () => void) => {
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    const origin = msAt(e.clientX);
    let moved = false;
    const move = (ev: PointerEvent) => {
      moved = true;
      onMove(msAt(ev.clientX) - origin);
    };
    const up = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", up);
      if (moved) onUp();
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
  };

  const dragZoom = (e: React.PointerEvent, z: ZoomSegment, mode: "move" | "start" | "end") => {
    p.onSelect({ kind: "zoom", id: z.id });
    const others = p.zooms.filter((o) => o.id !== z.id);
    const lo = Math.max(0, ...others.filter((o) => o.endMs <= z.startMs).map((o) => o.endMs));
    const hi = Math.min(dur, ...others.filter((o) => o.startMs >= z.endMs).map((o) => o.startMs));
    let latest = p.zooms;
    drag(
      e,
      (d) => {
        let s = z.startMs;
        let en = z.endMs;
        if (mode === "move") {
          const len = z.endMs - z.startMs;
          s = Math.min(Math.max(lo, z.startMs + d), hi - len);
          en = s + len;
        } else if (mode === "start") s = Math.min(Math.max(lo, z.startMs + d), z.endMs - 400);
        else en = Math.max(Math.min(hi, z.endMs + d), z.startMs + 400);
        latest = p.zooms.map((o) => (o.id === z.id ? { ...o, startMs: Math.round(s), endMs: Math.round(en) } : o));
        p.onZoomsChange(latest, false);
      },
      () => p.onZoomsChange(latest, true)
    );
  };

  const dragClick = (e: React.PointerEvent, c: ClickEvent) => {
    p.onSelect({ kind: "click", id: c.id });
    let latest = p.clicks;
    drag(
      e,
      (d) => {
        latest = p.clicks.map((o) => (o.id === c.id ? { ...o, t: Math.round(Math.min(dur, Math.max(0, c.t + d))) } : o));
        p.onClicksChange(latest, false);
      },
      () => p.onClicksChange([...latest].sort((a, b) => a.t - b.t), true)
    );
  };

  const isSel = (kind: string, id: string) => p.selected?.kind === kind && p.selected.id === id;

  return (
    <div className="flex gap-2">
      <div className="flex w-6 shrink-0 flex-col pt-[18px] text-white/35" aria-hidden>
        <span className="grid h-10 place-items-center"><ZoomIn size={13} /></span>
        <span className="mt-1 grid h-7 place-items-center"><MousePointerClick size={13} /></span>
        <span className="mt-1 grid h-4 place-items-center"><Keyboard size={12} /></span>
      </div>
      <div
        ref={ref}
        className="relative min-w-0 flex-1 cursor-pointer select-none"
        onPointerDown={(e) => {
          p.onSelect(null);
          p.onSeek(msAt(e.clientX));
          const target = e.currentTarget;
          target.setPointerCapture(e.pointerId);
          const move = (ev: PointerEvent) => p.onSeek(msAt(ev.clientX));
          const up = () => {
            target.removeEventListener("pointermove", move);
            target.removeEventListener("pointerup", up);
          };
          target.addEventListener("pointermove", move);
          target.addEventListener("pointerup", up);
        }}
      >
        <div className="relative h-[18px] text-[10px] tabular-nums text-white/35">
          {ticks(dur).map((t) => (
            <span key={t} className="absolute top-0 -translate-x-1/2 first:translate-x-0" style={{ left: pct(t) }}>
              {label(t)}
            </span>
          ))}
        </div>

        <div className="relative h-10 rounded-lg bg-white/[0.04]">
          {p.zooms.map((z) => (
            <div
              key={z.id}
              onPointerDown={(e) => dragZoom(e, z, "move")}
              className={`absolute top-1 flex h-8 cursor-grab items-center justify-center gap-1 rounded-md text-[11px] font-medium active:cursor-grabbing ${
                isSel("zoom", z.id) ? "bg-violet-500 text-white ring-2 ring-white/70" : z.scale < 1 ? "bg-sky-600/60 text-white/90 hover:bg-sky-600/80" : "bg-violet-600/60 text-white/90 hover:bg-violet-600/80"
              }`}
              style={{ left: pct(z.startMs), width: pct(z.endMs - z.startMs) }}
              title={z.follow ? "Follows the cursor" : undefined}
            >
              <span onPointerDown={(e) => dragZoom(e, z, "start")} className="absolute inset-y-0 left-0 w-2 cursor-ew-resize rounded-l-md hover:bg-white/30" />
              {z.follow && <Navigation size={10} className="shrink-0" />}
              <span className="truncate px-1.5">{z.scale.toFixed(1)}×</span>
              <span onPointerDown={(e) => dragZoom(e, z, "end")} className="absolute inset-y-0 right-0 w-2 cursor-ew-resize rounded-r-md hover:bg-white/30" />
            </div>
          ))}
        </div>

        <div className="relative mt-1 h-7 rounded-lg bg-white/[0.03]">
          {p.clicks.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-label={`Click at ${label(c.t)}`}
              onPointerDown={(e) => dragClick(e, c)}
              className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 active:cursor-grabbing ${
                isSel("click", c.id) ? "border-white bg-amber-300 shadow-[0_0_0_3px_rgba(251,191,36,0.35)]" : "border-amber-200/70 bg-amber-400/80 hover:bg-amber-300"
              }`}
              style={{ left: pct(c.t) }}
            />
          ))}
        </div>

        <div className="relative mt-1 h-4 rounded bg-white/[0.02]">
          {p.typing.map((b) => (
            <button
              key={typingId(b)}
              type="button"
              aria-label="Typing"
              onPointerDown={(e) => {
                e.stopPropagation();
                p.onSelect({ kind: "typing", id: typingId(b) });
              }}
              className={`absolute top-0.5 h-3 rounded-sm ${isSel("typing", typingId(b)) ? "bg-teal-300 ring-1 ring-white" : "bg-teal-400/55 hover:bg-teal-400/80"}`}
              style={{ left: pct(b.startMs), width: `max(4px, ${pct(b.endMs - b.startMs)})` }}
            />
          ))}
        </div>

        <div className="pointer-events-none absolute bottom-0 top-[14px] w-0.5 -translate-x-1/2 rounded bg-white shadow-[0_0_6px_rgba(255,255,255,0.6)]" style={{ left: pct(p.timeMs) }} />
      </div>
    </div>
  );
}

export { typingId };
