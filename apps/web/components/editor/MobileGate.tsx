"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, MessageSquare, Monitor } from "lucide-react";

const DISMISS_KEY = "fk-mobile-gate-dismissed";

/**
 * The full editor's fixed panels are unusable on phones. Instead of letting
 * mobile visitors bounce off a broken UI, offer the phone-native chat maker or
 * a copyable link to continue on desktop. Dismissible ("continue anyway") and
 * remembered for the session.
 */
export function MobileGate({ embedded }: { embedded: boolean }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (embedded) return;
    try {
      if (sessionStorage.getItem(DISMISS_KEY)) return;
    } catch {
      /* ignore */
    }
    const small = window.matchMedia("(max-width: 767px)").matches;
    const touch = window.matchMedia("(pointer: coarse)").matches;
    if (small && touch) setOpen(true);
  }, [embedded]);

  function dismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  if (!open) return null;

  const ui = (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#0b0b0e]/85 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#17171c] text-white">
          <Monitor size={20} />
        </span>
        <h2 className="mt-3 text-[18px] font-semibold text-[#17171c]">The full editor loves a bigger screen</h2>
        <p className="mt-1.5 text-[13px] leading-6 text-[#6b6b76]">
          Panels and drag-editing are built for desktop. On your phone, the chat maker works beautifully — or send yourself a link for later.
        </p>
        <div className="mt-4 space-y-2">
          <a href="/chat" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#17171c] py-3 text-[13.5px] font-semibold text-white">
            <MessageSquare size={15} /> Make a chat screenshot instead
          </a>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(window.location.href);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                /* clipboard unavailable */
              }
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-black/10 py-3 text-[13.5px] font-semibold text-[#17171c]"
          >
            <Copy size={14} /> {copied ? "Link copied ✓" : "Copy link for desktop"}
          </button>
          <button onClick={dismiss} className="w-full py-2 text-center text-[12.5px] font-medium text-[#9a9aa4]">
            Continue to the editor anyway
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(ui, document.body) : null;
}
