"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { KeyRound, Loader2, Mail, X } from "lucide-react";
import { useAuth } from "@/lib/auth";

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
      className="fixed inset-0 z-[80] grid place-items-center bg-black/45 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-[min(400px,94vw)] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#ececf2] px-5 py-3.5">
          <h2 className="text-[15px] font-bold text-[#17171c]">Sign in to MockFrame</h2>
          <button onClick={onClose} className="fk-press grid h-7 w-7 place-items-center rounded-lg text-[#9a9aa4] hover:bg-black/6 hover:text-[#17171c]">
            <X size={15} />
          </button>
        </div>

        <div className="px-5 py-5">
          {sent ? (
            <div className="py-4 text-center">
              <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                <Mail size={20} />
              </div>
              <p className="text-[14px] font-semibold text-[#17171c]">Check your inbox</p>
              <p className="mt-1 text-[12.5px] leading-snug text-[#8a8a94]">
                We sent a magic sign-in link to <span className="font-semibold text-[#4a4a55]">{email}</span>. Open it on
                this device to finish — your current work carries over.
              </p>
            </div>
          ) : (
            <>
              <p className="mb-4 text-[12.5px] leading-snug text-[#8a8a94]">
                Save your work to a real account and pick it up on any device. Everything you&apos;ve made as a guest
                comes with you.
              </p>

              <button
                onClick={google}
                disabled={busy !== null}
                className="fk-press flex w-full items-center justify-center gap-2.5 rounded-xl border border-[#e4e4ec] bg-white py-2.5 text-[13.5px] font-semibold text-[#17171c] hover:border-[#c9c9d6] disabled:opacity-50"
              >
                {busy === "google" ? <Loader2 size={16} className="animate-spin" /> : <GoogleG />}
                Continue with Google
              </button>

              <div className="my-4 flex items-center gap-3 text-[11px] font-medium uppercase tracking-wide text-[#b0b0ba]">
                <span className="h-px flex-1 bg-[#ececf2]" /> or <span className="h-px flex-1 bg-[#ececf2]" />
              </div>

              <form onSubmit={submitEmail} className="flex flex-col gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="rounded-xl border border-[#e4e4ec] bg-[#f8f8fb] px-3 py-2.5 text-[13px] text-[#17171c] outline-none placeholder:text-[#a0a0aa] focus:border-[#17171c]"
                />
                {usePassword && (
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password (6+ characters)"
                    className="rounded-xl border border-[#e4e4ec] bg-[#f8f8fb] px-3 py-2.5 text-[13px] text-[#17171c] outline-none placeholder:text-[#a0a0aa] focus:border-[#17171c]"
                  />
                )}
                <button
                  type="submit"
                  disabled={busy !== null}
                  className="fk-press flex items-center justify-center gap-2 rounded-xl bg-[#17171c] py-2.5 text-[13px] font-semibold text-white hover:bg-black disabled:opacity-50"
                >
                  {busy === "email" ? <Loader2 size={15} className="animate-spin" /> : usePassword ? <KeyRound size={15} /> : <Mail size={15} />}
                  {usePassword ? "Sign in / create account" : "Email me a magic link"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUsePassword((v) => !v);
                    setErr(null);
                  }}
                  className="text-center text-[11.5px] font-medium text-[#8a8a94] hover:text-[#17171c]"
                >
                  {usePassword ? "Use a magic link instead" : "Use a password instead"}
                </button>
              </form>
            </>
          )}

          {err && <p className="mt-3 text-center text-[12px] text-[#c0392b]">{err}</p>}
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(ui, document.body) : null;
}

function GoogleG() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.3 0 24 0 14.6 0 6.4 5.4 2.6 13.2l7.9 6.1C12.4 13.2 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-2.8-.4-4.1H24v7.8h12.4c-.3 2.1-1.6 5.2-4.6 7.3l7.1 5.5c4.2-3.9 6.6-9.6 6.6-16.5z" />
      <path fill="#FBBC05" d="M10.5 28.3a14.5 14.5 0 0 1 0-9.3l-7.9-6.1a24 24 0 0 0 0 21.5l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.1-5.5c-2 1.4-4.7 2.3-8.8 2.3-6.3 0-11.6-3.7-13.5-9.1l-7.9 6.1C6.4 42.6 14.6 48 24 48z" />
    </svg>
  );
}
