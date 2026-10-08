"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, KeyRound, Loader2, Trash2 } from "lucide-react";
import { track } from "@/lib/analytics";
import { useAuth } from "@/lib/auth";
import { useEntitlementSync } from "@/lib/billing/client";
import { useIsPro } from "@/lib/billing/gate";
import { firebaseFetch } from "@/lib/firebaseClient";

interface KeyInfo {
  id: string;
  name: string;
  preview: string;
  createdAt: number | null;
  lastUsedAt: number | null;
}

const day = (ms: number | null) => (ms ? new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "never");

/** Create, copy and revoke API keys. Keys come with Pro. */
export function ApiKeysPanel() {
  useEntitlementSync();
  const { account, loading, configured, signInGoogle } = useAuth();
  const pro = useIsPro();
  const [keys, setKeys] = useState<KeyInfo[] | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const res = await firebaseFetch("/api/api-keys");
    const body = await res.json().catch(() => ({}));
    if (res.ok) setKeys(body.keys ?? []);
    else setError(body.error ?? "Your keys couldn't be loaded.");
  }, []);

  useEffect(() => {
    if (account) void load();
  }, [account, load]);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await firebaseFetch("/api/api-keys", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return setError(body.error ?? "The key couldn't be created.");
      setFresh(body.key);
      setCopied(false);
      setName("");
      track("api_key_created");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    if (!window.confirm("Revoke this key? Anything using it stops working.")) return;
    const res = await firebaseFetch(`/api/api-keys?id=${id}`, { method: "DELETE" });
    if (res.ok) setKeys((k) => k?.filter((x) => x.id !== id) ?? null);
    else setError("The key couldn't be revoked. Try again.");
  };

  const copy = async () => {
    if (!fresh) return;
    await navigator.clipboard.writeText(fresh).catch(() => {});
    setCopied(true);
  };

  let body: React.ReactNode;
  if (loading) body = <p className="text-[13.5px] text-zinc-500">Checking your account…</p>;
  else if (!configured) body = <p className="text-[13.5px] text-zinc-500">Sign-in isn&apos;t available on this server.</p>;
  else if (!account)
    body = (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-[14px] text-zinc-300">Sign in to create an API key.</p>
        <button type="button" onClick={() => void signInGoogle()} className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-zinc-950 hover:bg-zinc-200">
          Sign in with Google
        </button>
      </div>
    );
  else if (!pro)
    body = (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-[14px] text-zinc-300">API keys come with Pro.</p>
        <Link href="/pricing" className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-zinc-950 hover:bg-zinc-200">
          See Pro
        </Link>
      </div>
    );
  else
    body = (
      <>
        {fresh && (
          <div className="mb-5 rounded-xl border border-emerald-400/30 bg-emerald-400/[0.07] p-4">
            <p className="text-[13px] font-semibold text-emerald-200">Copy your new key now. It won&apos;t be shown again.</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg bg-black/40 px-3 py-2 font-mono text-[12.5px] text-white">{fresh}</code>
              <button type="button" onClick={copy} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 text-[12.5px] font-semibold text-zinc-950 hover:bg-zinc-200">
                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        )}
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            void create();
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="What's it for? (e.g. CI, Claude)"
            aria-label="Key name"
            maxLength={60}
            className="h-10 min-w-0 flex-1 rounded-lg border border-white/12 bg-white/[0.05] px-3 text-[13.5px] text-white outline-none placeholder:text-zinc-500 focus:border-cyan-300/60"
          />
          <button type="submit" disabled={busy} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-white px-4 text-[13px] font-semibold text-zinc-950 hover:bg-zinc-200 disabled:opacity-60">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />} Create key
          </button>
        </form>
        <ul className="mt-4 divide-y divide-white/[0.07]">
          {keys === null ? (
            <li className="py-3 text-[13px] text-zinc-500">Loading your keys…</li>
          ) : keys.length === 0 ? (
            <li className="py-3 text-[13px] text-zinc-500">No keys yet.</li>
          ) : (
            keys.map((k) => (
              <li key={k.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium">{k.name}</p>
                  <p className="text-[12px] text-zinc-500">
                    <span className="font-mono">{k.preview}…</span> · created {day(k.createdAt)} · last used {day(k.lastUsedAt)}
                  </p>
                </div>
                <button type="button" onClick={() => void revoke(k.id)} aria-label={`Revoke ${k.name}`} className="grid h-9 w-9 place-items-center rounded-lg text-zinc-500 hover:bg-white/[0.06] hover:text-red-300">
                  <Trash2 size={15} />
                </button>
              </li>
            ))
          )}
        </ul>
      </>
    );

  return (
    <div id="keys" className="scroll-mt-24 rounded-2xl border border-white/10 bg-[#101116] p-6">
      <h2 className="text-[18px] font-semibold">Your API keys</h2>
      <p className="mt-1 text-[13px] text-zinc-500">Keys work for the REST API and the MCP server.</p>
      <div className="mt-5">{body}</div>
      {error && <p role="alert" className="mt-3 text-[13px] text-amber-200">{error}</p>}
    </div>
  );
}
