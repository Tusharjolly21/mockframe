import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { parseImportRequest } from "@/lib/figmaImport";
import { CORS_HEADERS, corsJson, figmaErrorResponse, saveManifest } from "@/lib/server/figmaImport";
import { consumeDailyQuota, quotaSubject } from "@/lib/server/quota";
import { getRequestOwner } from "@/lib/server/requestOwner";

export const runtime = "nodejs";

/** imports per person per day: plenty for real use, a cap on free hosting */
const DAILY_IMPORTS = 60;

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * POST /api/figma-import — the Figma plugin starts an import. Body:
 * { mode: "devices" | "set", set?, platform?, showcase?, frames: [{ name, width, height }] }.
 * Returns the id to upload frames to, and the editor URL to open after.
 */
export async function POST(req: NextRequest) {
  try {
    const parsed = parseImportRequest(await req.json().catch(() => null));
    if (!parsed.ok) return corsJson({ error: parsed.error }, { status: 400 });
    const owner = await getRequestOwner(req);
    const quota = await consumeDailyQuota(quotaSubject(req, owner), "figma-import", DAILY_IMPORTS);
    if (!quota.allowed) return corsJson({ error: "That's a lot of imports today. Try again tomorrow." }, { status: 429 });
    const id = randomUUID();
    await saveManifest({ id, createdAt: Date.now(), ...parsed.value });
    const editorUrl = new URL(`/editor?figma=${id}${parsed.value.showcase ? "&showcase=1" : ""}`, req.nextUrl.origin).toString();
    return corsJson({ id, editorUrl });
  } catch (err) {
    return figmaErrorResponse(err, "create");
  }
}
