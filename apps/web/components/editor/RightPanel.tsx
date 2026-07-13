"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { getDevice } from "@framekit/devices";
import type { MockupLayer, SceneDocument } from "@framekit/scene";
import { Check, Copy, Dices, Link2, Loader2, RotateCcw, Settings2, Sparkles, Upload } from "lucide-react";
import { resolveAsset } from "@/lib/assets";
import { exportScene, type ExportFormat, type ExportQuality } from "@/lib/export";
import type { CodeDoc } from "@/lib/screens";
import { CODE_THEME_LABELS, CODE_THEMES } from "@/lib/screens/code";
import { applyTheme, BUILTIN_THEMES, deleteTheme, loadSavedThemes, saveTheme, syncThemesFromServer, themeMatches, type StyleTheme } from "@/lib/themes";
import { bulkExportZip, type BulkItem } from "@/lib/bulkExport";
import { applyVariation, VARIATIONS } from "@/lib/variations";
import { applyLayout, DEFAULT_MODS, LAYOUT_PRESETS, modifyPreset, type LayoutMods } from "@/lib/layouts";
import { useSceneStore, useViewStore } from "@/lib/store";
import { useEntitlementSync } from "@/lib/billing/client";
import { UpgradeModal } from "./UpgradeModal";
import { Popover, Seg, SliderRow } from "./ui";
import { toast } from "./Toolbar";
import { StaticScenePreview } from "./StaticScenePreview";

function ScenePreview({ scene, className }: { scene: SceneDocument; className?: string }) {
  return <StaticScenePreview scene={scene} className={`pointer-events-none w-full rounded-xl ${className ?? ""}`} />;
}

export function RightPanel() {
  const scene = useSceneStore((s) => s.scene);
  const setScene = useSceneStore((s) => s.setScene);
  const { selectedIds, activeLayoutId, setActiveLayout, select, layoutMods, setLayoutMods } = useViewStore();

  const [format, setFormat] = useState<ExportFormat>("png");
  const [scale, setScale] = useState(1);
  const [quality, setQuality] = useState<ExportQuality>("balanced");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [busy, setBusy] = useState<"export" | "copy" | "share" | null>(null);
  const [copied, setCopied] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!settingsOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!settingsRef.current?.contains(e.target as Node)) setSettingsOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [settingsOpen]);

  const mockups = scene.layers.filter((l): l is MockupLayer => l.type === "mockup");
  const arity = (Math.min(3, Math.max(1, mockups.length)) as 1 | 2 | 3) ?? 1;
  const hideLayouts = mockups.some((layer) => {
    const category = layer.deviceId ? getDevice(layer.deviceId)?.category : undefined;
    return category === "laptop" || category === "desktop";
  });
  const presets = LAYOUT_PRESETS.filter((p) => p.arity === arity);
  const selectedMockups = selectedIds
    .map((id) => scene.layers.find((l) => l.id === id))
    .filter((l): l is MockupLayer => l?.type === "mockup");

  const exportNode = () =>
    document.querySelector<HTMLElement>("#scene-canvas [data-scene-id]");

  const removeWatermark = useViewStore((s) => s.removeWatermark);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  useEntitlementSync();

  const runExport = async () => {
    const node = exportNode();
    if (!node) return;
    setBusy("export");
    await new Promise((r) => setTimeout(r, 30));
    try {
      await exportScene(node, scene, { format, scale, quality, watermark: !removeWatermark });
    } finally {
      setBusy(null);
    }
  };

  // rendered + watermarked PNG of the current scene (shared by copy + share-link)
  const renderPng = async (node: HTMLElement): Promise<Blob> => {
    const { toCanvas } = await import("html-to-image");
    const { applyWatermark } = await import("@/lib/watermark");
    const canvas = await toCanvas(node, {
      pixelRatio: 1,
      canvasWidth: scene.canvas.width,
      canvasHeight: scene.canvas.height,
    });
    applyWatermark(canvas, removeWatermark ? { tile: false, badge: false } : {});
    return new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("render failed"))), "image/png")
    );
  };

  const runShare = async () => {
    const node = exportNode();
    if (!node) return;
    setBusy("share");
    try {
      const png = await renderPng(node);
      const { firebaseFetch } = await import("@/lib/firebaseClient");
      const res = await firebaseFetch("/api/share", { method: "POST", body: png });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Could not create link");
      await navigator.clipboard.writeText(j.url);
      toast(`Share link copied — valid for ${j.expiresInDays} days 🔗`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not create link");
    } finally {
      setBusy(null);
    }
  };

  const runCopy = async () => {
    const node = exportNode();
    if (!node) return;
    setBusy("copy");
    try {
      const blob = renderPng(node);
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fk-card panel-scroll pointer-events-auto flex max-h-full w-[min(300px,46vw)] flex-col overflow-y-auto pb-4">
      {/* export header */}
      <div className="flex items-center gap-2 px-3 pt-3">
        <button
          onClick={runExport}
          disabled={!!busy}
          className="fk-press flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#17171c] px-3 py-2.5 text-[13px] font-semibold text-white hover:bg-black disabled:opacity-60"
        >
          <Upload size={14} />
          {busy === "export" ? "Exporting…" : "Export"}
          <span className="text-[11px] font-medium text-white/60">
            {Number.isInteger(scale) ? `${scale}x` : `${Math.round(Math.max(scene.canvas.width, scene.canvas.height) * scale)}px`} · {format.toUpperCase()}
          </span>
        </button>
        <button
          title="Copy to clipboard"
          onClick={runCopy}
          disabled={!!busy}
          className="fk-press grid h-10 w-10 place-items-center rounded-xl border border-[#e4e4ec] bg-white text-[#5a5a66] hover:border-[#c9c9d4]"
        >
          {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
        </button>
        <button
          title="Copy a shareable link (valid 7 days)"
          onClick={runShare}
          disabled={!!busy}
          className="fk-press grid h-10 w-10 place-items-center rounded-xl border border-[#e4e4ec] bg-white text-[#5a5a66] hover:border-[#c9c9d4]"
        >
          {busy === "share" ? <Loader2 size={15} className="animate-spin" /> : <Link2 size={15} />}
        </button>
        <div className="relative z-60" ref={settingsRef}>
          <button
            title="Export settings"
            onClick={() => setSettingsOpen((v) => !v)}
            className="fk-press grid h-10 w-10 place-items-center rounded-xl border border-[#e4e4ec] bg-white text-[#5a5a66] hover:border-[#c9c9d4]"
          >
            <Settings2 size={15} />
          </button>
          <AnimatePresence>
            {settingsOpen && (
              <Popover className="right-0 top-[calc(100%+8px)] w-52 p-3" >
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#9a9aa4]">Format</p>
                <Seg
                  id="fmt"
                  options={[
                    { value: "png", label: "PNG" },
                    { value: "jpeg", label: "JPG" },
                    { value: "webp", label: "WebP" },
                  ]}
                  value={format}
                  onChange={setFormat}
                />
                {format !== "png" && (
                  <>
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#9a9aa4]">Quality</p>
                    <Seg
                      id="qlt"
                      options={[
                        { value: "best", label: "Best" },
                        { value: "balanced", label: "Balanced" },
                        { value: "compact", label: "Compact" },
                      ]}
                      value={quality}
                      onChange={setQuality}
                    />
                  </>
                )}
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#9a9aa4]">Size</p>
                <Seg
                  id="scl"
                  options={[
                    { value: "1", label: "1×" },
                    { value: "2", label: "2×" },
                    { value: "3", label: "3×" },
                  ]}
                  value={String(scale) as "1" | "2" | "3"}
                  onChange={(v) => setScale(Number(v))}
                />
                {/* named targets (PostSpark-style HD/4K/6K): scale derived from
                    the canvas long edge, so every canvas hits the exact target */}
                <div className="mb-2 grid grid-cols-3 gap-1">
                  {([["HD", 1920], ["4K", 3840], ["6K", 5760]] as const).map(([label, target]) => {
                    const longEdge = Math.max(scene.canvas.width, scene.canvas.height);
                    const s = Math.round((target / longEdge) * 1000) / 1000;
                    const active = Math.abs(scale - s) < 0.002;
                    return (
                      <button
                        key={label}
                        onClick={() => setScale(s)}
                        className={`fk-press rounded-lg border py-1.5 text-[11px] font-semibold ${
                          active ? "border-[#17171c] bg-[#17171c] text-white" : "border-[#e4e4ec] bg-white text-[#5a5a66] hover:border-[#c9c9d4]"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10.5px] tabular-nums text-[#9a9aa4]">
                  {Math.round(scene.canvas.width * scale)} × {Math.round(scene.canvas.height * scale)} px
                </p>
              </Popover>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* free-tier watermark — removing it is the Pro upgrade */}
      <div className="px-3 pt-2">
        {removeWatermark ? (
          <div className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#c9ecd4] bg-[#effaf2] py-1.5 text-[11px] font-semibold text-[#1a7f3c]">
            <Sparkles size={12} /> Pro — exports are watermark-free
          </div>
        ) : (
          <button
            onClick={() => setUpgradeOpen(true)}
            className="fk-press flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#e4c34d] bg-[#fdf7de] py-1.5 text-[11px] font-semibold text-[#8a6d12] hover:border-[#d4a72c]"
          >
            <Sparkles size={12} /> Remove watermark
          </button>
        )}
      </div>
      {upgradeOpen && <UpgradeModal onClose={() => setUpgradeOpen(false)} />}

      {!hideLayouts && <>
      {/* mockup count */}
      <div className="px-3 pt-3">
        <Seg
          id="count"
          options={[
            { value: "1", label: <CountGlyph n={1} /> },
            { value: "2", label: <CountGlyph n={2} /> },
            { value: "3", label: <CountGlyph n={3} /> },
          ]}
          value={String(arity) as "1" | "2" | "3"}
          onChange={(v) => {
            const preset = LAYOUT_PRESETS.find((p) => p.arity === Number(v));
            if (!preset) return;
            setScene((s) => applyLayout(s, preset));
            setActiveLayout(preset.id);
            select(null);
          }}
        />
      </div>

      {/* all composition choices live on the right; canvas stays unobstructed */}
      <div className="px-3 pt-1">
        <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#8a8a94]">
          Quick layouts
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {VARIATIONS.map((variation) => {
            const previewScene = applyVariation(scene, variation);
            return (
              <button
                key={variation.id}
                onClick={() => {
                  setScene((current) => applyVariation(current, variation));
                  setActiveLayout(variation.presetId);
                  select(null);
                }}
                className="fk-press overflow-hidden rounded-lg border border-[#e4e4ec] bg-white p-1 text-left hover:border-[#17171c]"
                title={variation.label}
              >
                <ScenePreview scene={previewScene} />
                <span className="block truncate px-1 pt-1 text-[10px] font-semibold text-[#5a5a66]">{variation.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-3 pt-4">
        <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#8a8a94]">
          Layout presets
        </h3>
      </div>

      <div className="px-3 pt-1">
        <div className="flex flex-col gap-3">
          {presets.map((p) => {
            const previewScene = applyLayout(scene, p);
            const active = activeLayoutId === p.id;
            return (
              <motion.button
                key={p.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                onClick={() => {
                  setScene((s) => applyLayout(s, p));
                  setActiveLayout(p.id);
                }}
                className={`cursor-pointer rounded-2xl border-2 p-1 ${
                  active ? "border-[#17171c]" : "border-transparent hover:border-[#c9c9d4]"
                }`}
                title={p.label}
              >
                <ScenePreview scene={previewScene} />
              </motion.button>
            );
          })}
        </div>

        {selectedMockups.length > 0 ? (
          <SelectionCustomize key={selectedMockups.map((l) => l.id).join(",")} layers={selectedMockups} />
        ) : (
        <CustomizeLayout
          activeLayoutId={activeLayoutId}
          mods={layoutMods}
          onMods={(mods) => {
            setLayoutMods(mods);
            const preset = LAYOUT_PRESETS.find((p) => p.id === activeLayoutId);
            if (preset) setScene((s) => applyLayout(s, modifyPreset(preset, mods)));
          }}
          onRandomize={() => {
            const pool = LAYOUT_PRESETS.filter((p) => p.arity === arity);
            const preset = pool[Math.floor(Math.random() * pool.length)];
            const mods: LayoutMods = {
              spread: Math.round((0.85 + Math.random() * 0.45) * 100) / 100,
              angle: Math.round((Math.random() - 0.5) * 22),
              tilt: Math.round((Math.random() - 0.5) * 26),
              scale: Math.round((0.88 + Math.random() * 0.3) * 100) / 100,
            };
            setScene((s) => applyLayout(s, modifyPreset(preset, mods)));
            setActiveLayout(preset.id);
            setLayoutMods(mods);
          }}
        />
        )}
      </div>
      </>}
    </div>
  );
}

/* --------------------------- selection customization -------------------------- */
/* When device(s) are selected, the sliders edit only those layers. */

function baseScaleFor(layer: MockupLayer, canvasHeight: number): number {
  const device = layer.deviceId ? getDevice(layer.deviceId) : undefined;
  if (device) return (canvasHeight * 0.78) / device.frame.height;
  const asset = layer.media ? resolveAsset(layer.media.assetId) : undefined;
  return asset ? (canvasHeight * 0.78) / asset.height : layer.transform.scale || 1;
}

function SelectionCustomize({ layers }: { layers: MockupLayer[] }) {
  const scene = useSceneStore((s) => s.scene);
  const setScene = useSceneStore((s) => s.setScene);
  // spread baseline: positions captured when this selection was made
  const baseRef = useRef<Record<string, { x: number; y: number }>>(
    Object.fromEntries(layers.map((l) => [l.id, { x: l.transform.x, y: l.transform.y }]))
  );
  const [spread, setSpread] = useState(100);

  const ids = layers.map((l) => l.id);
  const first = layers[0];
  const setAll = (patch: (l: MockupLayer) => Partial<MockupLayer["transform"]>) =>
    setScene((s) => ({
      ...s,
      layers: s.layers.map((l) =>
        ids.includes(l.id) && l.type === "mockup"
          ? { ...l, transform: { ...l.transform, ...patch(l) } }
          : l
      ),
    }));

  return (
    <div className="mt-4 border-t border-[#ececf2] pt-3 pb-2">
      <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#8a8a94]">
        Customize · {layers.length} selected
      </h3>
      <SliderRow
        label="Spread"
        value={spread}
        min={20}
        max={250}
        format={(v) => `${Math.round(v)}%`}
        onChange={(v) => {
          setSpread(v);
          setAll((l) => {
            const b = baseRef.current[l.id];
            return b ? { x: Math.round((b.x * v) / 100), y: Math.round((b.y * v) / 100) } : {};
          });
        }}
      />
      <SliderRow
        label="Angle"
        value={first.transform.rotate}
        min={-180}
        max={180}
        format={(v) => `${Math.round(v)}°`}
        onChange={(rotate) => setAll(() => ({ rotate }))}
      />
      <SliderRow
        label="Tilt"
        value={first.transform.tiltY}
        min={-45}
        max={45}
        format={(v) => `${Math.round(v)}°`}
        onChange={(tiltY) => setAll(() => ({ tiltY }))}
      />
      <SliderRow
        label="Size"
        value={Math.round((first.transform.scale / baseScaleFor(first, scene.canvas.height)) * 100)}
        min={25}
        max={280}
        format={(v) => `${Math.round(v)}%`}
        onChange={(pct) =>
          setAll((l) => ({
            scale: Math.round(baseScaleFor(l, scene.canvas.height) * pct * 10) / 1000,
          }))
        }
      />
      <p className="text-[10.5px] text-[#9a9aa4]">Editing only the selected device{layers.length > 1 ? "s" : ""} — ⇧click to add more.</p>
    </div>
  );
}

/* ---------------------------- layout customization --------------------------- */
/* Modifiers re-apply the active preset with tweaked slots; the document only
   ever stores plain transforms, so everything stays hand-editable. */

function CustomizeLayout({
  activeLayoutId,
  mods,
  onMods,
  onRandomize,
}: {
  activeLayoutId: string | null;
  mods: LayoutMods;
  onMods: (m: LayoutMods) => void;
  onRandomize: () => void;
}) {
  const dirty =
    mods.spread !== 1 || mods.angle !== 0 || mods.tilt !== 0 || mods.scale !== 1;
  return (
    <div className="mt-4 border-t border-[#ececf2] pt-3 pb-2">
      <h3 className="mb-2.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[#8a8a94]">
        Customize
        <span className="flex gap-1">
          {dirty && (
            <button
              title="Reset customization"
              onClick={() => onMods({ ...DEFAULT_MODS })}
              className="fk-press grid h-6 w-6 place-items-center rounded-md text-[#9a9aa4] hover:bg-black/6 hover:text-[#17171c]"
            >
              <RotateCcw size={12} />
            </button>
          )}
          <button
            title="Randomize layout"
            onClick={onRandomize}
            className="fk-press grid h-6 w-6 place-items-center rounded-md text-[#9a9aa4] hover:bg-black/6 hover:text-[#17171c]"
          >
            <Dices size={13} />
          </button>
        </span>
      </h3>
      {activeLayoutId ? (
        <>
          <SliderRow
            label="Spread"
            value={mods.spread}
            min={0.4}
            max={2}
            step={0.01}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(spread) => onMods({ ...mods, spread })}
          />
          <SliderRow
            label="Angle"
            value={mods.angle}
            min={-30}
            max={30}
            format={(v) => `${Math.round(v)}°`}
            onChange={(angle) => onMods({ ...mods, angle })}
          />
          <SliderRow
            label="Tilt"
            value={mods.tilt}
            min={-30}
            max={30}
            format={(v) => `${Math.round(v)}°`}
            onChange={(tilt) => onMods({ ...mods, tilt })}
          />
          <SliderRow
            label="Size"
            value={mods.scale}
            min={0.5}
            max={1.6}
            step={0.01}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(scale) => onMods({ ...mods, scale })}
          />
        </>
      ) : (
        <p className="pb-1 text-[11px] text-[#9a9aa4]">
          Pick a layout preset to unlock spread, angle, tilt and size — or hit the dice.
        </p>
      )}
    </div>
  );
}

/* -------------------------------- 3D presets --------------------------------- */
/* Mockly-style one-click perspective angles — write straight to the layer's
   existing tiltX/tiltY/rotate (the 3D engine already exists). A mini CSS-3D
   card previews each angle so the pick is visual, not numeric. */

interface Angle {
  id: string;
  label: string;
  tiltX: number;
  tiltY: number;
  rotate: number;
}

const THREE_D_ANGLES: Angle[] = [
  { id: "flat", label: "Flat", tiltX: 0, tiltY: 0, rotate: 0 },
  { id: "left", label: "Left", tiltX: 6, tiltY: 24, rotate: 0 },
  { id: "right", label: "Right", tiltX: 6, tiltY: -24, rotate: 0 },
  { id: "back", label: "Back", tiltX: 22, tiltY: 0, rotate: 0 },
  { id: "iso", label: "Iso", tiltX: 18, tiltY: 22, rotate: -6 },
  { id: "iso-r", label: "Iso R", tiltX: 18, tiltY: -22, rotate: 6 },
  { id: "hero", label: "Hero", tiltX: 12, tiltY: -16, rotate: -4 },
  { id: "lay", label: "Lay", tiltX: 40, tiltY: 0, rotate: 0 },
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ThreeDPresets({ active, onPick }: { active: { tiltX: number; tiltY: number; rotate: number }; onPick: (a: Angle) => void }) {
  const isActive = (a: Angle) =>
    Math.abs(active.tiltX - a.tiltX) < 1 && Math.abs(active.tiltY - a.tiltY) < 1 && Math.abs(active.rotate - a.rotate) < 1;
  return (
    <div className="mb-3">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[#9a9aa4]">3D angle</span>
      <div className="grid grid-cols-4 gap-1.5">
        {THREE_D_ANGLES.map((a) => {
          const on = isActive(a);
          return (
            <button
              key={a.id}
              title={a.label}
              onClick={() => onPick(a)}
              className={`fk-press grid aspect-square place-items-center rounded-lg border ${
                on ? "border-[#17171c] bg-[#f4f4f8]" : "border-[#e8e8ef] bg-white hover:border-[#c9c9d4]"
              }`}
              style={{ perspective: "120px" }}
            >
              <span
                className="block h-6 w-4 rounded-[3px] bg-gradient-to-br from-violet-500 to-cyan-400 shadow-sm"
                style={{
                  transform: `rotateX(${a.tiltX}deg) rotateY(${a.tiltY}deg) rotateZ(${a.rotate}deg)`,
                  transformStyle: "preserve-3d",
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------- bulk export --------------------------------
   Pick any set of scene variations; each renders offscreen and everything
   downloads as ONE .zip (PostSpark exports one-by-one — this is nicer). */

// Legacy variation pack kept for future use. The active product workflow is
// Shot batch, where every exported image is an independently edited scene.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function BulkExportDialog({ scene, onClose }: { scene: SceneDocument; onClose: () => void }) {
  const [checked, setChecked] = useState<Set<string>>(new Set(["current"]));
  const [scale, setScale] = useState(1);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const removeWatermark = useViewStore((s) => s.removeWatermark);

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const run = async () => {
    const items: BulkItem[] = [];
    if (checked.has("current")) items.push({ name: "scene", scene });
    for (const v of VARIATIONS) {
      if (checked.has(v.id)) items.push({ name: v.id.replace(/^v-/, ""), scene: applyVariation(scene, v) });
    }
    if (!items.length) return;
    setProgress({ done: 0, total: items.length });
    try {
      await bulkExportZip(items, {
        scale,
        watermark: !removeWatermark,
        onProgress: (done, total) => setProgress({ done, total }),
      });
      toast(`Exported ${items.length} image${items.length > 1 ? "s" : ""} → .zip ✓`);
      onClose();
    } finally {
      setProgress(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !progress) onClose();
      }}
    >
      <div className="flex max-h-[86vh] w-[min(420px,94vw)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-[#ececf2] px-4 py-3">
          <h3 className="text-sm font-bold text-[#17171c]">Bulk export</h3>
          <p className="mt-0.5 text-[11px] text-[#9a9aa4]">Pick the shots to include — everything downloads as one .zip.</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-black/4">
            <input type="checkbox" checked={checked.has("current")} onChange={() => toggle("current")} className="h-4 w-4 accent-[#17171c]" />
            <span className="text-[12.5px] font-semibold text-[#17171c]">Current scene</span>
          </label>
          <p className="mt-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-[#9a9aa4]">Variations</p>
          {VARIATIONS.map((v) => (
            <label key={v.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-black/4">
              <input type="checkbox" checked={checked.has(v.id)} onChange={() => toggle(v.id)} className="h-4 w-4 accent-[#17171c]" />
              <span className="text-[12.5px] font-medium text-[#17171c]">{v.label}</span>
            </label>
          ))}
          <div className="mt-3 px-2">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#9a9aa4]">Size</p>
            <Seg
              id="bulk-scale"
              options={[
                { value: "1", label: "1×" },
                { value: "2", label: "2×" },
                { value: "3", label: "3×" },
              ]}
              value={String(scale) as "1" | "2" | "3"}
              onChange={(v) => setScale(Number(v))}
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-[#ececf2] px-4 py-3">
          <span className="text-[11px] tabular-nums text-[#9a9aa4]">
            {progress ? `Rendering ${progress.done}/${progress.total}…` : `${checked.size} selected`}
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} disabled={!!progress} className="fk-press rounded-xl border border-[#e4e4ec] bg-white px-3.5 py-2 text-[12.5px] font-semibold text-[#17171c] disabled:opacity-50">
              Cancel
            </button>
            <button onClick={run} disabled={!!progress || checked.size === 0} className="fk-press rounded-xl bg-[#17171c] px-3.5 py-2 text-[12.5px] font-semibold text-white hover:bg-black disabled:opacity-50">
              {progress ? "Exporting…" : "Export .zip"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- theme bar ---------------------------------
   PostSpark's "Sand Light ··· Save": the current styling can be saved as a
   named theme and any theme (built-in or saved) re-applied to any scene. */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ThemeBar() {
  const scene = useSceneStore((s) => s.scene);
  const setScene = useSceneStore((s) => s.setScene);
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<StyleTheme[]>([]);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSaved(loadSavedThemes());
    syncThemesFromServer().then(setSaved); // pull server-saved themes too
  }, []);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const all = [...BUILTIN_THEMES, ...saved];
  const current = all.find((t) => themeMatches(scene, t));

  const themeSwatch = (t: StyleTheme): React.CSSProperties => {
    const bg = t.background;
    if (bg.type === "solid") return { background: bg.color };
    if (bg.type === "linear-gradient")
      return { background: `linear-gradient(${bg.angle}deg, ${bg.stops.map((s) => `${s.color} ${s.at * 100}%`).join(", ")})` };
    if (bg.type === "radial-gradient")
      return { background: `radial-gradient(circle at ${bg.cx * 100}% ${bg.cy * 100}%, ${bg.stops.map((s) => `${s.color} ${s.at * 100}%`).join(", ")})` };
    return { background: "linear-gradient(135deg,#6d28d9,#0e7490)" };
  };

  const doSave = () => {
    const t = saveTheme(scene, name);
    setSaved(loadSavedThemes());
    setNaming(false);
    setName("");
    toast(`Theme "${t.name}" saved ✓`);
  };

  return (
    <div className="relative px-3 pt-2" ref={rootRef}>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setOpen((v) => !v)}
          className="fk-press flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[#e4e4ec] bg-white px-2.5 py-2 text-[12px] font-semibold text-[#17171c] hover:border-[#c9c9d4]"
        >
          <span className="h-4 w-4 shrink-0 rounded-md border border-black/10" style={current ? themeSwatch(current) : { background: "#ececf2" }} />
          <span className="truncate">{current ? current.name : "No theme"}</span>
          <span className="ml-auto text-[#9a9aa4]">▾</span>
        </button>
        {naming ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={name}
              placeholder="Theme name"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") doSave();
                if (e.key === "Escape") setNaming(false);
              }}
              className="w-24 rounded-lg border border-[#17171c] bg-white px-2 py-1.5 text-[11px] outline-none"
            />
            <button onClick={doSave} className="fk-press rounded-lg bg-[#17171c] px-2 py-1.5 text-[11px] font-semibold text-white">
              ✓
            </button>
          </div>
        ) : (
          <button
            onClick={() => setNaming(true)}
            className="fk-press rounded-xl bg-[#17171c] px-3 py-2 text-[12px] font-semibold text-white hover:bg-black"
          >
            Save
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <Popover className="left-3 right-3 top-[calc(100%+6px)] z-30 max-h-72 overflow-y-auto p-2">
            {all.map((t) => {
              const active = current?.id === t.id;
              return (
                <div key={t.id} className="group flex items-center gap-1">
                  <button
                    onClick={() => {
                      setScene((s) => applyTheme(s, t));
                      setOpen(false);
                    }}
                    className={`fk-press flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] font-medium ${
                      active ? "bg-[#17171c] text-white" : "text-[#17171c] hover:bg-black/5"
                    }`}
                  >
                    <span className="h-5 w-7 shrink-0 rounded-md border border-black/10" style={themeSwatch(t)} />
                    <span className="truncate">{t.name}</span>
                    {!t.builtin && <span className={`ml-auto text-[9px] font-semibold uppercase ${active ? "text-white/60" : "text-[#b0b0ba]"}`}>saved</span>}
                  </button>
                  {!t.builtin && (
                    <button
                      title="Delete theme"
                      onClick={() => {
                        deleteTheme(t.id);
                        setSaved(loadSavedThemes());
                      }}
                      className="fk-press hidden rounded-md p-1 text-[#b0b0ba] hover:text-[#e5443b] group-hover:block"
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
            <p className="px-2 pb-1 pt-1.5 text-[10px] leading-relaxed text-[#9a9aa4]">
              Save captures the current background, backdrop &amp; effects as a reusable theme.
            </p>
          </Popover>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------------------- syntax theme gallery ---------------------------
   PostSpark's /code right panel: every syntax theme as a live preview card —
   the same fake snippet rendered in each theme's real colors. */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function SyntaxThemeGallery({ doc, onPick }: { doc: CodeDoc; onPick: (theme: string) => void }) {
  return (
    <div className="px-3 pt-4">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#8a8a94]">Syntax theme</h3>
      <div className="grid grid-cols-2 gap-2">
        {Object.keys(CODE_THEMES).map((key) => {
          const t = CODE_THEMES[key];
          const active = doc.theme === key;
          return (
            <button
              key={key}
              onClick={() => onPick(key)}
              className={`fk-tile overflow-hidden rounded-xl border text-left ${
                active ? "border-[#17171c] shadow-[0_0_0_1.5px_#17171c]" : "border-[#e8e8ef]"
              }`}
              style={{ background: t.bg }}
            >
              <div className="px-2.5 pb-1 pt-2 font-mono text-[8px] leading-[1.7]" style={{ color: t.text }}>
                <div style={{ color: t.comment }}>{"// Calculate f"}</div>
                <div>
                  <span style={{ color: t.keyword }}>function </span>
                  <span style={{ color: t.func }}>facto</span>
                </div>
                <div>
                  {"  "}
                  <span style={{ color: t.keyword }}>if </span>
                  <span style={{ color: t.punct }}>(</span>
                  <span style={{ color: t.variable }}>num</span>
                  <span style={{ color: t.punct }}> ==</span>
                </div>
                <div>
                  {"  "}
                  <span style={{ color: t.keyword }}>else return</span>
                </div>
                <div>{"}"}</div>
              </div>
              <div className="px-2 pb-2">
                <span
                  className="inline-block rounded-md px-2 py-0.5 text-[9.5px] font-semibold"
                  style={{ background: t.bar, color: t.dark ? "#d5d9df" : "#3c3f46" }}
                >
                  {CODE_THEME_LABELS[key]}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CountGlyph({ n }: { n: number }) {
  return (
    <span className="flex items-center justify-center gap-0.5 py-0.5">
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} className="h-3.5 w-[7px] rounded-[2.5px] bg-current" />
      ))}
    </span>
  );
}
