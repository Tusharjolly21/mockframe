"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Globe, Loader2, Moon, StretchVertical, X } from "lucide-react";

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
  const [width, setWidth] = useState<1440 | 390>(1440);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const capture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), dark, fullPage, width }),
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
      <div className="w-[min(380px,94vw)] overflow-hidden rounded-2xl bg-white shadow-2xl">
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

          <div className="mt-3 flex flex-wrap gap-1.5">
            <Toggle on={width === 1440} onClick={() => setWidth(1440)} label="Desktop" />
            <Toggle on={width === 390} onClick={() => setWidth(390)} label="Mobile" />
            <span className="mx-0.5 w-px self-stretch bg-[#ececf2]" />
            <Toggle on={dark} onClick={() => setDark((v) => !v)} label="Dark mode" icon={<Moon size={11} />} />
            <Toggle on={fullPage} onClick={() => setFullPage((v) => !v)} label="Full page" icon={<StretchVertical size={11} />} />
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

function Toggle({ on, onClick, label, icon }: { on: boolean; onClick: () => void; label: string; icon?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`fk-press flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11.5px] font-semibold ${
        on ? "border-[#17171c] bg-[#17171c] text-white" : "border-[#e4e4ec] bg-white text-[#5a5a66] hover:border-[#c9c9d4]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
