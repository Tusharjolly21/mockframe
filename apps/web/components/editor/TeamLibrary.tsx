"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Lock, Plus, Settings2, Trash2, Users, X } from "lucide-react";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/lib/auth";
import { openUpgrade } from "@/lib/billing/gate";
import { useSceneStore, useViewStore } from "@/lib/store";
import {
  NeedsPro,
  TeamsUnavailable,
  addTeamTemplate,
  canEditTeam,
  createTeam,
  deleteTeam,
  deleteTeamTemplate,
  inviteMember,
  listTeamTemplates,
  listTeams,
  removeMember,
  renameTeam,
  type Team,
  type TeamTemplate,
} from "@/lib/teams";
import { applyTemplate, templateFromScene } from "@/lib/userTemplates";
import { StaticScenePreview } from "./StaticScenePreview";
import { toast } from "./Toolbar";

const ACTIVE_KEY = "mockframe:active-team";
const errMsg = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

function readActive(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}
function writeActive(id: string) {
  try {
    localStorage.setItem(ACTIVE_KEY, id);
  } catch {
    /* per-browser convenience only */
  }
}

/**
 * Team library: templates shared with everyone on a team. Owners (Pro) create
 * the team and invite people as editors (add / remove) or viewers (use).
 */
export function TeamLibrary() {
  const { account } = useAuth();
  const isPro = useViewStore((s) => s.removeWatermark);
  const setScene = useSceneStore((s) => s.setScene);
  const select = useViewStore((s) => s.select);
  const [state, setState] = useState<"loading" | "ready" | "signin" | "offline">("loading");
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TeamTemplate[] | null>(null);
  const [naming, setNaming] = useState<null | "team" | "template">(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [manage, setManage] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const team = teams.find((t) => t.id === activeId) ?? null;

  const loadTeams = useCallback(async () => {
    try {
      const list = await listTeams();
      setTeams(list);
      const saved = readActive();
      setActiveId(list.find((t) => t.id === saved)?.id ?? list[0]?.id ?? null);
      setState("ready");
    } catch (e) {
      setState(e instanceof TeamsUnavailable ? e.reason : "offline");
    }
  }, []);

  useEffect(() => {
    setState("loading");
    void loadTeams();
  }, [loadTeams, account?.uid]);

  useEffect(() => {
    if (!activeId) {
      setTemplates(null);
      return;
    }
    let stale = false;
    setTemplates(null);
    listTeamTemplates(activeId).then(
      (list) => !stale && setTemplates(list),
      (e) => {
        if (stale) return;
        setTemplates([]);
        toast(errMsg(e, "Couldn't load the team library"));
      }
    );
    return () => {
      stale = true;
    };
  }, [activeId]);

  if (state === "offline") return null; // cloud features aren't available here

  const startCreate = () => {
    if (!isPro) {
      openUpgrade("Team sharing");
      return;
    }
    setName("My team");
    setNaming("team");
  };

  const confirmName = async () => {
    const value = name.trim();
    if (!value || busy) return;
    setBusy(true);
    try {
      if (naming === "team") {
        const created = await createTeam(value);
        setTeams((t) => [...t, created].sort((a, b) => a.name.localeCompare(b.name)));
        setActiveId(created.id);
        writeActive(created.id);
        setManage(true); // straight to inviting people
        toast(`Created “${created.name}” — invite your teammates`);
      } else if (naming === "template" && team) {
        const tpl = templateFromScene(useSceneStore.getState().scene, value);
        await addTeamTemplate(team.id, tpl);
        setTemplates((list) => [{ ...tpl, addedBy: account?.email ?? null }, ...(list ?? [])]);
        toast(`Shared “${tpl.name}” with ${team.name} ✓`);
      }
      setNaming(null);
    } catch (e) {
      if (e instanceof NeedsPro) openUpgrade("Team sharing");
      else toast(errMsg(e, "Something went wrong"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-3 pt-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#8a8a94]">
          <Users size={12} /> Team library
        </h3>
        {state === "ready" && team && (
          <div className="flex min-w-0 items-center gap-1">
            {teams.length > 1 ? (
              <select
                aria-label="Team"
                value={team.id}
                onChange={(e) => {
                  setActiveId(e.target.value);
                  writeActive(e.target.value);
                }}
                className="max-w-[110px] truncate rounded-lg border border-[#e4e4ec] bg-white px-1.5 py-1 text-[10.5px] font-semibold text-[#17171c]"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="truncate text-[10.5px] font-semibold text-[#5a5a66]">{team.name}</span>
            )}
            <button
              type="button"
              title="Manage team"
              aria-label="Manage team"
              onClick={() => setManage(true)}
              className="fk-press grid h-6 w-6 shrink-0 place-items-center rounded-md border border-[#e4e4ec] bg-white text-[#5a5a66] hover:border-[#17171c]"
            >
              <Settings2 size={11} />
            </button>
          </div>
        )}
      </div>

      {state === "loading" && (
        <p className="flex items-center gap-1.5 rounded-xl bg-[#f6f6fa] px-3 py-2.5 text-[10.5px] text-[#9a9aa4]">
          <Loader2 size={11} className="animate-spin" /> Loading your teams…
        </p>
      )}

      {state === "signin" && (
        <div className="rounded-xl bg-[#f6f6fa] px-3 py-2.5">
          <p className="text-[10.5px] leading-relaxed text-[#6b6b76]">
            Share templates with your team so every screenshot ships on-brand. Sign in to create a team or open one you were invited to.
          </p>
          <button
            type="button"
            onClick={() => setAuthOpen(true)}
            className="fk-press mt-2 rounded-lg bg-[#17171c] px-2.5 py-1.5 text-[10.5px] font-semibold text-white"
          >
            Sign in
          </button>
        </div>
      )}

      {state === "ready" && !team && naming !== "team" && (
        <div className="rounded-xl bg-[#f6f6fa] px-3 py-2.5">
          <p className="text-[10.5px] leading-relaxed text-[#6b6b76]">
            Create a team, invite people by email, and share templates everyone can apply to their own shots. Invited to a team? It appears here once you sign in with that email.
          </p>
          <button
            type="button"
            onClick={startCreate}
            className="fk-press mt-2 inline-flex items-center gap-1 rounded-lg bg-[#17171c] px-2.5 py-1.5 text-[10.5px] font-semibold text-white"
          >
            {isPro ? <Plus size={11} /> : <Lock size={10} className="text-[#e7cf62]" />} Create a team
          </button>
        </div>
      )}

      {naming && (
        <div className="mb-2 flex items-center gap-1.5">
          <input
            autoFocus
            value={name}
            maxLength={naming === "team" ? 48 : 60}
            aria-label={naming === "team" ? "Team name" : "Template name"}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void confirmName();
              if (e.key === "Escape") setNaming(null);
            }}
            className="min-w-0 flex-1 rounded-lg border border-[#e4e4ec] bg-white px-2 py-1.5 text-[11.5px] text-[#17171c] outline-none focus:border-[#17171c]"
          />
          <button onClick={() => void confirmName()} disabled={busy} className="fk-press rounded-lg bg-[#17171c] px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:opacity-60">
            {busy ? "…" : naming === "team" ? "Create" : "Share"}
          </button>
          <button onClick={() => setNaming(null)} aria-label="Cancel" className="fk-press rounded-lg px-1.5 py-1.5 text-[11px] font-semibold text-[#8a8a94]">
            ✕
          </button>
        </div>
      )}

      {state === "ready" && team && (
        <>
          {templates === null ? (
            <p className="flex items-center gap-1.5 px-1 py-2 text-[10.5px] text-[#9a9aa4]">
              <Loader2 size={11} className="animate-spin" /> Loading library…
            </p>
          ) : templates.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {templates.map((tpl) => (
                <div key={tpl.id} className="group relative">
                  <button
                    onClick={() => {
                      setScene((s) => applyTemplate(s, tpl));
                      select(null);
                      toast(`Applied “${tpl.name}” from ${team.name} — your screenshots kept ✨`);
                    }}
                    className="fk-tile w-full cursor-pointer rounded-xl border border-[#e8e8ef] p-1 text-left hover:border-[#17171c]"
                    title={tpl.addedBy ? `Apply “${tpl.name}” · shared by ${tpl.addedBy}` : `Apply “${tpl.name}”`}
                  >
                    <StaticScenePreview scene={tpl.scene} className="pointer-events-none w-full rounded-xl" />
                    <span className="block truncate px-1 pt-1 text-[10px] font-semibold text-[#5a5a66]">{tpl.name}</span>
                  </button>
                  {canEditTeam(team) && (
                    <button
                      title="Remove from team library"
                      aria-label={`Remove ${tpl.name} from team library`}
                      onClick={() => {
                        const before = templates;
                        setTemplates((t) => (t ?? []).filter((x) => x.id !== tpl.id));
                        deleteTeamTemplate(team.id, tpl.id).catch((e) => {
                          setTemplates(before);
                          toast(errMsg(e, "Couldn't remove the template"));
                        });
                      }}
                      className="fk-press absolute right-1.5 top-1.5 hidden h-6 w-6 place-items-center rounded-md bg-white/90 text-[#9a9aa4] shadow group-hover:grid hover:text-red-500"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-[#f6f6fa] px-3 py-2.5 text-[10.5px] leading-relaxed text-[#9a9aa4]">
              {canEditTeam(team)
                ? `Nothing shared yet. Share the current scene so everyone on ${team.name} can reuse it.`
                : `Nothing shared yet. Templates your teammates share will appear here.`}
            </p>
          )}
          {canEditTeam(team) && !naming && (
            <button
              type="button"
              onClick={() => {
                setName(`Team template ${(templates?.length ?? 0) + 1}`);
                setNaming("template");
              }}
              className="fk-press mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-[#d6d6e0] bg-white px-2 py-1.5 text-[10.5px] font-semibold text-[#17171c] hover:border-[#17171c]"
            >
              <Plus size={11} /> Share current scene with {team.name}
            </button>
          )}
          {!naming && teams.length > 0 && team.role !== "owner" && !teams.some((t) => t.role === "owner") && isPro && (
            <button type="button" onClick={startCreate} className="mt-2 text-[10px] font-semibold text-[#8a8a94] hover:text-[#17171c]">
              + Create your own team
            </button>
          )}
        </>
      )}

      {manage && team && (
        <ManageTeam
          team={team}
          myEmail={account?.email ?? null}
          onClose={() => setManage(false)}
          onChange={(next) => setTeams((list) => list.map((t) => (t.id === next.id ? next : t)))}
          onGone={() => {
            setManage(false);
            const rest = teams.filter((t) => t.id !== team.id);
            setTeams(rest);
            setActiveId(rest[0]?.id ?? null);
          }}
        />
      )}
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  );
}

function ManageTeam({
  team,
  myEmail,
  onClose,
  onChange,
  onGone,
}: {
  team: Team;
  myEmail: string | null;
  onClose: () => void;
  onChange: (t: Team) => void;
  onGone: () => void;
}) {
  const isOwner = team.role === "owner";
  const [teamName, setTeamName] = useState(team.name);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [busy, setBusy] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast(errMsg(e, "Something went wrong"));
    } finally {
      setBusy(false);
    }
  };

  const invite = () =>
    run(async () => {
      const next = await inviteMember(team.id, email, role);
      onChange(next);
      const seat = next.members.find((m) => m.email === email.trim().toLowerCase());
      toast(seat?.pending ? `Invited ${email.trim()} — they'll see ${team.name} after signing in with that email` : `Added ${email.trim()} to ${team.name}`);
      setEmail("");
    });

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/30 p-4 backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={`Manage ${team.name}`} className="w-full max-w-md rounded-2xl bg-white p-5 text-[#17171c] shadow-[0_30px_80px_rgba(20,20,40,0.35)]">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8a94]">Team</p>
            {isOwner ? (
              <input
                value={teamName}
                maxLength={48}
                aria-label="Team name"
                onChange={(e) => setTeamName(e.target.value)}
                onBlur={() => {
                  const value = teamName.trim();
                  if (!value || value === team.name) return setTeamName(team.name);
                  void run(async () => onChange(await renameTeam(team.id, value)));
                }}
                className="-ml-1 mt-0.5 w-full rounded-md px-1 text-[18px] font-semibold outline-none hover:bg-[#f4f4f7] focus:bg-[#f4f4f7]"
              />
            ) : (
              <h2 className="mt-0.5 text-[18px] font-semibold">{team.name}</h2>
            )}
          </div>
          <button onClick={onClose} aria-label="Close" className="fk-press grid h-7 w-7 place-items-center rounded-full text-[#8a8a94] hover:bg-[#f4f4f7]">
            <X size={15} />
          </button>
        </div>

        <ul className="mt-4 max-h-64 space-y-1 overflow-y-auto">
          <li className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[12.5px]">
            <span className="truncate">{team.ownerEmail ?? "Owner"}{isOwner && " (you)"}</span>
            <span className="text-[11px] font-semibold text-[#8a8a94]">Owner</span>
          </li>
          {team.members.map((m) => {
            const me = !!myEmail && m.email === myEmail.toLowerCase();
            return (
              <li key={m.email} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-[12.5px] hover:bg-[#f7f7fa]">
                <span className="min-w-0 truncate">
                  {m.email}
                  {me && " (you)"}
                  {m.pending && <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9.5px] font-semibold text-amber-700">Invited</span>}
                </span>
                {isOwner ? (
                  <span className="flex shrink-0 items-center gap-1">
                    <select
                      value={m.role}
                      aria-label={`Role for ${m.email}`}
                      disabled={busy}
                      onChange={(e) => void run(async () => onChange(await inviteMember(team.id, m.email, e.target.value as "editor" | "viewer")))}
                      className="rounded-md border border-[#e4e4ec] bg-white px-1 py-0.5 text-[11px]"
                    >
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      aria-label={`Remove ${m.email}`}
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          const res = await removeMember(team.id, m.email);
                          if ("id" in res) onChange(res);
                        })
                      }
                      className="fk-press grid h-6 w-6 place-items-center rounded-md text-[#9a9aa4] hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 size={12} />
                    </button>
                  </span>
                ) : (
                  <span className="shrink-0 text-[11px] font-semibold capitalize text-[#8a8a94]">{m.role}</span>
                )}
              </li>
            );
          })}
        </ul>

        {isOwner && (
          <form
            className="mt-3 flex items-center gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (email.trim()) void invite();
            }}
          >
            <input
              type="email"
              required
              value={email}
              placeholder="teammate@company.com"
              aria-label="Invite by email"
              onChange={(e) => setEmail(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-[#e4e4ec] px-2.5 py-2 text-[12.5px] outline-none focus:border-[#17171c]"
            />
            <select
              value={role}
              aria-label="Role"
              onChange={(e) => setRole(e.target.value as "editor" | "viewer")}
              className="rounded-lg border border-[#e4e4ec] bg-white px-1.5 py-2 text-[12px]"
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <button type="submit" disabled={busy} className="fk-press rounded-lg bg-[#17171c] px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-60">
              Invite
            </button>
          </form>
        )}
        <p className="mt-2 text-[11px] leading-relaxed text-[#8a8a94]">
          Editors can share and remove templates; viewers can apply them. People join by signing in with the invited email.
        </p>

        <div className="mt-4 flex justify-end border-t border-[#efeff4] pt-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (!confirmEnd) return setConfirmEnd(true);
              void run(async () => {
                if (isOwner) await deleteTeam(team.id);
                else if (myEmail) await removeMember(team.id, myEmail);
                toast(isOwner ? `Deleted ${team.name}` : `You left ${team.name}`);
                onGone();
              });
            }}
            className={`fk-press rounded-lg px-3 py-1.5 text-[12px] font-semibold ${confirmEnd ? "bg-red-500 text-white" : "text-red-500 hover:bg-red-50"}`}
          >
            {confirmEnd ? (isOwner ? "Delete team and its library" : "Confirm leave") : isOwner ? "Delete team" : "Leave team"}
          </button>
        </div>
      </div>
    </div>
  );
}
