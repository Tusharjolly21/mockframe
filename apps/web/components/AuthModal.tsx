"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/lib/auth";
import { ICON_VIEWBOX, iconBody } from "@/lib/iconStickers";
import { icons as iconifyLogos } from "@iconify-json/logos";

function IconifyIcon({ name, size = 20, color = "#17171c", className = "" }: { name: string; size?: number; color?: string; className?: string }) {
  return (
    <svg viewBox={ICON_VIEWBOX} width={size} height={size} className={className} aria-hidden>
      <g dangerouslySetInnerHTML={{ __html: iconBody(name, [color]) ?? "" }} />
    </svg>
  );
}

function GoogleIcon({ size = 18 }: { size?: number }) {
  const icon = iconifyLogos.icons["google-icon"];
  return (
    <svg viewBox="0 0 256 262" width={size} height={size} aria-hidden>
      <g dangerouslySetInnerHTML={{ __html: icon?.body ?? "" }} />
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
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0c0d12]/70 p-4 backdrop-blur-md"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative max-h-[min(680px,calc(100vh-32px))] w-[min(760px,96vw)] overflow-y-auto rounded-[24px] border border-white/70 bg-[#f8f8fb] shadow-[0_32px_100px_rgba(0,0,0,0.38)]">
        <button onClick={onClose} title="Close" className="fk-press absolute right-5 top-5 z-10 grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/10 hover:bg-white/20">
          <IconifyIcon name="close-circle" size={20} color="#ffffff" />
        </button>

        <div className="grid md:grid-cols-[0.82fr_1.18fr]">
          <section className="relative overflow-hidden bg-[#11131b] px-7 pb-8 pt-9 text-white md:px-9 md:pt-10">
            <div className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-[#4338ca]/25 blur-3xl" />
            <div className="relative">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white">
                <IconifyIcon name="monitor" size={23} color="#7c3aed" />
              </div>
              <p className="mt-7 text-[11px] font-bold uppercase tracking-[0.18em] text-[#a5b4fc]">MockFrame</p>
              <h1 className="mt-2 max-w-[260px] text-[30px] font-bold leading-[1.06] tracking-[-0.05em]">Your work, wherever you create.</h1>
              <p className="mt-4 max-w-[270px] text-[13px] leading-6 text-white/55">Save your scenes, return to your drafts, and keep every mockup ready across devices.</p>
              <div className="mt-9 space-y-3.5">
                {[
                  ["shield-check", "Private by default"],
                  ["refresh-circle", "Pick up where you left off"],
                  ["magic-stick-3", "Build faster with reusable scenes"],
                ].map(([icon, label]) => (
                  <div key={label} className="flex items-center gap-2.5 text-[12px] text-white/70">
                    <IconifyIcon name={icon} size={17} color="#c4b5fd" />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="px-6 py-8 md:px-10 md:py-10">
            <div className="pr-8">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7c3aed]">Welcome back</p>
              <h2 className="mt-1 text-[25px] font-bold tracking-[-0.04em] text-[#17171c]">Sign in to MockFrame</h2>
              <p className="mt-2 text-[12px] leading-5 text-[#858592]">Your guest work will stay with you when you create an account.</p>
            </div>

            {sent ? (
              <div className="mt-9 rounded-2xl border border-[#d9f3e5] bg-[#f2fcf6] p-5 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#d9f3e5]"><IconifyIcon name="letter" size={23} color="#059669" /></div>
                <p className="mt-4 text-[14px] font-bold text-[#17171c]">Check your inbox</p>
                <p className="mt-1 text-[12px] leading-5 text-[#6f7d75]">We sent a sign-in link to <strong className="text-[#37443c]">{email}</strong>. Open it on this device to finish.</p>
              </div>
            ) : (
              <>
                <button onClick={google} disabled={busy !== null} className="fk-press mt-8 flex w-full items-center justify-center gap-2.5 rounded-xl border border-[#dedee8] bg-white py-3 text-[13px] font-bold text-[#17171c] hover:border-[#bdbdca] disabled:opacity-50">
                  {busy === "google" ? <IconifyIcon name="refresh-circle" size={17} color="#7c3aed" className="animate-spin" /> : <GoogleIcon size={18} />}
                  Continue with Google
                </button>

                <div className="my-5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#b0b0ba]"><span className="h-px flex-1 bg-[#e7e7ee]" /> or <span className="h-px flex-1 bg-[#e7e7ee]" /></div>

                <form onSubmit={submitEmail} className="flex flex-col gap-2.5">
                  <label className="text-[11px] font-semibold text-[#555561]">Email address</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="rounded-xl border border-[#dedee8] bg-white px-3.5 py-3 text-[13px] text-[#17171c] outline-none placeholder:text-[#a0a0aa] focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/10" />
                  {usePassword && <><label className="mt-1 text-[11px] font-semibold text-[#555561]">Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6+ characters" className="rounded-xl border border-[#dedee8] bg-white px-3.5 py-3 text-[13px] text-[#17171c] outline-none placeholder:text-[#a0a0aa] focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/10" /></>}
                  <button type="submit" disabled={busy !== null} className="fk-press mt-1 flex items-center justify-center gap-2 rounded-xl bg-[#17171c] py-3 text-[13px] font-bold text-white hover:bg-[#2d2d36] disabled:opacity-50">
                    {busy === "email" ? <IconifyIcon name="refresh-circle" size={16} color="#ffffff" className="animate-spin" /> : <IconifyIcon name={usePassword ? "key" : "letter"} size={16} color="#ffffff" />}
                    {usePassword ? "Sign in / create account" : "Email me a magic link"}
                  </button>
                  <button type="button" onClick={() => { setUsePassword((v) => !v); setErr(null); }} className="pt-1 text-center text-[11.5px] font-semibold text-[#7c3aed] hover:text-[#5b21b6]">
                    {usePassword ? "Use a magic link instead" : "Use a password instead"}
                  </button>
                </form>
              </>
            )}
            {err && <p className="mt-4 rounded-xl bg-[#fff1f0] px-3 py-2 text-center text-[12px] leading-5 text-[#b42318]">{err}</p>}
          </section>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(ui, document.body) : null;
}
