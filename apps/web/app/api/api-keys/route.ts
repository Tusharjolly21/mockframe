import { NextRequest, NextResponse } from "next/server";
import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/server/apiKeys";
import { isBillingActive, readBilling } from "@/lib/server/billing";
import { FirebaseConfigError } from "@/lib/server/firebaseAdmin";
import { getRequestOwner } from "@/lib/server/requestOwner";

export const runtime = "nodejs";

/** Your API keys (signed in). Creating one needs Pro; listing and revoking don't. */
async function signedIn(req: NextRequest) {
  const owner = await getRequestOwner(req);
  return owner.uid ?? null;
}

function failed(err: unknown) {
  if (err instanceof FirebaseConfigError) return NextResponse.json({ error: "API keys aren't set up on this server" }, { status: 501 });
  console.error("[api-keys]", err);
  return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
}

export async function GET(req: NextRequest) {
  try {
    const uid = await signedIn(req);
    if (!uid) return NextResponse.json({ error: "Sign in to see your API keys" }, { status: 401 });
    return NextResponse.json({ keys: await listApiKeys(uid) });
  } catch (err) {
    return failed(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const uid = await signedIn(req);
    if (!uid) return NextResponse.json({ error: "Sign in to create an API key" }, { status: 401 });
    if (!isBillingActive(await readBilling(uid))) return NextResponse.json({ error: "API keys come with Pro" }, { status: 402 });
    const body = (await req.json().catch(() => ({}))) as { name?: unknown };
    try {
      const { key, info } = await createApiKey(uid, typeof body.name === "string" ? body.name : "");
      return NextResponse.json({ key, info });
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("You can have up to")) return NextResponse.json({ error: err.message }, { status: 409 });
      throw err;
    }
  } catch (err) {
    return failed(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const uid = await signedIn(req);
    if (!uid) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
    const id = req.nextUrl.searchParams.get("id") ?? "";
    if (!/^[0-9a-f]{64}$/.test(id) || !(await revokeApiKey(uid, id))) return NextResponse.json({ error: "Key not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return failed(err);
  }
}
