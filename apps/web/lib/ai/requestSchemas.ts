import { z } from "zod/v4";

/**
 * Request-body schema for /api/ai-pack — the concept/real mode union — kept
 * in its own server-safe module (no SDK, no Firebase) so it's directly
 * unit-testable without spinning up the route.
 */

export const HEX = /^#[0-9a-fA-F]{6}$/;
const IMAGE_DATA_URL = /^data:image\/(png|jpeg|webp);base64,/;
const REF_ID = /^[A-Za-z0-9_-]{1,64}$/;
// ~400KB binary ≈ ~547K base64 chars + header slack
const MAX_IMAGE_CHARS = 560_000;

export const ConceptBodySchema = z.object({
  mode: z.literal("concept").optional(),
  appName: z.string().trim().min(1).max(60),
  description: z.string().trim().min(10).max(600),
  accent: z.string().regex(HEX).optional(),
});

export const RealBodySchema = z.object({
  mode: z.literal("real"),
  appName: z.string().trim().min(1).max(60),
  description: z.string().trim().max(600).optional(),
  accent: z.string().regex(HEX).optional(),
  screenshots: z.array(z.object({
    refId: z.string().regex(REF_ID),
    image: z.string().regex(IMAGE_DATA_URL).max(MAX_IMAGE_CHARS),
  })).min(2).max(10),
});

export const AiPackBodySchema = z.union([RealBodySchema, ConceptBodySchema]);
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
