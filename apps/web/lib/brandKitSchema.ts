import { z } from "zod";

/**
 * Brand kit shape shared by the client (lib/brand.ts) and the sync route
 * (app/api/brand-kit). Kept free of browser/Firebase imports so both sides
 * and the unit tests can load it.
 */

export const BRAND_NAME_MAX = 40;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const ASSET_ID_RE = /^[a-zA-Z0-9_-]{1,100}$/;

export const BrandKitSchema = z.object({
  name: z.string().max(BRAND_NAME_MAX),
  accent: z.string().regex(HEX_RE),
  logoAssetId: z.string().regex(ASSET_ID_RE).nullable(),
  /** ms epoch of the last user edit — last edit wins when local and cloud disagree */
  updatedAt: z.number().int().nonnegative(),
});

export type BrandKitRecord = z.infer<typeof BrandKitSchema>;

export type BrandSyncAction = "none" | "pull" | "push";

/**
 * Decide which copy of the kit is current. Newest edit wins; a tie means both
 * already agree. A kit saved before sync existed has no timestamp (0), so any
 * cloud copy beats it — but with no cloud copy it is still pushed up.
 */
export function brandSyncAction(local: BrandKitRecord | null, cloud: BrandKitRecord | null): BrandSyncAction {
  if (!local && !cloud) return "none";
  if (!cloud) return "push";
  if (!local) return "pull";
  if (cloud.updatedAt > local.updatedAt) return "pull";
  if (local.updatedAt > cloud.updatedAt) return "push";
  return "none";
}
