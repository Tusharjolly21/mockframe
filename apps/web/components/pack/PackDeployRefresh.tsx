"use client";

import { useEffect, useState } from "react";
import { openUpgrade, useIsPro } from "@/lib/billing/gate";
import { capturableScreens } from "@/lib/pack/ops";
import { usePackStore } from "@/lib/pack/store";
import { createHookLink, fetchHook, turnOffHook, type HookInfo } from "@/lib/pack/deployClient";

const fmt = (ms: number) => new Date(ms).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

function snippets(url: string) {
  return {
    "GitHub Actions": `# last step of your deploy job
- name: Refresh store screenshots
  if: github.ref == 'refs/heads/main'
  run: curl -fsS -X POST "\${{ secrets.MOCKFRAME_REFRESH_URL }}"`,
    "Any CI / shell": `curl -fsS -X POST "${url}"`,
  };
}

/**
 * Inspector section: turn a pack's source-URL screens into a pack that keeps
 * itself current. After each production deploy, CI calls a secret link; the
 * server re-captures those screens and the studio swaps them in next time
 * the pack is open. Pro, because every run boots server-side Chromium.
 */
export function PackDeployRefresh() {
  const pack = usePackStore((s) => s.pack);
  const isPro = useIsPro();
  const urlScreens = capturableScreens(pack).length;
  const [hook, setHook] = useState<HookInfo | null | undefined>(undefined); // undefined = loading
  const [freshUrl, setFreshUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<"GitHub Actions" | "Any CI / shell">("GitHub Actions");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!isPro) return;
    let live = true;
    void fetchHook(pack.id).then((h) => live && setHook(h));
    return () => {
      live = false;
    };
  }, [isPro, pack.id]);

  async function create() {
    if (hook && !window.confirm("Make a new link? The current one stops working right away — update it in your CI.")) return;
    setBusy(true);
    setErr(null);
    try {
      const { url, hook: info } = await createHookLink(pack.id);
      setFreshUrl(url);
      setHook(info);
    } catch (e) {
      const reason = (e as { reason?: string }).reason;
      if (reason === "pro" || reason === "signin") openUpgrade("Deploy refreshes");
      else setErr(e instanceof Error ? e.message : "Couldn't create the link");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    if (!window.confirm("Turn off deploy refresh? Calls to the link will be refused.")) return;
    setBusy(true);
    setErr(null);
    try {
      await turnOffHook(pack.id);
      setHook(null);
      setFreshUrl(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't turn it off");
    } finally {
      setBusy(false);
    }
  }

  function copy(text: string, label: string) {
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  const intro = (
    <p className="mb-3 text-[12px] leading-5 text-white/55">
      Ship, and your store screenshots follow. After each deploy, screens with a source URL are re-captured automatically; open the pack and export.
    </p>
  );

  if (!urlScreens) {
    return (
      <>
        {intro}
        <p className="text-[11.5px] leading-5 text-white/40">Add a source URL to at least one screen (in its caption settings above) to use this.</p>
      </>
    );
  }

  if (!isPro) {
    return (
      <>
        {intro}
        <button
          onClick={() => openUpgrade("Deploy refreshes")}
          className="w-full rounded-md bg-violet-600 px-2.5 py-1.5 text-[12px] font-semibold transition hover:bg-violet-500"
        >
          Unlock with Pro
        </button>
      </>
    );
  }

  return (
    <>
      {intro}
      {hook === undefined && <p className="text-[12px] text-white/40">Loading…</p>}

      {hook === null && !freshUrl && (
        <button
          onClick={() => void create()}
          disabled={busy}
          className="w-full rounded-md bg-violet-600 px-2.5 py-1.5 text-[12px] font-semibold transition hover:bg-violet-500 disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create deploy link"}
        </button>
      )}

      {freshUrl && (
        <div className="mb-3 space-y-2">
          <p className="text-[11px] text-amber-300/90">Copy this link now — it won&apos;t be shown again. Treat it like a password.</p>
          <div className="flex gap-1.5">
            <input readOnly value={freshUrl} onFocus={(e) => e.target.select()} className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/40 px-2 py-1.5 font-mono text-[10.5px] text-white/80" />
            <button onClick={() => copy(freshUrl, "link")} className="rounded-md border border-white/15 px-2 text-[11.5px] text-white/80 hover:border-white/35">
              {copied === "link" ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="flex gap-1 rounded-lg bg-black/30 p-1 text-[11px]">
            {(["GitHub Actions", "Any CI / shell"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-md py-1 ${tab === t ? "bg-white/10 text-white" : "text-white/50"}`}>
                {t}
              </button>
            ))}
          </div>
          <pre className="overflow-x-auto rounded-md border border-white/10 bg-black/40 p-2 text-[10.5px] leading-4 text-white/75">{snippets(freshUrl)[tab]}</pre>
          <div className="flex items-center justify-between text-[11px] text-white/40">
            <span>{tab === "GitHub Actions" ? "Save the link as the MOCKFRAME_REFRESH_URL secret." : "Run after your production deploy."}</span>
            <button onClick={() => copy(snippets(freshUrl)[tab], "snippet")} className="text-white/70 hover:text-white">
              {copied === "snippet" ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {hook && (
        <div className="space-y-2">
          <p className="text-[12px] text-emerald-400/90">
            On · {urlScreens} screen{urlScreens === 1 ? "" : "s"} refresh on deploy
          </p>
          <p className="text-[11px] leading-4 text-white/45">
            {hook.lastRunAtMs ? `Last run ${fmt(hook.lastRunAtMs)} — ${hook.lastResult ?? "done"}` : "Not called yet."}
          </p>
          <div className="flex gap-2">
            <button onClick={() => void create()} disabled={busy} className="flex-1 rounded-md border border-white/10 px-2 py-1 text-[11.5px] text-white/75 hover:border-white/25 disabled:opacity-50">
              New link
            </button>
            <button onClick={() => void turnOff()} disabled={busy} className="flex-1 rounded-md border border-white/10 px-2 py-1 text-[11.5px] text-white/75 hover:border-red-400/50 hover:text-red-300 disabled:opacity-50">
              Turn off
            </button>
          </div>
        </div>
      )}
      {err && <p className="mt-2 text-[11px] text-red-400">{err}</p>}
    </>
  );
}
