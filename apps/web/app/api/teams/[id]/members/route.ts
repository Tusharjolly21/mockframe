import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { firestoreDb } from "@/lib/server/firebaseAdmin";
import { getRequestOwner } from "@/lib/server/requestOwner";
import {
  MAX_MEMBERS,
  isAccount,
  membershipIndex,
  normalizeEmail,
  publicTeam,
  teamAccess,
  upsertMember,
  verifiedUidForEmail,
  type MemberRole,
} from "@/lib/server/teams";
import { forbidden, notFound, signInRequired, teamError } from "../../_shared";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

/** POST { email, role }: invite a teammate or change their role (owner). */
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const owner = await getRequestOwner(req);
    if (!isAccount(owner)) return signInRequired();
    const { id } = await ctx.params;
    const access = await teamAccess(firestoreDb(), id, owner);
    if (!access) return notFound();
    if (access.role !== "owner") return forbidden("Only the team owner can invite people.");
    const body = (await req.json()) as { email?: unknown; role?: unknown };
    const email = normalizeEmail(body.email);
    if (!email) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    if (body.role !== "editor" && body.role !== "viewer") {
      return NextResponse.json({ error: "Choose Editor or Viewer." }, { status: 400 });
    }
    if (email === access.team.ownerEmail) return NextResponse.json({ error: "You already own this team." }, { status: 400 });
    const existing = access.team.members.some((m) => m.email === email);
    if (!existing && access.team.members.length >= MAX_MEMBERS) {
      return NextResponse.json({ error: `Teams can have up to ${MAX_MEMBERS} members.` }, { status: 409 });
    }
    const uid = existing ? null : await verifiedUidForEmail(email);
    const members = upsertMember(access.team.members, { email, uid, role: body.role as MemberRole });
    await access.ref.update({ members, ...membershipIndex(members), updatedAt: FieldValue.serverTimestamp() });
    return NextResponse.json(publicTeam(id, { ...access.team, members }, access.role));
  } catch (err) {
    return teamError(err, "members POST");
  }
}

/** DELETE { email }: the owner removes anyone; a member can remove themselves (leave). */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const owner = await getRequestOwner(req);
    if (!isAccount(owner)) return signInRequired();
    const { id } = await ctx.params;
    const access = await teamAccess(firestoreDb(), id, owner);
    if (!access) return notFound();
    const email = normalizeEmail(((await req.json()) as { email?: unknown }).email);
    if (!email) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    const seat = access.team.members.find((m) => m.email === email);
    if (!seat) return NextResponse.json({ error: "That person isn't on the team." }, { status: 404 });
    const self = seat.uid === owner.uid || (!seat.uid && owner.emailVerified && email === owner.email?.toLowerCase());
    if (access.role !== "owner" && !self) return forbidden("Only the team owner can remove people.");
    const members = access.team.members.filter((m) => m.email !== email);
    await access.ref.update({ members, ...membershipIndex(members), updatedAt: FieldValue.serverTimestamp() });
    return NextResponse.json(self && access.role !== "owner" ? { ok: true, left: true } : publicTeam(id, { ...access.team, members }, access.role));
  } catch (err) {
    return teamError(err, "members DELETE");
  }
}
