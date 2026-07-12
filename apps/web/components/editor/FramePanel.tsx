"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence } from "motion/react";
import type { Background, Backdrop, Effect, MockupLayer } from "@framekit/scene";
import { backgroundToCss, noiseTile, overlayStyle, patternStyle } from "@framekit/renderer";
import { Aperture, ArrowLeft, ArrowUpDown, Ban, ChevronDown, Grid3x3, Image as ImageIcon, Pipette, SlidersHorizontal, Sparkles, Square, Sun } from "lucide-react";
import {
  SiAppstore,
  SiDribbble,
  SiInstagram,
  SiPinterest,
  SiX,
  SiYoutube,
} from "@icons-pack/react-simple-icons";
import { findSizePreset, SIZE_CATEGORIES, type SizePreset } from "@/lib/canvasSizes";
import { ingestFile, resolveAsset } from "@/lib/assets";
import { BG_CATEGORIES, magicSwatches, type BgSwatch } from "@/lib/backgrounds";
import { extractPalette } from "@/lib/palette";
import { useSceneStore, useViewStore } from "@/lib/store";
import { ColorRow, Popover, Section, Seg, SliderRow } from "./ui";

/* PostSpark-style hub → detail navigation: the Frame tab shows a compact hub
   (size, background, one "Style" chip grid); each style feature opens its own
   focused sub-view with a back header. Kills the mile-long scroll. */
type FrameView = "hub" | "pattern" | "overlay" | "portrait" | "effects" | "border";

function DetailView({ label, onBack, children }: { label: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <div className="px-3 pt-2">
      <button
        onClick={onBack}
        className="fk-press mb-3 flex w-full items-center gap-2 rounded-xl bg-[#f4f4f8] px-3 py-2 text-[12.5px] font-bold text-[#17171c]"
      >
        <ArrowLeft size={14} />
        {label}
      </button>
      {children}
    </div>
  );
}

export function FrameControls() {
  const scene = useSceneStore((s) => s.scene);
  const setScene = useSceneStore((s) => s.setScene);
  const bumpAssets = useViewStore((s) => s.bumpAssets);
  const fileRef = useRef<HTMLInputElement>(null);
  const colorRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<FrameView>("hub");

  const bg = scene.canvas.background;
  const setBg = (background: Background) => setScene((s) => ({ ...s, canvas: { ...s.canvas, background } }));
  const bgKey = JSON.stringify(bg);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleCat = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /* Magic: dominant colors from the first uploaded screenshot */
  const firstAssetId = (
    scene.layers.find((l) => l.type === "mockup" && l.media) as MockupLayer | undefined
  )?.media?.assetId;
  const [palette, setPalette] = useState<string[]>([]);
  useEffect(() => {
    if (!firstAssetId) {
      setPalette([]);
      return;
    }
    const asset = resolveAsset(firstAssetId);
    if (!asset) return;
    let alive = true;
    extractPalette(asset.url).then((p) => alive && setPalette(p)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [firstAssetId]);
  const magic = useMemo(() => magicSwatches(palette), [palette]);

  const Swatch = ({ s }: { s: BgSwatch }) => {
    const active = JSON.stringify(s.bg) === bgKey;
    const style: React.CSSProperties =
      s.bg.type === "image"
        ? {
            backgroundImage: `url("${resolveAsset(s.bg.assetId)?.url ?? ""}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }
        : (backgroundToCss(s.bg) as React.CSSProperties);
    return (
      <button
        onClick={() => setBg(s.bg)}
        className={`fk-tile h-12 rounded-xl border ${
          active ? "border-[#17171c] shadow-[0_0_0_1.5px_#17171c]" : "border-[#e4e4ec]"
        }`}
        style={style}
        title={s.id}
      />
    );
  };

  /* ------------------------------ detail views ------------------------------ */
  if (view !== "hub") {
    const labels: Record<Exclude<FrameView, "hub">, string> = {
      overlay: "Overlay · light & shadow",
      effects: "Effects",
      pattern: "Pattern",
      portrait: "Portrait · depth",
      border: "Border",
    };
    return (
      <DetailView label={labels[view]} onBack={() => setView("hub")}>
        {view === "pattern" && <PatternDetail />}
        {view === "overlay" && <OverlayDetail />}
        {view === "portrait" && <PortraitDetail />}
        {view === "effects" && <EffectsDetail />}
        {view === "border" && <BorderDetail />}
      </DetailView>
    );
  }

  /* --------------------------------- hub ------------------------------------ */
  const backdrop = scene.canvas.backdrop;
  const styleChips: { id: Exclude<FrameView, "hub">; label: string; icon: React.ReactNode; on: boolean }[] = [
    { id: "overlay", label: "Overlay", icon: <Sun size={14} />, on: !!backdrop?.overlay },
    { id: "effects", label: "Effects", icon: <SlidersHorizontal size={14} />, on: (scene.canvas.effects?.length ?? 0) > 0 },
    { id: "pattern", label: "Pattern", icon: <Grid3x3 size={14} />, on: !!backdrop?.pattern },
    { id: "portrait", label: "Portrait", icon: <Aperture size={14} />, on: !!backdrop?.portrait },
    { id: "border", label: "Border", icon: <Square size={14} />, on: (scene.canvas.cornerRadius ?? 0) > 0 || (scene.canvas.border?.width ?? 0) > 0 },
  ];

  return (
    <>
      <div className="px-3 pt-1">
        <SizeSelector />
      </div>

      {/* Style hub — each chip opens a focused sub-view (PostSpark Backdrop) */}
      <div className="px-4 pt-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#8a8a94]">Style</p>
        <div className="grid grid-cols-2 gap-1.5">
          {styleChips.map((c) => (
            <button
              key={c.id}
              onClick={() => setView(c.id)}
              className={`fk-press flex items-center gap-1.5 rounded-full border px-3 py-2 text-[12px] font-semibold ${
                c.on ? "border-[#17171c] bg-[#17171c] text-white" : "border-[#e4e4ec] bg-white text-[#3c3c46] hover:border-[#c9c9d4]"
              }`}
            >
              {c.icon}
              {c.label}
              {c.on && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />}
            </button>
          ))}
        </div>
      </div>

      <Section title="Background">
        {/* mode chips: transparent / custom color / image */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          <button
            onClick={() => setBg({ type: "transparent" })}
            className={`fk-tile flex flex-col items-center gap-1.5 rounded-xl border bg-white py-2.5 ${
              bg.type === "transparent" ? "border-[#17171c] shadow-[0_0_0_1px_#17171c]" : "border-[#e8e8ef]"
            }`}
          >
            <Ban size={16} className="text-[#6b6b76]" />
            <span className="text-[10.5px] font-medium text-[#6b6b76]">Trans…</span>
          </button>
          <button
            onClick={() => colorRef.current?.click()}
            className="fk-tile relative flex flex-col items-center gap-1.5 rounded-xl border border-[#e8e8ef] bg-white py-2.5"
          >
            <Pipette size={16} className="text-[#6b6b76]" />
            <span className="text-[10.5px] font-medium text-[#6b6b76]">Color</span>
            <input
              ref={colorRef}
              type="color"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              value={bg.type === "solid" ? bg.color : "#ffffff"}
              onChange={(e) => setBg({ type: "solid", color: e.target.value })}
            />
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="fk-tile flex flex-col items-center gap-1.5 rounded-xl border border-[#e8e8ef] bg-white py-2.5"
          >
            <ImageIcon size={16} className="text-[#6b6b76]" />
            <span className="text-[10.5px] font-medium text-[#6b6b76]">Image</span>
          </button>
        </div>

        {/* Auto / Shuffle — gradients generated from the content's own colors
            (PostSpark's Auto Backgrounds) + a one-click random from the library */}
        <div className="mb-3 grid grid-cols-2 gap-2">
          <button
            disabled={magic.length === 0}
            onClick={() => magic[0] && setBg(magic[0].bg)}
            className="fk-press flex items-center justify-center gap-1.5 rounded-xl border border-[#e4e4ec] bg-white py-2 text-[12px] font-semibold text-[#17171c] hover:border-[#17171c] disabled:opacity-40"
            title={magic.length ? "Generate a background from your screenshot's colors" : "Upload a screenshot first"}
          >
            <Sparkles size={13} className="text-amber-500" /> Auto
          </button>
          <button
            onClick={() => {
              const all = BG_CATEGORIES.flatMap((c) => c.swatches);
              const pick = all[Math.floor(Math.random() * all.length)];
              if (pick) setBg(pick.bg);
            }}
            className="fk-press flex items-center justify-center gap-1.5 rounded-xl border border-[#e4e4ec] bg-white py-2 text-[12px] font-semibold text-[#17171c] hover:border-[#17171c]"
          >
            <ArrowUpDown size={13} className="rotate-90" /> Shuffle
          </button>
        </div>

        {/* extracted palette strip + auto swatches */}
        {magic.length > 0 && (
          <div className="mb-4">
            {palette.length > 0 && (
              <div className="mb-2 flex h-3 overflow-hidden rounded-full border border-black/5">
                {palette.slice(0, 6).map((c, i) => (
                  <span key={i} className="flex-1" style={{ background: c }} />
                ))}
              </div>
            )}
            <div className="grid grid-cols-6 gap-1.5">
              {magic.map((s) => (
                <Swatch key={s.id} s={s} />
              ))}
            </div>
          </div>
        )}

        {/* contextual controls for the active background */}
        {bg.type === "linear-gradient" && (
          <div className="mb-2">
            <SliderRow
              label="Angle"
              value={bg.angle}
              min={0}
              max={360}
              format={(v) => `${Math.round(v)}°`}
              onChange={(angle) => setBg({ ...bg, angle })}
            />
          </div>
        )}
        {bg.type === "mesh-gradient" && (
          <button
            onClick={() => setBg({ ...bg, seed: (bg.seed * 16807) % 2147483647 })}
            className="fk-press mb-3 w-full rounded-xl border border-[#e4e4ec] bg-white py-2 text-xs font-medium hover:border-[#c9c9d4]"
          >
            Shuffle mesh
          </button>
        )}
        {bg.type === "image" && (
          <div className="mb-2">
            <SliderRow label="Blur" value={bg.blur} min={0} max={60} onChange={(blur) => setBg({ ...bg, blur })} />
          </div>
        )}

        {/* curated library — first row visible, chevron expands the rest */}
        {BG_CATEGORIES.map((cat) => {
          const isOpen = expanded.has(cat.id);
          const shown = isOpen ? cat.swatches : cat.swatches.slice(0, 4);
          const hasMore = cat.swatches.length > 4;
          return (
            <div key={cat.id} className="mb-4">
              <button
                className={`mb-2 flex w-full items-center justify-between text-[13px] font-bold text-[#17171c] ${hasMore ? "cursor-pointer" : "cursor-default"}`}
                onClick={() => hasMore && toggleCat(cat.id)}
              >
                {cat.label}
                {hasMore && (
                  <span className="flex items-center gap-1 text-[10.5px] font-medium text-[#9a9aa4]">
                    {!isOpen && `+${cat.swatches.length - 4}`}
                    <ChevronDown
                      size={13}
                      style={{ transform: isOpen ? "rotate(180deg)" : undefined, transition: "transform 180ms ease" }}
                    />
                  </span>
                )}
              </button>
              <div className="grid grid-cols-4 gap-2">
                {shown.map((s) => (
                  <Swatch key={s.id} s={s} />
                ))}
              </div>
            </div>
          );
        })}

        {/* stock photo backdrops — downloaded + ingested locally so exports
            never depend on a remote URL (html-to-image needs local assets) */}
        <StockPhotos
          onPick={(assetId) => {
            bumpAssets();
            setBg({ type: "image", assetId, fit: "cover", blur: 0, opacity: 1 });
          }}
        />

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const a = await ingestFile(f);
            bumpAssets();
            setBg({ type: "image", assetId: a.id, fit: "cover", blur: 0, opacity: 1 });
            e.target.value = "";
          }}
        />
      </Section>
    </>
  );
}

/* ------------------------------- stock photos --------------------------------
   PostSpark ships Unsplash; we use Lorem Picsum (keyless, CORS-open). Clicking
   fetches the full-res photo and registers it as a LOCAL asset. */

const STOCK_IDS = [1015, 1016, 1018, 1036, 1039, 1043, 1053, 1080];

function StockPhotos({ onPick }: { onPick: (assetId: string) => void }) {
  const [loading, setLoading] = useState<number | null>(null);
  const pick = async (id: number) => {
    if (loading) return;
    setLoading(id);
    try {
      const res = await fetch(`https://picsum.photos/id/${id}/1920/1280`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const asset = await ingestFile(new File([blob], `stock-${id}.jpg`, { type: "image/jpeg" }));
      onPick(asset.id);
    } catch {
      /* offline — thumbnails simply won't apply */
    } finally {
      setLoading(null);
    }
  };
  return (
    <div className="mb-4">
      <p className="mb-2 text-[13px] font-bold text-[#17171c]">Photos</p>
      <div className="grid grid-cols-4 gap-2">
        {STOCK_IDS.map((id) => (
          <button
            key={id}
            onClick={() => pick(id)}
            className={`fk-tile relative h-12 overflow-hidden rounded-xl border border-[#e4e4ec] ${loading === id ? "opacity-60" : ""}`}
            title="Stock photo"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://picsum.photos/id/${id}/120/80`} alt="" loading="lazy" className="h-full w-full object-cover" />
            {loading === id && <span className="absolute inset-0 grid place-items-center bg-black/30 text-[10px] font-bold text-white">…</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

/* --------------------------- canvas border section --------------------------- */

function BorderDetail() {
  const scene = useSceneStore((s) => s.scene);
  const setScene = useSceneStore((s) => s.setScene);
  const { cornerRadius = 0, border } = scene.canvas;
  const patchCanvas = (p: Partial<typeof scene.canvas>) =>
    setScene((s) => ({ ...s, canvas: { ...s.canvas, ...p } }));

  return (
    <div className="pb-2">
      <SliderRow
        label="Corner radius"
        value={cornerRadius}
        min={0}
        max={200}
        format={(v) => `${Math.round(v)}px`}
        onChange={(v) => patchCanvas({ cornerRadius: v || undefined })}
      />
      <SliderRow
        label="Border width"
        value={border?.width ?? 0}
        min={0}
        max={60}
        format={(v) => (v === 0 ? "off" : `${Math.round(v)}px`)}
        onChange={(width) =>
          patchCanvas({ border: width > 0 ? { width, color: border?.color ?? "#ffffff" } : undefined })
        }
      />
      {border && border.width > 0 && (
        <ColorRow
          label="Border color"
          value={border.color}
          onChange={(color) => patchCanvas({ border: { ...border, color } })}
        />
      )}
      {cornerRadius > 0 && (
        <p className="text-[11px] text-[#9a9aa4]">PNG/WebP exports keep transparent corners.</p>
      )}
    </div>
  );
}

/* ----------------------------- backdrop section ------------------------------ */
/* Scene-wide decoration that applies to ANY scene (PostSpark's Backdrop panel):
   a repeating Pattern behind the subject, a cast light/shadow Overlay on top,
   and a Portrait depth treatment. All pure CSS/SVG → export-safe. */

type PatternKind = NonNullable<Backdrop["pattern"]>["kind"];
type OverlayKind = NonNullable<Backdrop["overlay"]>["kind"];

const PATTERN_KINDS: { id: PatternKind; label: string }[] = [
  { id: "circles", label: "Circles" },
  { id: "waves", label: "Waves" },
  { id: "dots", label: "Dots" },
  { id: "rays", label: "Rays" },
  { id: "grid", label: "Grid" },
  { id: "stripes", label: "Stripes" },
  { id: "noise", label: "Noise" },
];

const OVERLAY_KINDS: { id: OverlayKind; label: string }[] = [
  { id: "blinds", label: "Blinds" },
  { id: "leaves", label: "Leaves" },
  { id: "branch", label: "Branch" },
  { id: "palm", label: "Palm" },
  { id: "window-grid", label: "Panes" },
  { id: "window", label: "Window" },
  { id: "diagonal", label: "Streak" },
  { id: "spotlight", label: "Spotlight" },
  { id: "top-light", label: "Top light" },
];

/** Strip a backdrop layer's absolute positioning so it can tile a demo swatch. */
function demoStyle(s: React.CSSProperties): React.CSSProperties {
  return { ...s, position: "relative", inset: undefined, opacity: 1 };
}

/** Shared canvas.backdrop patcher. */
function useBackdrop() {
  const scene = useSceneStore((s) => s.scene);
  const setScene = useSceneStore((s) => s.setScene);
  const patch = (b: Backdrop) => setScene((s) => ({ ...s, canvas: { ...s.canvas, backdrop: { ...s.canvas.backdrop, ...b } } }));
  return { backdrop: scene.canvas.backdrop, patch };
}

function PatternDetail() {
  const { backdrop, patch } = useBackdrop();
  const pattern = backdrop?.pattern;
  const setPattern = (kind: PatternKind) =>
    patch({ pattern: pattern?.kind === kind ? undefined : { kind, intensity: 0.5, thickness: 0.5, color: "#5b6472" } });
  return (
    <div className="pb-2">
      <div className="grid grid-cols-3 gap-1.5">
        {PATTERN_KINDS.map((k) => {
          const active = pattern?.kind === k.id;
          return (
            <button
              key={k.id}
              onClick={() => setPattern(k.id)}
              className={`fk-tile rounded-lg border bg-white p-1 ${active ? "border-[#17171c] shadow-[0_0_0_1.5px_#17171c]" : "border-[#e8e8ef]"}`}
            >
              <span className="block h-10 rounded-md border border-black/5 bg-[#eef0f4]" style={demoStyle(patternStyle({ kind: k.id, intensity: 1, thickness: 0.5, color: "#5b6472" }))} />
              <span className="mt-0.5 block text-center text-[9.5px] font-medium text-[#6b6b76]">{k.label}</span>
            </button>
          );
        })}
      </div>
      {pattern && (
        <div className="mt-3">
          <SliderRow label="Intensity" value={pattern.intensity} min={0.05} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => patch({ pattern: { ...pattern, intensity: v } })} />
          <div className="mt-2">
            <SliderRow label="Thickness" value={pattern.thickness} min={0} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => patch({ pattern: { ...pattern, thickness: v } })} />
          </div>
          <div className="mt-2">
            <ColorRow label="Color" value={pattern.color} onChange={(color) => patch({ pattern: { ...pattern, color } })} />
          </div>
        </div>
      )}
    </div>
  );
}

function OverlayDetail() {
  const { backdrop, patch } = useBackdrop();
  const overlay = backdrop?.overlay;
  const setOverlay = (kind: OverlayKind) =>
    patch({ overlay: overlay?.kind === kind ? undefined : { kind, intensity: 0.6 } });
  return (
    <div className="pb-2">
      <div className="grid grid-cols-3 gap-1.5">
        {OVERLAY_KINDS.map((k) => {
          const active = overlay?.kind === k.id;
          return (
            <button
              key={k.id}
              onClick={() => setOverlay(k.id)}
              className={`fk-tile rounded-lg border p-1 ${active ? "border-[#17171c] shadow-[0_0_0_1.5px_#17171c]" : "border-[#e8e8ef]"}`}
              style={{ background: "linear-gradient(135deg,#8a8fb0,#c7cad8)" }}
            >
              <span className="block h-10 rounded-md" style={demoStyle(overlayStyle({ kind: k.id, intensity: 1 }))} />
              <span className="mt-0.5 block text-center text-[9.5px] font-medium text-white/90">{k.label}</span>
            </button>
          );
        })}
      </div>
      {overlay && (
        <div className="mt-3">
          <SliderRow label="Intensity" value={overlay.intensity} min={0.05} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => patch({ overlay: { ...overlay, intensity: v } })} />
        </div>
      )}
    </div>
  );
}

function PortraitDetail() {
  const { backdrop, patch } = useBackdrop();
  const portrait = backdrop?.portrait;
  const setPortrait = (mode: "none" | "blur" | "stage") =>
    patch({ portrait: mode === "none" ? undefined : { mode, position: portrait?.position ?? 50, distance: portrait?.distance ?? 45 } });
  return (
    <div className="pb-2">
      <Seg
        id="backdrop-portrait"
        options={[
          { value: "none", label: "None" },
          { value: "blur", label: "Blur" },
          { value: "stage", label: "Stage" },
        ]}
        value={portrait?.mode ?? "none"}
        onChange={(v) => setPortrait(v as "none" | "blur" | "stage")}
      />
      {portrait && (
        <div className="mt-2.5">
          <SliderRow label="Position" value={portrait.position} min={0} max={100} format={(v) => `${Math.round(v)}%`} onChange={(v) => patch({ portrait: { ...portrait, position: v } })} />
          <div className="mt-2">
            <SliderRow label={portrait.mode === "blur" ? "Blur amount" : "Spread"} value={portrait.distance} min={0} max={100} format={(v) => `${Math.round(v)}%`} onChange={(v) => patch({ portrait: { ...portrait, distance: v } })} />
          </div>
        </div>
      )}
      {!portrait && (
        <p className="mt-2 text-[11px] leading-relaxed text-[#9a9aa4]">
          Blur adds cinematic depth-of-field around a focal point; Stage puts your subject in a spotlight.
        </p>
      )}
    </div>
  );
}

/* ------------------------------ effects section ----------------------------- */

const EFFECT_DEFAULTS = {
  noise: { type: "noise", intensity: 0.5, monochrome: true },
  grain: { type: "grain", intensity: 0.5, seed: 7 },
  vignette: { type: "vignette", intensity: 0.45, color: "#000000" },
} satisfies Record<string, Effect>;

type EffectKey = keyof typeof EFFECT_DEFAULTS;

/** PostSpark's Effects popover: Blur / Noise / Saturation / Opacity sliders on
 *  the BACKDROP only (devices stay crisp), plus the film-texture toggles. */
function EffectsDetail() {
  const scene = useSceneStore((s) => s.scene);
  const setScene = useSceneStore((s) => s.setScene);
  const filter = scene.canvas.backdrop?.filter;
  const noiseFx = scene.canvas.effects?.find((e) => e.type === "noise");

  const patchFilter = (p: Partial<{ blur: number; saturation: number; opacity: number }>) =>
    setScene((s) => {
      const cur = s.canvas.backdrop?.filter ?? { blur: 0, saturation: 1, opacity: 1 };
      const next = { ...cur, ...p };
      const neutral = next.blur === 0 && next.saturation === 1 && next.opacity === 1;
      return { ...s, canvas: { ...s.canvas, backdrop: { ...s.canvas.backdrop, filter: neutral ? undefined : next } } };
    });

  const setNoise = (intensity: number) =>
    setScene((s) => {
      const list = (s.canvas.effects ?? []).filter((e) => e.type !== "noise");
      const next = intensity > 0 ? [...list, { type: "noise" as const, intensity, monochrome: true }] : list;
      return { ...s, canvas: { ...s.canvas, effects: next } };
    });
  const effects = scene.canvas.effects ?? [];
  const get = (t: Effect["type"]) => effects.find((e) => e.type === t);

  const toggle = (t: EffectKey) =>
    setScene((s) => {
      const list = s.canvas.effects ?? [];
      const next = list.some((e) => e.type === t)
        ? list.filter((e) => e.type !== t)
        : [...list, EFFECT_DEFAULTS[t]];
      return { ...s, canvas: { ...s.canvas, effects: next } };
    });

  const setIntensity = (t: Effect["type"], intensity: number) =>
    setScene((s) => ({
      ...s,
      canvas: {
        ...s.canvas,
        effects: (s.canvas.effects ?? []).map((e) =>
          e.type === t && "intensity" in e ? { ...e, intensity } : e
        ),
      },
    }));

  const CARDS: { id: EffectKey; label: string; demo: React.CSSProperties }[] = [
    {
      id: "grain",
      label: "Grain",
      demo: { backgroundImage: noiseTile(7, 0.22), backgroundColor: "#b9bdca" },
    },
    {
      id: "vignette",
      label: "Vignette",
      demo: { background: "radial-gradient(circle at center, #d9dbe4 30%, #3c3f4c 130%)" },
    },
  ];

  return (
    <div className="pb-2">
      {/* backdrop sliders — PostSpark's Effects panel */}
      <SliderRow label="Blur" value={filter?.blur ?? 0} min={0} max={40} format={(v) => `${Math.round(v)}px`} onChange={(blur) => patchFilter({ blur: Math.round(blur) })} />
      <SliderRow label="Noise" value={(noiseFx?.intensity ?? 0) * 100} min={0} max={100} format={(v) => `${Math.round(v)}%`} onChange={(v) => setNoise(v / 100)} />
      <SliderRow label="Saturation" value={(filter?.saturation ?? 1) * 100} min={0} max={300} format={(v) => `${Math.round(v)}%`} onChange={(v) => patchFilter({ saturation: v / 100 })} />
      <SliderRow label="Opacity" value={(filter?.opacity ?? 1) * 100} min={0} max={100} format={(v) => `${Math.round(v)}%`} onChange={(v) => patchFilter({ opacity: v / 100 })} />
      <p className="mb-1.5 mt-3 text-[10px] font-semibold uppercase tracking-wider text-[#9a9aa4]">Film texture</p>
      <div className="grid grid-cols-3 gap-2">
        {CARDS.map((c) => {
          const active = !!get(c.id);
          return (
            <button
              key={c.id}
              onClick={() => toggle(c.id)}
              className={`fk-tile rounded-xl border bg-white p-1.5 ${
                active ? "border-[#17171c] shadow-[0_0_0_1.5px_#17171c]" : "border-[#e8e8ef]"
              }`}
            >
              <span className="block h-12 rounded-lg border border-black/5" style={c.demo} />
              <span className="mt-1 block text-center text-[10.5px] font-medium text-[#6b6b76]">{c.label}</span>
            </button>
          );
        })}
      </div>
      {CARDS.filter((c) => get(c.id)).map((c) => {
        const fx = get(c.id)!;
        const intensity = "intensity" in fx ? fx.intensity : 0;
        return (
          <div key={c.id} className="mt-3">
            <SliderRow
              label={`${c.label} intensity`}
              value={intensity}
              min={0.05}
              max={1}
              step={0.01}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => setIntensity(c.id, v)}
            />
          </div>
        );
      })}
    </div>
  );
}

/* ----------------------------- scene light detail ---------------------------- */
/* One light angle applied scene-wide keeps multi-device shadows coherent —
   the quality tell that separates premium output from pasted-together frames. */

// Kept out of the editor UI while scene-light direction is intentionally deferred.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LightDetail() {
  const scene = useSceneStore((s) => s.scene);
  const setScene = useSceneStore((s) => s.setScene);
  const shadowed = scene.layers.filter(
    (l): l is MockupLayer => l.type === "mockup" && l.shadow !== null
  );
  if (shadowed.length === 0)
    return <p className="pb-2 text-[11px] leading-relaxed text-[#9a9aa4]">Add a device with a shadow to control the scene light.</p>;
  const angle = shadowed[0].shadow!.lightAngle;

  return (
    <div className="pb-2">
      <SliderRow
        label="Light angle · syncs all shadows"
        value={angle}
        min={0}
        max={360}
        format={(v) => `${Math.round(v)}°`}
        onChange={(lightAngle) =>
          setScene((s) => ({
            ...s,
            layers: s.layers.map((l) =>
              l.type === "mockup" && l.shadow ? { ...l, shadow: { ...l.shadow, lightAngle } } : l
            ),
          }))
        }
      />
    </div>
  );
}

/* ------------------------------- size selector ------------------------------ */

const BRAND_ICONS: Record<string, { Icon: React.ComponentType<{ size?: number; color?: string }>; color: string }> = {
  instagram: { Icon: SiInstagram, color: "#E4405F" },
  x: { Icon: SiX, color: "#111111" },
  youtube: { Icon: SiYoutube, color: "#FF0000" },
  pinterest: { Icon: SiPinterest, color: "#BD081C" },
  dribbble: { Icon: SiDribbble, color: "#EA4C89" },
  appstore: { Icon: SiAppstore, color: "#0D96F6" },
};

/** aspect-correct little shape for a ratio tile */
function RatioShape({ w, h, children }: { w: number; h: number; children?: React.ReactNode }) {
  const ar = w / h;
  const box = ar >= 1 ? { width: 56, height: Math.max(20, 56 / ar) } : { width: Math.max(24, 60 * ar), height: 60 };
  return (
    <span className="grid h-[72px] w-full place-items-center">
      <span
        className="grid place-items-center rounded-lg border border-[#d8d8e2] bg-[#f0f0f5]"
        style={box}
      >
        {children}
      </span>
    </span>
  );
}

function SizeSelector() {
  const scene = useSceneStore((s) => s.scene);
  const setScene = useSceneStore((s) => s.setScene);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const { width, height } = scene.canvas;
  const active = findSizePreset(width, height);
  const setSize = (w: number, h: number) =>
    setScene((s) => ({
      ...s,
      canvas: {
        ...s.canvas,
        width: Math.max(64, Math.min(8192, Math.round(w) || 64)),
        height: Math.max(64, Math.min(8192, Math.round(h) || 64)),
      },
    }));

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node) && !popRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const Tile = ({ preset, brand }: { preset: SizePreset; brand?: string }) => {
    const selected = width === preset.width && height === preset.height;
    const brandIcon = brand ? BRAND_ICONS[brand] : undefined;
    return (
      <button
        onClick={() => setSize(preset.width, preset.height)}
        className={`fk-tile rounded-xl border bg-white p-1.5 pb-2 ${
          selected ? "border-[#17171c] shadow-[0_0_0_1.5px_#17171c]" : "border-[#e8e8ef]"
        }`}
        title={`${preset.width} × ${preset.height}`}
      >
        <RatioShape w={preset.width} h={preset.height}>
          {brandIcon && <brandIcon.Icon size={14} color={brandIcon.color} />}
        </RatioShape>
        <span className="block truncate text-center text-[11px] font-semibold text-[#17171c]">
          {preset.label}
        </span>
        <span className="block text-center text-[10px] tabular-nums text-[#9a9aa4]">{preset.ratio}</span>
      </button>
    );
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => {
          if (!open && rootRef.current) {
            const r = rootRef.current.getBoundingClientRect();
            setAnchor({ x: r.left, y: r.bottom + 8 });
          }
          setOpen((v) => !v);
        }}
        className="fk-tile flex w-full items-center gap-3 rounded-2xl border border-[#e4e4ec] bg-white px-3 py-2.5 text-left"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center">
          <span
            className="rounded-md border border-[#d8d8e2] bg-[#f2f2f7]"
            style={
              width >= height
                ? { width: 34, height: Math.max(14, 34 * (height / width)) }
                : { width: Math.max(14, 34 * (width / height)), height: 34 }
            }
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-[#17171c]">
            {active ? (active.label === active.ratio ? active.label : `${active.label} · ${active.ratio}`) : "Custom"}
          </span>
          <span className="block text-[11px] tabular-nums text-[#9a9aa4]">
            {width} × {height}
          </span>
        </span>
        <ChevronDown size={15} className="text-[#9a9aa4]" />
      </button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && anchor && (
              <div ref={popRef} style={{ position: "fixed", left: anchor.x, top: anchor.y, zIndex: 80 }}>
                <Popover className="w-[350px] p-3" style={{ position: "relative" }}>
                  {/* custom dimensions */}
                  <div className="mb-3 flex items-center gap-2">
                    {(
                      [
                        ["W", width, (v: number) => setSize(v, height)],
                        ["H", height, (v: number) => setSize(width, v)],
                      ] as const
                    ).map(([label, value, apply]) => (
                      <label
                        key={label}
                        className="flex flex-1 items-center gap-2 rounded-xl border border-[#e4e4ec] bg-white px-3 py-2"
                      >
                        <span className="text-[11px] font-semibold text-[#9a9aa4]">{label}</span>
                        <input
                          type="number"
                          value={value}
                          min={64}
                          max={8192}
                          onChange={(e) => apply(Number(e.target.value))}
                          className="w-full bg-transparent text-[13px] font-semibold tabular-nums text-[#17171c] focus:outline-none"
                        />
                      </label>
                    ))}
                    <button
                      title="Swap width and height"
                      onClick={() => setSize(height, width)}
                      className="fk-press grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#e4e4ec] bg-white text-[#6b6b76] hover:border-[#c9c9d4]"
                    >
                      <ArrowUpDown size={14} />
                    </button>
                  </div>

                  <div className="panel-scroll -mr-1 max-h-[58vh] overflow-y-auto pr-1">
                    {SIZE_CATEGORIES.map((cat) => {
                      const brandIcon = cat.brand ? BRAND_ICONS[cat.brand] : undefined;
                      return (
                        <div key={cat.id} className="mb-1 border-b border-[#ececf2] pb-3 pt-2 last:border-b-0">
                          {cat.label && (
                            <p className="mb-2 flex items-center gap-2 text-[13px] font-bold text-[#17171c]">
                              {brandIcon && <brandIcon.Icon size={15} color={brandIcon.color} />}
                              {cat.label}
                            </p>
                          )}
                          <div className="grid grid-cols-3 gap-2">
                            {cat.presets.map((preset) => (
                              <Tile key={preset.id} preset={preset} brand={cat.brand} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Popover>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
