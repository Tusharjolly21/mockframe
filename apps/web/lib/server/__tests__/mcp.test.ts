import { describe, expect, it, vi } from "vitest";
import { handleMcpMessage, MCP_PROTOCOL_VERSIONS, MCP_TOOLS, type McpDeps } from "../mcp";

const PNG = "data:image/png;base64,iVBORw0KGgo=";

function deps(over: Partial<McpDeps> = {}): McpDeps {
  return {
    render: vi.fn(async () => [{ name: "mockup-1.png", width: 1200, height: 900, url: "https://files.example/1.png" }]),
    uploadLink: vi.fn(async () => "https://mockframe.app/api/v1/uploads/abc"),
    ...over,
  };
}

const call = (name: string, args: Record<string, unknown>, d = deps()) =>
  handleMcpMessage({ jsonrpc: "2.0", id: 7, method: "tools/call", params: { name, arguments: args } }, d);

describe("handleMcpMessage", () => {
  it("negotiates the protocol version", async () => {
    const r = await handleMcpMessage({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26" } }, deps());
    expect(r).toMatchObject({ id: 1, result: { protocolVersion: "2025-03-26", serverInfo: { name: "mockframe" }, capabilities: { tools: {} } } });
    const unknown = await handleMcpMessage({ jsonrpc: "2.0", id: 2, method: "initialize", params: { protocolVersion: "1999-01-01" } }, deps());
    expect(unknown).toMatchObject({ result: { protocolVersion: MCP_PROTOCOL_VERSIONS[0] } });
  });

  it("returns nothing for notifications and errors for bad requests", async () => {
    expect(await handleMcpMessage({ jsonrpc: "2.0", method: "notifications/initialized" }, deps())).toBeNull();
    expect(await handleMcpMessage({ id: 3, method: "ping" }, deps())).toMatchObject({ id: 3, error: { code: -32600 } });
    expect(await handleMcpMessage({ jsonrpc: "2.0", id: 4, method: "resources/list" }, deps())).toMatchObject({ error: { code: -32601 } });
    expect(await call("nope", {})).toMatchObject({ error: { code: -32602 } });
  });

  it("lists the tools", async () => {
    const r = await handleMcpMessage({ jsonrpc: "2.0", id: 5, method: "tools/list" }, deps());
    const names = (r as { result: { tools: { name: string }[] } }).result.tools.map((t) => t.name);
    expect(names).toEqual(MCP_TOOLS.map((t) => t.name));
    expect(names).toContain("make_store_screenshots");
  });

  it("renders mockups and store sets through the render dep", async () => {
    const d = deps();
    const r = await call("make_mockups", { screenshots: [PNG], look: "glow" }, d);
    expect(d.render).toHaveBeenCalledWith({ screenshots: [PNG], look: "glow" });
    expect(JSON.stringify(r)).toContain("https://files.example/1.png");
    await call("make_store_screenshots", { screenshots: [PNG], style: "hush" }, d);
    expect(d.render).toHaveBeenLastCalledWith({ screenshots: [PNG], style: "hush", type: "store-set" });
  });

  it("reports bad input and render failures as tool errors", async () => {
    const d = deps({ render: vi.fn(async () => { throw new Error("You've used today's 500 API requests."); }) });
    const bad = await call("make_mockups", { screenshots: [] }, d);
    expect(bad).toMatchObject({ result: { isError: true } });
    expect(d.render).not.toHaveBeenCalled();
    const failed = await call("make_mockups", { screenshots: [PNG] }, d);
    expect(failed).toMatchObject({ result: { isError: true, content: [{ text: expect.stringContaining("500 API requests") }] } });
  });

  it("hands out upload links and device ids", async () => {
    const link = await call("create_upload_link", {});
    expect(JSON.stringify(link)).toContain("curl --data-binary @path/to/screenshot.png https://mockframe.app/api/v1/uploads/abc");
    const phones = await call("list_devices", { category: "phone" });
    const text = (phones as { result: { content: { text: string }[] } }).result.content[0].text;
    expect(text).toContain("iphone-17-pro:");
    expect(text).not.toContain("(laptop)");
  });
});
