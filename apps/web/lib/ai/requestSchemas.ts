import { z } from "zod/v4";
import { TONE_IDS } from "../pack/schema";

/**
 * Request-body schema for /api/ai-pack — the concept/real mode union — kept
 * in its own server-safe module (no SDK, no Firebase) so it's directly
 * unit-testable without spinning up the route.
 */

export const HEX = /^#[0-9a-fA-F]{6}$/;
// full-string match: prefix + a non-empty base64 payload (no bare-prefix / empty-payload bodies)
const IMAGE_DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const REF_ID = /^[A-Za-z0-9_-]{1,64}$/;
// ~400KB binary ≈ ~547K base64 chars + header slack
const MAX_IMAGE_CHARS = 560_000;

export const ConceptBodySchema = z.object({
  mode: z.literal("concept").optional(),
  appName: z.string().trim().min(1).max(60),
  description: z.string().trim().min(10).max(600),
  accent: z.string().regex(HEX).optional(),
  tone: z.enum(TONE_IDS).optional(),
  audience: z.string().max(60).optional(),
});

export const RealBodySchema = z.object({
  mode: z.literal("real"),
  appName: z.string().trim().min(1).max(60),
  description: z.string().trim().max(600).optional(),
  accent: z.string().regex(HEX).optional(),
  tone: z.enum(TONE_IDS).optional(),
  audience: z.string().max(60).optional(),
  screenshots: z.array(z.object({
    refId: z.string().regex(REF_ID),
    image: z.string().regex(IMAGE_DATA_URL).max(MAX_IMAGE_CHARS),
  })).min(2).max(10),
});

/** No accent/screenshots: recaption re-writes captions on an EXISTING pack
 *  (the studio sends each screen's archetype + current title), it never
 *  designs new screens — see the recaption branch in route.ts, which is
 *  gated only by the per-day quota, never the free-generation counter. */
export const RecaptionBodySchema = z.object({
  mode: z.literal("recaption"),
  appName: z.string().trim().min(1).max(60),
  description: z.string().max(600).optional(),
  tone: z.enum(TONE_IDS).optional(),
  audience: z.string().max(60).optional(),
  screens: z.array(z.object({
    archetype: z.string().max(40).optional(),
    currentTitle: z.string().max(120).optional(),
  })).min(1).max(10),
});

// recaption first so its own literal "recaption" mode never falls through to
// the concept arm (whose `mode` is optional and would otherwise swallow it).
export const AiPackBodySchema = z.union([RecaptionBodySchema, RealBodySchema, ConceptBodySchema]);
export type AiPackBody = z.infer<typeof AiPackBodySchema>;

/** Route-level guard: the schema allows duplicate refIds structurally (each
 *  entry is independently valid), so the route rejects duplicates itself. */
export function hasDuplicateRefs(screenshots: { refId: string }[]): boolean {
  const seen = new Set<string>();
  for (const s of screenshots) {
    if (seen.has(s.refId)) return true;
    seen.add(s.refId);
  }
  return false;
}
