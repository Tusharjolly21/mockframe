import { NextRequest, NextResponse } from "next/server";
import { listMockups, MockuuupsError } from "@/lib/server/mockuuups";
import { requestIsPro } from "@/lib/server/entitlement";
import { consumeDailyQuota, quotaSubject } from "@/lib/server/quota";
import { attachOwnerCookie, getRequestOwner } from "@/lib/server/requestOwner";

/**
 * GET /api/mockuuups/mockups?page=1 — browse the photoreal mockup catalog.
 * The Mockuuups API has no server-side filtering, so we page through it and
 * slim each entry to what the picker needs. We keep only single-placement
 * DIGITAL mockups (one screenshot → one device) and drop print items.
 *
 * Browsable without Pro (rendering is the paid act — see the devices route),
 * but metered: paging burns our upstream rate limit.
 */

export const runtime = "nodejs";

const PAGE_SIZE = 60;
const FREE_CATALOG_CALLS_PER_DAY = 200;

export async function GET(req: NextRequest) {
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);
  const device = req.nextUrl.searchParams.get("device")?.trim() || undefined;
  const owner = await getRequestOwner(req);
  if (!(await requestIsPro(req))) {
    const quota = await consumeDailyQuota(quotaSubject(req, owner), "mockuuups-catalog", FREE_CATALOG_CALLS_PER_DAY);
    if (!quota.allowed) {
      return NextResponse.json({ error: "Too many catalog requests today — try again tomorrow" }, { status: 429 });
    }
  }
  try {
    const data = await listMockups(page, PAGE_SIZE, device);
    const mockups = data.mockups
      .filter((m) => m.placements.length === 1 && m.placements[0].type === "digital")
      .map((m) => ({
        id: m.id,
        title: m.title,
        thumbnail: m.thumbnail,
        family: m.placements[0].family,
        device: m.placements[0].title,
        w: m.width,
        h: m.height,
      }));
    return attachOwnerCookie(NextResponse.json({ page, pages: data.pages, hasMore: page < data.pages, mockups }), owner);
  } catch (err) {
    if (err instanceof MockuuupsError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Failed to load mockups" }, { status: 500 });
  }
}
