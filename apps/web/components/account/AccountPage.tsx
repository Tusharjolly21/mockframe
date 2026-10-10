"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Loader2, LogOut } from "lucide-react";
import { AuthModal } from "@/components/AuthModal";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { track } from "@/lib/analytics";
import { useAuth, type Account } from "@/lib/auth";
import { NO_PLAN, parsePlanFacts, summarizePlan, type PlanFacts, type PlanSummary } from "@/lib/billing/summary";
import { listDrafts } from "@/lib/drafts";
import { firebaseFetch } from "@/lib/firebaseClient";
import { DEFAULT_PREFERENCES, loadPreferences, savePreferences, type PrefFormat, type PrefQuality, type Preferences } from "@/lib/preferences";

const PRO_PERKS = ["Commercial license", "4K and 6K exports", "Video and GIF export", "Premium backgrounds", "Every chat app", "API and MCP server"];

const card = "rounded-2xl border border-white/10 bg-[#101116] p-6";
const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70";

function memberSince(ms: number | null) {
  return ms ? new Date(ms).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : null;
}

function Avatar({ account, size }: { account: Account; size: number }) {
  const initial = (account.name || account.email || "?").trim().charAt(0).toUpperCase();
  return (
    <span className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 font-semibold text-white" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {account.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={account.photo} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        initial
      )}
    </span>
  );
}

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl bg-white/[0.06] p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={`rounded-lg px-3.5 py-1.5 text-[13px] font-medium ${ring} ${value === o.id ? "bg-white text-zinc-950" : "text-zinc-400 hover:text-white"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Row({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[14px] font-medium">{title}</p>
        {hint && <p className="mt-0.5 text-[12.5px] leading-5 text-zinc-500">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/* ------------------------------- plan card -------------------------------- */

function PlanCard({ plan }: { plan: PlanSummary | null }) {
  if (!plan) return <div className={`${card} h-[208px] animate-pulse`} aria-hidden />;
  if (!plan.pro) {
    return (
      <section className={card} aria-labelledby="plan-title">
        <p className="text-[13px] text-zinc-500">Your plan</p>
        <h2 id="plan-title" className="mt-1 text-[34px] font-semibold leading-none tracking-[-0.03em]">Free</h2>
        <p className="mt-3 max-w-md text-[14px] leading-6 text-zinc-400">{plan.detail}</p>
        {plan.notice && <p role="status" className="mt-4 rounded-xl bg-amber-300/10 px-3.5 py-2.5 text-[13px] leading-5 text-amber-200">{plan.notice}</p>}
        <p className="mt-6 text-[13px] text-zinc-500">Pro adds</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {PRO_PERKS.map((p) => (
            <li key={p} className="rounded-full bg-white/[0.06] px-3 py-1.5 text-[12.5px] text-zinc-300">{p}</li>
          ))}
        </ul>
        <Link href="/pricing" onClick={() => track("upgrade_viewed", { reason: "account" })} className={`mt-6 inline-flex items-center gap-1.5 rounded-xl bg-white px-5 py-2.5 text-[14px] font-semibold text-zinc-950 hover:bg-zinc-200 ${ring}`}>
          See Pro <ArrowUpRight size={15} />
        </Link>
      </section>
    );
  }
  return (
    <section className="rounded-2xl bg-[linear-gradient(135deg,#8b5cf6,#22d3ee_55%,#a78bfa)] p-px" aria-labelledby="plan-title">
      <div className="rounded-[15px] bg-[#0f1016] bg-[radial-gradient(120%_90%_at_0%_0%,rgba(139,92,246,0.22),transparent_55%)] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[13px] text-zinc-400">Your plan</p>
            <h2 id="plan-title" className="mt-1 text-[34px] font-semibold leading-none tracking-[-0.03em]">{plan.title}</h2>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-zinc-950">Active</span>
        </div>
        <p className="mt-3 text-[14.5px] text-zinc-300">{plan.detail}</p>
        {plan.notice && <p role="status" className="mt-4 rounded-xl bg-amber-300/10 px-3.5 py-2.5 text-[13px] leading-5 text-amber-200">{plan.notice}</p>}
        <ul className="mt-6 grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {PRO_PERKS.map((p) => (
            <li key={p} className="flex items-center gap-2 text-[13.5px] text-zinc-300">
              <Check size={15} className="shrink-0 text-cyan-300" /> {p}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------- profile card ------------------------------ */

function ProfileCard({ account, setDisplayName }: { account: Account; setDisplayName: (name: string) => Promise<void> }) {
  const [name, setName] = useState(account.name ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const dirty = name.trim() !== (account.name ?? "");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("saving");
    try {
      await setDisplayName(name);
      setState("saved");
      window.setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("error");
    }
  };

  const since = memberSince(account.createdAt);
  return (
    <section className={card} aria-labelledby="profile-title">
      <h2 id="profile-title" className="text-[18px] font-semibold">Profile</h2>
      <form onSubmit={save} className="mt-5">
        <label htmlFor="display-name" className="text-[13px] text-zinc-400">Name</label>
        <div className="mt-1.5 flex gap-2">
          <input
            id="display-name"
            value={name}
            maxLength={60}
            onChange={(e) => {
              setName(e.target.value);
              setState("idle");
            }}
            placeholder="What should we call you?"
            className={`h-10 min-w-0 flex-1 rounded-lg border border-white/12 bg-white/[0.05] px-3 text-[14px] outline-none placeholder:text-zinc-600 focus:border-cyan-300/60`}
          />
          <button type="submit" disabled={!dirty || state === "saving"} className={`inline-flex h-10 w-[84px] items-center justify-center rounded-lg bg-white text-[13.5px] font-semibold text-zinc-950 hover:bg-zinc-200 disabled:opacity-40 ${ring}`}>
            {state === "saving" ? <Loader2 size={15} className="animate-spin" /> : state === "saved" ? "Saved" : "Save"}
          </button>
        </div>
        {state === "error" && <p role="alert" className="mt-2 text-[13px] text-amber-200">Your name couldn&apos;t be saved. Try again.</p>}
      </form>
      <dl className="mt-6 divide-y divide-white/[0.07] border-t border-white/[0.07] text-[14px]">
        <div className="flex justify-between gap-4 py-3">
          <dt className="text-zinc-500">Email</dt>
          <dd className="min-w-0 truncate">{account.email ?? "None"}</dd>
        </div>
        <div className="flex justify-between gap-4 py-3">
          <dt className="text-zinc-500">Sign-in</dt>
          <dd>{account.provider === "google" ? "Google" : "Email"}</dd>
        </div>
        {since && (
          <div className="flex justify-between gap-4 py-3 last:pb-0">
            <dt className="text-zinc-500">Member since</dt>
            <dd>{since}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}

/* --------------------------- preferences card ------------------------------ */

function PreferencesCard() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);
  useEffect(() => setPrefs(loadPreferences()), []);
  const set = (patch: Partial<Preferences>) =>
    setPrefs((p) => {
      const next = { ...p, ...patch };
      savePreferences(next);
      return next;
    });

  return (
    <section className={card} aria-labelledby="prefs-title">
      <h2 id="prefs-title" className="text-[18px] font-semibold">Preferences</h2>
      <p className="mt-1 text-[13px] text-zinc-500">Saved in this browser. The editor uses them next time it opens.</p>
      <div className="mt-5 divide-y divide-white/[0.07]">
        <Row title="Export format" hint="What the Export panel starts on.">
          <Segmented<PrefFormat>
            label="Export format"
            value={prefs.exportFormat}
            options={[{ id: "png", label: "PNG" }, { id: "jpeg", label: "JPEG" }, { id: "webp", label: "WebP" }]}
            onChange={(exportFormat) => set({ exportFormat })}
          />
        </Row>
        <Row title="Export quality" hint="For JPEG and WebP. Smaller files or sharper ones.">
          <Segmented<PrefQuality>
            label="Export quality"
            value={prefs.exportQuality}
            options={[{ id: "compact", label: "Compact" }, { id: "balanced", label: "Balanced" }, { id: "best", label: "Best" }]}
            onChange={(exportQuality) => set({ exportQuality })}
          />
        </Row>
        <Row title="Autosave" hint="Save every edit to Drafts a moment after you stop.">
          <button
            type="button"
            role="switch"
            aria-checked={prefs.autosave}
            aria-label="Autosave"
            onClick={() => set({ autosave: !prefs.autosave })}
            className={`relative h-7 w-12 rounded-full transition-colors ${ring} ${prefs.autosave ? "bg-cyan-400" : "bg-white/15"}`}
          >
            <span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform ${prefs.autosave ? "translate-x-5" : ""}`} />
          </button>
        </Row>
      </div>
    </section>
  );
}

/* --------------------------------- the page -------------------------------- */

export interface AccountViewProps {
  /** "out" is a guest, "off" means sign-in isn't set up on this server */
  status: "loading" | "off" | "out" | "in";
  account: Account | null;
  facts: PlanFacts | null;
  /** saved scenes on this browser, null while counting */
  scenes: number | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onSetName: (name: string) => Promise<void>;
}

/** Everything on /account, driven by props so it can be shown in any state. */
export function AccountView({ status, account, facts, scenes, onSignIn, onSignOut, onSetName }: AccountViewProps) {
  const plan = facts ? summarizePlan(facts) : null;
  return (
    <main className="min-h-dvh bg-[#09090b] text-white">
      <MarketingNav />
      <div className="mx-auto max-w-4xl px-6 pb-24 pt-28">
        {status === "loading" ? (
          <p className="pt-10 text-[14px] text-zinc-500">Checking your account…</p>
        ) : status === "off" ? (
          <p className="pt-10 text-[14px] text-zinc-500">Accounts aren&apos;t available on this server.</p>
        ) : status === "out" || !account ? (
          <div className="max-w-md pt-10">
            <h1 className="text-[34px] font-semibold leading-[1.05] tracking-[-0.03em]">Your account</h1>
            <p className="mt-3 text-[15px] leading-6 text-zinc-400">Sign in to see your plan, your saved work and your settings.</p>
            <button type="button" onClick={onSignIn} className={`mt-6 rounded-xl bg-white px-5 py-2.5 text-[14px] font-semibold text-zinc-950 hover:bg-zinc-200 ${ring}`}>
              Sign in
            </button>
          </div>
        ) : (
          <>
            <header className="flex items-center gap-4">
              <Avatar account={account} size={64} />
              <div className="min-w-0">
                <h1 className="truncate text-[28px] font-semibold leading-tight tracking-[-0.025em]">{account.name || account.email || "Your account"}</h1>
                {account.name && <p className="truncate text-[14px] text-zinc-500">{account.email}</p>}
              </div>
              {plan?.pro && <span className="ml-auto hidden shrink-0 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 px-3 py-1 text-[12px] font-semibold text-white sm:block">Pro</span>}
            </header>

            <div className="mt-8 space-y-4">
              <PlanCard plan={plan} />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <ProfileCard account={account} setDisplayName={onSetName} />
                <PreferencesCard />
              </div>

              <section className={card} aria-labelledby="work-title">
                <h2 id="work-title" className="text-[18px] font-semibold">Your work</h2>
                <div className="mt-4 divide-y divide-white/[0.07]">
                  <Row title="Saved scenes" hint={scenes === null ? "Counting…" : scenes === 1 ? "1 scene in Drafts on this browser." : `${scenes} scenes in Drafts on this browser.`}>
                    <Link href="/dashboard" className={`inline-flex items-center gap-1.5 rounded-lg bg-white/[0.07] px-3.5 py-2 text-[13px] font-medium hover:bg-white/[0.12] ${ring}`}>
                      Open My scenes <ArrowUpRight size={14} />
                    </Link>
                  </Row>
                  <Row title="API keys" hint={plan?.pro ? "Make mockups from code, or from Claude and Cursor." : "API keys come with Pro."}>
                    <Link href={plan?.pro ? "/developers/api#keys" : "/pricing"} className={`inline-flex items-center gap-1.5 rounded-lg bg-white/[0.07] px-3.5 py-2 text-[13px] font-medium hover:bg-white/[0.12] ${ring}`}>
                      {plan?.pro ? "Manage keys" : "See Pro"} <ArrowUpRight size={14} />
                    </Link>
                  </Row>
                </div>
              </section>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={onSignOut}
                  className={`inline-flex items-center gap-2 rounded-xl border border-white/12 px-4 py-2.5 text-[13.5px] font-medium text-zinc-300 hover:bg-white/[0.06] hover:text-white ${ring}`}
                >
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      <MarketingFooter />
    </main>
  );
}

/** /account: loads who you are, your plan and your saved scenes, then hands them to the view. */
export function AccountPage() {
  const { account, loading, configured, signOut, setDisplayName } = useAuth();
  const [facts, setFacts] = useState<PlanFacts | null>(null);
  const [scenes, setScenes] = useState<number | null>(null);
  const [signIn, setSignIn] = useState(false);

  useEffect(() => {
    if (!account) return;
    let stale = false;
    setFacts(null);
    firebaseFetch("/api/billing/status")
      .then((r) => r.json())
      .then((j) => !stale && setFacts(parsePlanFacts(j)))
      .catch(() => !stale && setFacts(NO_PLAN));
    return () => {
      stale = true;
    };
  }, [account]);

  useEffect(() => {
    listDrafts().then(
      (all) => setScenes(all.filter((d) => d.kind === "scene").length),
      () => setScenes(0)
    );
  }, []);

  return (
    <>
      <AccountView
        status={loading ? "loading" : !configured ? "off" : account ? "in" : "out"}
        account={account}
        facts={facts}
        scenes={scenes}
        onSignIn={() => setSignIn(true)}
        onSignOut={() => void signOut()}
        onSetName={setDisplayName}
      />
      {signIn && <AuthModal onClose={() => setSignIn(false)} />}
    </>
  );
}
