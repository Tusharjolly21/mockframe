import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { firestoreDb } from "@/lib/server/firebaseAdmin";
import { getRequestOwner } from "@/lib/server/requestOwner";
import { cleanTeamName, isAccount, publicTeam, teamAccess } from "@/lib/server/teams";
import { forbidden, notFound, signInRequired, teamError } from "../_shared";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const owner = await getRequestOwner(req);
    if (!isAccount(owner)) return signInRequired();
    const { id } = await ctx.params;
    const access = await teamAccess(firestoreDb(), id, owner);
    if (!access) return notFound();
    return NextResponse.json(publicTeam(id, access.team, access.role));
  } catch (err) {
    return teamError(err, "GET id");
  }
}

/** PATCH { name }: rename (owner). */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const owner = await getRequestOwner(req);
    if (!isAccount(owner)) return signInRequired();
    const { id } = await ctx.params;
    const access = await teamAccess(firestoreDb(), id, owner);
    if (!access) return notFound();
    if (access.role !== "owner") return forbidden("Only the team owner can rename the team.");
    const name = cleanTeamName(((await req.json()) as { name?: unknown }).name);
    if (!name) return NextResponse.json({ error: "Give your team a name." }, { status: 400 });
    await access.ref.update({ name, updatedAt: FieldValue.serverTimestamp() });
    return NextResponse.json(publicTeam(id, { ...access.team, name }, access.role));
  } catch (err) {
    return teamError(err, "PATCH");
  }
}

/** DELETE: remove the team and its library (owner). */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const owner = await getRequestOwner(req);
    if (!isAccount(owner)) return signInRequired();
    const { id } = await ctx.params;
    const db = firestoreDb();
    const access = await teamAccess(db, id, owner);
    if (!access) return notFound();
    if (access.role !== "owner") return forbidden("Only the team owner can delete the team.");
    const templates = await access.ref.collection("templates").get();
    const batch = db.batch();
    for (const doc of templates.docs) batch.delete(doc.ref);
    batch.delete(access.ref);
    await batch.commit();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return teamError(err, "DELETE");
  }
}
