import { NextRequest, NextResponse } from "next/server";
import { FirebaseConfigError, firebaseSetupHint } from "@/lib/server/firebaseAdmin";
import { attachOwnerCookie, getRequestOwner } from "@/lib/server/requestOwner";
import { isBillingActive, readBilling } from "@/lib/server/billing";
import { createHook, getHookInfo, PACK_ID_RE, revokeHook } from "@/lib/server/packRefresh";

export const runtime = "nodejs";

/**
 * A pack's deploy-refresh link: GET its status, POST to create (or rotate)
 * it — Pro, signed-in only; the link is in the response once — DELETE to
 * turn it off. The link itself is called by CI: /api/hooks/pack-refresh/[token].
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
    return attachOwnerCookie(NextResponse.json({ hook: await getHookInfo(owner.ownerId, id) }, { headers: { "Cache-Control": "no-store" } }), owner);
  } catch (err) {
    if (err instanceof FirebaseConfigError) return configError();
    console.error("[refresh-hook GET]", err);
    return NextResponse.json({ error: "Couldn't load the deploy link" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!PACK_ID_RE.test(id)) return NextResponse.json({ error: "Bad pack id" }, { status: 400 });
  try {
    const owner = await getRequestOwner(req);
    if (!owner.uid || owner.signInProvider === "anonymous") {
      return NextResponse.json({ allowed: false, reason: "signin", error: "Sign in to create a deploy link" }, { status: 401 });
    }
    if (!isBillingActive(await readBilling(owner.uid))) {
      return NextResponse.json({ allowed: false, reason: "pro", error: "Deploy refresh is part of Pro" }, { status: 402 });
    }
    const token = await createHook(owner.ownerId, owner.uid, id);
    const origin = req.nextUrl.origin;
    return attachOwnerCookie(
      NextResponse.json({ url: `${origin}/api/hooks/pack-refresh/${token}`, hook: await getHookInfo(owner.ownerId, id) }),
      owner
    );
  } catch (err) {
    if (err instanceof FirebaseConfigError) return configError();
    console.error("[refresh-hook POST]", err);
    return NextResponse.json({ error: "Couldn't create the deploy link" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!PACK_ID_RE.test(id)) return NextResponse.json({ error: "Bad pack id" }, { status: 400 });
  try {
    const owner = await getRequestOwner(req);
    await revokeHook(owner.ownerId, id);
    return attachOwnerCookie(NextResponse.json({ ok: true }), owner);
  } catch (err) {
    if (err instanceof FirebaseConfigError) return configError();
    console.error("[refresh-hook DELETE]", err);
    return NextResponse.json({ error: "Couldn't turn off the deploy link" }, { status: 500 });
  }
}
