"use client";

import { useEffect, useMemo, useState } from "react";
import { create } from "zustand";
import { AnimatePresence, motion } from "motion/react";
import { Shuffle, Wand2, X } from "lucide-react";
import { SceneRenderer } from "@framekit/renderer";
import type { MockupLayer, SceneDocument } from "@framekit/scene";
import { track } from "@/lib/analytics";
import { resolveAsset } from "@/lib/assets";
import { extractPalette } from "@/lib/palette";
import { canPrettify, prettyLooks, type Look } from "@/lib/prettify";
import { useSceneStore, useViewStore } from "@/lib/store";
import { toast } from "./Toolbar";

/** Tray state, shared by the pill and the tray (they sit in different rows). */
const useLooksUi = create<{ open: boolean; autoApply: boolean; setOpen: (open: boolean, autoApply?: boolean) => void }>((set) => ({
  open: false,
  autoApply: false,
  setOpen: (open, autoApply = false) => set({ open, autoApply }),
}));

/** Open the looks tray from elsewhere; `apply` puts the first look on right away. */
export function openLooks(apply = false) {
  useLooksUi.getState().setOpen(true, apply);
}

/** What a look changes, to tell which one (if any) the canvas shows. */
const lookSignature = (s: SceneDocument) =>
  JSON.stringify([s.canvas.background, s.layers.find((l): l is MockupLayer => l.type === "mockup")?.transform]);

const THUMB_W = 86;

function LookThumb({ look, active, onClick }: { look: Look; active: boolean; onClick: () => void }) {
  const { width, height } = look.scene.canvas;
  const s = THUMB_W / width;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`fk-tile group shrink-0 rounded-xl border bg-white p-1 text-left transition-colors ${
        active ? "border-[#17171c] shadow-[0_0_0_1.5px_#17171c]" : "border-[#ececf2] hover:border-[#17171c]"
      }`}
    >
      <div className="pointer-events-none overflow-hidden rounded-lg" style={{ width: THUMB_W, height: Math.round(height * s) }}>
        <div style={{ width, height, zoom: s }}>
          <SceneRenderer scene={look.scene} resolveAsset={resolveAsset} />
        </div>
      </div>
      <span className="block px-0.5 pb-0.5 pt-1 text-[11px] font-medium text-[#3b3b45]">{look.label}</span>
    </button>
  );
}

/** Row of finished looks for the current scene, above the bottom bar. */
export function LooksTray() {
  const { open, autoApply, setOpen } = useLooksUi();
  const scene = useSceneStore((s) => s.scene);
  const setScene = useSceneStore((s) => s.setScene);
  const select = useViewStore((s) => s.select);
  const setActiveLayout = useViewStore((s) => s.setActiveLayout);
  const [round, setRound] = useState(0);
  const [palette, setPalette] = useState<string[] | null>(null);

  const assetId = (scene.layers.find((l): l is MockupLayer => l.type === "mockup" && !!l.media))?.media?.assetId;
  useEffect(() => {
    if (!open || !assetId) return;
    const asset = resolveAsset(assetId);
    if (!asset) return setPalette([]);
    let alive = true;
    setPalette(null);
    extractPalette(asset.url)
      .then((p) => alive && setPalette(p))
      .catch(() => alive && setPalette([]));
    return () => {
      alive = false;
    };
  }, [open, assetId]);

  const looks = useMemo(() => (open && palette ? prettyLooks(scene, palette, round) : []), [open, palette, scene, round]);

  const apply = (look: Look, how: "click" | "auto") => {
    setScene(() => look.scene);
    setActiveLayout(null);
    select(null);
    track("pretty_applied", { look: look.id, round, how });
  };

  // a homepage drop asks for the first look straight away
  useEffect(() => {
    if (!autoApply || !looks.length) return;
    useLooksUi.setState({ autoApply: false });
    apply(looks[0], "auto");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoApply, looks]);

  // nothing left to style (screenshot removed): close
  useEffect(() => {
    if (open && !canPrettify(scene)) setOpen(false);
  }, [open, scene, setOpen]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  // the look on the canvas now, if any (survives Shuffle and undo)
  const current = lookSignature(scene);
  const activeId = looks.find((l) => lookSignature(l.scene) === current)?.id ?? null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          className="fk-card pointer-events-auto max-w-[min(820px,calc(100vw-680px))] rounded-2xl bg-white p-2.5"
          role="dialog"
          aria-label="Looks"
        >
          <div className="mb-2 flex items-center gap-2 px-1">
            <Wand2 size={14} className="text-violet-600" />
            <p className="flex-1 text-[12.5px] font-semibold text-[#17171c]">
              Pick a look in your screenshot&apos;s colours
            </p>
            <button
              type="button"
              onClick={() => {
                setRound((r) => r + 1);
                track("pretty_shuffled", { round: round + 1 });
              }}
              className="fk-press flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-medium text-[#3b3b45] hover:bg-black/5"
            >
              <Shuffle size={13} /> Shuffle
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close looks"
              className="fk-press grid h-7 w-7 place-items-center rounded-lg text-[#8a8a94] hover:bg-black/5 hover:text-[#17171c]"
            >
              <X size={14} />
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-0.5">
            {looks.length
              ? looks.map((look) => <LookThumb key={look.id} look={look} active={activeId === look.id} onClick={() => apply(look, "click")} />)
              : Array.from({ length: 6 }, (_, i) => <div key={i} className="h-[132px] w-[94px] shrink-0 animate-pulse rounded-xl bg-[#f1f1f5]" />)}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** The "Make it pretty" pill beside Animate. */
export function MakePrettyButton() {
  const open = useLooksUi((s) => s.open);
  const setOpen = useLooksUi((s) => s.setOpen);
  const ready = useSceneStore((s) => canPrettify(s.scene));
  return (
    <motion.button
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      onClick={() => {
        if (open) return setOpen(false);
        if (!ready) return toast("Add a screenshot first, then make it pretty");
        track("pretty_opened");
        setOpen(true);
      }}
      title="Make it pretty: finished looks in your screenshot's colours"
      aria-label="Make it pretty"
      // .fk-card's background beats utility classes, so the open state drops it
      className={`pointer-events-auto flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-[13px] min-[1360px]:px-5 font-semibold transition-colors ${
        open ? "border border-violet-600 bg-violet-600 text-white shadow-[0_0_12px_rgba(139,92,246,0.4)]" : "fk-card text-[#17171c]"
      }`}
    >
      <Wand2 size={15} className={open ? "text-white" : "text-violet-600"} />
      <span className="hidden min-[1360px]:inline">Make it pretty</span>
    </motion.button>
  );
}
