import { NextRequest } from "next/server";
import { FIGMA_MAX_FRAME_BYTES, sniffImage } from "@/lib/figmaImport";
import { CORS_HEADERS, corsJson, figmaErrorResponse, readFrame, readManifest, saveFrame } from "@/lib/server/figmaImport";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string; n: string }> };

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

async function frameOf(ctx: Ctx) {
  const { id, n } = await ctx.params;
  const index = Number(n);
  const manifest = await readManifest(id);
  if (!manifest || !Number.isInteger(index) || index < 0 || index >= manifest.frames.length) return null;
  return { id, index };
}

/** PUT /api/figma-import/<id>/<n> — the plugin uploads frame n as PNG or JPEG bytes. */
export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const frame = await frameOf(ctx);
    if (!frame) return corsJson({ error: "Unknown import or frame" }, { status: 404 });
    const data = Buffer.from(await req.arrayBuffer());
    if (!data.length) return corsJson({ error: "Empty frame" }, { status: 400 });
    if (data.length > FIGMA_MAX_FRAME_BYTES) return corsJson({ error: "That frame is over 4 MB. Try a smaller export scale." }, { status: 413 });
    const type = sniffImage(data);
    if (!type) return corsJson({ error: "Frames must be PNG or JPEG" }, { status: 415 });
    await saveFrame(frame.id, frame.index, data, type);
    return corsJson({ ok: true });
  } catch (err) {
    return figmaErrorResponse(err, "upload");
  }
}

/** GET /api/figma-import/<id>/<n> — the editor downloads frame n. */
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const frame = await frameOf(ctx);
    const hit = frame && (await readFrame(frame.id, frame.index));
    if (!hit) return corsJson({ error: "That frame isn't here" }, { status: 404 });
    return new Response(new Uint8Array(hit.data), {
      headers: { ...CORS_HEADERS, "Content-Type": hit.contentType, "Cache-Control": "private, max-age=3600" },
    });
  } catch (err) {
    return figmaErrorResponse(err, "download");
  }
}
