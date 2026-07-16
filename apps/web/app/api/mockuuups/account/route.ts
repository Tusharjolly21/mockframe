import { NextRequest, NextResponse } from "next/server";
import { account, MockuuupsError } from "@/lib/server/mockuuups";
import { requestIsPro } from "@/lib/server/entitlement";

/**
 * GET /api/mockuuups/account — remaining render credits (for the panel chip).
 *
 * Pro-only: this is OUR upstream billing state, not the caller's. Left open it
 * published our live credit balance to anyone who asked, and only someone who
 * can actually render has any use for it.
 */

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await requestIsPro(req))) {
    return NextResponse.json({ error: "Realistic renders are a Pro feature" }, { status: 402 });
  }
  try {
    return NextResponse.json(await account());
  } catch (err) {
    if (err instanceof MockuuupsError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Failed to load account" }, { status: 500 });
  }
}
