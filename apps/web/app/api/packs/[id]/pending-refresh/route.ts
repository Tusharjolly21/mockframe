import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { FirebaseConfigError, firebaseSetupHint } from "@/lib/server/firebaseAdmin";
import { attachOwnerCookie, getRequestOwner } from "@/lib/server/requestOwner";
import { acknowledgePending, PACK_ID_RE, readPending } from "@/lib/server/packRefresh";

export const runtime = "nodejs";

/**
 * Screenshots a deploy refresh captured for this pack that the studio hasn't
 * applied yet. GET returns them; POST { atMs, applied } acknowledges, clearing
 * the refresh and cleaning up the screenshots it replaced.
 */

function configError() {
  return NextResponse.json({ error: "Firebase is not configured", hint: firebaseSetupHint() }, { status: 501 });
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!PACK_ID_RE.test(id)) return NextResponse.json({ error: "Bad pack id" }, { status: 400 });
  try {
    const owner = await getRequestOwner(req);
    const found = await readPending(owner.ownerId, id);
    return attachOwnerCookie(NextResponse.json(found ?? { pending: null, assets: [] }, { headers: { "Cache-Control": "no-store" } }), owner);
  } catch (err) {
    if (err instanceof FirebaseConfigError) return configError();
    console.error("[pending-refresh GET]", err);
    return NextResponse.json({ error: "Couldn't load the refresh" }, { status: 500 });
  }
}

const AckSchema = z.object({
  atMs: z.number().int().nonnegative(),
  applied: z.array(z.string().max(100)).max(10),
});

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!PACK_ID_RE.test(id)) return NextResponse.json({ error: "Bad pack id" }, { status: 400 });
  const body = AckSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid acknowledgement" }, { status: 400 });
  try {
    const owner = await getRequestOwner(req);
    await acknowledgePending(owner.ownerId, id, body.data.atMs, body.data.applied);
    return attachOwnerCookie(NextResponse.json({ ok: true }), owner);
  } catch (err) {
    if (err instanceof FirebaseConfigError) return configError();
    console.error("[pending-refresh POST]", err);
    return NextResponse.json({ error: "Couldn't clear the refresh" }, { status: 500 });
  }
}
