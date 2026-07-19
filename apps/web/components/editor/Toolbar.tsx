"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence } from "motion/react";
import {
  ArrowDown,
  ArrowUp,
  Box,
  Clapperboard,
  Palette,
  Copy,
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
import { useDraftsUi } from "@/lib/drafts";
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

export function Toolbar() {
  const scene = useSceneStore((s) => s.scene);
  const setScene = useSceneStore((s) => s.setScene);
  const resetScene = useSceneStore((s) => s.resetScene);
  const select = useViewStore((s) => s.select);
  const setActiveLayout = useViewStore((s) => s.setActiveLayout);
  const bumpAssets = useViewStore((s) => s.bumpAssets);
  const threeD = useViewStore((s) => s.threeD);
  const setThreeD = useViewStore((s) => s.setThreeD);

  const [hist, setHist] = useState({ canUndo: false, canRedo: false });
  const [layersOpen, setLayersOpen] = useState(false);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [renderOpen, setRenderOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const brandRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<HTMLDivElement>(null);
  const draftsRef = useRef<HTMLDivElement>(null);
  const batchRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const read = () => {
      const t = sceneTemporal.getState();
      setHist({ canUndo: t.pastStates.length > 0, canRedo: t.futureStates.length > 0 });
    };
    read();
    return sceneTemporal.subscribe(read);
  }, []);

  useEffect(() => {
    if (!layersOpen && !draftsOpen && !batchOpen && !brandOpen) return;
    const onDown = (e: MouseEvent) => {
      if (layersOpen && !layersRef.current?.contains(e.target as Node)) setLayersOpen(false);
      if (draftsOpen && !draftsRef.current?.contains(e.target as Node)) setDraftsOpen(false);
      if (batchOpen && !batchRef.current?.contains(e.target as Node)) setBatchOpen(false);
      if (brandOpen && !brandRef.current?.contains(e.target as Node)) setBrandOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [layersOpen, draftsOpen, batchOpen, brandOpen]);

  return (
    <>
    <div className="fk-card pointer-events-auto flex items-center gap-1 rounded-2xl px-2 py-1.5">
      <IconButton title="Undo (⌘Z)" onClick={() => sceneTemporal.getState().undo()} disabled={!hist.canUndo}>
        <Undo2 size={16} />
      </IconButton>
      <IconButton title="Redo (⇧⌘Z)" onClick={() => sceneTemporal.getState().redo()} disabled={!hist.canRedo}>
        <Redo2 size={16} />
      </IconButton>

      <div className="mx-1 h-5 w-px bg-[#e4e4ec]" />

      <button
        onClick={() => {
          resetScene();
          select(null);
          setActiveLayout(null);
          useDraftsUi.getState().setCurrent(null); // fresh canvas, no longer "is" a draft
        }}
        className="fk-press flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold text-[#17171c] hover:bg-[#17171c]/6"
      >
        <RotateCcw size={13} />
        Start Over
      </button>

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

      <IconButton title="Realistic photo render (Pro)" onClick={() => setRenderOpen(true)}>
        <Sparkles size={16} />
      </IconButton>

      <IconButton title="Promo video — animated app ad (Pro)" onClick={() => window.dispatchEvent(new CustomEvent("framekit:promo-open"))}>
        <Clapperboard size={16} />
      </IconButton>

      <div className="relative" ref={batchRef}>
        <IconButton title="Shot batch — edit many images and export one ZIP" onClick={() => setBatchOpen((v) => !v)} active={batchOpen}>
          <PanelsTopLeft size={16} />
        </IconButton>
        <AnimatePresence>
          {batchOpen && (
            <Popover className="left-1/2 top-[calc(100%+10px)] -ml-44 p-0">
              <ShotBatchPanel onToast={toast} />
            </Popover>
          )}
        </AnimatePresence>
      </div>

      <div className="relative" ref={brandRef}>
        <IconButton title="Brand kit — colours & logo everywhere" onClick={() => setBrandOpen((v) => !v)} active={brandOpen}>
          <Palette size={16} />
        </IconButton>
        <AnimatePresence>
          {brandOpen && (
            <Popover className="left-1/2 top-[calc(100%+10px)] -ml-32 p-0">
              <BrandKitPanel onToast={toast} />
            </Popover>
          )}
        </AnimatePresence>
      </div>

      <div className="relative" ref={draftsRef}>
        <IconButton title="Drafts (⌘S saves)" onClick={() => setDraftsOpen((v) => !v)} active={draftsOpen}>
          <FolderOpen size={16} />
        </IconButton>
        <AnimatePresence>
          {draftsOpen && (
            <Popover className="left-1/2 top-[calc(100%+10px)] -ml-38 p-2">
              <DraftsPanel onClose={() => setDraftsOpen(false)} onToast={toast} />
            </Popover>
          )}
        </AnimatePresence>
      </div>

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
    </div>
    {renderOpen && <RealisticRenderPanel onClose={() => setRenderOpen(false)} onToast={toast} />}
    </>
  );
}

export function LogoChip() {
  return (
    <div className="fk-card pointer-events-auto flex items-center gap-1 rounded-2xl px-2.5 py-1.5">
      <Link href="/" aria-label="MockFrame home" className="flex items-center gap-2 pr-1">
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
        className="fk-press ml-0.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-[#6b6b76] hover:bg-black/[0.06] hover:text-[#17171c]"
      >
        Templates
      </Link>
      <Link
        href="/dashboard"
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
