import { z } from "zod";

/** All promo compositions render at a fixed 30 fps. */
export const PROMO_FPS = 30 as const;

export const PROMO_FORMATS = ["9:16", "1:1", "16:9"] as const;
export type PromoFormat = (typeof PROMO_FORMATS)[number];

export const FORMAT_DIMENSIONS: Record<PromoFormat, { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
  "16:9": { width: 1920, height: 1080 },
};

/** Max 30 seconds at 30 fps. */
const MAX_FRAMES = 30 * PROMO_FPS;

/** Up to 4 app screens per ad — enough to tell a story in ~10s, cheap to render. */
export const MAX_SCREENSHOTS = 4;

export const PromoProjectSchema = z.object({
  templateId: z.string().min(1),
  deviceId: z.string().min(1),
  screenshotAssetIds: z.array(z.string().min(1)).min(1).max(MAX_SCREENSHOTS),
  texts: z.array(z.string()).max(6),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  background: z.string().min(1),
  /** A decorative pattern behind the subject, or null for none. */
  pattern: z.string().nullable(),
  format: z.enum(PROMO_FORMATS),
  durationInFrames: z.number().int().positive().max(MAX_FRAMES),
  music: z.string().nullable(),
});

export type PromoProject = z.infer<typeof PromoProjectSchema>;
