import { NextRequest } from "next/server";
import { tempRead } from "@/lib/server/tempStore";
import { apiJson } from "@/lib/server/apiResponse";

export const runtime = "nodejs";

/** GET /api/v1/files/api-renders/… — rendered images, when storage has no signed links (local development). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const joined = path.join("/");
  if (path[0] !== "api-renders" || path.some((p) => p === ".." || p === "")) return apiJson({ error: "Not found" }, 404);
  const hit = await tempRead(joined).catch(() => null);
  if (!hit) return apiJson({ error: "This image has expired." }, 404);
  return new Response(new Uint8Array(hit.data), { headers: { "Content-Type": hit.contentType, "Access-Control-Allow-Origin": "*", "Cache-Control": "private, max-age=86400" } });
}
