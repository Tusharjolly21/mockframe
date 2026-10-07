"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Play, Square } from "lucide-react";
import type { TextAnimationType, TextLayer } from "@framekit/scene";
import { useViewStore } from "@/lib/store";
import { Section, SliderRow } from "./ui";

const OPTIONS: { type: TextAnimationType | null; label: string; hint: string }[] = [
  { type: null, label: "None", hint: "Always shown" },
  { type: "fade-up", label: "Fade up", hint: "Rises into place" },
  { type: "blur-in", label: "Blur in", hint: "Comes into focus" },
  { type: "pop", label: "Pop", hint: "Springs in" },
  { type: "slide", label: "Slide", hint: "Glides in from the left" },
  { type: "typewriter", label: "Typewriter", hint: "Types out letter by letter" },
  { type: "words", label: "Words", hint: "One word at a time" },
  { type: "letters", label: "Letters", hint: "A cascade of letters" },
];

/** A natural duration per style; typing scales with the length of the text. */
function defaultDuration(type: TextAnimationType, content: string): number {
  const chars = Array.from(content).length;
  if (type === "typewriter") return Math.round(Math.min(3000, Math.max(600, chars * 45)) / 100) * 100;
  if (type === "letters") return Math.round(Math.min(2000, Math.max(800, chars * 30)) / 100) * 100;
  if (type === "words") return 1000;
  return 700;
}

let previewRaf = 0;

/** Play every text animation on the canvas once, then show the finished text again. */
export function previewTextAnimations(untilMs: number, onDone?: () => void): () => void {
  cancelAnimationFrame(previewRaf);
  const view = useViewStore.getState();
  const t0 = performance.now();
  const tick = (now: number) => {
    const t = now - t0;
    if (t >= untilMs) {
      view.setTextTime(null);
      onDone?.();
      return;
    }
    view.setTextTime(t);
    previewRaf = requestAnimationFrame(tick);
  };
  previewRaf = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(previewRaf);
    view.setTextTime(null);
    onDone?.();
  };
}

/** A tiny looping "Aa" that demonstrates each style on its chip. */
function Glyph({ type, active }: { type: TextAnimationType | null; active: boolean }) {
  const [p, setP] = useState(1);
  useEffect(() => {
    if (!active || !type) {
      setP(1);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      setP(Math.min(1, ((now - t0) % 1400) / 900));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, type]);
  const e = 1 - Math.pow(1 - p, 3);
  const style: CSSProperties =
    type === "fade-up"
      ? { opacity: e, transform: `translateY(${(1 - e) * 8}px)` }
      : type === "blur-in"
        ? { opacity: e, filter: `blur(${(1 - e) * 4}px)` }
        : type === "pop"
          ? { opacity: Math.min(1, p * 3), transform: `scale(${0.5 + 0.5 * (1 + 2.5 * Math.pow(p - 1, 3) + 1.5 * Math.pow(p - 1, 2))})` }
          : type === "slide"
            ? { opacity: e, transform: `translateX(${(e - 1) * 12}px)` }
            : {};
  const text = type === "typewriter" ? "Aa".slice(0, Math.round(p * 2)) : "Aa";
  return (
    <span className="flex h-5 items-center justify-center text-[15px] font-semibold leading-none text-[#17171c]">
      {type === "words" || type === "letters" ? (
        <>
          {["A", "a"].map((ch, i) => {
            const local = Math.min(1, Math.max(0, (p - i * 0.35) / 0.65));
            const le = 1 - Math.pow(1 - local, 3);
            return (
              <span key={i} style={{ display: "inline-block", opacity: le, transform: `translateY(${(1 - le) * 6}px)` }}>
                {ch}
              </span>
            );
          })}
        </>
      ) : (
        <span style={{ display: "inline-block", ...style }}>{text || " "}</span>
      )}
    </span>
  );
}

export function TextAnimationControls({ layer, onChange }: { layer: TextLayer; onChange: (animation: TextLayer["animation"]) => void }) {
  const anim = layer.animation;
  const [hover, setHover] = useState<TextAnimationType | null>(null);
  const [playing, setPlaying] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);

  // never leave the canvas mid-animation when the panel goes away
  useEffect(() => () => stopRef.current?.(), []);

  const play = (until: number) => {
    stopRef.current?.();
    setPlaying(true);
    stopRef.current = previewTextAnimations(until, () => {
      setPlaying(false);
      stopRef.current = null;
    });
  };
  const end = (a: NonNullable<TextLayer["animation"]>) => a.delayMs + a.durationMs + 600;

  const pick = (type: TextAnimationType | null) => {
    if (!type) {
      stopRef.current?.();
      onChange(undefined);
      return;
    }
    const next = { type, delayMs: anim?.delayMs ?? 200, durationMs: defaultDuration(type, layer.content) };
    onChange(next);
    play(end(next));
  };

  return (
    <Section
      title="Animate in"
      action={
        anim ? (
          <button
            type="button"
            onClick={() => (playing ? stopRef.current?.() : play(end(anim)))}
            className="fk-press inline-flex items-center gap-1 rounded-full bg-[#17171c] px-2.5 py-1 text-[10.5px] font-semibold text-white"
          >
            {playing ? <Square size={9} className="fill-white" /> : <Play size={9} className="fill-white" />}
            {playing ? "Stop" : "Preview"}
          </button>
        ) : undefined
      }
    >
      <div role="radiogroup" aria-label="Text animation" className="grid grid-cols-4 gap-1.5">
        {OPTIONS.map((o) => {
          const on = (anim?.type ?? null) === o.type;
          return (
            <button
              key={o.label}
              type="button"
              role="radio"
              aria-checked={on}
              title={o.hint}
              onMouseEnter={() => setHover(o.type)}
              onMouseLeave={() => setHover(null)}
              onClick={() => pick(o.type)}
              className={`fk-press flex flex-col items-center gap-1 rounded-xl border px-1 pb-1.5 pt-2 transition-colors ${
                on ? "border-[#17171c] bg-[#f4f4f7]" : "border-[#e4e4ec] bg-white hover:border-[#c9c9d4]"
              }`}
            >
              <Glyph type={o.type} active={hover === o.type || (on && playing)} />
              <span className="text-[10px] font-medium text-[#55555f]">{o.label}</span>
            </button>
          );
        })}
      </div>
      {anim && (
        <div className="mt-3">
          <SliderRow
            label="Delay"
            value={anim.delayMs / 1000}
            min={0}
            max={4}
            step={0.1}
            format={(v) => `${v.toFixed(1)}s`}
            onChange={(v) => onChange({ ...anim, delayMs: Math.round(v * 1000) })}
          />
          <SliderRow
            label="Duration"
            value={anim.durationMs / 1000}
            min={0.2}
            max={4}
            step={0.1}
            format={(v) => `${v.toFixed(1)}s`}
            onChange={(v) => onChange({ ...anim, durationMs: Math.round(v * 1000) })}
          />
          <p className="mt-1 text-[11px] leading-relaxed text-[#8b8b99]">
            Plays in video and GIF exports (Animate → Export). Images always show the finished text.
          </p>
        </div>
      )}
    </Section>
  );
}
