import { z } from "zod";
import { createPack, createPackScreen, PACK_STYLE_IDS, type PackDocument } from "../pack/schema";

/**
 * Everything the AI generation flow needs that is PURE: the plan schema Claude
 * must satisfy (enforced via structured outputs), the prompts, and the
 * plan → PackDocument builder. No SDK, no DOM, no Firebase — unit-testable.
 */

export const AI_FREE_GENERATIONS = 2;
export const AI_DAILY_LIMIT = 20;

const ARCHETYPES = ["onboarding", "home-feed", "dashboard", "list", "detail", "profile", "settings", "chat"] as const;

const HEX_COLOR = z.string().regex(/^#[0-9a-fA-F]{6}$/);

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
});

export type AiPackPlan = z.infer<typeof AiPackPlanSchema>;

export const AI_SYSTEM_PROMPT = `You are an expert App Store marketing designer for MockFrame. Given an app's name and description, design a complete App Store screenshot pack: 8-10 screens that tell a conversion story.

Narrative structure: screen 1 hooks with the core promise (onboarding or home-feed archetype), screens 2-6 show the strongest features (mix archetypes: dashboard, list, detail, chat), later screens build trust (profile/settings/stats), final screen closes with a call to action.

Caption rules: titles are benefit-led, at most 6 words, no ending period. Subtitles optional, at most 10 words, only when they add information.

Concept UI rules: content must be SPECIFIC to this app (real-sounding feature names, plausible numbers), never lorem ipsum or generic labels like "Item 1". items power lists/feeds/chat bubbles: 3-6 per screen (chat: alternating user/app messages). stats are short ("12k", "94%"). tabs: 3-5 one-word labels, consistent across screens. Emojis sparingly, only where the app's domain makes them natural.

Palette: pick ONE accent (the accent field) that fits the app's domain and use it as palette.primary on every screen. Light UI (bg near-white, card white) or dark UI (bg near-black, card #1a1a21-ish) - choose what fits the app, keep it consistent, text must contrast bg. Pick styleId to match the mood (dark-pro for dark UIs, bold-gradient/accent-split for vivid consumer apps, minimal-light for utilities).

All colors are 6-digit lowercase hex like #0ea5e9.`;

export function aiUserPrompt(appName: string, description: string, accent?: string): string {
  return `App name: ${appName}\nDescription: ${description}${accent ? `\nBrand accent color (must use): ${accent}` : ""}`;
}

/** Mirrors lib/screens encodeScreenAsset — duplicated because that module is
 *  "use client" and this file runs in a server route. Format pinned by test. */
export function encodeAiScreenAsset(doc: object): string {
  return "screen:" + encodeURIComponent(JSON.stringify(doc));
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
      en: { title: s.caption.title, ...(s.caption.subtitle ? { subtitle: s.caption.subtitle } : {}) },
    };
    return screen;
  });
  return pack;
}
