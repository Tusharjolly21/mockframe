"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Clapperboard, Sparkles, X } from "lucide-react";

const SHOWN_KEY = "fk-next-steps-shown";

/**
 * Cross-sell at the moment of success: right after a user's export downloads,
 * offer the natural next steps (promo video / store pack). Shows once per
 * session, triggered by the `framekit:export-done` event from runExport.
 */
export function ExportNextSteps() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onDone = () => {
      try {
        if (sessionStorage.getItem(SHOWN_KEY)) return;
        sessionStorage.setItem(SHOWN_KEY, "1");
      } catch {
        /* storage unavailable — still show once for this mount */
      }
      // let the download/save dialog settle before appearing
      setTimeout(() => setOpen(true), 900);
    };
    window.addEventListener("framekit:export-done", onDone);
    return () => window.removeEventListener("framekit:export-done", onDone);
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setOpen(false), 14000);
    return () => clearTimeout(t);
  }, [open]);

  const ui = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="fk-card fixed bottom-20 left-1/2 z-[60] w-[min(460px,92vw)] -translate-x-1/2 rounded-2xl p-4"
        >
          <button onClick={() => setOpen(false)} title="Dismiss" className="fk-press absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-md text-[#9a9aa4] hover:bg-black/5 hover:text-[#17171c]">
            <X size={14} />
          </button>
          <p className="text-[13px] font-semibold text-[#17171c]">Nice export 🎉 — take it further?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => {
                setOpen(false);
                window.dispatchEvent(new CustomEvent("framekit:promo-open"));
              }}
              className="fk-press inline-flex items-center gap-1.5 rounded-lg bg-[#17171c] px-3 py-2 text-[12px] font-semibold text-white hover:bg-black"
            >
              <Clapperboard size={13} /> Turn it into a promo video
            </button>
            <a
              href="/app-store-screenshots"
              className="fk-press inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-2 text-[12px] font-semibold text-[#17171c] hover:bg-black/5"
            >
              <Sparkles size={13} /> Build your App Store pack <ArrowRight size={12} />
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof document !== "undefined" ? createPortal(ui, document.body) : null;
}
