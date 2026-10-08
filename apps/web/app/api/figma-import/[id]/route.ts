import { NextRequest } from "next/server";
import { CORS_HEADERS, corsJson, figmaErrorResponse, readManifest } from "@/lib/server/figmaImport";

export const runtime = "nodejs";

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/** GET /api/figma-import/<id> — what was sent (the editor reads this first). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const manifest = await readManifest(id);
    if (!manifest) return corsJson({ error: "These frames have expired. Send them from Figma again." }, { status: 404 });
    return corsJson(manifest);
  } catch (err) {
    return figmaErrorResponse(err, "manifest");
  }
}
