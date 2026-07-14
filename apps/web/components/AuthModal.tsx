"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/lib/auth";
import { ICON_VIEWBOX, iconBody } from "@/lib/iconStickers";

// Iconify Logos: google-icon. Kept as the single glyph we use instead of
// shipping the entire multi-megabyte Logos collection to the browser.
const GOOGLE_ICON_BODY = '<path fill="#4285f4" d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622l38.755 30.023l2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"/><path fill="#34a853" d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055c-34.523 0-63.824-22.773-74.269-54.25l-1.531.13l-40.298 31.187l-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"/><path fill="#fbbc05" d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82c0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602z"/><path fill="#eb4335" d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0C79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"/>';

function IconifyIcon({ name, size = 20, color = "#17171c", className = "" }: { name: string; size?: number; color?: string; className?: string }) {
  return (
    <svg viewBox={ICON_VIEWBOX} width={size} height={size} className={className} aria-hidden>
      <g dangerouslySetInnerHTML={{ __html: iconBody(name, [color]) ?? "" }} />
    </svg>
  );
}

function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 256 262" width={size} height={size} aria-hidden>
      <g dangerouslySetInnerHTML={{ __html: GOOGLE_ICON_BODY }} />
    </svg>
  );
}

/** Sign-in modal: Google OAuth + passwordless email magic-link + email/password. */
export function AuthModal({ onClose }: { onClose: () => void }) {
  const { signInGoogle, sendMagicLink, signInPassword } = useAuth();
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function google() {
    setBusy("google");
    setErr(null);
    try {
      await signInGoogle();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't sign in with Google.");
    } finally {
      setBusy(null);
    }
  }

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setErr("Enter a valid email address.");
      return;
    }
    if (usePassword && password.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }
    setBusy("email");
    setErr(null);
    try {
      if (usePassword) {
        await signInPassword(email.trim(), password);
        onClose();
      } else {
        await sendMagicLink(email.trim());
        setSent(true);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : usePassword ? "Couldn't sign in." : "Couldn't send the link.");
    } finally {
      setBusy(null);
    }
  }

  const ui = (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#09090b]/80 p-4 backdrop-blur-md"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative max-h-[min(680px,calc(100vh-32px))] w-[min(760px,96vw)] overflow-y-auto rounded-[24px] border border-white/[0.08] bg-[#0f1014] shadow-[0_32px_100px_rgba(0,0,0,0.6)]">
        <button onClick={onClose} title="Close" className="fk-press absolute right-5 top-5 z-10 grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/10">
          <IconifyIcon name="close-circle" size={20} color="#ffffff" />
        </button>

        <div className="grid md:grid-cols-[0.82fr_1.18fr]">
          <section className="relative overflow-hidden border-b border-white/[0.06] bg-[#11131b] px-7 pb-8 pt-9 text-white md:border-b-0 md:border-r md:px-9 md:pt-10">
            <div className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-[#4338ca]/25 blur-3xl" />
            <div className="relative">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white">
                <IconifyIcon name="monitor" size={23} color="#7c3aed" />
              </div>
              <p className="mt-7 text-[11px] font-medium uppercase tracking-[0.18em] text-[#a5b4fc]">MockFrame</p>
              <h1 className="mt-2 max-w-[260px] text-[30px] font-medium leading-[1.06] tracking-[-0.04em]">Your work, wherever you create.</h1>
              <p className="mt-4 max-w-[270px] text-[13px] leading-6 text-zinc-400">Save your scenes, return to your drafts, and keep every mockup ready across devices.</p>
              <div className="mt-9 space-y-3.5">
                {[
                  ["shield-check", "Private by default"],
                  ["refresh-circle", "Pick up where you left off"],
                  ["magic-stick-3", "Build faster with reusable scenes"],
                ].map(([icon, label]) => (
                    <div key={label} className="flex items-center gap-2.5 text-[12px] text-zinc-300">
                    <IconifyIcon name={icon} size={17} color="#c4b5fd" />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-[#0f1014] px-6 py-8 text-white md:px-10 md:py-10">
            <div className="pr-8">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-violet-400">Welcome back</p>
              <h2 className="mt-1 text-[25px] font-medium tracking-[-0.035em] text-white">Sign in to MockFrame</h2>
              <p className="mt-2 text-[12px] leading-5 text-zinc-400">Your guest work will stay with you when you create an account.</p>
            </div>

            {sent ? (
              <div className="mt-9 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-5 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-400/10"><IconifyIcon name="letter" size={23} color="#34d399" /></div>
                <p className="mt-4 text-[14px] font-semibold text-white">Check your inbox</p>
                <p className="mt-1 text-[12px] leading-5 text-zinc-400">We sent a sign-in link to <strong className="text-zinc-200">{email}</strong>. Open it on this device to finish.</p>
              </div>
            ) : (
              <>
                <button onClick={google} disabled={busy !== null} className="fk-press mt-8 flex w-full items-center justify-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.04] py-3 text-[13px] font-semibold text-white hover:bg-white/[0.08] disabled:opacity-50">
                  {busy === "google" ? <IconifyIcon name="refresh-circle" size={17} color="#7c3aed" className="animate-spin" /> : <GoogleIcon size={18} />}
                  Continue with Google
                </button>

                <div className="my-5 flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-600"><span className="h-px flex-1 bg-white/[0.08]" /> or <span className="h-px flex-1 bg-white/[0.08]" /></div>

                <form onSubmit={submitEmail} className="flex flex-col gap-2.5">
                  <label className="text-[11px] font-medium text-zinc-400">Email address</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-3 text-[13px] text-white outline-none placeholder:text-zinc-600 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/10" />
                  {usePassword && <><label className="mt-1 text-[11px] font-medium text-zinc-400">Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6+ characters" className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-3 text-[13px] text-white outline-none placeholder:text-zinc-600 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/10" /></>}
                  <button type="submit" disabled={busy !== null} className="fk-press mt-1 flex items-center justify-center gap-2 rounded-lg bg-white py-3 text-[13px] font-semibold text-zinc-900 hover:bg-zinc-200 disabled:opacity-50">
                    {busy === "email" ? <IconifyIcon name="refresh-circle" size={16} color="#ffffff" className="animate-spin" /> : <IconifyIcon name={usePassword ? "key" : "letter"} size={16} color="#ffffff" />}
                    {usePassword ? "Sign in / create account" : "Email me a magic link"}
                  </button>
                  <button type="button" onClick={() => { setUsePassword((v) => !v); setErr(null); }} className="pt-1 text-center text-[11.5px] font-medium text-violet-400 hover:text-violet-300">
                    {usePassword ? "Use a magic link instead" : "Use a password instead"}
                  </button>
                </form>
              </>
            )}
            {err && <p className="mt-4 rounded-lg border border-red-400/20 bg-red-400/[0.06] px-3 py-2 text-center text-[12px] leading-5 text-red-300">{err}</p>}
          </section>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(ui, document.body) : null;
}
