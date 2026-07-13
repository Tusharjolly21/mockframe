import { NextResponse } from "next/server";
import { PLANS } from "@/lib/billing/plans";

export const runtime = "nodejs";

/**
 * Current plan catalog. The upgrade modal loads this at open so a browser
 * running a stale bundle still displays TODAY's prices — the bundled catalog
 * is only the instant fallback. Checkout independently validates the price
 * the client saw, so the two can never disagree silently.
 */
export async function GET() {
  return NextResponse.json(
    { plans: PLANS },
    { headers: { "Cache-Control": "no-store" } }
  );
}
