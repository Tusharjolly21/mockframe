import { NextRequest } from "next/server";
import { FIGMA_IMPORT_TTL_MS, publicResult } from "@/lib/figmaImport";
import { CORS_HEADERS, figmaErrorResponse, readManifest, readResults } from "@/lib/server/figmaImport";

export const runtime = "nodejs";

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * GET /api/figma-import/<id>/results — the images sent back to Figma so far:
 * { results: [{ n, name, width, height, scale, version }], expiresAt }. The
 * plugin polls this while the editor is open and places new versions.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const manifest = await readManifest(id);
    const headers = { ...CORS_HEADERS, "Cache-Control": "no-store" };
    if (!manifest) return Response.json({ error: "These frames have expired. Send them from Figma again." }, { status: 404, headers });
    const results = (await readResults(id)).map(publicResult);
    return Response.json({ results, expiresAt: new Date(manifest.createdAt + FIGMA_IMPORT_TTL_MS).toISOString() }, { headers });
  } catch (err) {
    return figmaErrorResponse(err, "results");
  }
}
