import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { LaunchCopySchema } from "@/lib/launchkit/types";
import { consumeDailyQuota, quotaSubject } from "@/lib/server/quota";
import { attachOwnerCookie, getRequestOwner } from "@/lib/server/requestOwner";

export const runtime = "nodejs";
export const maxDuration = 60;

const COPY_PER_DAY = 10;

/**
 * POST /api/launch-kit/copy { appName, category, description } → LaunchCopy
 * Small, fast copy generation for the Launch Kit wizard. Free (daily-quota'd);
 * the kit's paid gate sits on export/publish, not on writing copy.
 */
export async function POST(req: NextRequest) {
  let body: { appName?: unknown; category?: unknown; description?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const appName = typeof body.appName === "string" ? body.appName.trim().slice(0, 60) : "";
  const category = typeof body.category === "string" ? body.category.trim().slice(0, 40) : "";
  const description = typeof body.description === "string" ? body.description.trim().slice(0, 1200) : "";
  if (appName.length < 2 || description.length < 10) {
    return NextResponse.json({ error: "App name and a short description are required" }, { status: 400 });
  }

  const owner = await getRequestOwner(req);
  const quota = await consumeDailyQuota(quotaSubject(req, owner), "launch-copy", COPY_PER_DAY);
  if (!quota.allowed) {
    return NextResponse.json({ error: `Daily limit reached (${quota.limit}) — try again tomorrow` }, { status: 429 });
  }

  try {
    const client = new Anthropic();
    const response = await client.messages.parse({
      model: process.env.MOCKFRAME_AI_MODEL ?? "claude-opus-4-8",
      max_tokens: 2000,
      system:
        "You write launch copy for indie app founders. Voice: confident, concrete, zero buzzwords ('revolutionize', 'seamless', 'unleash' are banned). Every line should sound like a sharp founder wrote it, not a marketer. Match the app's actual substance — never invent features not implied by the description.",
      output_config: { format: zodOutputFormat(LaunchCopySchema) },
      messages: [
        {
          role: "user",
          content: `App name: ${appName}\nCategory: ${category || "software"}\nDescription: ${description}\n\nWrite the launch copy set.`,
        },
      ],
    });
    const copy = response.parsed_output;
    if (!copy) return NextResponse.json({ error: "Copy generation failed — please retry" }, { status: 502 });
    return attachOwnerCookie(NextResponse.json({ copy }), owner);
  } catch (err) {
    console.error("[launch-kit/copy]", err);
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "The writer is busy — try again in a minute" }, { status: 503 });
    }
    return NextResponse.json({ error: "Copy generation failed" }, { status: 500 });
  }
}
