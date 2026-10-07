import { NextRequest } from "next/server";
import { parseRenderJob } from "@/lib/apiRender";
import { authorizeApiRequest, consumeApiQuota } from "@/lib/server/apiKeys";
import { ApiInputError, createUploadLink, renderForCaller } from "@/lib/server/apiRender";
import { API_CORS, apiJson, apiOptions } from "@/lib/server/apiResponse";
import { handleMcpMessage } from "@/lib/server/mcp";

export const runtime = "nodejs";
export const maxDuration = 120;

export const OPTIONS = apiOptions;

/**
 * POST /api/mcp — the Mockframe MCP server (Streamable HTTP, stateless).
 * Authenticate with a Pro API key: "Authorization: Bearer mf_live_…".
 * Renders count against the same daily limit as the REST API.
 */
export async function POST(req: NextRequest) {
  const auth = await authorizeApiRequest(req, { consume: false });
  if (!auth.ok) return apiJson({ jsonrpc: "2.0", id: null, error: { code: -32001, message: auth.error } }, auth.status);
  const { caller } = auth;
  const origin = req.nextUrl.origin;

  const body = await req.json().catch(() => undefined);
  if (body === undefined) return apiJson({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400);

  const deps = {
    render: async (args: unknown) => {
      const parsed = parseRenderJob(args);
      if (!parsed.ok) throw new Error(parsed.error);
      const quota = await consumeApiQuota(caller);
      if (!quota.allowed) throw new Error("You've used today's API requests. The limit resets at midnight UTC.");
      try {
        return await renderForCaller(parsed.job, caller.uid, origin);
      } catch (err) {
        if (err instanceof ApiInputError) throw err;
        console.error("[mcp] render", err);
        throw new Error("The render failed. Try again, or send fewer screenshots.");
      }
    },
    uploadLink: () => createUploadLink(caller.uid, origin),
  };

  const messages = Array.isArray(body) ? body : [body];
  // one at a time, so a batch of renders doesn't start a browser per call
  const replies = [];
  for (const m of messages) {
    const r = await handleMcpMessage(m, deps);
    if (r) replies.push(r);
  }
  // only notifications or responses: accepted, nothing to say
  if (!replies.length) return new Response(null, { status: 202, headers: API_CORS });
  return apiJson(Array.isArray(body) ? replies : replies[0]);
}

/** No server-to-client stream: every answer comes back on the POST. */
export function GET() {
  return new Response("Use POST", { status: 405, headers: { ...API_CORS, Allow: "POST, OPTIONS" } });
}

export function DELETE() {
  return new Response(null, { status: 405, headers: { ...API_CORS, Allow: "POST, OPTIONS" } });
}
