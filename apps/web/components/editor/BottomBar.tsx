"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import { ArrowUpRight, Baseline, Box, EyeOff, Highlighter, Keyboard, ListOrdered, Move, Palette, RotateCcw, ScanEye, Search, SlidersHorizontal, SmilePlus } from "lucide-react";
import { getDevice } from "@framekit/devices";
import type { MockupLayer } from "@framekit/scene";
import { ingestGenerated, resolveAsset } from "@/lib/assets";
import { ICON_COLLECTIONS, ICON_PALETTES, ICON_VIEWBOX, iconBody, iconDataUrl, searchIcons, type IconPalette } from "@/lib/iconStickers";
import { addAnnotation, addEmoji, addIconSticker, type AnnotationStickerId } from "@/lib/sceneOps";
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
  { id: "annot-kbd", label: "Shortcut", icon: Keyboard, tint: "#17171c" },
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
        {openPop === "emoji" && <StickerLibrary onClose={() => setOpenPop(null)} />}

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

type LibraryItem = { glyph: string; label: string; kind?: "annotation" | "icon"; id?: AnnotationStickerId; icon?: string };

const ICON_TINTS = ["#17171c", "#ffffff", "#7c3aed", "#ff3b30", "#10b981", "#f59e0b", "#0ea5e9"];

/** relative luminance of a #rrggbb tint — light tints preview on a dark tile */
function tintLuma(hex: string): number {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return 0.5;
  const n = parseInt(hex.slice(1), 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}

const STICKER_GROUPS: Array<{ id: string; label: string; items: LibraryItem[] }> = [
  { id: "emoji", label: "Emoji", items: EMOJI.map((glyph) => ({ glyph, label: glyph })) },
  {
    id: "arrows",
    label: "Arrows",
    items: ["↗", "➜", "➤", "↪", "↻", "⇢", "↯", "➚", "⤴", "⤵", "⇆", "⬆", "⬇", "⬅", "➡", "↔", "↕", "➳", "➵", "➶"].map((glyph) => ({ glyph, label: `Arrow ${glyph}` })),
  },
  {
    id: "markup",
    label: "Markup",
    items: [
      { glyph: "↗", label: "Hand arrow", kind: "annotation", id: "annot-arrow" },
      { glyph: "1", label: "Step marker", kind: "annotation", id: "annot-step-1" },
      { glyph: "▰", label: "Highlight", kind: "annotation", id: "annot-highlight" },
      { glyph: "▮", label: "Redact", kind: "annotation", id: "annot-redact" },
      { glyph: "◌", label: "Blur patch", kind: "annotation", id: "annot-blur" },
      { glyph: "⌘K", label: "Shortcut", kind: "annotation", id: "annot-kbd" },
    ],
  },
  { id: "underlines", label: "Underlines", items: ["〰", "﹏", "⌁", "〽", "︴", "▱", "━━", "≋", "﹌", "⌇", "╱", "╲"].map((glyph) => ({ glyph, label: `Underline ${glyph}` })) },
  { id: "people", label: "People", items: ["👋", "🖐️", "👏", "🙌", "👍", "👎", "👌", "🤝", "✍️", "🙏", "💪", "🫶", "🧠", "👀", "🧑‍💻", "👨‍🎨"].map((glyph) => ({ glyph, label: glyph })) },
  { id: "nature", label: "Nature", items: ["🌿", "🍃", "🌱", "🌸", "🌻", "🌈", "☀️", "🌙", "⭐", "🔥", "❄️", "🌊", "☁️", "🍂", "🪴", "🌵"].map((glyph) => ({ glyph, label: glyph })) },
  { id: "food", label: "Food", items: ["🍎", "🍊", "🍋", "🍉", "🍇", "🍓", "🥑", "🍕", "🍔", "🍜", "🍩", "☕", "🍰", "🍪", "🥤", "🍣"].map((glyph) => ({ glyph, label: glyph })) },
  { id: "travel", label: "Travel", items: ["🌍", "🗺️", "🧭", "✈️", "🚗", "🚲", "🚀", "🏕️", "⛰️", "🏝️", "🏠", "📍", "🗽", "🎒", "🚢", "🚂"].map((glyph) => ({ glyph, label: glyph })) },
  { id: "objects", label: "Objects", items: ["👓", "🕶️", "🧥", "👕", "👖", "🧣", "🧤", "🎧", "📱", "💻", "⌚", "📷", "✏️", "📌", "🔑", "💡"].map((glyph) => ({ glyph, label: glyph })) },
  { id: "symbols", label: "Symbols", items: ["ⓘ", "ⓘ", "✓", "✕", "⚠️", "ⓘ", "♿", "🚻", "ⓘ", "⌘", "#️⃣", "©️", "®️", "™️", "∞", "✦"].map((glyph) => ({ glyph, label: glyph })) },
  { id: "activities", label: "Activities", items: ["🎉", "🎈", "🎁", "🎨", "🎵", "🎬", "🏆", "🥇", "🎯", "🎮", "🎸", "🎤", "🎊", "🎃", "🎄", "🎆"].map((glyph) => ({ glyph, label: glyph })) },
];

function StickerLibrary({ onClose }: { onClose: () => void }) {
  const [groupId, setGroupId] = useState("icons");
  const [query, setQuery] = useState("");
  const [tint, setTint] = useState("#17171c");
  const [paletteKey, setPaletteKey] = useState<keyof typeof ICON_PALETTES>("aurora");
  const setScene = useSceneStore((s) => s.setScene);
  const select = useViewStore((s) => s.select);
  const group = STICKER_GROUPS.find((item) => item.id === groupId) ?? STICKER_GROUPS[0];

  // Iconify (Solar) — the FULL catalog is browsable/searchable; the grid
  // windows itself (visibleCount grows as the user scrolls near the bottom)
  const PAGE = 120;
  const [visibleCount, setVisibleCount] = useState(PAGE);
  useEffect(() => setVisibleCount(PAGE), [groupId, query]);
  const palette: IconPalette = ICON_PALETTES[paletteKey];
  const collectionBases = groupId.startsWith("icon-")
    ? [...(ICON_COLLECTIONS[groupId.slice(5) as keyof typeof ICON_COLLECTIONS] ?? [])]
    : null;
  const iconBases = (groupId === "icons" || collectionBases || query.trim() ? searchIcons(query) : [])
    .filter((base) => !collectionBases || collectionBases.includes(base as never));
  const iconItems: LibraryItem[] = iconBases.slice(0, visibleCount).map((base) => ({
    kind: "icon" as const,
    icon: base,
    glyph: "",
    label: base.replaceAll("-", " "),
  }));
  const glyphItems = query.trim()
    ? STICKER_GROUPS.flatMap((item) => item.items.map((entry) => ({ ...entry, group: item.id }))).filter((item) => `${item.label} ${item.group}`.toLowerCase().includes(query.toLowerCase()))
    : groupId === "icons"
      ? []
      : group.items;
  const items = [...iconItems, ...glyphItems];
  const showTints = items.some((i) => i.kind === "icon");
  const moreIcons = iconBases.length - Math.min(visibleCount, iconBases.length);

  const insert = (item: LibraryItem) => {
    const scene = useSceneStore.getState().scene;
    let result: { scene: typeof scene; layerId: string };
    if (item.kind === "icon" && item.icon) {
      const url = iconDataUrl(item.icon, tint, palette);
      if (!url) return;
      const asset = ingestGenerated(`icon-${item.icon}`, url, 512, 512);
      useViewStore.getState().bumpAssets();
      result = addIconSticker(scene, asset.id);
    } else if (item.kind === "annotation" && item.id) {
      result = addAnnotation(scene, item.id);
    } else {
      result = addEmoji(scene, item.glyph);
    }
    setScene(() => result.scene);
    select(result.layerId);
  };

  return (
    <Popover className="!z-[200] bottom-[calc(100%+10px)] left-1/2 w-[360px] max-w-[calc(100vw-24px)] -translate-x-1/2 overflow-hidden p-0">
      <div className="border-b border-[#ececf2] px-3 pb-2.5 pt-3">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <p className="text-[13px] font-bold text-[#17171c]">Stickers</p>
            <p className="text-[10px] text-[#9a9aa4]">Add multiple elements without closing this panel</p>
          </div>
          <button title="Close stickers" onClick={onClose} className="fk-press rounded-lg px-2 py-1 text-lg leading-none text-[#8a8a94] hover:bg-black/5">×</button>
        </div>
        <label className="flex items-center gap-2 rounded-xl border border-[#e4e4ec] bg-[#f7f7fa] px-2.5 py-2">
          <Search size={15} className="text-[#8a8a94]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search stickers" className="min-w-0 flex-1 bg-transparent text-xs outline-none" />
        </label>
        <div className="panel-scroll mt-2 flex max-h-16 flex-wrap gap-1 overflow-y-auto pb-0.5">
          {[{ id: "icons", label: "Icons" }, { id: "icon-space", label: "Space" }, { id: "icon-nature", label: "Nature" }, { id: "icon-animals", label: "Animals" }, ...STICKER_GROUPS].map((item) => (
            <button key={item.id} onClick={() => { setGroupId(item.id); setQuery(""); }} className={`fk-press shrink-0 rounded-full px-2.5 py-1.5 text-[10.5px] font-semibold ${groupId === item.id && !query ? "bg-[#17171c] text-white" : "bg-[#f1f1f5] text-[#5a5a66] hover:bg-[#e8e8ee]"}`}>
              {item.label}
            </button>
          ))}
        </div>
        {showTints && (
          <div className="mt-2 flex items-center gap-1.5">
            {(Object.keys(ICON_PALETTES) as Array<keyof typeof ICON_PALETTES>).map((key) => (
              <button
                key={key}
                onClick={() => setPaletteKey(key)}
                title={`${key} palette`}
                className={`h-5 w-8 rounded-full border ${paletteKey === key ? "ring-2 ring-[#17171c] ring-offset-1" : "border-black/15"}`}
                style={{ background: `linear-gradient(135deg, ${ICON_PALETTES[key].join(", ")})` }}
              />
            ))}
            {ICON_TINTS.map((c) => (
              <button
                key={c}
                onClick={() => setTint(c)}
                title={c}
                className={`h-5 w-5 rounded-full border ${tint === c ? "ring-2 ring-[#17171c] ring-offset-1" : "border-black/15"}`}
                style={{ background: c }}
              />
            ))}
            <label className="relative h-5 w-5 cursor-pointer overflow-hidden rounded-full border border-black/15" style={{ background: ICON_TINTS.includes(tint) ? "conic-gradient(red,yellow,lime,cyan,blue,magenta,red)" : tint }} title="Custom color">
              <input type="color" value={tint} onChange={(e) => setTint(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
            </label>
          </div>
        )}
      </div>
      <div
        className="panel-scroll max-h-[400px] overflow-y-auto px-3 py-3"
        onScroll={(e) => {
          const el = e.currentTarget;
          if (moreIcons > 0 && el.scrollTop + el.clientHeight > el.scrollHeight - 320) {
            setVisibleCount((c) => c + PAGE);
          }
        }}
      >
        <div className="grid grid-cols-5 gap-1.5">
          {items.map((item, index) =>
            item.kind === "icon" && item.icon ? (
              <button
                key={`${item.label}-${index}`}
                title={item.label}
                onClick={() => insert(item)}
                className={`fk-press grid aspect-square place-items-center rounded-xl border transition-all hover:scale-105 hover:shadow-[0_4px_14px_rgba(20,20,40,0.12)] ${
                  tintLuma(tint) > 0.72
                    ? "border-transparent bg-[#17171c] hover:border-[#17171c]"
                    : "border-[#ececf2] bg-white hover:border-[#b9b9c6]"
                }`}
              >
                <svg
                  viewBox={ICON_VIEWBOX}
                  width={30}
                  height={30}
                  style={{ color: tint }}
                  aria-hidden
                  dangerouslySetInnerHTML={{ __html: iconBody(item.icon, palette) ?? "" }}
                />
              </button>
            ) : (
              <button
                key={`${item.label}-${index}`}
                title={item.label}
                onClick={() => insert(item)}
                className="fk-press grid aspect-square place-items-center rounded-xl border border-transparent bg-[#f7f7fa] text-[26px] leading-none hover:border-[#c9c9d4] hover:bg-white"
              >
                <span className={item.kind === "annotation" ? "font-semibold text-[#17171c]" : ""}>{item.glyph}</span>
              </button>
            )
          )}
        </div>
        {items.length === 0 && <p className="py-10 text-center text-xs text-[#9a9aa4]">No stickers found.</p>}
        {moreIcons > 0 && (
          <p className="pb-1 pt-3 text-center text-[10.5px] text-[#9a9aa4]">
            Scroll for {moreIcons.toLocaleString()} more icons…
          </p>
        )}
      </div>
    </Popover>
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

  // keyboard theme switching (user request): ↑/↓ moves focus, Enter applies,
  // Esc closes — focus starts on the active theme
  const [focusIdx, setFocusIdx] = useState(() => Math.max(0, all.findIndex((t) => t.id === current?.id)));
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches("input, textarea, select")) return;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        e.stopPropagation();
        setFocusIdx((i) => Math.min(all.length - 1, i + 1));
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        e.stopPropagation();
        setFocusIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        const t = all[focusIdx];
        if (t) {
          setScene((s) => applyTheme(s, t));
          onClose();
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    // capture phase so the editor's global nudge handler doesn't move layers
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [all, focusIdx, onClose, setScene]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    listRef.current?.children[focusIdx]?.scrollIntoView({ block: "nearest" });
  }, [focusIdx]);

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
      <div ref={listRef} className="flex flex-col gap-2">
        {all.map((t, i) => (
          <button
            key={t.id}
            onClick={() => {
              setScene((s) => applyTheme(s, t));
              onClose();
            }}
            onMouseEnter={() => setFocusIdx(i)}
            className={`fk-press flex h-14 items-end rounded-2xl border-2 px-3 pb-2 text-left text-[13px] font-semibold ${
              current?.id === t.id
                ? "border-teal-500 shadow-[0_0_0_2px_rgba(20,184,166,0.25)]"
                : focusIdx === i
                  ? "border-[#17171c] shadow-[0_0_0_2px_rgba(23,23,28,0.2)]"
                  : "border-black/5"
            }`}
            style={cardBg(t)}
          >
            <span style={{ color: isDark(t) ? "#ffffff" : "#26262e" }}>{t.name}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-center text-[10px] text-[#9a9aa4]">↑↓ to browse · Enter to apply · T to toggle</p>
    </Popover>
  );
}
