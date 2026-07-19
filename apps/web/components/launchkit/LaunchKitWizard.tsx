"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Download, Globe, Loader2, PartyPopper, Sparkles, Upload } from "lucide-react";
import { loadBrandKit } from "@/lib/brand";
import { firebaseFetch } from "@/lib/firebaseClient";
import { KIT_SURFACES, type LaunchCopy, type LaunchKitDoc, slugifyAppName } from "@/lib/launchkit/types";
import { openUpgrade, useIsPro } from "@/lib/billing/gate";
import { useAuth } from "@/lib/auth";
import { AuthModal } from "@/components/AuthModal";
import { KitSurface } from "./KitSurfaces";

const STEPS = ["Your app", "Copy", "Assets", "Ship it"] as const;

const EMPTY_COPY: LaunchCopy = { tagline: "", subtitle: "", tweet: "", boilerplate: "", phComment: "" };

type Media = { url: string; width: number; height: number; file: File };

async function probeImage(file: File): Promise<Media> {
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ url, width: img.naturalWidth, height: img.naturalHeight, file });
    img.onerror = () => reject(new Error("Unreadable image"));
    img.src = url;
  });
}

/** Upload a wizard media item to hosted storage; returns the https URL. */
async function hostMedia(m: Media): Promise<string> {
  const form = new FormData();
  form.set("file", m.file);
  form.set("width", String(m.width));
  form.set("height", String(m.height));
  const res = await firebaseFetch("/api/assets", { method: "POST", body: form });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Upload failed");
  const saved = (await res.json()) as { url: string };
  return saved.url;
}

export function LaunchKitWizard() {
  const isPro = useIsPro();
  const { account } = useAuth();
  const [step, setStep] = useState(0);
  const [authOpen, setAuthOpen] = useState(false);

  // inputs
  const [appName, setAppName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [accent, setAccent] = useState(() => loadBrandKit()?.accent ?? "#7c3aed");
  const [icon, setIcon] = useState<Media | null>(null);
  const [shots, setShots] = useState<Media[]>([]);
  const [links, setLinks] = useState({ site: "", appstore: "", play: "" });
  const [contact, setContact] = useState("");
  const [copy, setCopy] = useState<LaunchCopy>(EMPTY_COPY);

  // flow state
  const [importUrl, setImportUrl] = useState("");
  const [busy, setBusy] = useState<null | string>(null);
  const [error, setError] = useState<string | null>(null);
  const [pressUrl, setPressUrl] = useState<string | null>(null);
  const [zipDone, setZipDone] = useState(false);

  const iconRef = useRef<HTMLInputElement>(null);
  const shotsRef = useRef<HTMLInputElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  const doc: LaunchKitDoc = useMemo(
    () => ({
      appName: appName || "Your App",
      category,
      accent,
      iconUrl: icon?.url ?? null,
      screenshots: shots.map(({ url, width, height }) => ({ url, width, height })),
      links,
      contact,
      copy: copy.tagline ? copy : { ...copy, tagline: description.slice(0, 60) || "Launching soon" },
    }),
    [appName, category, accent, icon, shots, links, contact, copy, description],
  );

  const canGenerate = appName.trim().length >= 2 && description.trim().length >= 10;
  const readyToShip = appName.trim().length >= 2 && shots.length > 0 && copy.tagline.length > 0;

  async function importFromUrl() {
    if (!account) return setAuthOpen(true);
    setBusy("import");
    setError(null);
    try {
      const res = await firebaseFetch("/api/ai-import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: importUrl }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Import failed");
      setAppName((v) => v || j.appName || "");
      setDescription(j.description ?? "");
      if (!links.site) setLinks((l) => ({ ...l, site: importUrl }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(null);
    }
  }

  async function generateCopy() {
    setBusy("copy");
    setError(null);
    try {
      const res = await firebaseFetch("/api/launch-kit/copy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appName, category, description }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Generation failed");
      setCopy(j.copy);
      setStep(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy(null);
    }
  }

  /** First-kit-free / Pro gate — server-authoritative. */
  async function consumeGate(): Promise<boolean> {
    const res = await firebaseFetch("/api/launch-kit/consume", { method: "POST" });
    if (res.status === 401) {
      setAuthOpen(true);
      return false;
    }
    if (res.status === 402) {
      openUpgrade("Launch kits");
      return false;
    }
    return res.ok;
  }

  async function downloadZip() {
    if (!readyToShip) return setError("Add your app name, at least one screenshot, and generate copy first");
    setBusy("zip");
    setError(null);
    try {
      if (!(await consumeGate())) return;
      const { toPng } = await import("html-to-image");
      const { buildZip } = await import("@/lib/zip");
      const root = exportRef.current;
      if (!root) throw new Error("Render root missing");
      const entries: { name: string; data: Uint8Array }[] = [];
      for (const surface of KIT_SURFACES) {
        const node = root.querySelector<HTMLElement>(`[data-surface="${surface.id}"]`);
        if (!node) continue;
        const dataUrl = await toPng(node, { pixelRatio: 1, width: surface.width, height: surface.height });
        const bytes = Uint8Array.from(atob(dataUrl.split(",")[1]), (c) => c.charCodeAt(0));
        entries.push({ name: `Launch Kit/${surface.file}`, data: bytes });
      }
      const copyTxt = [
        `# ${doc.appName} — launch copy (made with MockFrame)`,
        ``,
        `Tagline: ${copy.tagline}`,
        `App Store subtitle: ${copy.subtitle}`,
        ``,
        `Launch tweet:`,
        copy.tweet,
        ``,
        `Product Hunt maker comment:`,
        copy.phComment,
        ``,
        `Press boilerplate:`,
        copy.boilerplate,
        ...(pressUrl ? [``, `Press page: ${window.location.origin}${pressUrl}`] : []),
      ].join("\n");
      entries.push({ name: "Launch Kit/launch-copy.txt", data: new TextEncoder().encode(copyTxt) });
      const blob = buildZip(entries);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${slugifyAppName(doc.appName)}-launch-kit.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 8000);
      setZipDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(null);
    }
  }

  async function publishPress() {
    if (!account) return setAuthOpen(true);
    if (!readyToShip) return setError("Finish the kit first");
    setBusy("press");
    setError(null);
    try {
      const [iconUrl, ...shotUrls] = await Promise.all([icon ? hostMedia(icon) : Promise.resolve(null), ...shots.map(hostMedia)]);
      const res = await firebaseFetch("/api/press", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appName,
          slug: slugifyAppName(appName),
          tagline: copy.tagline,
          boilerplate: copy.boilerplate,
          category,
          accent,
          icon: iconUrl,
          screenshots: shotUrls.map((url) => ({ url })),
          links,
          contact,
        }),
      });
      const j = await res.json();
      if (res.status === 401) return setAuthOpen(true);
      if (!res.ok) throw new Error(j.error ?? "Publish failed");
      setPressUrl(j.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setBusy(null);
    }
  }

  const label = "mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500";
  const input = "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white outline-none focus:border-violet-400";

  return (
    <div id="create" className="mx-auto max-w-5xl px-6 pb-24">
      {/* stepper */}
      <div className="mx-auto mb-8 flex max-w-lg items-center gap-1">
        {STEPS.map((s, i) => (
          <button key={s} onClick={() => setStep(Math.min(i, step + 1))} className="group flex flex-1 flex-col items-center gap-1.5">
            <div className="flex w-full items-center">
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-bold ${i < step ? "bg-violet-500 text-white" : i === step ? "bg-white text-zinc-900" : "bg-white/10 text-zinc-500"}`}>
                {i < step ? <Check size={13} /> : i + 1}
              </span>
              {i < STEPS.length - 1 && <span className={`h-0.5 flex-1 ${i < step ? "bg-violet-500" : "bg-white/10"}`} />}
            </div>
            <span className={`text-[10.5px] font-semibold ${i === step ? "text-white" : "text-zinc-500"}`}>{s}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
          {step === 0 && (
            <div className="mx-auto max-w-2xl space-y-5">
              {/* URL import */}
              <div className="rounded-2xl border border-violet-400/25 bg-violet-500/[0.06] p-5">
                <p className="flex items-center gap-2 text-[13px] font-semibold text-violet-200"><Globe size={15} /> Import from your app’s website or store page</p>
                <div className="mt-3 flex gap-2">
                  <input value={importUrl} onChange={(e) => setImportUrl(e.target.value)} placeholder="https://yourapp.com" className={input} />
                  <button onClick={importFromUrl} disabled={busy !== null || !/^https?:\/\/./.test(importUrl)} className="fk-press shrink-0 rounded-xl bg-white px-4 py-2.5 text-[13px] font-semibold text-zinc-900 disabled:opacity-40">
                    {busy === "import" ? <Loader2 size={15} className="animate-spin" /> : "Import"}
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block"><span className={label}>App name</span><input value={appName} onChange={(e) => setAppName(e.target.value)} maxLength={60} placeholder="Lumen" className={input} /></label>
                <label className="block"><span className={label}>Category</span><input value={category} onChange={(e) => setCategory(e.target.value)} maxLength={40} placeholder="Sleep tracker" className={input} /></label>
              </div>
              <label className="block"><span className={label}>What does it do? (fuel for the AI copywriter)</span>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={1200} placeholder="A sleep tracker for new parents that adapts to broken sleep schedules…" className={`${input} resize-y`} />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <span className={label}>App icon</span>
                  <button onClick={() => iconRef.current?.click()} className="fk-press flex w-full items-center gap-3 rounded-xl border border-dashed border-white/20 bg-white/[0.03] p-3 hover:bg-white/[0.06]">
                    {icon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={icon.url} alt="" className="h-11 w-11 rounded-xl object-cover" />
                    ) : (
                      <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10"><Upload size={16} /></span>
                    )}
                    <span className="text-[13px] font-semibold">{icon ? "Replace icon" : "Upload icon"}</span>
                  </button>
                  {icon && icon.width < 512 && <p className="mt-1.5 text-[11px] text-amber-300/80">Icon is under 512px — it may look soft on large assets.</p>}
                </div>
                <div>
                  <span className={label}>Screenshots ({shots.length}/5)</span>
                  <button onClick={() => shotsRef.current?.click()} className="fk-press flex w-full items-center gap-3 rounded-xl border border-dashed border-white/20 bg-white/[0.03] p-3 hover:bg-white/[0.06]">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10"><Upload size={16} /></span>
                    <span className="text-[13px] font-semibold">{shots.length ? "Add more" : "Upload screenshots"}</span>
                  </button>
                </div>
              </div>
              {shots.length > 0 && (
                <div className="flex gap-2">
                  {shots.map((s, i) => (
                    <button key={i} onClick={() => setShots((list) => list.filter((_, j) => j !== i))} title="Remove" className="group relative h-20 w-11 overflow-hidden rounded-lg border border-white/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={s.url} alt="" className="h-full w-full object-cover group-hover:opacity-40" />
                      <span className="absolute inset-0 hidden place-items-center text-[10px] font-bold group-hover:grid">✕</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block"><span className={label}>Website</span><input value={links.site} onChange={(e) => setLinks({ ...links, site: e.target.value })} placeholder="https://…" className={input} /></label>
                <label className="block"><span className={label}>App Store</span><input value={links.appstore} onChange={(e) => setLinks({ ...links, appstore: e.target.value })} placeholder="https://apps.apple.com/…" className={input} /></label>
                <label className="block"><span className={label}>Google Play</span><input value={links.play} onChange={(e) => setLinks({ ...links, play: e.target.value })} placeholder="https://play.google.com/…" className={input} /></label>
              </div>
              <div className="flex items-end justify-between gap-4">
                <label className="block flex-1"><span className={label}>Press contact email</span><input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="press@yourapp.com" className={input} /></label>
                <label className="block"><span className={label}>Accent</span><input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-11 w-16 cursor-pointer rounded-xl border border-white/10 bg-transparent" /></label>
              </div>

              <button onClick={generateCopy} disabled={!canGenerate || busy !== null} className="fk-press mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3.5 text-[14px] font-semibold text-zinc-900 hover:bg-zinc-200 disabled:opacity-40">
                {busy === "copy" ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                Write my launch copy
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="mx-auto max-w-2xl space-y-4">
              {(
                [
                  ["tagline", "Tagline", 60, 1],
                  ["subtitle", "App Store subtitle", 30, 1],
                  ["tweet", "Launch tweet", 280, 4],
                  ["phComment", "Product Hunt maker comment", 600, 5],
                  ["boilerplate", "Press boilerplate", 400, 4],
                ] as const
              ).map(([key, title, max, rows]) => (
                <label key={key} className="block">
                  <span className={`${label} flex justify-between`}><span>{title}</span><span className="text-zinc-600">{copy[key].length}/{max}</span></span>
                  {rows === 1 ? (
                    <input value={copy[key]} maxLength={max} onChange={(e) => setCopy({ ...copy, [key]: e.target.value })} className={input} />
                  ) : (
                    <textarea value={copy[key]} maxLength={max} rows={rows} onChange={(e) => setCopy({ ...copy, [key]: e.target.value })} className={`${input} resize-y`} />
                  )}
                </label>
              ))}
              <div className="flex justify-between pt-2">
                <button onClick={generateCopy} disabled={busy !== null} className="fk-press inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-[13px] font-semibold hover:bg-white/10">
                  {busy === "copy" ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Rewrite
                </button>
                <button onClick={() => setStep(2)} className="fk-press inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-[13px] font-semibold text-zinc-900">Preview assets <ArrowRight size={15} /></button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="grid gap-6 sm:grid-cols-2">
                {KIT_SURFACES.map((s) => (
                  <figure key={s.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d12]">
                    <div className="overflow-hidden" style={{ aspectRatio: `${s.width} / ${s.height}`, maxHeight: 340 }}>
                      <div style={{ transform: `scale(${Math.min(1, 560 / s.width)})`, transformOrigin: "0 0", width: s.width, height: s.height }}>
                        <KitSurface id={s.id} doc={doc} />
                      </div>
                    </div>
                    <figcaption className="flex items-center justify-between px-4 py-3 text-[12px]">
                      <span className="font-semibold">{s.label}</span>
                      <span className="text-zinc-500">{s.width}×{s.height}</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
              <div className="mt-8 flex justify-between">
                <button onClick={() => setStep(1)} className="fk-press inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-[13px] font-semibold hover:bg-white/10"><ArrowLeft size={14} /> Edit copy</button>
                <button onClick={() => setStep(3)} className="fk-press inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-[13px] font-semibold text-zinc-900">Ship it <ArrowRight size={15} /></button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="mx-auto max-w-xl space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <p className="flex items-center gap-2 text-[15px] font-semibold"><Download size={16} /> Download the kit</p>
                <p className="mt-1 text-[12.5px] leading-5 text-zinc-500">All {KIT_SURFACES.length} assets at exact platform sizes + your launch copy, in one zip. First kit is free{isPro ? "" : " — then Pro"}.</p>
                <button onClick={downloadZip} disabled={busy !== null} className="fk-press mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-[13.5px] font-semibold text-zinc-900 disabled:opacity-50">
                  {busy === "zip" ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} {zipDone ? "Download again" : "Download launch kit (.zip)"}
                </button>
              </div>
              <div className="rounded-2xl border border-violet-400/25 bg-violet-500/[0.06] p-6">
                <p className="flex items-center gap-2 text-[15px] font-semibold text-violet-100"><PartyPopper size={16} /> Publish your press page</p>
                <p className="mt-1 text-[12.5px] leading-5 text-zinc-400">A live page journalists can use: logo, screenshots, boilerplate, contact — hosted at mockframe.app/press/{slugifyAppName(appName || "your-app")}.</p>
                {pressUrl ? (
                  <a href={pressUrl} target="_blank" rel="noopener" className="fk-press mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 py-3 text-[13.5px] font-semibold text-white">
                    View your live press page <ArrowRight size={15} />
                  </a>
                ) : (
                  <button onClick={publishPress} disabled={busy !== null} className="fk-press mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 py-3 text-[13.5px] font-semibold text-white disabled:opacity-50">
                    {busy === "press" ? <Loader2 size={15} className="animate-spin" /> : <PartyPopper size={15} />} Publish press page
                  </button>
                )}
              </div>
              <button onClick={() => setStep(2)} className="fk-press inline-flex items-center gap-2 text-[12.5px] text-zinc-500 hover:text-white"><ArrowLeft size={13} /> Back to assets</button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {error && <p className="mt-4 text-center text-[12.5px] text-rose-300">{error}</p>}

      {/* hidden inputs + offscreen full-size render tree for export */}
      <input ref={iconRef} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) setIcon(await probeImage(f).catch(() => null) ?? null); }} />
      <input ref={shotsRef} type="file" accept="image/*" multiple hidden onChange={async (e) => {
        const files = Array.from(e.target.files ?? []).slice(0, 5 - shots.length);
        e.target.value = "";
        const parsed = await Promise.all(files.map((f) => probeImage(f).catch(() => null)));
        setShots((list) => [...list, ...parsed.filter((m): m is Media => Boolean(m))].slice(0, 5));
      }} />
      <div ref={exportRef} aria-hidden style={{ position: "fixed", left: -100000, top: 0, pointerEvents: "none" }}>
        {step === 3 &&
          KIT_SURFACES.map((s) => (
            <div key={s.id} data-surface={s.id}>
              <KitSurface id={s.id} doc={doc} />
            </div>
          ))}
      </div>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  );
}
