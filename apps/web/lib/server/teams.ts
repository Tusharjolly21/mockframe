import { FieldValue, type DocumentReference, type Firestore } from "firebase-admin/firestore";
import { firebaseAuth } from "./firebaseAdmin";
import type { RequestOwner } from "./requestOwner";

/**
 * Teams: a Pro owner invites teammates by email and everyone shares one
 * library of templates. Firestore layout:
 *
 *   teams/{teamId}                      name, owner, members[], memberUids[], memberEmails[]
 *   teams/{teamId}/templates/{tplId}    name, sceneJson, assetsJson, addedBy…
 *
 * memberUids / memberEmails are denormalized from members[] for indexed
 * "teams I belong to" queries. An invite is "pending" until the invitee signs
 * in with that VERIFIED email; only then is their uid bound to the seat.
 */

export type TeamRole = "owner" | "editor" | "viewer";
export type MemberRole = Exclude<TeamRole, "owner">;

export interface TeamMember {
  email: string;
  uid: string | null;
  role: MemberRole;
}

export interface TeamDoc {
  name: string;
  ownerUid: string;
  ownerEmail: string | null;
  members: TeamMember[];
  memberUids: string[];
  memberEmails: string[];
}

export const MAX_TEAMS_OWNED = 5;
export const MAX_MEMBERS = 25;
export const MAX_TEAM_TEMPLATES = 60;
export const TEAM_TEMPLATE_ID_RE = /^tpl-[a-zA-Z0-9_-]{1,80}$/;
const TEAM_ID_RE = /^[a-zA-Z0-9]{8,40}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const teamsCol = (db: Firestore) => db.collection("teams");

export function isTeamId(id: string): boolean {
  return TEAM_ID_RE.test(id);
}

export function normalizeEmail(email: unknown): string | null {
  if (typeof email !== "string") return null;
  const e = email.trim().toLowerCase();
  return e.length <= 254 && EMAIL_RE.test(e) ? e : null;
}

export function cleanTeamName(name: unknown): string | null {
  if (typeof name !== "string") return null;
  const n = name.replace(/\s+/g, " ").trim().slice(0, 48);
  return n.length ? n : null;
}

/** Signed-in, non-anonymous account with an email — the only kind that can use teams. */
export function isAccount(owner: RequestOwner): owner is RequestOwner & { uid: string } {
  return !owner.isGuest && !!owner.uid && owner.signInProvider !== "anonymous" && !!owner.email;
}

/** The caller's role in a team, or null. Email seats count only for a verified email. */
export function roleOf(team: TeamDoc, owner: RequestOwner): TeamRole | null {
  if (!owner.uid) return null;
  if (team.ownerUid === owner.uid) return "owner";
  const email = owner.emailVerified ? owner.email?.toLowerCase() : undefined;
  const seat = team.members.find((m) => m.uid === owner.uid || (!m.uid && !!email && m.email === email));
  return seat?.role ?? null;
}

export const canEdit = (role: TeamRole | null) => role === "owner" || role === "editor";

/** members[] → the denormalized query arrays. */
export function membershipIndex(members: TeamMember[]): Pick<TeamDoc, "memberUids" | "memberEmails"> {
  return {
    memberUids: [...new Set(members.map((m) => m.uid).filter((v): v is string => !!v))],
    memberEmails: [...new Set(members.map((m) => m.email))],
  };
}

/** Add or update a seat (one per email). */
export function upsertMember(members: TeamMember[], next: TeamMember): TeamMember[] {
  const rest = members.filter((m) => m.email !== next.email);
  const prev = members.find((m) => m.email === next.email);
  return [...rest, { ...next, uid: next.uid ?? prev?.uid ?? null }];
}

/** uid for an invite email, only when that account's email is verified. */
export async function verifiedUidForEmail(email: string): Promise<string | null> {
  try {
    const user = await firebaseAuth().getUserByEmail(email);
    return user.emailVerified ? user.uid : null;
  } catch {
    return null; // no account yet: the invite stays pending
  }
}

export function readTeam(data: FirebaseFirestore.DocumentData | undefined): TeamDoc | null {
  if (!data || typeof data.ownerUid !== "string") return null;
  return {
    name: typeof data.name === "string" ? data.name : "Team",
    ownerUid: data.ownerUid,
    ownerEmail: typeof data.ownerEmail === "string" ? data.ownerEmail : null,
    members: Array.isArray(data.members)
      ? data.members.filter((m: TeamMember) => typeof m?.email === "string" && (m.role === "editor" || m.role === "viewer"))
      : [],
    memberUids: Array.isArray(data.memberUids) ? data.memberUids : [],
    memberEmails: Array.isArray(data.memberEmails) ? data.memberEmails : [],
  };
}

/** Load a team and the caller's role (null team when missing or not a member — callers answer 404 either way). */
export async function teamAccess(
  db: Firestore,
  id: string,
  owner: RequestOwner
): Promise<{ ref: DocumentReference; team: TeamDoc; role: TeamRole } | null> {
  if (!isTeamId(id)) return null;
  const ref = teamsCol(db).doc(id);
  const team = readTeam((await ref.get()).data());
  if (!team) return null;
  const role = roleOf(team, owner);
  if (!role) return null;
  // first visit after a verified sign-in: bind the pending seat to this uid
  if (role !== "owner" && owner.uid && !team.memberUids.includes(owner.uid)) {
    const members = team.members.map((m) => (!m.uid && m.email === owner.email?.toLowerCase() ? { ...m, uid: owner.uid } : m));
    await ref.update({ members, ...membershipIndex(members), updatedAt: FieldValue.serverTimestamp() });
    team.members = members;
    Object.assign(team, membershipIndex(members));
  }
  return { ref, team, role };
}

/** What a client sees about a team. Member emails are visible to everyone on the team. */
export function publicTeam(id: string, team: TeamDoc, role: TeamRole) {
  return {
    id,
    name: team.name,
    role,
    ownerEmail: team.ownerEmail,
    members: team.members.map((m) => ({ email: m.email, role: m.role, pending: !m.uid })),
  };
}
