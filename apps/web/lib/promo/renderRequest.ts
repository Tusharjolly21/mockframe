import { z } from "zod";
import { PROMO_FORMATS } from "./types";

/** The body the client POSTs to /api/v1/promo-render. The screenshot travels as
 *  a data URI so the render host (local renderer or Lambda) can load it without
 *  a separate upload round-trip. */
export const PromoRenderRequestSchema = z.object({
  templateId: z.string().min(1),
  texts: z.array(z.string().max(80)).max(6),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  background: z.string().min(1),
  format: z.enum(PROMO_FORMATS),
  screenshotDataUrl: z
    .string()
    .startsWith("data:image/")
    .max(16 * 1024 * 1024), // ~16MB ceiling on the encoded screenshot
});

export type PromoRenderRequest = z.infer<typeof PromoRenderRequestSchema>;
