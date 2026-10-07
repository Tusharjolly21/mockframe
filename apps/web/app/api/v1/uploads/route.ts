import { NextRequest } from "next/server";
import { sniffImage } from "@/lib/figmaImport";
import { authorizeApiRequest } from "@/lib/server/apiKeys";
import { MAX_SCREENSHOT_BYTES, saveUpload } from "@/lib/server/apiRender";
import { apiJson, apiOptions } from "@/lib/server/apiResponse";

export const runtime = "nodejs";

export const OPTIONS = apiOptions;

/**
 * POST /api/v1/uploads — send a screenshot's bytes (PNG or JPEG body) and get
 * an id to use in "screenshots". Handy from a terminal:
 *   curl -X POST --data-binary @home.png -H "Authorization: Bearer mf_live_…" https://mockframe.app/api/v1/uploads
 */
export async function POST(req: NextRequest) {
  const auth = await authorizeApiRequest(req);
  if (!auth.ok) return apiJson({ error: auth.error }, auth.status);
  const data = Buffer.from(await req.arrayBuffer());
  if (!data.length) return apiJson({ error: "Send the image bytes as the request body." }, 400);
  if (data.length > MAX_SCREENSHOT_BYTES) return apiJson({ error: "Screenshots can be up to 10 MB." }, 413);
  const type = sniffImage(data);
  if (!type) return apiJson({ error: "Upload a PNG or JPEG." }, 415);
  try {
    const id = await saveUpload(auth.caller.uid, data, type);
    return apiJson({ id, expiresInHours: 24 });
  } catch (err) {
    console.error("[api/v1/uploads]", err);
    return apiJson({ error: "The upload failed. Try again." }, 500);
  }
}
