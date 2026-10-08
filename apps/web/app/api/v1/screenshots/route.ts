import { NextRequest } from "next/server";
import { API_RESULT_TTL_MS, parseRenderJob } from "@/lib/apiRender";
import { authorizeApiRequest } from "@/lib/server/apiKeys";
import { ApiInputError, renderForCaller } from "@/lib/server/apiRender";
import { apiJson, apiOptions } from "@/lib/server/apiResponse";

export const runtime = "nodejs";
// a cold Chromium start plus eight store shots fits well inside this
export const maxDuration = 120;

export const OPTIONS = apiOptions;

/**
 * POST /api/v1/screenshots — device mockups or a store listing set from your
 * screenshots. Needs a Pro API key. Returns links to the images, valid 24 h.
 *
 *   { "screenshots": ["https://…/home.png"], "device": "auto", "look": "glow" }
 *   { "type": "store-set", "style": "penny", "platform": "ios", "screenshots": [...] }
 */
export async function POST(req: NextRequest) {
  const auth = await authorizeApiRequest(req);
  if (!auth.ok) return apiJson({ error: auth.error }, auth.status);
  const parsed = parseRenderJob(await req.json().catch(() => null));
  if (!parsed.ok) return apiJson({ error: parsed.error }, 400);
  try {
    const images = await renderForCaller(parsed.job, auth.caller.uid, req.nextUrl.origin);
    return apiJson(
      { images, expiresAt: new Date(Date.now() + API_RESULT_TTL_MS).toISOString() },
      200,
      { "X-RateLimit-Remaining": String(auth.remaining) }
    );
  } catch (err) {
    if (err instanceof ApiInputError) return apiJson({ error: err.message }, 400);
    console.error("[api/v1/screenshots]", err);
    return apiJson({ error: "The render failed. Try again, or send fewer screenshots." }, 500);
  }
}
