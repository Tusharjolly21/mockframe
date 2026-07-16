"use client";

import { useEffect, useState } from "react";
import { AuthModal } from "@/components/AuthModal";
import { UpgradeModal } from "@/components/editor/UpgradeModal";
import { useEntitlementSync } from "@/lib/billing/client";
import { exportPackZip, requestPackExport } from "@/lib/pack/export";
import { usePackStore } from "@/lib/pack/store";
import { PackInspector } from "./PackInspector";
import { PackPreview } from "./PackPreview";
import { ScreenStrip } from "./ScreenStrip";

const UPGRADE_REASON = "App Store screenshot packs";

export function PackStudio() {
  useEntitlementSync();
  const { pack, hydrate, hydrated, update, addFiles, exporting, progress, setExporting, warnings, dismissWarnings } =
    usePackStore();
  const [authOpen, setAuthOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const missing = pack.screens.filter((s) => !s.assetId).length;
  const anyTarget = Object.values(pack.targets).some(Boolean);

  async function onExport() {
    setError(null);
    setDone(null);
    if (missing) {
      setError(`Add a screenshot to every screen (or remove empty screens) — ${missing} still empty.`);
      return;
    }
    if (!anyTarget) {
      setError("Enable at least one export size.");
      return;
    }
    try {
      const verdict = await requestPackExport();
      if (!verdict.allowed) {
        if (verdict.reason === "signin") setAuthOpen(true);
        else setUpgradeOpen(true);
        return;
      }
      setExporting(true, { done: 0, total: 1 });
      const { failed } = await exportPackZip(pack, {
        clean: verdict.clean,
        onProgress: (d, t) => setExporting(true, { done: d, total: t }),
      });
      setDone(
        failed.length
          ? `Pack exported — ${failed.length} file(s) failed and are listed in README.txt.`
          : "Pack exported. See README.txt inside the zip for where each folder uploads."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed — please retry.");
    } finally {
      setExporting(false);
    }
  }

  if (!hydrated) {
    return <div className="flex h-[80vh] items-center justify-center text-white/50">Loading your pack…</div>;
  }

  return (
    <div
      className="flex h-[calc(100vh-0px)] min-h-[560px] flex-col bg-[#0b0b0f] text-white"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files?.length) void addFiles(Array.from(e.dataTransfer.files));
      }}
    >
      <header className="flex items-center gap-3 border-b border-white/10 bg-[#101014] px-4 py-2.5">
        <input
          value={pack.appName}
          onChange={(e) => update((p) => ({ ...p, appName: e.target.value.slice(0, 60) }))}
          placeholder="Your app name"
          className="w-56 rounded-md border border-white/10 bg-black/30 px-2.5 py-1.5 text-sm outline-none focus:border-violet-500"
        />
        <span className="text-xs text-white/40">{pack.screens.length}/10 screens · autosaved</span>
        <div className="ml-auto flex items-center gap-3">
          {exporting && progress && (
            <span className="text-xs text-white/60">Rendering {progress.done}/{progress.total}…</span>
          )}
          <button
            onClick={() => void onExport()}
            disabled={exporting}
            className="rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-semibold transition hover:bg-violet-500 disabled:opacity-50"
          >
            {exporting ? "Exporting…" : "Export pack"}
          </button>
        </div>
      </header>

      {(error || done || warnings.length > 0) && (
        <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-[#15151a] px-4 py-2 text-[13px]">
          <div className="space-y-0.5">
            {error && <p className="text-red-400">{error}</p>}
            {done && <p className="text-emerald-400">{done}</p>}
            {warnings.map((w, i) => (
              <p key={i} className="text-amber-300/90">{w}</p>
            ))}
          </div>
          <button
            className="text-white/40 hover:text-white"
            onClick={() => {
              setError(null);
              setDone(null);
              dismissWarnings();
            }}
          >
            ×
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <ScreenStrip />
        <PackPreview />
        <PackInspector />
      </div>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
      {upgradeOpen && <UpgradeModal reason={UPGRADE_REASON} onClose={() => setUpgradeOpen(false)} />}
    </div>
  );
}
