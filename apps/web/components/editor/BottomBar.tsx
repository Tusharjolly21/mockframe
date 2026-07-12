"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import { ArrowUpRight, Baseline, Box, EyeOff, Highlighter, ListOrdered, Move, Palette, RotateCcw, ScanEye, SlidersHorizontal, SmilePlus } from "lucide-react";
import { getDevice } from "@framekit/devices";
import type { MockupLayer } from "@framekit/scene";
import { resolveAsset } from "@/lib/assets";
import { addAnnotation, addEmoji, type AnnotationStickerId } from "@/lib/sceneOps";
import { applyTheme, BUILTIN_THEMES, loadSavedThemes, saveTheme, syncThemesFromServer, themeMatches, type StyleTheme } from "@/lib/themes";
import { sceneTemporal, useSceneStore, useViewStore } from "@/lib/store";
import { useDraftsUi } from "@/lib/drafts";
import { IconButton, Popover, SliderRow } from "./ui";
import { toast } from "./Toolbar";

/**
 * Bottom contextual toolbar (PostSpark's down navbar): Reset · Fill mode ·
 * Position (5×5 + zoom) · 3D transforms · Emoji stickers · Themes.
 */

const EMOJI = ["🔥", "🚀", "✨", "⭐", "❤️", "😂", "👀", "🎉", "💯", "✅", "👍", "🙌", "💡", "⚡", "🏆", "📈", "🧠", "💜", "🫶", "😮", "🤯", "🥇", "🔔", "🎯"];

type Pop = "fill" | "pos" | "threed" | "emoji" | "themes" | null;
type ExtendedPop = Pop | "annotate";

const ANNOTATIONS: {
  id: AnnotationStickerId;
  label: string;
  icon: typeof ArrowUpRight;
  tint: string;
}[] = [
  { id: "annot-arrow", label: "Arrow", icon: ArrowUpRight, tint: "#ff3b30" },
  { id: "annot-step-1", label: "Step", icon: ListOrdered, tint: "#7c3aed" },
  { id: "annot-highlight", label: "Highlight", icon: Highlighter, tint: "#ffe066" },
  { id: "annot-redact", label: "Redact", icon: EyeOff, tint: "#111111" },
  { id: "annot-blur", label: "Blur", icon: ScanEye, tint: "#ffffff" },
];

export function BottomBar() {
  const scene = useSceneStore((s) => s.scene);
  const setScene = useSceneStore((s) => s.setScene);
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
        {openPop === "emoji" && (
          <Popover className="bottom-[calc(100%+10px)] left-1/2 w-56 -translate-x-1/2 p-2">
            <div className="grid grid-cols-6 gap-0.5">
              {EMOJI.map((e) => (
                <button
                  key={e}
                  onClick={() => {
                    const r = addEmoji(useSceneStore.getState().scene, e);
                    setScene(() => r.scene);
                    select(r.layerId);
                    setOpenPop(null);
                  }}
                  className="fk-press grid h-8 w-8 place-items-center rounded-lg text-[18px] hover:bg-black/5"
                >
                  {e}
                </button>
              ))}
            </div>
          </Popover>
        )}

        {/* ----------------------------- annotations ---------------------------- */}
        {openPop === "annotate" && (
          <Popover className="bottom-[calc(100%+10px)] left-1/2 w-64 -translate-x-1/2 p-3">
            <p className="mb-2 text-center text-[12px] font-bold text-[#17171c]">Annotate</p>
            <div className="grid grid-cols-2 gap-1.5">
              {ANNOTATIONS.map((a) => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.id}
                    onClick={() => {
                      const r = addAnnotation(useSceneStore.getState().scene, a.id);
                      setScene(() => r.scene);
                      select(r.layerId);
                      setOpenPop(null);
                    }}
                    className="fk-press flex items-center gap-2 rounded-xl border border-[#ececf2] bg-white px-2.5 py-2 text-left hover:border-[#c9c9d4]"
                  >
                    <span
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-black/10"
                      style={{ background: a.id === "annot-blur" ? "#f8fafc" : a.tint, color: a.id === "annot-highlight" || a.id === "annot-blur" ? "#17171c" : "#ffffff" }}
                    >
                      <Icon size={14} />
                    </span>
                    <span className="text-[12px] font-semibold text-[#17171c]">{a.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-center text-[10.5px] text-[#9a9aa4]">Drag, scale, rotate, then adjust color in the inspector.</p>
          </Popover>
        )}

        {/* ------------------------------- themes -------------------------------- */}
        {openPop === "themes" && <ThemesPopover onClose={() => setOpenPop(null)} />}
      </AnimatePresence>
    </div>
  );
}

/* PostSpark's bottom-bar Themes popover: theme cards on their own background,
   the active one ringed, plus a + card that saves the current styling. */
function ThemesPopover({ onClose }: { onClose: () => void }) {
  const scene = useSceneStore((s) => s.scene);
  const setScene = useSceneStore((s) => s.setScene);
  const [saved, setSaved] = useState<StyleTheme[]>([]);
  useEffect(() => {
    setSaved(loadSavedThemes());
    syncThemesFromServer().then(setSaved);
  }, []);
  const setSavedThemes = () => setSaved(loadSavedThemes());

  const all = [...BUILTIN_THEMES, ...saved];
  const current = all.find((t) => themeMatches(scene, t));

  const cardBg = (t: StyleTheme): React.CSSProperties => {
    const bg = t.background;
    if (bg.type === "solid") return { background: bg.color };
    if (bg.type === "linear-gradient")
      return { background: `linear-gradient(${bg.angle}deg, ${bg.stops.map((s) => `${s.color} ${s.at * 100}%`).join(", ")})` };
    if (bg.type === "radial-gradient")
      return { background: `radial-gradient(circle at ${bg.cx * 100}% ${bg.cy * 100}%, ${bg.stops.map((s) => `${s.color} ${s.at * 100}%`).join(", ")})` };
    return { background: "linear-gradient(135deg,#6d28d9,#0e7490)" };
  };
  const isDark = (t: StyleTheme) => {
    const bg = t.background;
    const hex = bg.type === "solid" ? bg.color : bg.type === "linear-gradient" || bg.type === "radial-gradient" ? bg.stops[bg.stops.length - 1].color : "#333333";
    const n = parseInt(hex.slice(1, 7), 16);
    const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
    return lum < 140;
  };

  return (
    <Popover className="bottom-[calc(100%+10px)] right-0 max-h-80 w-64 overflow-y-auto p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[12px] font-bold text-[#17171c]">Themes</p>
        <button
          title="Save current styling as a theme"
          onClick={() => {
            const t = saveTheme(scene, `Theme ${saved.length + 1}`);
            setSavedThemes();
            toast(`Saved "${t.name}" ✓`);
          }}
          className="fk-press grid h-6 w-6 place-items-center rounded-full border border-[#e4e4ec] text-[#17171c] hover:border-[#17171c]"
        >
          +
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {all.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setScene((s) => applyTheme(s, t));
              onClose();
            }}
            className={`fk-press flex h-14 items-end rounded-2xl border-2 px-3 pb-2 text-left text-[13px] font-semibold ${
              current?.id === t.id ? "border-teal-500 shadow-[0_0_0_2px_rgba(20,184,166,0.25)]" : "border-black/5"
            }`}
            style={cardBg(t)}
          >
            <span style={{ color: isDark(t) ? "#ffffff" : "#26262e" }}>{t.name}</span>
          </button>
        ))}
      </div>
    </Popover>
  );
}
