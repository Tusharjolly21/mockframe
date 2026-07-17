import { z } from "zod";
import { MAX_SCREENSHOTS, PROMO_FORMATS } from "./types";

/** One app screen in a render request: a data URI + its pixel size. */
export const PromoRenderScreenshotSchema = z.object({
  dataUrl: z
    .string()
    .startsWith("data:image/")
    .max(16 * 1024 * 1024), // ~16MB ceiling per screen
  width: z.number().int().positive().max(20000),
  height: z.number().int().positive().max(20000),
});

/** The body the client POSTs to /api/v1/promo-render. Screenshots travel as data
 *  URIs so the render host (local renderer or Lambda) can load them without a
 *  separate upload round-trip. */
export const PromoRenderRequestSchema = z.object({
  templateId: z.string().min(1),
  deviceId: z.string().min(1),
  screenshots: z.array(PromoRenderScreenshotSchema).min(1).max(MAX_SCREENSHOTS),
  texts: z.array(z.string().max(80)).max(6),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  background: z.string().min(1),
  pattern: z.string().nullable(),
  format: z.enum(PROMO_FORMATS),
});

export type PromoRenderRequest = z.infer<typeof PromoRenderRequestSchema>;
