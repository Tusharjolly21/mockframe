import { z } from "zod/v4";
import { isStoreLocale, storeLocale } from "../pack/locales";
import { TONE_IDS } from "../pack/schema";

/**
 * Store screenshot caption translation: request/response schemas, prompts and
 * the repair step for /api/ai-translate. Server-safe (no SDK, no Firebase) so
 * it's unit-testable without the route.
 */

/** Languages per request: keeps each response well inside one call's output budget. */
export const TRANSLATE_LOCALES_PER_REQUEST = 6;
export const TRANSLATE_DAILY_LIMIT = 80;

const CaptionIn = z.object({
  title: z.string().max(120),
  subtitle: z.string().max(160).optional(),
});

export const TranslateBodySchema = z.object({
  appName: z.string().trim().max(60).optional(),
  description: z.string().trim().max(600).optional(),
  tone: z.enum(TONE_IDS).optional(),
  captions: z.array(CaptionIn).min(1).max(10),
  locales: z
    .array(z.string().refine(isStoreLocale, "unknown locale"))
    .min(1)
    .max(TRANSLATE_LOCALES_PER_REQUEST),
});
export type TranslateBody = z.infer<typeof TranslateBodySchema>;

export const TranslationPlanSchema = z.object({
  translations: z.array(
    z.object({
      locale: z.string(),
      captions: z.array(z.object({ title: z.string(), subtitle: z.string().optional() })),
    })
  ),
});
export type TranslationPlan = z.infer<typeof TranslationPlanSchema>;

export const TRANSLATE_SYSTEM_PROMPT = `You localize App Store and Google Play screenshot captions.

Each caption is a short marketing headline (and sometimes a subtitle) printed above a phone screenshot. Write each one the way a native copywriter in that market would: natural, benefit-led and punchy, not a word-for-word translation. Keep the meaning and the claim of the original; never add features or promises it doesn't make.

Length matters because the text sits in a narrow band on the image. Aim for roughly the source length and never more than about 40% longer; prefer the shorter natural phrasing. Keep the app name, brand names and product terms exactly as written. Match the formality customary for app marketing in that language (for example informal "du" in German, "tu" in French). Use the target script only, with correct punctuation for that language.

Return one entry per requested locale, with exactly one caption per source caption, in the same order. If a source caption has no subtitle, leave the subtitle out.`;

export function translateUserPrompt(body: TranslateBody): string {
  const lines: string[] = [];
  if (body.appName) lines.push(`App name: ${body.appName}`);
  if (body.description) lines.push(`What the app does: ${body.description}`);
  if (body.tone) lines.push(`Tone: ${body.tone}`);
  lines.push("", "Source captions:");
  body.captions.forEach((c, i) => {
    lines.push(`${i + 1}. title: ${JSON.stringify(c.title)}${c.subtitle ? ` | subtitle: ${JSON.stringify(c.subtitle)}` : ""}`);
  });
  lines.push("", "Translate into these locales (use these exact ids in your answer):");
  for (const id of body.locales) {
    const l = storeLocale(id);
    lines.push(`- ${id}: ${l?.label ?? id}${l?.rtl ? " (right-to-left script)" : ""}`);
  }
  return lines.join("\n");
}

/**
 * Keep only the requested locales, one caption per source caption, clamped to
 * the pack's length limits. A missing or blank translation falls back to the
 * source caption, so the client never receives a hole.
 */
export function repairTranslations(plan: TranslationPlan, body: TranslateBody): Record<string, { title: string; subtitle?: string }[]> {
  const out: Record<string, { title: string; subtitle?: string }[]> = {};
  for (const locale of body.locales) {
    const entry = plan.translations.find((t) => t.locale === locale);
    out[locale] = body.captions.map((source, i) => {
      const t = entry?.captions[i];
      const title = t?.title?.trim() ? t.title.trim().slice(0, 120) : source.title;
      const subtitle = source.subtitle?.trim() ? (t?.subtitle?.trim() || source.subtitle).slice(0, 160) : undefined;
      return subtitle ? { title, subtitle } : { title };
    });
  }
  return out;
}
