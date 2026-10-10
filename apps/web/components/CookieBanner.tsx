"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CONSENT_KEY, OPEN_CONSENT_EVENT } from "@/lib/consent";

type Gtag = (command: "consent", action: "update", params: Record<string, string>) => void;

function save(choice: "granted" | "denied") {
  try {
    localStorage.setItem(CONSENT_KEY, choice);
  } catch {
    /* private mode: the choice just lasts for this visit */
  }
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  gtag?.("consent", "update", { analytics_storage: choice });
}

/**
 * Asks before Google Analytics may store anything. Until the visitor accepts,
 * analytics_storage stays denied (see the consent default in app/layout.tsx).
 */
export function CookieBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(CONSENT_KEY)) setOpen(true);
    } catch {
      setOpen(true);
    }
    const reopen = () => setOpen(true);
    window.addEventListener(OPEN_CONSENT_EVENT, reopen);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, reopen);
  }, []);

  if (!open) return null;
  const choose = (choice: "granted" | "denied") => {
    save(choice);
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie preferences"
      className="fixed inset-x-4 bottom-4 z-[9999] sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[372px]"
    >
      <div className="rounded-2xl border border-white/15 bg-zinc-900/80 p-4 text-zinc-200 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        <p className="text-[13.5px] font-semibold text-white">Help us improve MockFrame?</p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-zinc-400">
          With your OK we use Google Analytics cookies to see which features get used. Your screenshots never leave your browser for this, and there are no ad trackers. Details in our{" "}
          <Link href="/privacy" className="text-zinc-200 underline underline-offset-2 hover:text-white">
            privacy policy
          </Link>
          .
        </p>
        <div className="mt-3.5 flex gap-2">
          <button
            onClick={() => choose("denied")}
            className="flex-1 rounded-xl border border-white/15 px-3 py-2 text-[13px] font-medium text-zinc-300 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            No thanks
          </button>
          <button
            onClick={() => choose("granted")}
            className="flex-1 rounded-xl bg-white px-3 py-2 text-[13px] font-semibold text-zinc-950 hover:bg-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
