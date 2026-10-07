"use client";

import { firebaseFetch } from "./firebaseClient";
import type { UserTemplate } from "./userTemplates";
import { restoreAssets } from "./assets";

/**
 * Client for team libraries (/api/teams): a Pro owner invites teammates as
 * editors (add / remove templates) or viewers (use them), and everyone on the
 * team applies the same shared templates to their own screenshots.
 */

export type TeamRole = "owner" | "editor" | "viewer";

export interface Team {
  id: string;
  name: string;
  role: TeamRole;
  ownerEmail: string | null;
  members: { email: string; role: "editor" | "viewer"; pending: boolean }[];
}

export interface TeamTemplate extends UserTemplate {
  addedBy: string | null;
}

/** Why teams can't load: signed out, or cloud features unavailable on this deployment. */
export class TeamsUnavailable extends Error {
  constructor(public reason: "signin" | "offline") {
    super(reason === "signin" ? "Sign in to use teams" : "Teams are unavailable right now");
  }
}

export class NeedsPro extends Error {}

async function request<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  let res: Response;
  try {
    res = await firebaseFetch(path, {
      ...init,
      headers: init?.json !== undefined ? { "Content-Type": "application/json" } : init?.headers,
      body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
    });
  } catch {
    throw new TeamsUnavailable("offline");
  }
  const body = await res.json().catch(() => ({}));
  if (res.status === 401) throw new TeamsUnavailable("signin");
  if (res.status === 501) throw new TeamsUnavailable("offline");
  if (res.status === 402) throw new NeedsPro(body.error ?? "Pro feature");
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body as T;
}

export const canEditTeam = (team: Team) => team.role === "owner" || team.role === "editor";

export const listTeams = () => request<Team[]>("/api/teams");
export const createTeam = (name: string) => request<Team>("/api/teams", { method: "POST", json: { name } });
export const renameTeam = (id: string, name: string) => request<Team>(`/api/teams/${id}`, { method: "PATCH", json: { name } });
export const deleteTeam = (id: string) => request<{ ok: true }>(`/api/teams/${id}`, { method: "DELETE" });
export const inviteMember = (id: string, email: string, role: "editor" | "viewer") =>
  request<Team>(`/api/teams/${id}/members`, { method: "POST", json: { email, role } });
export const removeMember = (id: string, email: string) =>
  request<Team | { ok: true; left: true }>(`/api/teams/${id}/members`, { method: "DELETE", json: { email } });

export async function listTeamTemplates(id: string): Promise<TeamTemplate[]> {
  const list = (await request<TeamTemplate[]>(`/api/teams/${id}/templates`)).filter((t) => t && t.scene && t.scene.canvas);
  for (const t of list) restoreAssets(t.assets ?? []);
  return list;
}

export const addTeamTemplate = (id: string, tpl: UserTemplate) =>
  request<{ ok: true }>(`/api/teams/${id}/templates`, { method: "POST", json: tpl });

export const deleteTeamTemplate = (id: string, tplId: string) =>
  request<{ ok: true }>(`/api/teams/${id}/templates/${encodeURIComponent(tplId)}`, { method: "DELETE" });
