import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { FirebaseConfigError } from "@/lib/server/firebaseAdmin";
import { attachOwnerCookie, getRequestOwner } from "@/lib/server/requestOwner";
import { isBillingActive, readBilling } from "@/lib/server/billing";
import { consumeDailyQuota, quotaSubject } from "@/lib/server/quota";
import {
  TRANSLATE_DAILY_LIMIT,
  TRANSLATE_SYSTEM_PROMPT,
  TranslateBodySchema,
  TranslationPlanSchema,
  repairTranslations,
  translateUserPrompt,
} from "@/lib/ai/translate";

export const runtime = "nodejs";
export const maxDuration = 120;

const DEFAULT_MODEL = "claude-opus-5-5";
// a policy decline on the default model re-runs the same request here, in the same call
const FALLBACK_MODEL = "claude-opus-4-8";

/**
 * Translate a pack's screenshot captions into up to TRANSLATE_LOCALES_PER_REQUEST
 * store languages. Pro only (signed in + active billing), with a daily request
 * quota as the abuse guard. The studio splits bigger language lists into
 * several requests.
 */
export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI translation is not configured" }, { status: 501 });
  }
  const parsed = TranslateBodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const body = parsed.data;
  if (!body.captions.some((c) => c.title.trim())) {
    return NextResponse.json({ error: "Write at least one caption first" }, { status: 400 });
  }

  try {
    const owner = await getRequestOwner(req);
    const signedIn = !!owner.uid && owner.signInProvider !== "anonymous";
    if (!signedIn) return NextResponse.json({ allowed: false, reason: "signin" }, { status: 401 });
    if (!isBillingActive(await readBilling(owner.uid!))) {
      return NextResponse.json({ allowed: false, reason: "pro" }, { status: 402 });
    }
    const quota = await consumeDailyQuota(quotaSubject(req, owner), "ai-translate", TRANSLATE_DAILY_LIMIT);
    if (!quota.allowed) return NextResponse.json({ error: "Daily translation limit reached — try again tomorrow" }, { status: 429 });

    const model = process.env.MOCKFRAME_AI_MODEL ?? DEFAULT_MODEL;
    const client = new Anthropic();
    const response = await client.beta.messages.parse({
      model,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      // short, well-specified copy work: medium keeps it quick without hurting quality
      output_config: { effort: "medium", format: betaZodOutputFormat(TranslationPlanSchema) },
      ...(model === FALLBACK_MODEL
        ? {}
        : { betas: ["server-side-fallback-2026-06-01"], fallbacks: [{ model: FALLBACK_MODEL }] }),
      system: TRANSLATE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: translateUserPrompt(body) }],
    });
    const plan = response.stop_reason === "refusal" ? null : response.parsed_output;
    if (!plan) return NextResponse.json({ error: "Translation failed — please retry" }, { status: 502 });

    return attachOwnerCookie(NextResponse.json({ translations: repairTranslations(plan, body) }), owner);
  } catch (err) {
    if (err instanceof FirebaseConfigError) {
      return NextResponse.json({ error: "AI translation requires an account backend" }, { status: 501 });
    }
    if (err instanceof Anthropic.RateLimitError || (err instanceof Anthropic.APIError && err.status === 529)) {
      return NextResponse.json({ error: "AI is busy — retry in a minute" }, { status: 429 });
    }
    // APIError, and the plain AnthropicError parse() throws when output fails the schema
    if (err instanceof Anthropic.AnthropicError) {
      return NextResponse.json({ error: "Translation failed — please retry" }, { status: 502 });
    }
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}
