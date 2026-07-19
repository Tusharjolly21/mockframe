import { z } from "zod";
import { MAX_SCREENSHOTS, PROMO_FORMATS } from "./types";

/** One app screen in a render request: either an inline data URI (images) or a
 *  hosted asset URL (videos — too large to inline; uploaded via /api/assets
 *  first, so the host is pinned to our storage origin). */
export const PromoRenderScreenshotSchema = z
  .object({
    kind: z.enum(["image", "video"]).default("image"),
    dataUrl: z
      .string()
      .startsWith("data:image/")
      .max(16 * 1024 * 1024)
      .optional(),
    url: z
      .string()
      .url()
      .startsWith("https://firebasestorage.googleapis.com/")
      .max(4096)
      .optional(),
    width: z.number().int().positive().max(20000),
    height: z.number().int().positive().max(20000),
  })
  .refine((s) => (s.dataUrl ? !s.url : Boolean(s.url)), { message: "Provide exactly one of dataUrl or url" })
  .refine((s) => s.kind !== "video" || Boolean(s.url), { message: "Videos must be uploaded first (hosted url)" });

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
