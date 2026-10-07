"use client";

import { useMemo, useState } from "react";
import { Check, Languages, Plus, Search, Sparkles, X } from "lucide-react";
import { AuthModal } from "@/components/AuthModal";
import { UpgradeModal } from "@/components/editor/UpgradeModal";
import { useIsPro } from "@/lib/billing/gate";
import { POPULAR_LOCALES, SOURCE_LOCALE, STORE_LOCALES, MAX_PACK_LOCALES, storeLocale } from "@/lib/pack/locales";
import { addLocales, applyTranslation, missingTranslations, packSourceLocale, removeLocale, setSourceLocale } from "@/lib/pack/ops";
import { usePackStore } from "@/lib/pack/store";
import { TranslateError, translatePack } from "@/lib/pack/translate";

/**
 * Store languages for the pack: pick languages, translate every caption with
 * AI (Pro), switch which language the preview and caption fields show.
 */
export function PackLanguages() {
  const { pack, update, activeLocale, setActiveLocale } = usePackStore();
  const isPro = useIsPro();
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);
  const [message, setMessage] = useState<{ tone: "error" | "ok"; text: string } | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const locales = pack.locales ?? [];
  const hasSource = pack.screens.some((s) => s.captions[SOURCE_LOCALE]?.title.trim());
  const missing = locales.filter((l) => missingTranslations(pack, l) > 0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return STORE_LOCALES.filter(
      (l) => !q || l.label.toLowerCase().includes(q) || l.native.toLowerCase().includes(q) || l.id.toLowerCase().includes(q)
    );
  }, [query]);

  async function translate(targets: string[]) {
    if (!targets.length || busy) return;
    if (!hasSource) {
      setMessage({ tone: "error", text: "Write a caption for at least one screen first." });
      return;
    }
    setMessage(null);
    setBusy({ done: 0, total: targets.length });
    try {
      await translatePack(usePackStore.getState().pack, targets, (translations, done, total) => {
        update((p) => Object.entries(translations).reduce((acc, [locale, caps]) => applyTranslation(acc, locale, caps), p));
        setBusy({ done, total });
      });
      setMessage({ tone: "ok", text: `Translated into ${targets.length} language${targets.length === 1 ? "" : "s"}. Edit any caption by picking its language.` });
    } catch (e) {
      if (e instanceof TranslateError && e.reason === "signin") setAuthOpen(true);
      else if (e instanceof TranslateError && e.reason === "pro") setUpgradeOpen(true);
      setMessage({ tone: "error", text: e instanceof Error ? e.message : "Translation failed — please retry." });
    } finally {
      setBusy(null);
    }
  }

  const chip = (id: string, label: string, gap: number) => (
    <span
      key={id}
      className={`flex items-center rounded-full border text-[11.5px] transition ${
        activeLocale === id ? "border-violet-500 bg-violet-600/20 text-white" : "border-white/10 bg-black/30 text-white/70 hover:border-white/25"
      }`}
    >
      <button type="button" onClick={() => setActiveLocale(id)} className="flex items-center gap-1 py-1 pl-2.5 pr-1.5" title={gap ? `${gap} caption${gap === 1 ? "" : "s"} not translated yet` : undefined}>
        {label}
        {gap > 0 && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
      </button>
      {id !== SOURCE_LOCALE && (
        <button
          type="button"
          aria-label={`Remove ${label}`}
          onClick={() => update((p) => removeLocale(p, id))}
          className="mr-1 grid h-4 w-4 place-items-center rounded-full text-white/40 hover:bg-white/10 hover:text-white"
        >
          <X size={10} />
        </button>
      )}
    </span>
  );

  return (
    <div>
      <label className="mb-2.5 flex items-center justify-between gap-2 text-[12px] text-white/55">
        Captions written in
        <select
          value={packSourceLocale(pack)}
          onChange={(e) => update((p) => setSourceLocale(p, e.target.value))}
          className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-[12px] text-white/80"
        >
          {STORE_LOCALES.map((l) => (
            <option key={l.id} value={l.id}>{l.label}</option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap gap-1.5">
        {chip(SOURCE_LOCALE, "Original", 0)}
        {locales.map((id) => chip(id, storeLocale(id)?.label ?? id, missingTranslations(pack, id)))}
        <button
          type="button"
          onClick={() => setPicking((v) => !v)}
          disabled={locales.length >= MAX_PACK_LOCALES}
          className="flex items-center gap-1 rounded-full border border-dashed border-white/20 px-2.5 py-1 text-[11.5px] text-white/60 hover:border-white/40 hover:text-white disabled:opacity-40"
        >
          <Plus size={11} /> Add
        </button>
      </div>

      {picking && (
        <div className="mt-2 rounded-lg border border-white/10 bg-black/40 p-2">
          <div className="mb-2 flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => update((p) => addLocales(p, POPULAR_LOCALES))}
              className="rounded-md bg-white/10 px-2 py-1 text-[11px] text-white/80 hover:bg-white/15"
            >
              + Top 8 markets
            </button>
          </div>
          <label className="mb-1.5 flex items-center gap-1.5 rounded-md border border-white/10 bg-black/30 px-2 py-1">
            <Search size={12} className="text-white/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search languages"
              className="w-full bg-transparent text-[12px] outline-none"
            />
          </label>
          <div className="max-h-48 overflow-y-auto">
            {filtered.filter((l) => l.id !== packSourceLocale(pack)).map((l) => {
              const on = locales.includes(l.id);
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => update((p) => (on ? removeLocale(p, l.id) : addLocales(p, [l.id])))}
                  className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-[12px] text-white/75 hover:bg-white/5"
                >
                  <span className={`grid h-3.5 w-3.5 place-items-center rounded border ${on ? "border-violet-500 bg-violet-600" : "border-white/25"}`}>
                    {on && <Check size={10} />}
                  </span>
                  <span className="flex-1">{l.label}</span>
                  <span className="text-white/35" dir={l.rtl ? "rtl" : undefined}>{l.native}</span>
                </button>
              );
            })}
          </div>
          <button type="button" onClick={() => setPicking(false)} className="mt-2 w-full rounded-md bg-violet-600 py-1 text-[12px] font-medium hover:bg-violet-500">
            Done
          </button>
        </div>
      )}

      {locales.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => void translate(missing.length ? missing : locales)}
            disabled={!!busy}
            className="flex w-full items-center justify-center gap-1.5 rounded-md bg-violet-600 px-2.5 py-1.5 text-[12px] font-semibold transition hover:bg-violet-500 disabled:opacity-60"
          >
            {busy ? (
              <>
                <Languages size={13} className="animate-pulse" /> Translating {busy.done}/{busy.total}…
              </>
            ) : (
              <>
                <Sparkles size={13} />
                {missing.length
                  ? `Translate ${missing.length} language${missing.length === 1 ? "" : "s"} with AI`
                  : "Re-translate all with AI"}
                {!isPro && <span className="rounded-full bg-white/20 px-1.5 text-[9px] font-bold uppercase">Pro</span>}
              </>
            )}
          </button>
          <p className="mt-1.5 text-[11px] leading-4 text-white/40">
            Long translations shrink to fit. Screens without a translation export with the original caption. Each language gets its own folder in the zip.
          </p>
        </div>
      )}
      {message && <p className={`mt-1.5 text-[11px] ${message.tone === "error" ? "text-red-400" : "text-emerald-400"}`}>{message.text}</p>}

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
      {upgradeOpen && <UpgradeModal reason="AI caption translations" onClose={() => setUpgradeOpen(false)} />}
    </div>
  );
}
