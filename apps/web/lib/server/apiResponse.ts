import { NextResponse } from "next/server";

/** The API is called from scripts, CI and other sites, so it answers any origin. */
export const API_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, Mcp-Session-Id, Mcp-Protocol-Version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export const apiJson = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  NextResponse.json(body, { status, headers: { ...API_CORS, ...headers } });

export const apiOptions = () => new NextResponse(null, { status: 204, headers: API_CORS });
