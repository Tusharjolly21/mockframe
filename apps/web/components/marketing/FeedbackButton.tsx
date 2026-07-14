"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Check, MessageSquareText, Send, X } from "lucide-react";
import { track } from "@/lib/analytics";

type Kind = "feedback" | "bug" | "feature" | "showcase";

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<Kind>("feedback");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [mayFeature, setMayFeature] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setOpen(false);
    setError(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { firebaseFetch } = await import("@/lib/firebaseClient");
      const response = await firebaseFetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, message, email, mayFeature, page: window.location.href }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not send feedback.");
      setSent(true);
      track("feedback_submitted", { type, may_feature: mayFeature });
      setTimeout(() => {
        setOpen(false);
        setSent(false);
        setMessage("");
        setMayFeature(false);
      }, 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send feedback.");
    } finally {
      setBusy(false);
    }
  };

  const dialog = open ? (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <div role="dialog" aria-modal="true" aria-labelledby="feedback-title" className="relative w-full max-w-md rounded-lg border border-white/10 bg-[#111217] p-6 text-white shadow-[0_28px_90px_rgba(0,0,0,0.6)]">
        <button onClick={close} title="Close feedback" className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-zinc-400 hover:bg-white/[0.06] hover:text-white"><X size={16} /></button>
        {sent ? (
          <div className="py-10 text-center">
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-emerald-400/10 text-emerald-300"><Check size={21} /></span>
            <h2 id="feedback-title" className="mt-4 text-[20px] font-semibold">Thank you</h2>
            <p className="mt-1 text-[13px] text-zinc-400">Your note is in the product inbox.</p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <p className="text-[12px] font-semibold text-cyan-300">Talk directly to the product</p>
            <h2 id="feedback-title" className="mt-1 text-[24px] font-semibold">What should MockFrame improve?</h2>
            <p className="mt-2 text-[12.5px] leading-5 text-zinc-400">Bug reports, missing workflows and finished work are all useful. Every submission is reviewed.</p>
            <div className="mt-5 grid grid-cols-4 gap-1 rounded-lg bg-white/[0.05] p-1">
              {([['feedback','General'],['bug','Bug'],['feature','Feature'],['showcase','My work']] as [Kind, string][]).map(([value, label]) => (
                <button key={value} type="button" onClick={() => setType(value)} className={`rounded-md px-1 py-2 text-[10.5px] font-semibold ${type === value ? "bg-white text-zinc-900" : "text-zinc-400 hover:text-white"}`}>{label}</button>
              ))}
            </div>
            <textarea autoFocus value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2500} rows={6} placeholder={type === "showcase" ? "Tell us what you made and paste a public link if you have one." : "Describe what happened, what you expected, or what would save you time."} className="mt-4 w-full resize-none rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-3 text-[13px] leading-5 outline-none placeholder:text-zinc-600 focus:border-cyan-400" />
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email for a reply (optional)" className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-3 text-[13px] outline-none placeholder:text-zinc-600 focus:border-cyan-400" />
            {type === "showcase" && <label className="mt-3 flex items-start gap-2 text-[11.5px] leading-5 text-zinc-400"><input type="checkbox" checked={mayFeature} onChange={(event) => setMayFeature(event.target.checked)} className="mt-1 accent-cyan-400" />MockFrame may contact me for permission to feature this work. Nothing is published automatically.</label>}
            {error && <p className="mt-3 rounded-lg border border-red-400/20 bg-red-400/[0.06] px-3 py-2 text-[11.5px] text-red-300">{error}</p>}
            <button disabled={busy || message.trim().length < 8} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-[13px] font-semibold text-zinc-900 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"><Send size={15} />{busy ? "Sending..." : "Send feedback"}</button>
          </form>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <button onClick={() => { setOpen(true); track("feedback_opened"); }} className="inline-flex items-center gap-1.5 text-[13px] text-zinc-500 transition-colors hover:text-zinc-300"><MessageSquareText size={14} /> Share feedback</button>
      {typeof document !== "undefined" && dialog ? createPortal(dialog, document.body) : null}
    </>
  );
}
