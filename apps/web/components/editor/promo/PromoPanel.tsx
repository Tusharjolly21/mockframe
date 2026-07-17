"use client";

import { useMemo, useRef, useState } from "react";
import { Player, Thumbnail } from "@remotion/player";
import { ArrowLeft, ArrowRight, Check, Download, Loader2, Plus, Upload, X } from "lucide-react";
import { ingestFile, resolveAsset } from "@/lib/assets";
import { openUpgrade, useIsPro } from "@/lib/billing/gate";
import { PROMO_TEMPLATES, createPromoProject, getPromoTemplate } from "@/lib/promo/registry";
import { FORMAT_DIMENSIONS, MAX_SCREENSHOTS, PROMO_FORMATS, PROMO_FPS, type PromoProject } from "@/lib/promo/types";
import { buildPromoInputProps, type PromoScreenshot } from "@/lib/promo/inputProps";
import { getPromoBackground, PROMO_BACKGROUND_IDS } from "@/remotion/promo/kit/backgrounds";
import { PROMO_COMPONENTS } from "@/remotion/promo/templates";
import { exportPromoVideo, PromoExportProError } from "@/lib/promo/export";

const PLACEHOLDER: PromoScreenshot = {
  url:
    "data:image/svg+xml," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='860'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#1e293b'/><stop offset='1' stop-color='#0f172a'/></linearGradient></defs><rect width='400' height='860' fill='url(#g)'/><rect x='40' y='90' width='320' height='60' rx='14' fill='#334155'/><rect x='40' y='180' width='220' height='24' rx='8' fill='#475569'/><rect x='40' y='230' width='320' height='300' rx='20' fill='#1f2b3d'/><rect x='40' y='560' width='320' height='24' rx='8' fill='#475569'/><rect x='40' y='600' width='260' height='24' rx='8' fill='#334155'/></svg>`,
    ),
  width: 400,
  height: 860,
};

const DEVICES: [string, string][] = [
  ["iphone-16-pro", "iPhone 16 Pro"],
  ["iphone-16", "iPhone 16"],
  ["pixel-9-pro", "Pixel 9 Pro"],
  ["galaxy-s25-ultra", "Galaxy S25 Ultra"],
  ["oneplus-13", "OnePlus 13"],
  ["pixel-8a", "Pixel 8a"],
];

const PATTERNS: [string, string][] = [
  ["none", "None"],
  ["dots", "Dots"],
  ["grid", "Grid"],
  ["waves", "Waves"],
  ["rays", "Rays"],
  ["topography", "Topo"],
  ["diamonds", "Diamonds"],
  ["confetti", "Confetti"],
  ["crosses", "Crosses"],
];

const STEPS = ["Template", "Screens", "Copy", "Style", "Export"] as const;

function screenshotsFor(ids: string[]): PromoScreenshot[] {
  const resolved = ids
    .map((id) => resolveAsset(id))
    .filter((a): a is NonNullable<typeof a> => Boolean(a?.url))
    .map((a) => ({ url: a.url, width: a.width, height: a.height }));
  return resolved.length ? resolved : [PLACEHOLDER];
}

type Status = { kind: "idle" | "rendering" | "done" | "error"; message?: string };

const Label = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{children}</p>
);

export default function PromoPanel({ onClose }: { onClose: () => void }) {
  const isPro = useIsPro();
  const [step, setStep] = useState(0);
  const [assetIds, setAssetIds] = useState<string[]>([]);
  const [project, setProject] = useState<PromoProject>(() => createPromoProject("rise-reveal", []));
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const fileRef = useRef<HTMLInputElement>(null);

  const template = getPromoTemplate(project.templateId)!;
  const screenshots = useMemo(() => screenshotsFor(assetIds), [assetIds]);
  const dims = FORMAT_DIMENSIONS[project.format];
  const Composition = PROMO_COMPONENTS[project.templateId];

  const inputProps = useMemo(
    () => buildPromoInputProps({ ...project, screenshotAssetIds: assetIds }, { screenshots, watermark: !isPro }),
    [project, screenshots, assetIds, isPro],
  );

  function patch(p: Partial<PromoProject>) {
    setProject((prev) => ({ ...prev, ...p }));
    setStatus({ kind: "idle" });
  }
  function selectTemplate(id: string) {
    setProject(createPromoProject(id, assetIds));
    setStatus({ kind: "idle" });
  }
  async function onPickFiles(files: FileList) {
    const room = MAX_SCREENSHOTS - assetIds.length;
    const picked = Array.from(files).slice(0, Math.max(0, room));
    const ingested = await Promise.all(picked.map((f) => ingestFile(f)));
    const nextIds = [...assetIds, ...ingested.map((a) => a.id)].slice(0, MAX_SCREENSHOTS);
    setAssetIds(nextIds);
    setProject((prev) => ({ ...prev, screenshotAssetIds: nextIds }));
  }
  function removeScreenshot(id: string) {
    const nextIds = assetIds.filter((x) => x !== id);
    setAssetIds(nextIds);
    setProject((prev) => ({ ...prev, screenshotAssetIds: nextIds }));
  }
  async function onExport() {
    if (assetIds.length === 0) return setStatus({ kind: "error", message: "Add at least one screenshot (step 2)" });
    if (!isPro) return openUpgrade("Promo video export");
    setStatus({ kind: "rendering", message: "Rendering your video — this takes about a minute…" });
    try {
      await exportPromoVideo({ ...project, screenshotAssetIds: assetIds });
      setStatus({ kind: "done", message: "Downloaded! Check your files." });
    } catch (err) {
      if (err instanceof PromoExportProError) {
        setStatus({ kind: "idle" });
        return openUpgrade("Promo video export");
      }
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "Render failed" });
    }
  }

  const busy = status.kind === "rendering";
  const canAddMore = assetIds.length < MAX_SCREENSHOTS;
  const noScreens = assetIds.length === 0;

  return (
    <div className="fixed inset-0 z-[85] flex bg-[#08080b] text-white">
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { if (e.target.files?.length) void onPickFiles(e.target.files); e.target.value = ""; }} />

      {/* ── Workflow sidebar ─────────────────────────────────────── */}
      <aside className="flex w-[420px] shrink-0 flex-col border-r border-white/10 bg-[#0d0d12]">
        <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-300">Promo video</p>
            <h2 className="text-[17px] font-semibold">App ad maker</h2>
          </div>
          <button onClick={onClose} title="Close" className="fk-press grid h-9 w-9 place-items-center rounded-lg border border-white/10 hover:bg-white/10"><X size={17} /></button>
        </header>

        {/* stepper */}
        <div className="flex items-center gap-1 border-b border-white/10 px-6 py-3">
          {STEPS.map((s, i) => (
            <button key={s} onClick={() => setStep(i)} className="group flex flex-1 flex-col items-center gap-1.5">
              <div className="flex w-full items-center">
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${i < step ? "bg-violet-500 text-white" : i === step ? "bg-white text-zinc-900" : "bg-white/10 text-zinc-500"}`}>
                  {i < step ? <Check size={12} /> : i + 1}
                </span>
                {i < STEPS.length - 1 && <span className={`h-0.5 flex-1 ${i < step ? "bg-violet-500" : "bg-white/10"}`} />}
              </div>
              <span className={`text-[10px] font-semibold ${i === step ? "text-white" : "text-zinc-500"}`}>{s}</span>
            </button>
          ))}
        </div>

        {/* step body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {step === 0 && (
            <section>
              <Label>Pick a template</Label>
              <div className="grid grid-cols-2 gap-3">
                {PROMO_TEMPLATES.map((t) => {
                  const props = buildPromoInputProps(createPromoProject(t.id, assetIds), { screenshots, watermark: false });
                  const active = project.templateId === t.id;
                  return (
                    <button key={t.id} onClick={() => selectTemplate(t.id)} className={`fk-press overflow-hidden rounded-xl border text-left transition-colors ${active ? "border-violet-400 ring-1 ring-violet-400/40" : "border-white/10 hover:border-white/25"}`}>
                      <div className="relative aspect-[9/16] w-full bg-black">
                        <Thumbnail component={PROMO_COMPONENTS[t.id]} inputProps={props} compositionWidth={FORMAT_DIMENSIONS["9:16"].width} compositionHeight={FORMAT_DIMENSIONS["9:16"].height} durationInFrames={t.defaultDurationInFrames} fps={PROMO_FPS} frameToDisplay={Math.round(t.defaultDurationInFrames * 0.5)} style={{ width: "100%", height: "100%" }} />
                        {active && <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-violet-500"><Check size={12} /></span>}
                      </div>
                      <div className="px-2.5 py-2">
                        <span className="block text-[11.5px] font-semibold">{t.name}</span>
                        <span className="block text-[10.5px] text-zinc-500">{t.tagline}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-[11.5px] leading-5 text-zinc-500">{template.description}</p>
            </section>
          )}

          {step === 1 && (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <Label>Your app screens</Label>
                <span className="text-[11px] text-zinc-600">{assetIds.length}/{MAX_SCREENSHOTS}</span>
              </div>
              {noScreens ? (
                <button onClick={() => fileRef.current?.click()} className="fk-press flex h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/[0.03] text-[13px] font-semibold hover:bg-white/[0.06]">
                  <Upload size={18} /> Upload app screenshots
                  <span className="text-[11px] font-normal text-zinc-500">The template cuts between them</span>
                </button>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {assetIds.map((id) => {
                    const url = resolveAsset(id)?.url;
                    return (
                      <div key={id} className="group relative aspect-[9/16] overflow-hidden rounded-lg border border-white/10 bg-black">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {url && <img src={url} alt="" className="h-full w-full object-cover" />}
                        <button onClick={() => removeScreenshot(id)} title="Remove" className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/70 opacity-0 transition-opacity group-hover:opacity-100"><X size={11} /></button>
                      </div>
                    );
                  })}
                  {canAddMore && <button onClick={() => fileRef.current?.click()} title="Add" className="fk-press grid aspect-[9/16] place-items-center rounded-lg border border-dashed border-white/20 text-zinc-400 hover:bg-white/[0.06]"><Plus size={16} /></button>}
                </div>
              )}
              <p className="mt-3 text-[11px] leading-5 text-zinc-500">Tip: add 2–4 of your best screens so the ad tells a story.</p>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-3">
              <Label>Write your copy</Label>
              {template.textSlots.map((slot, i) => (
                <label key={slot.key} className="block">
                  <span className="mb-1 flex items-center justify-between text-[11.5px] text-zinc-400"><span>{slot.label}</span><span className="text-zinc-600">{(project.texts[i] ?? "").length}/{slot.maxLen}</span></span>
                  <input value={project.texts[i] ?? ""} maxLength={slot.maxLen} placeholder={slot.placeholder} onChange={(e) => patch({ texts: project.texts.map((t, j) => (j === i ? e.target.value : t)) })} className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] outline-none focus:border-violet-400" />
                </label>
              ))}
            </section>
          )}

          {step === 3 && (
            <section className="space-y-6">
              <div>
                <Label>Device</Label>
                <div className="grid grid-cols-2 gap-2">
                  {DEVICES.map(([id, name]) => (
                    <button key={id} onClick={() => patch({ deviceId: id })} className={`fk-press rounded-lg border px-3 py-2 text-left text-[12px] font-semibold ${project.deviceId === id ? "border-violet-400 bg-white/10" : "border-white/10 text-zinc-400 hover:text-white"}`}>{name}</button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Background</Label>
                <div className="flex flex-wrap gap-2">
                  {PROMO_BACKGROUND_IDS.map((id) => {
                    const bg = getPromoBackground(id);
                    return <button key={id} onClick={() => patch({ background: id })} title={id} className={`h-9 w-9 rounded-lg border-2 ${project.background === id ? "border-white" : "border-white/10"}`} style={{ background: `radial-gradient(circle at 30% 20%, ${bg.blobs[0]?.color ?? "#333"}, ${bg.base})` }} />;
                  })}
                </div>
              </div>
              <div>
                <Label>Pattern</Label>
                <div className="flex flex-wrap gap-2">
                  {PATTERNS.map(([id, name]) => (
                    <button key={id} onClick={() => patch({ pattern: id === "none" ? null : id })} className={`fk-press rounded-lg border px-2.5 py-1.5 text-[11.5px] font-semibold ${(project.pattern ?? "none") === id ? "border-violet-400 bg-white/10 text-white" : "border-white/10 text-zinc-400 hover:text-white"}`}>{name}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Accent colour</Label>
                <input type="color" value={project.accent} onChange={(e) => patch({ accent: e.target.value })} className="h-8 w-14 cursor-pointer rounded border border-white/10 bg-transparent" />
              </div>
              <div>
                <Label>Aspect ratio</Label>
                <div className="flex gap-2">
                  {PROMO_FORMATS.map((f) => (
                    <button key={f} onClick={() => patch({ format: f })} className={`fk-press flex-1 rounded-lg border px-3 py-2 text-[12px] font-semibold ${project.format === f ? "border-violet-400 bg-white/10" : "border-white/10 text-zinc-400 hover:text-white"}`}>{f === "9:16" ? "9:16 Reel" : f === "1:1" ? "1:1 Feed" : "16:9 Wide"}</button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {step === 4 && (
            <section className="space-y-4">
              <Label>Review & export</Label>
              <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-[12.5px]">
                {[["Template", template.name], ["Screens", `${assetIds.length}`], ["Device", DEVICES.find((d) => d[0] === project.deviceId)?.[1] ?? project.deviceId], ["Format", project.format], ["Length", `${Math.round(project.durationInFrames / PROMO_FPS)}s`]].map(([k, v]) => (
                  <div key={k} className="flex justify-between"><span className="text-zinc-500">{k}</span><span className="font-semibold">{v}</span></div>
                ))}
              </div>
              <button onClick={onExport} disabled={busy} className="fk-press flex w-full items-center justify-center gap-2 rounded-lg bg-white py-3 text-[13.5px] font-semibold text-zinc-900 hover:bg-zinc-200 disabled:opacity-60">
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                {busy ? "Rendering…" : isPro ? "Export MP4" : "Export MP4 (Pro)"}
              </button>
              {status.message && <p className={`text-center text-[11.5px] ${status.kind === "error" ? "text-rose-300" : status.kind === "done" ? "text-emerald-300" : "text-zinc-400"}`}>{status.message}</p>}
              {!isPro && status.kind === "idle" && <p className="text-center text-[11px] text-zinc-500">Preview is free. Exporting MP4 needs Pro.</p>}
            </section>
          )}
        </div>

        {/* nav */}
        <footer className="flex items-center justify-between border-t border-white/10 px-6 py-4">
          <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="fk-press inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-4 py-2 text-[13px] font-semibold hover:bg-white/10 disabled:opacity-40"><ArrowLeft size={15} /> Back</button>
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} className="fk-press inline-flex items-center gap-1.5 rounded-lg bg-white px-5 py-2 text-[13px] font-semibold text-zinc-900 hover:bg-zinc-200">Next <ArrowRight size={15} /></button>
          ) : (
            <span className="text-[11.5px] text-zinc-500">Ready to export →</span>
          )}
        </footer>
      </aside>

      {/* ── Live preview ─────────────────────────────────────────── */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-8">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(60% 50% at 50% 40%, rgba(124,58,237,0.12), transparent 70%)" }} />
        <div className="relative overflow-hidden rounded-2xl shadow-[0_40px_120px_rgba(0,0,0,0.6)]" style={{ aspectRatio: `${dims.width} / ${dims.height}`, height: dims.height >= dims.width ? "min(88vh, 900px)" : "auto", width: dims.width > dims.height ? "min(88vw, 1100px)" : "auto", maxWidth: "72vw", maxHeight: "88vh" }}>
          <Player component={Composition} inputProps={inputProps} durationInFrames={project.durationInFrames} fps={PROMO_FPS} compositionWidth={dims.width} compositionHeight={dims.height} style={{ width: "100%", height: "100%" }} controls loop autoPlay />
        </div>
      </div>
    </div>
  );
}
