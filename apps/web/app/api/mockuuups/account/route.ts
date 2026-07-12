import { NextResponse } from "next/server";
import { account, MockuuupsError } from "@/lib/server/mockuuups";

/** GET /api/mockuuups/account — remaining render credits (for the panel chip). */

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(await account());
  } catch (err) {
    if (err instanceof MockuuupsError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Failed to load account" }, { status: 500 });
  }
}
