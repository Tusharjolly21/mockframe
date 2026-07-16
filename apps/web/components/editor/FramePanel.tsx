"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence } from "motion/react";
import type { Background, Backdrop, Effect, MockupLayer } from "@framekit/scene";
import { backgroundToCss, noiseTile, overlayStyle, patternStyle } from "@framekit/renderer";
import { Aperture, ArrowLeft, ArrowUpDown, Ban, Check, ChevronDown, Grid3x3, Image as ImageIcon, Lock, Pipette, Search, SlidersHorizontal, Sparkles, Square, Sun, X } from "lucide-react";
import {
  SiAppstore,
  SiDribbble,
  SiPinterest,
  SiYoutube,
} from "@icons-pack/react-simple-icons";
import { findSizePreset, SIZE_CATEGORIES, type SizePreset } from "@/lib/canvasSizes";
import { ingestFile, resolveAsset } from "@/lib/assets";
import { BG_CATEGORIES, isProBgCategory, magicSwatches, type BgSwatch } from "@/lib/backgrounds";
import { openUpgrade, useIsPro } from "@/lib/billing/gate";
import { extractPalette } from "@/lib/palette";
import { useSceneStore, useViewStore } from "@/lib/store";
import { ColorRow, Popover, Section, Seg, SliderRow } from "./ui";
import { InstagramBrandIcon, XBrandIcon } from "@/components/SocialBrandIcon";

/* PostSpark-style hub → detail navigation: the Frame tab shows a compact hub
   (size, background, one "Style" chip grid); each style feature opens its own
   focused sub-view with a back header. Kills the mile-long scroll. */
type FrameView = "hub" | "background" | "pattern" | "overlay" | "portrait" | "effects" | "border";

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
  // previous look, so the transparent-background toggle is reversible
  const stashRef = useRef<{ background: Background; backdrop?: Backdrop; effects?: Effect[] } | null>(null);
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
      background: "Background library",
      overlay: "Overlay · light & shadow",
      effects: "Effects",
      pattern: "Pattern",
      portrait: "Portrait · depth",
      border: "Border",
    };
    return (
      <DetailView label={labels[view]} onBack={() => setView("hub")}>
        {view === "background" && <BackgroundDetail />}
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

  // "Transparent background" — remove the whole canvas behind the device so
  // the export is just the mockup (browser / code / any device) on
  // transparency. Clears the backdrop + effects too, and stashes the previous
  // look so toggling back off restores it.
  const isClean =
    bg.type === "transparent" && !backdrop?.pattern && !backdrop?.overlay && !backdrop?.portrait && !(scene.canvas.effects?.length);
  const toggleTransparent = () => {
    setScene((s) => {
      if (isClean) {
        const prev = stashRef.current;
        return {
          ...s,
          canvas: {
            ...s.canvas,
            background: prev?.background ?? { type: "mesh-gradient", seed: 7, colors: ["#6d28d9", "#4f46e5", "#0e7490"] },
            backdrop: prev?.backdrop,
            effects: prev?.effects,
          },
        };
      }
      stashRef.current = { background: s.canvas.background, backdrop: s.canvas.backdrop, effects: s.canvas.effects };
      return { ...s, canvas: { ...s.canvas, background: { type: "transparent" }, backdrop: undefined, effects: undefined } };
    });
  };

  return (
    <>
      <div className="px-3 pt-1">
        <SizeSelector />
      </div>

      {/* Transparent-canvas toggle — export the device alone on transparency */}
      <div className="px-4 pt-4">
        <button
          onClick={toggleTransparent}
          role="switch"
          aria-checked={isClean}
          className={`fk-press flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left ${
            isClean ? "border-[#17171c] bg-[#f4f4f8]" : "border-[#e4e4ec] bg-white hover:border-[#c9c9d4]"
          }`}
        >
          <span
            className="h-6 w-6 shrink-0 rounded-md border border-black/10"
            style={{
              backgroundImage:
                "linear-gradient(45deg,#d4d4dc 25%,transparent 25%),linear-gradient(-45deg,#d4d4dc 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#d4d4dc 75%),linear-gradient(-45deg,transparent 75%,#d4d4dc 75%)",
              backgroundSize: "8px 8px",
              backgroundPosition: "0 0,0 4px,4px -4px,-4px 0",
              backgroundColor: "#fff",
            }}
          />
          <span className="min-w-0 flex-1">
            <span className="block text-[12.5px] font-semibold text-[#17171c]">Transparent background</span>
            <span className="block text-[10.5px] leading-tight text-[#9a9aa4]">Export just the device — no canvas behind it</span>
          </span>
          <span
            className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2 ${
              isClean ? "border-[#17171c] bg-[#17171c] text-white" : "border-[#d4d4de]"
            }`}
          >
            {isClean && <Check size={11} strokeWidth={3.5} />}
          </span>
        </button>
      </div>

      {/* Style hub — each chip opens a focused sub-view (PostSpark Backdrop) */}
      <div className="px-4 pt-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#8a8a94]">Style</p>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => setView("background")}
            className="fk-press flex items-center gap-1.5 rounded-full border border-[#e4e4ec] bg-white px-3 py-2 text-[12px] font-semibold text-[#3c3c46] hover:border-[#c9c9d4]"
          >
            <ImageIcon size={14} />
            Backgrounds
          </button>
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

      <Section title="Background" collapsible defaultOpen={false}>
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
        <UnsplashPhotos
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
        {/* Panorama Background Toggle */}
        <div className="mt-4 pt-3 border-t border-[#ececf2] flex items-center justify-between">
          <span>
            <span className="block text-xs font-semibold text-[#17171c]">Panorama Background</span>
            <span className="block text-[10px] text-[#9a9aa4]">Aligns background continuously across all batch slides</span>
          </span>
          <button
            onClick={() => {
              setScene((s) => ({
                ...s,
                canvas: {
                  ...s.canvas,
                  panoramaBackground: !s.canvas.panoramaBackground,
                },
              }));
            }}
            className={`fk-press rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
              scene.canvas.panoramaBackground
                ? "bg-[#17171c] text-white"
                : "border border-[#e4e4ec] bg-white text-[#6b6b76]"
            }`}
          >
            {scene.canvas.panoramaBackground ? "Enabled" : "Disabled"}
          </button>
        </div>
      </Section>
    </>
  );
}

function BackgroundDetail() {
  const scene = useSceneStore((s) => s.scene);
  const setScene = useSceneStore((s) => s.setScene);
  const bumpAssets = useViewStore((s) => s.bumpAssets);
  const isPro = useIsPro();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"gradients" | "wallpapers" | "textures" | "all">("gradients");
  const bg = scene.canvas.background;
  const setBg = (background: Background) => setScene((s) => ({ ...s, canvas: { ...s.canvas, background } }));
  const categories = BG_CATEGORIES.filter((category) => {
    if (tab === "all") return true;
    if (tab === "textures") return category.id === "texture";
    if (tab === "wallpapers") return ["desktop", "abstract", "earth", "aurora", "bokeh", "grid"].includes(category.id);
    return ["gradient", "spectral", "prism", "radiant", "cosmic", "mystic", "glass", "refract", "topographic"].includes(category.id);
  });
  const swatchStyle = (swatch: BgSwatch): React.CSSProperties =>
    swatch.bg.type === "image"
      ? { backgroundImage: `url("${resolveAsset(swatch.bg.assetId)?.url ?? ""}")`, backgroundSize: "cover", backgroundPosition: "center" }
      : (backgroundToCss(swatch.bg) as React.CSSProperties);

  return (
    <div className="pb-2">
      <div className="mb-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => setBg({ type: "transparent" })}
          className={`fk-press rounded-xl border px-2 py-2 text-[11px] font-semibold ${bg.type === "transparent" ? "border-[#17171c] bg-[#17171c] text-white" : "border-[#e4e4ec] bg-white text-[#3c3c46]"}`}
        >
          No backdrop
        </button>
        <button onClick={() => fileRef.current?.click()} className="fk-press rounded-xl border border-[#e4e4ec] bg-white px-2 py-2 text-[11px] font-semibold text-[#3c3c46]">
          Upload image
        </button>
      </div>
      <Seg
        id="background-library"
        options={[
          { value: "gradients", label: "Gradients" },
          { value: "wallpapers", label: "Wallpapers" },
          { value: "textures", label: "Textures" },
          { value: "all", label: "All" },
        ]}
        value={tab}
        onChange={(value) => setTab(value as typeof tab)}
      />
      <div className="mb-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => {
            const first = BG_CATEGORIES.flatMap((category) => category.swatches)[0];
            if (first) setBg(first.bg);
          }}
          className="fk-press rounded-xl border border-[#e4e4ec] bg-white py-2 text-[11px] font-semibold"
        >
          <Sparkles size={13} className="mr-1 inline text-amber-500" /> Auto
        </button>
        <button
          onClick={() => {
            // free users shuffle only within unlocked collections, so Shuffle
            // never lands on a background they'd then be blocked from keeping
            const swatches = categories
              .filter((category) => isPro || !isProBgCategory(category.id))
              .flatMap((category) => category.swatches);
            const pick = swatches[Math.floor(Math.random() * swatches.length)];
            if (pick) setBg(pick.bg);
          }}
          className="fk-press rounded-xl border border-[#e4e4ec] bg-white py-2 text-[11px] font-semibold"
        >
          Shuffle
        </button>
      </div>
      {tab === "wallpapers" && (
        <UnsplashPhotos
          onPick={(assetId) => {
            bumpAssets();
            setBg({ type: "image", assetId, fit: "cover", blur: 0, opacity: 1 });
          }}
        />
      )}
      {categories.map((category) => {
        const locked = !isPro && isProBgCategory(category.id);
        return (
          <div key={category.id} className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="flex items-center gap-1 text-[12px] font-bold text-[#17171c]">
                {category.label}
                {locked && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-[#f3eaff] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#7c3aed]">
                    <Lock size={8} /> Pro
                  </span>
                )}
              </p>
              <span className="text-[10px] text-[#9a9aa4]">{category.swatches.length} styles</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {category.swatches.map((swatch) => {
                const active = JSON.stringify(swatch.bg) === JSON.stringify(bg);
                return (
                  <button
                    key={swatch.id}
                    onClick={() => (locked ? openUpgrade("Premium backgrounds") : setBg(swatch.bg))}
                    title={locked ? "Premium background — upgrade to use" : swatch.id}
                    className={`fk-tile relative h-14 rounded-xl border ${active ? "border-[#17171c] shadow-[0_0_0_1.5px_#17171c]" : "border-[#e4e4ec]"}`}
                    style={swatchStyle(swatch)}
                  >
                    {locked && (
                      <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm">
                        <Lock size={9} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          const asset = await ingestFile(file);
          bumpAssets();
          setBg({ type: "image", assetId: asset.id, fit: "cover", blur: 0, opacity: 1 });
          event.target.value = "";
        }}
      />
    </div>
  );
}

/* ------------------------------- Unsplash gallery ---------------------------
   Curated Unsplash CDN images keep the picker keyless for now. A selected image
   is downloaded and registered locally, so exports never depend on the CDN. */

const UNSPLASH_PHOTOS = [
  { id: "mountain-light", label: "Mountain light", photo: "photo-1519608487953-e999c86e7455" },
  { id: "blue-horizon", label: "Blue horizon", photo: "photo-1500534623283-312aade485b7" },
  { id: "forest-mist", label: "Forest mist", photo: "photo-1493246507139-91e8fad9978e" },
  { id: "ocean-glass", label: "Ocean glass", photo: "photo-1518837695005-2083093ee35b" },
  { id: "desert-dusk", label: "Desert dusk", photo: "photo-1500530855697-b586d89ba3ee" },
  { id: "lake-blue", label: "Lake blue", photo: "photo-1470770841072-f978cf4d019e" },
  { id: "tropical-shadow", label: "Tropical shadow", photo: "photo-1497250681960-ef046c08a56e" },
  { id: "fern-dark", label: "Fern dark", photo: "photo-1511497584788-876760111969" },
  { id: "coastal-blue", label: "Coastal blue", photo: "photo-1507525428034-b723cf961d3e" },
  { id: "architecture-shadow", label: "Architecture shadow", photo: "photo-1487958449943-2429e8be8625" },
  { id: "pink-sky", label: "Pink sky", photo: "photo-1499346030926-9a72daac6c63" },
  { id: "deep-sea", label: "Deep sea", photo: "photo-1469474968028-56623f02e42e" },
  { id: "snow-ridge", label: "Snow ridge", photo: "photo-1454496522488-7a8e488e8606" },
  { id: "warm-dunes", label: "Warm dunes", photo: "photo-1473580044384-7ba9967e16a0" },
  { id: "green-leaves", label: "Green leaves", photo: "photo-1441974231531-c6227db76b6e" },
  { id: "paper-texture", label: "Paper texture", photo: "photo-1517841905240-472988babdf9" },
  { id: "dark-stone", label: "Dark stone", photo: "photo-1518709268805-4e9042af9f23" },
  { id: "soft-cloud", label: "Soft cloud", photo: "photo-1534088568595-a066f410bcda" },
  { id: "blue-mist", label: "Blue mist", photo: "photo-1483347756197-71ef80e95f73" },
] as const;

/** Client shape mirroring lib/server/unsplash.ts UnsplashPhoto. */
interface UnsplashItem {
  id: string;
  thumb: string;
  regular: string;
  downloadLocation: string;
  color: string;
  alt: string;
  authorName: string;
  authorLink: string;
  photoLink: string;
}

/** Curated fallback used only when the API key is absent or unreachable — keeps
 *  the picker useful offline / before UNSPLASH_ACCESS_KEY is set. */
const FALLBACK_UNSPLASH: UnsplashItem[] = UNSPLASH_PHOTOS.map((p) => ({
  id: p.id,
  thumb: `https://images.unsplash.com/${p.photo}?auto=format&fit=crop&w=240&q=70`,
  regular: `https://images.unsplash.com/${p.photo}?auto=format&fit=crop&w=2400&q=88`,
  downloadLocation: "", // no live API → nothing to trigger
  color: "#e4e4ec",
  alt: p.label,
  authorName: "",
  authorLink: "",
  photoLink: `https://unsplash.com/?${"utm_source=MockFrame&utm_medium=referral"}`,
}));

function UnsplashPhotos({ onPick }: { onPick: (assetId: string) => void }) {
  const [query, setQuery] = useState("");
  const [photos, setPhotos] = useState<UnsplashItem[]>(FALLBACK_UNSPLASH);
  const [state, setState] = useState<"loading" | "ok" | "fallback" | "empty">("loading");
  const [applying, setApplying] = useState<string | null>(null);
  // the photo currently applied as the background — shown as a persistent
  // "Photo by X on Unsplash" credit (Unsplash API guidelines require visible,
  // linked attribution of both the photographer and Unsplash)
  const [credit, setCredit] = useState<UnsplashItem | null>(null);

  // debounced live search (editorial feed when the query is empty)
  useEffect(() => {
    let cancelled = false;
    setState("loading");
    const delay = query.trim() ? 350 : 0;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/unsplash?q=${encodeURIComponent(query.trim())}&page=1`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (data.configured === false || (!res.ok && !query.trim())) {
          setPhotos(FALLBACK_UNSPLASH);
          setState("fallback");
          return;
        }
        const list: UnsplashItem[] = Array.isArray(data.photos) ? data.photos : [];
        setPhotos(list);
        setState(list.length ? "ok" : "empty");
      } catch {
        if (!cancelled) {
          setPhotos(FALLBACK_UNSPLASH);
          setState("fallback");
        }
      }
    }, delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const applyPhoto = async (p: UnsplashItem) => {
    if (applying) return;
    setApplying(p.id);
    try {
      let url = p.regular;
      // guideline-required: register the download so the photographer is credited,
      // and use the canonical URL it returns
      if (p.downloadLocation) {
        const dl = await fetch("/api/unsplash/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ location: p.downloadLocation }),
        });
        if (dl.ok) {
          const dj = await dl.json().catch(() => ({}));
          if (dj.url) url = `${dj.url}${dj.url.includes("?") ? "&" : "?"}w=2400&q=88&fm=jpg&fit=max`;
        }
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const asset = await ingestFile(new File([blob], `unsplash-${p.id}.jpg`, { type: blob.type || "image/jpeg" }));
      onPick(asset.id);
      if (p.authorName) setCredit(p); // keep the applied photo's attribution on screen
    } catch {
      /* offline / blocked — the tile simply won't apply */
    } finally {
      setApplying(null);
    }
  };

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center gap-1.5 rounded-lg border border-[#e4e4ec] bg-white px-2">
        <Search size={13} className="shrink-0 text-[#9a9aa4]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Unsplash photos…"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-[12px] outline-none placeholder:text-[#b4b4bc]"
        />
        {query && (
          <button onClick={() => setQuery("")} title="Clear" className="shrink-0 text-[#9a9aa4] hover:text-[#17171c]">
            <X size={12} />
          </button>
        )}
      </div>

      {state === "empty" ? (
        <p className="py-4 text-center text-[11px] text-[#9a9aa4]">No photos for “{query.trim()}”.</p>
      ) : (
        <div className="grid grid-cols-3 gap-x-2 gap-y-1.5">
          {photos.map((p) => (
            <div key={p.id} className="flex flex-col">
              <button
                onClick={() => applyPhoto(p)}
                className={`fk-tile h-16 w-full overflow-hidden rounded-xl border border-[#e4e4ec] ${applying === p.id ? "opacity-60" : ""}`}
                title={p.authorName ? `Photo by ${p.authorName} on Unsplash` : `${p.alt} · Unsplash`}
                style={{ background: p.color }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.thumb} alt={p.alt} loading="lazy" className="h-full w-full object-cover" />
                {applying === p.id && (
                  <span className="absolute inset-0 grid place-items-center bg-black/30 text-[9px] font-bold text-white">Adding…</span>
                )}
              </button>
              {/* always-visible photographer credit (Unsplash API guideline) */}
              {p.authorName && (
                <a
                  href={p.authorLink}
                  target="_blank"
                  rel="noreferrer"
                  title={`Photo by ${p.authorName} on Unsplash`}
                  className="mt-0.5 block truncate px-0.5 text-[8.5px] leading-tight text-[#8a8a94] hover:text-[#17171c] hover:underline"
                >
                  {p.authorName}
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* canonical, always-visible attribution for the applied photo */}
      {credit && (
        <p className="mt-2.5 truncate text-center text-[10px] text-[#8a8a94]">
          Photo by{" "}
          <a href={credit.authorLink} target="_blank" rel="noreferrer" className="font-medium text-[#5a5a66] underline hover:text-[#17171c]">
            {credit.authorName}
          </a>{" "}
          on{" "}
          <a href={credit.photoLink} target="_blank" rel="noreferrer" className="font-medium text-[#5a5a66] underline hover:text-[#17171c]">
            Unsplash
          </a>
        </p>
      )}

      <p className="mt-1.5 text-center text-[10px] text-[#9a9aa4]">
        {state === "fallback" ? "Curated picks · " : "Photos from "}
        <a href={`https://unsplash.com/?${"utm_source=MockFrame&utm_medium=referral"}`} target="_blank" rel="noreferrer" className="underline hover:text-[#17171c]">
          Unsplash
        </a>
      </p>
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

type PatternConfig = NonNullable<Backdrop["pattern"]>;
type PatternKind = PatternConfig["kind"];
type OverlayKind = NonNullable<Backdrop["overlay"]>["kind"];

type PatternPreset = {
  id: string;
  label: string;
  kind: PatternKind;
  color: string;
  intensity: number;
  thickness: number;
  rotation: number;
  blur: number;
  blendMode: NonNullable<PatternConfig["blendMode"]>;
  seed: number;
  paletteSeed: number;
};

const PATTERN_PRESETS: PatternPreset[] = [
  { id: "circles", label: "Circles", kind: "circles", color: "#d8b4fe", intensity: 0.72, thickness: 0.52, rotation: 0, blur: 0, blendMode: "normal", seed: 17, paletteSeed: 0 },
  { id: "waves", label: "Waves", kind: "waves", color: "#60a5fa", intensity: 0.7, thickness: 0.46, rotation: 18, blur: 0, blendMode: "normal", seed: 23, paletteSeed: 0 },
  { id: "dots", label: "Dots", kind: "dots", color: "#60a5fa", intensity: 0.72, thickness: 0.46, rotation: 0, blur: 0, blendMode: "normal", seed: 29, paletteSeed: 0 },
  { id: "harmony", label: "Harmony", kind: "harmony", color: "#93c5fd", intensity: 0.68, thickness: 0.55, rotation: 0, blur: 0, blendMode: "normal", seed: 37, paletteSeed: 1 },
  { id: "grid", label: "Grid", kind: "grid", color: "#ffffff", intensity: 0.58, thickness: 0.5, rotation: 0, blur: 0, blendMode: "normal", seed: 41, paletteSeed: 0 },
  { id: "sight", label: "Sight", kind: "sight", color: "#dbeafe", intensity: 0.74, thickness: 0.44, rotation: 0, blur: 0, blendMode: "normal", seed: 43, paletteSeed: 0 },
  { id: "chimes", label: "Chimes", kind: "chimes", color: "#dbeafe", intensity: 0.78, thickness: 0.48, rotation: 0, blur: 0, blendMode: "screen", seed: 59, paletteSeed: 2 },
  { id: "diamonds", label: "Diamonds", kind: "diamonds", color: "#d8b4fe", intensity: 0.72, thickness: 0.54, rotation: 0, blur: 0, blendMode: "normal", seed: 71, paletteSeed: 0 },
  { id: "mixed-shapes", label: "Mixed Shapes", kind: "mixed-shapes", color: "#d8b4fe", intensity: 0.72, thickness: 0.52, rotation: 0, blur: 0, blendMode: "normal", seed: 83, paletteSeed: 0 },
  { id: "confetti", label: "Confetti", kind: "confetti", color: "#c4b5fd", intensity: 0.76, thickness: 0.5, rotation: 0, blur: 0, blendMode: "normal", seed: 97, paletteSeed: 0 },
];

const OVERLAY_PRESETS: Array<{ id: string; label: string; kind: OverlayKind; intensity: number }> = [
  { id: "overlay-window-soft", label: "Window soft", kind: "window", intensity: 0.42 },
  { id: "overlay-window-hard", label: "Window hard", kind: "window", intensity: 0.78 },
  { id: "overlay-panes", label: "Panes", kind: "window-grid", intensity: 0.42 },
  { id: "overlay-panes-deep", label: "Panes deep", kind: "window-grid", intensity: 0.72 },
  { id: "overlay-diagonal", label: "Diagonal", kind: "diagonal", intensity: 0.48 },
  { id: "overlay-streak", label: "Streak", kind: "diagonal", intensity: 0.78 },
  { id: "overlay-blinds-light", label: "Blinds light", kind: "blinds", intensity: 0.32 },
  { id: "overlay-blinds-deep", label: "Blinds deep", kind: "blinds", intensity: 0.68 },
  { id: "overlay-spot-left", label: "Spot left", kind: "spotlight", intensity: 0.5 },
  { id: "overlay-spot-right", label: "Spot right", kind: "spotlight", intensity: 0.82 },
  { id: "overlay-top-light", label: "Top light", kind: "top-light", intensity: 0.48 },
  { id: "overlay-top-glow", label: "Top glow", kind: "top-light", intensity: 0.82 },
  { id: "overlay-leaves-soft", label: "Leaves soft", kind: "leaves", intensity: 0.36 },
  { id: "overlay-leaves-deep", label: "Leaves deep", kind: "leaves", intensity: 0.7 },
  { id: "overlay-branch-soft", label: "Branch soft", kind: "branch", intensity: 0.34 },
  { id: "overlay-branch-deep", label: "Branch deep", kind: "branch", intensity: 0.66 },
  { id: "overlay-palm-soft", label: "Palm soft", kind: "palm", intensity: 0.36 },
  { id: "overlay-palm-deep", label: "Palm deep", kind: "palm", intensity: 0.7 },
];

/** Strip a backdrop layer's absolute positioning so it can tile a demo swatch. */
function demoStyle(s: React.CSSProperties): React.CSSProperties {
  return { ...s, position: "relative", inset: undefined, opacity: 1, mixBlendMode: "normal" };
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
  const setPattern = (preset: PatternPreset) => {
    const { id: _, label: __, ...nextPattern } = preset;
    patch({ pattern: nextPattern });
  };
  const randomizedKinds = new Set<PatternKind>(["circles", "dots", "sight", "diamonds", "mixed-shapes", "confetti"]);
  return (
    <div className="pb-2">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[10.5px] leading-relaxed text-[#9a9aa4]">Ten full-canvas patterns. Every style stays sharp at any export size.</p>
        {pattern && (
          <button onClick={() => patch({ pattern: undefined })} className="fk-press shrink-0 rounded-lg border border-[#e5e5ec] bg-white px-2 py-1 text-[10px] font-semibold text-[#666672]">
            Remove
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {PATTERN_PRESETS.map((preset) => {
          const active = pattern?.kind === preset.kind;
          const { id: _, label: __, ...previewPattern } = preset;
          return (
            <button
              key={preset.id}
              onClick={() => setPattern(preset)}
              className={`fk-tile rounded-xl border bg-white p-1 ${active ? "border-[#17171c] shadow-[0_0_0_1.5px_#17171c]" : "border-[#e8e8ef]"}`}
            >
              <span className="block h-[72px] rounded-lg border border-black/5 bg-[#83b5e8]" style={demoStyle(patternStyle(previewPattern))} />
              <span className="mt-1 block truncate px-1 text-left text-[10px] font-semibold text-[#54545f]">{preset.label}</span>
            </button>
          );
        })}
      </div>
      {pattern && (
        <div className="mt-3 rounded-xl border border-[#e8e8ef] bg-[#fafafd] p-3">
          <SliderRow label="Opacity" value={pattern.intensity} min={0.05} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => patch({ pattern: { ...pattern, intensity: v } })} />
          <div className="mt-3">
            <SliderRow label="Shape size" value={pattern.thickness} min={0} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => patch({ pattern: { ...pattern, thickness: v } })} />
          </div>
          <div className="mt-3">
            <SliderRow label="Rotation" value={pattern.rotation ?? 0} min={-180} max={180} step={1} format={(v) => `${Math.round(v)}°`} onChange={(v) => patch({ pattern: { ...pattern, rotation: v } })} />
          </div>
          <div className="mt-3">
            <SliderRow label="Blur" value={pattern.blur ?? 0} min={0} max={30} step={1} format={(v) => `${Math.round(v)} px`} onChange={(v) => patch({ pattern: { ...pattern, blur: v } })} />
          </div>
          <div className="mt-3">
            <ColorRow label="Color" value={pattern.color} onChange={(color) => patch({ pattern: { ...pattern, color } })} />
          </div>
          <label className="mt-3 flex items-center justify-between gap-3 text-[11px] font-semibold text-[#666672]">
            Blending
            <select
              value={pattern.blendMode ?? "normal"}
              onChange={(event) => patch({ pattern: { ...pattern, blendMode: event.target.value as NonNullable<PatternConfig["blendMode"]> } })}
              className="h-8 min-w-28 rounded-lg border border-[#ddddE7] bg-white px-2 text-[11px] font-semibold text-[#34343c] outline-none focus:border-[#17171c]"
            >
              <option value="normal">Normal</option>
              <option value="overlay">Overlay</option>
              <option value="soft-light">Soft light</option>
              <option value="multiply">Multiply</option>
              <option value="screen">Screen</option>
            </select>
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => patch({ pattern: { ...pattern, paletteSeed: (pattern.paletteSeed ?? 0) + 1 } })}
              className="fk-press flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#ddddE7] bg-white px-2 text-[10.5px] font-semibold text-[#4c4c57]"
            >
              <Pipette size={13} /> Colors
            </button>
            <button
              disabled={!randomizedKinds.has(pattern.kind)}
              onClick={() => patch({ pattern: { ...pattern, seed: Math.floor(Math.random() * 2_000_000_000) } })}
              className="fk-press flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#ddddE7] bg-white px-2 text-[10.5px] font-semibold text-[#4c4c57] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowUpDown size={13} /> Positions
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function OverlayDetail() {
  const { backdrop, patch } = useBackdrop();
  const overlay = backdrop?.overlay;
  const setOverlay = (preset: (typeof OVERLAY_PRESETS)[number]) =>
    patch({ overlay: overlay?.kind === preset.kind && overlay.intensity === preset.intensity ? undefined : { kind: preset.kind, intensity: preset.intensity } });
  return (
    <div className="pb-2">
      <p className="mb-2 text-[10.5px] leading-relaxed text-[#9a9aa4]">Add realistic window light, foliage shadows, blinds, or soft studio streaks over the scene.</p>
      <div className="grid grid-cols-3 gap-2">
        {OVERLAY_PRESETS.map((preset) => {
          const active = overlay?.kind === preset.kind && overlay.intensity === preset.intensity;
          return (
            <button
              key={preset.id}
              onClick={() => setOverlay(preset)}
              className={`fk-tile rounded-xl border p-1 ${active ? "border-[#17171c] shadow-[0_0_0_1.5px_#17171c]" : "border-[#e8e8ef]"}`}
              style={{ background: "linear-gradient(135deg,#8a8fb0,#c7cad8)" }}
            >
              <span className="block h-12 rounded-lg" style={demoStyle(overlayStyle({ kind: preset.kind, intensity: 1 }))} />
              <span className="mt-1 block truncate text-center text-[9.5px] font-medium text-white/90">{preset.label}</span>
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
  instagram: { Icon: InstagramBrandIcon, color: "#E4405F" },
  x: { Icon: XBrandIcon, color: "#111111" },
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
