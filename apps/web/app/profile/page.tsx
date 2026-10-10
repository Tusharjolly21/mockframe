"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Copy, Crown, ExternalLink, KeyRound, LayoutTemplate, LogOut, Pencil, Plus } from "lucide-react";
import { AccountButton } from "@/components/AccountButton";
import { AuthModal } from "@/components/AuthModal";
import { BrandMark } from "@/components/marketing/BrandMark";
import { useAuth } from "@/lib/auth";
import { FREE_SAVED_TEMPLATES } from "@/lib/billing/limits";
import { formatPrice, PLANS, type PlanId } from "@/lib/billing/plans";
import { listDrafts, timeAgo, type DraftRecord } from "@/lib/drafts";
import { firebaseFetch } from "@/lib/firebaseClient";

interface PlanStatus {
  active: boolean;
  plan: PlanId | null;
  status: string | null;
  paidThrough: number | null;
  cancelAtPeriodEnd: boolean;
  lifetime: boolean;
  canManage: boolean;
}

const PROVIDER_LABEL: Record<string, string> = { google: "Google", email: "Email and password" };

const longDate = (ms: number) => new Date(ms).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

export default function ProfilePage() {
  const { configured, loading, account, signOut, setName } = useAuth();
  const [signIn, setSignIn] = useState(false);
  const [plan, setPlan] = useState<PlanStatus | null>(null);
  const [drafts, setDrafts] = useState<DraftRecord[] | null>(null);

  useEffect(() => {
    if (!account) return;
    let live = true;
    firebaseFetch("/api/billing/status")
      .then((r) => r.json())
      .then((j: PlanStatus) => live && setPlan(j))
      .catch(() => live && setPlan({ active: false, plan: null, status: null, paidThrough: null, cancelAtPeriodEnd: false, lifetime: false, canManage: false }));
    return () => {
      live = false;
    };
  }, [account]);

  useEffect(() => {
    if (!account) return;
    let live = true;
    listDrafts().then(
      (d) => live && setDrafts(d),
      () => live && setDrafts([])
    );
    return () => {
      live = false;
    };
  }, [account]);

  return (
    <div className="min-h-screen bg-[#f4f4f7] text-[#17171c]">
      <header className="flex items-center gap-3 border-b border-[#e6e6ee] bg-white px-5 py-3">
        <Link href="/" aria-label="MockFrame home" className="flex items-center gap-2">
          <BrandMark size={28} />
          <span className="text-[15px] font-bold tracking-tight">MockFrame</span>
        </Link>
        <Link href="/dashboard" className="fk-press ml-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-[#6b6b76] hover:bg-black/[0.06] hover:text-[#17171c]">
          My scenes
        </Link>
        <Link href="/templates" className="fk-press hidden rounded-lg sm:block px-2.5 py-1.5 text-[12.5px] font-semibold text-[#6b6b76] hover:bg-black/[0.06] hover:text-[#17171c]">
          Templates
        </Link>
        <div className="ml-auto">
          <AccountButton />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {loading ? (
          <div className="space-y-4">
            <div className="h-36 animate-pulse rounded-2xl bg-[#e8e8ef]" />
            <div className="h-48 animate-pulse rounded-2xl bg-[#e8e8ef]" />
          </div>
        ) : !configured ? (
          <Notice title="Accounts aren't available here" text="Sign-in is switched off in this build, so there is no profile to show. Your scenes are saved on this device." />
        ) : !account ? (
          <div className="grid place-items-center rounded-2xl border border-dashed border-[#d6d6e0] bg-white px-6 py-20 text-center">
            <p className="text-[17px] font-bold tracking-tight">Sign in to see your profile</p>
            <p className="mb-5 mt-1 max-w-sm text-[13px] leading-relaxed text-[#8a8a94]">
              Your profile holds your plan, your saved scenes and your API keys. Anything you made as a guest comes with you.
            </p>
            <button onClick={() => setSignIn(true)} className="fk-press rounded-xl bg-[#17171c] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-black">
              Sign in
            </button>
            {signIn && <AuthModal onClose={() => setSignIn(false)} />}
          </div>
        ) : (
          <div className="space-y-5">
            <IdentityCard account={account} setName={setName} onSignOut={signOut} />
            <div className="grid gap-5 md:grid-cols-2">
              <PlanCard plan={plan} />
              <WorkCard drafts={drafts} pro={!!plan?.active} />
            </div>
            <ToolsCard pro={!!plan?.active} />
          </div>
        )}
      </main>
    </div>
  );
}

function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#e6e6ee] bg-white p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[13px] font-bold tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Notice({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-[#e6e6ee] bg-white px-6 py-12 text-center">
      <p className="text-[16px] font-bold tracking-tight">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-[13px] leading-relaxed text-[#8a8a94]">{text}</p>
    </div>
  );
}

function IdentityCard({
  account,
  setName,
  onSignOut,
}: {
  account: NonNullable<ReturnType<typeof useAuth>["account"]>;
  setName: (name: string) => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(account.name ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const label = account.name || account.email || "Your account";
  const initial = label.trim().charAt(0).toUpperCase();

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await setName(draft);
      setEditing(false);
    } catch {
      setError("The name couldn't be saved. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  function copyId() {
    navigator.clipboard?.writeText(account.uid).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }

  const how = account.providers.map((p) => PROVIDER_LABEL[p] ?? p).join(", ");

  return (
    <section className="overflow-hidden rounded-2xl border border-[#e6e6ee] bg-white">
      <div className="h-20 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-400" />
      <div className="flex flex-wrap items-end gap-4 px-5 pb-5">
        <span className="-mt-9 grid h-[72px] w-[72px] shrink-0 place-items-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-violet-600 to-cyan-500 text-[26px] font-bold text-white">
          {account.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={account.photo} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            initial
          )}
        </span>
        <div className="min-w-[60%] flex-1 basis-48 pt-2">
          {editing ? (
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={60}
                aria-label="Display name"
                placeholder="Your name"
                className="w-56 rounded-lg border border-[#d6d6e0] px-3 py-1.5 text-[14px] font-semibold outline-none focus:border-[#17171c]"
              />
              <button disabled={busy} className="fk-press rounded-lg bg-[#17171c] px-3 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-50">
                Save
              </button>
              <button type="button" onClick={() => setEditing(false)} className="fk-press rounded-lg px-3 py-1.5 text-[12.5px] font-semibold text-[#6b6b76] hover:bg-black/[0.05]">
                Cancel
              </button>
            </form>
          ) : (
            <h1 className="flex items-center gap-2 text-[22px] font-bold tracking-tight">
              <span className="truncate">{label}</span>
              <button
                onClick={() => {
                  setDraft(account.name ?? "");
                  setEditing(true);
                }}
                title="Edit your name"
                aria-label="Edit your name"
                className="fk-press grid h-7 w-7 place-items-center rounded-md text-[#9a9aa4] hover:bg-black/[0.05] hover:text-[#17171c]"
              >
                <Pencil size={13} />
              </button>
            </h1>
          )}
          {error && <p className="mt-1 text-[12px] text-[#c0392b]">{error}</p>}
          {account.email && <p className="mt-0.5 truncate text-[13px] text-[#6b6b76]">{account.email}</p>}
        </div>
        <button
          onClick={() => void onSignOut()}
          className="fk-press flex items-center gap-1.5 rounded-xl border border-[#e1e1e8] px-3.5 py-2 text-[12.5px] font-semibold text-[#4a4a55] hover:bg-black/[0.04]"
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>
      <dl className="grid gap-px border-t border-[#eeeef3] bg-[#eeeef3] text-[12.5px] sm:grid-cols-3">
        <Fact label="Signs in with" value={how || "Email"} />
        <Fact label="Member since" value={account.createdAt ? longDate(Date.parse(account.createdAt)) : "Not available"} />
        <div className="bg-white px-5 py-3">
          <dt className="text-[11px] font-semibold text-[#9a9aa4]">Account ID</dt>
          <dd className="mt-0.5 flex items-center gap-1.5">
            <code className="truncate font-mono text-[12px] text-[#4a4a55]">{account.uid}</code>
            <button onClick={copyId} aria-label="Copy account ID" className="fk-press shrink-0 text-[#9a9aa4] hover:text-[#17171c]">
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
          </dd>
        </div>
      </dl>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-5 py-3">
      <dt className="text-[11px] font-semibold text-[#9a9aa4]">{label}</dt>
      <dd className="mt-0.5 font-medium text-[#31313a]">{value}</dd>
    </div>
  );
}

function PlanCard({ plan }: { plan: PlanStatus | null }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function manage() {
    setBusy(true);
    setError(null);
    try {
      const r = await firebaseFetch("/api/billing/portal", { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || typeof j.url !== "string") throw new Error(j.error ?? "The billing portal couldn't be opened.");
      window.location.assign(j.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The billing portal couldn't be opened.");
      setBusy(false);
    }
  }

  if (!plan) return <div className="h-48 animate-pulse rounded-2xl bg-[#e8e8ef]" />;

  const paidThroughMs = plan.paidThrough ? plan.paidThrough * 1000 : null;
  const planName = plan.plan ? `Pro ${plan.plan === "yearly" ? "Annual" : "Monthly"}` : "Pro";

  return (
    <Card
      title="Plan"
      action={
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${plan.active ? "bg-[#ede9fe] text-[#6d28d9]" : "bg-[#f0f0f5] text-[#6b6b76]"}`}>
          {plan.active && <Crown size={11} />} {plan.active ? "Pro" : "Free"}
        </span>
      }
    >
      {plan.active ? (
        <>
          <p className="text-[18px] font-bold tracking-tight">{plan.lifetime ? "Pro for life" : planName}</p>
          {!plan.lifetime && (
            <p className="mt-1 text-[13px] leading-relaxed text-[#6b6b76]">
              {plan.plan ? `${formatPrice(plan.plan, PLANS)} per ${plan.plan === "yearly" ? "year" : "month"}. ` : ""}
              {paidThroughMs
                ? plan.cancelAtPeriodEnd
                  ? `Cancelled. Pro stays on until ${longDate(paidThroughMs)}.`
                  : `Renews on ${longDate(paidThroughMs)}.`
                : ""}
            </p>
          )}
          <p className="mt-3 text-[12.5px] leading-relaxed text-[#6b6b76]">
            Photoreal renders, video and GIF export, 4K and 6K, all backgrounds and layouts, the render API, and a commercial licence.
          </p>
          {plan.canManage && (
            <button
              onClick={() => void manage()}
              disabled={busy}
              className="fk-press mt-4 inline-flex items-center gap-1.5 rounded-xl border border-[#e1e1e8] px-3.5 py-2 text-[12.5px] font-semibold hover:bg-black/[0.04] disabled:opacity-50"
            >
              {busy ? "Opening…" : "Manage billing"} <ExternalLink size={13} />
            </button>
          )}
          {error && <p className="mt-2 text-[12px] leading-snug text-[#c0392b]">{error}</p>}
        </>
      ) : (
        <>
          <p className="text-[18px] font-bold tracking-tight">Free</p>
          <p className="mt-1 text-[13px] leading-relaxed text-[#6b6b76]">
            The whole editor, every device, HD export without a watermark, {FREE_SAVED_TEMPLATES} saved templates and the screen recorder.
          </p>
          <Link href="/pricing" className="fk-press mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#17171c] px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-black">
            See Pro plans <ArrowUpRight size={13} />
          </Link>
        </>
      )}
    </Card>
  );
}

function WorkCard({ drafts, pro }: { drafts: DraftRecord[] | null; pro: boolean }) {
  const scenes = drafts?.filter((d) => d.kind === "scene") ?? [];
  const templates = drafts?.filter((d) => d.kind === "template") ?? [];
  const recent = [...scenes].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3);
  return (
    <Card
      title="Your work"
      action={
        <Link href="/dashboard" className="fk-press text-[12px] font-semibold text-[#5b4cff] hover:underline">
          Open all
        </Link>
      }
    >
      {drafts === null ? (
        <div className="h-28 animate-pulse rounded-xl bg-[#f0f0f5]" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Stat value={scenes.length} label={scenes.length === 1 ? "Saved scene" : "Saved scenes"} />
            <Stat value={templates.length} label={pro ? "Personal templates" : `Templates of ${FREE_SAVED_TEMPLATES}`} icon={<LayoutTemplate size={13} />} />
          </div>
          {recent.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {recent.map((d) => (
                <li key={d.id} className="flex items-center gap-3">
                  <span className="grid h-10 w-14 shrink-0 place-items-center overflow-hidden rounded-md bg-[#eceef3]">
                    {d.thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={d.thumbnail} alt="" className="h-full w-full object-contain" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold">{d.name}</span>
                    <span className="block text-[11.5px] text-[#9a9aa4]">{timeAgo(d.updatedAt)}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Link href="/editor" className="fk-press mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#17171c] px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-black">
              <Plus size={14} /> Make your first scene
            </Link>
          )}
        </>
      )}
    </Card>
  );
}

function Stat({ value, label, icon }: { value: number; label: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-[#f6f6fa] px-3.5 py-3">
      <p className="text-[24px] font-bold leading-none tracking-tight">{value}</p>
      <p className="mt-1.5 flex items-center gap-1 text-[11.5px] font-medium text-[#8a8a94]">
        {icon} {label}
      </p>
    </div>
  );
}

function ToolsCard({ pro }: { pro: boolean }) {
  const links = [
    { href: "/developers/api", icon: <KeyRound size={15} />, title: "API keys", text: pro ? "Create keys for the render API and MCP server." : "Keys come with Pro." },
    { href: "/editor", icon: <Plus size={15} />, title: "New scene", text: "Open a blank canvas in the editor." },
    { href: "/screen-recorder", icon: <ArrowUpRight size={15} />, title: "Screen recorder", text: "Record your app with automatic zooms." },
  ];
  return (
    <Card title="Shortcuts">
      <div className="grid gap-3 sm:grid-cols-3">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="fk-press group rounded-xl border border-[#ececf2] p-3.5 hover:border-[#c9c9d6] hover:bg-[#fafafc]">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#f0f0f5] text-[#4a4a55]">{l.icon}</span>
            <p className="mt-2.5 text-[13px] font-semibold">{l.title}</p>
            <p className="mt-0.5 text-[12px] leading-snug text-[#8a8a94]">{l.text}</p>
          </Link>
        ))}
      </div>
      <p className="mt-4 text-[12px] leading-relaxed text-[#9a9aa4]">
        Need to change your email or delete your account and everything saved with it? Write to{" "}
        <a href="mailto:hello@mockframe.app" className="font-semibold text-[#4a4a55] underline-offset-2 hover:underline">
          hello@mockframe.app
        </a>
        .
      </p>
    </Card>
  );
}
