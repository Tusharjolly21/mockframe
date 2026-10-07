import { listDevices } from "@framekit/devices";
import { LOOK_NAMES, parseRenderJob, STORE_SET_STYLES, API_MAX_SCREENSHOTS } from "../apiRender";

/**
 * The Mockframe MCP server's protocol and tools (JSON-RPC over Streamable
 * HTTP, stateless, JSON responses). The route supplies the side effects, so
 * this stays testable.
 */

export const MCP_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

export interface McpDeps {
  /** render a job body (as POST /api/v1/screenshots takes it); may throw with a user-facing message */
  render: (body: unknown) => Promise<{ name: string; width: number; height: number; url: string }[]>;
  uploadLink: () => Promise<string>;
}

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

type JsonRpcResponse =
  | { jsonrpc: "2.0"; id: string | number | null; result: unknown }
  | { jsonrpc: "2.0"; id: string | number | null; error: { code: number; message: string } };

const SCREENSHOTS_SCHEMA = {
  type: "array",
  minItems: 1,
  maxItems: API_MAX_SCREENSHOTS,
  description: "Screenshots: public https image URLs, or ids from create_upload_link uploads (upload_…).",
  items: { type: "string" },
};

export const MCP_TOOLS = [
  {
    name: "make_mockups",
    title: "Make device mockups",
    description:
      "Put each screenshot in a realistic device frame (iPhone, Android, iPad, MacBook, browser…) on a designed background. Returns links to PNG images (valid 24 hours). By default each screenshot gets the device that fits its shape.",
    inputSchema: {
      type: "object",
      properties: {
        screenshots: SCREENSHOTS_SCHEMA,
        device: { type: "string", description: 'A device id from list_devices, or "auto" (default).' },
        look: { type: "string", enum: [...LOOK_NAMES, "none"], description: "A finished look built from the screenshot's colours. Default: none (the device's own background)." },
        scale: { type: "number", enum: [1, 2], description: "2 for double resolution. Default 1." },
      },
      required: ["screenshots"],
    },
  },
  {
    name: "make_store_screenshots",
    title: "Make App Store / Google Play screenshots",
    description:
      "Turn phone screenshots into a designed set of 8 store listing screenshots at App Store (1320 × 2868) or Google Play (1080 × 1920) size, with headlines. Screenshot 1 goes in the first shot's phone, and so on. Returns links to 8 PNGs (valid 24 hours).",
    inputSchema: {
      type: "object",
      properties: {
        screenshots: SCREENSHOTS_SCHEMA,
        style: { type: "string", enum: [...STORE_SET_STYLES], description: "stride: bold gradients · penny: warm and friendly · hush: calm and dark · habitat: soft pastels. Default stride." },
        platform: { type: "string", enum: ["ios", "android"], description: "Default ios." },
      },
      required: ["screenshots"],
    },
  },
  {
    name: "create_upload_link",
    title: "Get a link to upload a local screenshot",
    description:
      "Returns a URL that accepts one local image file per request for the next 30 minutes, e.g. `curl --data-binary @home.png <url>`. Each upload answers with an id (upload_…) to pass in screenshots.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_devices",
    title: "List devices",
    description: "Device ids for make_mockups, optionally for one category.",
    inputSchema: {
      type: "object",
      properties: { category: { type: "string", enum: ["phone", "tablet", "laptop", "desktop", "browser", "watch"] } },
    },
  },
];

const text = (t: string, isError = false) => ({ content: [{ type: "text", text: t }], ...(isError ? { isError: true } : {}) });

function imagesText(images: { name: string; width: number; height: number; url: string }[]) {
  return images.map((i) => `- ${i.name} (${i.width} × ${i.height}): ${i.url}`).join("\n") + "\n\nThe links work for 24 hours.";
}

async function callTool(name: string, args: Record<string, unknown>, deps: McpDeps) {
  if (name === "list_devices") {
    const cat = typeof args.category === "string" ? args.category : null;
    const rows = listDevices()
      .filter((d) => d.category !== "scene" && (!cat || d.category === cat))
      .map((d) => `${d.id}: ${d.name} (${d.category})`);
    return text(rows.join("\n") || "No devices in that category.");
  }
  if (name === "create_upload_link") {
    const url = await deps.uploadLink();
    return text(`Upload each file with:\n\ncurl --data-binary @path/to/screenshot.png ${url}\n\nEach upload returns {"id": "upload_…"}. Pass those ids in screenshots. The link works for 30 minutes.`);
  }
  if (name === "make_mockups" || name === "make_store_screenshots") {
    const body = name === "make_store_screenshots" ? { ...args, type: "store-set" } : args;
    const parsed = parseRenderJob(body);
    if (!parsed.ok) return text(parsed.error, true);
    try {
      const images = await deps.render(body);
      return text(imagesText(images));
    } catch (err) {
      return text(err instanceof Error ? err.message : "The render failed.", true);
    }
  }
  return null;
}

/** Answer one JSON-RPC message; null for notifications (no reply). */
export async function handleMcpMessage(msg: unknown, deps: McpDeps): Promise<JsonRpcResponse | null> {
  const m = msg as Partial<JsonRpcRequest>;
  if (!m || m.jsonrpc !== "2.0" || typeof m.method !== "string") {
    return { jsonrpc: "2.0", id: (m?.id as string | number | null) ?? null, error: { code: -32600, message: "Invalid request" } };
  }
  if (m.id === undefined || m.id === null) return null; // a notification
  const id = m.id;
  const ok = (result: unknown): JsonRpcResponse => ({ jsonrpc: "2.0", id, result });
  const fail = (code: number, message: string): JsonRpcResponse => ({ jsonrpc: "2.0", id, error: { code, message } });

  switch (m.method) {
    case "initialize": {
      const asked = typeof m.params?.protocolVersion === "string" ? m.params.protocolVersion : "";
      return ok({
        protocolVersion: MCP_PROTOCOL_VERSIONS.includes(asked) ? asked : MCP_PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "mockframe", title: "Mockframe", version: "1.0.0" },
        instructions:
          "Mockframe makes device mockups and App Store / Google Play screenshot sets from app screenshots. For local files, call create_upload_link and upload them with curl first.",
      });
    }
    case "ping":
      return ok({});
    case "tools/list":
      return ok({ tools: MCP_TOOLS });
    case "tools/call": {
      const name = typeof m.params?.name === "string" ? m.params.name : "";
      const args = (m.params?.arguments ?? {}) as Record<string, unknown>;
      const result = await callTool(name, args, deps);
      return result ? ok(result) : fail(-32602, `Unknown tool: ${name}`);
    }
    default:
      return fail(-32601, `Method not found: ${m.method}`);
  }
}
