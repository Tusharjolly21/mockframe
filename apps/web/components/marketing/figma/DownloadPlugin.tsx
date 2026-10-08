"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { track } from "@/lib/analytics";
import { buildZip } from "@/lib/zip";

const FILES = ["manifest.json", "code.js", "ui.html"];

/** Zips the plugin's three files (served from /figma-plugin/) for Figma's "Import plugin from manifest". */
export function DownloadPlugin({ className = "" }: { className?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    setBusy(true);
    setError(null);
    try {
      const entries = await Promise.all(
        FILES.map(async (name) => {
          const res = await fetch(`/figma-plugin/${name}`);
          if (!res.ok) throw new Error(name);
          return { name: `mockframe-figma-plugin/${name}`, data: new Uint8Array(await res.arrayBuffer()) };
        })
      );
      const url = URL.createObjectURL(buildZip(entries));
      const a = document.createElement("a");
      a.href = url;
      a.download = "mockframe-figma-plugin.zip";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      track("figma_plugin_downloaded");
    } catch {
      setError("The download didn't start. Refresh the page and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={download}
        disabled={busy}
        className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[14.5px] font-semibold text-zinc-950 transition-colors hover:bg-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-70"
      >
        {busy ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} />}
        Download the plugin
      </button>
      {error && <p role="alert" className="mt-2 text-[13px] text-amber-200">{error}</p>}
    </div>
  );
}
