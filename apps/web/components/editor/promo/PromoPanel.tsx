"use client";

import { useMemo, useRef, useState } from "react";
import { Player, Thumbnail } from "@remotion/player";
import { Check, Download, Loader2, Upload, X } from "lucide-react";
import { ingestFile, resolveAsset } from "@/lib/assets";
import { openUpgrade, useIsPro } from "@/lib/billing/gate";
import { PROMO_TEMPLATES, createPromoProject, getPromoTemplate } from "@/lib/promo/registry";
import { FORMAT_DIMENSIONS, PROMO_FORMATS, PROMO_FPS, type PromoProject } from "@/lib/promo/types";
import { buildPromoInputProps } from "@/lib/promo/inputProps";
import { getPromoBackground, PROMO_BACKGROUND_IDS } from "@/remotion/promo/kit/backgrounds";
import { PROMO_COMPONENTS } from "@/remotion/promo/templates";
import { exportPromoVideo, PromoExportProError } from "@/lib/promo/export";

// A neutral gradient stand-in so gallery tiles and the preview render before a
// screenshot is chosen.
const PLACEHOLDER_SHOT =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='860'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#1e293b'/><stop offset='1' stop-color='#0f172a'/></linearGradient></defs><rect width='400' height='860' fill='url(#g)'/><rect x='40' y='90' width='320' height='60' rx='14' fill='#334155'/><rect x='40' y='180' width='220' height='24' rx='8' fill='#475569'/><rect x='40' y='230' width='320' height='300' rx='20' fill='#1f2b3d'/><rect x='40' y='560' width='320' height='24' rx='8' fill='#475569'/><rect x='40' y='600' width='260' height='24' rx='8' fill='#334155'/></svg>`,
  );

type Status = { kind: "idle" | "rendering" | "done" | "error"; message?: string };

export default function PromoPanel({ onClose }: { onClose: () => void }) {
  const isPro = useIsPro();
  const [assetId, setAssetId] = useState<string | null>(null);
  const [project, setProject] = useState<PromoProject>(() => createPromoProject("rise-reveal", ""));
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const fileRef = useRef<HTMLInputElement>(null);

  const template = getPromoTemplate(project.templateId)!;
  const screenshotUrl = (assetId ? resolveAsset(assetId)?.url : undefined) ?? PLACEHOLDER_SHOT;
  const dims = FORMAT_DIMENSIONS[project.format];
  const Composition = PROMO_COMPONENTS[project.templateId];

  const inputProps = useMemo(
    () => buildPromoInputProps(project, { screenshotUrl, watermark: !isPro }),
    [project, screenshotUrl, isPro],
  );

  function patch(p: Partial<PromoProject>) {
    setProject((prev) => ({ ...prev, ...p }));
    setStatus({ kind: "idle" });
  }

  function selectTemplate(id: string) {
    // preserve the screenshot + user's accent/background where sensible
    const next = createPromoProject(id, assetId ?? "");
    setProject(next);
    setStatus({ kind: "idle" });
  }

  async function onPickFile(file: File) {
    const a = await ingestFile(file);
    setAssetId(a.id);
    setProject((prev) => ({ ...prev, screenshotAssetId: a.id }));
  }

  async function onExport() {
    if (!assetId) {
      setStatus({ kind: "error", message: "Upload a screenshot first" });
      return;
    }
    if (!isPro) {
      openUpgrade("Promo video export");
      return;
    }
    setStatus({ kind: "rendering", message: "Rendering your video — this takes about a minute…" });
    try {
      await exportPromoVideo({ ...project, screenshotAssetId: assetId });
      setStatus({ kind: "done", message: "Downloaded! Check your files." });
    } catch (err) {
      if (err instanceof PromoExportProError) {
        setStatus({ kind: "idle" });
        openUpgrade("Promo video export");
        return;
      }
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "Render failed" });
    }
  }

  const busy = status.kind === "rendering";

  return (
    <div className="fixed inset-0 z-[85] flex bg-[#08080b] text-white">
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void onPickFile(f); e.target.value = ""; }} />

      {/* ── Config sidebar ───────────────────────────────────────── */}
      <aside className="flex w-[400px] shrink-0 flex-col overflow-y-auto border-r border-white/10 bg-[#0d0d12]">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0d0d12]/95 px-6 py-4 backdrop-blur">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-300">Promo video</p>
            <h2 className="text-[17px] font-semibold">App ad maker</h2>
          </div>
          <button onClick={onClose} title="Close" className="fk-press grid h-9 w-9 place-items-center rounded-lg border border-white/10 hover:bg-white/10"><X size={17} /></button>
        </header>

        <div className="flex flex-col gap-7 px-6 py-6">
          {/* templates */}
          <section>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Template</p>
            <div className="grid grid-cols-2 gap-3">
              {PROMO_TEMPLATES.map((t) => {
                const p = createPromoProject(t.id, assetId ?? "");
                const props = buildPromoInputProps(p, { screenshotUrl, watermark: false });
                const active = project.templateId === t.id;
                return (
                  <button key={t.id} onClick={() => selectTemplate(t.id)} className={`fk-press overflow-hidden rounded-xl border text-left transition-colors ${active ? "border-violet-400 ring-1 ring-violet-400/40" : "border-white/10 hover:border-white/25"}`}>
                    <div className="relative aspect-[9/16] w-full bg-black">
                      <Thumbnail
                        component={PROMO_COMPONENTS[t.id]}
                        inputProps={props}
                        compositionWidth={FORMAT_DIMENSIONS["9:16"].width}
                        compositionHeight={FORMAT_DIMENSIONS["9:16"].height}
                        durationInFrames={t.defaultDurationInFrames}
                        fps={PROMO_FPS}
                        frameToDisplay={Math.round(t.defaultDurationInFrames * 0.6)}
                        style={{ width: "100%", height: "100%" }}
                      />
                      {active && <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-violet-500"><Check size={12} /></span>}
                    </div>
                    <span className="block px-2.5 py-2 text-[11.5px] font-semibold">{t.name}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11.5px] leading-5 text-zinc-500">{template.description}</p>
          </section>

          {/* screenshot */}
          <section>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Screenshot</p>
            <button onClick={() => fileRef.current?.click()} className="fk-press flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 bg-white/[0.03] px-4 py-3 text-[13px] font-semibold hover:bg-white/[0.06]">
              <Upload size={15} /> {assetId ? "Replace screenshot" : "Upload your app screenshot"}
            </button>
          </section>

          {/* text */}
          <section>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Text</p>
            <div className="space-y-3">
              {template.textSlots.map((slot, i) => (
                <label key={slot.key} className="block">
                  <span className="mb-1 block text-[11.5px] text-zinc-400">{slot.label}</span>
                  <input
                    value={project.texts[i] ?? ""}
                    maxLength={slot.maxLen}
                    placeholder={slot.placeholder}
                    onChange={(e) => patch({ texts: project.texts.map((t, j) => (j === i ? e.target.value : t)) })}
                    className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] outline-none focus:border-violet-400"
                  />
                </label>
              ))}
            </div>
          </section>

          {/* accent + background */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Accent</p>
              <input type="color" value={project.accent} onChange={(e) => patch({ accent: e.target.value })} className="h-8 w-14 cursor-pointer rounded border border-white/10 bg-transparent" />
            </div>
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Background</p>
              <div className="flex flex-wrap gap-2">
                {PROMO_BACKGROUND_IDS.map((id) => {
                  const bg = getPromoBackground(id);
                  const active = project.background === id;
                  return (
                    <button key={id} onClick={() => patch({ background: id })} title={id} className={`h-9 w-9 rounded-lg border-2 ${active ? "border-white" : "border-white/10"}`} style={{ background: `radial-gradient(circle at 30% 20%, ${bg.blobs[0]?.color ?? "#333"}, ${bg.base})` }} />
                  );
                })}
              </div>
            </div>
          </section>

          {/* format */}
          <section>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Aspect ratio</p>
            <div className="flex gap-2">
              {PROMO_FORMATS.map((f) => (
                <button key={f} onClick={() => patch({ format: f })} className={`fk-press flex-1 rounded-lg border px-3 py-2 text-[12.5px] font-semibold ${project.format === f ? "border-violet-400 bg-white/10" : "border-white/10 text-zinc-400 hover:text-white"}`}>
                  {f === "9:16" ? "9:16 Reel" : f === "1:1" ? "1:1 Feed" : "16:9 Wide"}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* export */}
        <footer className="sticky bottom-0 mt-auto border-t border-white/10 bg-[#0d0d12]/95 px-6 py-4 backdrop-blur">
          <button onClick={onExport} disabled={busy} className="fk-press flex w-full items-center justify-center gap-2 rounded-lg bg-white py-3 text-[13.5px] font-semibold text-zinc-900 hover:bg-zinc-200 disabled:opacity-60">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {busy ? "Rendering…" : isPro ? "Export MP4" : "Export MP4 (Pro)"}
          </button>
          {status.message && (
            <p className={`mt-2.5 text-center text-[11.5px] ${status.kind === "error" ? "text-rose-300" : status.kind === "done" ? "text-emerald-300" : "text-zinc-400"}`}>{status.message}</p>
          )}
          {!isPro && status.kind === "idle" && <p className="mt-2.5 text-center text-[11px] text-zinc-500">Preview is free. Exporting MP4 needs Pro.</p>}
        </footer>
      </aside>

      {/* ── Live preview ─────────────────────────────────────────── */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-8">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(60% 50% at 50% 40%, rgba(124,58,237,0.12), transparent 70%)" }} />
        <div className="relative overflow-hidden rounded-2xl shadow-[0_40px_120px_rgba(0,0,0,0.6)]" style={{ aspectRatio: `${dims.width} / ${dims.height}`, height: dims.height >= dims.width ? "min(88vh, 900px)" : "auto", width: dims.width > dims.height ? "min(88vw, 1100px)" : "auto", maxWidth: "72vw", maxHeight: "88vh" }}>
          <Player
            component={Composition}
            inputProps={inputProps}
            durationInFrames={project.durationInFrames}
            fps={PROMO_FPS}
            compositionWidth={dims.width}
            compositionHeight={dims.height}
            style={{ width: "100%", height: "100%" }}
            controls
            loop
            autoPlay
          />
        </div>
      </div>
    </div>
  );
}
