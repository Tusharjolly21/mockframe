"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export interface CodeTab {
  label: string;
  code: string;
}

/** Code samples with tabs (when there's more than one) and a copy button. */
export function CodeTabs({ tabs }: { tabs: CodeTab[] }) {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const tab = tabs[active];

  const copy = async () => {
    await navigator.clipboard.writeText(tab.code).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-[#0d0e12]">
      <div className="flex items-center gap-1 border-b border-white/10 px-2 py-1.5">
        <div role="tablist" className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
          {tabs.map((t, i) => (
            <button
              key={t.label}
              type="button"
              role="tab"
              aria-selected={i === active}
              onClick={() => {
                setActive(i);
                setCopied(false);
              }}
              className={`shrink-0 rounded-md px-2.5 py-1.5 text-[12px] font-medium ${i === active ? "bg-white/[0.08] text-white" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={copy} className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] text-zinc-400 hover:bg-white/[0.06] hover:text-white">
          {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-[12.5px] leading-[1.7] text-zinc-300">
        <code>{tab.code}</code>
      </pre>
    </div>
  );
}
