"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Clock3, Globe, ImageDown, Loader2, Lock, Moon, StretchVertical, X } from "lucide-react";
import { openUpgrade, useIsPro } from "@/lib/billing/gate";
import { firebaseFetch } from "@/lib/firebaseClient";

/**
 * Website URL → screenshot (PostSpark parity). Posts to /api/capture and hands
 * the PNG back as a File so it flows through the normal ingest path.
 */
export function CaptureUrlDialog({
  onClose,
  onCaptured,
}: {
  onClose: () => void;
  onCaptured: (file: File) => Promise<void> | void;
}) {
  const [url, setUrl] = useState("");
  const [dark, setDark] = useState(false);
  const [fullPage, setFullPage] = useState(false);
  const [loadLazy, setLoadLazy] = useState(true);
  const [delay, setDelay] = useState<0 | 2000 | 5000>(2000);
  const [width, setWidth] = useState<1440 | 390>(1440);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isPro = useIsPro();

  const capture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      // authenticated so the server can verify Pro for full-page runs
      const res = await firebaseFetch("/api/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), dark, fullPage, loadLazy, width, delay }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Capture failed");
      }
      const blob = await res.blob();
      const host = url.trim().replace(/^https?:\/\//i, "").split("/")[0];
      await onCaptured(new File([blob], `${host}.png`, { type: "image/png" }));
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Capture failed");
    } finally {
      setBusy(false);
    }
  };

  const ui = (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <div className="w-[min(430px,94vw)] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#ececf2] px-4 py-3">
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-[#17171c]">
            <Globe size={14} className="text-[#7c3aed]" /> Capture a website
          </h3>
          <button onClick={onClose} disabled={busy} className="fk-press grid h-7 w-7 place-items-center rounded-lg text-[#9a9aa4] hover:bg-black/6 hover:text-[#17171c]">
            <X size={14} />
          </button>
        </div>

        <form onSubmit={capture} className="p-4">
          <input
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="stripe.com or https://…"
            className="w-full rounded-xl border border-[#e4e4ec] bg-[#f8f8fb] px-3 py-2.5 text-[13px] text-[#17171c] outline-none placeholder:text-[#a0a0aa] focus:border-[#17171c]"
          />

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Toggle on={width === 1440} onClick={() => setWidth(1440)} label="Desktop" />
            <Toggle on={width === 390} onClick={() => setWidth(390)} label="Mobile" />
            <Toggle on={dark} onClick={() => setDark((v) => !v)} label="Dark mode" icon={<Moon size={11} />} />
            <Toggle
              on={fullPage}
              onClick={() => (isPro ? setFullPage((v) => !v) : openUpgrade())}
              label="Full page"
              icon={isPro ? <StretchVertical size={11} /> : <Lock size={11} className="text-[#b9a02c]" />}
            />
            <div className="col-span-2">
              <Toggle
                on={loadLazy}
                onClick={() => setLoadLazy((v) => !v)}
                label="Load lazy images before capture"
                icon={<ImageDown size={12} />}
                wide
              />
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] font-semibold text-[#777783]"><Clock3 size={11} /> Settle</span>
            <div className="grid flex-1 grid-cols-3 rounded-lg bg-[#f1f1f6] p-1">
              {([0, 2000, 5000] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDelay(value)}
                  className={`fk-press rounded-md px-2 py-1 text-[10.5px] font-semibold ${delay === value ? "bg-white text-[#17171c] shadow-sm" : "text-[#85858f]"}`}
                >
                  {value === 0 ? "None" : `${value / 1000}s`}
                </button>
              ))}
            </div>
          </div>

          {err && <p className="mt-2.5 text-[11.5px] text-[#c0392b]">{err}</p>}

          <button
            type="submit"
            disabled={busy || !url.trim()}
            className="fk-press mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#17171c] py-2.5 text-[13px] font-semibold text-white hover:bg-black disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Capturing… can take ~10s
              </>
            ) : (
              "Capture screenshot"
            )}
          </button>
        </form>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(ui, document.body) : null;
}

function Toggle({ on, onClick, label, icon, wide = false }: { on: boolean; onClick: () => void; label: string; icon?: React.ReactNode; wide?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`fk-press flex items-center ${wide ? "w-full justify-center" : "justify-center"} gap-1 rounded-lg border px-2.5 py-2 text-[11.5px] font-semibold ${
        on ? "border-[#17171c] bg-[#17171c] text-white" : "border-[#e4e4ec] bg-white text-[#5a5a66] hover:border-[#c9c9d4]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
