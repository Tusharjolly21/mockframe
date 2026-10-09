import { NextRequest } from "next/server";
import { FIGMA_MAX_FRAME_BYTES, FIGMA_MAX_IMAGE_EDGE, imageSize, parseResultUpload, publicResult, sniffImage } from "@/lib/figmaImport";
import { CORS_HEADERS, corsJson, figmaErrorResponse, readManifest, readResult, saveResults } from "@/lib/server/figmaImport";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string; n: string }> };

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * PUT /api/figma-import/<id>/results/<n>?name=<shot name>&scale=<px per unit> —
 * the editor sends one finished design back to Figma as PNG or JPEG bytes.
 * Sending slot n again replaces it, and the plugin swaps the image in place.
 */
export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const { id, n } = await ctx.params;
    const parsed = parseResultUpload(n, req.nextUrl.searchParams);
    if (!parsed.ok) return corsJson({ error: parsed.error }, { status: 400 });
    if (!(await readManifest(id))) return corsJson({ error: "This Figma import has expired. Send the frames from Figma again." }, { status: 404 });
    const data = Buffer.from(await req.arrayBuffer());
    if (!data.length) return corsJson({ error: "Empty image" }, { status: 400 });
    if (data.length > FIGMA_MAX_FRAME_BYTES) return corsJson({ error: "That design is over 4 MB" }, { status: 413 });
    const type = sniffImage(data);
    const size = type && imageSize(data);
    if (!type || !size) return corsJson({ error: "Designs must be PNG or JPEG" }, { status: 415 });
    if (Math.max(size.width, size.height) > FIGMA_MAX_IMAGE_EDGE) return corsJson({ error: `Designs can be up to ${FIGMA_MAX_IMAGE_EDGE} px on a side` }, { status: 413 });
    const results = await saveResults(id, [{ n: parsed.n, name: parsed.name, scale: parsed.scale, ...size, data, type }]);
    return corsJson(publicResult(results.find((r) => r.n === parsed.n)!));
  } catch (err) {
    return figmaErrorResponse(err, "send back");
  }
}

/** GET /api/figma-import/<id>/results/<n> — the plugin downloads design n. */
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id, n } = await ctx.params;
    const parsed = parseResultUpload(n, new URLSearchParams());
    const hit = parsed.ok && (await readManifest(id)) ? await readResult(id, parsed.n) : null;
    if (!hit) return corsJson({ error: "That design isn't here" }, { status: 404 });
    return new Response(new Uint8Array(hit.data), {
      headers: { ...CORS_HEADERS, "Content-Type": hit.contentType, "Cache-Control": "no-store" },
    });
  } catch (err) {
    return figmaErrorResponse(err, "download result");
  }
}
