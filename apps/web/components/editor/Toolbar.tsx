"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence } from "motion/react";
import {
  ArrowDown,
  ArrowUp,
  Box,
  CloudCheck,
  CloudOff,
  Clapperboard,
  Palette,
  Copy,
  Ellipsis,
  Keyboard,
  FolderOpen,
  Image as ImageIcon,
  Layers,
  Maximize,
  PanelsTopLeft,
  Redo2,
  RotateCcw,
  Sparkles,
  Squircle,
  Trash2,
  Type,
  Undo2,
} from "lucide-react";
import { AccountButton } from "@/components/AccountButton";
import { BrandMark } from "@/components/marketing/BrandMark";
import { BrandKitPanel } from "./BrandKitPanel";
import { ingestFile, resolveAsset } from "@/lib/assets";
import { timeAgo, useDraftsUi } from "@/lib/drafts";
import { shareSceneShots } from "@/lib/myShots";
import { useShotBatchStore } from "@/lib/shotBatch";
import { addAppIcon, addText, duplicateLayer, removeLayer, reorderLayer } from "@/lib/sceneOps";
import { sceneTemporal, useSceneStore, useViewStore } from "@/lib/store";
import { DraftsPanel } from "./DraftsPanel";
import { ShotBatchPanel } from "./ShotBatchPanel";
import { RealisticRenderPanel } from "./RealisticRenderPanel";
import { IconButton, Popover } from "./ui";

/** Surface a message via EditorShell's toast (same event pattern as framekit:fit). */
export function toast(msg: string) {
  window.dispatchEvent(new CustomEvent("framekit:toast", { detail: msg }));
}

type MorePanel = null | "menu" | "drafts" | "brand" | "batch";

export function Toolbar() {
  const scene = useSceneStore((s) => s.scene);
  const setScene = useSceneStore((s) => s.setScene);
  const resetScene = useSceneStore((s) => s.resetScene);
  const select = useViewStore((s) => s.select);
  const setActiveLayout = useViewStore((s) => s.setActiveLayout);
  const setStep = useViewStore((s) => s.setStep);
  const bumpAssets = useViewStore((s) => s.bumpAssets);
  const threeD = useViewStore((s) => s.threeD);
  const setThreeD = useViewStore((s) => s.setThreeD);

  const [hist, setHist] = useState({ canUndo: false, canRedo: false });
  const [layersOpen, setLayersOpen] = useState(false);
  const [renderOpen, setRenderOpen] = useState(false);
  // secondary tools live behind one "More" button so the bar stays calm
  const [more, setMore] = useState<MorePanel>(null);
  const layersRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const read = () => {
      const t = sceneTemporal.getState();
      setHist({ canUndo: t.pastStates.length > 0, canRedo: t.futureStates.length > 0 });
    };
    read();
    return sceneTemporal.subscribe(read);
  }, []);

  // the filmstrip under the canvas opens the batch panel to export every shot
  useEffect(() => {
    const open = () => setMore("batch");
    window.addEventListener("framekit:open-batch", open);
    return () => window.removeEventListener("framekit:open-batch", open);
  }, []);

  useEffect(() => {
    if (!layersOpen && !more) return;
    const onDown = (e: MouseEvent) => {
      if (layersOpen && !layersRef.current?.contains(e.target as Node)) setLayersOpen(false);
      if (more && !moreRef.current?.contains(e.target as Node)) setMore(null);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [layersOpen, more]);

  const startOver = () => {
    resetScene();
    select(null);
    setActiveLayout(null);
    setStep("content");
    useDraftsUi.getState().setCurrent(null); // fresh canvas, no longer "is" a draft
  };

  const MENU: { icon: React.ReactNode; label: string; hint: string; pro?: boolean; run: () => void }[] = [
    { icon: <FolderOpen size={15} />, label: "Drafts", hint: "Your scenes save automatically", run: () => setMore("drafts") },
    { icon: <PanelsTopLeft size={15} />, label: "Shot batch", hint: "Style many images, export one ZIP", run: () => setMore("batch") },
    { icon: <Palette size={15} />, label: "Brand kit", hint: "Your colours and logo everywhere", run: () => setMore("brand") },
    { icon: <Sparkles size={15} />, label: "Realistic render", hint: "Photo-real device shots", pro: true, run: () => { setMore(null); setRenderOpen(true); } },
    { icon: <Clapperboard size={15} />, label: "Promo video", hint: "Animated app ad", pro: true, run: () => { setMore(null); window.dispatchEvent(new CustomEvent("framekit:promo-open")); } },
    { icon: <Clapperboard size={15} />, label: "Motion presets", hint: "Float, orbit, reveal → MP4 / GIF", run: () => { setMore(null); window.dispatchEvent(new CustomEvent("framekit:animate-open")); } },
    { icon: <Keyboard size={15} />, label: "Shortcuts", hint: "Align, distribute, copy/paste (?)", run: () => { setMore(null); window.dispatchEvent(new CustomEvent("framekit:shortcuts")); } },
    { icon: <RotateCcw size={15} />, label: "Start over", hint: "Clear the canvas", run: () => { setMore(null); startOver(); } },
  ];

  return (
    <>
    <div className="fk-card pointer-events-auto flex items-center gap-1 rounded-2xl px-2 py-1.5">
      <SaveStatus onOpen={() => setMore("drafts")} />
      <IconButton title="Undo (⌘Z)" onClick={() => sceneTemporal.getState().undo()} disabled={!hist.canUndo}>
        <Undo2 size={16} />
      </IconButton>
      <IconButton title="Redo (⇧⌘Z)" onClick={() => sceneTemporal.getState().redo()} disabled={!hist.canRedo}>
        <Redo2 size={16} />
      </IconButton>

      <div className="mx-1 h-5 w-px bg-[#e4e4ec]" />

      <IconButton
        title="Add text"
        onClick={() => {
          const r = addText(scene);
          setScene(() => r.scene);
          select(r.layerId);
        }}
      >
        <Type size={16} />
      </IconButton>

      <IconButton title="Add app icon (App Store / Play Store)" onClick={() => iconRef.current?.click()}>
        <Squircle size={16} />
      </IconButton>
      <input
        ref={iconRef}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const a = await ingestFile(f);
          bumpAssets();
          const r = addAppIcon(useSceneStore.getState().scene, a.id);
          setScene(() => r.scene);
          select(r.layerId);
          e.target.value = "";
        }}
      />

      <div className="relative" ref={layersRef}>
        <IconButton title="Layers" onClick={() => setLayersOpen((v) => !v)} active={layersOpen}>
          <Layers size={16} />
        </IconButton>
        <AnimatePresence>
          {layersOpen && (
            <Popover className="right-0 top-[calc(100%+10px)] w-64 p-2 -mr-14">
              <LayerRows onClose={() => setLayersOpen(false)} />
            </Popover>
          )}
        </AnimatePresence>
      </div>

      <IconButton title="Fit to view" onClick={() => window.dispatchEvent(new CustomEvent("framekit:fit"))}>
        <Maximize size={15} />
      </IconButton>

      <div className="mx-1 h-5 w-px bg-[#e4e4ec]" />

      <button
        onClick={() => setThreeD(!threeD)}
        title="3D rotate — drag a device on the canvas to tilt it in space"
        className={`fk-press flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold ${
          threeD ? "bg-[#17171c] text-white" : "text-[#17171c] hover:bg-[#17171c]/6"
        }`}
      >
        <Box size={14} />
        3D
      </button>

      <div className="relative" ref={moreRef}>
        <IconButton title="More tools" onClick={() => setMore((m) => (m ? null : "menu"))} active={!!more}>
          <Ellipsis size={16} />
        </IconButton>
        <AnimatePresence>
          {more === "menu" && (
            <Popover className="right-0 top-[calc(100%+10px)] w-64 p-1.5">
              {MENU.map((m) => (
                <button
                  key={m.label}
                  onClick={m.run}
                  className="fk-press flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left hover:bg-[#17171c]/5"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f2f2f6] text-[#3f3f48]">{m.icon}</span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#17171c]">
                      {m.label}
                      {m.pro && <span className="rounded-full bg-[#ede9fe] px-1.5 py-px text-[9px] font-bold text-[#6d28d9]">Pro</span>}
                    </span>
                    <span className="block truncate text-[11px] text-[#8a8a94]">{m.hint}</span>
                  </span>
                </button>
              ))}
            </Popover>
          )}
          {more === "drafts" && (
            <Popover className="right-0 top-[calc(100%+10px)] p-2">
              <DraftsPanel onClose={() => setMore(null)} onToast={toast} />
            </Popover>
          )}
          {more === "batch" && (
            <Popover className="right-0 top-[calc(100%+10px)] p-0">
              <ShotBatchPanel onToast={toast} />
            </Popover>
          )}
          {more === "brand" && (
            <Popover className="right-0 top-[calc(100%+10px)] p-0">
              <BrandKitPanel onToast={toast} />
            </Popover>
          )}
        </AnimatePresence>
      </div>
    </div>
    {renderOpen && <RealisticRenderPanel onClose={() => setRenderOpen(false)} onToast={toast} />}
    </>
  );
}

/** Quiet autosave indicator; appears once the canvas is a saved draft. */
function SaveStatus({ onOpen }: { onOpen: () => void }) {
  const { currentId, currentName, saveState, savedAt } = useDraftsUi();
  // re-render every half minute so "2m ago" in the tooltip stays honest
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);
  if (!currentId || saveState === "idle") return null;
  const failed = saveState === "error";
  const label = failed ? "Not saved" : saveState === "saving" ? "Saving…" : "Saved";
  const title = failed
    ? "Couldn't autosave — browser storage is unavailable. Export to keep your work."
    : `Autosaved to Drafts${currentName ? ` as “${currentName}”` : ""}${savedAt ? ` · ${timeAgo(savedAt)}` : ""}`;
  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        title={title}
        aria-live="polite"
        className={`fk-press flex h-9 items-center gap-1.5 rounded-xl px-2 text-[11.5px] font-medium ${
          failed ? "text-red-600 hover:bg-red-50" : "text-[#8a8a96] hover:bg-[#17171c]/6 hover:text-[#17171c]"
        }`}
      >
        {failed ? <CloudOff size={15} /> : <CloudCheck size={15} className={saveState === "saving" ? "animate-pulse" : undefined} />}
        <span className="w-[52px] text-left">{label}</span>
      </button>
      <div className="mx-0.5 h-5 w-px bg-[#e4e4ec]" />
    </>
  );
}

export function LogoChip() {
  return (
    <div className="fk-card pointer-events-auto flex items-center gap-1 rounded-2xl px-2.5 py-1.5">
      <Link href="/" target="_blank" rel="noopener" aria-label="MockFrame home (new tab)" className="flex items-center gap-2 pr-1">
        <BrandMark size={28} />
        <span className="text-[14px] font-bold tracking-tight text-[#17171c]">MockFrame</span>
      </Link>
      <button
        onClick={() => window.dispatchEvent(new CustomEvent("framekit:starter-open"))}
        className="fk-press ml-0.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-[#6b6b76] hover:bg-black/[0.06] hover:text-[#17171c]"
      >
        Create
      </button>
      <Link
        href="/templates"
        target="_blank"
        rel="noopener"
        // the gallery then previews every template with this scene's screenshots
        onClick={() => {
          const batch = useShotBatchStore.getState().shots.map((s) => s.scene);
          void shareSceneShots([useSceneStore.getState().scene, ...batch]);
        }}
        className="fk-press ml-0.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-[#6b6b76] hover:bg-black/[0.06] hover:text-[#17171c]"
      >
        Templates
      </Link>
      <Link
        href="/dashboard"
        target="_blank"
        rel="noopener"
        className="fk-press rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-[#6b6b76] hover:bg-black/[0.06] hover:text-[#17171c]"
      >
        My scenes
      </Link>
      <AccountButton />
    </div>
  );
}

function LayerRows({ onClose }: { onClose: () => void }) {
  const scene = useSceneStore((s) => s.scene);
  const setScene = useSceneStore((s) => s.setScene);
  const selectedIds = useViewStore((s) => s.selectedIds);
  const select = useViewStore((s) => s.select);
  const ordered = [...scene.layers].reverse();

  if (ordered.length === 0)
    return <p className="px-3 py-4 text-center text-xs text-[#9a9aa4]">No layers yet.</p>;

  return (
    <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
      {ordered.map((l) => {
        const label =
          l.type === "text"
            ? l.content.slice(0, 20) || "Text"
            : l.type === "mockup"
              ? (l.deviceId ?? "Screenshot")
              : "Sticker";
        const thumb = l.type === "mockup" && l.media ? resolveAsset(l.media.assetId)?.url : undefined;
        return (
          <div
            key={l.id}
            onClick={() => {
              select(l.id);
              onClose();
            }}
            className={`fk-press flex cursor-pointer items-center gap-2 rounded-xl border px-2 py-1.5 ${
              selectedIds.includes(l.id) ? "border-[#17171c] bg-[#f4f4f8]" : "border-transparent hover:bg-[#f4f4f8]"
            }`}
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-md bg-[#ececf2] text-[#8a8a94]">
              {thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb} alt="" className="h-full w-full object-cover" />
              ) : l.type === "text" ? (
                <Type size={12} />
              ) : (
                <ImageIcon size={12} />
              )}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-[#17171c]">{label}</span>
            <span className="flex shrink-0 text-[#9a9aa4]">
              {(
                [
                  ["Forward", ArrowUp, () => setScene((s) => reorderLayer(s, l.id, 1))],
                  ["Backward", ArrowDown, () => setScene((s) => reorderLayer(s, l.id, -1))],
                  ["Duplicate", Copy, () => setScene((s) => duplicateLayer(s, l.id))],
                  [
                    "Delete",
                    Trash2,
                    () => {
                      setScene((s) => removeLayer(s, l.id));
                      if (selectedIds.includes(l.id)) select(null);
                    },
                  ],
                ] as const
              ).map(([title, Icon, fn]) => (
                <button
                  key={title}
                  title={title}
                  className="fk-press rounded-md p-1 hover:bg-black/6 hover:text-[#17171c]"
                  onClick={(e) => {
                    e.stopPropagation();
                    fn();
                  }}
                >
                  <Icon size={12} />
                </button>
              ))}
            </span>
          </div>
        );
      })}
    </div>
  );
}
