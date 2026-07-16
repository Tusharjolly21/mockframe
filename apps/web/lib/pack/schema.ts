import { z } from "zod";
import { BackgroundSchema, createId } from "@framekit/scene";

/**
 * Pack documents describe an App Store / Play Store screenshot SET: shared
 * style + per-screen caption/screenshot. They compile down to ordinary
 * SceneDocuments (see compile.ts) — nothing below ever reaches the renderer
 * directly. Server-safe: imported by API routes and vitest.
 */

export const PACK_VERSION = 1 as const;

export const PACK_TARGET_IDS = [
  "appstore-69",
  "appstore-65",
  "appstore-ipad13",
  "play-phone",
  "play-feature",
] as const;

export type PackTargetId = (typeof PACK_TARGET_IDS)[number];

export interface PackTarget {
  id: PackTargetId;
  store: "appstore" | "playstore";
  label: string;
  width: number;
  height: number;
  /** registry device rendered inside this target's canvases */
  deviceId: string;
  /** zip folder; the README maps folders to store-console upload slots */
  folder: string;
}

export const PACK_TARGETS: Record<PackTargetId, PackTarget> = {
  "appstore-69": {
    id: "appstore-69",
    store: "appstore",
    label: "App Store 6.9″",
    width: 1320,
    height: 2868,
    deviceId: "iphone-16-pro-max",
    folder: "App Store/6.9-inch-1320x2868",
  },
  "appstore-65": {
    id: "appstore-65",
    store: "appstore",
    label: "App Store 6.5″",
    width: 1284,
    height: 2778,
    deviceId: "iphone-16-plus",
    folder: "App Store/6.5-inch-1284x2778",
  },
  "appstore-ipad13": {
    id: "appstore-ipad13",
    store: "appstore",
    label: "App Store iPad 13″",
    width: 2064,
    height: 2752,
    deviceId: "ipad-pro-13",
    folder: "App Store/iPad-13-inch-2064x2752",
  },
  "play-phone": {
    id: "play-phone",
    store: "playstore",
    label: "Play Store phone",
    width: 1080,
    height: 1920,
    deviceId: "pixel-9-pro",
    folder: "Play Store/phone-1080x1920",
  },
  "play-feature": {
    id: "play-feature",
    store: "playstore",
    label: "Play feature graphic",
    width: 1024,
    height: 500,
    deviceId: "pixel-9-pro",
    folder: "Play Store",
  },
};

export const PACK_STYLE_IDS = [
  "minimal-light",
  "bold-gradient",
  "panorama-flow",
  "tilted-rhythm",
  "dark-pro",
  "glass",
  "accent-split",
  "screenshot-first",
] as const;

export type PackStyleId = (typeof PACK_STYLE_IDS)[number];

export const CaptionSchema = z.object({
  title: z.string().max(120),
  subtitle: z.string().max(160).optional(),
});

export const PackScreenSchema = z.object({
  id: z.string(),
  /** uploaded screenshot; null until the user drops one */
  assetId: z.string().nullable(),
  /** keyed by BCP-47 locale; v1 writes only "en" (v2 localization slots in here) */
  captions: z.record(z.string(), CaptionSchema),
  overrides: z.object({
    hideDevice: z.boolean().optional(),
    flipTilt: z.boolean().optional(),
  }),
});

export const PackDocumentSchema = z.object({
  version: z.literal(PACK_VERSION),
  kind: z.literal("pack"),
  id: z.string(),
  appName: z.string().max(60),
  styleId: z.enum(PACK_STYLE_IDS),
  style: z.object({
    accent: z.string(),
    fontFamily: z.string(),
    captionPosition: z.enum(["top", "bottom"]),
    /** overrides the style's default background when set */
    background: BackgroundSchema.optional(),
  }),
  screens: z.array(PackScreenSchema).min(1).max(10),
  targets: z.object({
    "appstore-69": z.boolean(),
    "appstore-65": z.boolean(),
    "appstore-ipad13": z.boolean(),
    "play-phone": z.boolean(),
    "play-feature": z.boolean(),
  }),
});

export type PackScreen = z.infer<typeof PackScreenSchema>;
export type PackDocument = z.infer<typeof PackDocumentSchema>;

export function createPackScreen(assetId?: string): PackScreen {
  return {
    id: createId(),
    assetId: assetId ?? null,
    captions: { en: { title: "" } },
    overrides: {},
  };
}

export function createPack(): PackDocument {
  return {
    version: PACK_VERSION,
    kind: "pack",
    id: createId(),
    appName: "",
    styleId: "bold-gradient",
    style: {
      accent: "#6d28d9",
      fontFamily: "Inter",
      captionPosition: "top",
    },
    screens: [createPackScreen()],
    targets: {
      "appstore-69": true,
      "appstore-65": true,
      "appstore-ipad13": false,
      "play-phone": true,
      "play-feature": true,
    },
  };
}
