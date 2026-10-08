import { NextRequest } from "next/server";
import { sniffImage } from "@/lib/figmaImport";
import { MAX_SCREENSHOT_BYTES, saveUpload, uploadLinkOwner } from "@/lib/server/apiRender";
import { apiJson, apiOptions } from "@/lib/server/apiResponse";

export const runtime = "nodejs";

export const OPTIONS = apiOptions;

/** POST /api/v1/uploads/<link token> — an upload link from the MCP server's create_upload_link tool. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const uid = await uploadLinkOwner(token);
  if (!uid) return apiJson({ error: "This upload link has expired. Ask for a new one." }, 404);
  const data = Buffer.from(await req.arrayBuffer());
  if (!data.length) return apiJson({ error: "Send the image bytes as the request body." }, 400);
  if (data.length > MAX_SCREENSHOT_BYTES) return apiJson({ error: "Screenshots can be up to 10 MB." }, 413);
  const type = sniffImage(data);
  if (!type) return apiJson({ error: "Upload a PNG or JPEG." }, 415);
  const id = await saveUpload(uid, data, type);
  return apiJson({ id, expiresInHours: 24 });
}

export const PUT = POST;
