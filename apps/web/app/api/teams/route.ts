import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { firestoreDb } from "@/lib/server/firebaseAdmin";
import { attachOwnerCookie, getRequestOwner } from "@/lib/server/requestOwner";
import { requestIsPro } from "@/lib/server/entitlement";
import {
  MAX_TEAMS_OWNED,
  cleanTeamName,
  isAccount,
  membershipIndex,
  publicTeam,
  readTeam,
  roleOf,
  teamsCol,
  type TeamDoc,
} from "@/lib/server/teams";
import { signInRequired, teamError } from "./_shared";

export const runtime = "nodejs";

/** GET: every team I own or belong to (claiming pending email invites). */
export async function GET(req: NextRequest) {
  try {
    const owner = await getRequestOwner(req);
    if (!isAccount(owner)) return signInRequired();
    const db = firestoreDb();
    const col = teamsCol(db);
    const email = owner.emailVerified ? owner.email!.toLowerCase() : null;
    const snaps = await Promise.all([
      col.where("ownerUid", "==", owner.uid).get(),
      col.where("memberUids", "array-contains", owner.uid).get(),
      ...(email ? [col.where("memberEmails", "array-contains", email).get()] : []),
    ]);
    const teams = new Map<string, ReturnType<typeof publicTeam>>();
    const claims: Promise<unknown>[] = [];
    for (const snap of snaps) {
      for (const doc of snap.docs) {
        if (teams.has(doc.id)) continue;
        const team = readTeam(doc.data());
        if (!team) continue;
        const role = roleOf(team, owner);
        if (!role) continue;
        if (role !== "owner" && !team.memberUids.includes(owner.uid)) {
          // first sign-in since the invite: bind the seat to this account
          const members = team.members.map((m) => (!m.uid && m.email === email ? { ...m, uid: owner.uid } : m));
          claims.push(doc.ref.update({ members, ...membershipIndex(members), updatedAt: FieldValue.serverTimestamp() }));
          team.members = members;
        }
        teams.set(doc.id, publicTeam(doc.id, team, role));
      }
    }
    await Promise.all(claims);
    const list = [...teams.values()].sort((a, b) => a.name.localeCompare(b.name));
    return attachOwnerCookie(NextResponse.json(list), owner);
  } catch (err) {
    return teamError(err, "GET");
  }
}

/** POST { name }: create a team (Pro). The creator is its owner. */
export async function POST(req: NextRequest) {
  try {
    const owner = await getRequestOwner(req);
    if (!isAccount(owner)) return signInRequired();
    if (!(await requestIsPro(req))) {
      return NextResponse.json({ error: "Creating a team is a Pro feature" }, { status: 402 });
    }
    const body = (await req.json()) as { name?: unknown };
    const name = cleanTeamName(body.name);
    if (!name) return NextResponse.json({ error: "Give your team a name." }, { status: 400 });
    const col = teamsCol(firestoreDb());
    const owned = (await col.where("ownerUid", "==", owner.uid).count().get()).data().count;
    if (owned >= MAX_TEAMS_OWNED) {
      return NextResponse.json({ error: `You can own up to ${MAX_TEAMS_OWNED} teams.` }, { status: 409 });
    }
    const doc = col.doc();
    const team: TeamDoc = {
      name,
      ownerUid: owner.uid,
      ownerEmail: owner.email?.toLowerCase() ?? null,
      members: [],
      memberUids: [],
      memberEmails: [],
    };
    await doc.set({ ...team, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    return attachOwnerCookie(NextResponse.json(publicTeam(doc.id, team, "owner"), { status: 201 }), owner);
  } catch (err) {
    return teamError(err, "POST");
  }
}
