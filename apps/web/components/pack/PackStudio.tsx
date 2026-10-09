"use client";

import { useEffect, useRef, useState } from "react";
import { AuthModal } from "@/components/AuthModal";
import { UpgradeModal } from "@/components/editor/UpgradeModal";
import { track, trackOnce } from "@/lib/analytics";
import { useEntitlementSync } from "@/lib/billing/client";
import { exportPackZip, requestPackExport } from "@/lib/pack/export";
import { capturableScreens } from "@/lib/pack/ops";
import { usePackStore } from "@/lib/pack/store";
import { PackInspector } from "./PackInspector";
import { PackPreview } from "./PackPreview";
import { ScreenStrip } from "./ScreenStrip";

const UPGRADE_REASON = "App Store screenshot packs";

export function PackStudio() {
  useEntitlementSync();
  const {
    pack,
    hydrate,
    hydrated,
    update,
    addFiles,
    exporting,
    progress,
    setExporting,
    warnings,
    dismissWarnings,
    refreshing,
    refreshFiles,
    refreshFromUrls,
    deployNote,
    dismissDeployNote,
    applyDeployRefresh,
  } = usePackStore();
  const refreshInput = useRef<HTMLInputElement>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState(UPGRADE_REASON);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // openUpgrade() from anywhere in the studio (e.g. the deploy refresh panel)
  useEffect(() => {
    const onUpgrade = (e: Event) => {
      setUpgradeReason((e as CustomEvent<{ reason?: string } | undefined>).detail?.reason ?? UPGRADE_REASON);
      setUpgradeOpen(true);
    };
    window.addEventListener("framekit:upgrade", onUpgrade);
    return () => window.removeEventListener("framekit:upgrade", onUpgrade);
  }, []);

  // a deploy can land while the studio sits in a background tab — pick it up on return
  useEffect(() => {
    if (!hydrated) return;
    let last = Date.now();
    const onFocus = () => {
      if (Date.now() - last < 30_000) return;
      last = Date.now();
      void applyDeployRefresh();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [hydrated, applyDeployRefresh]);

  const missing = pack.screens.filter((s) => !s.assetId).length;
  const anyTarget = Object.values(pack.targets).some(Boolean);
  const urlScreens = capturableScreens(pack).length;
  const hasShots = pack.screens.some((s) => s.assetId);
  const busy = exporting || !!refreshing;

  // release refresh: new screenshots in, everything else (captions, languages, style) kept
  async function runRefresh(kind: "files" | "urls", files: File[] = []) {
    setError(null);
    setDone(null);
    try {
      const summary = kind === "files" ? await refreshFiles(files) : await refreshFromUrls();
      track("pack_refreshed", { kind, screens: pack.screens.length });
      setDone(summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed — please retry.");
    }
  }

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
        track("pack_export_blocked", { reason: verdict.reason });
        if (verdict.reason === "signin") setAuthOpen(true);
        else {
          setUpgradeReason(UPGRADE_REASON);
          setUpgradeOpen(true);
        }
        return;
      }
      setExporting(true, { done: 0, total: 1 });
      const { failed } = await exportPackZip(pack, {
        clean: verdict.clean,
        onProgress: (d, t) => setExporting(true, { done: d, total: t }),
      });
      const stats = { screens: pack.screens.length, languages: 1 + (pack.locales?.length ?? 0), layout: pack.exportLayout ?? "standard", failed: failed.length };
      track("pack_exported", stats);
      trackOnce("first_pack_export", stats);
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
          {refreshing && (
            <span className="text-xs text-white/60">Refreshing {refreshing.done}/{refreshing.total}…</span>
          )}
          {hasShots && (
            <button
              onClick={() => refreshInput.current?.click()}
              disabled={busy}
              title="New release? Drop in the new screenshots — captions, languages and style stay as they are"
              className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/80 transition hover:border-white/35 hover:text-white disabled:opacity-50"
            >
              Update screenshots
            </button>
          )}
          {urlScreens > 0 && (
            <button
              onClick={() => void runRefresh("urls")}
              disabled={busy}
              title={`Re-capture the ${urlScreens} screen(s) that have a source URL`}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/80 transition hover:border-white/35 hover:text-white disabled:opacity-50"
            >
              Re-capture from URLs
            </button>
          )}
          <input
            ref={refreshInput}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = "";
              if (files.length) void runRefresh("files", files);
            }}
          />
          <button
            onClick={() => void onExport()}
            disabled={busy}
            className="rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-semibold transition hover:bg-violet-500 disabled:opacity-50"
          >
            {exporting ? "Exporting…" : "Export pack"}
          </button>
        </div>
      </header>

      {(error || done || deployNote || warnings.length > 0) && (
        <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-[#15151a] px-4 py-2 text-[13px]">
          <div className="space-y-0.5">
            {error && <p className="text-red-400">{error}</p>}
            {deployNote && <p className="text-emerald-400">{deployNote}</p>}
            {done && <p className="text-emerald-400">{done}</p>}
            {warnings.map((w, i) => (
              <p key={i} className="text-amber-300/90">{w}</p>
            ))}
          </div>
          <button
            aria-label="Dismiss"
            className="text-white/40 hover:text-white"
            onClick={() => {
              setError(null);
              setDone(null);
              dismissDeployNote();
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
      {upgradeOpen && <UpgradeModal reason={upgradeReason} onClose={() => setUpgradeOpen(false)} />}
    </div>
  );
}
