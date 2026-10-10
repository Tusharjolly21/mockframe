"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import { Baseline, Box, Move, Palette, RotateCcw, SlidersHorizontal, SmilePlus } from "lucide-react";
import { getDevice } from "@framekit/devices";
import type { MockupLayer } from "@framekit/scene";
import { backgroundToCss, noiseTile, overlayStyle, patternStyle, stageStyle } from "@framekit/renderer";
import { resolveAsset } from "@/lib/assets";
import { applyTheme, ALL_BUILTIN_THEMES, THEME_COLLECTIONS, loadSavedThemes, saveTheme, syncThemesFromServer, themeMatches, type StyleTheme } from "@/lib/themes";
import { sceneTemporal, useSceneStore, useViewStore } from "@/lib/store";
import { useDraftsUi } from "@/lib/drafts";
import { IconButton, Popover, SliderRow } from "./ui";
import { toast } from "./Toolbar";
import { AnnotatePopover } from "./AnnotatePopover";
import { StickerPopover } from "./StickerPopover";

/**
 * Bottom contextual toolbar (PostSpark's down navbar): Reset · Fill mode ·
 * Position (5×5 + zoom) · 3D transforms · Emoji stickers · Themes.
 */


type Pop = "fill" | "pos" | "threed" | "emoji" | "themes" | null;
type ExtendedPop = Pop | "annotate";

export function BottomBar() {
  const scene = useSceneStore((s) => s.scene);
  const resetScene = useSceneStore((s) => s.resetScene);
  const updateLayer = useSceneStore((s) => s.updateLayer);
  const { selectedIds, select, setActiveLayout } = useViewStore();

  const [openPop, setOpenPop] = useState<ExtendedPop>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openPop) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpenPop(null);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [openPop]);

  // keyboard shortcuts (E / T / A in EditorShell) open panels via this event —
  // pressing the same key again toggles the panel closed
  useEffect(() => {
    const onOpen = (e: Event) => {
      const panel = (e as CustomEvent<ExtendedPop>).detail;
      setOpenPop((cur) => (cur === panel ? null : panel));
    };
    window.addEventListener("framekit:open-panel", onOpen);
    return () => window.removeEventListener("framekit:open-panel", onOpen);
  }, []);

  const mockups = scene.layers.filter((l): l is MockupLayer => l.type === "mockup");
  const target =
    (selectedIds
      .map((id) => scene.layers.find((l) => l.id === id))
      .filter((l): l is MockupLayer => l?.type === "mockup")
      .at(-1)) ?? mockups[0];

  const zoomBase = useMemo(() => {
    if (!target) return 1;
    const device = target.deviceId ? getDevice(target.deviceId) : undefined;
    if (device) return (scene.canvas.height * 0.78) / device.frame.height;
    const asset = target.media ? resolveAsset(target.media.assetId) : undefined;
    return asset ? (scene.canvas.height * 0.78) / asset.height : target.transform.scale;
  }, [target, scene.canvas.height]);

  const patchTransform = (p: Partial<MockupLayer["transform"]>) => {
    if (!target) return;
    updateLayer(target.id, (l) => ({ ...l, transform: { ...l.transform, ...p } }));
  };
  const patchMedia = (p: Partial<NonNullable<MockupLayer["media"]>>) => {
    if (!target?.media) return;
    updateLayer(target.id, (l) =>
      l.type === "mockup" && l.media ? { ...l, media: { ...l.media, ...p } } : l
    );
  };

  // 5×5 position anchors in canvas-center coordinates (PostSpark's grid)
  const place = (col: number, row: number) =>
    patchTransform({
      x: Math.round(((col - 2) / 2) * scene.canvas.width * 0.32),
      y: Math.round(((row - 2) / 2) * scene.canvas.height * 0.3),
    });

  const toggle = (p: ExtendedPop) => setOpenPop(openPop === p ? null : p);

  return (
    <div ref={rootRef} className="fk-card pointer-events-auto relative flex items-center gap-0.5 rounded-2xl px-1.5 py-1">
      <IconButton
        title="Reset canvas"
        onClick={() => {
          resetScene();
          select(null);
          setActiveLayout(null);
          useDraftsUi.getState().setCurrent(null);
          sceneTemporal.getState().clear();
        }}
      >
        <RotateCcw size={15} />
      </IconButton>

      <IconButton title="Fill mode" onClick={() => toggle("fill")} active={openPop === "fill"}>
        <SlidersHorizontal size={15} />
      </IconButton>

      <IconButton title="Position" onClick={() => toggle("pos")} active={openPop === "pos"}>
        <Move size={15} />
      </IconButton>

      <IconButton title="3D transforms" onClick={() => toggle("threed")} active={openPop === "threed"}>
        <Box size={15} />
      </IconButton>

      <IconButton title="Add emoji sticker" onClick={() => toggle("emoji")} active={openPop === "emoji"}>
        <SmilePlus size={15} />
      </IconButton>

      <IconButton title="Annotate" onClick={() => toggle("annotate")} active={openPop === "annotate"}>
        <Baseline size={15} />
      </IconButton>

      <IconButton title="Themes" onClick={() => toggle("themes")} active={openPop === "themes"}>
        <Palette size={15} />
      </IconButton>

      <AnimatePresence>
        {/* ------------------------------ fill mode ------------------------------ */}
        {openPop === "fill" && (
          <Popover className="bottom-[calc(100%+10px)] left-1/2 w-56 -translate-x-1/2 p-3">
            <p className="mb-2 text-center text-[12px] font-bold text-[#17171c]">Fill Mode</p>
            {target?.media && target.deviceId ? (
              <>
                {(["contain", "cover", "fill"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => patchMedia({ fit: m, offsetX: 0, offsetY: 0, scale: 1 })}
                    className={`fk-press mb-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] font-medium capitalize ${
                      target.media?.fit === m ? "bg-[#17171c] text-white" : "text-[#17171c] hover:bg-black/5"
                    }`}
                  >
                    {target.media?.fit === m ? "✓" : <span className="w-3" />}
                    {m}
                  </button>
                ))}
                <div className="mt-2 flex items-center justify-between border-t border-[#ececf2] pt-2.5">
                  <span className="text-[12px] font-medium text-[#17171c]">Background Color</span>
                  <label className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-full border border-black/10" style={{ background: target.media.bg ?? "#000000" }}>
                    <input
                      type="color"
                      value={target.media.bg ?? "#000000"}
                      onChange={(e) => patchMedia({ bg: e.target.value })}
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                  </label>
                </div>
              </>
            ) : target?.media ? (
              <p className="py-2 text-center text-[11px] text-[#9a9aa4]">Fit modes apply to device mockups — a frameless screenshot has no screen to fit into.</p>
            ) : (
              <p className="py-2 text-center text-[11px] text-[#9a9aa4]">Add a screenshot to the device first.</p>
            )}
          </Popover>
        )}

        {/* ------------------------------ position ------------------------------- */}
        {openPop === "pos" && (
          <Popover className="bottom-[calc(100%+10px)] left-1/2 w-64 -translate-x-1/2 p-3">
            <p className="mb-2 text-center text-[12px] font-bold text-[#17171c]">Position</p>
            <div className="grid grid-cols-5 gap-1.5">
              {Array.from({ length: 25 }, (_, i) => {
                const row = Math.floor(i / 5);
                const col = i % 5;
                const active =
                  !!target &&
                  Math.abs(target.transform.x - Math.round(((col - 2) / 2) * scene.canvas.width * 0.32)) < 4 &&
                  Math.abs(target.transform.y - Math.round(((row - 2) / 2) * scene.canvas.height * 0.3)) < 4;
                return (
                  <button
                    key={i}
                    onClick={() => place(col, row)}
                    disabled={!target}
                    className={`fk-press grid aspect-square place-items-center rounded-full border disabled:opacity-30 ${
                      active ? "border-teal-600 bg-teal-600" : "border-[#ececf2] bg-[#f4f4f8] hover:border-[#c9c9d4]"
                    }`}
                  />
                );
              })}
            </div>
            {target && (
              <div className="mt-3 border-t border-[#ececf2] pt-2">
                <SliderRow
                  label="Zoom"
                  value={Math.round((target.transform.scale / zoomBase) * 100)}
                  min={25}
                  max={280}
                  format={(v) => `${Math.round(v)}%`}
                  onChange={(pct) => patchTransform({ scale: Math.round(zoomBase * pct * 10) / 1000 })}
                />
              </div>
            )}
          </Popover>
        )}

        {/* ---------------------------- 3D transforms ---------------------------- */}
        {openPop === "threed" && (
          <Popover className="bottom-[calc(100%+10px)] left-1/2 w-64 -translate-x-1/2 p-3">
            <p className="mb-2 text-center text-[12px] font-bold text-[#17171c]">3D Transforms</p>
            {target ? (
              <>
                <SliderRow label="Tilt X" value={target.transform.tiltX} min={-45} max={45} format={(v) => `${Math.round(v)}°`} onChange={(tiltX) => patchTransform({ tiltX })} />
                <SliderRow label="Tilt Y" value={target.transform.tiltY} min={-45} max={45} format={(v) => `${Math.round(v)}°`} onChange={(tiltY) => patchTransform({ tiltY })} />
                <SliderRow label="Rotate" value={target.transform.rotate} min={-180} max={180} format={(v) => `${Math.round(v)}°`} onChange={(rotate) => patchTransform({ rotate })} />
                <SliderRow label="Perspective" value={target.transform.perspective} min={400} max={2400} format={(v) => `${Math.round(v)}`} onChange={(perspective) => patchTransform({ perspective })} />
                <SliderRow
                  label="Zoom"
                  value={Math.round((target.transform.scale / zoomBase) * 100)}
                  min={25}
                  max={280}
                  format={(v) => `${Math.round(v)}%`}
                  onChange={(pct) => patchTransform({ scale: Math.round(zoomBase * pct * 10) / 1000 })}
                />
                <button
                  onClick={() => patchTransform({ tiltX: 0, tiltY: 0, rotate: 0, perspective: 1200 })}
                  className="fk-press mt-1 w-full rounded-lg border border-[#e4e4ec] bg-white py-1.5 text-[11px] font-semibold text-[#17171c] hover:border-[#17171c]"
                >
                  Reset transforms
                </button>
              </>
            ) : (
              <p className="py-2 text-center text-[11px] text-[#9a9aa4]">Add a device first.</p>
            )}
          </Popover>
        )}

        {/* -------------------------------- emoji -------------------------------- */}
        {openPop === "emoji" && <StickerPopover onClose={() => setOpenPop(null)} />}

        {/* ----------------------------- annotations ---------------------------- */}
        {openPop === "annotate" && <AnnotatePopover onClose={() => setOpenPop(null)} />}

        {/* ------------------------------- themes -------------------------------- */}
        {openPop === "themes" && <ThemesPopover onClose={() => setOpenPop(null)} />}
      </AnimatePresence>
    </div>
  );
}

/* Bottom-bar Themes popover: art-directed looks grouped into shelves, each card
   a live miniature of the real thing (base + pattern + cast light + grain). */
function ThemePreview({ theme, className }: { theme: StyleTheme; className?: string }) {
  const grain = theme.effects?.find((e) => e.type === "grain");
  const vignette = theme.effects?.find((e) => e.type === "vignette");
  const layer = (style: React.CSSProperties): React.CSSProperties => ({ ...style, position: "absolute", inset: 0, pointerEvents: "none" });
  return (
    <span className={`relative block overflow-hidden ${className ?? ""}`} style={backgroundToCss(theme.background) as React.CSSProperties}>
      {theme.backdrop?.pattern && <span style={layer(patternStyle(theme.backdrop.pattern))} />}
      {theme.backdrop?.portrait?.mode === "stage" && <span style={layer(stageStyle(theme.backdrop.portrait))} />}
      {theme.backdrop?.overlay && <span style={layer(overlayStyle(theme.backdrop.overlay))} />}
      {grain && <span style={layer({ backgroundImage: noiseTile(grain.seed, 0.22), opacity: grain.intensity * 0.55, mixBlendMode: "overlay" })} />}
      {vignette && <span style={layer({ background: `radial-gradient(120% 100% at 50% 40%, transparent 45%, ${vignette.color} 130%)`, opacity: vignette.intensity })} />}
    </span>
  );
}

function ThemesPopover({ onClose }: { onClose: () => void }) {
  const scene = useSceneStore((s) => s.scene);
  const setScene = useSceneStore((s) => s.setScene);
  const [saved, setSaved] = useState<StyleTheme[]>([]);
  useEffect(() => {
    setSaved(loadSavedThemes());
    syncThemesFromServer().then(setSaved);
  }, []);
  const setSavedThemes = () => setSaved(loadSavedThemes());

  const all = [...ALL_BUILTIN_THEMES, ...saved];
  const current = all.find((t) => themeMatches(scene, t));
  const shelves = [
    ...THEME_COLLECTIONS.map((c) => ({ ...c, themes: ALL_BUILTIN_THEMES.filter((t) => t.collection === c.id) })),
    ...(saved.length ? [{ id: "saved", label: "Yours", blurb: "Saved from the canvas", themes: saved }] : []),
  ].filter((c) => c.themes.length);

  const card = (t: StyleTheme) => (
    <button
      key={t.id}
      aria-pressed={current?.id === t.id}
      data-popover-autofocus={current?.id === t.id ? "true" : undefined}
      onClick={() => {
        setScene((s) => applyTheme(s, t));
        onClose();
      }}
      className={`fk-press group text-left`}
    >
      <ThemePreview
        theme={t}
        className={`h-[74px] rounded-xl border-2 transition-shadow ${current?.id === t.id ? "border-teal-500 shadow-[0_0_0_2px_rgba(20,184,166,0.25)]" : "border-black/5 group-hover:border-black/20"}`}
      />
      <span className="mt-1 block truncate px-0.5 text-[11px] font-semibold text-[#26262e]">{t.name}</span>
    </button>
  );

  return (
    <Popover onEscape={onClose} className="bottom-[calc(100%+10px)] right-0 max-h-[26rem] w-[21rem] overflow-y-auto p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[12px] font-bold text-[#17171c]">Themes</p>
        <button
          title="Save current styling as a theme"
          onClick={() => {
            const t = saveTheme(scene, `Theme ${saved.length + 1}`);
            setSavedThemes();
            toast(`Saved "${t.name}" ✓`);
          }}
          className="fk-press flex h-6 items-center gap-1 rounded-full border border-[#e4e4ec] px-2 text-[10.5px] font-semibold text-[#17171c] hover:border-[#17171c]"
        >
          + Save current
        </button>
      </div>
      {shelves.map((shelf) => (
        <section key={shelf.id} className="mb-3">
          <p className="mb-1.5 flex items-baseline gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-[#6b6b76]">
            {shelf.label} <span className="text-[10px] font-medium normal-case tracking-normal text-[#a0a0aa]">{shelf.blurb}</span>
          </p>
          <div className="grid grid-cols-3 gap-2">{shelf.themes.map(card)}</div>
        </section>
      ))}
      <p className="text-center text-[10px] text-[#9a9aa4]">Themes restyle the background, light and texture — your layers stay put.</p>
    </Popover>
  );
}
