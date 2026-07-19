"use client";

import { useEffect, useRef, useState } from "react";
import type { PackMarketing } from "@/lib/pack/schema";

const COPIED_RESET_MS = 1500;

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);
    } catch {
      // clipboard unavailable (permissions/insecure context) — silently no-op
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      className="fk-press shrink-0 rounded-md border border-white/15 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-white/70 hover:bg-white/[0.08]"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function Row({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">{label}</span>
        <CopyButton value={value} label={label} />
      </div>
      {children ?? <p className="whitespace-pre-line text-[13px] leading-5 text-white/80">{value}</p>}
    </div>
  );
}

/** Read-only panel of AI-generated launch copy: subtitle, description,
 *  keywords, Product Hunt tagline, and launch tweet — each with its own
 *  copy-to-clipboard button. Used on the AI success card and in the
 *  read-only pack studio inspector. */
export function LaunchCopyPanel({ marketing }: { marketing: PackMarketing }) {
  const keywordsJoined = marketing.keywords.join(", ");

  return (
    <div className="mt-5 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-left">
      <Row label="App Store subtitle" value={marketing.appStoreSubtitle} />

      <Row label="Description" value={marketing.appStoreDescription}>
        <div className="max-h-40 overflow-y-auto rounded-lg border border-white/10 bg-black/20 px-3 py-2">
          <p className="whitespace-pre-line text-[13px] leading-5 text-white/80">{marketing.appStoreDescription}</p>
        </div>
      </Row>

      <Row label="Keywords" value={keywordsJoined}>
        <div className="flex flex-wrap gap-1.5">
          {marketing.keywords.map((kw, i) => (
            <span
              key={`${kw}-${i}`}
              className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] text-white/70"
            >
              {kw}
            </span>
          ))}
        </div>
      </Row>

      <Row label="Product Hunt tagline" value={marketing.productHuntTagline} />

      <Row label="Launch tweet" value={marketing.launchTweet} />
    </div>
  );
}
