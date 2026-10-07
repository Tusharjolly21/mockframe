import { NextRequest, NextResponse } from "next/server";
import { firestoreDb } from "@/lib/server/firebaseAdmin";
import { getRequestOwner } from "@/lib/server/requestOwner";
import { TEAM_TEMPLATE_ID_RE, canEdit, isAccount, teamAccess } from "@/lib/server/teams";
import { forbidden, notFound, signInRequired, teamError } from "../../../_shared";

export const runtime = "nodejs";

/** DELETE: remove a template from the team library (owner / editor). */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string; tplId: string }> }) {
  try {
    const owner = await getRequestOwner(req);
    if (!isAccount(owner)) return signInRequired();
    const { id, tplId } = await ctx.params;
    if (!TEAM_TEMPLATE_ID_RE.test(tplId)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
    const access = await teamAccess(firestoreDb(), id, owner);
    if (!access) return notFound();
    if (!canEdit(access.role)) return forbidden("Viewers can't remove templates from the team library.");
    await access.ref.collection("templates").doc(tplId).delete();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return teamError(err, "templates DELETE");
  }
}
