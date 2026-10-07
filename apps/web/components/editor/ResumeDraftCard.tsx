"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { History, Image as ImageIcon, X } from "lucide-react";
import { openDraftInEditor } from "@/lib/autosave";
import { latestSceneDraft, timeAgo, useDraftsUi, type DraftRecord } from "@/lib/drafts";
import { sceneTemporal, useSceneStore } from "@/lib/store";

const MAX_AGE = 14 * 24 * 60 * 60 * 1000;

/**
 * "Pick up where you left off" — offered when the editor opens on a fresh
 * canvas and an autosaved scene exists (closed tab, back from checkout, new
 * day). Disappears on its own as soon as the user starts something new.
 */
export function ResumeDraftCard({ deepLinked, embedded }: { deepLinked: boolean; embedded: boolean }) {
  const [draft, setDraft] = useState<DraftRecord | null>(null);

  useEffect(() => {
    if (deepLinked || embedded) return;
    let cancelled = false;
    const untouched = () => !useDraftsUi.getState().currentId && sceneTemporal.getState().pastStates.length === 0;
    latestSceneDraft().then(
      (rec) => {
        if (cancelled || !rec || Date.now() - rec.updatedAt > MAX_AGE || !untouched()) return;
        setDraft(rec);
      },
      () => {}
    );
    return () => {
      cancelled = true;
    };
  }, [deepLinked, embedded]);

  // any edit or draft switch means the user has moved on
  useEffect(() => {
    if (!draft) return;
    const hide = () => setDraft(null);
    const offScene = useSceneStore.subscribe((s, prev) => {
      if (s.scene !== prev.scene) hide();
    });
    const offUi = useDraftsUi.subscribe((s, prev) => {
      if (s.epoch !== prev.epoch) hide();
    });
    return () => {
      offScene();
      offUi();
    };
  }, [draft]);

  const open = () => {
    if (!draft) return;
    const ok = openDraftInEditor(draft);
    setDraft(null);
    window.dispatchEvent(
      new CustomEvent("framekit:toast", { detail: ok ? `Opened “${draft.name}”` : "That draft couldn't be opened — it may be from a newer version." })
    );
  };

  return (
    <AnimatePresence>
      {draft && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          role="dialog"
          aria-label="Continue your last scene"
          className="fk-card pointer-events-auto absolute left-1/2 top-[76px] z-[60] flex w-[min(440px,92vw)] -translate-x-1/2 items-center gap-3 rounded-2xl p-2 pr-2.5"
        >
          <button
            type="button"
            onClick={open}
            className="fk-press grid h-12 w-[68px] shrink-0 place-items-center overflow-hidden rounded-xl bg-[#ececf2] text-[#b0b0ba]"
            aria-label={`Open ${draft.name}`}
          >
            {draft.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={draft.thumbnail} alt="" className="h-full w-full object-cover" />
            ) : (
              <ImageIcon size={16} />
            )}
          </button>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[#17171c]">
              <History size={13} className="text-violet-600" /> Pick up where you left off
            </span>
            <span className="block truncate text-[11.5px] text-[#7b7b86]">
              {draft.name} · edited {timeAgo(draft.updatedAt)}
            </span>
          </span>
          <button
            type="button"
            onClick={open}
            className="fk-press shrink-0 rounded-xl bg-[#17171c] px-3.5 py-2 text-[12px] font-semibold text-white hover:bg-black"
          >
            Open
          </button>
          <button
            type="button"
            onClick={() => setDraft(null)}
            title="Start fresh"
            className="fk-press grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#9a9aa4] hover:bg-black/5 hover:text-[#17171c]"
          >
            <X size={15} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
