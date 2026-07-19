// NOTE: imports the "zod/v4" classic API, not the top-level "zod" package
// (which resolves to zod's v3 classic API here). @anthropic-ai/sdk's
// zodOutputFormat() calls zod-v4-only internals (z.toJSONSchema) and throws
// at runtime on a schema built from the v3 API — see apps/web/app/api/ai-pack
// /route.ts, which is the (only) consumer that needs wire-schema derivation.
// zod/v4's classic API is call-compatible with v3 for everything used below
// (z.object/z.string/z.enum/z.array/.optional/.regex/.min/.max), so this is a
// drop-in for every other consumer (buildPackFromPlan, plan.test.ts, etc).
import { z } from "zod/v4";
import { createPack, createPackScreen, PACK_STYLE_IDS, type PackDocument, type PackMarketing } from "../pack/schema";

/**
 * Everything the AI generation flow needs that is PURE: the plan schema Claude
 * must satisfy (enforced via structured outputs), the prompts, and the
 * plan → PackDocument builder. No SDK, no DOM, no Firebase — unit-testable.
 */

export const AI_FREE_GENERATIONS = 2;
export const AI_DAILY_LIMIT = 20;

const ARCHETYPES = ["onboarding", "home-feed", "dashboard", "list", "detail", "profile", "settings", "chat"] as const;

const HEX_COLOR = z.string().regex(/^#[0-9a-fA-F]{6}$/);

/* Structured-outputs caveat (same as AiScreenDocSchema below): plain strings,
   no .max()/.regex() — the SDK strips those keywords from the wire schema.
   buildPackFromPlan/buildRealPackFromPlan clamp with .slice() at the boundary. */
const MarketingPlanSchema = z.object({
  appStoreSubtitle: z.string(),
  appStoreDescription: z.string(),
  keywords: z.array(z.string()),
  productHuntTagline: z.string(),
  launchTweet: z.string(),
});

/* Structured-outputs caveat: no regex/min/max string constraints in the wire
   schema (the SDK strips unsupported keywords and validates client-side —
   which is exactly what parse() gives us). Enums are supported and load-bearing. */
const AiScreenDocSchema = z.object({
  dark: z.boolean(),
  palette: z.object({
    primary: HEX_COLOR,
    bg: HEX_COLOR,
    card: HEX_COLOR,
    text: HEX_COLOR,
    muted: HEX_COLOR,
  }),
  header: z.object({ title: z.string(), subtitle: z.string().optional() }),
  items: z.array(z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    value: z.string().optional(),
    emoji: z.string().optional(),
  })).max(8),
  stats: z.array(z.object({ label: z.string(), value: z.string() })).max(4).optional(),
  cta: z.string().optional(),
  tabs: z.array(z.string()).max(5).optional(),
});

export const AiPackPlanSchema = z.object({
  styleId: z.enum(PACK_STYLE_IDS),
  accent: HEX_COLOR,
  captionPosition: z.enum(["top", "bottom"]),
  screens: z.array(z.object({
    archetype: z.enum(ARCHETYPES),
    caption: z.object({ title: z.string(), subtitle: z.string().optional() }),
    doc: AiScreenDocSchema,
  })).min(8).max(10),
  marketing: MarketingPlanSchema,
});

export type AiPackPlan = z.infer<typeof AiPackPlanSchema>;

export const RealPackPlanSchema = z.object({
  styleId: z.enum(PACK_STYLE_IDS),
  accent: HEX_COLOR,
  captionPosition: z.enum(["top", "bottom"]),
  screens: z.array(z.object({
    ref: z.string(),
    caption: z.object({ title: z.string(), subtitle: z.string().optional() }),
  })).min(2).max(10),
  marketing: MarketingPlanSchema,
});

export type RealPackPlan = z.infer<typeof RealPackPlanSchema>;

export const AI_SYSTEM_PROMPT = `You are an expert App Store marketing designer for MockFrame. Given an app's name and description, design a complete App Store screenshot pack: 8-10 screens that tell a conversion story.

Narrative structure: screen 1 hooks with the core promise (onboarding or home-feed archetype), screens 2-6 show the strongest features (mix archetypes: dashboard, list, detail, chat), later screens build trust (profile/settings/stats), final screen closes with a call to action.

Caption rules: titles are benefit-led, at most 6 words, no ending period. Subtitles optional, at most 10 words, only when they add information.

Concept UI rules: content must be SPECIFIC to this app (real-sounding feature names, plausible numbers), never lorem ipsum or generic labels like "Item 1". items power lists/feeds/chat bubbles: 3-6 per screen (chat: alternating user/app messages). stats are short ("12k", "94%"). tabs: 3-5 one-word labels, consistent across screens. Emojis sparingly, only where the app's domain makes them natural.

Palette: pick ONE accent (the accent field) that fits the app's domain and use it as palette.primary on every screen. Light UI (bg near-white, card white) or dark UI (bg near-black, card #1a1a21-ish) - choose what fits the app, keep it consistent, text must contrast bg. Pick styleId to match the mood (dark-pro for dark UIs, bold-gradient/accent-split for vivid consumer apps, minimal-light for utilities).

All colors are 6-digit lowercase hex like #0ea5e9.

Marketing copy: also write the launch copy for this app in the marketing field. appStoreSubtitle: at most 30 characters, benefit-led, complements the app name (App Store shows it right under the name). appStoreDescription: 2-4 short paragraphs, first line is the hook. keywords: 6-12 single words or short phrases, no duplicates of the app name. productHuntTagline: at most 60 characters, punchy, "what it does in one line". launchTweet: at most 280 characters, first-person founder voice, at most 1 emoji, no hashtag spam.`;

export const AI_REAL_SYSTEM_PROMPT = `You are an expert App Store marketing designer for MockFrame. Given an app's name, description, and real screenshots, curate and caption a screenshot pack that tells a conversion story.

Narrative structure: screen 1 hooks with the core promise, screens 2-6 show the strongest features, later screens build trust, final screen closes with a call to action. Order screens to guide the user through a natural conversion journey.

Caption rules: titles are benefit-led, at most 6 words, no ending period, must describe what each screenshot actually shows (reference it by its ref ID). Subtitles optional, at most 10 words, only when they add information.

Palette: pick ONE accent (the accent field) from the app's visible brand colors and use it on every screen. Light UI (bg near-white, card white) or dark UI (bg near-black, card #1a1a21-ish) - choose what fits the app, keep it consistent, text must contrast bg. Pick styleId to match the mood (dark-pro for dark UIs, bold-gradient/accent-split for vivid consumer apps, minimal-light for utilities).

All colors are 6-digit lowercase hex like #0ea5e9.

Marketing copy: also write the launch copy for this app in the marketing field. appStoreSubtitle: at most 30 characters, benefit-led, complements the app name (App Store shows it right under the name). appStoreDescription: 2-4 short paragraphs, first line is the hook. keywords: 6-12 single words or short phrases, no duplicates of the app name. productHuntTagline: at most 60 characters, punchy, "what it does in one line". launchTweet: at most 280 characters, first-person founder voice, at most 1 emoji, no hashtag spam.`;

export function aiUserPrompt(
  appName: string,
  description: string,
  accent?: string,
  tone?: string,
  audience?: string
): string {
  let prompt = `App name: ${appName}\nDescription: ${description}`;
  if (accent) prompt += `\nBrand accent color (must use): ${accent}`;
  if (tone) prompt += `\nTone: ${tone}`;
  if (audience) prompt += `\nAudience: ${audience}`;
  return prompt;
}

export function aiRealUserPrompt(
  appName: string,
  description: string | undefined,
  accent: string | undefined,
  refIds: string[],
  tone?: string,
  audience?: string
): string {
  let prompt = `App name: ${appName}`;
  if (description) prompt += `\nDescription: ${description}`;
  if (accent) prompt += `\nBrand accent color (must use): ${accent}`;
  if (tone) prompt += `\nTone: ${tone}`;
  if (audience) prompt += `\nAudience: ${audience}`;
  prompt += `\n\nAvailable screenshots:`;
  refIds.forEach((ref, i) => {
    prompt += `\nScreenshot ${i + 1} (ref: ${ref})`;
  });
  prompt += `\n\nSelect and caption 2-10 of these screenshots in conversion-story order. Reference each by its ref ID.`;
  return prompt;
}

/** Mirrors lib/screens encodeScreenAsset — duplicated because that module is
 *  "use client" and this file runs in a server route. Format pinned by test. */
export function encodeAiScreenAsset(doc: object): string {
  return "screen:" + encodeURIComponent(JSON.stringify(doc));
}

/** Structured-outputs strips length constraints from the wire schema (see
 *  MarketingPlanSchema above), so AI-returned marketing copy is clamped here
 *  at the plan → PackDocument boundary, same pattern as caption clamping. */
function clampMarketing(m: AiPackPlan["marketing"]): PackMarketing {
  return {
    appStoreSubtitle: m.appStoreSubtitle.slice(0, 30),
    appStoreDescription: m.appStoreDescription.slice(0, 600),
    keywords: m.keywords.slice(0, 12).map((k) => k.slice(0, 25)),
    productHuntTagline: m.productHuntTagline.slice(0, 60),
    launchTweet: m.launchTweet.slice(0, 280),
  };
}

export function buildPackFromPlan(plan: AiPackPlan, appName: string): PackDocument {
  const pack = createPack();
  pack.appName = appName.slice(0, 60);
  pack.styleId = plan.styleId;
  pack.style = { ...pack.style, accent: plan.accent, captionPosition: plan.captionPosition };
  pack.screens = plan.screens.map((s) => {
    const screen = createPackScreen(
      encodeAiScreenAsset({
        app: "aiapp",
        chrome: { time: "9:41", battery: 100 },
        archetype: s.archetype,
        appName: pack.appName,
        ...s.doc,
      })
    );
    screen.captions = {
      en: {
        title: s.caption.title.slice(0, 120),
        ...(s.caption.subtitle ? { subtitle: s.caption.subtitle.slice(0, 160) } : {}),
      },
    };
    return screen;
  });
  const marketing = clampMarketing(plan.marketing);
  pack.marketing = marketing;
  if (pack.launch) pack.launch.tagline = marketing.productHuntTagline.slice(0, 120);
  return pack;
}

/* Structured-outputs caveat (same as AiScreenDocSchema above): no .min()/.max()
   on the title/subtitle strings themselves — only the array length is
   constrained (both supported by the SDK's structured-outputs subset).
   applyCaptions (pack/ops.ts) clamps title/subtitle at the plan → pack
   boundary, same pattern as buildPackFromPlan. */
export const RecaptionPlanSchema = z.object({
  captions: z
    .array(z.object({ title: z.string(), subtitle: z.string().optional() }))
    .min(1)
    .max(10),
});

export type RecaptionPlan = z.infer<typeof RecaptionPlanSchema>;

export const AI_RECAPTION_SYSTEM_PROMPT = `You are an expert App Store marketing copywriter for MockFrame. Given an app's name and existing screenshot pack, rewrite the caption for every screen.

Caption rules: titles are benefit-led, at most 6 words, no ending period. Subtitles optional, at most 10 words, only when they add information beyond the title.

Adapt the copy to the app (its name and description), the requested tone (if given), and the target audience (if given) — the same feature should read differently for a "playful" tone aimed at "students" than a "professional" tone aimed at "enterprise teams". Keep captions specific to what each screen actually shows; never generic filler like "Great features" or "Amazing app".

Return exactly one caption per screen, in the same order the screens were given.`;

export function aiRecaptionUserPrompt(
  appName: string,
  description: string | undefined,
  tone: string | undefined,
  audience: string | undefined,
  screens: { archetype?: string; currentTitle?: string }[]
): string {
  let prompt = `App name: ${appName}`;
  if (description) prompt += `\nDescription: ${description}`;
  if (tone) prompt += `\nTone: ${tone}`;
  if (audience) prompt += `\nAudience: ${audience}`;
  prompt += `\n\nScreens (rewrite one caption per screen, in order):`;
  screens.forEach((s, i) => {
    const parts: string[] = [];
    if (s.archetype) parts.push(`archetype: ${s.archetype}`);
    if (s.currentTitle) parts.push(`current title: "${s.currentTitle}"`);
    prompt += `\nScreen ${i + 1}${parts.length ? ` (${parts.join(", ")})` : ""}`;
  });
  return prompt;
}

/** Structured-outputs returns however many captions the model produced, which
 *  is not guaranteed to match the pack's screen count — clamp deterministically
 *  at the plan → applyCaptions boundary, mirroring repairRealPlanScreens. Never
 *  throws: truncates when too many, pads blank titles when too few. */
export function repairRecaption(
  captions: RecaptionPlan["captions"],
  n: number
): { title: string; subtitle?: string }[] {
  const repaired = captions.slice(0, n).map((c) => ({ ...c }));
  while (repaired.length < n) repaired.push({ title: "" });
  return repaired;
}

export function repairRealPlanScreens(screens: RealPackPlan["screens"], refIds: string[]): RealPackPlan["screens"] {
  const refSet = new Set(refIds);
  const seenRefs = new Set<string>();
  const validScreens: RealPackPlan["screens"] = [];

  // First pass: keep valid refs, drop unknown/dupes
  for (const screen of screens) {
    if (refSet.has(screen.ref) && !seenRefs.has(screen.ref)) {
      seenRefs.add(screen.ref);
      validScreens.push(screen);
    }
  }

  // Second pass: append missing refs in original order
  for (const ref of refIds) {
    if (!seenRefs.has(ref)) {
      seenRefs.add(ref);
      validScreens.push({ ref, caption: { title: "" } });
    }
  }

  return validScreens;
}

export function buildRealPackFromPlan(plan: RealPackPlan, appName: string, refIds: string[]): PackDocument {
  const pack = createPack();
  pack.appName = appName.slice(0, 60);
  pack.styleId = plan.styleId;
  pack.style = { ...pack.style, accent: plan.accent, captionPosition: plan.captionPosition };

  const repairedScreens = repairRealPlanScreens(plan.screens, refIds);
  pack.screens = repairedScreens.map((s) => {
    const screen = createPackScreen(s.ref);
    screen.captions = {
      en: {
        title: s.caption.title.slice(0, 120),
        ...(s.caption.subtitle ? { subtitle: s.caption.subtitle.slice(0, 160) } : {}),
      },
    };
    return screen;
  });
  const marketing = clampMarketing(plan.marketing);
  pack.marketing = marketing;
  if (pack.launch) pack.launch.tagline = marketing.productHuntTagline.slice(0, 120);
  return pack;
}
