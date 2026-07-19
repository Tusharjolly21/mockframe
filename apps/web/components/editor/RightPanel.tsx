"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { getDevice } from "@framekit/devices";
import type { MockupLayer, SceneDocument } from "@framekit/scene";
import { Check, Copy, Dices, Download, Link2, Loader2, Lock, Plus, RotateCcw, Settings2, Share2, Sparkles, Stamp, Trash2, Upload } from "lucide-react";
import { resolveAsset } from "@/lib/assets";
import { track, trackOnce } from "@/lib/analytics";
import { exportScene, type ExportFormat, type ExportQuality } from "@/lib/export";
import { isScreenAsset, type CodeDoc } from "@/lib/screens";
import { CODE_THEME_LABELS, CODE_THEMES } from "@/lib/screens/code";
import { applyTheme, BUILTIN_THEMES, createSharedTheme, deleteTheme, exportTheme, importThemeFile, loadSavedThemes, saveTheme, syncThemesFromServer, themeMatches, updateSharedTheme, type StyleTheme } from "@/lib/themes";
import { bulkExportZip, type BulkItem } from "@/lib/bulkExport";
import { applyVariation, VARIATIONS } from "@/lib/variations";
import { applyLayout, DEFAULT_MODS, LAYOUT_PRESETS, modifyPreset, type LayoutMods } from "@/lib/layouts";
import { useSceneStore, useViewStore } from "@/lib/store";
import { useEntitlementSync } from "@/lib/billing/client";
import { openUpgrade } from "@/lib/billing/gate";
import { guardProScreens } from "@/lib/billing/screenGate";
import { applyTemplate, deleteUserTemplate, loadUserTemplates, saveUserTemplate, syncUserTemplatesFromServer, templateFromScene, type UserTemplate } from "@/lib/userTemplates";
import { loadCustomWatermark } from "@/lib/customWatermark";
import { DEFAULT_DISCLOSURE, DISCLOSURE_PRESETS, loadDisclosure, saveDisclosure, type DisclosureCfg } from "@/lib/disclosure";
import { UpgradeModal } from "./UpgradeModal";
import { WatermarkPanel } from "./WatermarkPanel";
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
  const [busy, setBusy] = useState<"export" | "copy" | "share" | "remix" | null>(null);
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
    const device = layer.deviceId ? getDevice(layer.deviceId) : undefined;
    const category = device?.category;
    const standaloneCard = !layer.deviceId && !!layer.media && isScreenAsset(layer.media.assetId);
    return !!device?.plate || category === "laptop" || category === "desktop" || standaloneCard;
  });
  const presets = LAYOUT_PRESETS.filter((p) => p.arity === arity);
  const selectedMockups = selectedIds
    .map((id) => scene.layers.find((l) => l.id === id))
    .filter((l): l is MockupLayer => l?.type === "mockup");

  const exportNode = () =>
    document.querySelector<HTMLElement>("#scene-canvas [data-scene-id]");

  const removeWatermark = useViewStore((s) => s.removeWatermark);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradePlan, setUpgradePlan] = useState<"monthly" | "yearly">("yearly");
  const [upgradeReason, setUpgradeReason] = useState<string | undefined>(undefined);
  // Pro gates anywhere in the editor (video export, renders, 4K…) open the
  // upgrade modal through this event
  useEffect(() => {
    const onUpgrade = (event: Event) => {
      const detail = (event as CustomEvent<{ plan?: string; reason?: string }>).detail;
      const requested = detail?.plan;
      if (requested === "monthly" || requested === "yearly") setUpgradePlan(requested);
      // undefined for generic gates — the modal falls back to its usual headline
      setUpgradeReason(detail?.reason);
      setUpgradeOpen(true);
    };
    window.addEventListener("framekit:upgrade", onUpgrade);
    return () => window.removeEventListener("framekit:upgrade", onUpgrade);
  }, []);
  const [watermarkOpen, setWatermarkOpen] = useState(false);
  const [disclosure, setDisclosure] = useState<DisclosureCfg>(DEFAULT_DISCLOSURE);
  useEffect(() => setDisclosure(loadDisclosure()), []);
  const patchDisclosure = (p: Partial<DisclosureCfg>) =>
    setDisclosure((d) => {
      const next = { ...d, ...p };
      saveDisclosure(next);
      return next;
    });
  const [watermarkOn, setWatermarkOn] = useState(false);
  useEffect(() => setWatermarkOn(loadCustomWatermark().enabled), []);
  useEntitlementSync();

  const runExport = async () => {
    if (!guardProScreens(scene, removeWatermark)) return;
    const node = exportNode();
    if (!node) return;
    setBusy("export");
    await new Promise((r) => setTimeout(r, 30));
    try {
      await exportScene(node, scene, { format, scale, quality, watermark: !removeWatermark });
      track("export_completed", {
        format,
        scale,
        width: Math.round(scene.canvas.width * scale),
        height: Math.round(scene.canvas.height * scale),
        pro: removeWatermark,
      });
      trackOnce("first_export", { format, pro: removeWatermark });
      window.dispatchEvent(new CustomEvent("framekit:export-done"));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(null);
    }
  };

  // rendered + watermarked PNG of the current scene (shared by copy + share-link)
  const renderPng = async (node: HTMLElement): Promise<Blob> => {
    const { toCanvas } = await import("html-to-image");
    const { applyWatermark } = await import("@/lib/watermark");
    const { exportWatermarkOpts } = await import("@/lib/customWatermark");
    const canvas = await toCanvas(node, {
      pixelRatio: 1,
      canvasWidth: scene.canvas.width,
      canvasHeight: scene.canvas.height,
    });
    await applyWatermark(canvas, exportWatermarkOpts(removeWatermark));
    return new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("render failed"))), "image/png")
    );
  };

  const runShare = async () => {
    // hosted share links are Pro (user request) — storage + bandwidth on us
    if (!removeWatermark) {
      openUpgrade();
      return;
    }
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

  const runRemixLink = async () => {
    // remixable links are FREE by design — every shared scene advertises the
    // editor. Assets upload first so the link works on any device.
    setBusy("remix");
    try {
      const { collectAssets } = await import("@framekit/renderer");
      const { resolveAsset: resolve, persistAsset } = await import("@/lib/assets");
      const { firebaseFetch } = await import("@/lib/firebaseClient");
      const current = useSceneStore.getState().scene;
      const uploaded: { id: string; name: string; url: string; width: number; height: number }[] = [];
      for (const id of collectAssets(current)) {
        if (id.startsWith("builtin:") || id.startsWith("screen:")) continue; // resolvable everywhere
        const asset = resolve(id);
        if (!asset) continue;
        const hosted = await persistAsset(asset);
        uploaded.push({ id: hosted.id, name: hosted.name ?? "asset", url: hosted.url, width: hosted.width, height: hosted.height });
      }
      const res = await firebaseFetch("/api/scene-share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scene: current, assets: uploaded, name: "Shared mockup" }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Could not create remix link");
      const url = `${window.location.origin}/s/${j.id}`;
      await navigator.clipboard.writeText(url);
      toast("Remix link copied — anyone can open & edit a copy 🔗");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not create remix link");
    } finally {
      setBusy(null);
    }
  };

  const runCopy = async () => {
    // copy-to-clipboard is an export in every sense that matters
    if (!guardProScreens(scene, removeWatermark)) return;
    const node = exportNode();
    if (!node) return;
    setBusy("copy");
    try {
      // pass the promise to ClipboardItem (Safari needs it) but also await it so
      // a render/clipboard failure surfaces as a toast instead of an unhandled
      // rejection + a silently un-busied button
      const blob = renderPng(node);
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      await blob;
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn’t copy image");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fk-card panel-scroll pointer-events-auto flex max-h-full w-[min(300px,46vw)] flex-col overflow-y-auto pb-4">
      {/* export header and inline settings: opening settings reflows the panel
          instead of covering the watermark and layout controls below it. */}
      <div className="relative px-3 pt-3" ref={settingsRef}>
        <div className="flex items-center gap-2">
        <button
          id="editor-export"
          onClick={runExport}
          disabled={!!busy}
          className="fk-press flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#17171c] px-3 py-2.5 text-[13px] font-semibold text-white hover:bg-black disabled:opacity-60"
        >
          <Upload size={14} />
          {busy === "export" ? "Exporting…" : "Export"}
          <span className="text-[11px] font-medium text-white/60">
            {Number.isInteger(scale) ? `${scale}x` : `${Math.round(Math.max(scene.canvas.width, scene.canvas.height) * scale)}px`} · {format === "jpeg" ? "JPG" : format.toUpperCase()}
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
        <button
          title="Copy a remix link — anyone can open & edit a copy (free)"
          onClick={runRemixLink}
          disabled={!!busy}
          className="fk-press grid h-10 w-10 place-items-center rounded-xl border border-[#e4e4ec] bg-white text-[#5a5a66] hover:border-[#c9c9d4]"
        >
          {busy === "remix" ? <Loader2 size={15} className="animate-spin" /> : <Share2 size={15} />}
        </button>
        <div className="relative z-60">
          <button
            title="Export settings"
            onClick={() => setSettingsOpen((v) => !v)}
            className="fk-press grid h-10 w-10 place-items-center rounded-xl border border-[#e4e4ec] bg-white text-[#5a5a66] hover:border-[#c9c9d4]"
          >
            <Settings2 size={15} />
          </button>
        </div>
        </div>
        <AnimatePresence>
          {settingsOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -4 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="mt-2 overflow-hidden rounded-2xl border border-[#e5e5ed] bg-[#fbfbfd] p-3"
            >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[12px] font-bold text-[#17171c]">Export settings</p>
                  <button onClick={() => setSettingsOpen(false)} className="text-[11px] font-semibold text-[#7c3aed] hover:text-[#5b21b6]">Done</button>
                </div>
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
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#9a9aa4]">Output size</p>
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
                    the canvas long edge, so every canvas hits the exact target.
                    HD is free; 4K/6K are Pro. */}
                <div className="mb-2 grid grid-cols-3 gap-1">
                  {([["HD", 1920], ["4K", 3840], ["6K", 5760]] as const).map(([label, target]) => {
                    const longEdge = Math.max(scene.canvas.width, scene.canvas.height);
                    const s = Math.round((target / longEdge) * 1000) / 1000;
                    const active = Math.abs(scale - s) < 0.002;
                    const locked = label !== "HD" && !removeWatermark;
                    return (
                      <button
                        key={label}
                        onClick={() => (locked ? openUpgrade() : setScale(s))}
                        className={`fk-press flex items-center justify-center gap-1 rounded-lg border py-1.5 text-[11px] font-semibold ${
                          active ? "border-[#17171c] bg-[#17171c] text-white" : "border-[#e4e4ec] bg-white text-[#5a5a66] hover:border-[#c9c9d4]"
                        }`}
                      >
                        {locked && <Lock size={9} className="text-[#b9a02c]" />}
                        {label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10.5px] tabular-nums text-[#9a9aa4]">
                  {Math.round(scene.canvas.width * scale)} × {Math.round(scene.canvas.height * scale)} px
                </p>

                {/* fictional-recreation disclosure — free safety feature, baked
                    into image, video and GIF pixels */}
                <div className="mt-3 border-t border-[#ececf2] pt-2.5">
                  <label className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#17171c]">&quot;Fictional&quot; disclosure label</span>
                    <input
                      type="checkbox"
                      checked={disclosure.enabled}
                      onChange={(e) => patchDisclosure({ enabled: e.target.checked })}
                      className="h-3.5 w-3.5 accent-[#17171c]"
                    />
                  </label>
                  <p className="mt-0.5 text-[9.5px] leading-snug text-[#9a9aa4]">
                    Marks exports as a dramatization — protects you when sharing realistic chat mockups.
                  </p>
                  {disclosure.enabled && (
                    <div className="mt-2 space-y-1.5">
                      <select
                        value={(DISCLOSURE_PRESETS as readonly string[]).includes(disclosure.text) ? disclosure.text : "__custom"}
                        onChange={(e) => patchDisclosure({ text: e.target.value === "__custom" ? "" : e.target.value })}
                        className="w-full rounded-lg border border-[#e4e4ec] bg-white px-2 py-1.5 text-[10.5px] text-[#17171c]"
                      >
                        {DISCLOSURE_PRESETS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                        <option value="__custom">Custom text…</option>
                      </select>
                      {!(DISCLOSURE_PRESETS as readonly string[]).includes(disclosure.text) && (
                        <input
                          value={disclosure.text}
                          onChange={(e) => patchDisclosure({ text: e.target.value })}
                          placeholder="Your disclosure text"
                          className="w-full rounded-lg border border-[#e4e4ec] bg-white px-2 py-1.5 text-[10.5px] text-[#17171c] outline-none focus:border-[#17171c]"
                        />
                      )}
                      <Seg
                        id="disclosure-pos"
                        options={[
                          { value: "top", label: "Top" },
                          { value: "bottom", label: "Bottom" },
                        ]}
                        value={disclosure.position}
                        onChange={(position) => patchDisclosure({ position })}
                      />
                    </div>
                  )}
                </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Pro: custom brand watermark settings · free: upsell that same feature.
          NOT "remove watermark" — exports are already clean on every tier, and
          implying otherwise sells a fix for a problem we don't have. */}
      <div className="px-3 pt-2">
        {removeWatermark ? (
          <button
            onClick={() => setWatermarkOpen(true)}
            className="fk-press flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#c9ecd4] bg-[#effaf2] py-1.5 text-[11px] font-semibold text-[#1a7f3c] hover:border-[#1a7f3c]"
          >
            <Stamp size={12} />
            {watermarkOn ? "Custom watermark · on" : "Pro — add your own watermark"}
          </button>
        ) : (
          <button
            onClick={() => {
              setUpgradeReason(undefined); // generic upsell — don't inherit a prior gate's headline
              setUpgradeOpen(true);
            }}
            className="fk-press flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#e4c34d] bg-[#fdf7de] py-1.5 text-[11px] font-semibold text-[#8a6d12] hover:border-[#d4a72c]"
          >
            <Sparkles size={12} /> Pro — stamp your own brand
          </button>
        )}
      </div>
      {upgradeOpen && <UpgradeModal initialPlan={upgradePlan} reason={upgradeReason} onClose={() => setUpgradeOpen(false)} />}
      {watermarkOpen && (
        <WatermarkPanel
          onClose={() => {
            setWatermarkOpen(false);
            setWatermarkOn(loadCustomWatermark().enabled);
          }}
        />
      )}

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

      <MyTemplates />
      <ConnectorsPanel />

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
  const importRef = useRef<HTMLInputElement>(null);
  const [shareTheme, setShareTheme] = useState<StyleTheme | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState<"read" | "contribute">("read");
  const [shareBusy, setShareBusy] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  useEffect(() => {
    setSaved(loadSavedThemes());
    syncThemesFromServer().then(setSaved); // pull server-saved themes too
  }, []);
  useEffect(() => {
    if (!open) return;
    const refresh = () => syncThemesFromServer().then(setSaved);
    refresh();
    const timer = window.setInterval(refresh, 10000);
    return () => window.clearInterval(timer);
  }, [open]);
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

  const openShare = (theme: StyleTheme) => {
    setShareTheme(theme);
    setShareEmail("");
    setShareRole("read");
    setShareLink(null);
    setShareError(null);
  };

  const publishCurrent = async () => {
    if (!shareTheme?.shared) return;
    setShareBusy(true);
    setShareError(null);
    try {
      await updateSharedTheme(shareTheme.shared.shareId, {
        ...shareTheme,
        background: scene.canvas.background,
        backdrop: scene.canvas.backdrop,
        effects: scene.canvas.effects,
        cornerRadius: scene.canvas.cornerRadius,
        border: scene.canvas.border,
      });
      toast("Shared theme updated ✓");
      setSaved(await syncThemesFromServer());
    } catch (error) {
      setShareError(error instanceof Error ? error.message : "Could not update this theme.");
    } finally {
      setShareBusy(false);
    }
  };

  const invite = async () => {
    if (!shareTheme || !shareEmail.trim()) return;
    setShareBusy(true);
    setShareError(null);
    try {
      const result = await createSharedTheme(shareTheme, shareEmail, shareRole);
      const url = `${window.location.origin}${result.shareUrl}`;
      setShareLink(url);
      setSaved(await syncThemesFromServer());
      toast("Theme shared ✓");
    } catch (error) {
      setShareError(error instanceof Error ? error.message : "Could not share this theme.");
    } finally {
      setShareBusy(false);
    }
  };

  const inviteMember = async () => {
    if (!shareTheme?.shared || !shareEmail.trim()) return;
    setShareBusy(true);
    setShareError(null);
    try {
      await updateSharedTheme(shareTheme.shared.shareId, shareTheme, shareEmail, shareRole);
      setShareEmail("");
      setSaved(await syncThemesFromServer());
      toast("Member added ✓");
    } catch (error) {
      setShareError(error instanceof Error ? error.message : "Could not add this member.");
    } finally {
      setShareBusy(false);
    }
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
        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            try {
              await importThemeFile(file);
              setSaved(loadSavedThemes());
              toast(`Imported "${file.name}" ✓`);
            } catch (error) {
              toast(error instanceof Error ? error.message : "Could not import this theme");
            }
            event.target.value = "";
          }}
        />
        <button
          title="Import theme JSON"
          onClick={() => importRef.current?.click()}
          className="fk-press grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#e4e4ec] bg-white text-[#3c3c46] hover:border-[#17171c]"
        >
          <Upload size={15} />
        </button>
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
                  <div className="ml-auto flex items-center gap-0.5">
                    <button
                      title="Share theme"
                      onClick={() => openShare(t)}
                      className={`fk-press rounded-md p-1 ${active ? "text-white/70 hover:text-white" : "text-[#b0b0ba] hover:text-[#17171c]"}`}
                    >
                      <Share2 size={13} />
                    </button>
                    <button
                      title="Export theme JSON"
                      onClick={() => exportTheme(t)}
                      className={`fk-press rounded-md p-1 ${active ? "text-white/70 hover:text-white" : "text-[#b0b0ba] hover:text-[#17171c]"}`}
                    >
                      <Download size={13} />
                    </button>
                    {!t.builtin && (
                      <button
                        title="Delete theme"
                        onClick={() => {
                          deleteTheme(t.id);
                          setSaved(loadSavedThemes());
                        }}
                        className={`fk-press rounded-md p-1 ${active ? "text-white/70 hover:text-white" : "text-[#b0b0ba] hover:text-[#e5443b]"}`}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            <p className="px-2 pb-1 pt-1.5 text-[10px] leading-relaxed text-[#9a9aa4]">
              Save captures the current background, backdrop &amp; effects as a reusable theme.
            </p>
          </Popover>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {shareTheme && (
          <div className="fixed inset-0 z-[80] grid place-items-center bg-black/20 px-4 backdrop-blur-[2px]" onMouseDown={() => setShareTheme(null)}>
            <div className="fk-card w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
              <div className="mb-1 flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-bold text-[#17171c]">Share “{shareTheme.name}”</p>
                  <p className="mt-0.5 text-[11px] text-[#8a8a94]">Keep the same visual language across your team.</p>
                </div>
                <button onClick={() => setShareTheme(null)} className="fk-press rounded-lg px-2 py-1 text-lg text-[#8a8a94]">×</button>
              </div>
              <div className="mt-4 space-y-2.5">
                <label className="block text-[11px] font-semibold text-[#6b6b76]">
                  Employee email
                  <input value={shareEmail} onChange={(event) => setShareEmail(event.target.value)} placeholder="designer@company.com" className="mt-1.5 w-full rounded-xl border border-[#e4e4ec] px-3 py-2 text-[12px] outline-none focus:border-[#17171c]" />
                </label>
                <label className="block text-[11px] font-semibold text-[#6b6b76]">
                  Permission
                  <select value={shareRole} onChange={(event) => setShareRole(event.target.value as "read" | "contribute")} className="mt-1.5 w-full rounded-xl border border-[#e4e4ec] bg-white px-3 py-2 text-[12px] outline-none">
                    <option value="read">Read-only · can use, cannot change</option>
                    <option value="contribute">Contributor · can publish changes</option>
                  </select>
                </label>
                {shareTheme.shared && (
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={inviteMember} disabled={shareBusy || shareTheme.shared.role === "read" || !shareEmail.trim()} className="fk-press rounded-xl border border-[#e4e4ec] bg-white py-2.5 text-[11px] font-semibold text-[#17171c] disabled:opacity-40">
                      Add member
                    </button>
                    <button onClick={publishCurrent} disabled={shareBusy || shareTheme.shared.role === "read"} className="fk-press rounded-xl bg-[#17171c] py-2.5 text-[11px] font-semibold text-white disabled:opacity-40">
                      {shareBusy ? "Saving…" : shareTheme.shared.role === "read" ? "Read-only" : "Publish changes"}
                    </button>
                  </div>
                )}
                {!shareTheme.shared && (
                  <button onClick={invite} disabled={shareBusy || !shareEmail.trim()} className="fk-press w-full rounded-xl bg-[#17171c] py-2.5 text-[12px] font-semibold text-white disabled:opacity-40">
                    {shareBusy ? "Creating share…" : "Create shared theme"}
                  </button>
                )}
                {shareLink && (
                  <button onClick={() => navigator.clipboard?.writeText(shareLink)} className="fk-press flex w-full items-center gap-2 rounded-xl border border-[#e4e4ec] px-3 py-2 text-left text-[11px] text-[#5a5a66]">
                    <Link2 size={13} />
                    <span className="truncate">{shareLink}</span>
                    <Copy size={13} className="ml-auto shrink-0" />
                  </button>
                )}
                {shareError && <p className="text-[11px] font-medium text-[#c2413b]">{shareError}</p>}
                <p className="text-[10.5px] leading-relaxed text-[#9a9aa4]">Read-only teammates can apply the theme. Contributors can publish updated styling for everyone with access.</p>
              </div>
            </div>
          </div>
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

/* ------------------------------ my templates ------------------------------ */
/* Pro: save the whole composition (background, effects, positions, text,
   stickers — screenshots stripped) as a reusable template that follows the
   account; applying one restyles the CURRENT shots. */
function MyTemplates() {
  const setScene = useSceneStore((s) => s.setScene);
  const isPro = useViewStore((s) => s.removeWatermark);
  const select = useViewStore((s) => s.select);
  const [templates, setTemplates] = useState<UserTemplate[]>([]);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    setTemplates(loadUserTemplates());
    syncUserTemplatesFromServer().then(setTemplates).catch(() => {});
  }, []);

  const startSave = () => {
    if (!isPro) {
      openUpgrade();
      return;
    }
    setName(`Template ${templates.length + 1}`);
    setNaming(true);
  };

  const confirmSave = () => {
    const tpl = templateFromScene(useSceneStore.getState().scene, name);
    setTemplates((t) => [tpl, ...t]);
    setNaming(false);
    saveUserTemplate(tpl).then(
      () => toast(`Saved "${tpl.name}" to your templates ✓`),
      (e) => toast(e instanceof Error ? e.message : "Couldn't sync the template")
    );
  };

  return (
    <div className="px-3 pt-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#8a8a94]">
          My templates
          <span className="rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase text-white">Pro</span>
        </h3>
        {!naming && (
          <button
            onClick={startSave}
            className="fk-press flex items-center gap-1 rounded-lg border border-[#e4e4ec] bg-white px-2 py-1 text-[10.5px] font-semibold text-[#17171c] hover:border-[#17171c]"
          >
            {isPro ? <Plus size={11} /> : <Lock size={10} className="text-[#b9a02c]" />} Save current
          </button>
        )}
      </div>

      {naming && (
        <div className="mb-2 flex items-center gap-1.5">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && confirmSave()}
            className="min-w-0 flex-1 rounded-lg border border-[#e4e4ec] bg-white px-2 py-1.5 text-[11.5px] text-[#17171c] outline-none focus:border-[#17171c]"
          />
          <button onClick={confirmSave} className="fk-press rounded-lg bg-[#17171c] px-2.5 py-1.5 text-[11px] font-semibold text-white">
            Save
          </button>
          <button onClick={() => setNaming(false)} className="fk-press rounded-lg px-1.5 py-1.5 text-[11px] font-semibold text-[#8a8a94]">
            ✕
          </button>
        </div>
      )}

      {templates.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {templates.map((tpl) => (
            <div key={tpl.id} className="group relative">
              <button
                onClick={() => {
                  setScene((s) => applyTemplate(s, tpl));
                  select(null);
                  toast(`Applied "${tpl.name}" — your screenshots kept ✨`);
                }}
                className="fk-tile w-full cursor-pointer rounded-xl border border-[#e8e8ef] p-1 text-left hover:border-[#17171c]"
                title={`Apply "${tpl.name}"`}
              >
                <ScenePreview scene={tpl.scene} />
                <span className="block truncate px-1 pt-1 text-[10px] font-semibold text-[#5a5a66]">{tpl.name}</span>
              </button>
              <button
                title="Delete template"
                onClick={() => {
                  deleteUserTemplate(tpl.id);
                  setTemplates((t) => t.filter((x) => x.id !== tpl.id));
                }}
                className="fk-press absolute right-1.5 top-1.5 hidden h-6 w-6 place-items-center rounded-md bg-white/90 text-[#9a9aa4] shadow group-hover:grid hover:text-red-500"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
      {templates.length === 0 && !naming && (
        <p className="rounded-xl bg-[#f6f6fa] px-3 py-2.5 text-[10.5px] leading-relaxed text-[#9a9aa4]">
          Style a scene — colors, positions, text — then save it here and reuse it on any future shot.
        </p>
      )}
    </div>
  );
}

function ConnectorsPanel() {
  const scene = useSceneStore((s) => s.scene);
  const setScene = useSceneStore((s) => s.setScene);
  
  const mockups = scene.layers.filter((l) => l.type === "mockup");
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  
  // Set defaults on mount or when mockups change
  useEffect(() => {
    if (mockups.length >= 2) {
      if (!fromId) setFromId(mockups[0].id);
      if (!toId) setToId(mockups[1].id);
    }
  }, [mockups, fromId, toId]);

  const addConnector = () => {
    if (!fromId || !toId || fromId === toId) return;
    const connId = `conn-${Math.random().toString(36).slice(2, 9)}`;
    const newConn = {
      id: connId,
      fromLayerId: fromId,
      toLayerId: toId,
      color: "#635bff",
      thickness: 3,
      dashArray: undefined,
      arrowHead: true,
    };
    setScene((s) => ({
      ...s,
      connectors: [...(s.connectors || []), newConn],
    }));
  };

  const deleteConnector = (id: string) => {
    setScene((s) => ({
      ...s,
      connectors: (s.connectors || []).filter((c) => c.id !== id),
    }));
  };

  const updateConnector = (id: string, patch: Partial<NonNullable<SceneDocument["connectors"]>[number]>) => {
    setScene((s) => ({
      ...s,
      connectors: (s.connectors || []).map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  };

  if (mockups.length < 2) return null;

  return (
    <div className="px-3 pt-3 pb-3 border-b border-[#ececf2]">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#8a8a94]">
        Magnetic Connectors
      </h3>
      
      {/* List existing connectors */}
      <div className="space-y-2 mb-3">
        {(scene.connectors || []).map((c, idx) => {
          const fromL = mockups.find((l) => l.id === c.fromLayerId);
          const toL = mockups.find((l) => l.id === c.toLayerId);
          if (!fromL || !toL) return null;
          
          return (
            <div key={c.id} className="rounded-xl border border-[#e4e4ec] bg-white p-2 text-xs">
              <div className="flex items-center justify-between mb-1.5 font-semibold text-[#17171c]">
                <span>Flow #{idx + 1}: Mockup → Mockup</span>
                <button
                  onClick={() => deleteConnector(c.id)}
                  className="text-red-500 hover:text-red-700 text-[10px]"
                >
                  Delete
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                <label className="block">
                  <span className="text-[9.5px] text-[#8a8a94] mb-0.5 block">Color</span>
                  <input
                    type="color"
                    value={c.color || "#635bff"}
                    onChange={(e) => updateConnector(c.id, { color: e.target.value })}
                    className="w-full h-7 rounded border border-[#e4e4ec] cursor-pointer"
                  />
                </label>
                <label className="block">
                  <span className="text-[9.5px] text-[#8a8a94] mb-0.5 block">Thickness</span>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={c.thickness || 3}
                    onChange={(e) => updateConnector(c.id, { thickness: Number(e.target.value) || 3 })}
                    className="w-full h-7 rounded border border-[#e4e4ec] px-1.5 py-0.5 text-xs text-[#17171c]"
                  />
                </label>
              </div>
              
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => updateConnector(c.id, { dashArray: c.dashArray ? undefined : "6,6" })}
                  className={`flex-1 rounded px-1.5 py-1 text-[10px] font-semibold border ${
                    c.dashArray ? "bg-[#17171c] text-white border-[#17171c]" : "bg-white text-[#6b6b76] border-[#e4e4ec]"
                  }`}
                >
                  {c.dashArray ? "Dashed" : "Solid"}
                </button>
                <button
                  onClick={() => updateConnector(c.id, { arrowHead: c.arrowHead === false })}
                  className={`flex-1 rounded px-1.5 py-1 text-[10px] font-semibold border ${
                    c.arrowHead !== false ? "bg-[#17171c] text-white border-[#17171c]" : "bg-white text-[#6b6b76] border-[#e4e4ec]"
                  }`}
                >
                  {c.arrowHead !== false ? "Arrow head" : "No arrow"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add new connector */}
      <div className="flex flex-col gap-2 rounded-xl bg-[#f6f6fa] p-2">
        <span className="text-[10px] font-bold text-[#17171c]">Link mockup layers</span>
        <div className="flex gap-1.5">
          <select
            value={fromId}
            onChange={(e) => setFromId(e.target.value)}
            className="flex-1 rounded border border-[#e4e4ec] bg-white px-1.5 py-1 text-[10.5px] text-[#17171c] min-w-0"
          >
            {mockups.map((m, i) => (
              <option key={m.id} value={m.id}>Mockup {i + 1}</option>
            ))}
          </select>
          <span className="text-[#8a8a94] self-center text-[10px]">→</span>
          <select
            value={toId}
            onChange={(e) => setToId(e.target.value)}
            className="flex-1 rounded border border-[#e4e4ec] bg-white px-1.5 py-1 text-[10.5px] text-[#17171c] min-w-0"
          >
            {mockups.map((m, i) => (
              <option key={m.id} value={m.id}>Mockup {i + 1}</option>
            ))}
          </select>
        </div>
        <button
          onClick={addConnector}
          disabled={!fromId || !toId || fromId === toId}
          className="fk-press rounded-lg bg-[#17171c] py-1.5 text-[11px] font-semibold text-white hover:bg-black disabled:opacity-40"
        >
          Add flow line
        </button>
      </div>
    </div>
  );
}
