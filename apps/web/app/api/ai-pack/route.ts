import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { ImageBlockParam, MessageCreateParamsNonStreaming, TextBlockParam } from "@anthropic-ai/sdk/resources/messages";
import { FieldValue } from "firebase-admin/firestore";
import type { Firestore } from "firebase-admin/firestore";
import { FirebaseConfigError, firestoreDb } from "@/lib/server/firebaseAdmin";
import { attachOwnerCookie, getRequestOwner } from "@/lib/server/requestOwner";
import { isBillingActive, readBilling } from "@/lib/server/razorpay";
import { consumeDailyQuota, quotaSubject } from "@/lib/server/quota";
import { aiGenerationDecision } from "@/lib/ai/gate";
import {
  AI_DAILY_LIMIT,
  AI_FREE_GENERATIONS,
  AI_REAL_SYSTEM_PROMPT,
  AI_SYSTEM_PROMPT,
  AiPackPlanSchema,
  RealPackPlanSchema,
  aiRealUserPrompt,
  aiUserPrompt,
  buildPackFromPlan,
  buildRealPackFromPlan,
} from "@/lib/ai/plan";
import { AiPackBodySchema, hasDuplicateRefs } from "@/lib/ai/requestSchemas";
import type { PackDocument } from "@/lib/pack/schema";
import type { RequestOwner } from "@/lib/server/requestOwner";

export const runtime = "nodejs";
export const maxDuration = 120; // adaptive thinking can take a while

type ClaudeCallSpec = {
  system: string;
  content: string | Array<TextBlockParam | ImageBlockParam>;
  format: NonNullable<MessageCreateParamsNonStreaming["output_config"]>["format"];
  build: (plan: unknown) => PackDocument;
};

/**
 * Shared tail of both generation modes: call Claude for a structured plan,
 * build the PackDocument, then — on success only — consume a free slot in a
 * transaction (so a failed generation never costs the user a free slot and
 * parallel requests can't double-spend the last one) and return the response.
 */
async function generateAndAccount(
  client: Anthropic,
  db: Firestore,
  counterRef: FirebaseFirestore.DocumentReference,
  signedIn: boolean,
  isPro: boolean,
  prior: number,
  owner: RequestOwner,
  spec: ClaudeCallSpec
): Promise<NextResponse> {
  const response = await client.messages.parse({
    model: process.env.MOCKFRAME_AI_MODEL ?? "claude-opus-4-8",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system: spec.system,
    output_config: { format: spec.format },
    messages: [{ role: "user", content: spec.content }],
  });
  const plan = response.parsed_output;
  if (!plan) return NextResponse.json({ error: "Generation failed — please retry" }, { status: 502 });

  const pack = spec.build(plan);

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
}

/**
 * Generate an AI Pack: gate on sign-in + free-generation count, enforce a
 * per-day quota for Pro (abuse guard — free users are already capped by the
 * gate), then call Claude for a structured plan and build a PackDocument
 * from it. Two modes share every gate/quota/error path: "concept" (text-only
 * brief) and "real" (caption real uploaded screenshots via vision).
 */
export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI generation is not configured" }, { status: 501 });
  }
  const parsedBody = AiPackBodySchema.safeParse(await req.json().catch(() => null));
  if (!parsedBody.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const body = parsedBody.data;

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

    if (body.mode === "real") {
      if (hasDuplicateRefs(body.screenshots)) {
        return NextResponse.json({ error: "Duplicate screenshot refs" }, { status: 400 });
      }
      const refIds = body.screenshots.map((s) => s.refId);
      const content: Array<TextBlockParam | ImageBlockParam> = [];
      for (let i = 0; i < body.screenshots.length; i++) {
        const shot = body.screenshots[i];
        // defense-in-depth: schema's IMAGE_DATA_URL regex should already guarantee
        // this matches, but never trust a destructure of a possibly-null match.
        const m = shot.image.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
        if (!m) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        const [, subtype, data] = m;
        content.push({
          type: "image",
          source: { type: "base64", media_type: `image/${subtype}` as "image/png" | "image/jpeg" | "image/webp", data },
        });
        content.push({ type: "text", text: `Screenshot ${i + 1} (ref: ${shot.refId})` });
      }
      content.push({ type: "text", text: aiRealUserPrompt(body.appName, body.description, body.accent, refIds) });

      return await generateAndAccount(client, db, counterRef, signedIn, isPro, prior, owner, {
        system: AI_REAL_SYSTEM_PROMPT,
        content,
        format: zodOutputFormat(RealPackPlanSchema),
        build: (plan) => buildRealPackFromPlan(RealPackPlanSchema.parse(plan), body.appName, refIds),
      });
    }

    return await generateAndAccount(client, db, counterRef, signedIn, isPro, prior, owner, {
      system: AI_SYSTEM_PROMPT,
      content: aiUserPrompt(body.appName, body.description, body.accent),
      format: zodOutputFormat(AiPackPlanSchema),
      build: (plan) => buildPackFromPlan(AiPackPlanSchema.parse(plan), body.appName),
    });
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
