"use client";

import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Clapperboard, Copy, Download, FolderDown, Link2, SlidersHorizontal, Wand2 } from "lucide-react";
import { saveCurrentDraft } from "@/lib/drafts";
import { type EditorStep, useSceneStore, useViewStore } from "@/lib/store";

export const STEPS: { id: EditorStep; label: string; hint: string }[] = [
  { id: "content", label: "Content", hint: "Add your screen" },
  { id: "style", label: "Style", hint: "Background & look" },
  { id: "export", label: "Export", hint: "Download or share" },
];

/** True once the scene has something of the user's own in it. */
function useHasContent(): boolean {
  return useSceneStore((s) =>
    s.scene.layers.some((l) => (l.type === "mockup" && !!l.media) || l.type === "text" || l.type === "sticker")
  );
}

/** The guided-flow header that replaces the old Mockup/Frame tabs. */
export function StepNav() {
  const step = useViewStore((s) => s.step);
  const setStep = useViewStore((s) => s.setStep);
  const hasContent = useHasContent();
  const current = STEPS.findIndex((s) => s.id === step);

  return (
    <nav aria-label="Editor steps" className="mb-3">
      <ol className="relative grid grid-cols-3 gap-1 rounded-2xl bg-[#ececf2] p-1">
        {STEPS.map((s, i) => {
          const active = s.id === step;
          const done = !active && (i < current || (s.id === "content" && hasContent));
          return (
            <li key={s.id} className="relative">
              <button
                type="button"
                aria-current={active ? "step" : undefined}
                onClick={() => setStep(s.id)}
                className={`fk-press relative flex w-full items-center justify-center gap-1.5 rounded-xl px-1.5 py-2 text-[12px] font-semibold ${
                  active ? "text-[#17171c]" : "text-[#7d7d88] hover:text-[#3f3f48]"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="step-pill"
                    className="absolute inset-0 rounded-xl bg-white shadow-[0_1px_4px_rgba(20,20,40,0.12)]"
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  />
                )}
                <span
                  className={`relative grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                    done ? "bg-emerald-500 text-white" : active ? "bg-[#17171c] text-white" : "bg-[#d9d9e2] text-[#6b6b76]"
                  }`}
                >
                  {done ? <Check size={11} strokeWidth={3} /> : i + 1}
                </span>
                <span className="relative">{s.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 px-1 text-[11px] text-[#8a8a94]">
        Step {current + 1} of 3 · {STEPS[current].hint}
      </p>
    </nav>
  );
}

/** Back / Next pinned to the bottom of the step panel. */
export function StepFooter() {
  const step = useViewStore((s) => s.step);
  const setStep = useViewStore((s) => s.setStep);
  const hasContent = useHasContent();
  const i = STEPS.findIndex((s) => s.id === step);
  const prev = STEPS[i - 1];
  const next = STEPS[i + 1];
  if (!next && !prev) return null;
  // nudge the user onward once their first screen has landed
  const nudge = step === "content" && hasContent;

  return (
    <div className="sticky bottom-0 z-10 mt-auto flex items-center gap-2 border-t border-[#ececf2] bg-[var(--card)] px-3 pb-1 pt-3">
      {prev && (
        <button
          type="button"
          onClick={() => setStep(prev.id)}
          className="fk-press flex h-9 items-center gap-1 rounded-xl px-3 text-[12.5px] font-semibold text-[#5a5a66] hover:bg-[#17171c]/5"
        >
          <ArrowLeft size={14} /> Back
        </button>
      )}
      {next && (
        <button
          type="button"
          onClick={() => setStep(next.id)}
          className={`fk-press ml-auto flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#17171c] px-3 text-[12.5px] font-semibold text-white hover:bg-black ${
            nudge ? "fk-nudge" : ""
          }`}
        >
          Next: {next.label} <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}

/* The export step reuses the right panel's export pipeline (watermark, Pro
   gates, format/scale settings) instead of duplicating it: these buttons
   trigger the same controls by id/title. */
function clickControl(selector: string) {
  (document.querySelector(selector) as HTMLButtonElement | null)?.click();
}

export function ExportStep() {
  const scene = useSceneStore((s) => s.scene);
  const notify = (msg: string) => window.dispatchEvent(new CustomEvent("framekit:toast", { detail: msg }));

  return (
    <div className="px-3">
      <div className="rounded-2xl border border-[#e6e6ee] bg-gradient-to-b from-white to-[#f6f6fa] p-3.5">
        <p className="text-[14px] font-semibold tracking-[-0.01em] text-[#17171c]">Your mockup is ready</p>
        <p className="mt-0.5 text-[11.5px] leading-snug text-[#85858f]">
          {scene.canvas.width} × {scene.canvas.height} canvas. Pick a format and size in settings, then download.
        </p>
        <button
          type="button"
          onClick={() => clickControl("#editor-export")}
          className="fk-press mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#17171c] text-[13.5px] font-semibold text-white shadow-[0_6px_20px_rgba(23,23,28,0.25)] hover:bg-black"
        >
          <Download size={15} /> Download image
        </button>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => clickControl('[title="Copy to clipboard"]')}
            className="fk-press flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#e4e4ec] bg-white text-[12px] font-semibold text-[#31313a] hover:border-[#c9c9d4]"
          >
            <Copy size={13} /> Copy
          </button>
          <button
            type="button"
            onClick={() => clickControl('[title="Export settings"]')}
            className="fk-press flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[#e4e4ec] bg-white text-[12px] font-semibold text-[#31313a] hover:border-[#c9c9d4]"
          >
            <SlidersHorizontal size={13} /> Settings
          </button>
        </div>
      </div>

      <h3 className="mb-2 mt-5 px-1 text-[11px] font-semibold uppercase tracking-wider text-[#8a8a94]">More ways to use it</h3>
      <div className="flex flex-col gap-1.5">
        <ExportRow
          icon={<Clapperboard size={15} />}
          title="Animate as video"
          body="Turn this scene into an MP4 or GIF."
          onClick={() => window.dispatchEvent(new CustomEvent("framekit:animate-open"))}
        />
        <ExportRow
          icon={<Link2 size={15} />}
          title="Share a remix link"
          body="Anyone with the link can open and edit a copy."
          onClick={() => clickControl('[title^="Copy a remix link"]')}
        />
        <ExportRow
          icon={<FolderDown size={15} />}
          title="Save to drafts"
          body="Keep working on it later (⌘S)."
          onClick={() =>
            saveCurrentDraft(useSceneStore.getState().scene).then(
              (r) => notify(`Saved “${r.name}” to Drafts`),
              () => notify("Couldn't save draft — local storage unavailable")
            )
          }
        />
        <ExportRow
          icon={<Wand2 size={15} />}
          title="App promo video"
          badge="Pro"
          body="An animated ad built from your screenshots."
          onClick={() => window.dispatchEvent(new CustomEvent("framekit:promo-open"))}
        />
      </div>
    </div>
  );
}

function ExportRow({
  icon,
  title,
  body,
  badge,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fk-tile flex items-center gap-3 rounded-xl border border-[#ececf2] bg-white p-2.5 text-left hover:border-[#d6d6e0]"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f2f2f6] text-[#3f3f48]">{icon}</span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#17171c]">
          {title}
          {badge && <span className="rounded-full bg-[#ede9fe] px-1.5 py-px text-[9px] font-bold text-[#6d28d9]">{badge}</span>}
        </span>
        <span className="block truncate text-[11px] text-[#8a8a94]">{body}</span>
      </span>
    </button>
  );
}
