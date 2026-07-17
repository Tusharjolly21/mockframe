import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { FirebaseConfigError, firestoreDb } from "@/lib/server/firebaseAdmin";
import { attachOwnerCookie, getRequestOwner } from "@/lib/server/requestOwner";
import { isBillingActive, readBilling } from "@/lib/server/razorpay";
import { consumeDailyQuota, quotaSubject } from "@/lib/server/quota";
import { aiGenerationDecision } from "@/lib/ai/gate";
import { AI_DAILY_LIMIT, AI_FREE_GENERATIONS, AI_SYSTEM_PROMPT, AiPackPlanSchema, aiUserPrompt, buildPackFromPlan } from "@/lib/ai/plan";

export const runtime = "nodejs";
export const maxDuration = 120; // adaptive thinking can take a while

const BodySchema = z.object({
  appName: z.string().trim().min(1).max(60),
  description: z.string().trim().min(10).max(600),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

/**
 * Generate an AI Pack: gate on sign-in + free-generation count, enforce a
 * per-day quota for Pro (abuse guard — free users are already capped by the
 * gate), then call Claude for a structured plan and build a PackDocument
 * from it. The free-generation counter is only incremented on SUCCESS, in a
 * transaction, so a failed generation never costs the user a free slot and
 * parallel requests can't double-spend the last one.
 */
export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI generation is not configured" }, { status: 501 });
  }
  const parsedBody = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsedBody.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { appName, description, accent } = parsedBody.data;

  try {
    const owner = await getRequestOwner(req);
    // anonymous Firebase sessions are guests, not sign-ins (billing-route pattern)
    const signedIn = !!owner.uid && owner.signInProvider !== "anonymous";
    if (!signedIn) return NextResponse.json({ allowed: false, reason: "signin" }, { status: 401 });
    const isPro = isBillingActive(await readBilling(owner.uid!));

    const db = firestoreDb();
    const counterRef = db.doc(`mockframeOwners/${owner.ownerId}/private/ai-generations`);
    const prior = Number(((await counterRef.get()).data()?.value as { count?: number } | undefined)?.count) || 0;
    const verdict = aiGenerationDecision({ signedIn, isPro, priorGenerations: prior });
    if (!verdict.allowed) return NextResponse.json(verdict, { status: 402 });

    if (isPro) {
      // day-quota abuse guard — free users are already capped by the gate above
      const quota = await consumeDailyQuota(quotaSubject(req, owner), "ai-pack", AI_DAILY_LIMIT);
      if (!quota.allowed) return NextResponse.json({ error: "Daily AI limit reached — try again tomorrow" }, { status: 429 });
    }

    const client = new Anthropic();
    const response = await client.messages.parse({
      model: process.env.MOCKFRAME_AI_MODEL ?? "claude-opus-4-8",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system: AI_SYSTEM_PROMPT,
      output_config: { format: zodOutputFormat(AiPackPlanSchema) },
      messages: [{ role: "user", content: aiUserPrompt(appName, description, accent) }],
    });
    const plan = response.parsed_output;
    if (!plan) return NextResponse.json({ error: "Generation failed — please retry" }, { status: 502 });

    const pack = buildPackFromPlan(AiPackPlanSchema.parse(plan), appName);

    // success only: consume a free slot (transactional so parallel requests can't double-spend)
    if (!isPro) {
      const ok = await db.runTransaction(async (txn) => {
        const now = Number(((await txn.get(counterRef)).data()?.value as { count?: number } | undefined)?.count) || 0;
        if (!aiGenerationDecision({ signedIn, isPro, priorGenerations: now }).allowed) return false;
        txn.set(counterRef, { value: { count: now + 1 }, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        return true;
      });
      if (!ok) return NextResponse.json({ allowed: false, reason: "pro" }, { status: 402 });
    }

    return attachOwnerCookie(
      NextResponse.json({ pack, remaining: isPro ? null : Math.max(0, AI_FREE_GENERATIONS - prior - 1) }),
      owner
    );
  } catch (err) {
    if (err instanceof FirebaseConfigError) {
      return NextResponse.json({ error: "AI generation requires an account backend" }, { status: 501 });
    }
    if (err instanceof Anthropic.RateLimitError || (err instanceof Anthropic.APIError && err.status === 529)) {
      return NextResponse.json({ error: "AI is busy — retry in a minute" }, { status: 429 });
    }
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json({ error: "Generation failed — please retry" }, { status: 502 });
    }
    // client.messages.parse() throws a plain AnthropicError (not an APIError)
    // when the model's output fails zodOutputFormat's embedded schema
    // validation — that's a generation-quality failure, not a 5xx.
    if (err instanceof Anthropic.AnthropicError) {
      return NextResponse.json({ error: "Generation failed — please retry" }, { status: 502 });
    }
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
