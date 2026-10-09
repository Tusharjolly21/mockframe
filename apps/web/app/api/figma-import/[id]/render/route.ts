import { NextRequest } from "next/server";
import { FIGMA_DAILY_RENDERS, FIGMA_MAX_FRAME_BYTES, FIGMA_MAX_IMAGE_EDGE, FIGMA_RESULT_SCALE, parseRenderRequest, publicResult, sniffImage } from "@/lib/figmaImport";
import { CORS_HEADERS, corsJson, figmaErrorResponse, readFrame, readManifest, saveResults } from "@/lib/server/figmaImport";
import { runRenderJob } from "@/lib/server/apiRender";
import { consumeDailyQuota, quotaSubject } from "@/lib/server/quota";
import { getRequestOwner } from "@/lib/server/requestOwner";

export const runtime = "nodejs";
// a cold Chromium start plus eight mockups fits well inside this
export const maxDuration = 120;

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * POST /api/figma-import/<id>/render — device mockups of the frames already
 * uploaded to this import, made on the server so the plugin can place them in
 * Figma without opening the editor. Body: { kind: "mockup", device: "auto" |
 * <device id> | "frameless", look: null | 0..5 }. Free, with a daily cap: only
 * device mockups and "Make it pretty" looks; store sets stay in the editor.
 * Returns { results } like GET /results; the images download from /results/<n>.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const parsed = parseRenderRequest(await req.json().catch(() => null));
    if (!parsed.ok) return corsJson({ error: parsed.error }, { status: 400 });
    const manifest = await readManifest(id);
    if (!manifest) return corsJson({ error: "These frames have expired. Send them from Figma again." }, { status: 404 });

    const screenshots: string[] = [];
    for (let i = 0; i < manifest.frames.length; i++) {
      const hit = await readFrame(id, i);
      if (!hit) return corsJson({ error: "Some frames didn't finish uploading. Try again." }, { status: 409 });
      screenshots.push(`data:${hit.contentType};base64,${hit.data.toString("base64")}`);
    }

    const owner = await getRequestOwner(req);
    const quota = await consumeDailyQuota(quotaSubject(req, owner), "figma-render", FIGMA_DAILY_RENDERS);
    if (!quota.allowed) return corsJson({ error: `You've made mockups ${FIGMA_DAILY_RENDERS} times today. Use Open in editor to keep going, or try again tomorrow.` }, { status: 429 });

    let images;
    try {
      images = await runRenderJob(
        {
          kind: "mockup",
          screenshots,
          device: parsed.device,
          look: parsed.look,
          format: "png",
          scale: FIGMA_RESULT_SCALE,
          limit: { maxBytes: FIGMA_MAX_FRAME_BYTES, maxEdge: FIGMA_MAX_IMAGE_EDGE },
        },
        req.nextUrl.origin
      );
    } catch (err) {
      console.error("[figma-import] render", err);
      return corsJson({ error: "Mockframe couldn't make these mockups right now. Try Open in editor instead." }, { status: 502 });
    }

    const items = images.flatMap((img, i) => {
      const [, b64] = img.dataUrl.match(/^data:image\/(?:png|jpeg);base64,(.*)$/) ?? [];
      const data = b64 ? Buffer.from(b64, "base64") : null;
      const type = data && sniffImage(data);
      if (!data || !type || data.length > FIGMA_MAX_FRAME_BYTES) return [];
      // RenderHost names them mockup-1, mockup-2… in frame order
      const frame = Number(img.name.match(/(\d+)/)?.[1] ?? i + 1) - 1;
      const name = manifest.frames[frame]?.name ?? `Mockup ${i + 1}`;
      return [{ n: i, name, width: img.width, height: img.height, scale: img.scale ?? FIGMA_RESULT_SCALE, data, type }];
    });
    if (!items.length) return corsJson({ error: "Nothing could be made from these frames. Try Open in editor instead." }, { status: 502 });
    const results = await saveResults(id, items);
    return corsJson({ results: results.map(publicResult) });
  } catch (err) {
    return figmaErrorResponse(err, "render");
  }
}
